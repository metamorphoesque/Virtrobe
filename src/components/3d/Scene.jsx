// 1. src/components/3d/Scene.jsx (UPDATED WITH PHYSICS)
// ============================================
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid, useGLTF } from '@react-three/drei';
import MorphableMannequin from './MorphableMannequin';
import HybridGarment from './HybridGarment';
import ClothSimulation from './ClothSimulation';
import { useClothPhysics } from '../../hooks/useClothPhysics';

// Display Stand Component - Always stays on floor
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

// Preload the stand model
useGLTF.preload('/models/DisplayStand.glb');

// Scene Content Component (contains physics logic)
const SceneContent = ({ 
  measurements, 
  garmentType, 
  garmentColor, 
  showMeasurements, 
  showGarment, 
  autoRotate,
  garmentData,
  enableClothPhysics = false  // NEW: Enable/disable physics
}) => {
  // Calculate display stand height based on body height
  const calculateStandHeight = () => {
    const { height_cm = 170 } = measurements;
    const heightInMeters = height_cm / 100;
    const legsProportion = 0.45;
    return heightInMeters * legsProportion;
  };
  
  const standHeight = calculateStandHeight();
  
  // Initialize cloth physics hook
  const clothPhysics = useClothPhysics({ enabled: enableClothPhysics });
  
  // Create mannequin collider when measurements change
  React.useEffect(() => {
    if (enableClothPhysics && clothPhysics.createMannequinCollider) {
      clothPhysics.createMannequinCollider(measurements);
    }
  }, [measurements, enableClothPhysics, clothPhysics]);

  return (
    <>
      {/* ============================================
          LIGHTING SETUP - Minimalist & Clean
          ============================================ */}
      
      {/* Ambient light - soft overall illumination */}
      <ambientLight intensity={0.6} />
      
      {/* Main overhead spotlight - directly above mannequin */}
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
      
      {/* Subtle directional light for definition */}
      <directionalLight position={[2, 3, 2]} intensity={0.4} />
      
      {/* Fill lights - reduce harsh shadows */}
      <pointLight position={[-2, 1, -2]} intensity={0.2} />
      <pointLight position={[2, 1, -2]} intensity={0.2} />
      
      {/* ============================================
          ENVIRONMENT & BACKGROUND
          ============================================ */}
      
      {/* HDR environment for realistic reflections */}
      <Environment preset="studio" />
      
      {/* SLEEK DARK MINIMALIST FLOOR AT y=0 */}
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
      
      {/* Subtle grid overlay on dark floor */}
      <Grid 
        args={[20, 20]} 
        cellSize={0.5} 
        cellColor="#404040"
        sectionColor="#505050"
        fadeDistance={15}
        fadeStrength={1}
        position={[0, 0.01, 0]}
      />
      
      {/* Contact shadows under the mannequin */}
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
        measurements={measurements}
        autoRotate={autoRotate}
        standHeight={standHeight - 0.2}
      />
      
      {/* ============================================
          CLOTH PHYSICS SIMULATION
          ============================================ */}
      
      {enableClothPhysics && showGarment && (
        <ClothSimulation
          clothPhysics={clothPhysics}
          width={0.8}
          height={1.2}
          segmentsX={20}
          segmentsY={30}
          color={garmentColor}
          visible={true}
          position={[0, 1.8, 0.1]}
        />
      )}
      
      {/* ============================================
          HYBRID GARMENT - Rendered when physics is OFF
          ============================================ */}
      
      {!enableClothPhysics && garmentData && showGarment && (
        <HybridGarment garmentData={garmentData} />
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
    >
      <SceneContent {...props} />
    </Canvas>
  );
};

export default Scene;
