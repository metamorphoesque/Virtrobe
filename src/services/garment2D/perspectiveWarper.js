// src/services/garment2D/perspectiveWarper.js
// ============================================
// PERSPECTIVE WARPING TO MANNEQUIN SHAPE
// Uses WebGL for high-quality image warping
// ============================================

class PerspectiveWarper {
  constructor() {
    this.canvas = null;
    this.gl = null;
  }

  /**
   * Warp garment image to fit mannequin proportions
   */
  async warp(garmentCanvas, measurements) {
    console.log('🔄 Warping garment to mannequin shape...');
    
    // Create WebGL context
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 1024;
    this.gl = this.canvas.getContext('webgl', { 
      premultipliedAlpha: false,
      alpha: true 
    });

    if (!this.gl) {
      console.warn('⚠️ WebGL not available, using fallback');
      return this.warpFallback(garmentCanvas, measurements);
    }

    const gl = this.gl;

    // Calculate warp parameters from measurements
    const warpParams = this.calculateWarpParameters(measurements);
    console.log('   Warp parameters:', warpParams);

    // Create texture from garment
    const texture = this.createTexture(garmentCanvas);

    // Create shader program
    const program = this.createWarpShader();
    gl.useProgram(program);

    // Set up geometry (full-screen quad)
    this.setupQuad(program);

    // Set uniforms
    gl.uniform1i(gl.getUniformLocation(program, 'uTexture'), 0);
    gl.uniform1f(gl.getUniformLocation(program, 'uChestWidth'), warpParams.chestWidth);
    gl.uniform1f(gl.getUniformLocation(program, 'uWaistWidth'), warpParams.waistWidth);
    gl.uniform1f(gl.getUniformLocation(program, 'uShoulderWidth'), warpParams.shoulderWidth);
    gl.uniform1f(gl.getUniformLocation(program, 'uTorsoHeight'), warpParams.torsoHeight);

    // Render
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    console.log('✅ Garment warped');
    return this.canvas;
  }

  /**
   * Calculate warp parameters from body measurements
   */
  calculateWarpParameters(measurements) {
    const {
      chest_cm = 90,
      waist_cm = 75,
      shoulders_cm = 40,
      torso_length_cm = 50
    } = measurements;

    // Normalize to 0-1 range (relative to average)
    return {
      chestWidth: chest_cm / 100,
      waistWidth: waist_cm / 100,
      shoulderWidth: shoulders_cm / 100,
      torsoHeight: torso_length_cm / 100
    };
  }

  /**
   * Create WebGL warp shader
   */
  createWarpShader() {
    const gl = this.gl;

    const vertexShaderSource = `
      attribute vec2 aPosition;
      varying vec2 vUv;
      
      void main() {
        vUv = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      varying vec2 vUv;
      
      uniform sampler2D uTexture;
      uniform float uChestWidth;
      uniform float uWaistWidth;
      uniform float uShoulderWidth;
      uniform float uTorsoHeight;
      
      vec2 warpUV(vec2 uv) {
        vec2 warped = uv;
        
        // Vertical position (0 = bottom, 1 = top)
        float v = uv.y;
        
        // Horizontal position from center (-0.5 to 0.5)
        float u = uv.x - 0.5;
        
        // Calculate width at this height
        // Bottom (waist) to top (shoulders)
        float widthFactor = mix(uWaistWidth, uChestWidth, smoothstep(0.0, 0.5, v));
        widthFactor = mix(widthFactor, uShoulderWidth, smoothstep(0.5, 1.0, v));
        
        // Apply horizontal scaling
        warped.x = u * widthFactor + 0.5;
        
        // Apply vertical scaling based on torso height
        warped.y = v * uTorsoHeight;
        
        // Barrel distortion for 3D effect
        float dist = length(vec2(u, v - 0.5));
        float barrelStrength = 0.15;
        warped += normalize(vec2(u, v - 0.5)) * dist * dist * barrelStrength;
        
        return warped;
      }
      
      void main() {
        vec2 warpedUV = warpUV(vUv);
        
        // Sample texture with warped coordinates
        if (warpedUV.x < 0.0 || warpedUV.x > 1.0 || 
            warpedUV.y < 0.0 || warpedUV.y > 1.0) {
          gl_FragColor = vec4(0.0);
        } else {
          gl_FragColor = texture2D(uTexture, warpedUV);
        }
      }
    `;

    // Compile shaders
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    // Link program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader program failed to link:', gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  }

  /**
   * Compile shader
   */
  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }

  /**
   * Set up quad geometry
   */
  setupQuad(program) {
    const gl = this.gl;
    
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
  }

  /**
   * Create WebGL texture
   */
  createTexture(canvas) {
    const gl = this.gl;
    const texture = gl.createTexture();
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    return texture;
  }

  /**
   * Fallback warping using canvas 2D (if WebGL unavailable)
   */
  warpFallback(garmentCanvas, measurements) {
    console.log('⚠️ Using canvas 2D fallback warp');
    
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Simple scaling based on measurements
    const params = this.calculateWarpParameters(measurements);
    
    ctx.save();
    ctx.scale(params.chestWidth, params.torsoHeight);
    ctx.drawImage(garmentCanvas, 0, 0, canvas.width / params.chestWidth, canvas.height / params.torsoHeight);
    ctx.restore();

    return canvas;
  }
}

export default new PerspectiveWarper(); 