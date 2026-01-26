// src/services/garment2D/garment2DProcessor.js
// ============================================
// MAIN 2.5D GARMENT PROCESSOR
// Coordinates all 2D processing steps
// ============================================

import silhouetteExtractor from './silhouetteExtractor';
import perspectiveWarper from './perspectiveWarper';
import depthShader from './depthShader';
import * as THREE from 'three';

class Garment2DProcessor {
  constructor() {
    this.canvas = null;
    this.ctx = null;
  }

  /**
   * Main processing pipeline
   * @param {File} imageFile - Uploaded garment image
   * @param {Object} measurements - User body measurements
   * @returns {Object} Processed garment data
   */
  async process(imageFile, measurements) {
    console.log('🎨 Starting 2.5D garment processing...');
    console.log('   Measurements:', measurements);

    try {
      // Step 1: Load image
      const imageElement = await this.loadImage(imageFile);
      console.log('✅ Image loaded:', imageElement.width, 'x', imageElement.height);

      // Step 2: Remove background and extract garment
      const cleanGarment = await silhouetteExtractor.extract(imageElement);
      console.log('✅ Background removed');

      // Step 3: Generate depth map from garment
      const depthMap = await this.generateSimpleDepthMap(cleanGarment);
      console.log('✅ Depth map generated');

      // Step 4: Create normal map from depth
      const normalMap = await depthShader.depthToNormal(depthMap);
      console.log('✅ Normal map created');

      // Step 5: Warp garment to mannequin proportions
      const warpedGarment = await perspectiveWarper.warp(
        cleanGarment, 
        measurements
      );
      console.log('✅ Garment warped to mannequin');

      // Step 6: Create Three.js textures
      const textures = this.createTextures(warpedGarment, depthMap, normalMap);
      console.log('✅ Textures created');

      // Step 7: Extract dominant color
      const dominantColor = this.extractDominantColor(cleanGarment);
      console.log('✅ Color extracted:', dominantColor);

      return {
        garmentTexture: textures.garmentTexture,
        depthTexture: textures.depthTexture,
        normalTexture: textures.normalTexture,
        dominantColor,
        originalImage: imageElement,
        processedImage: warpedGarment,
        method: '2.5D-warping',
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('❌ Garment processing failed:', error);
      throw error;
    }
  }

  /**
   * Load image from file
   */
  async loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Generate simple depth map from garment
   * Uses brightness + edge detection heuristic
   */
  async generateSimpleDepthMap(imageElement) {
    const canvas = document.createElement('canvas');
    const size = 512; // Standard depth map resolution
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Draw garment
    ctx.drawImage(imageElement, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    // Create depth map
    const depthData = ctx.createImageData(size, size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Transparent = no depth
        if (a < 10) {
          depthData.data[idx] = 0;
          depthData.data[idx + 1] = 0;
          depthData.data[idx + 2] = 0;
          depthData.data[idx + 3] = 0;
          continue;
        }

        // Calculate brightness (inverse = depth)
        const brightness = (r + g + b) / 3;
        
        // Darker areas = more forward (inverted depth)
        const depth = Math.floor((255 - brightness) * 0.8);

        // Apply body-shape depth gradient
        const normalizedX = x / size;
        const normalizedY = y / size;

        // Center bulges out more (chest/torso)
        const centerFactor = 1.0 - Math.abs(normalizedX - 0.5) * 2;
        const verticalFactor = Math.sin(normalizedY * Math.PI); // More depth in middle

        const shapedDepth = Math.floor(
          depth * 0.5 + // Base depth
          centerFactor * 80 * verticalFactor + // Center bulge
          40 // Minimum depth
        );

        depthData.data[idx] = shapedDepth;
        depthData.data[idx + 1] = shapedDepth;
        depthData.data[idx + 2] = shapedDepth;
        depthData.data[idx + 3] = a;
      }
    }

    ctx.putImageData(depthData, 0, 0);
    return canvas;
  }

  /**
   * Create Three.js textures from processed images
   */
  createTextures(garmentCanvas, depthCanvas, normalCanvas) {
    const garmentTexture = new THREE.CanvasTexture(garmentCanvas);
    const depthTexture = new THREE.CanvasTexture(depthCanvas);
    const normalTexture = new THREE.CanvasTexture(normalCanvas);

    // Configure textures
    [garmentTexture, depthTexture, normalTexture].forEach(tex => {
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
    });

    garmentTexture.needsUpdate = true;
    depthTexture.needsUpdate = true;
    normalTexture.needsUpdate = true;

    return {
      garmentTexture,
      depthTexture,
      normalTexture
    };
  }

  /**
   * Extract dominant color from garment
   */
  extractDominantColor(imageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = 50;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(imageElement, 0, 0, 50, 50);
    const imageData = ctx.getImageData(0, 0, 50, 50);
    const data = imageData.data;

    let r = 0, g = 0, b = 0, count = 0;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 128) { // Opaque pixels only
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
    }

    if (count === 0) return '#808080';

    r = Math.floor(r / count);
    g = Math.floor(g / count);
    b = Math.floor(b / count);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

export default new Garment2DProcessor();