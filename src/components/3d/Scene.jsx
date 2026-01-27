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

// Display Stand Component with Clone Support
const DisplayStand = ({ position = [0, 0, 0], scale = 1 }) => {
  const { scene } = useGLTF('/models/DisplayStand.glb');
  
  // Clone the scene to avoid sharing between canvases
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);
  
  return (
    <primitive 
      object={clonedScene} 
      position={position}
      scale={scale}
    />
  );
};

useGLTF.preload('/models/DisplayStand.glb');

// Camera Controller - Handles smooth transitions and locking
const CameraController = ({ isLocked, onTransitionComplete, mannequinRotation = 0 }) => {
  const { camera, controls } = useThree();
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Calculate camera position based on mannequin's front-facing direction
  // mannequinRotation: 0 = facing +Z, 90 = facing -X, 180 = facing -Z, 270 = facing +X
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3(0, 1, 0));
  
  useEffect(() => {
    // Convert mannequin rotation to camera position
    const angle = (mannequinRotation * Math.PI) / 180;
    const distance = 4;
    targetPosition.current.set(
      Math.sin(angle) * distance,
      1.2,
      Math.cos(angle) * distance
    );
    console.log('📐 Camera target position:', targetPosition.current);
  }, [mannequinRotation]);
  
  useEffect(() => {
    if (!controls) return;
    
    if (isLocked) {
      console.log('🔒 Locking camera to front view');
      setIsTransitioning(true);
      
      // COMPLETELY DISABLE ALL MOVEMENT EXCEPT ZOOM
      controls.enableRotate = false;
      controls.enablePan = false; // Disables right-click pan
      controls.enableZoom = true;
      controls.minDistance = 2;
      controls.maxDistance = 6;
      
      // Lock polar and azimuth angles
      controls.minPolarAngle = controls.getPolarAngle();
      controls.maxPolarAngle = controls.getPolarAngle();
      controls.minAzimuthAngle = controls.getAzimuthalAngle();
      controls.maxAzimuthAngle = controls.getAzimuthalAngle();
      
      // Disable mouse buttons for rotation and pan
      controls.mouseButtons = {
        LEFT: null,   // Disable left-click rotate
        MIDDLE: null, // Disable middle-click pan
        RIGHT: null   // Disable right-click pan
      };
      
    } else {
      console.log('🔓 Unlocking camera');
      
      // Re-enable rotation with constraints
      controls.enableRotate = true;
      controls.enablePan = false; // Keep pan disabled always
      controls.enableZoom = true;
      controls.minDistance = 2;
      controls.maxDistance = 8;
      
      // Reset angle constraints
      controls.minPolarAngle = Math.PI / 4;
      controls.maxPolarAngle = Math.PI / 1.5;
      controls.minAzimuthAngle = -Infinity;
      controls.maxAzimuthAngle = Infinity;
      
      // Restore mouse buttons (but no pan)
      controls.mouseButtons = {
        LEFT: 0,      // Left-click rotate
        MIDDLE: null, // No middle-click
        RIGHT: null   // No right-click pan
      };
      
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
  garmentData,
  mannequinFrontFacing = 0 // NEW: 0=+Z, 90=-X, 180=-Z, 270=+X
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
        mannequinRotation={mannequinFrontFacing}
        onTransitionComplete={() => console.log('Camera transition complete')}
      />
      
      {/* ============================================
          DEBUG: AXIS GIZMO - Shows scene orientation
          Red = X (Right), Green = Y (Up), Blue = Z (Forward)
          ============================================ */}
      
      <axesHelper args={[2]} position={[0, 0.5, 0]} />
      
      {/* Labels for axes */}
      <group position={[0, 0.5, 0]}>
        {/* X axis label */}
        <mesh position={[2.2, 0, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
        
        {/* Y axis label */}
        <mesh position={[0, 2.2, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
        
        {/* Z axis label */}
        <mesh position={[0, 0, 2.2]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#0000ff" />
        </mesh>
      </group>
      
      {/* Front-facing indicator arrow */}
      {cameraLocked && (
        <group position={[0, 1.5, 0]}>
          <mesh position={[0, 0, 1.5]}>
            <coneGeometry args={[0.1, 0.3, 8]} />
            <meshBasicMaterial color="#ffff00" />
          </mesh>
        </group>
      )}
      
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
          DISPLAY STAND - Rotated to match mannequin
          ============================================ */}
      
      <group rotation={[0, Math.PI / 2, 0]}>
        <DisplayStand 
          position={[0, 0.7, 0]}
          scale={0.7}
        />
      </group>
      
      {/* ============================================
          MORPHABLE MANNEQUIN - With Rotation Fix
          ============================================ */}
      
      <group rotation={[0, Math.PI / 2, 0]}> {/* 90° rotation to face front */}
        <MorphableMannequin 
          ref={(node) => {
            internalMannequinRef.current = node;
            if (mannequinRef) {
              if (typeof mannequinRef === 'function') {
                mannequinRef(node);
              } else {
                mannequinRef.current = node;
              }
            }
          }}
          measurements={measurements}
          autoRotate={autoRotate && !cameraLocked}
          standHeight={standHeight - 0.2}
        />
      </group>
      
      {/* ============================================
          2.5D GARMENT OVERLAY
          Projects warped garment texture as decal
          ============================================ */}
      
      {showGarment && garmentData && (
        <Garment2DOverlay 
          garmentData={garmentData}
          measurements={measurements}
          mannequinRef={internalMannequinRef}
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
      
      {/* Debug: Mannequin Orientation Helpers */}
      {internalMannequinRef.current && false && ( // Set to true to see axes
        <group position={[0, 1, 0]}>
          {/* Red = X axis (Right) */}
          <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 0.5, 0xff0000]} />
          {/* Green = Y axis (Up) */}
          <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.5, 0x00ff00]} />
          {/* Blue = Z axis (Forward in Three.js) */}
          <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 0.5, 0x0000ff]} />
        </group>
      )}
      
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
  // Extract mannequinFrontFacing if provided, default to 0 (+Z axis)
  const { mannequinFrontFacing = 0, ...sceneProps } = props;
  
  // Handle context lost/restored
  const handleContextLost = (event) => {
    event.preventDefault();
    console.error('⚠️ WebGL context lost. Attempting to restore...');
  };

  const handleContextRestored = () => {
    console.log('✅ WebGL context restored');
  };

  React.useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('webglcontextlost', handleContextLost);
      canvas.addEventListener('webglcontextrestored', handleContextRestored);
      
      return () => {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      };
    }
  }, []);
  
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
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance', // Request better GPU
        failIfMajorPerformanceCaveat: false
      }}
      onCreated={({ gl }) => {
        // Enable context loss handling
        gl.domElement.addEventListener('webglcontextlost', handleContextLost, false);
        gl.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);
      }}
    >
      <SceneContent {...sceneProps} mannequinFrontFacing={mannequinFrontFacing} />
    </Canvas>
  );
};

export default Scene;