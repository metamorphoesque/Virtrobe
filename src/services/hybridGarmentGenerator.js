// FIXED: src/services/hybridGarmentGenerator.js
// Now reads vertex groups from Blender properly
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
      // STAGE 2: DEPTH MAP
      // ============================================
      const depthMap = await depthEstimation.estimateDepth(imageElement);
      console.log('🗺️ Depth map generated:', depthMap.length, 'x', depthMap[0].length);
      
      // ============================================
      // STAGE 3: LOAD TEMPLATE & MODIFY
      // ============================================
      let garmentMesh;
      let method;
      
      const template = await templateMatcher.matchTemplate(classification, userMeasurements.gender);
      
      if (template && classification.confidence > 0.6) {
        console.log('🎯 HYBRID MODE: Template Modification');
        method = 'hybrid-template-modified';
        
        garmentMesh = await this.modifyTemplate(
          template,
          depthMap,
          cleanImageUrl,
          userMeasurements,
          classification.type
        );
        
      } else {
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
        needsPhysics: true
      };
      
    } catch (error) {
      console.error('❌ Generation failed:', error);
      throw error;
    }
  }

  /**
   * Modify template: Hide vertex groups or use name-based approach
   */
  async modifyTemplate(template, depthMap, textureUrl, measurements, garmentType) {
    console.log('✨ Modifying template for:', garmentType);
    
    // Clone template
    const mesh = template.clone();
    
    // Load texture
    const colorTexture = await new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        textureUrl,
        (texture) => {
          console.log('✅ Texture loaded successfully');
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error('❌ Texture load failed:', error);
          reject(error);
        }
      );
    });
    
    const isSleeveless = garmentType === 'tanktop' || garmentType === 'dress';
    console.log('🔍 Is sleeveless:', isSleeveless);
    
    // Traverse and modify
    mesh.traverse((child) => {
      if (child.isMesh) {
        console.log(`📐 Processing mesh: ${child.name || 'unnamed'} (${child.geometry.attributes.position.count} vertices)`);
        
        // METHOD 1: Check if mesh has separate objects for sleeves
        if (child.name && child.name.toLowerCase().includes('sleeve')) {
          if (isSleeveless) {
            console.log(`🔥 Hiding mesh object: ${child.name}`);
            child.visible = false;
            return; // Skip further processing
          }
        }
        
        // METHOD 2: Check for vertex groups in userData
        const geometry = child.geometry;
        
        if (geometry.userData && geometry.userData.vertexGroups) {
          console.log('✅ Found vertex groups:', Object.keys(geometry.userData.vertexGroups));
          
          if (isSleeveless) {
            this.hideVertexGroupsByName(geometry, ['left_sleeve', 'right_sleeve', 'sleeve']);
          }
        } else {
          console.log('⚠️ No vertex groups found, using fallback method');
          
          // METHOD 3: Fallback - Use geometric position
          if (isSleeveless) {
            this.hideSleevesByPosition(geometry);
          }
        }
        
        // Apply texture material to visible meshes
        if (child.visible !== false) {
          const newMaterial = new THREE.MeshStandardMaterial({
            map: colorTexture,
            roughness: 0.75,
            metalness: 0.1,
            side: THREE.DoubleSide,
            transparent: false,
            flatShading: false
          });
          
          if (child.material && child.material.dispose) {
            child.material.dispose();
          }
          
          child.material = newMaterial;
          child.castShadow = true;
          child.receiveShadow = true;
          
          console.log('✅ Material and texture applied');
        }
      }
    });
    
    // Scale to measurements
    this.scaleToMeasurements(mesh, measurements, garmentType);
    
    return mesh;
  }

  /**
   * Hide vertices by vertex group name
   */
  hideVertexGroupsByName(geometry, groupNames) {
    const positions = geometry.attributes.position;
    const vertexGroups = geometry.userData.vertexGroups;
    
    if (!vertexGroups || !positions) return;
    
    let hiddenCount = 0;
    
    // Iterate through all vertex groups
    for (const groupName of groupNames) {
      if (vertexGroups[groupName]) {
        const indices = vertexGroups[groupName];
        
        console.log(`🔥 Hiding vertex group: ${groupName} (${indices.length} vertices)`);
        
        // Hide all vertices in this group
        indices.forEach(index => {
          positions.setXYZ(index, 0, -100, 0);
          hiddenCount++;
        });
      }
    }
    
    if (hiddenCount > 0) {
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      console.log(`✅ Hidden ${hiddenCount} vertices using vertex groups`);
    }
  }

  /**
   * Fallback: Hide sleeves by geometric position
   * Assumes sleeves are on the sides (high X values)
   */
  hideSleevesByPosition(geometry) {
    const positions = geometry.attributes.position;
    if (!positions) return;
    
    // First pass: find the bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = (minX + maxX) / 2;
    
    console.log('📏 Mesh bounds:', { minX, maxX, width, height, centerX });
    
    // Second pass: hide vertices on extreme sides in upper half
    let hiddenCount = 0;
    const sleeveThreshold = width * 0.25; // Outer 25% on each side
    const upperThreshold = minY + height * 0.3; // Top 30%
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      
      const distanceFromCenter = Math.abs(x - centerX);
      const isInUpperRegion = y > upperThreshold;
      const isOnSide = distanceFromCenter > width * 0.35;
      
      if (isOnSide && isInUpperRegion) {
        positions.setXYZ(i, 0, -100, 0);
        hiddenCount++;
      }
    }
    
    if (hiddenCount > 0) {
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      console.log(`🔥 Hidden ${hiddenCount} sleeve vertices (position-based)`);
    } else {
      console.warn('⚠️ No vertices hidden - check your mesh structure');
    }
  }

  scaleToMeasurements(mesh, measurements, garmentType) {
    const { bust_cm = 90, waist_cm = 70, height_cm = 170 } = measurements;
    
    const bustScale = bust_cm / 90;
    const heightScale = height_cm / 170;
    
    // Reasonable scaling
    mesh.scale.set(bustScale * 0.45, heightScale * 0.45, bustScale * 0.45);
    
    const positions = {
      'tshirt': 0.85,
      'tanktop': 0.85,
      'shirt': 0.85,
      'dress': 0.5,
      'pants': 0.2,
      'skirt': 0.3,
      'shorts': 0.2
    };
    
    mesh.position.set(0, positions[garmentType] || 0.5, 0);
    
    console.log('📏 Scaled and positioned:', {
      scale: bustScale * 0.45,
      position: positions[garmentType] || 0.5
    });
  }
}

export default new HybridGarmentGenerator();