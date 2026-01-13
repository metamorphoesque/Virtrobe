// 2. src/utils/meshGeneration.js

import * as THREE from 'three';
import Delaunator from 'delaunator';

export function generateMeshFromDepth(depthMap, textureUrl) {
  console.log(' Generating mesh from depth map...');
  
  const width = depthMap[0].length;
  const height = depthMap.length;
  
  // Create point cloud
  const points = [];
  const uvs = [];
  
  // Sample every 2nd pixel for performance (adjust as needed)
  const step = 2;
  
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const depth = depthMap[y][x];
      
      // Convert to 3D coordinates
      const u = x / width;
      const v = 1 - (y / height); // Flip V
      
      // Create 3D position
      const px = (u - 0.5) * 2; // -1 to 1
      const py = (v - 0.5) * 2; // -1 to 1
      const pz = depth * 0.5;   // Depth
      
      points.push([px, py, pz]);
      uvs.push([u, v]);
    }
  }
  
  console.log(` Generated ${points.length} points`);
  
  // Project points to 2D for triangulation
  const points2D = points.map(p => [p[0], p[1]]);
  
  // Delaunay triangulation
  const delaunay = Delaunator.from(points2D);
  const triangles = delaunay.triangles;
  
  console.log(` Generated ${triangles.length / 3} triangles`);
  
  // Create Three.js geometry
  const geometry = new THREE.BufferGeometry();
  
  // Vertices
  const vertices = new Float32Array(points.flat());
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  
  // UVs
  const uvArray = new Float32Array(uvs.flat());
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
  
  // Indices
  geometry.setIndex(Array.from(triangles));
  
  // Compute normals
  geometry.computeVertexNormals();
  
  // Create material with texture
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(textureUrl);
  
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.1
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  
  console.log('✅ Procedural mesh created');
  
  return mesh;
}

export function generateSimplePlane(textureUrl) {
  // Fallback: simple plane if mesh generation fails
  const geometry = new THREE.PlaneGeometry(2, 2, 32, 32);
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(textureUrl);
  
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true
  });
  
  return new THREE.Mesh(geometry, material);
}
