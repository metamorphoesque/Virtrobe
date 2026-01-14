// OPTIMIZED: src/utils/imageProcessing.js
// ============================================

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
    console.log('   File size:', (file.size / 1024).toFixed(0), 'KB');
    
    // IMPORTANT: Resize large images before background removal
    const resizedFile = await resizeImageFile(file, 512); // Max 512px
    
    console.log('   Resized to:', (resizedFile.size / 1024).toFixed(0), 'KB');
    
    // Use @imgly/background-removal with optimized settings
    const blob = await removeBackground(resizedFile, {
      output: { 
        format: 'image/png', 
        quality: 0.8,  // Reduced from 0.9
        type: 'foreground' 
      },
      model: 'small', // Use smaller model for speed
      progress: (key, current, total) => {
        console.log(`   Progress: ${key} ${current}/${total}`);
      }
    });
    
    // Convert blob to URL
    const url = URL.createObjectURL(blob);
    console.log('✅ Background removed successfully');
    return url;
    
  } catch (error) {
    console.error('❌ Background removal failed:', error);
    console.warn('⚠️ Using original image without background removal');
    
    // Fallback: return original image
    return URL.createObjectURL(file);
  }
}

// Resize image file before processing
async function resizeImageFile(file, maxSize) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.onload = () => {
        // Check if resize needed
        if (img.width <= maxSize && img.height <= maxSize) {
          resolve(file); // No resize needed
          return;
        }
        
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        
        // Resize using canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert back to blob
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/png' }));
        }, 'image/png', 0.9);
      };
      
      img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
  });
}

export function applyDepthDisplacement(mesh, depthMap, depthEstimator) {
  if (!mesh.geometry) return;
  
  const geometry = mesh.geometry;
  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;
  
  if (!uvs) {
    console.warn('⚠️ Mesh has no UV coordinates, skipping displacement');
    return;
  }
  
  console.log('📐 Applying depth displacement...');
  
  // Apply depth-based displacement to vertices
  for (let i = 0; i < positions.count; i++) {
    const u = uvs.getX(i);
    const v = uvs.getY(i);
    
    // Sample depth at this UV coordinate
    const depth = depthEstimator.sampleDepthMap(depthMap, u, v);
    
    // Get vertex position
    const vx = positions.getX(i);
    const vy = positions.getY(i);
    const vz = positions.getZ(i);
    
    // Get normal (simplified - assumes normals exist)
    const normal = geometry.attributes.normal;
    const nx = normal ? normal.getX(i) : 0;
    const ny = normal ? normal.getY(i) : 0;
    const nz = normal ? normal.getZ(i) : 1;
    
    // Displace along normal based on depth
    const displacementScale = 0.03; // Subtle effect
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
  
  console.log('✅ Depth displacement applied');
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

// ============================================
// DEVELOPMENT MODE: Skip Background Removal
// ============================================

// Add this flag to skip background removal during dev
const DEV_MODE = true; // Set to false in production

export async function removeImageBackgroundDev(file) {
  if (DEV_MODE) {
    console.log('🚀 DEV MODE: Skipping background removal');
    return URL.createObjectURL(file);
  }
  
  return removeImageBackground(file);
}