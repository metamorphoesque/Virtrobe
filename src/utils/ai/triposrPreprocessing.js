// src/utils/ai/triposrPreprocessing.js
// ============================================
// TripoSR-specific image preprocessing
// Converts garment images to model input format
// ============================================

const TRIPOSR_INPUT_SIZE = 256;
const MEAN = [0.485, 0.456, 0.406]; // ImageNet normalization
const STD = [0.229, 0.224, 0.225];

/**
 * Preprocess image for TripoSR
 * @param {File} imageFile - Original image file
 * @param {string} cleanImageUrl - URL of background-removed image (from your existing pipeline)
 * @returns {Promise<Float32Array>} - Preprocessed tensor [1, 3, 256, 256]
 */
export async function triposrPreprocess(imageFile, cleanImageUrl) {
  console.log('🎨 Preprocessing for TripoSR...');

  // Load the clean image (background already removed by your existing system)
  const image = await loadImageFromUrl(cleanImageUrl);

  // Resize to 256x256 with padding
  const resized = resizeWithPadding(image, TRIPOSR_INPUT_SIZE);

  // Convert to tensor
  const tensor = imageToTensor(resized);

  console.log('✅ Preprocessing complete:', tensor.length, 'values');

  return tensor;
}

/**
 * Load image from URL
 */
function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Resize image to target size with white padding
 */
function resizeWithPadding(image, targetSize) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = targetSize;
  canvas.height = targetSize;

  // Fill with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, targetSize, targetSize);

  // Calculate scaling to fit
  const scale = Math.min(
    targetSize / image.width,
    targetSize / image.height
  );

  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;

  // Center the image
  const x = (targetSize - scaledWidth) / 2;
  const y = (targetSize - scaledHeight) / 2;

  // Draw resized image
  ctx.drawImage(image, x, y, scaledWidth, scaledHeight);

  return canvas;
}

/**
 * Convert canvas to normalized tensor
 * Format: [1, 3, H, W] with ImageNet normalization
 */
function imageToTensor(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  const size = canvas.width * canvas.height;
  const tensorSize = size * 3;
  const tensor = new Float32Array(tensorSize);

  // Convert from [H, W, C] to [C, H, W] and normalize
  for (let i = 0; i < size; i++) {
    const pixelIdx = i * 4;

    // Normalize [0, 255] to [0, 1]
    const r = pixels[pixelIdx] / 255.0;
    const g = pixels[pixelIdx + 1] / 255.0;
    const b = pixels[pixelIdx + 2] / 255.0;

    // Apply ImageNet normalization
    tensor[i] = (r - MEAN[0]) / STD[0]; // R channel
    tensor[size + i] = (g - MEAN[1]) / STD[1]; // G channel
    tensor[size * 2 + i] = (b - MEAN[2]) / STD[2]; // B channel
  }

  return tensor;
}

/**
 * Validate image file
 */
export function validateImageFile(file) {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload JPG, PNG, or WebP.');
  }

  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 10MB.');
  }

  return true;
}