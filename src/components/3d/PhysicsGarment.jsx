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
//  Strategy:
//  For each garment vertex, check if it's inside the
//  mannequin bounding ellipsoid. If so, push it outward
//  horizontally to just outside the surface + fabric offset.
//
//  We approximate the mannequin surface as a vertical ellipsoid
//  (cheap, no raycasting needed, zero runtime cost).
// ─────────────────────────────────────────────
const DRAPE_OFFSET = 0.012; // world units — fabric thickness above surface

function applyDrapeConform(garmentMesh, mannequinBox, garmentScale) {
  const mannCenter = new THREE.Vector3();
  const mannSize = new THREE.Vector3();
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
    const vertex = new THREE.Vector3();
    let modified = false;

    for (let i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);

      // Convert vertex to world space (geometry is at scale=1 at this point)
      const worldX = vertex.x * garmentScale;
      const worldY = vertex.y * garmentScale;
      const worldZ = vertex.z * garmentScale;

      // Vector from mannequin center to this vertex
      const dx = worldX - mannCenter.x;
      const dy = worldY - mannCenter.y;
      const dz = worldZ - mannCenter.z;

      // Check if vertex is inside the mannequin ellipsoid
      const ellipsoidVal = (dx / rx) ** 2 + (dy / ry) ** 2 + (dz / rz) ** 2;

      if (ellipsoidVal < 1.0) {
        const horizLen = Math.sqrt(dx * dx + dz * dz);

        if (horizLen > 0.001) {
          const nx = dx / horizLen;
          const nz = dz / horizLen;

          const yFrac = Math.min(1, Math.abs(dy) / ry);
          const xzRadius = rx * Math.sqrt(Math.max(0, 1 - yFrac * yFrac));

          const targetWorldX = mannCenter.x + nx * (xzRadius + DRAPE_OFFSET);
          const targetWorldZ = mannCenter.z + nz * (xzRadius + DRAPE_OFFSET);

          posAttr.setX(i, targetWorldX / garmentScale);
          posAttr.setZ(i, targetWorldZ / garmentScale);
          modified = true;
          conformedCount++;
        }
      }
    }

    if (modified) {
      posAttr.needsUpdate = true;
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
        anchorNode = lm['landmark_neck'] || lm['landmark_shoulder_left'];
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
        const freshMannBox = new THREE.Box3().setFromObject(mannequinRef.current);
        applyDrapeConform(normalized.mesh, freshMannBox, normalized.scale);
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