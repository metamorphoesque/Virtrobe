// src/components/3d/GarmentLoader3D.jsx

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { addFrontMarker, tagFrontDirection } from '../../utils/frontFaceMarker';

const ATTACHMENT_POINTS = {
  shirt:   { yOffset:  0.30, heightRatio: 0.35 },
  dress:   { yOffset:  0.20, heightRatio: 0.70 },
  pants:   { yOffset: -0.10, heightRatio: 0.45 },
  jacket:  { yOffset:  0.30, heightRatio: 0.40 },
  skirt:   { yOffset: -0.15, heightRatio: 0.30 },
  shorts:  { yOffset: -0.20, heightRatio: 0.25 },
};

// ─────────────────────────────────────────────
//  THE ONE KNOB TO TURN
//
//  Your Blender exports have geometry baked 90° off.
//  Adjust this until garments face the same way as the mannequin:
//
//    0             → no correction (already aligned)
//   -Math.PI / 2  → -90° right   ← try this first
//    Math.PI / 2  → +90° left
//    Math.PI      → 180° flip
// ─────────────────────────────────────────────
const GARMENT_Y_CORRECTION = -Math.PI / 2;

function getMannequinWorldQuaternion(mannequinRef) {
  if (!mannequinRef?.current) return null;
  mannequinRef.current.updateMatrixWorld(true);
  const q = new THREE.Quaternion();
  mannequinRef.current.getWorldQuaternion(q);
  return q;
}

// ─────────────────────────────────────────────
//  TOP-LEVEL COMPONENT
// ─────────────────────────────────────────────
const GarmentLoader3D = ({ garmentData, measurements, mannequinRef, bodyTargets }) => {
  const [mannequinData, setMannequinData] = useState(null);

  const modelUrl = garmentData?.modelUrl;
  if (!modelUrl) return null;

  const fullModelUrl = modelUrl.startsWith('http')
    ? modelUrl
    : `http://localhost:5000${modelUrl}`;

  useEffect(() => {
    if (!mannequinRef?.current) return;
    const mannequin = mannequinRef.current;
    mannequin.updateMatrixWorld(true);
    const box    = new THREE.Box3().setFromObject(mannequin);
    const size   = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    setMannequinData({ size, center });
  }, [mannequinRef, measurements]);

  const garmentTransform = useMemo(() => {
    if (!mannequinData) return null;
    const { size, center } = mannequinData;
    const garmentType = garmentData.type || 'shirt';
    const config = ATTACHMENT_POINTS[garmentType] ?? ATTACHMENT_POINTS.shirt;
    const targetHeight = size.y * config.heightRatio;

    let baseCenter = center.clone();
    if (bodyTargets) {
      const isLower = ['pants', 'shorts', 'skirt'].includes(garmentType);
      baseCenter = isLower ? bodyTargets.lowerCenter.clone() : bodyTargets.upperCenter.clone();
    }

    const position = new THREE.Vector3(
      baseCenter.x,
      baseCenter.y + size.y * config.yOffset,
      baseCenter.z,
    );

    return { targetHeight, position, mannequinQuaternion: getMannequinWorldQuaternion(mannequinRef) };
  }, [mannequinData, garmentData, bodyTargets, mannequinRef]);

  return (
    <Suspense fallback={<LoadingPlaceholder />}>
      <GarmentMesh
        modelUrl={fullModelUrl}
        transform={garmentTransform}
        garmentData={garmentData}
        mannequinRef={mannequinRef}
      />
    </Suspense>
  );
};

// ─────────────────────────────────────────────
//  INNER MESH
// ─────────────────────────────────────────────
const GarmentMesh = ({ modelUrl, transform, garmentData, mannequinRef }) => {
  const meshRef = useRef();
  const gltf    = useLoader(GLTFLoader, modelUrl);

  // Raw diagnostic — once per model load
  useEffect(() => {
    const raw = gltf.scene;
    raw.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(raw);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    console.log('🔍 RAW GLB:', `X=${size.x.toFixed(3)} Y=${size.y.toFixed(3)} Z=${size.z.toFixed(3)}`);
    console.log('   Root rotation:', raw.rotation.toArray().slice(0,3).map(r=>(r*180/Math.PI).toFixed(1)+'°'));
  }, [gltf]);

  const garmentMesh = useMemo(() => {
    const mesh = gltf.scene.clone(true);
    if (!transform) return mesh;

    // 1. Reset loader transform
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
    mesh.updateMatrixWorld(true);

    // 2. Measure raw size
    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);
    const garmentHeight = Math.max(size.x, size.y, size.z);
    const scale = transform.targetHeight / garmentHeight;

    // 3. Center at origin
    mesh.position.sub(center);

    // 4. Apply mannequin quaternion + local Y correction for baked Blender offset
    if (transform.mannequinQuaternion) {
      mesh.setRotationFromQuaternion(transform.mannequinQuaternion);
      const correction = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        GARMENT_Y_CORRECTION
      );
      mesh.quaternion.multiply(correction);
      console.log(`🔗 Mannequin quaternion + Y correction: ${(GARMENT_Y_CORRECTION * 180 / Math.PI).toFixed(0)}°`);
    }

    // 5. Scale
    mesh.scale.setScalar(scale);

    // 6. Position
    mesh.position.copy(transform.position);

    // 7. Shadows
    mesh.traverse((child) => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });

    // 8. Debug marker
    tagFrontDirection(mesh, '+Z');
    addFrontMarker(mesh, '+Z', 0.3, 0xff0000);
    mesh.updateMatrixWorld(true);

    console.log('📦', garmentData.name, '| scale:', scale.toFixed(3), '| pos:', transform.position.toArray().map(n=>n.toFixed(3)));
    return mesh;
  }, [gltf, transform, garmentData]);

  // Re-sync every frame so garment follows mannequin autoRotate
  useFrame(() => {
    if (!meshRef.current || !mannequinRef?.current) return;
    const q = new THREE.Quaternion();
    mannequinRef.current.getWorldQuaternion(q);
    // Re-apply correction on top of live quaternion
    const correction = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      GARMENT_Y_CORRECTION
    );
    q.multiply(correction);
    meshRef.current.setRotationFromQuaternion(q);
  });

  return <primitive ref={meshRef} object={garmentMesh} />;
};

const LoadingPlaceholder = () => (
  <mesh position={[0, 1, 0]}>
    <boxGeometry args={[0.3, 0.6, 0.2]} />
    <meshStandardMaterial color="#cccccc" transparent opacity={0.3} wireframe />
  </mesh>
);

export default GarmentLoader3D;