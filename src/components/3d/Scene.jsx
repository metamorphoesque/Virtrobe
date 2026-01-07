// src/components/3d/Scene.jsx
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei';
import MorphableMannequin from './MorphableMannequin';

const Scene = ({ 
  measurements, 
  garmentType, 
  garmentColor, 
  showMeasurements, 
  showGarment, 
  autoRotate 
}) => {
  return (
    <Canvas 
      camera={{ 
        position: [0, 1, 3], 
        fov: 50 
      }}
      shadows
      style={{ background: '#f5f5f5' }}
    >
      {/* ============================================
          LIGHTING SETUP
          ============================================ */}
      
      {/* Ambient light - soft overall illumination */}
      <ambientLight intensity={0.5} />
      
      {/* Main directional light - simulates sunlight */}
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      
      {/* Fill lights - reduce harsh shadows */}
      <pointLight position={[-5, 3, -5]} intensity={0.3} />
      <pointLight position={[5, 3, -5]} intensity={0.3} />
      
      {/* ============================================
          ENVIRONMENT & BACKGROUND
          ============================================ */}
      
      {/* HDR environment for realistic reflections */}
      <Environment preset="studio" />
      
      {/* Optional: Floor grid for reference */}
      <Grid 
        args={[20, 20]} 
        cellSize={0.5} 
        cellColor="#d4d4d4" 
        sectionColor="#a3a3a3"
        fadeDistance={25}
        fadeStrength={1}
        position={[0, -1, 0]}
      />
      
      {/* Contact shadows under the mannequin */}
      <ContactShadows 
        position={[0, -0.99, 0]} 
        opacity={0.3} 
        scale={3} 
        blur={2} 
        far={2} 
      />
      
      {/* ============================================
          YOUR MORPHABLE MANNEQUIN
          ============================================ */}
      
      <MorphableMannequin 
        measurements={measurements}
        autoRotate={autoRotate}
      />
      
      {/* ============================================
          CAMERA CONTROLS
          ============================================ */}
      
      <OrbitControls 
        enablePan={false}
        enableZoom={true}
        minDistance={1.5}
        maxDistance={5}
        minPolarAngle={Math.PI / 4}  // Limit vertical rotation (don't go too low)
        maxPolarAngle={Math.PI / 1.5} // Limit vertical rotation (don't go too high)
        target={[0, 0.5, 0]}  // Look at mannequin center
        enableDamping={true}
        dampingFactor={0.05}
      />
      
    </Canvas>
  );
};

export default Scene;