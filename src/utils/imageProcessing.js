import { removeBackground } from '@imgly/background-removal';

export const loadImage = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = 'anonymous';
    img.src = URL.createObjectURL(file);
  });
};

export const removeImageBackground = async (imageFile) => {
  try {
    console.log(' Removing background...');
    const blob = await removeBackground(imageFile);
    const url = URL.createObjectURL(blob);
    console.log(' Background removed');
    return url;
  } catch (error) {
    console.error(' Background removal failed:', error);
    // Fallback: return original image
    return URL.createObjectURL(imageFile);
  }
};

export const applyDepthDisplacement = (mesh, depthMap, depthService) => {
  const geometry = mesh.geometry;
  
  if (!geometry.attributes.position || !geometry.attributes.uv || !geometry.attributes.normal) {
    console.warn(' Geometry missing required attributes');
    return;
  }
  
  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;
  const normals = geometry.attributes.normal;
  
  const displacementScale = 0.05; // Adjust for more/less depth effect
  
  for (let i = 0; i < positions.count; i++) {
    const u = uvs.getX(i);
    const v = uvs.getY(i);
    
    // Sample depth at this UV coordinate
    const depth = depthService.sampleDepthMap(depthMap, u, v);
    
    // Calculate displacement (center around 0.5)
    const displacement = (depth - 0.5) * displacementScale;
    
    // Move vertex along its normal
    const nx = normals.getX(i);
    const ny = normals.getY(i);
    const nz = normals.getZ(i);
    
    const x = positions.getX(i) + nx * displacement;
    const y = positions.getY(i) + ny * displacement;
    const z = positions.getZ(i) + nz * displacement;
    
    positions.setXYZ(i, x, y, z);
  }
  
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
};