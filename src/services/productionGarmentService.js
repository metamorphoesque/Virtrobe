// src/services/productionGarmentService.js
// ============================================
// Production-ready garment generation service
// Connects to Express backend → Modal.com API
// ============================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import garmentClassifier from './garmentClassifier';
import { loadImage } from '../utils/imageProcessing';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ProductionGarmentService {
  constructor() {
    this.loader = new GLTFLoader();
    this.isInitialized = false;
  }

  async initialize() {
    if (!this.isInitialized) {
      console.log('🚀 Initializing production garment service...');
      await garmentClassifier.initialize();
      this.isInitialized = true;
      console.log('✅ Service ready');
    }
  }

  /**
   * Main generation method
   * @param {File} imageFile - Uploaded garment image
   * @param {Object} userMeasurements - User body measurements
   * @returns {Promise<Object>} - Generated garment data
   */
  async generate(imageFile, userMeasurements) {
    if (!this.isInitialized) await this.initialize();

    try {
      console.log('🎨 Starting PRODUCTION generation...');
      console.log('   File:', imageFile.name, `(${(imageFile.size / 1024).toFixed(1)} KB)`);
      console.log('   Measurements:', userMeasurements);

      // ============================================
      // STAGE 1: CLIENT-SIDE CLASSIFICATION
      // ============================================
      const imageElement = await loadImage(imageFile);
      const classification = await garmentClassifier.classify(imageElement);
      
      console.log('🔍 Classified:', classification.type, `(${(classification.confidence * 100).toFixed(0)}%)`);

      // ============================================
      // STAGE 2: SEND TO BACKEND → MODAL API
      // ============================================
      console.log('☁️ Calling backend API...');
      
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('garmentType', classification.type);
      formData.append('measurements', JSON.stringify(userMeasurements));

      const response = await fetch(`${API_BASE_URL}/api/garment/generate`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      // ============================================
      // STAGE 3: LOAD GLB FROM BACKEND
      // ============================================
      console.log('📦 Loading GLB from server...');
      
      const glbBlob = await response.blob();
      const glbUrl = URL.createObjectURL(glbBlob);

      const gltf = await new Promise((resolve, reject) => {
        this.loader.load(
          glbUrl,
          (gltf) => resolve(gltf),
          (progress) => {
            const percent = (progress.loaded / progress.total * 100).toFixed(0);
            console.log(`   Loading: ${percent}%`);
          },
          (error) => reject(error)
        );
      });

      console.log('✅ GLB loaded successfully');

      // Extract mesh
      let garmentMesh = null;
      gltf.scene.traverse((child) => {
        if (child.isMesh && !garmentMesh) {
          garmentMesh = child;
        }
      });

      if (!garmentMesh) {
        throw new Error('No mesh found in GLB file');
      }

      // ============================================
      // STAGE 4: SCALE TO USER MEASUREMENTS
      // ============================================
      this.scaleToMeasurements(garmentMesh, userMeasurements, classification.type);

      // Cleanup
      URL.revokeObjectURL(glbUrl);

      console.log('✅ Garment ready for try-on');

      return {
        mesh: garmentMesh,
        type: classification.type,
        classification,
        method: 'modal-api',
        hasShapeKeys: !!garmentMesh.morphTargetDictionary,
        needsPhysics: true
      };

    } catch (error) {
      console.error('❌ Generation failed:', error);
      throw error;
    }
  }

  /**
   * Scale mesh to user measurements
   */
  scaleToMeasurements(mesh, measurements, garmentType) {
    const { bust_cm = 90, waist_cm = 70, height_cm = 170 } = measurements;
    
    const bustScale = bust_cm / 90;
    const heightScale = height_cm / 170;
    
    // Apply scaling
    mesh.scale.set(bustScale * 0.45, heightScale * 0.45, bustScale * 0.45);
    
    // Position based on garment type
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
    
    console.log('📏 Scaled:', {
      scale: bustScale * 0.45,
      position: positions[garmentType] || 0.5
    });
  }

  /**
   * Health check for backend
   */
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/garment/health`, {
        timeout: 5000
      });
      const data = await response.json();
      return data.modal === 'online';
    } catch (error) {
      console.warn('⚠️ Backend health check failed:', error.message);
      return false;
    }
  }
}

export default new ProductionGarmentService();