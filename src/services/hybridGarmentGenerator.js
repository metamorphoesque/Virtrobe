// src/services/hybridGarmentGenerator.js (FIXED)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import depthEstimation from './depthEstimation';
import garmentClassifier from './garmentClassifier';
import templateMatcher from './templateMatcher';
import colorExtraction from './colorExtraction';
import { 
  loadImage, 
  removeImageBackgroundDev, 
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
      console.log('🚀 Initializing hybrid garment generator...');
      await depthEstimation.initialize();
      this.isInitialized = true;
      console.log('✅ Garment generator ready');
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      throw error;
    }
  }

  async generate(imageFile, userMeasurements) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log('🎨 Starting HYBRID garment generation...');
      console.log('📊 User measurements:', userMeasurements);

      // STEP 1: Load and preprocess image
      const imageElement = await loadImage(imageFile);
      console.log('✅ Image loaded:', imageElement.width, 'x', imageElement.height);
      
      // STEP 2: Classify garment type
      const classification = await garmentClassifier.classify(imageElement);
      console.log('🔍 Classified as:', classification.type, 
                  `(${(classification.confidence * 100).toFixed(0)}% confidence)`);
      
      // STEP 2.5: Extract dominant color
      const dominantColor = colorExtraction.extractDominantColor(imageElement);
      console.log('🎨 Dominant color:', dominantColor);
      
      // STEP 3: Remove background
      const cleanImageUrl = await removeImageBackgroundDev(imageFile);
      console.log('✅ Background processing complete');
      
      // STEP 4: Estimate depth
      const depthMap = await depthEstimation.estimateDepth(imageElement);
      console.log('✅ Depth map generated:', depthMap.length, 'x', depthMap[0].length);
      
      // STEP 5: Get template
      const template = await templateMatcher.matchTemplate(
        classification, 
        userMeasurements.gender
      );
      
      let garmentMesh;
      let method;
      
      if (template && classification.confidence > 0.5) {
        console.log('📐 Using TEMPLATE-BASED generation');
        method = 'hybrid-template';
        
        garmentMesh = template;
        
        // Load texture
        console.log('🖼️ Loading texture from uploaded image...');
        const colorTexture = await new Promise((resolve, reject) => {
          const loader = new THREE.TextureLoader();
          loader.load(
            cleanImageUrl,
            (texture) => {
              console.log('✅ Texture loaded:', texture.image.width, 'x', texture.image.height);
              resolve(texture);
            },
            undefined,
            (error) => {
              console.error('❌ Texture load failed:', error);
              reject(error);
            }
          );
        });
        
        // Create depth texture
        const depthCanvas = depthEstimation.createDepthTexture(depthMap);
        const depthTexture = new THREE.CanvasTexture(depthCanvas);
        depthTexture.needsUpdate = true;
        
        // Apply depth displacement
        applyDepthDisplacement(garmentMesh, depthMap, depthEstimation);
        
        // Apply material to ALL meshes
        let meshCount = 0;
        garmentMesh.traverse((child) => {
          if (child.isMesh) {
            meshCount++;
            console.log(`🎨 Applying material to mesh ${meshCount}:`, child.name || 'unnamed');
            
            child.material = new THREE.MeshStandardMaterial({
              map: colorTexture,
              displacementMap: depthTexture,
              displacementScale: 0.02,
              normalMap: depthTexture,
              normalScale: new THREE.Vector2(0.25, 0.25),
              roughness: 0.85,
              metalness: 0.05,
              side: THREE.DoubleSide,
              transparent: true,
              alphaTest: 0.1
            });
            
            child.material.needsUpdate = true;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        console.log(`✅ Applied texture to ${meshCount} mesh(es)`);
        
      } else {
        console.log('☁️ Using PROCEDURAL generation');
        method = 'procedural-depth';
        garmentMesh = generateMeshFromDepth(depthMap, cleanImageUrl);
      }
      
      // Apply zone-based morphing
      this.morphToFitAdvanced(garmentMesh, userMeasurements, classification.type);
      
      console.log('✅ HYBRID garment generation complete!');
      
      return {
        mesh: garmentMesh,
        type: classification.type,
        classification,
        method,
        hasShapeKeys: !!garmentMesh.morphTargetDictionary,
        dominantColor
      };
      
    } catch (error) {
      console.error('❌ Garment generation failed:', error);
      throw error;
    }
  }

  morphToFitAdvanced(mesh, measurements, garmentType) {
    // Your existing morphToFitAdvanced code here
    const positions = {
      'tshirt': 0.6,
      'shirt': 0.6,
      'dress': 0.3,
      'pants': -0.2,
      'skirt': 0.0,
      'shorts': -0.1
    };
    
    mesh.position.y = positions[garmentType] || 0;
  }
}

export default new HybridGarmentGenerator();