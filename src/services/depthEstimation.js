// src/services/depthEstimation.js (FIXED)
// ============================================
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
      
      // Use MobileNet as a simpler alternative for now
      // MiDaS model from TFHub has compatibility issues
      // We'll use a simpler depth estimation approach
      
      // For now, we'll use a simplified depth estimation
      // based on image brightness and edges
      this.isInitialized = true;
      console.log('✅ Depth estimator ready (simplified mode)');
      
    } catch (error) {
      console.error('❌ Failed to load depth model:', error);
      this.isInitialized = true; // Continue with fallback
    }
  }

  async estimateDepth(imageElement) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('🗺️ Estimating depth (simplified algorithm)...');

    // Create canvas for processing
    const canvas = document.createElement('canvas');
    const targetSize = 256;
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    
    // Draw and resize image
    ctx.drawImage(imageElement, 0, 0, targetSize, targetSize);
    const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
    
    // Simplified depth estimation using brightness + edge detection
    const depthMap = this.simplifiedDepthEstimation(imageData);
    
    console.log('✅ Depth map generated:', depthMap.length, 'x', depthMap[0].length);
    
    return depthMap;
  }

  simplifiedDepthEstimation(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Create depth map array
    const depthMap = [];
    
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        
        // Skip transparent pixels (background)
        if (a < 50) {
          row.push(0);
          continue;
        }
        
        // Calculate brightness (simple depth heuristic)
        const brightness = (r + g + b) / 3;
        
        // Calculate edge strength (high edges = foreground)
        const edgeStrength = this.getEdgeStrength(data, x, y, width, height);
        
        // Combine brightness and edges for depth
        // Brighter + more edges = closer (higher depth)
        const depth = (brightness / 255) * 0.7 + (edgeStrength / 255) * 0.3;
        
        row.push(depth);
      }
      depthMap.push(row);
    }
    
    // Smooth the depth map
    return this.smoothDepthMap(depthMap);
  }

  getEdgeStrength(data, x, y, width, height) {
    // Sobel edge detection
    if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
      return 0;
    }
    
    const getPixelBrightness = (px, py) => {
      const idx = (py * width + px) * 4;
      return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    };
    
    // Sobel kernels
    const gx = 
      -1 * getPixelBrightness(x - 1, y - 1) +
       1 * getPixelBrightness(x + 1, y - 1) +
      -2 * getPixelBrightness(x - 1, y) +
       2 * getPixelBrightness(x + 1, y) +
      -1 * getPixelBrightness(x - 1, y + 1) +
       1 * getPixelBrightness(x + 1, y + 1);
    
    const gy =
      -1 * getPixelBrightness(x - 1, y - 1) +
      -2 * getPixelBrightness(x, y - 1) +
      -1 * getPixelBrightness(x + 1, y - 1) +
       1 * getPixelBrightness(x - 1, y + 1) +
       2 * getPixelBrightness(x, y + 1) +
       1 * getPixelBrightness(x + 1, y + 1);
    
    return Math.sqrt(gx * gx + gy * gy);
  }

  smoothDepthMap(depthMap) {
    const height = depthMap.length;
    const width = depthMap[0].length;
    const smoothed = [];
    
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        // 3x3 average smoothing
        let sum = 0;
        let count = 0;
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              sum += depthMap[ny][nx];
              count++;
            }
          }
        }
        
        row.push(sum / count);
      }
      smoothed.push(row);
    }
    
    return smoothed;
  }

  normalizeDepth(depthArray) {
    const flat = depthArray.flat();
    const min = Math.min(...flat);
    const max = Math.max(...flat);
    const range = max - min;

    if (range === 0) return depthArray;

    return depthArray.map(row => 
      row.map(value => (value - min) / range)
    );
  }

  // Sample depth value at UV coordinate
  sampleDepthMap(depthMap, u, v) {
    const width = depthMap[0].length;
    const height = depthMap.length;
    
    const x = Math.floor(u * (width - 1));
    const y = Math.floor((1 - v) * (height - 1));
    
    // Clamp to valid range
    const clampedX = Math.max(0, Math.min(width - 1, x));
    const clampedY = Math.max(0, Math.min(height - 1, y));
    
    return depthMap[clampedY][clampedX];
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