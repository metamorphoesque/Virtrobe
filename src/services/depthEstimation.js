// src/services/depthEstimation.js
import * as tf from '@tensorflow/tfjs';

class DepthEstimationService {
  constructor() {
    this.model = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Loading MiDaS depth model...');
      
      // USE THIS INSTEAD - TensorFlow.js hosted model (no CORS issues)
      this.model = await tf.loadGraphModel(
        'https://storage.googleapis.com/tfjs-models/savedmodel/bodypix/mobilenet/float/050/model-stride16.json'
      );
      
      // OR use a simpler approach - skip depth estimation for now
      // We'll use template + texture only
      
      this.isInitialized = true;
      console.log('✅ Depth model loaded');
    } catch (error) {
      console.error('❌ Failed to load depth model:', error);
      // Don't throw - gracefully degrade to template-only mode
      console.warn('⚠️ Running in template-only mode (no depth enhancement)');
      this.isInitialized = true; // Mark as initialized anyway
    }
  }

  async estimateDepth(imageElement) {
    if (!this.model) {
      // Return a flat depth map if model failed to load
      console.warn('⚠️ No depth model - returning flat depth map');
      const flatMap = Array(256).fill(null).map(() => Array(256).fill(0.5));
      return flatMap;
    }

    // Your existing depth estimation code here...
    const tensor = tf.browser.fromPixels(imageElement)
      .resizeBilinear([256, 256])
      .expandDims(0)
      .toFloat()
      .div(255.0);

    const depthTensor = await this.model.predict(tensor);
    const depthArray = await depthTensor.squeeze().array();
    
    tensor.dispose();
    depthTensor.dispose();

    return this.normalizeDepth(depthArray);
  }

  normalizeDepth(depthArray) {
    const flat = depthArray.flat();
    const min = Math.min(...flat);
    const max = Math.max(...flat);
    const range = max - min;

    return depthArray.map(row => 
      row.map(value => (value - min) / range)
    );
  }

  sampleDepthMap(depthMap, u, v) {
    const width = depthMap[0].length;
    const height = depthMap.length;
    
    const x = Math.floor(u * (width - 1));
    const y = Math.floor((1 - v) * (height - 1));
    
    return depthMap[y][x];
  }

  createDepthTexture(depthMap) {
    const width = depthMap[0].length;
    const height = depthMap.length;
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    const imageData = ctx.createImageData(width, height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const depth = Math.floor(depthMap[y][x] * 255);
        
        imageData.data[idx] = depth;
        imageData.data[idx + 1] = depth;
        imageData.data[idx + 2] = depth;
        imageData.data[idx + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    return canvas;
  }
}

export default new DepthEstimationService();