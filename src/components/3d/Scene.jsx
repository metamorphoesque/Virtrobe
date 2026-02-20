// src/components/3d/Scene.jsx - FIXED VIEW VERSION
// Camera is COMPLETELY STATIC - no user control at all

import React, { useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, Grid, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import MorphableMannequin from './MorphableMannequin';
import GarmentLoader3D from './GarmentLoader3D';
import { detectFrontDirection } from '../../utils/frontFaceMarker';

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

// Small XYZ gizmo in corner to visualize axes
const AxisGizmo = () => {
  const axesRef = useRef();

  React.useEffect(() => {
    if (!axesRef.current) return;
    axesRef.current.matrixAutoUpdate = false;
  }, []);

  const axesHelper = React.useMemo(() => new THREE.AxesHelper(0.4), []);

  return (
    <group position={[-1.5, 0.1, -1.5]}>
      <primitive object={axesHelper} ref={axesRef} />
    </group>
  );
};

// Debug helper: upper/lower body bounding boxes with front arrows
const BodyDebugBounds = ({ mannequinRef }) => {
  const upperRef = useRef();
  const lowerRef = useRef();

  useFrame(() => {
    if (!mannequinRef?.current || !upperRef.current || !lowerRef.current) return;

    const mannequin = mannequinRef.current;
    mannequin.updateMatrixWorld(true);

    // Full mannequin bounds
    const box = new THREE.Box3().setFromObject(mannequin);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const halfHeight = size.y / 2;

    // Upper body: from center upwards
    const upperBox = new THREE.Box3(
      new THREE.Vector3(box.min.x, center.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z)
    );

    // Lower body: from bottom to center
    const lowerBox = new THREE.Box3(
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, center.y, box.max.z)
    );

    // Helper to apply box size/position to a wireframe cube
    const applyBoxToMesh = (b, mesh) => {
      const bSize = new THREE.Vector3();
      const bCenter = new THREE.Vector3();
      b.getSize(bSize);
      b.getCenter(bCenter);
      mesh.position.copy(bCenter);
      mesh.scale.set(bSize.x, bSize.y, bSize.z);
    };

    applyBoxToMesh(upperBox, upperRef.current);
    applyBoxToMesh(lowerBox, lowerRef.current);
  });

  // Front direction arrow shared for both boxes
  const frontArrowLength = 0.3;

  return (
    <group>
      {/* Upper body bounding box */}
      <mesh ref={upperRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#00ff88" wireframe transparent opacity={0.5} />
      </mesh>

      {/* Lower body bounding box */}
      <mesh ref={lowerRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#0088ff" wireframe transparent opacity={0.5} />
      </mesh>

      {/* Front arrows for boxes: use mannequin's tagged front direction */}
      {mannequinRef?.current && (() => {
        const dirCode = detectFrontDirection(mannequinRef.current); // '+Z', '-X', etc.
        const dir = new THREE.Vector3();
        switch (dirCode) {
          case '+X': dir.set(1, 0, 0); break;
          case '-X': dir.set(-1, 0, 0); break;
          case '+Y': dir.set(0, 1, 0); break;
          case '-Y': dir.set(0, -1, 0); break;
          case '-Z': dir.set(0, 0, -1); break;
          case '+Z':
          default: dir.set(0, 0, 1); break;
        }

        return (
          <>
            {/* Upper box front arrow */}
            <arrowHelper
              args={[dir.clone().normalize(), new THREE.Vector3(0, 0, 0), frontArrowLength, 0x00ff88]}
            />
            {/* Lower box front arrow */}
            <arrowHelper
              args={[dir.clone().normalize(), new THREE.Vector3(0, 0, 0), frontArrowLength, 0x0088ff]}
            />
          </>
        );
      })()}
    </group>
  );
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
      
      {/* Black glassy floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color="#000000"
          roughness={0.2}   // slightly less mirror, more soft glass
          metalness={0.7}
        />
      </mesh>
      
      {/* White grid lines on black floor */}
      <Grid 
        args={[20, 20]} 
        cellSize={0.5} 
        cellThickness={0.3}
        sectionThickness={0.5}
        cellColor="#ffffff" 
        sectionColor="#ffffff" 
        fadeDistance={15} 
        fadeStrength={1} 
        position={[0, 0.01, 0]} 
      />
      
      {/* Soft, light shadows */}
      <ContactShadows 
        position={[0, 0.01, 0]} 
        opacity={0.08} 
        scale={4} 
        blur={4.5} 
        far={2} 
        color="#ffffff" 
      />

      {/* Axis gizmo */}
      <AxisGizmo />
      
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

      {/* Debug body bounds (upper/lower) with orientation arrows */}
      <BodyDebugBounds mannequinRef={internalRef} />
      
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
        style={{ background: '#ffffff' }} // White background above floor
        gl={{ 
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance'
        }}
        onCreated={({ gl, scene }) => {
          // Ensure the "air"/backdrop is truly white (WebGL clear color + scene background).
          gl.setClearColor(0xffffff, 1);
          scene.background = new THREE.Color(0xffffff);
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