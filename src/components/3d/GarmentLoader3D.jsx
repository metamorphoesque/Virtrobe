// src/components/3d/GarmentLoader3D.jsx
// WITH DETAILED CONSOLE LOGS FOR POSITIONING

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

const GarmentLoader3D = ({ garmentData, measurements, mannequinRef, position = [0, 0, 0] }) => {
  const meshRef = useRef();
  const [mannequinBounds, setMannequinBounds] = useState(null);

  const modelUrl = garmentData?.modelUrl;
  if (!modelUrl) {
    console.warn('⚠️ No modelUrl in garmentData');
    return null;
  }

  const fullModelUrl = modelUrl.startsWith('http') ? modelUrl : `http://localhost:5000${modelUrl}`;
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 GARMENT LOADER INITIALIZED');
  console.log('   Name:', garmentData.name);
  console.log('   Type:', garmentData.type);
  console.log('   URL:', fullModelUrl);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
      console.log('👤 MANNEQUIN MEASUREMENTS');
      console.log('   Position:', mannequin.position.toArray().map(n => n.toFixed(3)));
      console.log('   Rotation:', mannequin.rotation.toArray().slice(0, 3).map(n => (n * 180 / Math.PI).toFixed(1) + '°'));
      console.log('   Bounding Box:');
      console.log('     Width (X):', size.x.toFixed(3));
      console.log('     Height (Y):', size.y.toFixed(3));
      console.log('     Depth (Z):', size.z.toFixed(3));
      console.log('   Center:', center.toArray().map(n => n.toFixed(3)));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      setMannequinBounds({ size, center });
    }
  }, [mannequinRef, measurements]);

  const garmentTransform = useMemo(() => {
    if (!mannequinBounds) {
      const defaultTransform = { 
        scale: 0.5, 
        position: [0, 0.6, 0.15], 
        rotation: [0, Math.PI / 2, 0] 
      };
      console.log('⚠️ Using default transform (mannequin not ready)');
      return defaultTransform;
    }

    const { size, center } = mannequinBounds;
    const garmentType = garmentData.type || 'shirt';

    const config = {
      shirt:  { heightRatio: 0.40, positionY:  0.20, positionZ: 0.20 },
      dress:  { heightRatio: 0.75, positionY:  0.05, positionZ: 0.20 },
      pants:  { heightRatio: 0.50, positionY: -0.30, positionZ: 0.20 },
      jacket: { heightRatio: 0.45, positionY:  0.20, positionZ: 0.25 },
      skirt:  { heightRatio: 0.35, positionY: -0.10, positionZ: 0.20 },
      shorts: { heightRatio: 0.30, positionY: -0.20, positionZ: 0.20 }
    }[garmentType] || { heightRatio: 0.40, positionY: 0.20, positionZ: 0.20 };

    const scale = size.y * config.heightRatio;

    // Position directly in front of mannequin
    // After 90° rotation, X becomes the "forward" axis
    const surfaceOffset = (size.x / 2) + config.positionZ;

    const transform = {
      scale,
      position: [
        surfaceOffset,                           // X: forward (toward camera)
        center.y + (size.y * config.positionY),  // Y: up/down
        center.z                                 // Z: left/right (centered)
      ],
      rotation: [0, Math.PI / 2, 0]
    };

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👗 GARMENT TRANSFORM CALCULATED');
    console.log('   Type:', garmentType);
    console.log('   Config:', config);
    console.log('   Scale:', transform.scale.toFixed(3));
    console.log('   Position:', transform.position.map(n => n.toFixed(3)));
    console.log('   Rotation:', transform.rotation.map(n => (n * 180 / Math.PI).toFixed(1) + '°'));
    console.log('   Surface Offset:', surfaceOffset.toFixed(3));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return transform;
  }, [mannequinBounds, garmentData]);

  return (
    <Suspense fallback={<LoadingPlaceholder />}>
      <GarmentMesh 
        modelUrl={fullModelUrl} 
        transform={garmentTransform} 
        meshRef={meshRef}
        garmentName={garmentData.name}
      />
    </Suspense>
  );
};

const GarmentMesh = ({ modelUrl, transform, meshRef, garmentName }) => {
  const gltf = useLoader(GLTFLoader, modelUrl);
  
  const garmentMesh = useMemo(() => {
    const mesh = gltf.scene.clone();
    mesh.scale.set(transform.scale, transform.scale, transform.scale);
    mesh.position.set(...transform.position);
    mesh.rotation.set(...transform.rotation);
    
    mesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ GARMENT MESH LOADED');
    console.log('   Name:', garmentName);
    console.log('   Final Position:', mesh.position.toArray().map(n => n.toFixed(3)));
    console.log('   Final Rotation:', mesh.rotation.toArray().slice(0, 3).map(n => (n * 180 / Math.PI).toFixed(1) + '°'));
    console.log('   Final Scale:', mesh.scale.toArray().map(n => n.toFixed(3)));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return mesh;
  }, [gltf, transform, garmentName]);

  return <primitive ref={meshRef} object={garmentMesh} />;
};

const LoadingPlaceholder = () => (
  <mesh position={[0, 0.6, 0.15]}>
    <boxGeometry args={[0.5, 0.8, 0.3]} />
    <meshStandardMaterial color="#cccccc" transparent opacity={0.5} wireframe />
  </mesh>
);

export default GarmentLoader3D;