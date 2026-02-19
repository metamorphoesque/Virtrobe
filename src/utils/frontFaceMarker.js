// src/utils/frontFaceMarker.js
// ============================================
// FRONT FACE MARKER SYSTEM
// Manual tagging for mannequins and garments
// ============================================

import * as THREE from 'three';

/**
 * Add a visual marker showing which direction is "front"
 * This is a helper arrow that can be added to any mesh
 */
export function addFrontMarker(mesh, direction = '+Z', length = 0.5, color = 0xff0000) {
  // Create arrow showing front direction
  const dir = new THREE.Vector3();
  
  switch(direction) {
    case '+X': dir.set(1, 0, 0); break;
    case '-X': dir.set(-1, 0, 0); break;
    case '+Y': dir.set(0, 1, 0); break;
    case '-Y': dir.set(0, -1, 0); break;
    case '+Z': dir.set(0, 0, 1); break;
    case '-Z': dir.set(0, 0, -1); break;
  }
  
  const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), length, color, 0.2, 0.1);
  arrow.name = 'front_marker';
  arrow.userData.frontDirection = direction;
  
  mesh.add(arrow);
  
  console.log(`✓ Front marker added: ${direction}`);
  return arrow;
}

/**
 * Detect front direction from a mesh
 * Looks for front_marker, or falls back to analysis
 */
export function detectFrontDirection(mesh) {
  // Method 1: Check for explicit marker
  const marker = mesh.getObjectByName('front_marker');
  if (marker && marker.userData.frontDirection) {
    console.log('✓ Front marker found:', marker.userData.frontDirection);
    return marker.userData.frontDirection;
  }
  
  // Method 2: Check userData
  if (mesh.userData.frontDirection) {
    console.log('✓ Front direction in userData:', mesh.userData.frontDirection);
    return mesh.userData.frontDirection;
  }
  
  // Method 3: Fallback - analyze geometry
  console.log('⚠️ No front marker found, analyzing geometry...');
  return analyzeFrontDirection(mesh);
}

/**
 * Analyze mesh geometry to guess front direction
 * Returns best guess like '+Z', '-X', etc.
 */
function analyzeFrontDirection(mesh) {
  const vertices = [];
  
  mesh.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const posAttr = child.geometry.attributes.position;
      if (!posAttr) return;
      
      for (let i = 0; i < posAttr.count; i++) {
        const v = new THREE.Vector3();
        v.fromBufferAttribute(posAttr, i);
        v.applyMatrix4(child.matrixWorld);
        vertices.push(v);
      }
    }
  });
  
  if (vertices.length === 0) {
    console.warn('No vertices found, defaulting to +Z');
    return '+Z';
  }
  
  // Count vertices in each direction
  const counts = {
    '+X': 0, '-X': 0,
    '+Y': 0, '-Y': 0,
    '+Z': 0, '-Z': 0
  };
  
  vertices.forEach(v => {
    if (v.x > 0) counts['+X']++;
    if (v.x < 0) counts['-X']++;
    if (v.y > 0) counts['+Y']++;
    if (v.y < 0) counts['-Y']++;
    if (v.z > 0) counts['+Z']++;
    if (v.z < 0) counts['-Z']++;
  });
  
  // Front typically has more vertices (more detail)
  const directions = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const topDirection = directions[0][0];
  
  console.log('Vertex distribution:', counts);
  console.log('Best guess for front:', topDirection);
  
  return topDirection;
}

/**
 * Calculate rotation to align two directions
 * Example: alignDirections('+Z', '+X') returns rotation to make +Z point toward +X
 */
export function calculateAlignmentRotation(fromDirection, toDirection) {
  const rotations = {
    // From +Z
    '+Z,+X': [0, -Math.PI / 2, 0],
    '+Z,-X': [0, Math.PI / 2, 0],
    '+Z,+Z': [0, 0, 0],
    '+Z,-Z': [0, Math.PI, 0],
    
    // From -Z
    '-Z,+X': [0, Math.PI / 2, 0],
    '-Z,-X': [0, -Math.PI / 2, 0],
    '-Z,+Z': [0, Math.PI, 0],
    '-Z,-Z': [0, 0, 0],
    
    // From +X
    '+X,+X': [0, 0, 0],
    '+X,-X': [0, Math.PI, 0],
    '+X,+Z': [0, Math.PI / 2, 0],
    '+X,-Z': [0, -Math.PI / 2, 0],
    
    // From -X
    '-X,+X': [0, Math.PI, 0],
    '-X,-X': [0, 0, 0],
    '-X,+Z': [0, -Math.PI / 2, 0],
    '-X,-Z': [0, Math.PI / 2, 0],
  };
  
  const key = `${fromDirection},${toDirection}`;
  const rotation = rotations[key] || [0, 0, 0];
  
  console.log(`Alignment: ${fromDirection} → ${toDirection} = [${rotation.map(r => (r * 180 / Math.PI).toFixed(0) + '°').join(', ')}]`);
  
  return rotation;
}

/**
 * Tag a mesh with its front direction (saves to userData)
 */
export function tagFrontDirection(mesh, direction) {
  mesh.userData.frontDirection = direction;
  console.log(`✓ Tagged mesh with front direction: ${direction}`);
}