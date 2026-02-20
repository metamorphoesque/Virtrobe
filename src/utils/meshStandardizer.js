// src/utils/meshStandardizer.js

import * as THREE from 'three';

// ─────────────────────────────────────────────
//  ASSET ORIENTATION REGISTRY
// ─────────────────────────────────────────────
const ASSET_ORIENTATIONS = {
  triposr:  { up: 'Y', front: '-Z' },
  template: { up: 'Y', front: '+Z' }, // update once confirmed via console
  unknown:  { up: 'Y', front: '+Z' }, // update once confirmed via console
};

// ─────────────────────────────────────────────
//  ROTATION TABLE
// ─────────────────────────────────────────────
const ROTATION_MAP = {
  'Y|+Z': [0, 0, 0],
  'Y|-Z': [0, Math.PI, 0],
  'Y|+X': [0, -Math.PI / 2, 0],
  'Y|-X': [0,  Math.PI / 2, 0],
  'Z|+X': [-Math.PI / 2, -Math.PI / 2, 0],
  'Z|-X': [-Math.PI / 2,  Math.PI / 2, 0],
  'Z|+Y': [-Math.PI / 2,  Math.PI, 0],
  'Z|-Y': [-Math.PI / 2, 0, 0],
  'X|+Z': [0, 0,  Math.PI / 2],
  'X|-Z': [0, 0, -Math.PI / 2],
};

// ─────────────────────────────────────────────
//  CONSOLE OVERRIDE SYSTEM
//
//  Open browser console and type any of these:
//
//    window.__garmentDebug.setFront('Y|+X')   ← try +X front
//    window.__garmentDebug.setFront('Y|-X')   ← try -X front
//    window.__garmentDebug.setFront('Y|-Z')   ← try -Z front
//    window.__garmentDebug.setFront('Y|+Z')   ← back to default
//
//  Then hard refresh (Ctrl+Shift+R) after each one.
//  When the garment looks correct:
//
//    window.__garmentDebug.confirm()   ← prints exactly what to paste into registry
//    window.__garmentDebug.reset()     ← clears override
//    window.__garmentDebug.help()      ← shows this guide
// ─────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.__garmentDebug = {
    _override: null,

    setFront(rotKey) {
      if (!ROTATION_MAP[rotKey]) {
        console.error(`❌ Invalid key "${rotKey}". Valid options:`, Object.keys(ROTATION_MAP).join(', '));
        return;
      }
      this._override = rotKey;
      console.log(`✅ Override set to "${rotKey}"`);
      console.log(`   Rotation: [${ROTATION_MAP[rotKey].map(r => (r * 180 / Math.PI).toFixed(0) + '°').join(', ')}]`);
      console.log('   👉 Hard refresh (Ctrl+Shift+R) to see the change.');
    },

    confirm() {
      if (!this._override) {
        console.warn('No override active. Call setFront() first.');
        return;
      }
      const [up, front] = this._override.split('|');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ CONFIRMED ORIENTATION:', this._override);
      console.log('   Paste this into ASSET_ORIENTATIONS in meshStandardizer.js:');
      console.log(`   template: { up: '${up}', front: '${front}' },`);
      console.log(`   unknown:  { up: '${up}', front: '${front}' },`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    },

    reset() {
      this._override = null;
      console.log('🔄 Override cleared. Hard refresh to revert.');
    },

    help() {
      console.log(`
🎯 GARMENT ORIENTATION DEBUG TOOLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1 — Try each orientation, hard refresh after each:
  window.__garmentDebug.setFront('Y|+X')
  window.__garmentDebug.setFront('Y|-X')
  window.__garmentDebug.setFront('Y|-Z')
  window.__garmentDebug.setFront('Y|+Z')   ← default

Step 2 — When it looks right:
  window.__garmentDebug.confirm()           ← prints registry fix

Step 3 — Paste the output into ASSET_ORIENTATIONS in meshStandardizer.js
  window.__garmentDebug.reset()             ← clean up
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    },
  };

  console.log('🎯 Garment debug ready. Type window.__garmentDebug.help() to start.');
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function bakeTransform(object) {
  object.updateMatrixWorld(true);
  object.traverse((child) => {
    if (child.isMesh && child.geometry) {
      child.geometry = child.geometry.clone();
      child.geometry.applyMatrix4(child.matrixWorld);
      child.position.set(0, 0, 0);
      child.quaternion.identity();
      child.scale.set(1, 1, 1);
      child.updateMatrixWorld(true);
    }
  });
  object.position.set(0, 0, 0);
  object.quaternion.identity();
  object.scale.set(1, 1, 1);
  object.updateMatrixWorld(true);
}

function getBBox(object) {
  object.updateMatrixWorld(true);
  const bbox   = new THREE.Box3().setFromObject(object);
  const size   = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);
  return { bbox, size, center };
}

// ─────────────────────────────────────────────
//  MAIN CLASS
// ─────────────────────────────────────────────
class MeshStandardizer {

  applyStandardization(mesh, source = 'unknown') {
    // Console override takes priority over registry
    const overrideKey = typeof window !== 'undefined'
      ? window.__garmentDebug?._override
      : null;

    const orientation = ASSET_ORIENTATIONS[source] ?? ASSET_ORIENTATIONS.unknown;
    const rotKey      = overrideKey ?? `${orientation.up}|${orientation.front}`;
    const eulerAngles = ROTATION_MAP[rotKey] ?? [0, 0, 0];

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔧 STANDARDIZING  source="${source}"`);
    if (overrideKey) {
      console.log(`   ⚠️  CONSOLE OVERRIDE ACTIVE: "${overrideKey}"`);
    } else {
      console.log(`   Registry: up=${orientation.up}, front=${orientation.front}`);
    }
    console.log(`   Rotation: [${eulerAngles.map(r => (r * 180 / Math.PI).toFixed(0) + '°').join(', ')}]`);

    // Step 1: reset any loader transform
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
    mesh.updateMatrixWorld(true);

    // Step 2: apply corrective rotation
    mesh.setRotationFromEuler(new THREE.Euler(...eulerAngles, 'XYZ'));
    mesh.updateMatrixWorld(true);

    // Step 3: bake rotation into geometry so all subsequent measurements are correct
    bakeTransform(mesh);

    // Step 4: center at origin
    const { size, center } = getBBox(mesh);
    mesh.position.sub(center);
    mesh.updateMatrixWorld(true);

    // Step 5: normalize height (Y) to 1.0
    const height = size.y > 0.001 ? size.y : Math.max(size.x, size.z);
    mesh.scale.setScalar(1.0 / height);
    mesh.updateMatrixWorld(true);

    const after = getBBox(mesh);
    console.log(`   After — size: [${after.size.toArray().map(n => n.toFixed(3)).join(', ')}]`);
    console.log(`           center: [${after.center.toArray().map(n => n.toFixed(3)).join(', ')}]`);
    console.log('✅ Standardization complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return mesh;
  }

  registerOrientation(source, up, front) {
    ASSET_ORIENTATIONS[source] = { up, front };
    console.log(`📝 Registered: "${source}" → up=${up}, front=${front}`);
  }
}

export default new MeshStandardizer();