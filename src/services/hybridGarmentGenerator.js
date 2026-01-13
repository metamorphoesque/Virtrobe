// src/services/hybridGarmentGenerator.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import depthEstimation from './depthEstimation';
import garmentClassifier from './garmentClassifier';
import templateMatcher from './templateMatcher';
import { 
  loadImage, 
  removeImageBackground, 
  applyDepthDisplacement 
} from '../utils/imageProcessing';
import { generateMeshFromDepth } from '../utils/meshGeneration';

class HybridGarmentGenerator {
  constructor() {
    this.loader = new GLTFLoader();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log(' Initializing hybrid garment generator...');
      
      // Initialize depth estimation
      await depthEstimation.initialize();
      
      this.isInitialized = true;
      console.log(' Garment generator ready');
    } catch (error) {
      console.error(' Failed to initialize:', error);
      throw error;
    }
  }

  async generate(imageFile, userMeasurements) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(' Starting HYBRID garment generation...');

      // STEP 1: Load and preprocess image
      const imageElement = await loadImage(imageFile);
      console.log(' Image loaded:', imageElement.width, 'x', imageElement.height);
      
      // STEP 2: Classify garment type
      const classification = await garmentClassifier.classify(imageElement);
      console.log('✅ Classified as:', classification.type, 
                  `(${(classification.confidence * 100).toFixed(0)}% confidence)`);
      
      // STEP 3: Remove background
      const cleanImageUrl = await removeImageBackground(imageFile);
      console.log(' Background removed');
      
      // STEP 4: Estimate depth
      const depthMap = await depthEstimation.estimateDepth(imageElement);
      console.log(' Depth map generated:', depthMap.length, 'x', depthMap[0].length);
      
      // STEP 5: HYBRID APPROACH - Use templateMatcher to find best template
      let garmentMesh;
      let method;
      
      // Use templateMatcher to get best matching template
      const template = await templateMatcher.matchTemplate(
        classification, 
        userMeasurements.gender
      );
      
      if (template && classification.confidence > 0.5) {
        // ============================================
        // TEMPLATE-BASED: Template found and confidence is decent
        // ============================================
        console.log(' Using TEMPLATE-BASED generation');
        method = 'hybrid-template';
        
        garmentMesh = template; // templateMatcher already returns a clone
        
        // Apply depth displacement to template for realistic wrinkles/folds
        applyDepthDisplacement(garmentMesh, depthMap, depthEstimation);
        
        // Create textures
        const depthCanvas = depthEstimation.createDepthTexture(depthMap);
        const depthTexture = new THREE.CanvasTexture(depthCanvas);
        const colorTexture = new THREE.TextureLoader().load(cleanImageUrl);
        
        // Enhanced material with depth details
        garmentMesh.material = new THREE.MeshStandardMaterial({
          map: colorTexture,
          displacementMap: depthTexture,
          displacementScale: 0.02,
          normalMap: depthTexture,
          normalScale: new THREE.Vector2(0.25, 0.25),
          roughness: 0.85,
          metalness: 0.05,
          side: THREE.DoubleSide,
          transparent: true
        });
        
        console.log(' Template enhanced with depth details');
        
      } else {
        // ============================================
        // PROCEDURAL: No template or low confidence
        // ============================================
        console.log(' Using PROCEDURAL generation (no template available)');
        method = 'procedural-depth';
        
        garmentMesh = generateMeshFromDepth(depthMap, cleanImageUrl);
        
        console.log(' Procedural mesh generated');
      }
      
      // STEP 6: Apply non-uniform scaling for realistic fit
      this.morphToFitAdvanced(garmentMesh, userMeasurements, classification.type);
      
      // STEP 7: Apply shape keys if template has them (optional enhancement)
      if (garmentMesh.morphTargetDictionary) {
        console.log(' Template has shape keys - applying morph targets');
        this.applyMorphTargets(garmentMesh, userMeasurements);
      }
      
      console.log(' HYBRID garment generation complete!');
      console.log(`   Method: ${method}`);
      console.log(`   Type: ${classification.type}`);
      console.log(`   Has shape keys: ${!!garmentMesh.morphTargetDictionary}`);
      
      return {
        mesh: garmentMesh,
        type: classification.type,
        classification,
        method,
        hasShapeKeys: !!garmentMesh.morphTargetDictionary
      };
      
    } catch (error) {
      console.error(' Garment generation failed:', error);
      throw error;
    }
  }

  // ENHANCED: Non-uniform zone-based scaling for realistic fit
  morphToFitAdvanced(mesh, measurements, garmentType) {
    const { bust_cm, waist_cm, hips_cm, height_cm, shoulder_width_cm } = measurements;
    
    const base = {
      bust: 90,
      waist: 70,
      hips: 95,
      height: 170,
      shoulders: 40
    };
    
    console.log(' Applying advanced zone-based morphing...');
    
    // Overall height scaling
    const scaleY = height_cm / base.height;
    
    // Traverse mesh and apply zone-based scaling
    mesh.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const geometry = child.geometry;
        const positions = geometry.attributes.position;
        
        // Store original positions if not already stored
        if (!geometry.userData.originalPositions) {
          geometry.userData.originalPositions = positions.array.slice();
        }
        
        const originalPositions = geometry.userData.originalPositions;
        
        for (let i = 0; i < positions.count; i++) {
          const x = originalPositions[i * 3];
          const y = originalPositions[i * 3 + 1];
          const z = originalPositions[i * 3 + 2];
          
          let xScale = 1, zScale = 1;
          
          // Normalize Y to 0-1 range (assumes mesh centered around origin)
          const normalizedY = (y + 1) / 2;
          
          // Zone-based scaling for upper body garments
          if (garmentType === 'shirt' || garmentType === 'tshirt') {
            if (normalizedY > 0.7) {
              // Shoulder zone
              xScale = shoulder_width_cm / base.shoulders;
              zScale = (bust_cm * 0.8 + shoulder_width_cm * 0.2) / (base.bust * 0.8 + base.shoulders * 0.2);
            } else if (normalizedY > 0.5) {
              // Bust zone
              xScale = bust_cm / base.bust;
              zScale = bust_cm / base.bust;
            } else if (normalizedY > 0.3) {
              // Waist transition zone (blend bust to waist)
              const blendFactor = (normalizedY - 0.3) / 0.2; // 0 to 1
              const bustScale = bust_cm / base.bust;
              const waistScale = waist_cm / base.waist;
              xScale = waistScale + (bustScale - waistScale) * blendFactor;
              zScale = xScale;
            } else {
              // Lower waist/hip zone
              xScale = waist_cm / base.waist;
              zScale = waist_cm / base.waist;
            }
          }
          // Zone-based scaling for dresses
          else if (garmentType === 'dress') {
            if (normalizedY > 0.6) {
              xScale = bust_cm / base.bust;
              zScale = bust_cm / base.bust;
            } else if (normalizedY > 0.4) {
              xScale = waist_cm / base.waist;
              zScale = waist_cm / base.waist;
            } else {
              xScale = hips_cm / base.hips;
              zScale = hips_cm / base.hips;
            }
          }
          // Zone-based scaling for lower body garments
          else if (garmentType === 'pants' || garmentType === 'skirt' || garmentType === 'shorts') {
            if (normalizedY > 0.5) {
              xScale = waist_cm / base.waist;
              zScale = waist_cm / base.waist;
            } else {
              xScale = hips_cm / base.hips;
              zScale = hips_cm / base.hips;
            }
          }
          
          // Apply transformed position
          positions.setXYZ(
            i,
            x * xScale,
            y * scaleY,
            z * zScale
          );
        }
        
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
      }
    });
    
    // Position based on garment type
    const positions = {
      'tshirt': 0.6,
      'shirt': 0.6,
      'dress': 0.3,
      'pants': -0.2,
      'skirt': 0.0,
      'shorts': -0.1
    };
    
    mesh.position.y = positions[garmentType] || 0;
    
    console.log(' Zone-based morphing complete');
  }
  
  // OPTIONAL: Shape key morphing (only if templates have shape keys)
  applyMorphTargets(mesh, measurements) {
    mesh.traverse((child) => {
      if (!child.isMesh || !child.morphTargetDictionary || !child.morphTargetInfluences) {
        return;
      }
      
      const dict = child.morphTargetDictionary;
      const influences = child.morphTargetInfluences;
      
      console.log(' Applying morph targets...');
      
      // Helper function
      const setMorph = (shapeName, value) => {
        if (dict[shapeName] !== undefined) {
          influences[dict[shapeName]] = Math.max(0, Math.min(1, value));
          console.log(`   ${shapeName} = ${value.toFixed(3)}`);
          return true;
        }
        return false;
      };
      
      // Reset all morphs first
      influences.fill(0);
      
      // Calculate normalized values (-1 to 1)
      const bustNorm = (measurements.bust_cm - 90) / 20;
      const waistNorm = (measurements.waist_cm - 70) / 20;
      const hipsNorm = (measurements.hips_cm - 95) / 25;
      const shoulderNorm = (measurements.shoulder_width_cm - 40) / 10;
      const heightNorm = (measurements.height_cm - 170) / 30;
      
      // Apply morphs (clamp to 0-1)
      if (bustNorm > 0.05) {
        setMorph('bust_large', Math.min(1, bustNorm));
      } else if (bustNorm < -0.05) {
        setMorph('bust_small', Math.min(1, Math.abs(bustNorm)));
      }
      
      if (waistNorm > 0.05) {
        setMorph('waist_wide', Math.min(1, waistNorm));
      } else if (waistNorm < -0.05) {
        setMorph('waist_narrow', Math.min(1, Math.abs(waistNorm)));
      }
      
      if (hipsNorm > 0.05) {
        setMorph('hips_wide', Math.min(1, hipsNorm));
      } else if (hipsNorm < -0.05) {
        setMorph('hips_narrow', Math.min(1, Math.abs(hipsNorm)));
      }
      
      if (shoulderNorm > 0.05) {
        setMorph('shoulders_broad', Math.min(1, shoulderNorm));
      } else if (shoulderNorm < -0.05) {
        setMorph('shoulders_narrow', Math.min(1, Math.abs(shoulderNorm)));
      }
      
      if (heightNorm > 0.05) {
        setMorph('length_long', Math.min(1, heightNorm));
      } else if (heightNorm < -0.05) {
        setMorph('length_short', Math.min(1, Math.abs(heightNorm)));
      }
    });
    
    console.log(' Morph targets applied');
  }
}

export default new HybridGarmentGenerator();