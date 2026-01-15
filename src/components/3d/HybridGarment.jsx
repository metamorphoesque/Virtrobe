// FIXED: src/components/3d/HybridGarment.jsx
// Wait for physics world before initializing
// ============================================
import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const HybridGarment = ({ 
  garmentData,
  measurements,
  clothPhysics,
  autoRotate = false,
  enablePhysics = true,
  position = [0, 0, 0]
}) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const [isPhysicsReady, setIsPhysicsReady] = useState(false);
  const physicsParticlesRef = useRef([]);
  const vertexMappingRef = useRef([]);
  const geometryRef = useRef(null);
  const initAttemptRef = useRef(0);
  
  useEffect(() => {
    if (!garmentData?.mesh) {
      console.warn('⚠️ No garment data');
      return;
    }
    
    console.log('🎨 Initializing hybrid garment:', garmentData.method);
    console.log('   Physics enabled:', enablePhysics);
    console.log('   Cloth physics available:', !!clothPhysics);
    console.log('   Physics world ready:', !!clothPhysics?.world);
    
    // Find the actual mesh object
    let targetMesh = null;
    garmentData.mesh.traverse((child) => {
      if (child.isMesh && !targetMesh) {
        targetMesh = child;
      }
    });
    
    if (!targetMesh) {
      console.error('❌ No mesh found in garment data');
      return;
    }
    
    meshRef.current = targetMesh;
    geometryRef.current = targetMesh.geometry;
    
    console.log('📐 Mesh geometry:', {
      vertices: geometryRef.current.attributes.position.count,
      hasUV: !!geometryRef.current.attributes.uv,
      hasNormals: !!geometryRef.current.attributes.normal
    });
    
    // Initialize physics if enabled AND world is ready
    if (enablePhysics && clothPhysics?.world) {
      console.log('✅ Physics world is ready, initializing...');
      initializePhysics(targetMesh, garmentData);
    } else if (enablePhysics && !clothPhysics?.world) {
      console.log('⏳ Waiting for physics world...');
      // Physics world not ready yet, will retry
    } else {
      console.log('⚠️ Physics disabled');
    }
    
  }, [garmentData, enablePhysics, measurements, clothPhysics, clothPhysics?.world]);
  
  const initializePhysics = (targetMesh, garmentData) => {
    if (isPhysicsReady) {
      console.log('⚠️ Physics already initialized');
      return;
    }
    
    console.log('🔧 Initializing physics for hybrid garment...');
    
    const geometry = targetMesh.geometry;
    const positions = geometry.attributes.position;
    const uvs = geometry.attributes.uv;
    
    if (!clothPhysics.world) {
      console.error('❌ Physics world STILL not initialized');
      return;
    }
    
    // Create mannequin collider first
    try {
      clothPhysics.createMannequinCollider(measurements);
      console.log('🧍 Mannequin collider created');
    } catch (error) {
      console.error('❌ Failed to create mannequin collider:', error);
      return;
    }
    
    // Create physics particles from mesh vertices
    const particles = [];
    const vertexMapping = [];
    
    // Optimization: Reduce particle count drastically
    const totalVertices = positions.count;
    const targetParticles = Math.min(200, totalVertices); // Max 200 particles for performance
    const skipRate = Math.max(1, Math.floor(totalVertices / targetParticles));
    
    console.log(`📊 Creating particles (${totalVertices} vertices → ${Math.ceil(totalVertices / skipRate)} particles, skip=${skipRate})`);
    
    // Get world transform
    targetMesh.updateMatrixWorld(true);
    const worldMatrix = targetMesh.matrixWorld;
    
    let particleCount = 0;
    for (let i = 0; i < positions.count; i += skipRate) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Transform to world space
      const localPos = new THREE.Vector3(x, y, z);
      const worldPos = localPos.applyMatrix4(worldMatrix);
      
      // Get UV coordinates to determine if this is a "pinned" vertex
      const u = uvs ? uvs.getX(i) : 0.5;
      const v = uvs ? uvs.getY(i) : 0.5;
      
      // Pin top edge (shoulders) - top 5% of garment
      const isPinned = v > 0.95;
      
      // Create physics particle
      const particle = new CANNON.Body({
        mass: isPinned ? 0 : 0.2, // Heavier for better draping
        shape: new CANNON.Particle(),
        position: new CANNON.Vec3(worldPos.x, worldPos.y, worldPos.z),
        linearDamping: 0.5,
        angularDamping: 0.5
      });
      
      try {
        clothPhysics.world.addBody(particle);
        particles.push(particle);
        particleCount++;
      } catch (error) {
        console.error('❌ Failed to add particle:', error);
        continue;
      }
      
      // Map particle index to vertex index
      vertexMapping.push({
        vertexIndex: i,
        particleIndex: particles.length - 1,
        isPinned: isPinned,
        originalPos: { x, y, z }
      });
    }
    
    console.log(`✅ Created ${particleCount} physics particles`);
    
    // Create constraints (springs between nearby particles)
    const constraints = [];
    const cols = Math.ceil(Math.sqrt(particles.length));
    const rows = Math.ceil(particles.length / cols);
    
    console.log(`🔗 Creating constraints (${rows}x${cols} grid)`);
    
    const connect = (idx1, idx2) => {
      if (idx1 >= 0 && idx1 < particles.length && idx2 >= 0 && idx2 < particles.length) {
        const p1 = particles[idx1];
        const p2 = particles[idx2];
        
        const dx = p1.position.x - p2.position.x;
        const dy = p1.position.y - p2.position.y;
        const dz = p1.position.z - p2.position.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (distance > 0) {
          const constraint = new CANNON.DistanceConstraint(
            p1, p2, distance, 5e6 // Lower stiffness for more natural draping
          );
          
          try {
            clothPhysics.world.addConstraint(constraint);
            constraints.push(constraint);
          } catch (error) {
            console.error('❌ Failed to add constraint:', error);
          }
        }
      }
    };
    
    // Create grid-like constraint structure
    let constraintCount = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        if (i >= particles.length) break;
        
        // Horizontal connection
        if (col < cols - 1) {
          connect(i, i + 1);
          constraintCount++;
        }
        
        // Vertical connection
        if (row < rows - 1) {
          connect(i, i + cols);
          constraintCount++;
        }
        
        // Diagonal connections (for shear resistance)
        if (row < rows - 1 && col < cols - 1) {
          connect(i, i + cols + 1);
          connect(i + 1, i + cols);
          constraintCount += 2;
        }
      }
    }
    
    console.log(`✅ Created ${constraintCount} constraints`);
    
    physicsParticlesRef.current = particles;
    vertexMappingRef.current = vertexMapping;
    setIsPhysicsReady(true);
    
    console.log('✅ Physics initialization complete!');
  };
  
  // Animation loop
  useFrame((state, delta) => {
    if (!meshRef.current || !geometryRef.current) return;
    
    // Physics simulation
    if (enablePhysics && clothPhysics?.world && isPhysicsReady) {
      // Update physics world
      try {
        clothPhysics.step(delta);
      } catch (error) {
        console.error('Physics step error:', error);
        return;
      }
      
      // Apply wind effect occasionally
      if (Math.random() < 0.08) {
        const windForce = Math.random() * 0.6 + 0.3;
        physicsParticlesRef.current.forEach((particle, i) => {
          if (particle.mass > 0) {
            const time = Date.now() * 0.001;
            const windX = Math.sin(time + i * 0.15) * windForce;
            const windZ = Math.cos(time * 0.7 + i * 0.25) * windForce * 0.6;
            particle.applyForce(
              new CANNON.Vec3(windX, 0, windZ),
              particle.position
            );
          }
        });
      }
      
      // Update mesh vertices from physics
      updateMeshFromPhysics();
    }
    
    // Auto rotation
    if (autoRotate && groupRef.current) {
      const rotationSpeed = 0.3;
      const angle = delta * rotationSpeed;
      groupRef.current.rotation.y += angle;
      
      // Sync physics rotation
      if (enablePhysics && clothPhysics?.world && isPhysicsReady) {
        rotatePhysicsParticles(angle);
      }
    }
  });
  
  const updateMeshFromPhysics = () => {
    if (!geometryRef.current || vertexMappingRef.current.length === 0) return;
    
    const positions = geometryRef.current.attributes.position;
    
    // Get inverse world matrix to transform back to local space
    meshRef.current.updateMatrixWorld(true);
    const inverseMatrix = meshRef.current.matrixWorld.clone().invert();
    
    // Update vertices based on physics particles
    vertexMappingRef.current.forEach((mapping) => {
      const particle = physicsParticlesRef.current[mapping.particleIndex];
      
      if (particle) {
        // Get particle position in world space
        const worldPos = new THREE.Vector3(
          particle.position.x,
          particle.position.y,
          particle.position.z
        );
        
        // Transform to local space
        worldPos.applyMatrix4(inverseMatrix);
        
        // Update vertex position
        positions.setXYZ(
          mapping.vertexIndex,
          worldPos.x,
          worldPos.y,
          worldPos.z
        );
      }
    });
    
    // Interpolate positions for vertices that don't have particles
    const skipRate = Math.max(1, Math.floor(positions.count / 200));
    if (skipRate > 1) {
      for (let i = 0; i < positions.count; i++) {
        if (i % skipRate !== 0) {
          // Find nearest updated vertices and interpolate
          const prev = Math.floor(i / skipRate) * skipRate;
          const next = Math.min(positions.count - 1, (Math.floor(i / skipRate) + 1) * skipRate);
          
          if (prev !== next) {
            const t = (i % skipRate) / skipRate;
            
            const x = THREE.MathUtils.lerp(
              positions.getX(prev),
              positions.getX(next),
              t
            );
            const y = THREE.MathUtils.lerp(
              positions.getY(prev),
              positions.getY(next),
              t
            );
            const z = THREE.MathUtils.lerp(
              positions.getZ(prev),
              positions.getZ(next),
              t
            );
            
            positions.setXYZ(i, x, y, z);
          }
        }
      }
    }
    
    positions.needsUpdate = true;
    geometryRef.current.computeVertexNormals();
  };
  
  const rotatePhysicsParticles = (angle) => {
    physicsParticlesRef.current.forEach((particle) => {
      if (particle.mass > 0) {
        const pos = particle.position;
        const distance = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        
        if (distance > 0.001) {
          const currentAngle = Math.atan2(pos.z, pos.x);
          const newAngle = currentAngle + angle;
          
          particle.position.x = distance * Math.cos(newAngle);
          particle.position.z = distance * Math.sin(newAngle);
        }
      }
    });
  };
  
  if (!garmentData?.mesh) return null;
  
  return (
    <group ref={groupRef} position={position}>
      <primitive object={garmentData.mesh} />
      
      {/* Debug indicators */}
      {enablePhysics && isPhysicsReady && (
        <mesh position={[0, 2.5, 0]}>
          <sphereGeometry args={[0.04]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}
      
      {enablePhysics && !isPhysicsReady && clothPhysics?.world && (
        <mesh position={[0, 2.5, 0]}>
          <sphereGeometry args={[0.04]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
      )}
      
      {!enablePhysics && (
        <mesh position={[0, 2.5, 0]}>
          <sphereGeometry args={[0.04]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
      )}
    </group>
  );
};

export default HybridGarment;