// src/components/3d/PhysicsDebugHelper.jsx
// Visualize physics particles and colliders
// ============================================
import React from 'react';
import * as THREE from 'three';

const PhysicsDebugHelper = ({ 
  clothPhysics, 
  particles = [],
  showParticles = true,
  showColliders = true,
  enabled = false
}) => {
  if (!enabled || !clothPhysics?.world) return null;
  
  return (
    <group>
      {/* Render physics particles as small spheres */}
      {showParticles && particles.map((particle, idx) => (
        <mesh key={`particle-${idx}`} position={[particle.position.x, particle.position.y, particle.position.z]}>
          <sphereGeometry args={[0.01]} />
          <meshBasicMaterial 
            color={particle.mass === 0 ? '#ff0000' : '#00ff00'} 
            transparent 
            opacity={0.8}
          />
        </mesh>
      ))}
      
      {/* Render mannequin colliders as wireframes */}
      {showColliders && clothPhysics.world?.bodies.map((body, idx) => {
        if (body.shapes[0]?.type === CANNON.Shape.types.CYLINDER) {
          const shape = body.shapes[0];
          return (
            <mesh 
              key={`collider-${idx}`} 
              position={[body.position.x, body.position.y, body.position.z]}
              rotation={[body.quaternion.x, body.quaternion.y, body.quaternion.z]}
            >
              <cylinderGeometry args={[shape.radiusTop, shape.radiusBottom, shape.height, 12]} />
              <meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.3} />
            </mesh>
          );
        } else if (body.shapes[0]?.type === CANNON.Shape.types.SPHERE) {
          const shape = body.shapes[0];
          return (
            <mesh 
              key={`collider-${idx}`} 
              position={[body.position.x, body.position.y, body.position.z]}
            >
              <sphereGeometry args={[shape.radius, 16, 16]} />
              <meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.3} />
            </mesh>
          );
        }
        return null;
      })}
      
      {/* Status text */}
      <mesh position={[0, 3, 0]}>
        <sphereGeometry args={[0.05]} />
        <meshBasicMaterial color={clothPhysics.world ? '#00ff00' : '#ff0000'} />
      </mesh>
    </group>
  );
};

export default PhysicsDebugHelper;