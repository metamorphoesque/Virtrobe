// src/components/3d/ClothSimulation.jsx
import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ClothSimulation = ({
  clothPhysics,
  width = 0.8,
  height = 1.2,
  segmentsX = 20,
  segmentsY = 30,
  color = '#000000',
  texture = null,
  visible = true,
  position = [0, 1.8, 0.1],
  enableWind = true
}) => {
  const meshRef = useRef();
  const geometryRef = useRef();
  const materialRef = useRef();
  const textureRef = useRef(null);
  const clothDataRef = useRef(null);
  const rotationRef = useRef(0);

  // Create cloth geometry
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      width,
      height,
      segmentsX,
      segmentsY
    );
    geometryRef.current = geo;
    return geo;
  }, [width, height, segmentsX, segmentsY]);

  // Initialize cloth physics
  useEffect(() => {
    if (!clothPhysics || !clothPhysics.enabled) return;

    const clothData = clothPhysics.createClothBody(
      width,
      height,
      segmentsX,
      segmentsY,
      position
    );

    clothDataRef.current = clothData;

    return () => {
      clothDataRef.current = null;
    };
  }, [clothPhysics, width, height, segmentsX, segmentsY, position]);

  // Load texture if provided
  useEffect(() => {
    if (texture) {
      const loader = new THREE.TextureLoader();
      loader.load(
        texture,
        (loadedTexture) => {
          loadedTexture.wrapS = THREE.RepeatWrapping;
          loadedTexture.wrapT = THREE.RepeatWrapping;
          textureRef.current = loadedTexture;
          
          if (materialRef.current) {
            materialRef.current.map = loadedTexture;
            materialRef.current.needsUpdate = true;
          }
        },
        undefined,
        (error) => {
          console.error('Error loading texture:', error);
        }
      );
    }
  }, [texture]);

  // Animation loop
  useFrame((state, delta) => {
    if (!clothPhysics || !clothPhysics.enabled || !meshRef.current) return;

    // Update physics
    clothPhysics.step(delta);

    // Apply wind effect
    if (enableWind) {
      clothPhysics.applyWind(0.3);
    }

    // Get updated particle positions
    const positions = clothPhysics.getParticlePositions();
    
    if (positions && positions.length > 0 && geometryRef.current) {
      const positionAttribute = geometryRef.current.attributes.position;
      
      positions.forEach((pos, i) => {
        positionAttribute.setXYZ(i, pos.x, pos.y, pos.z);
      });
      
      positionAttribute.needsUpdate = true;
      geometryRef.current.computeVertexNormals();
    }

    // Rotate mannequin and cloth together
    const autoRotateSpeed = 0.3;
    const rotationDelta = delta * autoRotateSpeed;
    rotationRef.current += rotationDelta;
    
    clothPhysics.rotateMannequin(rotationDelta);
  });

  if (!visible || !clothPhysics || !clothPhysics.enabled) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[0, 0, 0]}
    >
      <meshStandardMaterial
        ref={materialRef}
        color={color}
        side={THREE.DoubleSide}
        map={textureRef.current}
        roughness={0.8}
        metalness={0.1}
        transparent={false}
      />
    </mesh>
  );
};

export default ClothSimulation;