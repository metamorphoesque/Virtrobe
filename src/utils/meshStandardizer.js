// src/utils/meshStandardizer.js
// ============================================
// BROWSER-BASED MESH STANDARDIZATION
// Detects orientation and applies transforms in Three.js
// No Blender, no server processing needed
// ============================================

import * as THREE from 'three';

/**
 * STANDARDIZATION TARGET:
 * - Origin: World center (0, 0, 0)
 * - Front: +Z axis
 * - Up: +Y axis
 * - Scale: Normalized (tallest dimension = 1.0)
 */

class MeshStandardizer {
  
  /**
   * Analyze mesh and determine its current orientation
   */
  analyzeMesh(mesh) {
    // Clone to avoid modifying original
    const clone = mesh.clone();
    clone.updateMatrixWorld(true);
    
    // Get bounding box
    const bbox = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);
    
    console.log('📊 MESH ANALYSIS:');
    console.log('   Original Size:', size.toArray().map(n => n.toFixed(3)));
    console.log('   Original Center:', center.toArray().map(n => n.toFixed(3)));
    console.log('   Original Rotation:', clone.rotation.toArray().slice(0, 3).map(n => (n * 180 / Math.PI).toFixed(1) + '°'));
    
    // Determine which axis is "up" (should be Y)
    const upAxis = this.detectUpAxis(size);
    
    // Determine which axis is "front" (should be Z)
    const frontAxis = this.detectFrontAxis(mesh, size, upAxis);
    
    return {
      size,
      center,
      upAxis,
      frontAxis,
      needsStandardization: upAxis !== 'Y' || frontAxis !== 'Z'
    };
  }
  
  /**
   * Detect which axis is "up" (tallest dimension)
   */
  detectUpAxis(size) {
    const axes = {
      'X': size.x,
      'Y': size.y,
      'Z': size.z
    };
    
    // Tallest dimension is "up"
    const upAxis = Object.keys(axes).reduce((a, b) => axes[a] > axes[b] ? a : b);
    
    console.log('   Detected UP axis:', upAxis, `(${axes[upAxis].toFixed(3)} units)`);
    return upAxis;
  }
  
  /**
   * Detect which axis is "front" by analyzing vertex distribution
   */
  detectFrontAxis(mesh, size, upAxis) {
    // Strategy: Front usually has more vertex density (more detail)
    // Count vertices in each direction
    
    const vertices = [];
    mesh.traverse((child) => {
      if (child.isMesh) {
        const geometry = child.geometry;
        const positionAttribute = geometry.attributes.position;
        
        for (let i = 0; i < positionAttribute.count; i++) {
          const vertex = new THREE.Vector3();
          vertex.fromBufferAttribute(positionAttribute, i);
          vertex.applyMatrix4(child.matrixWorld);
          vertices.push(vertex);
        }
      }
    });
    
    if (vertices.length === 0) {
      console.warn('   No vertices found, defaulting front to Z');
      return 'Z';
    }
    
    // Count vertices in positive/negative directions for each axis
    const counts = {
      'X+': vertices.filter(v => v.x > 0).length,
      'X-': vertices.filter(v => v.x < 0).length,
      'Y+': vertices.filter(v => v.y > 0).length,
      'Y-': vertices.filter(v => v.y < 0).length,
      'Z+': vertices.filter(v => v.z > 0).length,
      'Z-': vertices.filter(v => v.z < 0).length,
    };
    
    console.log('   Vertex distribution:', counts);
    
    // Front is usually the side with MORE vertices (more detail/buttons/etc)
    // Exclude the up axis from consideration
    const validDirections = Object.keys(counts).filter(dir => !dir.startsWith(upAxis));
    const frontDirection = validDirections.reduce((a, b) => counts[a] > counts[b] ? a : b);
    
    const frontAxis = frontDirection[0];  // 'X', 'Y', or 'Z'
    const frontSign = frontDirection[1];  // '+' or '-'
    
    console.log('   Detected FRONT axis:', frontAxis + frontSign);
    return frontAxis + frontSign;
  }
  
  /**
   * Standardize mesh to canonical orientation
   * Returns transform to apply
   */
  standardize(mesh) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 BROWSER-BASED STANDARDIZATION');
    
    const analysis = this.analyzeMesh(mesh);
    
    if (!analysis.needsStandardization) {
      console.log('✓ Mesh already standardized');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return {
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        scale: 1.0
      };
    }
    
    // Calculate rotation needed
    const rotation = this.calculateRotation(analysis.upAxis, analysis.frontAxis);
    
    // Calculate scale (normalize to height = 1.0)
    const scale = this.calculateScale(analysis.size, analysis.upAxis, rotation);
    
    // Position at origin
    const position = new THREE.Vector3(0, 0, 0);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ STANDARDIZATION TRANSFORM:');
    console.log('   Position:', position.toArray());
    console.log('   Rotation:', rotation.toArray().map(n => (n * 180 / Math.PI).toFixed(1) + '°'));
    console.log('   Scale:', scale.toFixed(3));
    console.log('   Result: Origin (0,0,0), Front +Z, Up +Y');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return { position, rotation, scale };
  }
  
  /**
   * Calculate rotation to align axes
   */
  calculateRotation(upAxis, frontAxis) {
    const rotation = new THREE.Euler(0, 0, 0, 'XYZ');
    
    // Step 1: Rotate so upAxis → Y
    if (upAxis === 'X') {
      rotation.z = Math.PI / 2;  // Rotate 90° around Z
    } else if (upAxis === 'Z') {
      rotation.x = -Math.PI / 2;  // Rotate -90° around X
    }
    // If upAxis === 'Y', no rotation needed
    
    // Step 2: Rotate so frontAxis → Z
    // This depends on current orientation after step 1
    const frontAxisLetter = frontAxis[0];
    const frontSign = frontAxis[1];
    
    if (frontAxisLetter === 'X') {
      if (frontSign === '+') {
        rotation.y = -Math.PI / 2;  // +X → +Z requires -90° around Y
      } else {
        rotation.y = Math.PI / 2;   // -X → +Z requires +90° around Y
      }
    } else if (frontAxisLetter === 'Z') {
      if (frontSign === '-') {
        rotation.y = Math.PI;  // -Z → +Z requires 180° around Y
      }
      // If +Z, already correct
    } else if (frontAxisLetter === 'Y') {
      // Front is Y axis (unusual, but handle it)
      rotation.x = Math.PI / 2;
    }
    
    console.log('   Rotation calculation:');
    console.log('     Up:', upAxis, '→ Y');
    console.log('     Front:', frontAxis, '→ +Z');
    
    return rotation;
  }
  
  /**
   * Calculate scale to normalize height
   */
  calculateScale(size, upAxis, rotation) {
    // After rotation, height will be in Y axis
    // Target height = 1.0
    
    let currentHeight;
    if (upAxis === 'Y') {
      currentHeight = size.y;
    } else if (upAxis === 'X') {
      currentHeight = size.x;
    } else {
      currentHeight = size.z;
    }
    
    const scale = 1.0 / currentHeight;
    console.log('   Scale calculation:');
    console.log('     Current height:', currentHeight.toFixed(3));
    console.log('     Target height: 1.0');
    console.log('     Scale factor:', scale.toFixed(3));
    
    return scale;
  }
  
  /**
   * Apply standardization transform to a mesh
   * Modifies the mesh in place
   */
  applyStandardization(mesh) {
    const transform = this.standardize(mesh);
    
    // Center the mesh at origin first
    const bbox = new THREE.Box3().setFromObject(mesh);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    
    mesh.position.sub(center);
    
    // Apply rotation
    mesh.rotation.copy(transform.rotation);
    
    // Apply scale
    mesh.scale.set(transform.scale, transform.scale, transform.scale);
    
    // Update matrices
    mesh.updateMatrix();
    mesh.updateMatrixWorld(true);
    
    console.log('✅ Standardization applied to mesh');
    
    return mesh;
  }
}

export default new MeshStandardizer();