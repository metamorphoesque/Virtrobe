// src/components/3d/Scene.jsx
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei';
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
  // Calculate display stand height based on body height
  // Legs = 45% of total body height
  const calculateStandHeight = () => {
    const { height_cm = 170 } = measurements;
    const heightInMeters = height_cm / 100;
    const legsProportion = 0.45;
    return heightInMeters * legsProportion; // Stand height in scene units
  };
  
  const standHeight = calculateStandHeight();

  return (
    <Canvas 
      camera={{ 
        position: [0, 1.2, 4], 
        fov: 50 
      }}
      shadows
      style={{ background: '#fafafa' }}
    >
      {/* LIGHTING */}
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
      
      {/* FLOOR AT y=0 */}
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
      
      {/* GRID OVERLAY */}
      <Grid 
        args={[20, 20]} 
        cellSize={0.5} 
        cellColor="#404040"
        sectionColor="#505050"
        fadeDistance={15}
        fadeStrength={1}
        position={[0, 0.01, 0]}
      />
      
      {/* CONTACT SHADOWS */}
      <ContactShadows 
        position={[0, 0.01, 0]} 
        opacity={0.4} 
        scale={4} 
        blur={2.5} 
        far={2} 
        color="#000000"
      />
      
      {/* DISPLAY STAND - STRICTLY AT y=0 */}
      <DisplayStand 
        position={[0, 0, 0]}
        scale={0.7}
      />
      
      {/* MANNEQUIN - POSITIONED AT standHeight - 0.2 */}
      <MorphableMannequin 
        measurements={measurements}
        autoRotate={autoRotate}
        standHeight={standHeight - 0.2}
      />
      
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
      />
      
    </Canvas>
  );
};

export default Scene;