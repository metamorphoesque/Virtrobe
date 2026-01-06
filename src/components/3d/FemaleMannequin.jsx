import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const FemaleMannequin = ({ measurements, showMeasurements, autoRotate = true }) => {
  const meshRef = useRef();
  
  useFrame((state, delta) => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });
  
  const heightScale = measurements.height_cm / 165;
  const bustScale = measurements.bust_cm / 85;
  const waistScale = measurements.waist_cm / 65;
  const hipScale = measurements.hips_cm / 90;
  
  const skinColor = "#f5e6d3";
  const measurementColor = "#ff6b9d";
  const waistColor = "#c44569";
  const hipColor = "#f78fb3";
  
  return (
    <group ref={meshRef}>
      {/* Head */}
      <mesh position={[0, 1.6 * heightScale, 0]} castShadow>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Neck */}
      <mesh position={[0, 1.46 * heightScale, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.07, 0.14, 16]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Upper Torso (Bust) */}
      <mesh position={[0, 1.2 * heightScale, 0]} castShadow>
        <cylinderGeometry args={[bustScale * 0.14, bustScale * 0.17, 0.35, 16]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Waist */}
      <mesh position={[0, 0.92 * heightScale, 0]} castShadow>
        <cylinderGeometry args={[waistScale * 0.11, bustScale * 0.14, 0.18, 16]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Hips */}
      <mesh position={[0, 0.7 * heightScale, 0]} castShadow>
        <cylinderGeometry args={[hipScale * 0.15, waistScale * 0.11, 0.25, 16]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Left Arm */}
      <mesh 
        position={[-0.2 * bustScale, 1.2 * heightScale, 0]} 
        rotation={[0, 0, 0.15]} 
        castShadow
      >
        <cylinderGeometry args={[0.035, 0.03, 0.55, 12]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Right Arm */}
      <mesh 
        position={[0.2 * bustScale, 1.2 * heightScale, 0]} 
        rotation={[0, 0, -0.15]} 
        castShadow
      >
        <cylinderGeometry args={[0.035, 0.03, 0.55, 12]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Left Leg */}
      <mesh position={[-0.07 * hipScale, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.045, 0.7, 12]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Right Leg */}
      <mesh position={[0.07 * hipScale, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.045, 0.7, 12]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Measurement Indicators */}
      {showMeasurements && (
        <>
          {/* Bust Line */}
          <mesh position={[0, 1.2 * heightScale, 0.19]}>
            <torusGeometry args={[0.17 * bustScale, 0.005, 8, 32]} />
            <meshBasicMaterial color={measurementColor} />
          </mesh>
          
          {/* Waist Line */}
          <mesh position={[0, 0.92 * heightScale, 0.13]}>
            <torusGeometry args={[0.11 * waistScale, 0.005, 8, 32]} />
            <meshBasicMaterial color={waistColor} />
          </mesh>
          
          {/* Hip Line */}
          <mesh position={[0, 0.7 * heightScale, 0.17]}>
            <torusGeometry args={[0.15 * hipScale, 0.005, 8, 32]} />
            <meshBasicMaterial color={hipColor} />
          </mesh>
        </>
      )}
    </group>
  );
};

export default FemaleMannequin;