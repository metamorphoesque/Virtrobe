class GarmentClassifierService {
  constructor() {
    this.categories = ['tshirt', 'dress', 'pants', 'skirt', 'shorts'];
  }

  // Simple heuristic-based classification
  async classify(imageElement) {
    const aspectRatio = imageElement.width / imageElement.height;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    ctx.drawImage(imageElement, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Analyze aspect ratio and color distribution
    if (aspectRatio < 0.6) {
      // Very tall = dress
      return { type: 'dress', confidence: 0.75 };
    } else if (aspectRatio > 1.4) {
      // Very wide = pants/shorts
      const avgBrightness = this.getAverageBrightness(imageData);
      return avgBrightness > 128 
        ? { type: 'shorts', confidence: 0.65 }
        : { type: 'pants', confidence: 0.70 };
    } else if (aspectRatio > 0.8 && aspectRatio < 1.2) {
      // Square-ish = t-shirt
      return { type: 'tshirt', confidence: 0.80 };
    } else {
      // Medium tall = skirt
      return { type: 'skirt', confidence: 0.60 };
    }
  }

  getAverageBrightness(imageData) {
    let sum = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      sum += (r + g + b) / 3;
    }
    return sum / (imageData.data.length / 4);
  }
}

export default new GarmentClassifierService();