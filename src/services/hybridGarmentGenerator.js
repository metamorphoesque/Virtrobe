// COMPLETE REWRITE: src/services/hybridGarmentGenerator.js
// TRUE HYBRID: Depth + Template + Physics + Texture
// ============================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import depthEstimation from './depthEstimation';
import garmentClassifier from './garmentClassifier';
import templateMatcher from './templateMatcher';
import colorExtraction from './colorExtraction';
import { loadImage, removeImageBackgroundDev } from '../utils/imageProcessing';
import { generateMeshFromDepth } from '../utils/meshGeneration';

class HybridGarmentGenerator {
  constructor() {
    this.loader = new GLTFLoader();
    this.isInitialized = false;
  }

  async initialize() {
    if (!this.isInitialized) {
      console.log('🚀 Initializing hybrid garment generator...');
      await depthEstimation.initialize();
      this.isInitialized = true;
      console.log('✅ Garment generator ready');
    }
  }

  async generate(imageFile, userMeasurements) {
    if (!this.isInitialized) await this.initialize();

    try {
      console.log('🎨 Starting TRUE HYBRID generation...');
      
      // ============================================
      // STAGE 1: IMAGE ANALYSIS
      // ============================================
      const imageElement = await loadImage(imageFile);
      console.log('✅ Image loaded:', imageElement.width, 'x', imageElement.height);
      
      const classification = await garmentClassifier.classify(imageElement);
      console.log('🔍 Classified:', classification.type, `(${(classification.confidence * 100).toFixed(0)}%)`);
      
      const dominantColor = colorExtraction.extractDominantColor(imageElement);
      console.log('🎨 Dominant color:', dominantColor);
      
      const cleanImageUrl = await removeImageBackgroundDev(imageFile);
      
      // ============================================
      // STAGE 2: DEPTH MAP (THE MAGIC!)
      // ============================================
      const depthMap = await depthEstimation.estimateDepth(imageElement);
      console.log('🗺️ Depth map generated:', depthMap.length, 'x', depthMap[0].length);
      
      // ============================================
      // STAGE 3: HYBRID MESH GENERATION
      // ============================================
      let garmentMesh;
      let method;
      
      const template = await templateMatcher.matchTemplate(classification, userMeasurements.gender);
      
      if (template && classification.confidence > 0.6) {
        // HIGH CONFIDENCE: Use template + depth deformation
        console.log('🎯 HYBRID MODE: Template + Depth Deformation');
        method = 'hybrid-depth-template';
        
        garmentMesh = await this.createDepthDeformedTemplate(
          template,
          depthMap,
          cleanImageUrl,
          userMeasurements,
          classification.type
        );
        
      } else {
        // LOW CONFIDENCE: Pure procedural from depth
        console.log('☁️ PROCEDURAL MODE: Depth-to-Mesh');
        method = 'procedural-depth';
        
        garmentMesh = generateMeshFromDepth(depthMap, cleanImageUrl);
        this.scaleToMeasurements(garmentMesh, userMeasurements, classification.type);
      }
      
      console.log('✅ Garment mesh created');
      
      return {
        mesh: garmentMesh,
        type: classification.type,
        classification,
        method,
        hasShapeKeys: !!garmentMesh.morphTargetDictionary,
        dominantColor,
        depthMap, // Pass depth map for physics
        needsPhysics: true // Flag that this should use physics
      };
      
    } catch (error) {
      console.error('❌ Generation failed:', error);
      throw error;
    }
  }

  /**
   * THE MAGIC: Deform template using depth map
   * This removes sleeves from tank tops, adds wrinkles, etc.
   */
  async createDepthDeformedTemplate(template, depthMap, textureUrl, measurements, garmentType) {
    console.log('✨ Applying depth-based deformation...');
    
    // Clone template
    const mesh = template.clone();
    
    // Load texture
    const colorTexture = await new Promise((resolve) => {
      new THREE.TextureLoader().load(textureUrl, resolve);
    });
    
    console.log('✅ Texture loaded');
    
    // Traverse all meshes
    mesh.traverse((child) => {
      if (child.isMesh) {
        const geometry = child.geometry;
        
        if (!geometry.attributes.position || !geometry.attributes.uv) {
          console.warn('⚠️ Mesh missing position or UV data');
          return;
        }
        
        const positions = geometry.attributes.position;
        const uvs = geometry.attributes.uv;
        const normals = geometry.attributes.normal;
        
        // Store original positions
        if (!geometry.userData.originalPositions) {
          geometry.userData.originalPositions = positions.array.slice();
        }
        
        const originalPositions = geometry.userData.originalPositions;
        
        console.log(`📐 Deforming mesh: ${child.name || 'unnamed'} (${positions.count} vertices)`);
        
        // For each vertex, check depth and deform
        for (let i = 0; i < positions.count; i++) {
          const u = uvs.getX(i);
          const v = uvs.getY(i);
          
          // Sample depth at this UV coordinate
          const depth = this.sampleDepth(depthMap, u, v);
          
          // Get original position
          const x = originalPositions[i * 3];
          const y = originalPositions[i * 3 + 1];
          const z = originalPositions[i * 3 + 2];
          
          // Get normal direction
          const nx = normals ? normals.getX(i) : 0;
          const ny = normals ? normals.getY(i) : 0;
          const nz = normals ? normals.getZ(i) : 1;
          
          // CRITICAL: If depth is near 0 (no fabric), pull vertex inward (disappear)
          // If depth is high (fabric present), push outward
          let displacement;
          
          if (depth < 0.1) {
            // NO FABRIC DETECTED (e.g., sleeve area on tank top)
            displacement = -0.5; // Pull WAY in (make invisible)
          } else if (depth < 0.3) {
            // LOW DEPTH (edge, thin fabric)
            displacement = (depth - 0.3) * 0.2;
          } else {
            // FABRIC PRESENT
            displacement = (depth - 0.5) * 0.15; // Subtle wrinkles
          }
          
          // Apply displacement along normal
          positions.setXYZ(
            i,
            x + nx * displacement,
            y + ny * displacement,
            z + nz * displacement
          );
        }
        
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
        
        // Apply material with texture
        child.material = new THREE.MeshStandardMaterial({
          map: colorTexture,
          roughness: 0.85,
          metalness: 0.05,
          side: THREE.DoubleSide,
          transparent: true,
          alphaTest: 0.5,
          depthWrite: true
        });
        
        child.material.needsUpdate = true;
        child.castShadow = true;
        child.receiveShadow = true;
        
        console.log('✅ Mesh deformed and textured');
      }
    });
    
    // Scale to measurements
    this.scaleToMeasurements(mesh, measurements, garmentType);
    
    return mesh;
  }

  sampleDepth(depthMap, u, v) {
    const width = depthMap[0].length;
    const height = depthMap.length;
    
    const x = Math.floor(u * (width - 1));
    const y = Math.floor((1 - v) * (height - 1));
    
    const clampedX = Math.max(0, Math.min(width - 1, x));
    const clampedY = Math.max(0, Math.min(height - 1, y));
    
    return depthMap[clampedY][clampedX];
  }

  scaleToMeasurements(mesh, measurements, garmentType) {
    const { bust_cm = 90, waist_cm = 70, height_cm = 170 } = measurements;
    
    const bustScale = bust_cm / 90;
    const heightScale = height_cm / 170;
    const waistScale = waist_cm / 70;
    
    mesh.scale.set(bustScale * 0.5, heightScale * 0.5, bustScale * 0.5);
    
    const positions = {
      'tshirt': 0.8,
      'shirt': 0.8,
      'dress': 0.5,
      'pants': 0.2,
      'skirt': 0.3,
      'shorts': 0.2
    };
    
    mesh.position.set(0, positions[garmentType] || 0.5, 0);
  }
}

export default new HybridGarmentGenerator();
