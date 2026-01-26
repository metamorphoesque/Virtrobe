// src/services/garment2D/depthShader.js
// ============================================
// DEPTH TO NORMAL MAP CONVERSION
// Creates normal maps for realistic lighting
// ============================================

class DepthShader {
  /**
   * Convert grayscale depth map to RGB normal map
   */
  async depthToNormal(depthCanvas, strength = 2.0) {
    console.log('🗺️ Converting depth to normal map...');

    const canvas = document.createElement('canvas');
    canvas.width = depthCanvas.width;
    canvas.height = depthCanvas.height;
    const ctx = canvas.getContext('2d');

    // Get depth data
    ctx.drawImage(depthCanvas, 0, 0);
    const depthData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const normalData = ctx.createImageData(canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;

    // Calculate normals from depth
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Get neighboring depth values
        const center = this.getDepth(depthData, x, y, width, height);
        const left = this.getDepth(depthData, x - 1, y, width, height);
        const right = this.getDepth(depthData, x + 1, y, width, height);
        const top = this.getDepth(depthData, x, y - 1, width, height);
        const bottom = this.getDepth(depthData, x, y + 1, width, height);

        // Calculate gradients (Sobel operator)
        const dx = (right - left) * strength;
        const dy = (bottom - top) * strength;

        // Create normal vector
        const length = Math.sqrt(dx * dx + dy * dy + 1);
        const nx = -dx / length;
        const ny = -dy / length;
        const nz = 1 / length;

        // Convert to RGB (0-255 range)
        normalData.data[idx] = Math.floor((nx * 0.5 + 0.5) * 255);     // R
        normalData.data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255); // G
        normalData.data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255); // B
        normalData.data[idx + 3] = depthData.data[idx + 3]; // Preserve alpha
      }
    }

    ctx.putImageData(normalData, 0, 0);
    console.log('✅ Normal map created');

    return canvas;
  }

  /**
   * Get depth value at coordinates (with boundary handling)
   */
  getDepth(imageData, x, y, width, height) {
    // Clamp to boundaries
    x = Math.max(0, Math.min(width - 1, x));
    y = Math.max(0, Math.min(height - 1, y));

    const idx = (y * width + x) * 4;
    
    // Return normalized depth (0-1)
    return imageData.data[idx] / 255;
  }

  /**
   * Smooth depth map using gaussian blur
   */
  async smoothDepth(depthCanvas, radius = 2) {
    console.log('🔄 Smoothing depth map...');

    const canvas = document.createElement('canvas');
    canvas.width = depthCanvas.width;
    canvas.height = depthCanvas.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(depthCanvas, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const smoothed = ctx.createImageData(canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;

    // Simple box blur
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;

        // Sample neighborhood
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const idx = (ny * width + nx) * 4;
              r += imageData.data[idx];
              g += imageData.data[idx + 1];
              b += imageData.data[idx + 2];
              a += imageData.data[idx + 3];
              count++;
            }
          }
        }

        const idx = (y * width + x) * 4;
        smoothed.data[idx] = r / count;
        smoothed.data[idx + 1] = g / count;
        smoothed.data[idx + 2] = b / count;
        smoothed.data[idx + 3] = a / count;
      }
    }

    ctx.putImageData(smoothed, 0, 0);
    return canvas;
  }

  /**
   * Enhance depth contrast
   */
  enhanceDepth(depthCanvas, contrast = 1.5) {
    const canvas = document.createElement('canvas');
    canvas.width = depthCanvas.width;
    canvas.height = depthCanvas.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(depthCanvas, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Find min/max depth
    let minDepth = 255, maxDepth = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) { // Only opaque pixels
        minDepth = Math.min(minDepth, data[i]);
        maxDepth = Math.max(maxDepth, data[i]);
      }
    }

    const range = maxDepth - minDepth;

    // Apply contrast stretch
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        const normalized = (data[i] - minDepth) / range;
        const enhanced = Math.pow(normalized, 1 / contrast);
        const value = Math.floor(enhanced * 255);
        
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }
}

export default new DepthShader(); 