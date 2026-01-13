// 3. src/services/templateMatcher.js (NEW)
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
      console.log(` Using cached template: ${key}`);
      return this.templateCache[key].clone();
    }
    
    // Try to load template
    const templatePath = `/models/garments/${key}.glb`;
    
    try {
      console.log(` Loading template: ${templatePath}`);
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
      
      console.log(`Template loaded: ${key}`);
      return templateMesh.clone();
      
    } catch (error) {
      console.warn(` Template not found: ${templatePath}`);
      return null;
    }
  }
  
  loadGLTF(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject);
    });
  }
  
  // Match uploaded garment to best template
  matchTemplate(classification, gender) {
    const { type, confidence } = classification;
    
    // High confidence = use specific template
    if (confidence > 0.7) {
      return this.loadTemplate(type, gender);
    }
    
    // Medium confidence = use generic template
    if (confidence > 0.5) {
      // Fall back to t-shirt (most versatile)
      return this.loadTemplate('tshirt', gender);
    }
    
    // Low confidence = no template
    return null;
  }
}

export default new TemplateMatcher();

