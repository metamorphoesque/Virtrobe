import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const GarmentOverlay = ({ measurements, garmentType, color = '#2d3436', autoRotate = true }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });
  
  const scale = measurements.gender === 'male' ? 1.05 : 1.0;
  const bustScale = (measurements.bust_cm / 85) * scale;
  const waistScale = (measurements.waist_cm / 65) * scale;
  const heightScale = measurements.height_cm / 170;
  
  const renderJacket = () => (
    <group ref={meshRef}>
      {/* Jacket Body */}
      <mesh position={[0, 1.15 * heightScale, 0]} castShadow>
        <cylinderGeometry 
          args={[
            (bustScale * 0.15) + 0.04, 
            (bustScale * 0.18) + 0.04, 
            0.5, 
            24, 
            1, 
            true
          ]} 
        />
        <meshStandardMaterial 
          color={color} 
          metalness={0.2} 
          roughness={0.7} 
          side={THREE.DoubleSide} 
        />
      </mesh>
      
      {/* Collar */}
      <mesh position={[0, 1.42 * heightScale, 0]} castShadow>
        <torusGeometry args={[0.1, 0.02, 8, 24]} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.2} 
          roughness={0.7} 
        />
      </mesh>
      
      {/* Left Sleeve */}
      <mesh 
        position={[-0.24 * bustScale, 1.15 * heightScale, 0]} 
        rotation={[0, 0, 0.2]} 
        castShadow
      >
        <cylinderGeometry args={[0.05, 0.045, 0.6, 16]} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.2} 
          roughness={0.7} 
        />
      </mesh>
      
      {/* Right Sleeve */}
      <mesh 
        position={[0.24 * bustScale, 1.15 * heightScale, 0]} 
        rotation={[0, 0, -0.2]} 
        castShadow
      >
        <cylinderGeometry args={[0.05, 0.045, 0.6, 16]} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.2} 
          roughness={0.7} 
        />
      </mesh>
      
      {/* Buttons */}
      {[0, 1, 2].map(i => (
        <mesh 
          key={i} 
          position={[0, (1.3 - i * 0.1) * heightScale, (bustScale * 0.18) + 0.045]}
          castShadow
        >
          <cylinderGeometry args={[0.01, 0.01, 0.005, 16]} />
          <meshStandardMaterial 
            color="#636e72" 
            metalness={0.8} 
            roughness={0.2} 
          />
        </mesh>
      ))}
    </group>
  );
  
  const renderShirt = () => (
    <group ref={meshRef}>
      {/* Shirt Body */}
      <mesh position={[0, 1.15 * heightScale, 0]} castShadow>
        <cylinderGeometry 
          args={[
            (bustScale * 0.14) + 0.03, 
            (bustScale * 0.17) + 0.03, 
            0.45, 
            24, 
            1, 
            true
          ]} 
        />
        <meshStandardMaterial 
          color={color} 
          metalness={0.1} 
          roughness={0.8} 
          side={THREE.DoubleSide} 
        />
      </mesh>
      
      {/* Collar */}
      <mesh position={[0, 1.39 * heightScale, 0]} castShadow>
        <torusGeometry args={[0.09, 0.015, 8, 24]} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Sleeves */}
      <mesh 
        position={[-0.22 * bustScale, 1.15 * heightScale, 0]} 
        rotation={[0, 0, 0.15]} 
        castShadow
      >
        <cylinderGeometry args={[0.045, 0.04, 0.55, 16]} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      <mesh 
        position={[0.22 * bustScale, 1.15 * heightScale, 0]} 
        rotation={[0, 0, -0.15]} 
        castShadow
      >
        <cylinderGeometry args={[0.045, 0.04, 0.55, 16]} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
    </group>
  );
  
  const renderDress = () => (
    <group ref={meshRef}>
      {/* Dress Upper */}
      <mesh position={[0, 1.2 * heightScale, 0]} castShadow>
        <cylinderGeometry 
          args={[
            (bustScale * 0.14) + 0.02, 
            (waistScale * 0.11) + 0.02, 
            0.4, 
            24
          ]} 
        />
        <meshStandardMaterial 
          color={color} 
          metalness={0.15} 
          roughness={0.7} 
        />
      </mesh>
      
      {/* Dress Skirt */}
      <mesh position={[0, 0.75 * heightScale, 0]} castShadow>
        <cylinderGeometry 
          args={[
            (bustScale * 0.2), 
            (waistScale * 0.11) + 0.02, 
            0.5, 
            24
          ]} 
        />
        <meshStandardMaterial 
          color={color} 
          metalness={0.15} 
          roughness={0.7} 
        />
      </mesh>
      
      {/* Straps */}
      <mesh 
        position={[-0.08 * bustScale, 1.4 * heightScale, 0]} 
        rotation={[0, 0, 0.1]} 
        castShadow
      >
        <cylinderGeometry args={[0.015, 0.015, 0.25, 12]} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.15} 
          roughness={0.7} 
        />
      </mesh>
      
      <mesh 
        position={[0.08 * bustScale, 1.4 * heightScale, 0]} 
        rotation={[0, 0, -0.1]} 
        castShadow
      >
        <cylinderGeometry args={[0.015, 0.015, 0.25, 12]} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.15} 
          roughness={0.7} 
        />
      </mesh>
    </group>
  );
  
  switch (garmentType) {
    case 'jacket':
      return renderJacket();
    case 'shirt':
      return renderShirt();
    case 'dress':
      return renderDress();
    default:
      return renderJacket();
  }
};

export default GarmentOverlay;