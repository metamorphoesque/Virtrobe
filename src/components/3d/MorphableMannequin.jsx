// src/components/3d/MorphableMannequin.jsx
import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

const MorphableMannequin = ({ 
  measurements, 
  autoRotate = true, 
  standHeight = 0.565
}) => {
  const group = useRef();
  const { scene } = useGLTF('/models/female_mannequin.glb');
  
  // Reference to the mesh with morph targets
  const meshRef = useRef();
  
  // Find the mesh with morphTargetDictionary on mount
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        meshRef.current = child;
        console.log('✅ Found morphable mesh:', child.name);
        console.log('📋 Available shape keys:', Object.keys(child.morphTargetDictionary));
      }
    });
  }, [scene]);
  
  // Apply morphing based on measurements - ENHANCED WITH INDIVIDUAL TRACKING
  useEffect(() => {
    if (!meshRef.current) {
      console.warn('⚠️ No morphable mesh found yet');
      return;
    }
    
    const mesh = meshRef.current;
    const dict = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;
    
    // Extract measurements with destructuring
    const { 
      height_cm = 170, 
      weight_kg = 65, 
      bust_cm = 90, 
      waist_cm = 70, 
      hips_cm = 95, 
      shoulder_width_cm = 40,
      bmi = 22.0
    } = measurements;
    
    console.log('🔄 MORPHING UPDATE TRIGGERED');
    console.log('📊 Current measurements:', { 
      height_cm, 
      weight_kg, 
      bmi,
      bust_cm, 
      waist_cm, 
      hips_cm, 
      shoulder_width_cm 
    });
    
    // Helper function to safely set morph influence
    const setMorph = (shapeName, value) => {
      if (dict[shapeName] !== undefined) {
        const clampedValue = Math.max(0, Math.min(1, value));
        influences[dict[shapeName]] = clampedValue;
        console.log(`  ✓ ${shapeName} = ${clampedValue.toFixed(3)}`);
        return true;
      }
      console.warn(`  ✗ Morph "${shapeName}" not found in model`);
      return false;
    };
    
    // Reset all morphs to 0 before applying new values
    console.log('🔄 Resetting all morphs to baseline...');
    for (let i = 0; i < influences.length; i++) {
      influences[i] = 0;
    }
    
    // ==========================================
    // HEIGHT MORPHING (140-200 cm range)
    // ==========================================
    const heightBase = 170;
    const heightRange = 30;
    const heightNorm = Math.max(-1, Math.min(1, (height_cm - heightBase) / heightRange));
    
    console.log(`📏 Height: ${height_cm}cm (normalized: ${heightNorm.toFixed(2)})`);
    if (heightNorm > 0.05) {
      setMorph('height_tall', heightNorm);
    } else if (heightNorm < -0.05) {
      setMorph('height_short', Math.abs(heightNorm));
    } else {
      console.log('  → No height morph needed (within baseline range)');
    }
    
    // ==========================================
    // WEIGHT MORPHING - BMI-BASED (General body proportions)
    // ==========================================
    const bmiValue = parseFloat(bmi);
    console.log(`⚖️ BMI: ${bmiValue}`);
    
    let weightMorphValue = 0;
    
    if (bmiValue < 18.5) {
      // Underweight: map BMI 15.0-18.5 to morph 0.0-1.0
      weightMorphValue = -Math.max(0, Math.min(1, (18.5 - bmiValue) / 3.5));
    } else if (bmiValue > 25) {
      // Overweight: map BMI 25-35 to morph 0.0-1.0
      weightMorphValue = Math.max(0, Math.min(1, (bmiValue - 25) / 10));
    }
    
    if (weightMorphValue > 0.05) {
      setMorph('weight_heavy', weightMorphValue);
    } else if (weightMorphValue < -0.05) {
      setMorph('weight_light', Math.abs(weightMorphValue));
    } else {
      console.log('  → No weight morph needed (BMI in normal range)');
    }
    
    // ==========================================
    // BUST MORPHING (70-120 cm range) - INDEPENDENT
    // ==========================================
    const bustBase = 90;
    const bustRange = 20;
    const bustNorm = Math.max(-1, Math.min(1, (bust_cm - bustBase) / bustRange));
    
    console.log(`👚 Bust: ${bust_cm}cm (normalized: ${bustNorm.toFixed(2)})`);
    if (bustNorm > 0.05) {
      setMorph('bust_large', bustNorm);
    } else if (bustNorm < -0.05) {
      setMorph('bust_small', Math.abs(bustNorm));
    } else {
      console.log('  → No bust morph needed (within baseline range)');
    }
    
    // ==========================================
    // WAIST MORPHING (55-100 cm range) - INDEPENDENT
    // ==========================================
    const waistBase = 70;
    const waistRange = 20;
    const waistNorm = Math.max(-1, Math.min(1, (waist_cm - waistBase) / waistRange));
    
    console.log(`⌛ Waist: ${waist_cm}cm (normalized: ${waistNorm.toFixed(2)})`);
    if (waistNorm > 0.05) {
      setMorph('waist_wide', waistNorm);
    } else if (waistNorm < -0.05) {
      setMorph('waist_narrow', Math.abs(waistNorm));
    } else {
      console.log('  → No waist morph needed (within baseline range)');
    }
    
    // ==========================================
    // HIPS MORPHING (75-130 cm range) - INDEPENDENT
    // ==========================================
    const hipsBase = 95;
    const hipsRange = 25;
    const hipsNorm = Math.max(-1, Math.min(1, (hips_cm - hipsBase) / hipsRange));
    
    console.log(`🍑 Hips: ${hips_cm}cm (normalized: ${hipsNorm.toFixed(2)})`);
    if (hipsNorm > 0.05) {
      setMorph('hips_wide', hipsNorm);
    } else if (hipsNorm < -0.05) {
      setMorph('hips_narrow', Math.abs(hipsNorm));
    } else {
      console.log('  → No hips morph needed (within baseline range)');
    }
    
    // ==========================================
    // SHOULDERS MORPHING (30-55 cm range) - INDEPENDENT
    // ==========================================
    const shoulderBase = 40;
    const shoulderRange = 10;
    const shoulderNorm = Math.max(-1, Math.min(1, (shoulder_width_cm - shoulderBase) / shoulderRange));
    
    console.log(`💪 Shoulders: ${shoulder_width_cm}cm (normalized: ${shoulderNorm.toFixed(2)})`);
    if (shoulderNorm > 0.05) {
      setMorph('shoulders_broad', shoulderNorm);
    } else if (shoulderNorm < -0.05) {
      setMorph('shoulders_narrow', Math.abs(shoulderNorm));
    } else {
      console.log('  → No shoulder morph needed (within baseline range)');
    }
    
    console.log('✅ Morphing complete!\n');
    
    // Force mesh update to ensure changes are rendered
    mesh.morphTargetInfluences = [...influences];
    
  }, [
    measurements.height_cm,
    measurements.weight_kg,
    measurements.bust_cm,
    measurements.waist_cm,
    measurements.hips_cm,
    measurements.shoulder_width_cm,
    measurements.bmi
  ]); // Track individual properties instead of entire object
  
  // Auto-rotation animation
  useFrame((state, delta) => {
    if (autoRotate && group.current) {
      group.current.rotation.y += delta * 0.3;
    }
  });
  
  return (
    <group 
      ref={group} 
      position={[0, standHeight, 0]}
      scale={0.5}
    >
      <primitive object={scene} />
    </group>
  );
};

// Preload the model
useGLTF.preload('/models/female_mannequin.glb');

export default MorphableMannequin;