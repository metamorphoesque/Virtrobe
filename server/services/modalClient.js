// server/services/modalClient.js
import axios from 'axios';
import FormData from 'form-data';
import config from '../config/index.js';

class ModalClient {
  constructor() {
    this.endpoint = config.modalEndpoint;
    this.apiKey = config.modalApiKey;
    this.timeout = config.modalTimeout;
  }

  /**
   * Convert image to 3D GLB model using Modal.com
   * @param {Buffer} imageBuffer - Image file buffer
   * @param {Object} options - Additional options (garmentType, measurements)
   * @returns {Promise<Buffer>} - GLB file as buffer
   */
  async imageToGLB(imageBuffer, options = {}) {
    try {
      console.log('🚀 Calling Modal.com API...');
      console.log('   Endpoint:', this.endpoint);
      console.log('   Image size:', imageBuffer.length, 'bytes');
      console.log('   Options:', options);

      // Prepare form data
      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename: 'garment.jpg',
        contentType: 'image/jpeg'
      });

      // Add metadata
      if (options.garmentType) {
        formData.append('garment_type', options.garmentType);
      }
      if (options.measurements) {
        formData.append('measurements', JSON.stringify(options.measurements));
      }

      // Make request
      const response = await axios.post(this.endpoint, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
        },
        responseType: 'arraybuffer', // Important: Get binary data
        timeout: this.timeout,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      console.log('✅ Modal API responded:', response.status);
      console.log('   GLB size:', response.data.length, 'bytes');

      return Buffer.from(response.data);

    } catch (error) {
      console.error('❌ Modal API error:', error.message);
      
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data?.toString());
      }

      const modalError = new Error(
        error.response?.data?.error || 
        error.message || 
        'Failed to generate 3D model'
      );
      modalError.isModalError = true;
      throw modalError;
    }
  }

  /**
   * Check if Modal service is available
   */
  async healthCheck() {
    try {
      // Simple ping to check if endpoint is reachable
      await axios.get(this.endpoint.replace(/\/[^/]+$/, '/health'), {
        timeout: 5000
      });
      return true;
    } catch (error) {
      console.warn('⚠️ Modal health check failed:', error.message);
      return false;
    }
  }
}

export default new ModalClient();