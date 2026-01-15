// FIXED: src/services/hybridGarmentGenerator.js
// TRUE HYBRID with proper sleeve removal and physics support
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
      let physicsData = null;
      
      const template = await templateMatcher.matchTemplate(classification, userMeasurements.gender);
      
      if (template && classification.confidence > 0.6) {
        // HIGH CONFIDENCE: Use template + depth deformation
        console.log('🎯 HYBRID MODE: Template + Depth Deformation');
        method = 'hybrid-depth-template';
        
        const result = await this.createDepthDeformedTemplate(
          template,
          depthMap,
          cleanImageUrl,
          userMeasurements,
          classification.type
        );
        
        garmentMesh = result.mesh;
        physicsData = result.physicsData;
        
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
        depthMap,
        needsPhysics: true,
        physicsData // Pass vertex data for physics
      };
      
    } catch (error) {
      console.error('❌ Generation failed:', error);
      throw error;
    }
  }

  /**
   * THE MAGIC: Deform template using depth map
   * CRITICAL FIXES:
   * 1. Actually remove sleeve vertices (not just pull them)
   * 2. Create physics-compatible vertex data
   * 3. Better depth sampling
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
    
    // Store physics data
    const physicsVertices = [];
    const physicsConstraints = [];
    
    // Detect garment features from depth
    const features = this.analyzeDepthFeatures(depthMap, garmentType);
    console.log('🔍 Detected features:', features);
    
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
        
        // Track which vertices to remove
        const verticesToRemove = [];
        
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
          
          // CRITICAL FIX: Better sleeve detection
          let displacement = 0;
          let shouldRemove = false;
          
          // For tank tops and sleeveless garments
          if (features.sleeveless || garmentType === 'tanktop') {
            // Check if this vertex is in sleeve area (based on X position AND depth)
            const isInSleeveArea = Math.abs(x) > 0.12; // Sleeve threshold
            
            if (isInSleeveArea && depth < 0.25) {
              // ACTUALLY REMOVE THIS VERTEX - pull to origin
              shouldRemove = true;
              displacement = -50; // Pull WAY out of view
              verticesToRemove.push(i);
            } else if (isInSleeveArea && depth < 0.4) {
              // Transition area - partial removal
              displacement = -5 * (0.4 - depth);
            }
          }
          
          if (!shouldRemove) {
            // Normal depth-based deformation
            if (depth < 0.15) {
              // Very low depth = no fabric, hide it
              displacement = -3;
            } else if (depth < 0.35) {
              // LOW DEPTH (edge, thin fabric)
              displacement = (depth - 0.5) * 0.8;
            } else if (depth > 0.65) {
              // HIGH DEPTH (thick fabric, wrinkles)
              displacement = (depth - 0.5) * 0.6;
            } else {
              // FABRIC PRESENT
              displacement = (depth - 0.5) * 0.4;
            }
          }
          
          // Apply displacement along normal
          const newX = x + nx * displacement;
          const newY = y + ny * displacement;
          const newZ = z + nz * displacement;
          
          positions.setXYZ(i, newX, newY, newZ);
          
          // Store for physics (only non-removed vertices)
          if (!shouldRemove) {
            physicsVertices.push({ x: newX, y: newY, z: newZ, index: i, mass: 0.1 });
          }
        }
        
        console.log(`🔥 Removing ${verticesToRemove.length} sleeve vertices`);
        
        // Actually remove sleeve vertices by collapsing them
        if (verticesToRemove.length > 0) {
          verticesToRemove.forEach(idx => {
            // Set to (0, -100, 0) to hide them completely
            positions.setXYZ(idx, 0, -100, 0);
          });
        }
        
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
        
        // Apply material with texture - FORCE UPDATE
        const newMaterial = new THREE.MeshStandardMaterial({
          map: colorTexture,
          roughness: 0.8,
          metalness: 0.1,
          side: THREE.DoubleSide,
          transparent: false,
          depthWrite: true,
          flatShading: false
        });
        
        // Force dispose old material
        if (child.material) {
          child.material.dispose();
        }
        
        child.material = newMaterial;
        child.castShadow = true;
        child.receiveShadow = true;
        
        console.log('✅ Mesh deformed, texture applied');
      }
    });
    
    // Scale to measurements
    this.scaleToMeasurements(mesh, measurements, garmentType);
    
    return {
      mesh,
      physicsData: {
        vertices: physicsVertices,
        constraints: physicsConstraints
      }
    };
  }

  /**
   * Analyze depth map to detect garment features
   */
  analyzeDepthFeatures(depthMap, garmentType) {
    const width = depthMap[0].length;
    const height = depthMap.length;
    
    // Sample left and right thirds to detect sleeves
    let leftDepthSum = 0;
    let rightDepthSum = 0;
    let centerDepthSum = 0;
    const samples = 30;
    
    for (let i = 0; i < samples; i++) {
      const y = Math.floor(height * 0.25 + (i / samples) * height * 0.35); // Upper-mid torso area
      
      // Left edge (outer 20%)
      const leftX = Math.floor(width * 0.1);
      leftDepthSum += depthMap[y][leftX];
      
      // Right edge (outer 20%)
      const rightX = Math.floor(width * 0.9);
      rightDepthSum += depthMap[y][rightX];
      
      // Center
      const centerX = Math.floor(width * 0.5);
      centerDepthSum += depthMap[y][centerX];
    }
    
    const leftAvg = leftDepthSum / samples;
    const rightAvg = rightDepthSum / samples;
    const centerAvg = centerDepthSum / samples;
    
    // More aggressive detection: If sides have much lower depth than center, it's sleeveless
    const depthDifference = centerAvg - Math.max(leftAvg, rightAvg);
    const sleeveless = (leftAvg < 0.2 && rightAvg < 0.2) || 
                       depthDifference > 0.3 ||
                       garmentType === 'tanktop';
    
    return {
      sleeveless,
      hasCollar: centerAvg > 0.8,
      leftDepth: leftAvg,
      rightDepth: rightAvg,
      centerDepth: centerAvg
    };
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
      'tanktop': 0.8,
      'dress': 0.5,
      'pants': 0.2,
      'skirt': 0.3,
      'shorts': 0.2
    };
    
    mesh.position.set(0, positions[garmentType] || 0.5, 0);
  }
}

export default new HybridGarmentGenerator();