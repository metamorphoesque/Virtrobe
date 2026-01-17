// src/services/onnxInference.js
// ============================================
// ONNX Runtime wrapper for TripoSR model inference
// ============================================

import * as ort from 'onnxruntime-web';

export class ONNXInference {
  constructor() {
    this.session = null;
    this.isInitialized = false;
    this.modelPath = '/models/triposr_quantized.onnx';
  }

  /**
   * Initialize ONNX session with model
   * Call once at app startup or lazy load on first use
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚡ ONNX session already initialized');
      return;
    }

    console.log('🔧 Initializing TripoSR ONNX model...');
    
    try {
      // Configure ONNX Runtime for WebGL backend (fastest in browser)
      ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
      ort.env.wasm.simd = true;
      
      // Set execution providers (WebGL > WebAssembly > CPU)
      const options = {
        executionProviders: ['webgl', 'wasm', 'cpu'],
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true,
        enableMemPattern: true,
      };

      // Load the model
      this.session = await ort.InferenceSession.create(
        this.modelPath, 
        options
      );

      this.isInitialized = true;
      console.log('✅ TripoSR model loaded successfully');
      console.log('   Input names:', this.session.inputNames);
      console.log('   Output names:', this.session.outputNames);
      
    } catch (error) {
      console.error('❌ Failed to load TripoSR model:', error);
      throw new Error(`Model initialization failed: ${error.message}`);
    }
  }

  /**
   * Run inference on preprocessed image tensor
   * @param {Float32Array} imageData - Preprocessed image tensor [1, 3, 256, 256]
   * @returns {Promise<Object>} - Raw model outputs
   */
  async runInference(imageData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('🧠 Running TripoSR inference...');
    const startTime = performance.now();

    try {
      // Create input tensor
      // TripoSR expects: [batch, channels, height, width] = [1, 3, 256, 256]
      const dims = [1, 3, 256, 256];
      const inputTensor = new ort.Tensor('float32', imageData, dims);

      // Prepare feeds (input name from model)
      const feeds = {
        [this.session.inputNames[0]]: inputTensor
      };

      // Run inference
      const results = await this.session.run(feeds);

      const inferenceTime = performance.now() - startTime;
      console.log(`✅ Inference complete in ${inferenceTime.toFixed(2)}ms`);

      // Extract outputs
      // TripoSR typically outputs:
      // - vertices: [N, 3] - 3D vertex positions
      // - faces: [M, 3] - Triangle face indices
      // - normals: [N, 3] - Vertex normals (optional)
      
      const outputs = {};
      this.session.outputNames.forEach(name => {
        outputs[name] = results[name];
      });

      return outputs;

    } catch (error) {
      console.error('❌ Inference failed:', error);
      throw new Error(`Inference error: ${error.message}`);
    }
  }

  /**
   * Extract mesh data from ONNX outputs
   * @param {Object} outputs - Raw ONNX outputs
   * @returns {Object} - Structured mesh data
   */
  extractMeshData(outputs) {
    console.log('📦 Extracting mesh data from outputs...');

    // Get vertices tensor (typically first output)
    const verticesTensor = outputs[this.session.outputNames[0]];
    const vertices = Array.from(verticesTensor.data);
    
    // Get faces tensor (typically second output)
    const facesTensor = outputs[this.session.outputNames[1]];
    const faces = Array.from(facesTensor.data);

    // Optional: normals (if provided by model)
    let normals = null;
    if (this.session.outputNames.length > 2) {
      const normalsTensor = outputs[this.session.outputNames[2]];
      normals = Array.from(normalsTensor.data);
    }

    const meshData = {
      vertices: {
        data: new Float32Array(vertices),
        count: vertices.length / 3,
        shape: [vertices.length / 3, 3]
      },
      faces: {
        data: new Uint32Array(faces),
        count: faces.length / 3,
        shape: [faces.length / 3, 3]
      },
      normals: normals ? {
        data: new Float32Array(normals),
        count: normals.length / 3,
        shape: [normals.length / 3, 3]
      } : null
    };

    console.log(`✅ Extracted mesh: ${meshData.vertices.count} vertices, ${meshData.faces.count} faces`);
    
    return meshData;
  }

  /**
   * Get model metadata and capabilities
   */
  getModelInfo() {
    if (!this.isInitialized) {
      return null;
    }

    return {
      inputNames: this.session.inputNames,
      outputNames: this.session.outputNames,
      initialized: this.isInitialized,
      executionProviders: ort.env.wasm.numThreads
    };
  }

  /**
   * Clean up resources
   */
  async dispose() {
    if (this.session) {
      await this.session.release();
      this.session = null;
      this.isInitialized = false;
      console.log('🧹 ONNX session disposed');
    }
  }
}

// Singleton instance
export const onnxInference = new ONNXInference();