// src/components/3d/GarmentLoader3D.jsx
// ============================================
// 3D GARMENT LOADER COMPONENT
// Loads GLB meshes from HuggingFace TripoSR
// Auto-scales to mannequin measurements
// ============================================

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

const GarmentLoader3D = ({ 
  garmentData,
  measurements,
  mannequinRef,
  position = [0, 0, 0]
}) => {
  const meshRef = useRef();
  const [mannequinBounds, setMannequinBounds] = useState(null);

  // Extract modelUrl from garmentData
  const modelUrl = garmentData?.modelUrl;
  
  if (!modelUrl) {
    console.warn(' No modelUrl in garmentData');
    return null;
  }

  // Build full URL for GLB file
  const fullModelUrl = modelUrl.startsWith('http') 
    ? modelUrl 
    : `http://localhost:5000${modelUrl}`;

  console.log(' Loading 3D garment from:', fullModelUrl);

  // Get mannequin's bounding box for auto-scaling
  useEffect(() => {
    if (mannequinRef?.current) {
      const mannequin = mannequinRef.current;
      
      // Update world matrix
      mannequin.updateMatrixWorld(true);
      
      // Calculate bounding box
      const box = new THREE.Box3().setFromObject(mannequin);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      
      console.log(' Mannequin bounds:', {
        width: size.x.toFixed(3),
        height: size.y.toFixed(3),
        depth: size.z.toFixed(3)
      });
      
      setMannequinBounds({ size, center });
    }
  }, [mannequinRef, measurements]);

  // Calculate garment scale and position
  const garmentTransform = useMemo(() => {
    if (!mannequinBounds) {
      // Fallback transform
      return {
        scale: 0.5,
        position: [0, 0.6, 0.15],
        rotation: [0, Math.PI / 2, 0]
      };
    }

    const { size, center } = mannequinBounds;
    
    // Garment type-specific scaling
    const garmentType = garmentData.type || 'shirt';
    
    let heightRatio, widthMultiplier, positionY, positionZ;
    
    switch (garmentType.toLowerCase()) {
      case 'shirt':
      case 'tshirt':
      case 'top':
        heightRatio = 0.4;
        widthMultiplier = 1.1;
        positionY = 0.2;
        positionZ = 0.15;
        break;
      
      case 'dress':
        heightRatio = 0.8;
        widthMultiplier = 1.15;
        positionY = 0.1;
        positionZ = 0.15;
        break;
      
      case 'pants':
      case 'jeans':
        heightRatio = 0.5;
        widthMultiplier = 1.0;
        positionY = -0.3;
        positionZ = 0.15;
        break;
      
      default:
        heightRatio = 0.4;
        widthMultiplier = 1.1;
        positionY = 0.2;
        positionZ = 0.15;
    }

    // Calculate scale based on mannequin
    const targetHeight = size.y * heightRatio;
    const targetWidth = size.x * widthMultiplier;
    
    // Use average for uniform scaling
    const scale = (targetHeight + targetWidth) / 2;

    // Position on mannequin surface
    const surfaceOffset = (size.z / 2) + positionZ;
    
    return {
      scale,
      position: [
        surfaceOffset,
        center.y + (size.y * positionY),
        center.z
      ],
      rotation: [0, Math.PI / 2, 0] // Match mannequin rotation
    };
  }, [mannequinBounds, garmentData]);

  console.log(' Garment transform:', garmentTransform);

  return (
    <Suspense fallback={<LoadingPlaceholder />}>
      <GarmentMesh
        modelUrl={fullModelUrl}
        transform={garmentTransform}
        meshRef={meshRef}
      />
    </Suspense>
  );
};

// Separate component for mesh loading (uses Suspense)
const GarmentMesh = ({ modelUrl, transform, meshRef }) => {
  // Load GLB file
  const gltf = useLoader(GLTFLoader, modelUrl);
  
  // Clone and prepare mesh
  const garmentMesh = useMemo(() => {
    const mesh = gltf.scene.clone();
    
    // Apply transform
    mesh.scale.set(transform.scale, transform.scale, transform.scale);
    mesh.position.set(...transform.position);
    mesh.rotation.set(...transform.rotation);
    
    // Enable shadows
    mesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    console.log(' 3D garment mesh loaded and transformed');
    
    return mesh;
  }, [gltf, transform]);

  return <primitive ref={meshRef} object={garmentMesh} />;
};

// Loading placeholder
const LoadingPlaceholder = () => (
  <mesh position={[0, 0.6, 0.15]}>
    <boxGeometry args={[0.5, 0.8, 0.3]} />
    <meshStandardMaterial 
      color="#cccccc" 
      transparent 
      opacity={0.5}
      wireframe
    />
  </mesh>
);

export default GarmentLoader3D;