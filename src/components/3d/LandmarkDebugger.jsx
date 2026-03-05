// src/components/3d/LandmarkDebugger.jsx
// DROP THIS INTO <SceneContent> TEMPORARILY to find your exact landmark names.
// Remove it once you've confirmed the names and updated LANDMARKS in GarmentLoader3D.

import { useEffect } from 'react';
import * as THREE from 'three';   // ← was require('three') which breaks in Vite/ESM

const LandmarkDebugger = ({ mannequinRef }) => {
  useEffect(() => {
    if (!mannequinRef?.current) return;

    const timer = setTimeout(() => {
      const root = mannequinRef.current;
      root.updateMatrixWorld(true);

      const found = [];
      root.traverse((child) => {
        const name = child.name?.toLowerCase() ?? '';
        const isLandmark =
          name.includes('landmark') ||
          name.includes('anchor') ||
          name.includes('chest') ||
          name.includes('waist') ||
          name.includes('hip') ||
          name.includes('neck') ||
          name.includes('shoulder') ||
          name.includes('knee') ||
          name.includes('empty') ||
          child.type === 'Object3D';

        if (isLandmark && child.name) {
          child.updateMatrixWorld(true);
          const pos = child.getWorldPosition
            ? child.getWorldPosition(new THREE.Vector3())  // ← fixed
            : null;

          found.push({
            name: child.name,
            type: child.type,
            worldY: pos ? pos.y.toFixed(4) : '?',
            worldX: pos ? pos.x.toFixed(4) : '?',
            worldZ: pos ? pos.z.toFixed(4) : '?',
          });
        }
      });

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 LANDMARK DEBUGGER — all candidate nodes:');
      if (found.length === 0) {
        console.warn('  ⚠️ No landmark-like nodes found!');
        console.log('  Dumping ALL named nodes instead:');
        root.traverse((child) => {
          if (child.name) console.log(`  [${child.type}] "${child.name}"`);
        });
      } else {
        found.forEach((f) => {
          console.log(`  [${f.type}] "${f.name}"  world=(${f.worldX}, ${f.worldY}, ${f.worldZ})`);
        });
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 COPY THESE into GarmentLoader3D LANDMARKS constant');
    }, 1000);

    return () => clearTimeout(timer);
  }, [mannequinRef?.current]);  // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

export default LandmarkDebugger;