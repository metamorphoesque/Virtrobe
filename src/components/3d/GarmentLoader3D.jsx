// src/components/3d/GarmentLoader3D.jsx
//
// KEY CHANGES vs previous version:
// 1. Uses mannequin landmark_ nodes as anchor points (not bounding box center)
// 2. Per-garment-type axis selection for scaling (not max of all axes)
// 3. Separate Y correction per garment type
// 4. Garment positioned ONCE on mount, not re-set every frame
// 5. useFrame only syncs rotation, not position

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// LANDMARK NAMES — must match the Empty object names in your Blender GLB.
// Edit these to match whatever names you used in Blender.
// ---------------------------------------------------------------------------
const LANDMARKS = {
  chest:       ['landmark_chest',   'Landmark_Chest',   'chest',   'Chest'],
  waist:       ['landmark_waist',   'Landmark_Waist',   'waist',   'Waist'],
  hips:        ['landmark_hips',    'Landmark_Hips',    'hips',    'Hips'],
  shoulder_l:  ['landmark_shoulder_l', 'Landmark_Shoulder_L'],
  shoulder_r:  ['landmark_shoulder_r', 'Landmark_Shoulder_R'],
  neck:        ['landmark_neck',    'Landmark_Neck',    'neck'],
  knee:        ['landmark_knee_l',  'Landmark_Knee_L'],
};

// ---------------------------------------------------------------------------
// Per-garment config:
//   anchor      — which landmark to center the garment on
//   scaleAxis   — which axis of the GLB represents the garment's HEIGHT
//                 (the axis that should match the mannequin body region height)
//   yCorrection — Blender baked rotation offset in radians for this type
//   yNudge      — fine-tune vertical position after anchor (world units)
// ---------------------------------------------------------------------------
const GARMENT_CONFIG = {
  shirt: {
    anchor: 'chest',
    scaleAxis: 'y',
    yCorrection: -Math.PI / 2,
    yNudge: 0,
  },
  jacket: {
    anchor: 'chest',
    scaleAxis: 'y',
    yCorrection: -Math.PI / 2,
    yNudge: 0,
  },
  dress: {
    anchor: 'chest',
    scaleAxis: 'y',
    yCorrection: -Math.PI / 2,
    yNudge: 0,
  },
  top: {
    anchor: 'chest',
    scaleAxis: 'y',
    yCorrection: -Math.PI / 2,
    yNudge: 0,
  },
  pants: {
    anchor: 'hips',
    scaleAxis: 'y',
    yCorrection: -Math.PI / 2,
    yNudge: 0,
  },
  trousers: {
    anchor: 'hips',
    scaleAxis: 'y',
    yCorrection: -Math.PI / 2,
    yNudge: 0,
  },
  jeans: {
    anchor: 'hips',
    scaleAxis: 'y',
    yCorrection: -Math.PI / 2,
    yNudge: 0,
  },
  skirt: {
    anchor: 'hips',
    scaleAxis: 'y',
    yCorrection: -Math.PI / 2,
    yNudge: 0,
  },
  shorts: {
    anchor: 'hips',
    scaleAxis: 'y',
    yCorrection: -Math.PI / 2,
    yNudge: 0,
  },
  leggings: {
    anchor: 'hips',
    scaleAxis: 'y',
    yCorrection: -Math.PI / 2,
    yNudge: 0,
  },
};

const DEFAULT_CONFIG = {
  anchor: 'chest',
  scaleAxis: 'y',
  yCorrection: -Math.PI / 2,
  yNudge: 0,
};

// ---------------------------------------------------------------------------
// Resolve world position of a landmark node by trying candidate names.
// Returns a THREE.Vector3 in world space, or null if not found.
// ---------------------------------------------------------------------------
function getLandmarkWorldPosition(mannequinRef, candidateNames) {
  if (!mannequinRef?.current) return null;

  const root = mannequinRef.current;
  root.updateMatrixWorld(true);

  let found = null;
  for (const name of candidateNames) {
    root.traverse((child) => {
      if (!found && child.name === name) found = child;
    });
    if (found) break;
  }

  if (!found) return null;

  found.updateMatrixWorld(true);
  const pos = new THREE.Vector3();
  found.getWorldPosition(pos);
  return pos;
}

// ---------------------------------------------------------------------------
// Get the mannequin body region height between two landmarks.
// Used to scale the garment so it fits the body region proportionally.
// ---------------------------------------------------------------------------
function getRegionHeight(mannequinRef, topCandidates, bottomCandidates) {
  const top = getLandmarkWorldPosition(mannequinRef, topCandidates);
  const bottom = getLandmarkWorldPosition(mannequinRef, bottomCandidates);
  if (!top || !bottom) return null;
  return Math.abs(top.y - bottom.y);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
const GarmentLoader3D = ({ garmentData, measurements, mannequinRef, slot = 'upper' }) => {
  const modelUrl = garmentData?.modelUrl;
  if (!modelUrl) return null;

  const fullModelUrl = modelUrl.startsWith('http')
    ? modelUrl
    : `http://localhost:5000${modelUrl}`;

  return (
    <Suspense fallback={<LoadingPlaceholder slot={slot} />}>
      <GarmentMesh
        modelUrl={fullModelUrl}
        garmentData={garmentData}
        measurements={measurements}
        mannequinRef={mannequinRef}
        slot={slot}
      />
    </Suspense>
  );
};

// ---------------------------------------------------------------------------
// GarmentMesh — the actual positioned garment
// ---------------------------------------------------------------------------
const GarmentMesh = ({ modelUrl, garmentData, measurements, mannequinRef, slot }) => {
  const meshRef = useRef();
  const gltf = useLoader(GLTFLoader, modelUrl);

  const garmentType = (garmentData?.type ?? garmentData?.garmentType ?? slot === 'lower' ? 'pants' : 'shirt').toLowerCase();
  const config = GARMENT_CONFIG[garmentType] ?? DEFAULT_CONFIG;

  // ── Build the garment mesh and position it once ──────────────────────────
  const garmentScene = useMemo(() => {
    const mesh = gltf.scene.clone(true);

    // Reset any loader-applied transforms
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    mesh.updateMatrixWorld(true);

    // Enable shadows
    mesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return mesh;
  }, [gltf]);

  // ── Position + scale after mount, when mannequin is ready ───────────────
  useEffect(() => {
    if (!meshRef.current || !mannequinRef?.current) return;

    mannequinRef.current.updateMatrixWorld(true);

    const mesh = meshRef.current;
    const type = garmentType;
    const cfg = GARMENT_CONFIG[type] ?? DEFAULT_CONFIG;

    // 1. Get anchor landmark world position
    const anchorPos = getLandmarkWorldPosition(mannequinRef, LANDMARKS[cfg.anchor] ?? LANDMARKS.chest);

    // 2. Measure garment GLB raw size
    mesh.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);

    // 3. Calculate scale:
    //    We want the garment's primary axis to match the mannequin body region.
    let targetRegionHeight = null;

    if (['shirt', 'jacket', 'top', 'dress'].includes(type)) {
      // Upper: scale from neck down to waist
      targetRegionHeight = getRegionHeight(
        mannequinRef,
        LANDMARKS.neck,
        LANDMARKS.waist
      );
    } else if (['pants', 'trousers', 'jeans', 'leggings'].includes(type)) {
      // Lower: scale from waist down to knee
      targetRegionHeight = getRegionHeight(
        mannequinRef,
        LANDMARKS.waist,
        LANDMARKS.knee
      );
    } else if (['skirt', 'shorts'].includes(type)) {
      // Short lower: waist to roughly mid-thigh (half of waist-to-knee)
      const full = getRegionHeight(mannequinRef, LANDMARKS.waist, LANDMARKS.knee);
      targetRegionHeight = full ? full * 0.65 : null;
    } else if (type === 'dress') {
      // Full body: neck to knee
      targetRegionHeight = getRegionHeight(
        mannequinRef,
        LANDMARKS.neck,
        LANDMARKS.knee
      );
    }

    // Fallback: use 35% of mannequin total height
    if (!targetRegionHeight) {
      const mannequinBox = new THREE.Box3().setFromObject(mannequinRef.current);
      const mannequinSize = new THREE.Vector3();
      mannequinBox.getSize(mannequinSize);
      targetRegionHeight = mannequinSize.y * 0.35;
      console.warn(`⚠️ No landmark region found for "${type}", using fallback scale`);
    }

    const garmentAxisSize = size[cfg.scaleAxis] || size.y || 1;
    const scale = targetRegionHeight / garmentAxisSize;

    // 4. Apply scale
    mesh.scale.setScalar(scale);
    mesh.updateMatrixWorld(true);

    // 5. Recalculate center after scaling
    const scaledBbox = new THREE.Box3().setFromObject(mesh);
    const scaledCenter = new THREE.Vector3();
    scaledBbox.getCenter(scaledCenter);

    // 6. Position: move so garment center aligns to anchor landmark
    if (anchorPos) {
      mesh.position.x += anchorPos.x - scaledCenter.x;
      mesh.position.y += anchorPos.y - scaledCenter.y + cfg.yNudge;
      mesh.position.z += anchorPos.z - scaledCenter.z;
    } else {
      // Fallback: use mannequin bounding box
      const mannequinBox = new THREE.Box3().setFromObject(mannequinRef.current);
      const mannequinCenter = new THREE.Vector3();
      mannequinBox.getCenter(mannequinCenter);
      mesh.position.x += mannequinCenter.x - scaledCenter.x;
      mesh.position.y += mannequinCenter.y - scaledCenter.y + cfg.yNudge;
      mesh.position.z += mannequinCenter.z - scaledCenter.z;
      console.warn(`⚠️ No "${cfg.anchor}" landmark found, using mannequin center`);
    }

    // 7. Apply mannequin world rotation + per-type Blender correction
    const mannequinQ = new THREE.Quaternion();
    mannequinRef.current.getWorldQuaternion(mannequinQ);
    const correction = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      cfg.yCorrection
    );
    mesh.setRotationFromQuaternion(mannequinQ.multiply(correction));

    mesh.updateMatrixWorld(true);

    console.log(`✅ ${garmentData?.name} | type: ${type} | scale: ${scale.toFixed(3)} | anchor: ${cfg.anchor} | anchorFound: ${!!anchorPos}`);
  }, [garmentScene, mannequinRef, garmentType, measurements]);

  // ── Rotation-only sync every frame (no position changes) ─────────────────
  useFrame(() => {
    if (!meshRef.current || !mannequinRef?.current) return;

    const cfg = GARMENT_CONFIG[garmentType] ?? DEFAULT_CONFIG;
    const mannequinQ = new THREE.Quaternion();
    mannequinRef.current.getWorldQuaternion(mannequinQ);

    const correction = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      cfg.yCorrection
    );
    meshRef.current.setRotationFromQuaternion(mannequinQ.multiply(correction));
  });

  return <primitive ref={meshRef} object={garmentScene} />;
};

// ---------------------------------------------------------------------------
// Loading placeholder
// ---------------------------------------------------------------------------
const LoadingPlaceholder = ({ slot }) => (
  <mesh position={[0, slot === 'lower' ? 0.5 : 1.2, 0]}>
    <boxGeometry args={[0.3, 0.5, 0.2]} />
    <meshStandardMaterial color="#e0e0e0" transparent opacity={0.25} wireframe />
  </mesh>
);

export default GarmentLoader3D;