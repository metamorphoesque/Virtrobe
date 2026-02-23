// src/components/3d/MorphableMannequin.jsx

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

  const clonedScene = useMemo(() => {
    console.log(`🔄 Cloning ${measurements.gender} mannequin scene...`);
    const clone = scene.clone(true);
    console.log('✅ Mannequin scene cloned');

    // ── SCALE DIAGNOSTIC ─────────────────────────────────────────────────
    // Fires once per clone. Tells us the GLB's native unit scale BEFORE
    // the group scale={0.5} shrinks everything in world space.
    setTimeout(() => {
      clone.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(clone);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📐 MANNEQUIN RAW (local, before group scale=0.5)');
      console.log(`   X=${size.x.toFixed(4)}  Y=${size.y.toFixed(4)}  Z=${size.z.toFixed(4)}`);
      console.log(`   After ×0.5 → world Y=${(size.y * 0.5).toFixed(4)}  world X=${(size.x * 0.5).toFixed(4)}`);
      console.log('📍 LANDMARK LOCAL Y → world Y (×0.5 + standHeight):');
      clone.traverse((child) => {
        if (child.name?.toLowerCase().startsWith('landmark_')) {
          const localY = child.position.y;
          const worldY = localY * 0.5 + standHeight;
          console.log(`   ${child.name.padEnd(24)} localY=${localY.toFixed(4)}  worldY≈${worldY.toFixed(4)}`);
        }
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }, 500);
    // ─────────────────────────────────────────────────────────────────────

    return clone;
  }, [scene, measurements.gender]);

  useEffect(() => {
    if (!group.current) return;
    addFrontMarker(group.current, '+Z', 0.4, 0x00ff00);
    tagFrontDirection(group.current, '+Z');
  }, []);

  useEffect(() => {
    meshRef.current = null;
    landmarksRef.current = {};

    clonedScene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        meshRef.current = child;
        console.log(`✅ Found ${measurements.gender} morphable mesh:`, child.name);
      }
      if (child.name?.toLowerCase().startsWith('landmark_')) {
        landmarksRef.current[child.name] = child;
      }
    });

    if (!meshRef.current) console.warn('⚠️ No morphable mesh found in cloned scene');
    if (Object.keys(landmarksRef.current).length > 0) {
      console.log('📍 Found native GLB embedded landmarks:', Object.keys(landmarksRef.current));
    }
  }, [clonedScene, measurements.gender]);

  useEffect(() => {
    return () => {
      clonedScene.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => {
            Object.keys(mat).forEach(k => { if (mat[k]?.isTexture) mat[k].dispose(); });
            mat.dispose();
          });
        }
      });
    };
  }, [clonedScene, measurements.gender]);

  useEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const dict = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;

    const {
      height_cm = 170,
      bust_cm = 90,
      waist_cm = 70,
      hips_cm = 95,
      shoulder_width_cm = 40,
      bmi = 22.0,
    } = measurements;

    const setMorph = (name, value) => {
      if (dict[name] !== undefined) {
        influences[dict[name]] = Math.max(0, Math.min(1, value));
        return true;
      }
      return false;
    };

    for (let i = 0; i < influences.length; i++) influences[i] = 0;

    const heightNorm = Math.max(-1, Math.min(1, (height_cm - 170) / 30));
    if (heightNorm > 0.05) setMorph('height_tall', heightNorm);
    if (heightNorm < -0.05) setMorph('height_short', Math.abs(heightNorm));

    const bmiValue = parseFloat(bmi);
    let wM = 0;
    if (bmiValue < 18.5) wM = -Math.max(0, Math.min(1, (18.5 - bmiValue) / 3.5));
    else if (bmiValue > 25) wM = Math.max(0, Math.min(1, (bmiValue - 25) / 10));
    if (wM > 0.05) setMorph('weight_heavy', wM);
    if (wM < -0.05) setMorph('weight_light', Math.abs(wM));

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
    measurements.height_cm, measurements.bust_cm,
    measurements.waist_cm, measurements.hips_cm,
    measurements.shoulder_width_cm, measurements.bmi, measurements.gender,
  ]);

  useFrame((_, delta) => {
    if (autoRotate && group.current) group.current.rotation.y += delta * 0.3;
  });

  useEffect(() => {
    if (!ref || !group.current) return;
    // Expose live landmark nodes — callers must call updateWorldMatrix(true)
    // then getWorldPosition() to get correct world coords including group scale
    group.current.getLiveLandmarks = () => landmarksRef.current;
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