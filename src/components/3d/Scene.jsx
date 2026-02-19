// src/components/3d/Scene.jsx - FIXED VIEW VERSION
// Camera is COMPLETELY STATIC - no user control at all

import React, { useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, Grid, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import MorphableMannequin from './MorphableMannequin';
import GarmentLoader3D from './GarmentLoader3D';

const DisplayStand = ({ position = [0, 0, 0], scale = 1 }) => {
  const { scene } = useGLTF('/models/DisplayStand.glb');
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);
  return <primitive object={clonedScene} position={position} scale={scale} />;
};

useGLTF.preload('/models/DisplayStand.glb');

// Fixed camera - no user interaction
const CameraController = () => {
  const { camera } = useThree();
  
  useEffect(() => {
    // Fixed front view
    camera.position.set(0, 1.2, 4);
    camera.lookAt(0, 1, 0);
    camera.updateProjectionMatrix();
    
    console.log('📷 Camera fixed (no user control)');
  }, [camera]);
  
  return null;
};

// Smooth rotation controller for mannequin
const MannequinRotationController = ({ groupRef, shouldFaceFront }) => {
  useFrame(() => {
    if (!groupRef.current) return;
    
    if (shouldFaceFront) {
      // Smoothly rotate to face front (Math.PI / 2)
      const targetRotation = Math.PI / 2;
      const currentRotation = groupRef.current.rotation.y;
      
      // Smooth interpolation
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        currentRotation,
        targetRotation,
        0.1 // Speed (0.1 = smooth, 0.5 = fast)
      );
      
      // Check if reached target
      const diff = Math.abs(targetRotation - groupRef.current.rotation.y);
      if (diff < 0.01) {
        groupRef.current.rotation.y = targetRotation;
      }
    }
  });
  
  return null;
};

const SceneContent = ({ 
  measurements, 
  showGarment, 
  autoRotate,
  garmentData,
  mannequinRef
}) => {
  const internalRef = useRef();
  const groupRef = useRef(); // Reference to mannequin group
  
  const calculateStandHeight = () => {
    const { height_cm = 170 } = measurements;
    return (height_cm / 100) * 0.45;
  };
  
  const standHeight = calculateStandHeight();

  return (
    <>
      <CameraController />
      
      {/* Smooth rotation controller */}
      <MannequinRotationController 
        groupRef={groupRef} 
        shouldFaceFront={showGarment && garmentData}
      />
      
      {/* Lighting - softer for minimalist look */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      
      <Environment preset="city" background={false} />
      
      {/* White floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} metalness={0.0} />
      </mesh>
      
      {/* Subtle grid */}
      <Grid 
        args={[20, 20]} 
        cellSize={0.5} 
        cellColor="#f0f0f0" 
        sectionColor="#e0e0e0" 
        fadeDistance={15} 
        fadeStrength={1} 
        position={[0, 0.01, 0]} 
      />
      
      {/* Soft shadows */}
      <ContactShadows 
        position={[0, 0.01, 0]} 
        opacity={0.15} 
        scale={4} 
        blur={3} 
        far={2} 
        color="#fff3f3" 
      />
      
      {/* Display Stand */}
      <group rotation={[0, Math.PI / 2, 0]}>
        <DisplayStand position={[0, 0.7, 0]} scale={0.7} />
      </group>
      
      {/* Mannequin - with ref to control rotation */}
      <group ref={groupRef} rotation={[0, Math.PI / 2, 0]}>
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
          autoRotate={autoRotate && !showGarment} // Stop auto-rotate when garment loads
          standHeight={standHeight - 0.2}
        />
      </group>
      
      {/* 3D Garment - in same group so rotates with mannequin */}
      {showGarment && garmentData && (
        <group ref={groupRef}>
          <GarmentLoader3D 
            garmentData={garmentData}
            measurements={measurements}
            mannequinRef={internalRef}
            position={[0, 0, 0]}
          />
        </group>
      )}
    </>
  );
};

const Scene = (props) => {
  const { mannequinRef, ...sceneProps } = props;
  const canvasRef = React.useRef(null);
  
  const handleContextLost = (event) => {
    event.preventDefault();
    console.error('⚠️ WebGL context lost');
  };

  const handleContextRestored = () => {
    console.log('✅ WebGL context restored');
  };

  React.useEffect(() => {
    console.log('🎬 Scene mounted');
    return () => console.log('🧹 Scene unmounting');
  }, []);
  
  return (
    <div ref={canvasRef} className="w-full h-full">
      <Canvas 
        camera={{ position: [0, 1.2, 4], fov: 50 }}
        shadows
        style={{ background: '#1d1b1b8c' }} // White background
        gl={{ 
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance'
        }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', handleContextLost);
          gl.domElement.addEventListener('webglcontextrestored', handleContextRestored);
        }}
      >
        <SceneContent {...sceneProps} mannequinRef={mannequinRef} />
      </Canvas>
    </div>
  );
};

export default Scene;