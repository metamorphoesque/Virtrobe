// src/components/3d/Scene.jsx (UNIFIED SYSTEM)
// Single rendering path: HybridGarment handles everything
import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid, useGLTF } from '@react-three/drei';
import MorphableMannequin from './MorphableMannequin';
import HybridGarment from './HybridGarment';
import { useClothPhysics } from '../../hooks/useClothPhysics';

// Display Stand Component
const DisplayStand = ({ position = [0, 0, 0], scale = 1 }) => {
  const { scene } = useGLTF('/models/DisplayStand.glb');
  
  return (
    <primitive 
      object={scene} 
      position={position}
      scale={scale}
    />
  );
};

useGLTF.preload('/models/DisplayStand.glb');

// Scene Content Component
const SceneContent = ({ 
  measurements, 
  garmentType, 
  garmentColor, 
  showMeasurements, 
  showGarment, 
  autoRotate,
  garmentData,
  enableClothPhysics = false
}) => {
  const mannequinRef = useRef();
  
  // Calculate display stand height
  const calculateStandHeight = () => {
    const { height_cm = 170 } = measurements;
    const heightInMeters = height_cm / 100;
    const legsProportion = 0.45;
    return heightInMeters * legsProportion;
  };
  
  const standHeight = calculateStandHeight();
  
  // Initialize cloth physics (always, but only enabled when needed)
  const clothPhysics = useClothPhysics({ 
    enabled: enableClothPhysics && showGarment 
  });

  return (
    <>
      {/* ============================================
          LIGHTING SETUP - Minimalist & Clean
          ============================================ */}
      
      <ambientLight intensity={0.6} />
      
      <spotLight 
        position={[0, 6, 0]}
        intensity={1.5}
        angle={0.6}
        penumbra={0.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        target-position={[0, 1, 0]}
      />
      
      <directionalLight position={[2, 3, 2]} intensity={0.4} />
      <pointLight position={[-2, 1, -2]} intensity={0.2} />
      <pointLight position={[2, 1, -2]} intensity={0.2} />
      
      {/* ============================================
          ENVIRONMENT & BACKGROUND
          ============================================ */}
      
      <Environment preset="studio" />
      
      {/* SLEEK DARK MINIMALIST FLOOR */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        receiveShadow
      >
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial 
          color="#2a2a2a"
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
      
      {/* Subtle grid overlay */}
      <Grid 
        args={[20, 20]} 
        cellSize={0.5} 
        cellColor="#404040"
        sectionColor="#505050"
        fadeDistance={15}
        fadeStrength={1}
        position={[0, 0.01, 0]}
      />
      
      {/* Contact shadows */}
      <ContactShadows 
        position={[0, 0.01, 0]} 
        opacity={0.4} 
        scale={4} 
        blur={2.5} 
        far={2} 
        color="#000000"
      />
      
      {/* ============================================
          DISPLAY STAND - Fixed position
          ============================================ */}
      
      <DisplayStand 
        position={[0, 0.7, 0]}
        scale={0.7}
      />
      
      {/* ============================================
          MORPHABLE MANNEQUIN
          ============================================ */}
      
      <MorphableMannequin 
        ref={mannequinRef}
        measurements={measurements}
        autoRotate={autoRotate && !enableClothPhysics && !showGarment}
        standHeight={standHeight - 0.2}
      />
      
      {/* ============================================
          UNIFIED GARMENT RENDERING
          Single component handles both modes:
          - Physics OFF: Static depth-deformed template
          - Physics ON: Dynamic cloth simulation
          ============================================ */}
      
      {showGarment && garmentData && (
        <HybridGarment 
          garmentData={garmentData}
          measurements={measurements}
          clothPhysics={clothPhysics}
          autoRotate={autoRotate}
          enablePhysics={enableClothPhysics}
          position={[0, 0, 0]}
        />
      )}
      
      {/* ============================================
          DEBUG VISUALIZATION
          ============================================ */}
      
      {garmentData && (
        <>
          {/* Physics status indicator */}
          <mesh position={[-1.5, 2, 0]} visible={false}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshBasicMaterial color={enableClothPhysics ? "#00ff00" : "#ff0000"} />
          </mesh>
          
          {/* Garment type label */}
          <mesh position={[1.5, 2, 0]} visible={false}>
            <sphereGeometry args={[0.05]} />
            <meshBasicMaterial color="#0000ff" />
          </mesh>
        </>
      )}
      
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
        enabled={!enableClothPhysics} // Disable orbit when physics is on to avoid conflicts
      />
    </>
  );
};

const Scene = (props) => {
  return (
    <Canvas 
      camera={{ 
        position: [0, 1.2, 4], 
        fov: 50 
      }}
      shadows
      style={{ background: '#fafafa' }}
      gl={{ 
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true
      }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
};

export default Scene;