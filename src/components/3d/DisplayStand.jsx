// src/components/3d/DisplayStand.jsx
import React, { useRef } from 'react';
import { useGLTF } from '@react-three/drei';

const DisplayStand = ({
  position = [0, 0, 0],   // Always on floor
  scale = 0.7             // Adjust stand size here
}) => {
  const standRef = useRef();
  const { scene } = useGLTF('/models/DisplayStand.glb');

  return (
    <group
      ref={standRef}
      position={position}
      scale={scale}
      rotation={[0, 0, 0]}   // Lock rotation
    >
      <primitive object={scene} />
    </group>
  );
};

// Preload for smoother experience
useGLTF.preload('/models/DisplayStand.glb');

export default DisplayStand;
