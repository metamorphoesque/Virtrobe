// UPDATED: src/services/templateMatcher.js
// Added tank top template matching
// ============================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

class TemplateMatcher {
  constructor() {
    this.loader = new GLTFLoader();
    this.templateCache = {};
  }
  
  async loadTemplate(garmentType, gender = 'female') {
    const key = `${gender}_${garmentType}`;
    
    // Check cache
    if (this.templateCache[key]) {
      console.log(`✅ Using cached template: ${key}`);
      return this.templateCache[key].clone();
    }
    
    // Try to load template
    const templatePath = `/models/garments/${key}.glb`;
    
    try {
      console.log(`📁 Loading template: ${templatePath}`);
      const gltf = await this.loadGLTF(templatePath);
      
      // Find the mesh with morph targets
      let templateMesh = null;
      gltf.scene.traverse((child) => {
        if (child.isMesh && child.morphTargetDictionary) {
          templateMesh = child;
        }
      });
      
      if (!templateMesh) {
        // No morph targets, just use first mesh
        templateMesh = gltf.scene.children[0];
      }
      
      // Cache it
      this.templateCache[key] = templateMesh;
      
      console.log(`✅ Template loaded: ${key}`);
      return templateMesh.clone();
      
    } catch (error) {
      console.warn(`⚠️ Template not found: ${templatePath}`);
      
      // FALLBACK STRATEGY
      // If tank top not found, try t-shirt and we'll modify it
      if (garmentType === 'tanktop') {
        console.log('🔄 Falling back to t-shirt template for tank top');
        return this.loadTemplate('tshirt', gender);
      }
      
      return null;
    }
  }
  
  loadGLTF(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject);
    });
  }
  
  /**
   * Match uploaded garment to best template
   * Returns template mesh or null
   */
  async matchTemplate(classification, gender) {
    const { type, confidence } = classification;
    
    console.log(`🎯 Matching template for: ${type} (${gender}, confidence: ${(confidence * 100).toFixed(0)}%)`);
    
    // High confidence = use specific template
    if (confidence > 0.7) {
      const template = await this.loadTemplate(type, gender);
      if (template) {
        console.log(`✅ Using ${type} template`);
        return template;
      }
    }
    
    // Medium confidence = try generic fallback
    if (confidence > 0.5) {
      // Try specific type first
      let template = await this.loadTemplate(type, gender);
      if (template) return template;
      
      // Fallback hierarchy
      const fallbacks = {
        'tanktop': 'tshirt', // Tank top falls back to t-shirt
        'shirt': 'tshirt',
        'tshirt': null,
        'dress': 'tshirt',
        'pants': null,
        'skirt': 'dress',
        'shorts': 'pants'
      };
      
      const fallbackType = fallbacks[type];
      if (fallbackType) {
        console.log(`🔄 Trying fallback: ${fallbackType}`);
        template = await this.loadTemplate(fallbackType, gender);
        if (template) {
          console.log(`✅ Using fallback ${fallbackType} template`);
          return template;
        }
      }
    }
    
    // Low confidence or no template = no template (use pure depth)
    console.log('❌ No suitable template found');
    return null;
  }
}

export default new TemplateMatcher();