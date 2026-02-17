// server/services/tripoService.js
// 3D mesh generation using Tripo3D API
// FREE tier: 300 credits/month (~300 generations)
// Get your free API key: https://platform.tripo3d.ai

const axios = require('axios');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const FormData = require('form-data');

class TripoService {
  constructor() {
    this.apiKey = process.env.TRIPO_API_KEY;
    this.baseURL = 'https://api.tripo3d.ai/v2/openapi';
    this.modelsDir = path.join(__dirname, '../generatedModels');
    this.pollInterval = 3000;
    this.maxWaitTime = 180000;
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fsSync.existsSync(this.modelsDir)) {
      fsSync.mkdirSync(this.modelsDir, { recursive: true });
    }
  }

  getHeaders() {
    if (!this.apiKey) {
      throw new Error('TRIPO_API_KEY not set. Get your free key at https://platform.tripo3d.ai');
    }
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  generateLocalId() {
    return `tripo_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  async uploadImage(imagePath) {
    const imageBuffer = await fs.readFile(imagePath);
    const filename = path.basename(imagePath);
    const form = new FormData();
    form.append('file', imageBuffer, { filename, contentType: 'image/jpeg' });

    const response = await axios.post(`${this.baseURL}/upload`, form, {
      headers: { 'Authorization': `Bearer ${this.apiKey}`, ...form.getHeaders() },
      timeout: 30000
    });

    if (response.data?.code !== 0) {
      throw new Error(`Upload failed: ${response.data?.message || 'Unknown error'}`);
    }

    const token = response.data?.data?.image_token;
    if (!token) throw new Error('No image token returned');
    console.log('📤 Image uploaded, token:', token);
    return token;
  }

  async createTask(imageToken) {
    const response = await axios.post(
      `${this.baseURL}/task`,
      { type: 'image_to_model', file: { type: 'jpg', file_token: imageToken } },
      { headers: this.getHeaders(), timeout: 30000 }
    );

    if (response.data?.code !== 0) {
      throw new Error(`Task creation failed: ${response.data?.message}`);
    }

    const taskId = response.data?.data?.task_id;
    if (!taskId) throw new Error('No task_id returned');
    console.log('🚀 Tripo task created:', taskId);
    return taskId;
  }

  async pollTask(taskId, onProgress) {
    const startTime = Date.now();

    while (Date.now() - startTime < this.maxWaitTime) {
      const response = await axios.get(`${this.baseURL}/task/${taskId}`, {
        headers: this.getHeaders(),
        timeout: 15000
      });

      if (response.data?.code !== 0) {
        throw new Error(`Poll failed: ${response.data?.message}`);
      }

      const task = response.data?.data;
      const status = task?.status;
      const progress = task?.progress || 0;

      console.log(`⏳ ${taskId}: ${status} (${progress}%)`);

      if (onProgress) {
        onProgress({
          progress: Math.min(15 + Math.floor(progress * 0.75), 89),
          status: status?.toUpperCase() || 'PROCESSING',
          message: `Generating 3D model... ${progress}%`
        });
      }

      if (status === 'success') {
        const glbUrl = task?.output?.model || task?.output?.pbr_model;
        if (!glbUrl) throw new Error('Task succeeded but no model URL in response');
        return glbUrl;
      }

      if (status === 'failed' || status === 'cancelled') {
        throw new Error(`Generation ${status}: ${task?.message || 'Unknown reason'}`);
      }

      await this.sleep(this.pollInterval);
    }

    throw new Error('Generation timed out after 3 minutes. Try again.');
  }

  async downloadModel(glbUrl) {
    const response = await axios.get(glbUrl, { responseType: 'arraybuffer', timeout: 60000 });
    const localId = this.generateLocalId();
    const filename = `${localId}.glb`;
    const modelPath = path.join(this.modelsDir, filename);
    await fs.writeFile(modelPath, response.data);
    console.log(`✅ Saved: ${filename}`);
    return { modelPath, modelUrl: `/models/${filename}`, taskId: localId };
  }

  async generateGarmentModel(imagePath, options = {}, onProgress = null) {
    try {
      if (onProgress) onProgress({ progress: 5, status: 'UPLOADING', message: 'Uploading image...' });
      const imageToken = await this.uploadImage(imagePath);

      if (onProgress) onProgress({ progress: 15, status: 'QUEUED', message: 'Starting generation...' });
      const tripoTaskId = await this.createTask(imageToken);

      const glbUrl = await this.pollTask(tripoTaskId, onProgress);

      if (onProgress) onProgress({ progress: 90, status: 'DOWNLOADING', message: 'Downloading model...' });
      const result = await this.downloadModel(glbUrl);

      if (onProgress) onProgress({ progress: 100, status: 'SUCCEEDED', message: 'Done!' });
      return result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async checkAvailability() {
    if (!this.apiKey) {
      return { available: false, status: 'no_key', message: 'Set TRIPO_API_KEY in .env' };
    }
    return { available: true, status: 'ready' };
  }

  async getRateLimitInfo() {
    return {
      hasKey: !!this.apiKey,
      limits: '300 free generations/month',
      recommendation: !this.apiKey ? 'Get free key at https://platform.tripo3d.ai' : 'Key configured ✅'
    };
  }

  sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  handleError(error) {
    if (error.response) {
      const s = error.response.status;
      const m = error.response.data?.message || error.message;
      if (s === 401) return new Error('Invalid TRIPO_API_KEY. Check your .env');
      if (s === 402) return new Error('Out of Tripo credits. Top up at platform.tripo3d.ai');
      if (s === 429) return new Error('Rate limit. Wait a moment and retry.');
      return new Error(`Tripo API error (${s}): ${m}`);
    }
    return error;
  }
}

module.exports = new TripoService();