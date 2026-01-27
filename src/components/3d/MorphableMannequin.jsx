// src/components/3d/MorphableMannequin.jsx
// ============================================
// MORPHABLE MANNEQUIN WITH MODEL CLONING
// Prevents WebGL context conflicts
// ============================================

import React, { useRef, useEffect, useMemo, forwardRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

const MorphableMannequin = forwardRef(({ 
  measurements, 
  autoRotate = true, 
  standHeight = 0.565
}, ref) => {
  const group = useRef();
  const meshRef = useRef();
  
  // Load model based on gender
  const modelPath = measurements.gender === 'male' 
    ? '/models/male_mannequin.glb' 
    : '/models/female_mannequin.glb';
    
  const { scene } = useGLTF(modelPath);
  
  // CRITICAL: Clone the scene to avoid conflicts between multiple canvases
  const clonedScene = useMemo(() => {
    console.log(`🔄 Cloning ${measurements.gender} mannequin scene...`);
    const clone = scene.clone(true); // true = deep clone with children
    console.log('✅ Mannequin scene cloned');
    return clone;
  }, [scene, measurements.gender]);
  
  // Find the mesh with morphTargetDictionary on mount or when model changes
  useEffect(() => {
    meshRef.current = null; // Reset mesh ref when model changes
    
    clonedScene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        meshRef.current = child;
        console.log(`✅ Found ${measurements.gender} morphable mesh:`, child.name);
        console.log('📋 Available shape keys:', Object.keys(child.morphTargetDictionary));
      }
    });
    
    if (!meshRef.current) {
      console.warn('⚠️ No morphable mesh found in cloned scene');
    }
  }, [clonedScene, measurements.gender]);
  
  // Cleanup on unmount - dispose cloned resources
  useEffect(() => {
    return () => {
      console.log(`🧹 Disposing ${measurements.gender} mannequin clone`);
      
      clonedScene.traverse((child) => {
        if (child.isMesh) {
          // Dispose geometry
          if (child.geometry) {
            child.geometry.dispose();
          }
          
          // Dispose materials
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => {
                mat.dispose();
                // Dispose textures
                Object.keys(mat).forEach(key => {
                  if (mat[key]?.isTexture) {
                    mat[key].dispose();
                  }
                });
              });
            } else {
              child.material.dispose();
              // Dispose textures
              Object.keys(child.material).forEach(key => {
                if (child.material[key]?.isTexture) {
                  child.material[key].dispose();
                }
              });
            }
          }
        }
      });
    };
  }, [clonedScene, measurements.gender]);
  
  // Apply morphing based on measurements
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
    
    console.log(`🔄 MORPHING ${measurements.gender.toUpperCase()} MODEL`);
    console.log('📊 Measurements:', { 
      height_cm, weight_kg, bmi, bust_cm, waist_cm, hips_cm, shoulder_width_cm 
    });
    
    // Helper to safely set morph influence
    const setMorph = (shapeName, value) => {
      if (dict[shapeName] !== undefined) {
        const clampedValue = Math.max(0, Math.min(1, value));
        influences[dict[shapeName]] = clampedValue;
        console.log(`  ✓ ${shapeName} = ${clampedValue.toFixed(3)}`);
        return true;
      }
      console.warn(`  ✗ Morph "${shapeName}" not found`);
      return false;
    };
    
    // Reset all morphs
    console.log('🔄 Resetting morphs...');
    for (let i = 0; i < influences.length; i++) {
      influences[i] = 0;
    }
    
    // HEIGHT MORPHING (140-200cm)
    const heightBase = 170;
    const heightRange = 30;
    const heightNorm = Math.max(-1, Math.min(1, (height_cm - heightBase) / heightRange));
    
    console.log(`📏 Height: ${height_cm}cm (norm: ${heightNorm.toFixed(2)})`);
    if (heightNorm > 0.05) {
      setMorph('height_tall', heightNorm);
    } else if (heightNorm < -0.05) {
      setMorph('height_short', Math.abs(heightNorm));
    }
    
    // WEIGHT MORPHING - BMI-BASED
    const bmiValue = parseFloat(bmi);
    console.log(`⚖️ BMI: ${bmiValue}`);
    
    let weightMorphValue = 0;
    if (bmiValue < 18.5) {
      weightMorphValue = -Math.max(0, Math.min(1, (18.5 - bmiValue) / 3.5));
    } else if (bmiValue > 25) {
      weightMorphValue = Math.max(0, Math.min(1, (bmiValue - 25) / 10));
    }
    
    if (weightMorphValue > 0.05) {
      setMorph('weight_heavy', weightMorphValue);
    } else if (weightMorphValue < -0.05) {
      setMorph('weight_light', Math.abs(weightMorphValue));
    }
    
    // BUST MORPHING (70-120cm)
    const bustBase = 90;
    const bustRange = 20;
    const bustNorm = Math.max(-1, Math.min(1, (bust_cm - bustBase) / bustRange));
    
    console.log(`👚 Bust: ${bust_cm}cm (norm: ${bustNorm.toFixed(2)})`);
    if (bustNorm > 0.05) {
      setMorph('bust_large', bustNorm);
    } else if (bustNorm < -0.05) {
      setMorph('bust_small', Math.abs(bustNorm));
    }
    
    // WAIST MORPHING (55-100cm)
    const waistBase = 70;
    const waistRange = 20;
    const waistNorm = Math.max(-1, Math.min(1, (waist_cm - waistBase) / waistRange));
    
    console.log(`⌛ Waist: ${waist_cm}cm (norm: ${waistNorm.toFixed(2)})`);
    if (waistNorm > 0.05) {
      setMorph('waist_wide', waistNorm);
    } else if (waistNorm < -0.05) {
      setMorph('waist_narrow', Math.abs(waistNorm));
    }
    
    // HIPS MORPHING (75-130cm)
    const hipsBase = 95;
    const hipsRange = 25;
    const hipsNorm = Math.max(-1, Math.min(1, (hips_cm - hipsBase) / hipsRange));
    
    console.log(`🍑 Hips: ${hips_cm}cm (norm: ${hipsNorm.toFixed(2)})`);
    if (hipsNorm > 0.05) {
      setMorph('hips_wide', hipsNorm);
    } else if (hipsNorm < -0.05) {
      setMorph('hips_narrow', Math.abs(hipsNorm));
    }
    
    // SHOULDERS MORPHING (30-55cm)
    const shoulderBase = 40;
    const shoulderRange = 10;
    const shoulderNorm = Math.max(-1, Math.min(1, (shoulder_width_cm - shoulderBase) / shoulderRange));
    
    console.log(`💪 Shoulders: ${shoulder_width_cm}cm (norm: ${shoulderNorm.toFixed(2)})`);
    if (shoulderNorm > 0.05) {
      setMorph('shoulders_broad', shoulderNorm);
    } else if (shoulderNorm < -0.05) {
      setMorph('shoulders_narrow', Math.abs(shoulderNorm));
    }
    
    console.log('✅ Morphing complete!\n');
    
    // Force mesh update
    mesh.morphTargetInfluences = [...influences];
    
  }, [
    measurements.height_cm,
    measurements.weight_kg,
    measurements.bust_cm,
    measurements.waist_cm,
    measurements.hips_cm,
    measurements.shoulder_width_cm,
    measurements.bmi,
    measurements.gender
  ]);
  
  // Auto-rotation
  useFrame((state, delta) => {
    if (autoRotate && group.current) {
      group.current.rotation.y += delta * 0.3;
    }
  });
  
  // Expose group ref to parent via forwardRef
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(group.current);
      } else {
        ref.current = group.current;
      }
    }
  }, [ref]);
  
  return (
    <group 
      ref={group} 
      position={[0, standHeight, 0]}
      scale={0.5}
    >
      <primitive object={clonedScene} />
    </group>
  );
});

// Add display name for better debugging
MorphableMannequin.displayName = 'MorphableMannequin';

// Preload both models
useGLTF.preload('/models/female_mannequin.glb');
useGLTF.preload('/models/male_mannequin.glb');

export default MorphableMannequin;