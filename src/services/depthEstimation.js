import * as tf from '@tensorflow/tfjs';

class DepthEstimationService {
  constructor() {
    this.model = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('Loading MiDaS depth model...');
      
      // Load MiDaS small model (runs in browser)
      this.model = await tf.loadGraphModel(
        'https://tfhub.dev/intel/midas/v2_1_small/1',
        { fromTFHub: true }
      );
      
      this.isInitialized = true;
      console.log(' Depth model loaded');
    } catch (error) {
      console.error(' Failed to load depth model:', error);
      throw error;
    }
  }

  async estimateDepth(imageElement) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Preprocess image for MiDaS (256x256)
    const tensor = tf.browser.fromPixels(imageElement)
      .resizeBilinear([256, 256])
      .expandDims(0)
      .toFloat()
      .div(255.0);

    // Run depth estimation
    const depthTensor = await this.model.predict(tensor);
    
    // Convert to 2D array
    const depthArray = await depthTensor.squeeze().array();
    
    // Clean up tensors
    tensor.dispose();
    depthTensor.dispose();

    // Normalize depth values to 0-1 range
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

  // Sample depth value at UV coordinate
  sampleDepthMap(depthMap, u, v) {
    const width = depthMap[0].length;
    const height = depthMap.length;
    
    const x = Math.floor(u * (width - 1));
    const y = Math.floor((1 - v) * (height - 1)); // Flip V coordinate
    
    return depthMap[y][x];
  }

  // Convert depth map to height map texture
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
        
        imageData.data[idx] = depth;     // R
        imageData.data[idx + 1] = depth; // G
        imageData.data[idx + 2] = depth; // B
        imageData.data[idx + 3] = 255;   // A
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    return canvas;
  }
}

export default new DepthEstimationService();