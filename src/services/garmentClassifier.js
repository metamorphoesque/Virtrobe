// IMPROVED: src/services/garmentClassifier.js
// ============================================

class GarmentClassifierService {
  constructor() {
    this.categories = ['tshirt', 'dress', 'pants', 'skirt', 'shorts', 'shirt'];
  }

  async classify(imageElement) {
    const aspectRatio = imageElement.width / imageElement.height;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    ctx.drawImage(imageElement, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Get color distribution
    const avgBrightness = this.getAverageBrightness(imageData);
    const colorfulness = this.getColorfulness(imageData);
    
    // Analyze vertical distribution (where is most content?)
    const verticalDist = this.getVerticalDistribution(imageData);
    
    console.log('📊 Classification metrics:', {
      aspectRatio: aspectRatio.toFixed(2),
      avgBrightness: avgBrightness.toFixed(0),
      colorfulness: colorfulness.toFixed(2),
      topHeavy: verticalDist.topHeavy,
      centerHeavy: verticalDist.centerHeavy
    });
    
    // IMPROVED CLASSIFICATION LOGIC
    
    // Very tall and narrow = dress or long skirt
    if (aspectRatio < 0.5) {
      if (verticalDist.topHeavy) {
        return { type: 'dress', confidence: 0.80 };
      } else {
        return { type: 'skirt', confidence: 0.70 };
      }
    }
    
    // Very wide = pants or shorts
    if (aspectRatio > 1.5) {
      // Analyze height - shorts are shorter
      if (imageElement.height < imageElement.width * 0.5) {
        return { type: 'shorts', confidence: 0.75 };
      } else {
        return { type: 'pants', confidence: 0.80 };
      }
    }
    
    // Medium/square aspect ratio = tops
    if (aspectRatio >= 0.7 && aspectRatio <= 1.3) {
      // Check if it has sleeves (content on sides)
      const hasSleeves = this.detectSleeves(imageData);
      
      if (hasSleeves && colorfulness < 50) {
        // Button-up shirts tend to be less colorful
        return { type: 'shirt', confidence: 0.70 };
      } else {
        // Most tops are t-shirts
        return { type: 'tshirt', confidence: 0.75 };
      }
    }
    
    // Tall but not too tall = top or skirt
    if (aspectRatio < 0.7) {
      if (verticalDist.topHeavy) {
        return { type: 'tshirt', confidence: 0.65 };
      } else {
        return { type: 'skirt', confidence: 0.65 };
      }
    }
    
    // Default fallback
    return { type: 'tshirt', confidence: 0.50 };
  }

  getAverageBrightness(imageData) {
    let sum = 0;
    let count = 0;
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const a = imageData.data[i + 3];
      if (a > 50) { // Only count non-transparent pixels
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        sum += (r + g + b) / 3;
        count++;
      }
    }
    
    return count > 0 ? sum / count : 128;
  }

  getColorfulness(imageData) {
    let variance = 0;
    let count = 0;
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const a = imageData.data[i + 3];
      if (a > 50) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        
        const rg = r - g;
        const yb = 0.5 * (r + g) - b;
        
        variance += rg * rg + yb * yb;
        count++;
      }
    }
    
    return count > 0 ? Math.sqrt(variance / count) : 0;
  }

  getVerticalDistribution(imageData) {
    const height = Math.sqrt(imageData.data.length / 4);
    const width = height;
    
    let topSum = 0, centerSum = 0, bottomSum = 0;
    let topCount = 0, centerCount = 0, bottomCount = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const a = imageData.data[idx + 3];
        
        if (a > 50) {
          const brightness = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
          
          if (y < height / 3) {
            topSum += brightness;
            topCount++;
          } else if (y < height * 2 / 3) {
            centerSum += brightness;
            centerCount++;
          } else {
            bottomSum += brightness;
            bottomCount++;
          }
        }
      }
    }
    
    const topAvg = topCount > 0 ? topSum / topCount : 0;
    const centerAvg = centerCount > 0 ? centerSum / centerCount : 0;
    const bottomAvg = bottomCount > 0 ? bottomSum / bottomCount : 0;
    
    return {
      topHeavy: topAvg > centerAvg && topAvg > bottomAvg,
      centerHeavy: centerAvg > topAvg && centerAvg > bottomAvg,
      bottomHeavy: bottomAvg > topAvg && bottomAvg > centerAvg
    };
  }

  detectSleeves(imageData) {
    // Simple sleeve detection: check if there's content on left/right edges
    const width = Math.sqrt(imageData.data.length / 4);
    const height = width;
    
    let leftEdgeContent = 0;
    let rightEdgeContent = 0;
    
    for (let y = Math.floor(height * 0.2); y < Math.floor(height * 0.6); y++) {
      // Left edge
      for (let x = 0; x < Math.floor(width * 0.15); x++) {
        const idx = (y * width + x) * 4;
        if (imageData.data[idx + 3] > 50) {
          leftEdgeContent++;
        }
      }
      
      // Right edge
      for (let x = Math.floor(width * 0.85); x < width; x++) {
        const idx = (y * width + x) * 4;
        if (imageData.data[idx + 3] > 50) {
          rightEdgeContent++;
        }
      }
    }
    
    return leftEdgeContent > 50 && rightEdgeContent > 50;
  }
}

export default new GarmentClassifierService();
