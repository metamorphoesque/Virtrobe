// UPDATED: src/components/3d/HybridGarment.jsx
// Add physics simulation
// ============================================
import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useClothPhysics } from '../../hooks/useClothPhysics';

const HybridGarment = ({ 
  garmentData,
  measurements,
  autoRotate = false,
  enablePhysics = false,
  position = [0, 0, 0]
}) => {
  const groupRef = useRef();
  const meshRef = useRef();
  
  // Initialize cloth physics
  const clothPhysics = useClothPhysics({ enabled: enablePhysics });
  
  useEffect(() => {
    if (!garmentData?.mesh) {
      console.warn('⚠️ No garment data');
      return;
    }
    
    console.log('🎨 Rendering hybrid garment:', garmentData.method);
    meshRef.current = garmentData.mesh;
    
    // Create mannequin collider for physics
    if (enablePhysics && clothPhysics.createMannequinCollider) {
      clothPhysics.createMannequinCollider(measurements);
      console.log('🧍 Mannequin collider created for physics');
    }
    
  }, [garmentData, enablePhysics, measurements, clothPhysics]);
  
  // Physics simulation
  useFrame((state, delta) => {
    if (enablePhysics && clothPhysics.enabled) {
      clothPhysics.step(delta);
      
      // Apply wind
      if (Math.random() < 0.1) {
        clothPhysics.applyWind(0.3);
      }
      
      // Update mesh vertices from physics (if using cloth body)
      // This would require more complex integration
    }
    
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });
  
  if (!garmentData?.mesh) return null;
  
  return (
    <group ref={groupRef} position={position}>
      <primitive object={garmentData.mesh} />
      
      {/* Debug: Show that physics is active */}
      {enablePhysics && (
        <mesh position={[0, 2, 0]} visible={false}>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}
    </group>
  );
};

export default HybridGarment;