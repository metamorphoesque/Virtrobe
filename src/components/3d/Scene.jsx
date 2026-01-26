// src/components/3d/Scene.jsx - WITH CAMERA LOCK
// ============================================
// 2.5D VIRTUAL TRY-ON SYSTEM
// Camera locks to front view when garment is loaded
// ============================================

import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import MorphableMannequin from './MorphableMannequin';
import Garment2DOverlay from './Garment2DOverlay';

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

// Camera Controller - Handles smooth transitions and locking
const CameraController = ({ isLocked, onTransitionComplete }) => {
  const { camera, controls } = useThree();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const targetPosition = useRef(new THREE.Vector3(0, 1.2, 4));
  const targetLookAt = useRef(new THREE.Vector3(0, 1, 0));
  
  useEffect(() => {
    if (!controls) return;
    
    if (isLocked) {
      console.log('🔒 Locking camera to front view');
      setIsTransitioning(true);
      
      // Disable rotation, keep zoom
      controls.enableRotate = false;
      controls.enablePan = false;
      controls.enableZoom = true;
      controls.minDistance = 2;
      controls.maxDistance = 6;
      
    } else {
      console.log('🔓 Unlocking camera');
      
      // Re-enable rotation
      controls.enableRotate = true;
      controls.enablePan = false;
      controls.enableZoom = true;
      controls.minDistance = 2;
      controls.maxDistance = 8;
      controls.minPolarAngle = Math.PI / 4;
      controls.maxPolarAngle = Math.PI / 1.5;
      
      setIsTransitioning(false);
    }
  }, [isLocked, controls]);
  
  useFrame(() => {
    if (!isTransitioning || !controls) return;
    
    // Smooth camera transition to front view
    camera.position.lerp(targetPosition.current, 0.1);
    
    // Smooth look-at transition
    const currentTarget = controls.target.clone();
    currentTarget.lerp(targetLookAt.current, 0.1);
    controls.target.copy(currentTarget);
    controls.update();
    
    // Check if transition is complete
    const distanceToTarget = camera.position.distanceTo(targetPosition.current);
    if (distanceToTarget < 0.01) {
      setIsTransitioning(false);
      if (onTransitionComplete) {
        onTransitionComplete();
      }
      console.log('✅ Camera locked to front view');
    }
  });
  
  return null;
};

// Scene Content Component
const SceneContent = ({ 
  measurements, 
  showGarment, 
  autoRotate,
  garmentData
}) => {
  const mannequinRef = useRef();
  const [cameraLocked, setCameraLocked] = useState(false);
  
  // Lock camera when garment is shown
  useEffect(() => {
    if (showGarment && garmentData) {
      setCameraLocked(true);
    } else {
      setCameraLocked(false);
    }
  }, [showGarment, garmentData]);
  
  // Calculate display stand height
  const calculateStandHeight = () => {
    const { height_cm = 170 } = measurements;
    const heightInMeters = height_cm / 100;
    const legsProportion = 0.45;
    return heightInMeters * legsProportion;
  };
  
  const standHeight = calculateStandHeight();

  return (
    <>
      {/* Camera Controller */}
      <CameraController 
        isLocked={cameraLocked}
        onTransitionComplete={() => console.log('Camera transition complete')}
      />
      
      {/* ============================================
          LIGHTING SETUP - Optimized for 2D Overlay
          ============================================ */}
      
      <ambientLight intensity={0.7} />
      
      <spotLight 
        position={[0, 6, 0]}
        intensity={1.2}
        angle={0.6}
        penumbra={0.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        target-position={[0, 1, 0]}
      />
      
      <directionalLight position={[2, 3, 2]} intensity={0.5} />
      <directionalLight position={[-2, 3, 2]} intensity={0.3} />
      <pointLight position={[0, 1, 2]} intensity={0.4} />
      
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
        color="#fbf9f9"
      />
      
      {/* ============================================
          DISPLAY STAND
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
        autoRotate={autoRotate && !cameraLocked}
        standHeight={standHeight - 0.2}
      />
      
      {/* ============================================
          2.5D GARMENT OVERLAY
          Projects warped garment texture as decal
          ============================================ */}
      
      {showGarment && garmentData && (
        <Garment2DOverlay 
          garmentData={garmentData}
          measurements={measurements}
          mannequinRef={mannequinRef}
          position={[0, 0, 0]}
        />
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
      />
      
      {/* Debug: Camera lock indicator */}
      {cameraLocked && (
        <mesh position={[0, 2.5, 0]} visible={false}>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}
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