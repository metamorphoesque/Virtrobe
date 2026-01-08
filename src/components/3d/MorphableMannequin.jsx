// src/components/3d/MorphableMannequin.jsx
import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

const MorphableMannequin = ({ 
  measurements, 
  autoRotate = true, 
  standHeight = -1  // Height position on the stand (passed from Scene)
}) => {
  const group = useRef();
  const { scene } = useGLTF('/models/female_mannequin.glb');
  
  // Reference to the mesh with morph targets (shape keys)
  const meshRef = useRef();
  
  // Find the mesh with morphTargetDictionary on mount
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        meshRef.current = child;
        console.log('✓ Found morphable mesh:', child.name);
        console.log('✓ Available shape keys:', Object.keys(child.morphTargetDictionary));
        console.log('✓ Total morph targets:', child.morphTargetInfluences.length);
      }
    });
  }, [scene]);
  
  // Apply morphing based on measurements (runs whenever measurements change)
  useEffect(() => {
    if (!meshRef.current) {
      console.warn(' No morphable mesh found yet');
      return;
    }
    
    const mesh = meshRef.current;
    const dict = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;
    
    // Extract measurements with defaults
    const { 
      height_cm = 170, 
      weight_kg = 65, 
      bust_cm = 90, 
      waist_cm = 70, 
      hips_cm = 95, 
      shoulder_width_cm = 40 
    } = measurements;
    
    console.log(' Applying measurements:', { height_cm, weight_kg, bust_cm, waist_cm, hips_cm, shoulder_width_cm });
    
    // Helper function to safely set morph influence
    const setMorph = (shapeName, value) => {
      if (dict[shapeName] !== undefined) {
        const clampedValue = Math.max(0, Math.min(1, value));
        influences[dict[shapeName]] = clampedValue;
        return true;
      }
      return false;
    };
    
    // Reset all morphs to 0 first
    for (let i = 0; i < influences.length; i++) {
      influences[i] = 0;
    }
    
    // ============================================
    // HEIGHT MORPHING (140-200 cm range)
    // Visual effect: Mannequin stretches/compresses
    // Position effect: Handled by Scene.jsx via standHeight prop
    // ============================================
    const heightBase = 170; // Middle value
    const heightRange = 30; // ±30cm from base
    const heightNorm = (height_cm - heightBase) / heightRange; // -1 to 1
    
    if (heightNorm > 0) {
      // Taller - apply height_tall morph
      setMorph('height_tall', heightNorm);
      console.log(`  ↑ height_tall: ${heightNorm.toFixed(2)}`);
    } else if (heightNorm < 0) {
      // Shorter - apply height_short morph
      setMorph('height_short', Math.abs(heightNorm));
      console.log(`  ↓ height_short: ${Math.abs(heightNorm).toFixed(2)}`);
    }
    
    // ============================================
    // WEIGHT MORPHING (40-120 kg range)
    // ============================================
    const weightBase = 65; // Middle value
    const weightRange = 30; // ±30kg from base
    const weightNorm = (weight_kg - weightBase) / weightRange; // -1 to 1
    
    if (weightNorm > 0) {
      // Heavier
      setMorph('weight_heavy', weightNorm);
      console.log(`  ↑ weight_heavy: ${weightNorm.toFixed(2)}`);
    } else if (weightNorm < 0) {
      // Lighter
      setMorph('weight_light', Math.abs(weightNorm));
      console.log(`  ↓ weight_light: ${Math.abs(weightNorm).toFixed(2)}`);
    }
    
    // ============================================
    // BUST MORPHING (70-120 cm range)
    // ============================================
    const bustBase = 90;
    const bustRange = 20;
    const bustNorm = (bust_cm - bustBase) / bustRange;
    
    if (bustNorm > 0) {
      setMorph('bust_large', bustNorm);
      console.log(`  ↑ bust_large: ${bustNorm.toFixed(2)}`);
    } else if (bustNorm < 0) {
      setMorph('bust_small', Math.abs(bustNorm));
      console.log(`  ↓ bust_small: ${Math.abs(bustNorm).toFixed(2)}`);
    }
    
    // ============================================
    // WAIST MORPHING (55-100 cm range)
    // ============================================
    const waistBase = 70;
    const waistRange = 20;
    const waistNorm = (waist_cm - waistBase) / waistRange;
    
    if (waistNorm > 0) {
      setMorph('waist_wide', waistNorm);
      console.log(`  ↑ waist_wide: ${waistNorm.toFixed(2)}`);
    } else if (waistNorm < 0) {
      setMorph('waist_narrow', Math.abs(waistNorm));
      console.log(`  ↓ waist_narrow: ${Math.abs(waistNorm).toFixed(2)}`);
    }
    
    // ============================================
    // HIPS MORPHING (75-130 cm range)
    // ============================================
    const hipsBase = 95;
    const hipsRange = 25;
    const hipsNorm = (hips_cm - hipsBase) / hipsRange;
    
    if (hipsNorm > 0) {
      setMorph('hips_wide', hipsNorm);
      console.log(`  ↑ hips_wide: ${hipsNorm.toFixed(2)}`);
    } else if (hipsNorm < 0) {
      setMorph('hips_narrow', Math.abs(hipsNorm));
      console.log(`  ↓ hips_narrow: ${Math.abs(hipsNorm).toFixed(2)}`);
    }
    
    // ============================================
    // SHOULDERS MORPHING (30-55 cm range)
    // ============================================
    const shoulderBase = 40;
    const shoulderRange = 10;
    const shoulderNorm = (shoulder_width_cm - shoulderBase) / shoulderRange;
    
    if (shoulderNorm > 0) {
      setMorph('shoulders_broad', shoulderNorm);
      console.log(`  ↑ shoulders_broad: ${shoulderNorm.toFixed(2)}`);
    } else if (shoulderNorm < 0) {
      setMorph('shoulders_narrow', Math.abs(shoulderNorm));
      console.log(`  ↓ shoulders_narrow: ${Math.abs(shoulderNorm).toFixed(2)}`);
    }
    
    console.log('✓ Morphing complete');
    
  }, [measurements]); // Re-run whenever measurements change
  
  // Auto-rotation animation
  useFrame((state, delta) => {
    if (autoRotate && group.current) {
      group.current.rotation.y += delta * 0.3; // Smooth rotation
    }
  });
  
  return (
    <group 
      ref={group} 
      position={[0, standHeight+0.9, 0]}  // Y position adjusts based on height
      scale={0.8}  // ADJUST THIS: Increase mannequin size (try 1.5, 2, 2.5, 3)
    >
      <primitive object={scene} />
    </group>
  );
};

// Preload the model (improves performance)
useGLTF.preload('/models/female_mannequin.glb');

export default MorphableMannequin;