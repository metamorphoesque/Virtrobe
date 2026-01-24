import * as bodyPix from '@tensorflow-models/body-pix';
import * as tf from '@tensorflow/tfjs';

export class GarmentSegmenter {
  constructor() {
    this.model = null;
  }

  async initialize() {
    if (!this.model) {
      console.log('🔧 Loading BodyPix for garment segmentation...');
      this.model = await bodyPix.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2
      });
    }
  }

  /**
   * Segment garment from image
   * Returns clean garment with alpha channel
   */
  async segmentGarment(imageElement) {
    await this.initialize();

    console.log('✂️ Segmenting garment...');

    // Get person segmentation
    const segmentation = await this.model.segmentPerson(imageElement, {
      flipHorizontal: false,
      internalResolution: 'medium',
      segmentationThreshold: 0.7
    });

    // Create canvas with alpha
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(imageElement, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Apply segmentation mask
    const mask = segmentation.data;
    for (let i = 0; i < mask.length; i++) {
      const pixelIndex = i * 4;
      // If not person (0), make transparent
      if (mask[i] === 0) {
        pixels[pixelIndex + 3] = 0; // Alpha = 0
      }
    }

    ctx.putImageData(imageData, 0, 0);

    return {
      canvas,
      mask: segmentation.data,
      bounds: this.getBoundingBox(segmentation.data, canvas.width, canvas.height)
    };
  }

  /**
   * Get tight bounding box around segmented garment
   */
  getBoundingBox(mask, width, height) {
    let minX = width, minY = height, maxX = 0, maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (mask[idx] !== 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }

  /**
   * Detect garment type from silhouette
   */
  classifyGarmentType(bounds, imageHeight) {
    const aspectRatio = bounds.height / bounds.width;
    const coverageRatio = bounds.height / imageHeight;

    if (coverageRatio > 0.7 && aspectRatio > 1.5) {
      return 'dress_maxi';
    } else if (coverageRatio > 0.5 && aspectRatio > 1.2) {
      return 'dress_midi';
    } else if (aspectRatio < 0.8) {
      return 'top';
    } else if (coverageRatio < 0.4) {
      return 'crop_top';
    } else {
      return 'top';
    }
  }
}