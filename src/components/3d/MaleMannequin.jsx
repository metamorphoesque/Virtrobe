import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const MaleMannequin = ({ measurements, showMeasurements, autoRotate = true }) => {
  const meshRef = useRef();
  
  useFrame((state, delta) => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });
  
  const heightScale = measurements.height_cm / 175;
  const chestScale = measurements.bust_cm / 95;
  const waistScale = measurements.waist_cm / 80;
  const shoulderScale = measurements.shoulder_width_cm / 45;
  
  const skinColor = "#e8d4c0";
  const shoulderColor = "#4a90e2";
  const chestColor = "#5dade2";
  const waistColor = "#3498db";
  
  return (
    <group ref={meshRef}>
      {/* Head */}
      <mesh position={[0, 1.65 * heightScale, 0]} castShadow>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Neck */}
      <mesh position={[0, 1.5 * heightScale, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.08, 0.15, 16]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Broad Shoulders/Chest */}
      <mesh position={[0, 1.25 * heightScale, 0]} castShadow>
        <cylinderGeometry args={[chestScale * 0.16, chestScale * 0.19, 0.4, 16]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Waist */}
      <mesh position={[0, 0.95 * heightScale, 0]} castShadow>
        <cylinderGeometry args={[waistScale * 0.14, chestScale * 0.16, 0.22, 16]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Hips (narrower for male) */}
      <mesh position={[0, 0.7 * heightScale, 0]} castShadow>
        <cylinderGeometry args={[waistScale * 0.15, waistScale * 0.14, 0.28, 16]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Left Arm (Muscular) */}
      <mesh 
        position={[-0.24 * shoulderScale, 1.25 * heightScale, 0]} 
        rotation={[0, 0, 0.2]} 
        castShadow
      >
        <cylinderGeometry args={[0.045, 0.04, 0.6, 12]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Right Arm (Muscular) */}
      <mesh 
        position={[0.24 * shoulderScale, 1.25 * heightScale, 0]} 
        rotation={[0, 0, -0.2]} 
        castShadow
      >
        <cylinderGeometry args={[0.045, 0.04, 0.6, 12]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Left Leg */}
      <mesh position={[-0.08, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.055, 0.75, 12]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Right Leg */}
      <mesh position={[0.08, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.055, 0.75, 12]} />
        <meshStandardMaterial 
          color={skinColor} 
          metalness={0.1} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Measurement Indicators */}
      {showMeasurements && (
        <>
          {/* Shoulder Width Line */}
          <mesh position={[0, 1.4 * heightScale, 0.21]}>
            <boxGeometry args={[0.48 * shoulderScale, 0.01, 0.01]} />
            <meshBasicMaterial color={shoulderColor} />
          </mesh>
          
          {/* Chest Line */}
          <mesh position={[0, 1.25 * heightScale, 0.2]}>
            <torusGeometry args={[0.19 * chestScale, 0.005, 8, 32]} />
            <meshBasicMaterial color={chestColor} />
          </mesh>
          
          {/* Waist Line */}
          <mesh position={[0, 0.95 * heightScale, 0.15]}>
            <torusGeometry args={[0.14 * waistScale, 0.005, 8, 32]} />
            <meshBasicMaterial color={waistColor} />
          </mesh>
        </>
      )}
    </group>
  );
};

export default MaleMannequin;