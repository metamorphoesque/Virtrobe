// 5. src/components/3d/HybridGarment.jsx (UPDATED)
// ============================================
import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const HybridGarment = ({ 
  garmentData,
  autoRotate = false,
  position = [0, 0, 0]
}) => {
  const groupRef = useRef();
  const meshRef = useRef();
  
  useEffect(() => {
    if (!garmentData || !garmentData.mesh) {
      console.warn('⚠️ No garment data provided to HybridGarment');
      return;
    }
    
    console.log('🎨 Rendering hybrid garment:', garmentData.method);
    console.log('   Type:', garmentData.type);
    console.log('   Has shape keys:', garmentData.hasShapeKeys);
    
    // Store the mesh reference
    meshRef.current = garmentData.mesh;
    
  }, [garmentData]);
  
  // Auto-rotation
  useFrame((state, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });
  
  if (!garmentData || !garmentData.mesh) {
    return null;
  }
  
  return (
    <group 
      ref={groupRef} 
      position={position}
    >
      <primitive 
        object={garmentData.mesh} 
        scale={0.5}
      />
      
      {/* Optional: Debug info */}
      {garmentData.method === 'hybrid-template' && (
        <mesh position={[0, 2, 0]} visible={false}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}
    </group>
  );
};

export default HybridGarment;
