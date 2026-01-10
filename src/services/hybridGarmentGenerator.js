import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import depthEstimation from './depthEstimation';
import garmentClassifier from './garmentClassifier';
import { 
  loadImage, 
  removeImageBackground, 
  applyDepthDisplacement 
} from '../utils/imageProcessing';
import { generateMeshFromDepth } from '../utils/meshGeneration';

class HybridGarmentGenerator {
  constructor() {
    this.templates = {};
    this.loader = new GLTFLoader();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log(' Initializing hybrid garment generator...');
      
      // Initialize depth estimation
      await depthEstimation.initialize();
      
      // Load garment templates
      await this.loadTemplates();
      
      this.isInitialized = true;
      console.log(' Garment generator ready');
    } catch (error) {
      console.error(' Failed to initialize:', error);
      throw error;
    }
  }

  async loadTemplates() {
    const templateTypes = ['tshirt', 'dress', 'pants', 'skirt', 'shorts'];
    
    const promises = templateTypes.map(type => 
      this.loadTemplate(`/models/garments/${type}.glb`, type)
    );

    await Promise.allSettled(promises);
  }

  loadTemplate(url, type) {
    return new Promise((resolve) => {
      this.loader.load(
        url,
        (gltf) => {
          const mesh = gltf.scene.children[0];
          this.templates[type] = mesh;
          console.log(`Loaded template: ${type}`);
          resolve();
        },
        undefined,
        (error) => {
          console.warn(` Failed to load ${type}, will use procedural mesh`);
          this.templates[type] = null;
          resolve();
        }
      );
    });
  }

  async generate(imageFile, userMeasurements) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(' Starting garment generation...');

      // STEP 1: Load and preprocess image
      const imageElement = await loadImage(imageFile);
      console.log(' Image loaded');
      
      // STEP 2: Classify garment type
      const classification = await garmentClassifier.classify(imageElement);
      console.log('Classified as:', classification);
      
      // STEP 3: Remove background
      const cleanImageUrl = await removeImageBackground(imageFile);
      console.log(' Background removed');
      
      // STEP 4: Estimate depth
      const depthMap = await depthEstimation.estimateDepth(imageElement);
      console.log(' Depth estimated');
      
      // STEP 5: Get or create base mesh
      let garmentMesh;
      const template = this.templates[classification.type];
      
      if (template && classification.confidence > 0.6) {
        // Use template-based approach (HIGH CONFIDENCE)
        console.log('📐 Using template-based generation');
        garmentMesh = template.clone();
        
        // Apply depth displacement to template
        applyDepthDisplacement(garmentMesh, depthMap, depthEstimation);
        
        // Create depth texture
        const depthCanvas = depthEstimation.createDepthTexture(depthMap);
        const depthTexture = new THREE.CanvasTexture(depthCanvas);
        
        // Load color texture
        const colorTexture = new THREE.TextureLoader().load(cleanImageUrl);
        
        // Enhanced material with depth
        garmentMesh.material = new THREE.MeshStandardMaterial({
          map: colorTexture,
          displacementMap: depthTexture,
          displacementScale: 0.03,
          normalMap: depthTexture,
          normalScale: new THREE.Vector2(0.3, 0.3),
          roughness: 0.85,
          metalness: 0.05,
          side: THREE.DoubleSide,
          transparent: true
        });
        
      } else {
        // Use procedural mesh generation (LOW CONFIDENCE or NO TEMPLATE)
        console.log(' Using procedural mesh generation');
        garmentMesh = generateMeshFromDepth(depthMap, cleanImageUrl);
      }
      
      // STEP 6: Morph to fit user measurements
      this.morphToFit(garmentMesh, userMeasurements, classification.type);
      
      console.log(' Garment generation complete');
      
      return {
        mesh: garmentMesh,
        type: classification.type,
        classification,
        method: template ? 'template' : 'procedural'
      };
      
    } catch (error) {
      console.error(' Garment generation failed:', error);
      throw error;
    }
  }

  morphToFit(mesh, measurements, garmentType) {
    const { bust_cm, waist_cm, hips_cm, height_cm } = measurements;
    
    // Base measurements for templates
    const baseMeasurements = {
      bust: 90,
      waist: 70,
      hips: 95,
      height: 170
    };
    
    // Calculate scale factors
    const scaleX = bust_cm / baseMeasurements.bust;
    const scaleY = height_cm / baseMeasurements.height;
    const scaleZ = waist_cm / baseMeasurements.waist;
    
    mesh.scale.set(scaleX, scaleY, scaleZ);
    
    // Position based on garment type
    const positions = {
      'tshirt': { y: 0.6 },
      'dress': { y: 0.3 },
      'pants': { y: -0.2 },
      'skirt': { y: 0.0 },
      'shorts': { y: -0.1 }
    };
    
    const pos = positions[garmentType] || { y: 0 };
    mesh.position.set(0, pos.y, 0);
  }
}

export default new HybridGarmentGenerator();