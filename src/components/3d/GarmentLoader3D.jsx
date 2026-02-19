// src/components/3d/GarmentLoader3D.jsx
// ============================================
// GARMENT LOADER WITH BROWSER-BASED STANDARDIZATION
// Auto-detects and fixes orientation client-side
// ============================================

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import meshStandardizer from '../../utils/meshStandardizer';

// Garment positioning configs
const ATTACHMENT_POINTS = {
  shirt: {
    anchor: 'chest',
    yOffset: 0.3,
    heightRatio: 0.35,
    forwardOffset: 0.05
  },
  dress: {
    anchor: 'chest',
    yOffset: 0.2,
    heightRatio: 0.70,
    forwardOffset: 0.05
  },
  pants: {
    anchor: 'waist',
    yOffset: -0.1,
    heightRatio: 0.45,
    forwardOffset: 0.05
  },
  jacket: {
    anchor: 'chest',
    yOffset: 0.3,
    heightRatio: 0.40,
    forwardOffset: 0.08
  },
  skirt: {
    anchor: 'waist',
    yOffset: -0.15,
    heightRatio: 0.30,
    forwardOffset: 0.05
  },
  shorts: {
    anchor: 'waist',
    yOffset: -0.2,
    heightRatio: 0.25,
    forwardOffset: 0.05
  }
};

const GarmentLoader3D = ({ garmentData, measurements, mannequinRef }) => {
  const meshRef = useRef();
  const [mannequinData, setMannequinData] = useState(null);

  const modelUrl = garmentData?.modelUrl;
  if (!modelUrl) return null;

  const fullModelUrl = modelUrl.startsWith('http') ? modelUrl : `http://localhost:5000${modelUrl}`;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 GARMENT LOADER (BROWSER STANDARDIZATION)');
  console.log('   Name:', garmentData.name || 'Unknown');
  console.log('   Type:', garmentData.type);
  console.log('   URL:', fullModelUrl);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👤 MANNEQUIN REFERENCE');
      console.log('   Position:', mannequin.position.toArray().map(n => n.toFixed(3)));
      console.log('   Size:', size.toArray().map(n => n.toFixed(3)));
      console.log('   Center:', center.toArray().map(n => n.toFixed(3)));
      console.log('   Bottom Y:', (center.y - size.y / 2).toFixed(3));
      console.log('   COORDINATE SYSTEM: Front = +X, Up = +Y');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      setMannequinData({ 
        size, 
        center, 
        bottom: center.y - size.y / 2,
        position: mannequin.position.clone()
      });
    }
  }, [mannequinRef, measurements]);

  const garmentTransform = useMemo(() => {
    if (!mannequinData) {
      return null;
    }

    const { size, center, bottom } = mannequinData;
    const garmentType = garmentData.type || 'shirt';
    const config = ATTACHMENT_POINTS[garmentType] || ATTACHMENT_POINTS.shirt;

    // SCALE: garments standardized to height = 1.0
    // Scale to match mannequin's target height
    const targetHeight = size.y * config.heightRatio;
    const scale = targetHeight / 1.0;  // Divide by 1.0 (standardized height)

    // POSITION:
    // Y: from bottom + offset
    const posY = bottom + (size.y * (0.5 + config.yOffset));
    
    // X: mannequin front + offset
    const posX = mannequinData.position.x + (size.x / 2) + config.forwardOffset;
    
    // Z: centered
    const posZ = center.z;

    // ROTATION:
    // After browser standardization, garment front is +Z
    // Mannequin front is +X
    // Rotate garment -90° around Y to align
    const rotation = [0, -Math.PI / 2, 0];

    const transform = { scale, position: [posX, posY, posZ], rotation };

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👗 GARMENT PLACEMENT');
    console.log('   Type:', garmentType);
    console.log('   Attachment:', config.anchor);
    console.log('   Y Offset:', (config.yOffset * 100).toFixed(0) + '%');
    console.log('   Target Height:', targetHeight.toFixed(3));
    console.log('   Transform:');
    console.log('     Scale:', scale.toFixed(3));
    console.log('     Position:', transform.position.map(n => n.toFixed(3)));
    console.log('     Rotation:', transform.rotation.map(n => (n * 180 / Math.PI).toFixed(1) + '°'));
    console.log('   Logic: Garment +Z → Mannequin +X (rotate -90°)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return transform;
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
    const rawMesh = gltf.scene.clone();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 RAW GARMENT LOADED');
    
    // STEP 1: STANDARDIZE THE MESH (browser-based)
    const standardizedMesh = meshStandardizer.applyStandardization(rawMesh);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📏 STANDARDIZED GARMENT STATE');
    
    // Verify standardization
    const bbox = new THREE.Box3().setFromObject(standardizedMesh);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);
    
    console.log('   Size:', size.toArray().map(n => n.toFixed(3)));
    console.log('   Center:', center.toArray().map(n => n.toFixed(3)));
    console.log('   Position:', standardizedMesh.position.toArray().map(n => n.toFixed(3)));
    console.log('   Rotation:', standardizedMesh.rotation.toArray().slice(0,3).map(n => (n * 180 / Math.PI).toFixed(1) + '°'));
    console.log('   Expected: Height ~1.0, Origin (0,0,0), Front +Z, Up +Y');
    
    if (!transform) {
      console.log('⏳ Waiting for mannequin data...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return standardizedMesh;
    }
    
    // STEP 2: APPLY FINAL TRANSFORM (positioning on mannequin)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 APPLYING MANNEQUIN PLACEMENT');
    
    standardizedMesh.scale.set(transform.scale, transform.scale, transform.scale);
    standardizedMesh.position.set(...transform.position);
    standardizedMesh.rotation.set(...transform.rotation);
    
    // Enable shadows
    standardizedMesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    standardizedMesh.updateMatrixWorld(true);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ GARMENT READY');
    console.log('   Name:', garmentData.name || 'Unknown');
    console.log('   Type:', garmentData.type);
    console.log('   Final Position:', standardizedMesh.position.toArray().map(n => n.toFixed(3)));
    console.log('   Final Rotation:', standardizedMesh.rotation.toArray().slice(0,3).map(n => (n * 180 / Math.PI).toFixed(1) + '°'));
    console.log('   Final Scale:', standardizedMesh.scale.toArray().map(n => n.toFixed(3)));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return standardizedMesh;
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