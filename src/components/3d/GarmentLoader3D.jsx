// src/components/3d/GarmentLoader3D.jsx
// ============================================
// SIMPLE GARMENT LOADER - MANUAL ROTATION
// Just rotate until it looks right
// ============================================

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { calculateAlignmentRotation, addFrontMarker, tagFrontDirection, detectFrontDirection } from '../../utils/frontFaceMarker';
import meshStandardizer from '../../utils/meshStandardizer';

// Garment positioning configs
const ATTACHMENT_POINTS = {
  shirt: { yOffset: 0.3, heightRatio: 0.35, forwardOffset: 0.05 },
  dress: { yOffset: 0.2, heightRatio: 0.70, forwardOffset: 0.05 },
  pants: { yOffset: -0.1, heightRatio: 0.45, forwardOffset: 0.05 },
  jacket: { yOffset: 0.3, heightRatio: 0.40, forwardOffset: 0.08 },
  skirt: { yOffset: -0.15, heightRatio: 0.30, forwardOffset: 0.05 },
  shorts: { yOffset: -0.2, heightRatio: 0.25, forwardOffset: 0.05 }
};

const GarmentLoader3D = ({ garmentData, measurements, mannequinRef }) => {
  const meshRef = useRef();
  const [mannequinData, setMannequinData] = useState(null);

  const modelUrl = garmentData?.modelUrl;
  if (!modelUrl) return null;

  const fullModelUrl = modelUrl.startsWith('http') ? modelUrl : `http://localhost:5000${modelUrl}`;

  // Measure mannequin
  useEffect(() => {
    if (mannequinRef?.current) {
      const mannequin = mannequinRef.current;
      mannequin.updateMatrixWorld(true);
      
      const box = new THREE.Box3().setFromObject(mannequin);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      
      setMannequinData({ 
        size, 
        center, 
        bottom: center.y - size.y / 2,
        position: mannequin.position.clone()
      });
    }
  }, [mannequinRef, measurements]);

  const garmentTransform = useMemo(() => {
    if (!mannequinData) return null;

    const { size, center, bottom } = mannequinData;
    const garmentType = garmentData.type || 'shirt';
    const config = ATTACHMENT_POINTS[garmentType] || ATTACHMENT_POINTS.shirt;

    const targetHeight = size.y * config.heightRatio;
    // Position garment centered on torso and slightly in front of mannequin
    const posY = bottom + (size.y * (0.5 + config.yOffset));
    const posX = center.x;
    const posZ = center.z + config.forwardOffset;

    return { 
      targetHeight,
      position: [posX, posY, posZ],
      config
    };
  }, [mannequinData, garmentData]);

  return (
    <Suspense fallback={<LoadingPlaceholder />}>
      <GarmentMesh 
        modelUrl={fullModelUrl} 
        transform={garmentTransform} 
        meshRef={meshRef}
        garmentData={garmentData}
        mannequinRef={mannequinRef}
      />
    </Suspense>
  );
};

const GarmentMesh = ({ modelUrl, transform, meshRef, garmentData, mannequinRef }) => {
  const gltf = useLoader(GLTFLoader, modelUrl);
  
  const garmentMesh = useMemo(() => {
    if (!transform) return gltf.scene.clone();
    
    const mesh = gltf.scene.clone();

    // 1) STANDARDIZE GARMENT MESH
    // Canonical target: origin at (0,0,0), front +Z, up +Y, normalized height.
    meshStandardizer.applyStandardization(mesh);
    
    // Measure garment AFTER standardization so all garments share a common basis
    mesh.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(mesh);
    const garmentSize = new THREE.Vector3();
    const garmentCenter = new THREE.Vector3();
    bbox.getSize(garmentSize);
    bbox.getCenter(garmentCenter);
    
    // Use vertical extent (Y) as garment height when possible
    const maxExtent = Math.max(garmentSize.x, garmentSize.y, garmentSize.z);
    const garmentHeight = garmentSize.y || maxExtent;
    const scale = transform.targetHeight / garmentHeight;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 GARMENT:', garmentData.name || 'Unknown');
    console.log('   Type:', garmentData.type);
    console.log('   Raw Size:', garmentSize.toArray().map(n => n.toFixed(3)));
    console.log('   Scale:', scale.toFixed(3));

    // 2) FRONT-ALIGNMENT IN STANDARD SPACE
    // After standardization, the garment's logical front is +Z.
    const garmentFront = '+Z';

    // Read mannequin's true front from its geometry/userData if available
    let mannequinFront = '+Z';
    if (mannequinRef?.current) {
      mannequinFront = detectFrontDirection(mannequinRef.current);
    }

    const [rx, ry, rz] = calculateAlignmentRotation(garmentFront, mannequinFront);

    console.log('   Standardized garment front:', garmentFront);
    console.log('   Aligning garment front to mannequin front:', mannequinFront);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Center garment at origin
    mesh.position.sub(garmentCenter);
    
    // Apply transforms: alignment rotation, scale, and final position
    mesh.rotation.set(rx, ry, rz);
    mesh.scale.set(scale, scale, scale);
    mesh.position.set(...transform.position);
    
    // Enable shadows
    mesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Optional: tag and visualize garment front for debugging
    tagFrontDirection(mesh, garmentFront);
    addFrontMarker(mesh, garmentFront, 0.3, 0xff0000);

    mesh.updateMatrixWorld(true);
    
    return mesh;
  }, [gltf, transform, garmentData, mannequinRef]);

  return <primitive ref={meshRef} object={garmentMesh} />;
};

const LoadingPlaceholder = () => (
  <mesh position={[0, 1, 0]}>
    <boxGeometry args={[0.3, 0.6, 0.2]} />
    <meshStandardMaterial color="#cccccc" transparent opacity={0.3} wireframe />
  </mesh>
);

export default GarmentLoader3D;