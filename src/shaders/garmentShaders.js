
// src/shaders/garmentShaders.js
// ============================================
// WEBGL SHADERS FOR 2.5D GARMENT WARPING
// Vertex shader: Warps garment to mannequin shape
// Fragment shader: Applies depth shading via normal map
// ============================================

export const garmentVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vDepth;
  
  uniform sampler2D depthMap;
  uniform float depthIntensity;
  uniform vec3 mannequinScale;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Sample depth from depth map
    vec4 depthSample = texture2D(depthMap, uv);
    float depth = depthSample.r;
    
    // Apply depth displacement
    vec3 newPosition = position;
    
    // Warp based on depth - push forward in Z
    newPosition.z += depth * depthIntensity;
    
    // Apply curvature based on mannequin shape
    // Chest area bulges out (middle Y, middle X)
    float chestFactor = smoothstep(0.3, 0.7, uv.y) * smoothstep(0.3, 0.7, uv.x) * smoothstep(0.7, 0.3, uv.x);
    newPosition.z += chestFactor * 0.15 * mannequinScale.z;
    
    // Shoulder curvature (top corners)
    float shoulderFactor = smoothstep(0.7, 1.0, uv.y) * 
                          (smoothstep(0.0, 0.3, uv.x) + smoothstep(0.7, 1.0, uv.x));
    newPosition.z += shoulderFactor * 0.08 * mannequinScale.z;
    
    // Waist taper (bottom)
    float waistFactor = smoothstep(0.0, 0.3, uv.y);
    newPosition.x *= 1.0 - waistFactor * 0.15;
    
    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
    vViewPosition = -mvPosition.xyz;
    vDepth = depth;
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const garmentFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vDepth;
  
  uniform sampler2D garmentTexture;
  uniform sampler2D normalMap;
  uniform float opacity;
  uniform vec3 lightPosition;
  uniform vec3 ambientColor;
  uniform float normalStrength;
  
  // Calculate normal mapping
  vec3 perturbNormal(vec3 normal, vec3 viewDir, vec2 uv) {
    vec3 normalSample = texture2D(normalMap, uv).xyz * 2.0 - 1.0;
    normalSample.xy *= normalStrength;
    
    vec3 q0 = dFdx(vViewPosition);
    vec3 q1 = dFdy(vViewPosition);
    vec2 st0 = dFdx(uv);
    vec2 st1 = dFdy(uv);
    
    vec3 T = normalize(q0 * st1.t - q1 * st0.t);
    vec3 B = -normalize(cross(normal, T));
    mat3 TBN = mat3(T, B, normal);
    
    return normalize(TBN * normalSample);
  }
  
  void main() {
    // Sample garment texture
    vec4 garmentColor = texture2D(garmentTexture, vUv);
    
    // Discard transparent pixels
    if (garmentColor.a < 0.1) discard;
    
    // Calculate lighting
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    // Apply normal mapping for depth illusion
    normal = perturbNormal(normal, viewDir, vUv);
    
    // Directional light (from front-top)
    vec3 lightDir = normalize(lightPosition - vViewPosition);
    float diffuse = max(dot(normal, lightDir), 0.0);
    
    // Ambient occlusion from depth
    float ao = 1.0 - (vDepth * 0.3);
    
    // Fresnel edge lighting
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
    
    // Specular highlight (subtle)
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0) * 0.3;
    
    // Combine lighting
    vec3 lighting = ambientColor + 
                   vec3(diffuse * 0.7) + 
                   vec3(fresnel * 0.2) +
                   vec3(spec);
    
    // Apply lighting to garment color
    vec3 finalColor = garmentColor.rgb * lighting * ao;
    
    // Slight edge darkening for depth
    float edgeDarken = smoothstep(0.0, 0.1, vUv.x) * 
                       smoothstep(1.0, 0.9, vUv.x) *
                       smoothstep(0.0, 0.1, vUv.y) * 
                       smoothstep(1.0, 0.9, vUv.y);
    finalColor *= mix(0.7, 1.0, edgeDarken);
    
    gl_FragColor = vec4(finalColor, garmentColor.a * opacity);
  }
`;

// Simple depth shader for creating normal map from grayscale depth
export const depthToNormalShader = `
  precision highp float;
  
  uniform sampler2D depthTexture;
  uniform vec2 resolution;
  uniform float strength;
  
  varying vec2 vUv;
  
  void main() {
    vec2 texel = 1.0 / resolution;
    
    // Sample neighboring depth values
    float center = texture2D(depthTexture, vUv).r;
    float left = texture2D(depthTexture, vUv + vec2(-texel.x, 0.0)).r;
    float right = texture2D(depthTexture, vUv + vec2(texel.x, 0.0)).r;
    float top = texture2D(depthTexture, vUv + vec2(0.0, texel.y)).r;
    float bottom = texture2D(depthTexture, vUv + vec2(0.0, -texel.y)).r;
    
    // Calculate gradients
    float dx = (right - left) * strength;
    float dy = (top - bottom) * strength;
    
    // Construct normal
    vec3 normal = normalize(vec3(dx, dy, 1.0));
    
    // Convert to [0, 1] range for storage
    normal = normal * 0.5 + 0.5;
    
    gl_FragColor = vec4(normal, 1.0);
  }
`;