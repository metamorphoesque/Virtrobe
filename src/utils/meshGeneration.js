import * as THREE from 'three';
import Delaunator from 'delaunator';

// Generate 3D mesh from depth map (fallback if no template available)
export const generateMeshFromDepth = (depthMap, colorImageUrl) => {
  const width = depthMap[0].length;
  const height = depthMap.length;
  
  // Create point cloud from depth map
  const points = [];
  const uvs = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const depth = depthMap[y][x];
      
      // Skip points with no depth (background)
      if (depth > 0.1) {
        // Normalize coordinates
        const nx = (x / width) - 0.5;
        const ny = 0.5 - (y / height);
        const nz = (depth - 0.5) * 0.3; // Scale depth
        
        points.push(nx, ny, nz);
        uvs.push(x / width, 1 - (y / height));
      }
    }
  }
  
  // Create 2D projection for Delaunay triangulation
  const points2D = [];
  for (let i = 0; i < points.length; i += 3) {
    points2D.push(points[i], points[i + 1]);
  }
  
  // Perform Delaunay triangulation
  const delaunay = Delaunator.from(points2D.map((_, i, arr) => 
    i % 2 === 0 ? [arr[i], arr[i + 1]] : null
  ).filter(Boolean));
  
  // Create geometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(Array.from(delaunay.triangles));
  geometry.computeVertexNormals();
  
  // Load texture
  const texture = new THREE.TextureLoader().load(colorImageUrl);
  
  // Create material
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true,
    roughness: 0.8,
    metalness: 0.1
  });
  
  return new THREE.Mesh(geometry, material);
};