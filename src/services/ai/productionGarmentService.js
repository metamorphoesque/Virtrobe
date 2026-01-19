// src/services/ai/productionGarmentService.js
// ============================================
// PRODUCTION garment generation using TensorFlow BodyPix
// FIXED: Correct import paths
// ============================================

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as bodyPix from '@tensorflow-models/body-pix';
import * as THREE from 'three';
import { loadImage, removeImageBackgroundDev } from '../../utils/imageProcessing';
import garmentClassifier from '../garmentClassifier';
import colorExtraction from '../colorExtraction';

class ProductionGarmentService {
  constructor() {
    this.bodyPixModel = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      console.log('⚡ Production service already initialized');
      return;
    }

    console.log('🚀 Initializing production garment service...');

    try {
      // Set TensorFlow backend to WebGL (GPU acceleration)
      await tf.setBackend('webgl');
      await tf.ready();

      console.log('📥 Loading BodyPix model (5MB)...');
      const startTime = performance.now();

      // Load BodyPix with optimized settings
      this.bodyPixModel = await bodyPix.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2
      });

      const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);

      this.isInitialized = true;
      console.log(`✅ Production service ready in ${loadTime}s`);
      console.log('   Backend:', tf.getBackend());
      console.log('   Model: BodyPix MobileNetV1');

    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Main generation method - SAME API as hybridGarmentGenerator
   * @param {File} imageFile - Garment image file
   * @param {Object} userMeasurements - User body measurements
   * @returns {Promise<Object>} - Garment data (same format as before)
   */
  async generate(imageFile, userMeasurements) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('🎨 Starting garment generation...');
    console.log('   File:', imageFile.name);
    console.log('   Size:', (imageFile.size / 1024).toFixed(0), 'KB');

    try {
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
      console.log('✅ Background removed');

      // ============================================
      // STAGE 2: BODY SEGMENTATION
      // ============================================
      console.log('🔍 Running body segmentation...');
      const segmentation = await this.bodyPixModel.segmentPersonParts(imageElement, {
        flipHorizontal: false,
        internalResolution: 'medium',
        segmentationThreshold: 0.7
      });

      console.log('✅ Segmentation complete');

      // ============================================
      // STAGE 3: DETECT GARMENT BOUNDARIES
      // ============================================
      const boundaries = this.detectGarmentBoundaries(
        segmentation,
        classification.type,
        imageElement.width,
        imageElement.height
      );

      // ============================================
      // STAGE 4: GENERATE 3D MESH
      // ============================================
      console.log('🎨 Generating 3D mesh...');
      const mesh = this.generateMesh(
        boundaries,
        cleanImageUrl,
        userMeasurements,
        classification.type
      );

      // ============================================
      // STAGE 5: RETURN DATA (Same format as before!)
      // ============================================
      const garmentData = {
        mesh,
        type: classification.type,
        classification,
        method: 'tensorflow-bodypix',
        hasShapeKeys: false,
        dominantColor,
        depthMap: null,
        needsPhysics: true,

        tensorflow: {
          vertices: mesh.geometry.attributes.position.count,
          faces: mesh.geometry.index ? mesh.geometry.index.count / 3 : 0,
          segmentationQuality: boundaries.coverage > 0.3 ? 'good' : 'fair',
          generatedAt: Date.now()
        }
      };

      console.log('✅ Generation complete!');
      console.log('   Vertices:', garmentData.tensorflow.vertices);
      console.log('   Faces:', garmentData.tensorflow.faces);
      console.log('   Method:', garmentData.method);

      return garmentData;

    } catch (error) {
      console.error('❌ Generation failed:', error);
      throw error;
    }
  }

  /**
   * Detect garment boundaries from body segmentation
   */
  detectGarmentBoundaries(segmentation, garmentType, width, height) {
    const { data } = segmentation;

    // BodyPix body part IDs
    const PARTS = {
      LEFT_FACE: 0, RIGHT_FACE: 1,
      LEFT_UPPER_ARM: 2, RIGHT_UPPER_ARM: 3,
      LEFT_LOWER_ARM: 4, RIGHT_LOWER_ARM: 5,
      LEFT_HAND: 6, RIGHT_HAND: 7,
      LEFT_UPPER_LEG: 8, RIGHT_UPPER_LEG: 9,
      LEFT_LOWER_LEG: 10, RIGHT_LOWER_LEG: 11,
      TORSO_FRONT: 12, TORSO_BACK: 13,
      LEFT_FOOT: 14, RIGHT_FOOT: 15
    };

    // Map garment types to body parts
    const garmentParts = {
      'tshirt': [PARTS.LEFT_UPPER_ARM, PARTS.RIGHT_UPPER_ARM, 
                 PARTS.LEFT_LOWER_ARM, PARTS.RIGHT_LOWER_ARM,
                 PARTS.TORSO_FRONT, PARTS.TORSO_BACK],
      'tanktop': [PARTS.TORSO_FRONT, PARTS.TORSO_BACK],
      'shirt': [PARTS.LEFT_UPPER_ARM, PARTS.RIGHT_UPPER_ARM, 
                PARTS.LEFT_LOWER_ARM, PARTS.RIGHT_LOWER_ARM,
                PARTS.TORSO_FRONT, PARTS.TORSO_BACK],
      'dress': [PARTS.LEFT_UPPER_ARM, PARTS.RIGHT_UPPER_ARM,
                PARTS.TORSO_FRONT, PARTS.TORSO_BACK,
                PARTS.LEFT_UPPER_LEG, PARTS.RIGHT_UPPER_LEG],
      'pants': [PARTS.LEFT_UPPER_LEG, PARTS.RIGHT_UPPER_LEG,
                PARTS.LEFT_LOWER_LEG, PARTS.RIGHT_LOWER_LEG],
      'skirt': [PARTS.LEFT_UPPER_LEG, PARTS.RIGHT_UPPER_LEG],
      'shorts': [PARTS.LEFT_UPPER_LEG, PARTS.RIGHT_UPPER_LEG]
    };

    const relevantParts = garmentParts[garmentType] || garmentParts['tshirt'];

    let minX = width, minY = height, maxX = 0, maxY = 0;
    let totalX = 0, totalY = 0, count = 0;

    // Find bounding box
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const partId = data[index];

        if (partId !== -1 && relevantParts.includes(partId)) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          totalX += x;
          totalY += y;
          count++;
        }
      }
    }

    const boundaries = {
      minX, minY, maxX, maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: count > 0 ? totalX / count : width / 2,
      centerY: count > 0 ? totalY / count : height / 2,
      pixelCount: count,
      coverage: count / (width * height)
    };

    console.log('📏 Boundaries:', {
      size: `${boundaries.width}x${boundaries.height}`,
      coverage: `${(boundaries.coverage * 100).toFixed(1)}%`
    });

    return boundaries;
  }

  /**
   * Generate 3D mesh with proper topology
   */
  generateMesh(boundaries, textureUrl, measurements, garmentType) {
    console.log('🎨 Creating mesh for:', garmentType);

    // Calculate dimensions to match your template scale
    const aspectRatio = boundaries.width / boundaries.height;
    const baseHeight = 4.0;  // Match template size (will be scaled by 0.45 later)
    const baseWidth = baseHeight * aspectRatio * 0.8;

    // Create high-quality plane geometry
    const widthSegments = 30;
    const heightSegments = 40;

    const geometry = new THREE.PlaneGeometry(
      baseWidth,
      baseHeight,
      widthSegments,
      heightSegments
    );

    // Apply curvature based on garment type
    const positions = geometry.attributes.position;
    const uvs = geometry.attributes.uv;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const u = uvs.getX(i);
      const v = uvs.getY(i);

      let z = 0;

      // Different curves for different garments (scaled for templates)
      switch (garmentType) {
        case 'tshirt':
        case 'shirt':
          // Torso curve with shoulder emphasis
          const shoulderCurve = v > 0.7 ? (v - 0.7) * 1.2 : 0;
          z = Math.sin(u * Math.PI) * (0.5 + shoulderCurve) * (1 - v * 0.5);
          break;

        case 'tanktop':
          z = Math.sin(u * Math.PI) * 0.4 * (1 - v * 0.6);
          break;

        case 'dress':
          // Flared bottom
          const flare = v < 0.4 ? 0 : (v - 0.4) * 0.08;
          z = Math.sin(u * Math.PI) * (0.35 + flare * 0.4) * (1 - v * 0.3);
          break;

        case 'pants':
        case 'shorts':
          // Leg separation
          const legGap = Math.abs(u - 0.5) * 1.0 * v;
          z = Math.sin(u * Math.PI) * 0.25 + legGap;
          break;

        case 'skirt':
          // A-line skirt
          const skirtFlare = v * v * 0.6;
          z = Math.sin(u * Math.PI) * (0.2 + skirtFlare);
          break;

        default:
          z = Math.sin(u * Math.PI) * 0.4 * (1 - v * 0.5);
      }

      positions.setZ(i, z);
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    // Load texture
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(textureUrl);

    // Create material
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.75,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Scale to measurements
    this.scaleToMeasurements(mesh, measurements, garmentType);

    return mesh;
  }

  /**
   * Scale mesh to user measurements
   * MATCHES your old hybridGarmentGenerator.js exactly
   */
  scaleToMeasurements(mesh, measurements, garmentType) {
    const { bust_cm = 90, waist_cm = 70, height_cm = 170 } = measurements;

    // EXACT SAME as your old system
    const bustScale = bust_cm / 90;
    const heightScale = height_cm / 170;

    mesh.scale.set(bustScale * 0.45, heightScale * 0.45, bustScale * 0.45);

    // Position relative to mannequin (these match your old system)
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
      position: positions[garmentType] || 0.5,
      garmentType
    });
  }

  /**
   * Dispose resources
   */
  dispose() {
    if (this.bodyPixModel) {
      this.bodyPixModel.dispose();
      this.bodyPixModel = null;
    }
    this.isInitialized = false;
    console.log('🧹 Service disposed');
  }
}

// Export singleton instance
export default new ProductionGarmentService();