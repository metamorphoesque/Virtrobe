// src/components/3d/GarmentLoader3D.jsx
// ============================================
// SIMPLE GARMENT LOADER - MANUAL ROTATION
// Just rotate until it looks right
// ============================================

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

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
    const posY = bottom + (size.y * (0.5 + config.yOffset));
    const posX = mannequinData.position.x + (size.x / 2) + config.forwardOffset;
    const posZ = center.z;

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
      />
    </Suspense>
  );
};

const GarmentMesh = ({ modelUrl, transform, meshRef, garmentData }) => {
  const gltf = useLoader(GLTFLoader, modelUrl);
  
  const garmentMesh = useMemo(() => {
    if (!transform) return gltf.scene.clone();
    
    const mesh = gltf.scene.clone();
    
    // Measure garment
    mesh.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(mesh);
    const garmentSize = new THREE.Vector3();
    const garmentCenter = new THREE.Vector3();
    bbox.getSize(garmentSize);
    bbox.getCenter(garmentCenter);
    
    // Find tallest dimension (that's the height)
    const height = Math.max(garmentSize.x, garmentSize.y, garmentSize.z);
    const scale = transform.targetHeight / height;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 GARMENT:', garmentData.name || 'Unknown');
    console.log('   Type:', garmentData.type);
    console.log('   Raw Size:', garmentSize.toArray().map(n => n.toFixed(3)));
    console.log('   Scale:', scale.toFixed(3));
    
    // ═══════════════════════════════════════════════════════
    // ROTATION - CHANGE THIS NUMBER UNTIL IT LOOKS RIGHT
    // ═══════════════════════════════════════════════════════
    
    // Default rotations per garment type (Y-axis rotation in degrees)
    const rotationOverrides = {
      // Library templates
      'aa0d2ef7-318a-4274-a0cb-1f3258894529': 90,  // Simple t-shirt (change this!)
      '7e342658-b3d3-4127-a155-1bfe2ff0fab5': 90,  // Pants (change this!)
    };
    
    // Try to get rotation from database or use default
    const rotationDeg = garmentData.rotation_y_deg || 
                        rotationOverrides[garmentData.taskId] || 
                        rotationOverrides[garmentData.id] || 
                        0;
    
    const rotationRad = (rotationDeg * Math.PI) / 180;
    
    console.log('   Rotation Y:', rotationDeg + '°');
    console.log('   ℹ️  TO FIX: Change rotation_y_deg in database');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Center garment at origin
    mesh.position.sub(garmentCenter);
    
    // Apply transforms
    mesh.rotation.y = rotationRad;
    mesh.scale.set(scale, scale, scale);
    mesh.position.set(...transform.position);
    
    // Enable shadows
    mesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    mesh.updateMatrixWorld(true);
    
    return mesh;
  }, [gltf, transform, garmentData]);

  return <primitive ref={meshRef} object={garmentMesh} />;
};

const LoadingPlaceholder = () => (
  <mesh position={[0, 1, 0]}>
    <boxGeometry args={[0.3, 0.6, 0.2]} />
    <meshStandardMaterial color="#cccccc" transparent opacity={0.3} wireframe />
  </mesh>
);

export default GarmentLoader3D;