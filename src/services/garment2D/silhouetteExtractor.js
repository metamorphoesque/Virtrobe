// src/services/garment2D/silhouetteExtractor.js
// ============================================
// BACKGROUND REMOVAL & SILHOUETTE EXTRACTION
// Client-side processing using canvas manipulation
// ============================================

class SilhouetteExtractor {
  /**
   * Extract garment silhouette from image
   * Removes background and cleans up edges
   */
  async extract(imageElement) {
    console.log('🎭 Extracting garment silhouette...');

    const canvas = document.createElement('canvas');
    const size = 1024; // High resolution for quality
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(imageElement, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    // Step 1: Find background color (assume corners are background)
    const backgroundColor = this.detectBackgroundColor(data, size);
    console.log('   Background color detected:', backgroundColor);

    // Step 2: Remove background
    const threshold = 30; // Color similarity threshold
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate color distance from background
      const distance = Math.sqrt(
        Math.pow(r - backgroundColor.r, 2) +
        Math.pow(g - backgroundColor.g, 2) +
        Math.pow(b - backgroundColor.b, 2)
      );

      // If close to background color, make transparent
      if (distance < threshold) {
        data[i + 3] = 0; // Set alpha to 0
      }
    }

    // Step 3: Clean up edges (remove semi-transparent pixels)
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      
      // If mostly transparent, fully transparent
      if (alpha < 128) {
        data[i + 3] = 0;
      } else {
        data[i + 3] = 255; // Fully opaque
      }
    }

    ctx.putImageData(imageData, 0, 0);
    console.log('✅ Silhouette extracted');

    return canvas;
  }

  /**
   * Detect background color from image corners
   */
  detectBackgroundColor(data, size) {
    // Sample pixels from all four corners
    const samples = [
      this.getPixel(data, 0, 0, size),
      this.getPixel(data, size - 1, 0, size),
      this.getPixel(data, 0, size - 1, size),
      this.getPixel(data, size - 1, size - 1, size)
    ];

    // Average the corner colors
    const avg = {
      r: Math.floor(samples.reduce((sum, s) => sum + s.r, 0) / samples.length),
      g: Math.floor(samples.reduce((sum, s) => sum + s.g, 0) / samples.length),
      b: Math.floor(samples.reduce((sum, s) => sum + s.b, 0) / samples.length)
    };

    return avg;
  }

  /**
   * Get pixel color at coordinates
   */
  getPixel(data, x, y, width) {
    const idx = (y * width + x) * 4;
    return {
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
      a: data[idx + 3]
    };
  }

  /**
   * Find bounding box of non-transparent pixels
   */
  findBoundingBox(imageData) {
    const { data, width, height } = imageData;
    let minX = width, minY = height, maxX = 0, maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const alpha = data[idx + 3];

        if (alpha > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    return { minX, minY, maxX, maxY };
  }
}

export default new SilhouetteExtractor();