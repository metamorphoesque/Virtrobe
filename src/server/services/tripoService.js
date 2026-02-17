// server/services/tripoService.js
// Free 3D mesh generation using Hugging Face TripoSR API

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const FormData = require('form-data');

class TripoService {
  constructor() {
    this.baseURL = 'https://api-inference.huggingface.co/models/stabilityai/TripoSR';
    this.apiToken = process.env.HUGGINGFACE_TOKEN; // Optional - works without token but with rate limits
    this.modelsDir = path.join(__dirname, '../../models');
    this.maxRetries = 3;
    this.retryDelay = 20000; // 20 seconds - model loading time
    
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.modelsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  /**
   * Get headers for Hugging Face API
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Token is optional - without it you get rate limits but it still works
    if (this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    }
    
    return headers;
  }

  /**
   * Convert image to base64
   */
  async imageToBase64(imagePath) {
    const imageBuffer = await fs.readFile(imagePath);
    return imageBuffer.toString('base64');
  }

  /**
   * Generate cache key from image
   */
  async generateCacheKey(imagePath, options = {}) {
    const imageBuffer = await fs.readFile(imagePath);
    const hash = crypto.createHash('sha256');
    hash.update(imageBuffer);
    hash.update(JSON.stringify(options));
    return hash.digest('hex');
  }

  /**
   * Create 3D mesh generation task
   * @param {string} imagePath - Path to uploaded image
   * @param {object} options - Generation options
   * @returns {Promise<object>} Generated mesh data
   */
  async createImageTo3DTask(imagePath, options = {}) {
    try {
      // Read image and convert to base64
      const imageBuffer = await fs.readFile(imagePath);
      
      // Hugging Face expects binary data
      const response = await axios.post(
        this.baseURL,
        imageBuffer,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
            ...(this.apiToken && { 'Authorization': `Bearer ${this.apiToken}` })
          },
          responseType: 'arraybuffer', // Important: expect binary GLB data
          timeout: 120000, // 2 minute timeout
          validateStatus: (status) => status < 500 // Accept 503 (model loading)
        }
      );

      // Handle model loading state
      if (response.status === 503) {
        const errorData = JSON.parse(response.data.toString());
        if (errorData.error && errorData.error.includes('loading')) {
          const estimatedTime = errorData.estimated_time || 20;
          return {
            status: 'LOADING',
            estimatedTime,
            message: `Model is loading. Estimated time: ${estimatedTime}s`
          };
        }
      }

      // Success - got GLB data
      return {
        status: 'SUCCEEDED',
        glbData: response.data,
        format: 'glb'
      };

    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate mesh with automatic retry for model loading
   * @param {string} imagePath - Path to image
   * @param {object} options - Generation options
   * @param {function} onProgress - Progress callback
   * @returns {Promise<object>} Generated model info
   */
  async generateGarmentModel(imagePath, options = {}, onProgress = null) {
    let attempt = 0;
    
    while (attempt < this.maxRetries) {
      try {
        if (onProgress) {
          onProgress({
            progress: attempt * 33,
            status: attempt === 0 ? 'STARTING' : 'RETRYING',
            attempt: attempt + 1,
            maxAttempts: this.maxRetries
          });
        }

        const result = await this.createImageTo3DTask(imagePath, options);

        // Model is loading - wait and retry
        if (result.status === 'LOADING') {
          attempt++;
          if (attempt >= this.maxRetries) {
            throw new Error('Model loading timeout. Please try again in a minute.');
          }

          const waitTime = result.estimatedTime * 1000;
          if (onProgress) {
            onProgress({
              progress: 50,
              status: 'MODEL_LOADING',
              message: `Model loading... waiting ${result.estimatedTime}s`,
              eta: result.estimatedTime
            });
          }

          await this.sleep(waitTime);
          continue;
        }

        // Success - save the GLB file
        if (result.status === 'SUCCEEDED') {
          if (onProgress) {
            onProgress({
              progress: 90,
              status: 'SAVING',
              message: 'Saving model...'
            });
          }

          // Generate unique task ID
          const taskId = this.generateTaskId();
          const modelFilename = `${taskId}.glb`;
          const modelPath = path.join(this.modelsDir, modelFilename);

          // Save GLB data
          await fs.writeFile(modelPath, result.glbData);

          if (onProgress) {
            onProgress({
              progress: 100,
              status: 'SUCCEEDED',
              message: 'Complete!'
            });
          }

          return {
            taskId,
            modelPath,
            modelUrl: `/models/${modelFilename}`,
            metadata: {
              createdAt: Date.now(),
              finishedAt: Date.now(),
              service: 'huggingface-triposr',
              free: true
            }
          };
        }

      } catch (error) {
        // If it's a rate limit or model loading issue, retry
        if (error.message.includes('loading') || error.message.includes('503')) {
          attempt++;
          if (attempt >= this.maxRetries) {
            throw new Error('Service temporarily unavailable. Please try again in a minute.');
          }
          await this.sleep(this.retryDelay);
          continue;
        }
        
        // Other errors - don't retry
        throw error;
      }
    }

    throw new Error('Max retries exceeded. Please try again later.');
  }

  /**
   * Generate unique task ID
   */
  generateTaskId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `triposr_${timestamp}_${random}`;
  }

  /**
   * Check service availability
   * This is useful to call before generating to avoid wasting time
   */
  async checkAvailability() {
    try {
      const response = await axios.get(this.baseURL, {
        headers: this.getHeaders(),
        timeout: 5000
      });
      return {
        available: true,
        status: 'ready'
      };
    } catch (error) {
      if (error.response?.status === 503) {
        const data = error.response.data;
        return {
          available: false,
          status: 'loading',
          estimatedTime: data.estimated_time || 20
        };
      }
      return {
        available: false,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get rate limit info (if using token)
   */
  async getRateLimitInfo() {
    if (!this.apiToken) {
      return {
        hasToken: false,
        limits: 'Without token: ~1 request per minute during peak times',
        recommendation: 'Add HUGGINGFACE_TOKEN to .env for better limits'
      };
    }

    return {
      hasToken: true,
      limits: 'With token: ~30 requests per minute',
      status: 'Rate limits are generous with token'
    };
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enhanced error handling
   */
  handleError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Try to parse error message
      let message = error.message;
      try {
        if (Buffer.isBuffer(data)) {
          const parsed = JSON.parse(data.toString());
          message = parsed.error || message;
        } else if (typeof data === 'object') {
          message = data.error || message;
        }
      } catch (e) {
        // Keep original message
      }

      switch (status) {
        case 400:
          return new Error(`Invalid image format. Use JPEG, PNG, or WebP.`);
        case 401:
          return new Error('Invalid Hugging Face token. Check your HUGGINGFACE_TOKEN in .env');
        case 429:
          return new Error('Rate limit exceeded. Wait a minute or add HUGGINGFACE_TOKEN to .env for higher limits.');
        case 503:
          if (message.includes('loading')) {
            return new Error('Model is loading. This usually takes 20-30 seconds. Please wait and try again.');
          }
          return new Error('Service temporarily unavailable. Try again in a minute.');
        default:
          return new Error(`Hugging Face API error (${status}): ${message}`);
      }
    }

    // Network or other errors
    if (error.code === 'ECONNREFUSED') {
      return new Error('Cannot connect to Hugging Face API. Check your internet connection.');
    }

    if (error.code === 'ETIMEDOUT') {
      return new Error('Request timeout. The service might be slow. Try again.');
    }

    return error;
  }
}

module.exports = new TripoService();