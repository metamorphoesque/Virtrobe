import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ClothSimulation = ({ 
  clothPhysics, 
  width = 1, 
  height = 1.5, 
  segmentsX = 20, 
  segmentsY = 30,
  color = '#ffffff',
  texture = null,
  visible = true,
  position = [0, 2, 0]
}) => {
  const meshRef = useRef();
  const geometryRef = useRef();
  const clothDataRef = useRef(null);
  
  // Create cloth physics on mount
  useEffect(() => {
    if (!clothPhysics) return;
    
    const clothData = clothPhysics.createClothGrid(
      width, 
      height, 
      segmentsX, 
      segmentsY,
      position
    );
    
    clothDataRef.current = clothData;
    
    return () => {
      // Cleanup handled by useClothPhysics hook
    };
  }, [clothPhysics, width, height, segmentsX, segmentsY]);
  
  // Create Three.js geometry
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
    geometryRef.current = geo;
    return geo;
  }, [width, height, segmentsX, segmentsY]);
  
  // Update mesh vertices every frame
  useFrame((state, delta) => {
    if (!clothPhysics || !meshRef.current || !clothDataRef.current) return;
    
    // Step physics
    clothPhysics.stepPhysics(delta);
    
    // Update geometry vertices
    const positions = meshRef.current.geometry.attributes.position;
    const { particles } = clothDataRef.current;
    
    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      positions.setXYZ(i, particle.position.x, particle.position.y, particle.position.z);
    }
    
    positions.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  });
  
  if (!visible) return null;
  
  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial 
        color={color}
        side={THREE.DoubleSide}
        map={texture}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
};

export default ClothSimulation;