// src/components/3d/GarmentLoader3D.jsx
// ============================================
// GARMENT LOADER WITH AUTOMATIC ALIGNMENT
// Handles scaling, rotation, and positioning
// ============================================

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

const GarmentLoader3D = ({ garmentData, measurements, mannequinRef, position = [0, 0, 0] }) => {
  const meshRef = useRef();
  const [mannequinData, setMannequinData] = useState(null);

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

  // Measure mannequin once when it's available
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
      console.log('👤 MANNEQUIN ANALYSIS');
      console.log('   Position:', mannequin.position.toArray().map(n => n.toFixed(3)));
      console.log('   Rotation (rad):', mannequin.rotation.toArray().slice(0, 3).map(n => n.toFixed(3)));
      console.log('   Rotation (deg):', mannequin.rotation.toArray().slice(0, 3).map(n => (n * 180 / Math.PI).toFixed(1) + '°'));
      console.log('   Scale:', mannequin.scale.toArray().map(n => n.toFixed(3)));
      console.log('   Bounding Box:');
      console.log('     Width (X):', size.x.toFixed(3));
      console.log('     Height (Y):', size.y.toFixed(3));
      console.log('     Depth (Z):', size.z.toFixed(3));
      console.log('   Center:', center.toArray().map(n => n.toFixed(3)));
      console.log('   Box Min:', box.min.toArray().map(n => n.toFixed(3)));
      console.log('   Box Max:', box.max.toArray().map(n => n.toFixed(3)));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      setMannequinData({ size, center, position: mannequin.position, rotation: mannequin.rotation });
    }
  }, [mannequinRef, measurements]);

  const garmentTransform = useMemo(() => {
    if (!mannequinData) {
      console.log('⚠️ Mannequin not ready, using default transform');
      return { 
        scale: 0.5, 
        position: [0, 0.6, 0], 
        rotation: [0, Math.PI / 2, 0] 
      };
    }

    const { size, center } = mannequinData;
    const garmentType = garmentData.type || 'shirt';

    // Configuration per garment type
    // heightRatio: what fraction of mannequin height should the garment be
    // positionY: 0=bottom, 0.5=center, 1=top of mannequin
    // offsetForward: how far in front of mannequin surface (to avoid z-fighting)
    const configs = {
      shirt:  { heightRatio: 0.35, positionY: 0.65, offsetForward: 0.05 },
      dress:  { heightRatio: 0.70, positionY: 0.50, offsetForward: 0.05 },
      pants:  { heightRatio: 0.45, positionY: 0.25, offsetForward: 0.05 },
      jacket: { heightRatio: 0.40, positionY: 0.65, offsetForward: 0.08 },
      skirt:  { heightRatio: 0.30, positionY: 0.35, offsetForward: 0.05 },
      shorts: { heightRatio: 0.25, positionY: 0.30, offsetForward: 0.05 }
    };
    const config = configs[garmentType] || configs.shirt;

    // SCALE: Match garment size to mannequin
    // Target height for the garment
    const targetHeight = size.y * config.heightRatio;
    const scale = targetHeight;

    // POSITION:
    // Y: Vertical position on mannequin
    // Start from bottom of mannequin, move up by positionY fraction
    const bottom = center.y - (size.y / 2);
    const posY = bottom + (size.y * config.positionY);
    
    // X: Forward offset (mannequin is rotated 90°, so X becomes "forward")
    // After Scene.jsx rotates mannequin by 90°, the mannequin's local X becomes world Z
    // We want to position garment in front of mannequin
    const posX = config.offsetForward;
    
    // Z: Center horizontally
    const posZ = center.z;

    // ROTATION:
    // Scene.jsx wraps mannequin in <group rotation={[0, Math.PI/2, 0]}>
    // So mannequin's local space is rotated 90° around Y
    // Garment also gets wrapped in same rotation group
    // So garment's local Y-rotation should match mannequin's local orientation
    
    // If garment GLB is facing +Z in its local space, and we want it facing same as mannequin:
    // Mannequin after 90° group rotation faces +X in world space
    // Garment needs same orientation, so 0° local rotation
    const rotation = [0, 0, 0]; // Start with no rotation, same as mannequin

    const transform = {
      scale,
      position: [posX, posY, posZ],
      rotation
    };

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👗 GARMENT TRANSFORM CALCULATED');
    console.log('   Type:', garmentType);
    console.log('   Config:', config);
    console.log('   Calculations:');
    console.log('     Target Height:', targetHeight.toFixed(3));
    console.log('     Mannequin Bottom Y:', bottom.toFixed(3));
    console.log('     Position Fraction:', config.positionY);
    console.log('   Final Transform:');
    console.log('     Scale:', transform.scale.toFixed(3));
    console.log('     Position:', transform.position.map(n => n.toFixed(3)));
    console.log('     Rotation (rad):', transform.rotation.map(n => n.toFixed(3)));
    console.log('     Rotation (deg):', transform.rotation.map(n => (n * 180 / Math.PI).toFixed(1) + '°'));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return transform;
  }, [mannequinData, garmentData]);

  return (
    <Suspense fallback={<LoadingPlaceholder />}>
      <GarmentMesh 
        modelUrl={fullModelUrl} 
        transform={garmentTransform} 
        meshRef={meshRef}
        garmentName={garmentData.name}
        garmentType={garmentData.type}
      />
    </Suspense>
  );
};

const GarmentMesh = ({ modelUrl, transform, meshRef, garmentName, garmentType }) => {
  const gltf = useLoader(GLTFLoader, modelUrl);
  
  const garmentMesh = useMemo(() => {
    const mesh = gltf.scene.clone();
    
    // Analyze the loaded garment BEFORE transformation
    const garmentBox = new THREE.Box3().setFromObject(mesh);
    const garmentSize = new THREE.Vector3();
    garmentBox.getSize(garmentSize);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 RAW GARMENT GLB ANALYSIS');
    console.log('   Original Size:');
    console.log('     Width (X):', garmentSize.x.toFixed(3));
    console.log('     Height (Y):', garmentSize.y.toFixed(3));
    console.log('     Depth (Z):', garmentSize.z.toFixed(3));
    console.log('   Original Rotation:', mesh.rotation.toArray().slice(0, 3).map(n => (n * 180 / Math.PI).toFixed(1) + '°'));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Apply transformations
    mesh.scale.set(transform.scale, transform.scale, transform.scale);
    mesh.position.set(...transform.position);
    mesh.rotation.set(...transform.rotation);
    
    // Enable shadows
    mesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Debug: Log material info
        if (child.material) {
          console.log('   Material:', child.material.type, 'Color:', child.material.color?.getHexString());
        }
      }
    });

    // Analyze AFTER transformation
    mesh.updateMatrixWorld(true);
    const transformedBox = new THREE.Box3().setFromObject(mesh);
    const transformedSize = new THREE.Vector3();
    transformedBox.getSize(transformedSize);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ GARMENT MESH LOADED & TRANSFORMED');
    console.log('   Name:', garmentName);
    console.log('   Type:', garmentType);
    console.log('   Transformed Size:');
    console.log('     Width:', transformedSize.x.toFixed(3));
    console.log('     Height:', transformedSize.y.toFixed(3));
    console.log('     Depth:', transformedSize.z.toFixed(3));
    console.log('   Final Position:', mesh.position.toArray().map(n => n.toFixed(3)));
    console.log('   Final Rotation (deg):', mesh.rotation.toArray().slice(0, 3).map(n => (n * 180 / Math.PI).toFixed(1) + '°'));
    console.log('   Final Scale:', mesh.scale.toArray().map(n => n.toFixed(3)));
    console.log('   Facing Direction:', getFacingDirection(mesh.rotation));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return mesh;
  }, [gltf, transform, garmentName, garmentType]);

  return <primitive ref={meshRef} object={garmentMesh} />;
};

// Helper to determine which direction mesh is facing
const getFacingDirection = (rotation) => {
  const yRot = rotation.y % (Math.PI * 2);
  const angle = yRot * 180 / Math.PI;
  
  if (angle >= -45 && angle < 45) return '+Z (forward)';
  if (angle >= 45 && angle < 135) return '+X (right)';
  if (angle >= 135 || angle < -135) return '-Z (backward)';
  if (angle >= -135 && angle < -45) return '-X (left)';
  return 'unknown';
};

const LoadingPlaceholder = () => (
  <mesh position={[0, 1, 0]}>
    <boxGeometry args={[0.5, 0.8, 0.3]} />
    <meshStandardMaterial color="#cccccc" transparent opacity={0.3} wireframe />
  </mesh>
);

export default GarmentLoader3D;