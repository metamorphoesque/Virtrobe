// src/components/3d/Scene.jsx (UPDATED WITH FULL PHYSICS)
import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid, useGLTF } from '@react-three/drei';
import MorphableMannequin from './MorphableMannequin';
import HybridGarment from './HybridGarment';
import ClothSimulation from './ClothSimulation';
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
  
  // Initialize cloth physics
  const clothPhysics = useClothPhysics({ 
    enabled: enableClothPhysics 
  });
  
  // Create mannequin collider when measurements change
  React.useEffect(() => {
    if (enableClothPhysics && clothPhysics.createMannequinCollider) {
      clothPhysics.createMannequinCollider(measurements);
    }
  }, [measurements, enableClothPhysics, clothPhysics]);

  // Extract garment texture and color
  const garmentTexture = garmentData?.texture || null;
  const garmentDisplayColor = garmentData?.dominantColor || garmentColor;

  return (
    <>
      {/* LIGHTING SETUP */}
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
      
      {/* ENVIRONMENT */}
      <Environment preset="studio" />
      
      {/* FLOOR */}
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
      
      <Grid 
        args={[20, 20]} 
        cellSize={0.5} 
        cellColor="#404040"
        sectionColor="#505050"
        fadeDistance={15}
        fadeStrength={1}
        position={[0, 0.01, 0]}
      />
      
      <ContactShadows 
        position={[0, 0.01, 0]} 
        opacity={0.4} 
        scale={4} 
        blur={2.5} 
        far={2} 
        color="#000000"
      />
      
      {/* DISPLAY STAND */}
      <DisplayStand 
        position={[0, 0.7, 0]}
        scale={0.7}
      />
      
      {/* MORPHABLE MANNEQUIN */}
      <MorphableMannequin 
        ref={mannequinRef}
        measurements={measurements}
        autoRotate={autoRotate && !enableClothPhysics}
        standHeight={standHeight - 0.2}
      />
      
      {/* CLOTH PHYSICS SIMULATION */}
      {enableClothPhysics && showGarment && (
        <ClothSimulation
          clothPhysics={clothPhysics}
          width={0.8}
          height={1.2}
          segmentsX={20}
          segmentsY={30}
          color={garmentDisplayColor}
          texture={garmentTexture}
          visible={true}
          position={[0, 1.8, 0.1]}
          enableWind={true}
        />
      )}
      
      {/* HYBRID GARMENT - When physics is OFF */}
      {!enableClothPhysics && garmentData && showGarment && (
        <HybridGarment 
          garmentData={garmentData}
          autoRotate={autoRotate}
        />
      )}
      
      {/* CAMERA CONTROLS */}
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
        enabled={!enableClothPhysics} // Disable manual rotation during physics
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