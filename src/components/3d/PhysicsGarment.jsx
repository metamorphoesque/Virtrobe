// src/components/3d/PhysicsGarment.jsx
//
// DRAPE EFFECT:
// After scaling/positioning, a one-time surface-conform pass nudges garment
// vertices outward from the mannequin center so the garment appears to rest
// ON the body rather than intersecting it. Zero runtime cost — runs once on load.

import React, { useRef, useMemo, Suspense } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

const GARMENT_Y_CORRECTION = -Math.PI / 2;

// Pre-allocated — never allocate inside useFrame
const _neck       = new THREE.Vector3();
const _waist      = new THREE.Vector3();
const _hips       = new THREE.Vector3();
const _mannSize   = new THREE.Vector3();
const _finalPos   = new THREE.Vector3();
const _quat       = new THREE.Quaternion();
const _correction = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0), GARMENT_Y_CORRECTION
);

// ─────────────────────────────────────────────
//  SLICE MEASUREMENT
// ─────────────────────────────────────────────
function measureSliceWidth(mesh, yMinFrac, yMaxFrac) {
  mesh.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  const yBandMin = bbox.min.y + size.y * yMinFrac;
  const yBandMax = bbox.min.y + size.y * yMaxFrac;

  let minX = Infinity, maxX = -Infinity, found = 0;

  mesh.traverse(child => {
    if (!child.isMesh || !child.geometry?.attributes?.position) return;
    const pos = child.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y >= yBandMin && y <= yBandMax) {
        minX = Math.min(minX, pos.getX(i));
        maxX = Math.max(maxX, pos.getX(i));
        found++;
      }
    }
  });

  if (found < 10) {
    console.warn(`⚠️ Slice [${yMinFrac}–${yMaxFrac}]: only ${found} verts, using full bbox X`);
    return size.x;
  }

  return maxX - minX;
}

// ─────────────────────────────────────────────
//  SURFACE CONFORM — runs ONCE after positioning
//
//  Strategy:
//  For each garment vertex, cast a ray from the mannequin's
//  vertical axis outward through the vertex. If the vertex sits
//  INSIDE the mannequin bounding ellipsoid, push it outward to
//  just outside the surface + a small offset.
//
//  We approximate the mannequin surface as a vertical ellipsoid
//  (cheap, no raycasting needed, zero runtime cost).
//  The offset layer (DRAPE_OFFSET) simulates fabric thickness.
// ─────────────────────────────────────────────
const DRAPE_OFFSET = 0.012; // world units — fabric thickness above surface

function applyDrapeConform(garmentMesh, mannequinBox, garmentScale) {
  const mannCenter = new THREE.Vector3();
  const mannSize   = new THREE.Vector3();
  mannequinBox.getCenter(mannCenter);
  mannequinBox.getSize(mannSize);

  // Ellipsoid radii — half the mannequin dimensions + small buffer
  const rx = mannSize.x / 2 + DRAPE_OFFSET;
  const ry = mannSize.y / 2;
  const rz = mannSize.z / 2 + DRAPE_OFFSET;

  let conformedCount = 0;

  garmentMesh.traverse(child => {
    if (!child.isMesh || !child.geometry?.attributes?.position) return;

    const posAttr = child.geometry.attributes.position;
    const vertex  = new THREE.Vector3();
    let modified  = false;

    for (let i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);

      // Convert vertex to world space (geometry is at scale=1 at this point)
      // We need to account for the garment scale that will be applied
      const worldX = vertex.x * garmentScale;
      const worldY = vertex.y * garmentScale;
      const worldZ = vertex.z * garmentScale;

      // Vector from mannequin center to this vertex (XZ plane — horizontal push only)
      const dx = worldX - mannCenter.x;
      const dy = worldY - mannCenter.y;
      const dz = worldZ - mannCenter.z;

      // Check if vertex is inside the mannequin ellipsoid
      // Ellipsoid equation: (dx/rx)² + (dy/ry)² + (dz/rz)² < 1 = inside
      const ellipsoidVal = (dx / rx) ** 2 + (dy / ry) ** 2 + (dz / rz) ** 2;

      if (ellipsoidVal < 1.0) {
        // Vertex is inside mannequin — push it outward horizontally
        // Find the outward direction in XZ plane
        const horizLen = Math.sqrt(dx * dx + dz * dz);

        if (horizLen > 0.001) {
          // Normalize horizontal direction
          const nx = dx / horizLen;
          const nz = dz / horizLen;

          // Find where this ray exits the ellipsoid in XZ
          // At this Y: ellipsoid XZ radius = rx * sqrt(1 - (dy/ry)²)
          const yFrac     = Math.min(1, Math.abs(dy) / ry);
          const xzRadius  = rx * Math.sqrt(Math.max(0, 1 - yFrac * yFrac));

          // Target position: just outside ellipsoid surface
          const targetWorldX = mannCenter.x + nx * (xzRadius + DRAPE_OFFSET);
          const targetWorldZ = mannCenter.z + nz * (xzRadius + DRAPE_OFFSET);

          // Convert back to garment local space (undo the scale)
          posAttr.setX(i, targetWorldX / garmentScale);
          posAttr.setZ(i, targetWorldZ / garmentScale);
          modified = true;
          conformedCount++;
        }
      }
    }

    if (modified) {
      posAttr.needsUpdate = true;
      // Recompute normals so lighting looks correct after vertex displacement
      if (child.geometry.attributes.normal) {
        child.geometry.computeVertexNormals();
      }
    }
  });

  console.log(`🧥 Drape conform: pushed ${conformedCount} vertices outside mannequin surface`);
}

// ─────────────────────────────────────────────
//  COMPONENTS
// ─────────────────────────────────────────────
const PhysicsGarment = ({ garmentData, mannequinRef, measurements }) => {
  const modelUrl = garmentData?.modelUrl;
  if (!modelUrl) return null;

  const fullModelUrl = modelUrl.startsWith('http')
    ? modelUrl
    : `http://localhost:5000${modelUrl}`;

  return (
    <Suspense fallback={<LoadingIndicator />}>
      <GarmentMesh
        modelUrl={fullModelUrl}
        garmentData={garmentData}
        mannequinRef={mannequinRef}
        measurements={measurements}
      />
    </Suspense>
  );
};

const GarmentMesh = ({ modelUrl, garmentData, mannequinRef, measurements }) => {
  const meshRef      = useRef();
  const frameCount   = useRef(0);
  const conformedRef = useRef(false); // ensure drape runs only once
  const gltf         = useLoader(GLTFLoader, modelUrl);

  const isBottom = useMemo(() => {
    const name = (garmentData.name     || '').toLowerCase();
    const cat  = (garmentData.category || garmentData.type || '').toLowerCase();
    return name.includes('pant') || name.includes('skirt') || name.includes('short') ||
           cat.includes('bottom') || cat.includes('pant')  || cat.includes('skirt');
  }, [garmentData]);

  // Clone + measure at scale=1 once per model
  const { mesh, relevantWidth, garmentTopOffset } = useMemo(() => {
    const mesh = gltf.scene.clone(true);
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
    mesh.updateMatrixWorld(true);

    mesh.traverse(child => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });

    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = bbox.getSize(new THREE.Vector3());

    const relevantWidth = isBottom
      ? measureSliceWidth(mesh, 0.85, 1.0)  // waistband = top 15%
      : measureSliceWidth(mesh, 0.80, 1.0); // shoulder  = top 20%

    console.log(
      `📦 ${garmentData.name} | X=${size.x.toFixed(3)} Y=${size.y.toFixed(3)} | ` +
      `relevantWidth=${relevantWidth.toFixed(3)} | isBottom=${isBottom}`
    );

    // Reset conform flag when model changes
    conformedRef.current = false;

    return { mesh, relevantWidth, garmentTopOffset: size.y / 2 };
  }, [gltf, garmentData.name, isBottom]);

  useFrame(() => {
    if (!meshRef.current || !mannequinRef?.current) return;

    mannequinRef.current.updateMatrixWorld(true);

    mannequinRef.current.getWorldQuaternion(_quat);
    _quat.multiply(_correction);

    const getLandmarks = mannequinRef.current.getLiveLandmarks;
    if (!getLandmarks) return;
    const lm = getLandmarks();

    // Mannequin world dimensions
    const mannBox = new THREE.Box3().setFromObject(mannequinRef.current);
    mannBox.getSize(_mannSize);
    // NOTE: don't use mannBox center for X — use 0 (world origin)
    // because bbox center drifts slightly during rotation

    const mannWorldHeight = _mannSize.y;
    const personHeight_cm = measurements?.height_cm || 170;
    const worldPerCm      = mannWorldHeight / personHeight_cm;

    let scale   = 1;
    let anchorY = 0;

    if (!isBottom) {
      // ── TOPS ────────────────────────────────────────────────────────────
      const shoulder_cm      = measurements?.shoulder_width_cm || 40;
      const targetWorldWidth = shoulder_cm * worldPerCm;
      scale = relevantWidth > 0 ? targetWorldWidth / relevantWidth : 1;

      const neckNode = lm['landmark_neck'];
      if (neckNode) {
        neckNode.updateWorldMatrix(true, false);
        neckNode.getWorldPosition(_neck);
        anchorY = _neck.y;
      } else {
        anchorY = mannBox.min.y + mannWorldHeight * 0.88;
      }

      frameCount.current++;
      if (frameCount.current % 120 === 0) {
        console.log(
          `👕 ${garmentData.name} | shoulder=${shoulder_cm}cm → ${targetWorldWidth.toFixed(4)}wu | ` +
          `sliceW=${relevantWidth.toFixed(4)} | scale=${scale.toFixed(3)} | neckY=${anchorY.toFixed(3)}`
        );
      }

    } else {
      // ── BOTTOMS ──────────────────────────────────────────────────────────
      const hips_cm          = measurements?.hips_cm || 90;
      const hipDiameter_cm   = hips_cm / Math.PI;
      const targetWorldWidth = hipDiameter_cm * worldPerCm;
      scale = relevantWidth > 0 ? (targetWorldWidth / relevantWidth) * 1.08 : 1;

      const waistNode = lm['landmark_waist'];
      const hipsNode  = lm['landmark_hips'];
      if (waistNode) {
        waistNode.updateWorldMatrix(true, false);
        waistNode.getWorldPosition(_waist);
        anchorY = _waist.y;
      } else if (hipsNode) {
        hipsNode.updateWorldMatrix(true, false);
        hipsNode.getWorldPosition(_hips);
        anchorY = _hips.y + 0.05;
      } else {
        anchorY = mannBox.min.y + mannWorldHeight * 0.58;
      }

      frameCount.current++;
      if (frameCount.current % 120 === 0) {
        console.log(
          `👖 ${garmentData.name} | hips=${hips_cm}cm → dia=${hipDiameter_cm.toFixed(1)}cm → ` +
          `${targetWorldWidth.toFixed(4)}wu | sliceW=${relevantWidth.toFixed(4)} | scale=${scale.toFixed(3)}`
        );
      }
    }

    // ── X = 0 always (world center) ─────────────────────────────────────
    // Do NOT use mannBox center X — it drifts during rotation
    _finalPos.set(
      0,
      anchorY - garmentTopOffset * scale,
      0,
    );

    meshRef.current.position.copy(_finalPos);
    meshRef.current.quaternion.copy(_quat);
    meshRef.current.scale.setScalar(scale);

    // ── ONE-TIME DRAPE CONFORM ───────────────────────────────────────────
    // Runs once after first valid scale is computed and mesh is positioned.
    // Pushes intersecting vertices outside mannequin ellipsoid surface.
    if (!conformedRef.current && scale > 0.01 && mannequinRef.current) {
      conformedRef.current = true;
      // Small delay so scale/position are applied before we measure
      setTimeout(() => {
        if (!mannequinRef.current) return;
        const freshMannBox = new THREE.Box3().setFromObject(mannequinRef.current);
        applyDrapeConform(mesh, freshMannBox, scale);
      }, 100);
    }
  });

  return <primitive ref={meshRef} object={mesh} />;
};

const LoadingIndicator = () => (
  <mesh position={[0, 1, 0]}>
    <boxGeometry args={[0.3, 0.6, 0.2]} />
    <meshStandardMaterial color="#cccccc" transparent opacity={0.3} wireframe />
  </mesh>
);

export default PhysicsGarment;