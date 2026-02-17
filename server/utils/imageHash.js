// server/utils/imageHash.js
// Utility for generating cache keys from images

const crypto = require('crypto');
const fs = require('fs').promises;

/**
 * Generate SHA-256 hash from image file and options
 * @param {string} imagePath - Path to image file
 * @param {object} options - Generation options that affect output
 * @returns {Promise<string>} Hash string
 */
async function generateCacheKey(imagePath, options = {}) {
  try {
    // Read image file
    const imageBuffer = await fs.readFile(imagePath);
    
    // Normalize options (only include options that affect output)
    const normalizedOptions = {
      garment_type: options.garment_type || 'unknown'
    };

    // Create hash
    const hash = crypto.createHash('sha256');
    hash.update(imageBuffer);
    hash.update(JSON.stringify(normalizedOptions));
    
    return hash.digest('hex');
  } catch (error) {
    throw new Error(`Failed to generate cache key: ${error.message}`);
  }
}

/**
 * Generate quick hash from buffer (for multi-image)
 */
function quickHash(buffer) {
  return crypto
    .createHash('md5')
    .update(buffer)
    .digest('hex')
    .substring(0, 16);
}

module.exports = {
  generateCacheKey,
  quickHash
};