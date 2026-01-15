// COMPLETE REWRITE: src/components/3d/HybridGarment.jsx
// Unified system: Depth-deformed template + Cloth physics
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
  
  useEffect(() => {
    if (!garmentData?.mesh) {
      console.warn('⚠️ No garment data');
      return;
    }
    
    console.log('🎨 Initializing hybrid garment:', garmentData.method);
    console.log('   Physics enabled:', enablePhysics);
    console.log('   Cloth physics available:', !!clothPhysics);
    
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
    
    // Initialize physics if enabled
    if (enablePhysics && clothPhysics && clothPhysics.enabled) {
      initializePhysics(targetMesh, garmentData);
    } else {
      console.log('⚠️ Physics disabled or not available');
    }
    
  }, [garmentData, enablePhysics, measurements, clothPhysics]);
  
  const initializePhysics = (targetMesh, garmentData) => {
    console.log('🔧 Initializing physics for hybrid garment...');
    
    const geometry = targetMesh.geometry;
    const positions = geometry.attributes.position;
    const uvs = geometry.attributes.uv;
    
    if (!clothPhysics.world) {
      console.error('❌ Physics world not initialized');
      return;
    }
    
    // Create mannequin collider first
    clothPhysics.createMannequinCollider(measurements);
    console.log('🧍 Mannequin collider created');
    
    // Create physics particles from mesh vertices
    const particles = [];
    const vertexMapping = [];
    
    // Optimization: Skip vertices to reduce particle count
    const totalVertices = positions.count;
    const targetParticles = 400; // Target particle count
    const skipRate = Math.max(1, Math.floor(totalVertices / targetParticles));
    
    console.log(`📊 Creating particles (${totalVertices} vertices → ${Math.ceil(totalVertices / skipRate)} particles)`);
    
    // Get world transform
    targetMesh.updateMatrixWorld(true);
    const worldMatrix = targetMesh.matrixWorld;
    
    for (let i = 0; i < positions.count; i += skipRate) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Transform to world space
      const worldPos = new THREE.Vector3(x, y, z);
      worldPos.applyMatrix4(worldMatrix);
      
      // Get UV coordinates to determine if this is a "pinned" vertex
      const u = uvs ? uvs.getX(i) : 0.5;
      const v = uvs ? uvs.getY(i) : 0.5;
      
      // Pin top edge (shoulders)
      const isPinned = v > 0.95; // Top 5% is pinned
      
      // Create physics particle
      const particle = new CANNON.Body({
        mass: isPinned ? 0 : 0.15, // Pinned = static, otherwise dynamic
        shape: new CANNON.Particle(),
        position: new CANNON.Vec3(worldPos.x, worldPos.y, worldPos.z),
        linearDamping: 0.6,
        angularDamping: 0.6
      });
      
      clothPhysics.world.addBody(particle);
      particles.push(particle);
      
      // Map particle index to vertex index
      vertexMapping.push({
        vertexIndex: i,
        particleIndex: particles.length - 1,
        isPinned: isPinned,
        originalPos: { x, y, z }
      });
    }
    
    console.log(`✅ Created ${particles.length} physics particles`);
    
    // Create constraints (springs between nearby particles)
    const constraints = [];
    const gridSize = Math.ceil(Math.sqrt(particles.length));
    
    const connect = (idx1, idx2) => {
      if (idx1 >= 0 && idx1 < particles.length && idx2 >= 0 && idx2 < particles.length) {
        const p1 = particles[idx1];
        const p2 = particles[idx2];
        
        const distance = Math.sqrt(
          Math.pow(p1.position.x - p2.position.x, 2) +
          Math.pow(p1.position.y - p2.position.y, 2) +
          Math.pow(p1.position.z - p2.position.z, 2)
        );
        
        const constraint = new CANNON.DistanceConstraint(
          p1, p2, distance, 1e7 // High stiffness
        );
        
        clothPhysics.world.addConstraint(constraint);
        constraints.push(constraint);
      }
    };
    
    // Create grid-like constraint structure
    for (let i = 0; i < particles.length; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      
      // Horizontal connection
      if (col < gridSize - 1) {
        connect(i, i + 1);
      }
      
      // Vertical connection
      if (row < gridSize - 1) {
        connect(i, i + gridSize);
      }
      
      // Diagonal connections (for shear resistance)
      if (row < gridSize - 1 && col < gridSize - 1) {
        connect(i, i + gridSize + 1);
        connect(i + 1, i + gridSize);
      }
    }
    
    console.log(`🔗 Created ${constraints.length} constraints`);
    
    physicsParticlesRef.current = particles;
    vertexMappingRef.current = vertexMapping;
    setIsPhysicsReady(true);
    
    console.log('✅ Physics initialization complete');
  };
  
  // Animation loop
  useFrame((state, delta) => {
    if (!meshRef.current || !geometryRef.current) return;
    
    // Physics simulation
    if (enablePhysics && clothPhysics && clothPhysics.enabled && isPhysicsReady) {
      // Update physics world
      clothPhysics.step(delta);
      
      // Apply wind effect occasionally
      if (Math.random() < 0.05) {
        const windForce = Math.random() * 0.4 + 0.2;
        physicsParticlesRef.current.forEach((particle, i) => {
          if (particle.mass > 0) {
            const time = Date.now() * 0.001;
            const windX = Math.sin(time + i * 0.1) * windForce;
            const windZ = Math.cos(time * 0.5 + i * 0.2) * windForce * 0.5;
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
      if (enablePhysics && clothPhysics && clothPhysics.enabled && isPhysicsReady) {
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
    const skipRate = Math.max(1, Math.floor(positions.count / 400));
    if (skipRate > 1) {
      for (let i = 0; i < positions.count; i++) {
        if (i % skipRate !== 0) {
          // Find nearest updated vertices and interpolate
          const prev = Math.floor(i / skipRate) * skipRate;
          const next = Math.min(positions.count - 1, (Math.floor(i / skipRate) + 1) * skipRate);
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
    
    positions.needsUpdate = true;
    geometryRef.current.computeVertexNormals();
  };
  
  const rotatePhysicsParticles = (angle) => {
    physicsParticlesRef.current.forEach((particle) => {
      if (particle.mass > 0) {
        const pos = particle.position;
        const distance = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        const currentAngle = Math.atan2(pos.z, pos.x);
        const newAngle = currentAngle + angle;
        
        particle.position.x = distance * Math.cos(newAngle);
        particle.position.z = distance * Math.sin(newAngle);
      }
    });
  };
  
  if (!garmentData?.mesh) return null;
  
  return (
    <group ref={groupRef} position={position}>
      <primitive object={garmentData.mesh} />
      
      {/* Debug indicators */}
      {enablePhysics && isPhysicsReady && (
        <>
          {/* Green = physics active */}
          <mesh position={[0, 2.5, 0]}>
            <sphereGeometry args={[0.03]} />
            <meshBasicMaterial color="#00ff00" />
          </mesh>
          
          {/* Show particle count */}
          {/* <Html position={[0, 2.7, 0]} center>
            <div style={{ 
              background: 'rgba(0,0,0,0.8)', 
              color: 'white', 
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              whiteSpace: 'nowrap'
            }}>
              {physicsParticlesRef.current.length} particles
            </div>
          </Html> */}
        </>
      )}
      
      {!enablePhysics && (
        /* Red = static mode */
        <mesh position={[0, 2.5, 0]}>
          <sphereGeometry args={[0.03]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
      )}
    </group>
  );
};

export default HybridGarment;