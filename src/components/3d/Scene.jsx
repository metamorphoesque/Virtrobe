// src/components/3d/Scene.jsx
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid, useGLTF } from '@react-three/drei';
import MorphableMannequin from './MorphableMannequin';
import DisplayStand from './DisplayStand';



const Scene = ({ 
  measurements, 
  garmentType, 
  garmentColor, 
  showMeasurements, 
  showGarment, 
  autoRotate 
}) => {
  // Calculate vertical offset for mannequin based on height
  // This creates illusion of mannequin being raised/lowered on stand
  const calculateMannequinHeight = () => {
    const { height_cm = 170 } = measurements;
    
    // Base height is 170cm at position 0
    // For every cm above/below 170, adjust by 0.01 units
    const heightBase = 170;
    const heightDelta = height_cm - heightBase;
    const verticalOffset = (heightDelta / 100) * 0.5; // Scale factor for visual effect
    
    return -1 + verticalOffset; // Base position (-1) + offset
  };

  return (
    <Canvas 
      camera={{ 
        position: [0, 1, 4], 
        fov: 50 
      }}
      shadows
      style={{ background: '#fafafa' }}
    >
      {/* ============================================
          LIGHTING SETUP - Minimalist & Clean
          ============================================ */}
      
      {/* Ambient light - soft overall illumination */}
      <ambientLight intensity={0.6} />
      
      {/* Main overhead spotlight - directly above mannequin */}
      <spotLight 
        position={[0, 6, 0]}           // Directly overhead
        intensity={1.5}
        angle={0.6}                    // Spotlight cone angle
        penumbra={0.5}                 // Soft edges
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        target-position={[0, 0, 0]}    // Points down at mannequin
      />
      
      {/* Subtle directional light for definition */}
      <directionalLight 
        position={[2, 3, 2]} 
        intensity={0.4}
      />
      
      {/* Fill lights - reduce harsh shadows */}
      <pointLight position={[-2, 1, -2]} intensity={0.2} />
      <pointLight position={[2, 1, -2]} intensity={0.2} />
      
      {/* ============================================
          ENVIRONMENT & BACKGROUND
          ============================================ */}
      
      {/* HDR environment for realistic reflections */}
      <Environment preset="studio" />
      
      {/* SLEEK DARK MINIMALIST FLOOR */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -1, 0]} 
        receiveShadow
      >
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial 
          color="#2a2a2a"
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
      
      {/* Subtle grid overlay on dark floor */}
      <Grid 
        args={[20, 20]} 
        cellSize={0.5} 
        cellColor="#404040"
        sectionColor="#505050"
        fadeDistance={15}
        fadeStrength={1}
        position={[0, -0.99, 0]}
      />
      
      {/* Contact shadows under the mannequin */}
      <ContactShadows 
        position={[0, -0.99, 0]} 
        opacity={0.4} 
        scale={4} 
        blur={2.5} 
        far={2} 
        color="#000000"
      />
      
      {/* ============================================
          DISPLAY STAND - Fixed on floor
          ============================================ */}
      
      <DisplayStand />
      
      {/* ============================================
          MORPHABLE MANNEQUIN - Adjusts height on stand
          ============================================ */}
      
      <MorphableMannequin 
        measurements={measurements}
        autoRotate={autoRotate}
        standHeight={calculateMannequinHeight()}  // Pass calculated height
      />
      
      {/* ============================================
          CAMERA CONTROLS
          ============================================ */}
      
      <OrbitControls 
        enablePan={false}
        enableZoom={true}
        minDistance={2}
        maxDistance={8}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.5}
        target={[0, 1, 0]}
        enableDamping={true}
        dampingFactor={0.05}
      />
      
    </Canvas>
  );
};

export default Scene;