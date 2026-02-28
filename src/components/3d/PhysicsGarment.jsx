// src/components/3d/PhysicsGarment.jsx
//
// REFACTORED: Uses garmentNormalizer + garmentMorphAdapter for
// robust one-time fitting. Per-frame work is minimal (position +
// rotation tracking only — no scale recomputation).
//
// DRAPE EFFECT:
// After scaling/positioning, a one-time surface-conform pass nudges garment
// vertices outward from the mannequin center so the garment appears to rest
// ON the body rather than intersecting it. Zero runtime cost — runs once on load.

import React, { useRef, useMemo, Suspense } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { normalizeGarment, detectBodyZone } from '../../utils/garmentNormalizer';
import { adaptGarmentToBody } from '../../utils/garmentMorphAdapter';

const GARMENT_Y_CORRECTION = -Math.PI / 2;

// Pre-allocated — never allocate inside useFrame
const _anchorPos = new THREE.Vector3();
const _finalPos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _mannSize = new THREE.Vector3();
const _correction = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0), GARMENT_Y_CORRECTION
);

// ─────────────────────────────────────────────
//  SURFACE CONFORM — runs ONCE after positioning
//
//  Strategy (v2 — raycasting):
//  For each garment vertex, cast a horizontal ray from the
//  mannequin center-axis outward. If the vertex sits closer
//  to the axis than the mannequin surface, push it outward
//  to  surface + fabric offset.
//
//  This conforms to the ACTUAL mannequin geometry instead of
//  a crude ellipsoid, so garments wrap around the real body
//  curvature — narrower at waist, wider at hips/chest, etc.
// ─────────────────────────────────────────────

// Per-body-zone fabric offsets (world units)
const DRAPE_OFFSETS = {
  torso: 0.015,   // chest / waist / hips — slightly thicker
  limbs: 0.010,   // arms / legs — thinner
  default: 0.012,
};

// Decide offset based on vertex Y position relative to mannequin
function getDrapeOffset(vertexWorldY, mannBox) {
  const mannSize = new THREE.Vector3();
  mannBox.getSize(mannSize);
  const yFrac = (vertexWorldY - mannBox.min.y) / mannSize.y; // 0 = feet, 1 = top
  // Torso band: roughly 35%–85% of height
  if (yFrac >= 0.35 && yFrac <= 0.85) return DRAPE_OFFSETS.torso;
  return DRAPE_OFFSETS.limbs;
}

/**
 * Collect all Mesh children from a scene graph into a flat array.
 * Used as the raycasting target set.
 */
function collectMeshes(root) {
  const meshes = [];
  root.traverse(child => {
    if (child.isMesh && child.geometry) meshes.push(child);
  });
  return meshes;
}

function applyDrapeConform(garmentMesh, mannequinRef, garmentScale) {
  if (!mannequinRef) return;

  // Get the mannequin bounding box (world space)
  mannequinRef.updateMatrixWorld(true);
  const mannBox = new THREE.Box3().setFromObject(mannequinRef);
  const mannCenter = new THREE.Vector3();
  const mannSize = new THREE.Vector3();
  mannBox.getCenter(mannCenter);
  mannBox.getSize(mannSize);

  // Collect the mannequin's actual mesh geometry for raycasting
  const mannMeshes = collectMeshes(mannequinRef);
  if (mannMeshes.length === 0) {
    console.warn('⚠️ Drape conform: no mannequin meshes found, skipping');
    return;
  }

  const raycaster = new THREE.Raycaster();
  raycaster.near = 0;
  raycaster.far = mannSize.x * 2; // generous range

  let conformedCount = 0;
  let rayMissCount = 0;

  garmentMesh.traverse(child => {
    if (!child.isMesh || !child.geometry?.attributes?.position) return;

    const posAttr = child.geometry.attributes.position;
    const vertex = new THREE.Vector3();
    let modified = false;

    for (let i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);

      // Convert vertex to world space
      const worldX = vertex.x * garmentScale;
      const worldY = vertex.y * garmentScale;
      const worldZ = vertex.z * garmentScale;

      // Vector from mannequin center axis to vertex (horizontal only)
      const dx = worldX - mannCenter.x;
      const dz = worldZ - mannCenter.z;
      const horizDist = Math.sqrt(dx * dx + dz * dz);

      if (horizDist < 0.0005) continue; // vertex is on the center axis, skip

      // Horizontal direction from center to vertex
      const dirX = dx / horizDist;
      const dirZ = dz / horizDist;

      // Cast ray from mannequin center axis outward at this Y level
      const rayOrigin = new THREE.Vector3(mannCenter.x, worldY, mannCenter.z);
      const rayDir = new THREE.Vector3(dirX, 0, dirZ).normalize();
      raycaster.set(rayOrigin, rayDir);

      // Find intersection with mannequin surface
      const hits = raycaster.intersectObjects(mannMeshes, false);

      if (hits.length > 0) {
        // Distance from center axis to mannequin surface
        const surfaceDist = hits[0].distance;
        const offset = getDrapeOffset(worldY, mannBox);

        // If vertex is inside (closer to axis than surface), push it out
        if (horizDist < surfaceDist + offset) {
          const targetDist = surfaceDist + offset;
          const targetWorldX = mannCenter.x + dirX * targetDist;
          const targetWorldZ = mannCenter.z + dirZ * targetDist;

          posAttr.setX(i, targetWorldX / garmentScale);
          posAttr.setZ(i, targetWorldZ / garmentScale);
          modified = true;
          conformedCount++;
        }
      } else {
        rayMissCount++;
      }
    }

    if (modified) {
      posAttr.needsUpdate = true;
      if (child.geometry.attributes.normal) {
        child.geometry.computeVertexNormals();
      }
    }
  });

  console.log(`🧥 Drape conform: pushed ${conformedCount} vertices outside mannequin surface (${rayMissCount} ray misses)`);
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
  const meshRef = useRef();
  const conformedRef = useRef(false); // ensure drape runs only once
  const adaptedRef = useRef(false); // ensure morph/lattice runs only once
  const gltf = useLoader(GLTFLoader, modelUrl);

  const bodyZone = useMemo(() => detectBodyZone(garmentData), [garmentData]);

  // ── One-time normalization ──────────────────────────────────────────
  // Clone + normalize + compute scale/anchor ONCE per model
  const normalized = useMemo(() => {
    const mesh = gltf.scene.clone(true);

    mesh.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Run the full normalization pipeline
    const result = normalizeGarment(mesh, garmentData, measurements, mannequinRef);

    // Reset flags — new model needs fresh conform + adapt
    conformedRef.current = false;
    adaptedRef.current = false;

    return result;
  }, [gltf, garmentData.name, garmentData.type]);

  // ── One-time morph/lattice adaptation ───────────────────────────────
  // Runs once when measurements or normalized mesh are available
  useMemo(() => {
    if (adaptedRef.current) return;
    if (!normalized?.mesh || !measurements) return;

    // Find the mannequin's morphable mesh (if available)
    let mannequinMesh = null;
    if (mannequinRef?.current) {
      mannequinRef.current.traverse(child => {
        if (child.isMesh && child.morphTargetDictionary && !mannequinMesh) {
          mannequinMesh = child;
        }
      });
    }

    adaptGarmentToBody(normalized.mesh, mannequinMesh, measurements, bodyZone);
    adaptedRef.current = true;
  }, [normalized, measurements, bodyZone]);

  // ── Per-frame: position + rotation tracking only ───────────────────
  // Scale is computed ONCE in normalization. Only anchor position and
  // rotation follow the mannequin per frame (very cheap).
  useFrame(() => {
    if (!meshRef.current || !mannequinRef?.current || !normalized) return;

    mannequinRef.current.updateMatrixWorld(true);

    // Match mannequin rotation + Y correction
    mannequinRef.current.getWorldQuaternion(_quat);
    _quat.multiply(_correction);

    // Recompute anchor Y from live landmarks (they move with morph targets)
    let anchorY = normalized.anchorY;

    const getLandmarks = mannequinRef.current.getLiveLandmarks;
    if (getLandmarks) {
      const lm = getLandmarks();

      let anchorNode;
      if (bodyZone === 'upper') {
        anchorNode = lm['landmark_neck'] || lm['landmark_shoulder_L'];
      } else {
        anchorNode = lm['landmark_waist'] || lm['landmark_hips'];
      }

      if (anchorNode) {
        anchorNode.updateWorldMatrix(true, false);
        anchorNode.getWorldPosition(_anchorPos);
        anchorY = _anchorPos.y;
      }
    }

    // Position: centered on X/Z, anchored on Y with top-offset
    _finalPos.set(0, anchorY - normalized.garmentTopOffset * normalized.scale, 0);

    meshRef.current.position.copy(_finalPos);
    meshRef.current.quaternion.copy(_quat);
    meshRef.current.scale.setScalar(normalized.scale);

    // ── ONE-TIME DRAPE CONFORM ─────────────────────────────────────
    if (!conformedRef.current && normalized.scale > 0.01 && mannequinRef.current) {
      conformedRef.current = true;
      setTimeout(() => {
        if (!mannequinRef.current) return;
        applyDrapeConform(normalized.mesh, mannequinRef.current, normalized.scale);
      }, 100);
    }
  });

  return <primitive ref={meshRef} object={normalized.mesh} />;
};

const LoadingIndicator = () => (
  <mesh position={[0, 1, 0]}>
    <boxGeometry args={[0.3, 0.6, 0.2]} />
    <meshStandardMaterial color="#cccccc" transparent opacity={0.3} wireframe />
  </mesh>
);

export default PhysicsGarment;