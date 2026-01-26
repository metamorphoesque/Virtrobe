// src/components/3d/Garment2DOverlay.jsx
// ============================================
// 2.5D GARMENT OVERLAY COMPONENT
// Projects warped 2D texture onto 3D mannequin
// Uses custom shaders for depth and lighting
// ============================================

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { garmentVertexShader, garmentFragmentShader } from '../../shaders/garmentShaders';

const Garment2DOverlay = ({ 
  garmentData,
  measurements,
  mannequinRef,
  position = [0, 0, 0]
}) => {
  const meshRef = useRef();
  const materialRef = useRef();

  // Calculate garment dimensions from measurements
  const dimensions = useMemo(() => {
    const {
      chest_cm = 90,
      waist_cm = 75,
      shoulders_cm = 40,
      torso_length_cm = 50,
      height_cm = 170
    } = measurements;

    // Convert to meters and scale appropriately
    const heightInMeters = height_cm / 100;
    const torsoHeight = (torso_length_cm / 100) * 0.8; // Slightly shorter than actual
    const chestWidth = (chest_cm / 100) * 0.9;
    const waistWidth = (waist_cm / 100) * 0.9;

    return {
      width: chestWidth,
      height: torsoHeight,
      depth: 0.15, // Base depth for garment
      chestWidth,
      waistWidth,
      torsoHeight
    };
  }, [measurements]);

  // Calculate position on mannequin
  const garmentPosition = useMemo(() => {
    const { height_cm = 170 } = measurements;
    const heightInMeters = height_cm / 100;
    
    // Position garment on upper torso
    const y = heightInMeters * 0.35; // Roughly chest height
    
    return [position[0], y, position[2] + 0.05]; // Slightly in front of mannequin
  }, [measurements, position]);

  // Create shader material
  const shaderMaterial = useMemo(() => {
    if (!garmentData?.garmentTexture || !garmentData?.depthTexture || !garmentData?.normalTexture) {
      return null;
    }

    return new THREE.ShaderMaterial({
      vertexShader: garmentVertexShader,
      fragmentShader: garmentFragmentShader,
      uniforms: {
        garmentTexture: { value: garmentData.garmentTexture },
        depthMap: { value: garmentData.depthTexture },
        normalMap: { value: garmentData.normalTexture },
        depthIntensity: { value: 0.12 },
        opacity: { value: 1.0 },
        lightPosition: { value: new THREE.Vector3(2, 4, 3) },
        ambientColor: { value: new THREE.Color(0.4, 0.4, 0.4) },
        normalStrength: { value: 1.2 },
        mannequinScale: { value: new THREE.Vector3(
          dimensions.chestWidth,
          dimensions.torsoHeight,
          dimensions.depth
        )}
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
      depthTest: true
    });
  }, [garmentData, dimensions]);

  // Update material reference
  useEffect(() => {
    if (meshRef.current && shaderMaterial) {
      materialRef.current = shaderMaterial;
    }
  }, [shaderMaterial]);

  // Animation loop
  useFrame((state) => {
    if (!materialRef.current) return;

    // Subtle animation for realism
    const time = state.clock.getElapsedTime();
    
    // Gentle breathing effect
    const breathScale = 1.0 + Math.sin(time * 0.8) * 0.008;
    materialRef.current.uniforms.depthIntensity.value = 0.12 * breathScale;

    // Update light position to follow camera (optional)
    const camera = state.camera;
    const lightPos = materialRef.current.uniforms.lightPosition.value;
    lightPos.set(
      camera.position.x * 0.5,
      camera.position.y * 0.8 + 2,
      camera.position.z * 0.5 + 2
    );
  });

  if (!shaderMaterial) {
    console.warn('⚠️ Garment textures not ready');
    return null;
  }

  return (
    <group position={garmentPosition}>
      <mesh ref={meshRef} material={shaderMaterial}>
        <planeGeometry 
          args={[dimensions.width, dimensions.height, 64, 64]} 
        />
      </mesh>

      {/* Debug helpers (hidden in production) */}
      {false && (
        <>
          {/* Bounding box */}
          <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(dimensions.width, dimensions.height)]} />
            <lineBasicMaterial color="#00ff00" />
          </lineSegments>
          
          {/* Center point */}
          <mesh position={[0, 0, 0.01]}>
            <sphereGeometry args={[0.02]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
        </>
      )}
    </group>
  );
};

export default Garment2DOverlay;