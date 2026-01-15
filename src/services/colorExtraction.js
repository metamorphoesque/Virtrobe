// src/services/colorExtraction.js (NEW)
// ============================================
class ColorExtractionService {
  // Extract dominant color from image
  extractDominantColor(imageElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Resize for performance
    const size = 100;
    canvas.width = size;
    canvas.height = size;
    
    ctx.drawImage(imageElement, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    
    // Count color occurrences
    const colorMap = {};
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];
      
      // Skip transparent pixels
      if (a < 50) continue;
      
      // Quantize colors to reduce variations
      const qr = Math.round(r / 10) * 10;
      const qg = Math.round(g / 10) * 10;
      const qb = Math.round(b / 10) * 10;
      
      const key = `${qr},${qg},${qb}`;
      colorMap[key] = (colorMap[key] || 0) + 1;
    }
    
    // Find most common color
    let maxCount = 0;
    let dominantColor = '0,0,0';
    
    for (const [color, count] of Object.entries(colorMap)) {
      if (count > maxCount) {
        maxCount = count;
        dominantColor = color;
      }
    }
    
    // Convert to hex
    const [r, g, b] = dominantColor.split(',').map(Number);
    const hex = '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    
    console.log('🎨 Dominant color:', hex);
    
    return hex;
  }
  
  // Extract color palette
  extractPalette(imageElement, numColors = 5) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const size = 100;
    canvas.width = size;
    canvas.height = size;
    
    ctx.drawImage(imageElement, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    
    // Simple k-means clustering would go here
    // For now, return dominant color as single-item palette
    const dominant = this.extractDominantColor(imageElement);
    
    return [dominant];
  }
}

export default new ColorExtractionService();
