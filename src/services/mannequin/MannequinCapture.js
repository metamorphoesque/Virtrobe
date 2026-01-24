import * as THREE from 'three';

export class MannequinCapture {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // Create render targets
    this.depthTarget = new THREE.WebGLRenderTarget(512, 512, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    });
    
    this.normalTarget = new THREE.WebGLRenderTarget(512, 512);
  }

  /**
   * Capture depth map from mannequin
   * Returns canvas with depth visualization
   */
  captureDepthMap() {
    // Create depth material
    const depthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking
    });

    // Store original materials
    const originalMaterials = new Map();
    this.scene.traverse(obj => {
      if (obj.isMesh && obj.name.includes('mannequin')) {
        originalMaterials.set(obj, obj.material);
        obj.material = depthMaterial;
      }
    });

    // Render to target
    this.renderer.setRenderTarget(this.depthTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);

    // Restore materials
    originalMaterials.forEach((material, obj) => {
      obj.material = material;
    });

    // Read pixels
    const buffer = new Uint8Array(512 * 512 * 4);
    this.renderer.readRenderTargetPixels(
      this.depthTarget, 0, 0, 512, 512, buffer
    );

    // Convert to canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(512, 512);
    imageData.data.set(buffer);
    ctx.putImageData(imageData, 0, 0);

    return canvas;
  }

  /**
   * Extract body landmarks (shoulder, waist, hips, etc.)
   * Returns 2D screen-space coordinates
   */
  extractLandmarks(measurements) {
    const landmarks = {};
    
    // Define landmark positions in 3D (relative to mannequin)
    const positions3D = {
      shoulderLeft: new THREE.Vector3(-0.2, 1.4, 0),
      shoulderRight: new THREE.Vector3(0.2, 1.4, 0),
      chestCenter: new THREE.Vector3(0, 1.2, 0.1),
      waistCenter: new THREE.Vector3(0, 0.9, 0.08),
      hipLeft: new THREE.Vector3(-0.15, 0.6, 0.05),
      hipRight: new THREE.Vector3(0.15, 0.6, 0.05),
      hemMini: new THREE.Vector3(0, 0.7, 0),
      hemMidi: new THREE.Vector3(0, 0.4, 0),
      hemMaxi: new THREE.Vector3(0, 0.1, 0)
    };

    // Project to screen space
    Object.entries(positions3D).forEach(([name, pos3D]) => {
      const projected = pos3D.clone().project(this.camera);
      
      // Convert to pixel coordinates (assuming viewport = render size)
      const widthHalf = 256;
      const heightHalf = 256;
      
      landmarks[name] = {
        x: (projected.x * widthHalf) + widthHalf,
        y: -(projected.y * heightHalf) + heightHalf,
        z: projected.z // depth for occlusion
      };
    });

    return landmarks;
  }

  /**
   * Get camera and lighting parameters
   */
  getCameraParams() {
    return {
      position: this.camera.position.toArray(),
      rotation: this.camera.rotation.toArray(),
      fov: this.camera.fov,
      aspect: this.camera.aspect,
      near: this.camera.near,
      far: this.camera.far
    };
  }

  getLightingParams() {
    const lights = [];
    
    this.scene.traverse(obj => {
      if (obj.isLight) {
        lights.push({
          type: obj.type,
          position: obj.position.toArray(),
          intensity: obj.intensity,
          color: obj.color.getHex()
        });
      }
    });

    return lights;
  }

  /**
   * Complete capture of all reference data
   */
  captureReference(measurements) {
    return {
      depthMap: this.captureDepthMap(),
      landmarks: this.extractLandmarks(measurements),
      camera: this.getCameraParams(),
      lighting: this.getLightingParams(),
      timestamp: Date.now()
    };
  }
}