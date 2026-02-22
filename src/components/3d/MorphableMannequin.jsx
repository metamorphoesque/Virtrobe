// src/components/3d/MorphableMannequin.jsx
// ============================================
// MORPHABLE MANNEQUIN WITH MODEL CLONING
// Prevents WebGL context conflicts
// ============================================

import React, { useRef, useEffect, useMemo, forwardRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { tagFrontDirection, addFrontMarker } from '../../utils/frontFaceMarker';

const MorphableMannequin = forwardRef(({
  measurements,
  autoRotate = true,
  standHeight = 0.565
}, ref) => {
  const group = useRef();
  const meshRef = useRef();
  const landmarksRef = useRef({});

  const modelPath = measurements.gender === 'male'
    ? '/models/male_mannequin.glb'
    : '/models/female_mannequin.glb';

  const { scene } = useGLTF(modelPath);

  // Clone to avoid conflicts between multiple canvases
  const clonedScene = useMemo(() => {
    console.log(`🔄 Cloning ${measurements.gender} mannequin scene...`);
    const clone = scene.clone(true);
    console.log('✅ Mannequin scene cloned');
    return clone;
  }, [scene, measurements.gender]);

  // Tag front direction
  useEffect(() => {
    if (!group.current) return;
    addFrontMarker(group.current, '+Z', 0.4, 0x00ff00);
    tagFrontDirection(group.current, '+Z');
  }, []);

  // Find morphable mesh and landmarks
  useEffect(() => {
    meshRef.current = null;
    landmarksRef.current = {};

    clonedScene.traverse((child) => {
      // Find main body mesh for shape keys
      if (child.isMesh && child.morphTargetDictionary) {
        meshRef.current = child;
        console.log(`✅ Found ${measurements.gender} morphable mesh:`, child.name);
      }

      // Find embedded empties acting as landmarks (e.g. "landmark_shoulder")
      if (child.name && child.name.toLowerCase().startsWith('landmark_')) {
        landmarksRef.current[child.name] = child;
      }
    });

    if (!meshRef.current) console.warn('⚠️ No morphable mesh found in cloned scene');
    if (Object.keys(landmarksRef.current).length > 0) {
      console.log('📍 Found native GLB embedded landmarks:', Object.keys(landmarksRef.current));
    }
  }, [clonedScene, measurements.gender]);

  // Cleanup
  useEffect(() => {
    return () => {
      clonedScene.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
              Object.keys(mat).forEach(key => { if (mat[key]?.isTexture) mat[key].dispose(); });
              mat.dispose();
            });
          }
        }
      });
    };
  }, [clonedScene, measurements.gender]);

  // Apply morphing
  useEffect(() => {
    if (!meshRef.current) {
      console.warn('⚠️ No morphable mesh found yet');
      return;
    }

    const mesh = meshRef.current;
    const dict = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;

    const {
      height_cm = 170,
      weight_kg = 65,
      bust_cm = 90,
      waist_cm = 70,
      hips_cm = 95,
      shoulder_width_cm = 40,
      bmi = 22.0
    } = measurements;

    const setMorph = (shapeName, value) => {
      if (dict[shapeName] !== undefined) {
        influences[dict[shapeName]] = Math.max(0, Math.min(1, value));
        return true;
      }
      console.warn(`  ✗ Morph "${shapeName}" not found`);
      return false;
    };

    for (let i = 0; i < influences.length; i++) influences[i] = 0;

    const heightNorm = Math.max(-1, Math.min(1, (height_cm - 170) / 30));
    if (heightNorm > 0.05) setMorph('height_tall', heightNorm);
    if (heightNorm < -0.05) setMorph('height_short', Math.abs(heightNorm));

    const bmiValue = parseFloat(bmi);
    let weightMorphValue = 0;
    if (bmiValue < 18.5) weightMorphValue = -Math.max(0, Math.min(1, (18.5 - bmiValue) / 3.5));
    else if (bmiValue > 25) weightMorphValue = Math.max(0, Math.min(1, (bmiValue - 25) / 10));
    if (weightMorphValue > 0.05) setMorph('weight_heavy', weightMorphValue);
    if (weightMorphValue < -0.05) setMorph('weight_light', Math.abs(weightMorphValue));

    const bustNorm = Math.max(-1, Math.min(1, (bust_cm - 90) / 20));
    if (bustNorm > 0.05) setMorph('bust_large', bustNorm);
    if (bustNorm < -0.05) setMorph('bust_small', Math.abs(bustNorm));

    const waistNorm = Math.max(-1, Math.min(1, (waist_cm - 70) / 20));
    if (waistNorm > 0.05) setMorph('waist_wide', waistNorm);
    if (waistNorm < -0.05) setMorph('waist_narrow', Math.abs(waistNorm));

    const hipsNorm = Math.max(-1, Math.min(1, (hips_cm - 95) / 25));
    if (hipsNorm > 0.05) setMorph('hips_wide', hipsNorm);
    if (hipsNorm < -0.05) setMorph('hips_narrow', Math.abs(hipsNorm));

    const shoulderNorm = Math.max(-1, Math.min(1, (shoulder_width_cm - 40) / 10));
    if (shoulderNorm > 0.05) setMorph('shoulders_broad', shoulderNorm);
    if (shoulderNorm < -0.05) setMorph('shoulders_narrow', Math.abs(shoulderNorm));

    mesh.morphTargetInfluences = [...influences];
  }, [
    measurements.height_cm, measurements.weight_kg,
    measurements.bust_cm, measurements.waist_cm,
    measurements.hips_cm, measurements.shoulder_width_cm,
    measurements.bmi, measurements.gender,
  ]);

  // Auto-rotation
  useFrame((_, delta) => {
    if (autoRotate && group.current) group.current.rotation.y += delta * 0.3;
  });

  // Forward ref with extended API for dynamic live-landmark querying
  useEffect(() => {
    if (!ref || !group.current) return;

    // We attach a helper function to the group node to extract live landmark nodes
    group.current.getLiveLandmarks = () => {
      // Return the raw Object3D nodes so PhysicsGarment can extract world matrices efficiently
      return landmarksRef.current;
    };

    typeof ref === 'function' ? ref(group.current) : (ref.current = group.current);
  }, [ref]);

  return (
    <group ref={group} position={[0, standHeight, 0]} scale={0.5}>
      <primitive object={clonedScene} />
    </group>
  );
});

MorphableMannequin.displayName = 'MorphableMannequin';

useGLTF.preload('/models/female_mannequin.glb');
useGLTF.preload('/models/male_mannequin.glb');

export default MorphableMannequin;