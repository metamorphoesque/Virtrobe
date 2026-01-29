// src/components/3d/Scene.jsx - COMPLETE WORKING VERSION
// ============================================
// MAIN 3D SCENE WITH CAMERA LOCK
// ============================================

import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import MorphableMannequin from './MorphableMannequin';
import Garment2DOverlay from './Garment2DOverlay';
import DebugOverlay from '../debug/debugOverlay';

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
const CameraController = ({ isLocked, mannequinRotation = 0 }) => {
  const { camera, controls } = useThree();
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Calculate camera position based on mannequin's front-facing direction
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
  }, [mannequinRotation]);
  
  useEffect(() => {
    if (!controls) return;
    
    if (isLocked) {
      console.log('🔒 Locking camera to front view');
      setIsTransitioning(true);
      
      // COMPLETELY DISABLE ALL MOVEMENT EXCEPT ZOOM
      controls.enableRotate = false;
      controls.enablePan = false;
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
        LEFT: null,
        MIDDLE: null,
        RIGHT: null
      };
      
    } else {
      console.log('🔓 Unlocking camera');
      
      controls.enableRotate = true;
      controls.enablePan = false;
      controls.enableZoom = true;
      controls.minDistance = 2;
      controls.maxDistance = 8;
      
      // Reset angle constraints
      controls.minPolarAngle = Math.PI / 4;
      controls.maxPolarAngle = Math.PI / 1.5;
      controls.minAzimuthAngle = -Infinity;
      controls.maxAzimuthAngle = Infinity;
      
      // Restore mouse buttons
      controls.mouseButtons = {
        LEFT: 0,
        MIDDLE: null,
        RIGHT: null
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
  mannequinFrontFacing = 0,
  mannequinRef
}) => {
  const internalRef = useRef();
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
      />
      
      {/* Axis Helper */}
      <axesHelper args={[2]} position={[0, 0.5, 0]} />
      
      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <spotLight position={[0, 6, 0]} intensity={1.2} angle={0.6} penumbra={0.5} castShadow />
      <directionalLight position={[2, 3, 2]} intensity={0.5} />
      <directionalLight position={[-2, 3, 2]} intensity={0.3} />
      <pointLight position={[0, 1, 2]} intensity={0.4} />
      
      <Environment preset="studio" />
      
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.2} metalness={0.1} />
      </mesh>
      
      <Grid args={[20, 20]} cellSize={0.5} cellColor="#404040" sectionColor="#505050" fadeDistance={15} fadeStrength={1} position={[0, 0.01, 0]} />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={4} blur={2.5} far={2} color="#fbf9f9" />
      
      {/* Display Stand */}
      <group rotation={[0, Math.PI / 2, 0]}>
        <DisplayStand position={[0, 0.7, 0]} scale={0.7} />
      </group>
      
      {/* Mannequin */}
      <group rotation={[0, Math.PI / 2, 0]}>
        <MorphableMannequin 
          ref={(node) => {
            internalRef.current = node;
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
      
      {/* Garment Overlay */}
      {showGarment && garmentData && (
        <Garment2DOverlay 
          garmentData={garmentData}
          measurements={measurements}
          mannequinRef={internalRef}
          position={[0, 0, 0]}
        />
      )}
      
      {/* Orbit Controls */}
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
      
      {/* Debug Overlay - Inside Canvas */}
      <DebugOverlay 
        mannequinRef={internalRef}
        garmentData={garmentData}
        cameraLocked={cameraLocked}
      />
    </>
  );
};

const Scene = (props) => {
  const { mannequinFrontFacing = 0, mannequinRef, ...sceneProps } = props;
  const canvasRef = React.useRef(null);
  
  const handleContextLost = (event) => {
    event.preventDefault();
    console.error('⚠️ WebGL context lost. Attempting to restore...');
  };

  const handleContextRestored = () => {
    console.log('✅ WebGL context restored');
  };

  React.useEffect(() => {
    console.log('🎬 Main Scene mounted');
    
    return () => {
      console.log('🧹 Main Scene unmounting');
      
      if (canvasRef.current) {
        const canvas = canvasRef.current.querySelector('canvas');
        if (canvas) {
          canvas.removeEventListener('webglcontextlost', handleContextLost);
          canvas.removeEventListener('webglcontextrestored', handleContextRestored);
        }
      }
    };
  }, []);
  
  return (
    <div ref={canvasRef} className="w-full h-full">
      <Canvas 
        camera={{ position: [0, 1.2, 4], fov: 50 }}
        shadows
        style={{ background: '#fafafa' }}
        gl={{ 
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false
        }}
        onCreated={({ gl }) => {
          console.log('✅ Main Scene WebGL context created');
          gl.domElement.addEventListener('webglcontextlost', handleContextLost, false);
          gl.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);
        }}
      >
        <SceneContent {...sceneProps} mannequinFrontFacing={mannequinFrontFacing} mannequinRef={mannequinRef} />
      </Canvas>
    </div>
  );
};

export default Scene;