// src/components/3d/Garment2DOverlay.jsx
// ============================================
// 2.5D GARMENT OVERLAY COMPONENT
// Projects warped 2D texture onto 3D mannequin
// Uses custom shaders for depth and lighting
// ============================================

import React, { useRef, useMemo, useEffect, useState } from 'react';
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
  const [mannequinBounds, setMannequinBounds] = useState(null);

  // Get mannequin's actual bounding box
  useEffect(() => {
    if (mannequinRef?.current) {
      const mannequin = mannequinRef.current;
      
      // Update world matrix
      mannequin.updateMatrixWorld(true);
      
      // Calculate bounding box
      const box = new THREE.Box3().setFromObject(mannequin);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      
      console.log(' Mannequin bounds:', {
        width: size.x.toFixed(3),
        height: size.y.toFixed(3),
        depth: size.z.toFixed(3),
        center: {
          x: center.x.toFixed(3),
          y: center.y.toFixed(3),
          z: center.z.toFixed(3)
        }
      });
      
      setMannequinBounds({ size, center });
    }
  }, [mannequinRef, measurements]);

  // Calculate garment dimensions from mannequin bounds
  const dimensions = useMemo(() => {
    if (!mannequinBounds) {
      // Fallback to measurement-based sizing
      const {
        chest_cm = 90,
        torso_length_cm = 50,
      } = measurements;

      return {
        width: (chest_cm / 100) * 0.9,
        height: (torso_length_cm / 100) * 0.8,
        depth: 0.15
      };
    }

    // Use actual mannequin dimensions
    const { size } = mannequinBounds;
    
    // Garment covers torso (roughly 40-60% of height)
    const torsoHeight = size.y * 0.4;
    const torsoWidth = size.x * 0.95; // Slightly wider than mannequin
    
    return {
      width: torsoWidth,
      height: torsoHeight,
      depth: size.z * 0.15,
      chestWidth: torsoWidth,
      waistWidth: torsoWidth * 0.85,
      torsoHeight
    };
  }, [mannequinBounds, measurements]);

  // Calculate position on mannequin using actual bounds
  const garmentPosition = useMemo(() => {
    if (!mannequinBounds) {
      // Fallback positioning
      const { height_cm = 170 } = measurements;
      const heightInMeters = height_cm / 100;
      const y = heightInMeters * 0.35;
      return [0, y, 0.15]; // Slightly in front
    }

    // Position based on mannequin's actual center
    const { center, size } = mannequinBounds;
    
    // Place garment at upper torso (chest level)
    const y = center.y + size.y * 0.1; // Slightly above center
    
    // CRITICAL: Position on SURFACE not inside
    // Since mannequin is rotated 90°, we need to offset in X direction
    const surfaceOffset = (size.z / 2) + 0.05; // Half depth + small gap
    
    return [surfaceOffset, y, center.z]; // On the surface in front
  }, [mannequinBounds, measurements, position]);

  // Create shader material
  const shaderMaterial = useMemo(() => {
    if (!garmentData?.garmentTexture || !garmentData?.depthTexture || !garmentData?.normalTexture) {
      return null;
    }

    try {
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
            dimensions.chestWidth || dimensions.width,
            dimensions.torsoHeight || dimensions.height,
            dimensions.depth
          )}
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,
        depthTest: true
      });
    } catch (error) {
      console.error(' Failed to create shader material:', error);
      
      // Fallback: Simple textured material
      return new THREE.MeshBasicMaterial({
        map: garmentData.garmentTexture,
        transparent: true,
        side: THREE.DoubleSide
      });
    }
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
    console.warn(' Garment textures not ready');
    return null;
  }

  console.log(' Rendering garment overlay:', {
    position: garmentPosition,
    dimensions: {
      width: dimensions.width.toFixed(3),
      height: dimensions.height.toFixed(3)
    },
    hasMannequinBounds: !!mannequinBounds
  });

  return (
    <group 
      position={garmentPosition} 
      rotation={[Math.PI, Math.PI / 2, 0]} // Flipped 180° + rotated to match mannequin
    >
      <mesh ref={meshRef} material={shaderMaterial}>
        <planeGeometry 
          args={[dimensions.width, dimensions.height, 64, 64]} 
        />
      </mesh>

      {/* Always visible bounding box for debugging */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(dimensions.width, dimensions.height)]} />
        <lineBasicMaterial color="#00ff00" linewidth={2} />
      </lineSegments>
      
      {/* Center point marker */}
      <mesh position={[0, 0, 0.01]}>
        <sphereGeometry args={[0.05]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      
      {/* Top marker (should be at shoulders) */}
      <mesh position={[0, dimensions.height / 2, 0.01]}>
        <sphereGeometry args={[0.03]} />
        <meshBasicMaterial color="#0000ff" />
      </mesh>
      
      {/* Bottom marker (should be at waist) */}
      <mesh position={[0, -dimensions.height / 2, 0.01]}>
        <sphereGeometry args={[0.03]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
    </group>
  );
};

export default Garment2DOverlay;