// 1. src/utils/imageProcessing.js
import * as tf from '@tensorflow/tfjs';
import { removeBackground } from '@imgly/background-removal';

export async function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function removeImageBackground(file) {
  try {
    console.log('🖼️ Removing background...');
    
    // Use @imgly/background-removal
    const blob = await removeBackground(file, {
      output: { format: 'image/png', quality: 0.9 }
    });
    
    // Convert blob to URL
    const url = URL.createObjectURL(blob);
    console.log(' Background removed');
    return url;
  } catch (error) {
    console.error(' Background removal failed:', error);
    // Fallback: return original image
    return URL.createObjectURL(file);
  }
}

export function applyDepthDisplacement(mesh, depthMap, depthEstimator) {
  if (!mesh.geometry) return;
  
  const geometry = mesh.geometry;
  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;
  
  if (!uvs) {
    console.warn(' Mesh has no UV coordinates, skipping displacement');
    return;
  }
  
  console.log(' Applying depth displacement...');
  
  // Apply depth-based displacement to vertices
  for (let i = 0; i < positions.count; i++) {
    const u = uvs.getX(i);
    const v = uvs.getY(i);
    
    // Sample depth at this UV coordinate
    const depth = depthEstimator.sampleDepthMap(depthMap, u, v);
    
    // Get vertex normal
    const vx = positions.getX(i);
    const vy = positions.getY(i);
    const vz = positions.getZ(i);
    
    // Get normal (simplified - assumes normals exist)
    const normal = geometry.attributes.normal;
    const nx = normal ? normal.getX(i) : 0;
    const ny = normal ? normal.getY(i) : 0;
    const nz = normal ? normal.getZ(i) : 1;
    
    // Displace along normal based on depth
    const displacementScale = 0.05; // Adjust for desired effect
    const displacement = (depth - 0.5) * displacementScale;
    
    positions.setXYZ(
      i,
      vx + nx * displacement,
      vy + ny * displacement,
      vz + nz * displacement
    );
  }
  
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  
  console.log('Depth displacement applied');
}

export function createCanvasTexture(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.src = imageUrl;
  });
}