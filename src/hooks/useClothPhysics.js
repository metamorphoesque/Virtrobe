// 1. src/hooks/useClothPhysics.js
// ============================================
import { useEffect, useRef } from 'react';
import * as CANNON from 'cannon-es';

export const useClothPhysics = ({ enabled = true }) => {
  const worldRef = useRef(null);
  const clothBodiesRef = useRef([]);
  const mannequinBodyRef = useRef(null);
  
  // Initialize physics world
  useEffect(() => {
    if (!enabled) return;
    
    // Create physics world
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0); // Earth gravity
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
    world.solver.tolerance = 0.001;
    
    // Add damping for stability
    world.defaultContactMaterial.contactEquationStiffness = 1e6;
    world.defaultContactMaterial.contactEquationRelaxation = 3;
    
    worldRef.current = world;
    
    console.log('🌍 Physics world initialized');
    
    return () => {
      // Cleanup
      if (worldRef.current) {
        worldRef.current.bodies.forEach(body => {
          worldRef.current.removeBody(body);
        });
      }
    };
  }, [enabled]);
  
  // Create cloth particle grid
  const createClothGrid = (width, height, segmentsX, segmentsY, position = [0, 2, 0]) => {
    if (!worldRef.current) {
      console.warn(' Physics world not initialized');
      return null;
    }
    
    const particles = [];
    const constraints = [];
    const particleMass = 0.1;
    const clothStiffness = 100;
    const clothDamping = 0.1;
    
    // Create particle grid
    for (let y = 0; y <= segmentsY; y++) {
      for (let x = 0; x <= segmentsX; x++) {
        const u = x / segmentsX;
        const v = y / segmentsY;
        
        const particlePosition = new CANNON.Vec3(
          position[0] + (u - 0.5) * width,
          position[1] - v * height,
          position[2]
        );
        
        const particle = new CANNON.Body({
          mass: particleMass,
          position: particlePosition,
          shape: new CANNON.Particle()
        });
        
        // Pin top corners (make them static)
        if (y === 0 && (x === 0 || x === segmentsX)) {
          particle.mass = 0; // Static particles
          particle.type = CANNON.Body.STATIC;
        }
        
        worldRef.current.addBody(particle);
        particles.push(particle);
      }
    }
    
    // Create constraints (springs) between particles
    const connect = (i1, i2) => {
      const constraint = new CANNON.DistanceConstraint(
        particles[i1],
        particles[i2],
        particles[i1].position.distanceTo(particles[i2].position),
        clothStiffness
      );
      worldRef.current.addConstraint(constraint);
      constraints.push(constraint);
    };
    
    // Structural constraints (horizontal and vertical)
    for (let y = 0; y <= segmentsY; y++) {
      for (let x = 0; x <= segmentsX; x++) {
        const idx = y * (segmentsX + 1) + x;
        
        // Connect to right neighbor
        if (x < segmentsX) {
          connect(idx, idx + 1);
        }
        
        // Connect to bottom neighbor
        if (y < segmentsY) {
          connect(idx, idx + (segmentsX + 1));
        }
      }
    }
    
    // Shear constraints (diagonals for stability)
    for (let y = 0; y < segmentsY; y++) {
      for (let x = 0; x < segmentsX; x++) {
        const idx = y * (segmentsX + 1) + x;
        connect(idx, idx + (segmentsX + 1) + 1); // Bottom-right diagonal
        connect(idx + 1, idx + (segmentsX + 1)); // Bottom-left diagonal
      }
    }
    
    clothBodiesRef.current.push({ particles, constraints, segmentsX, segmentsY });
    
    console.log(` Cloth grid created: ${segmentsX}x${segmentsY} (${particles.length} particles)`);
    
    return { particles, constraints, segmentsX, segmentsY };
  };
  
  // Create mannequin collision body
  const createMannequinCollider = (measurements) => {
    if (!worldRef.current) return;
    
    const { height_cm = 170, bust_cm = 90, waist_cm = 70, hips_cm = 95 } = measurements;
    
    // Convert to scene units (assuming 1 unit = 1 meter, so divide by 100)
    const height = height_cm / 100;
    const bustRadius = (bust_cm / 100) / (2 * Math.PI);
    const waistRadius = (waist_cm / 100) / (2 * Math.PI);
    const hipsRadius = (hips_cm / 100) / (2 * Math.PI);
    
    // Remove old mannequin body
    if (mannequinBodyRef.current) {
      worldRef.current.removeBody(mannequinBodyRef.current);
    }
    
    // Create compound body with multiple cylinders
    const mannequinBody = new CANNON.Body({
      mass: 0, // Static (doesn't move)
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3(0, height * 0.5, 0)
    });
    
    // Torso (upper body)
    const torsoShape = new CANNON.Cylinder(
      bustRadius * 0.8,
      waistRadius * 0.8,
      height * 0.4,
      12
    );
    mannequinBody.addShape(torsoShape, new CANNON.Vec3(0, height * 0.15, 0));
    
    // Hips
    const hipsShape = new CANNON.Cylinder(
      waistRadius * 0.8,
      hipsRadius * 0.8,
      height * 0.2,
      12
    );
    mannequinBody.addShape(hipsShape, new CANNON.Vec3(0, -height * 0.15, 0));
    
    worldRef.current.addBody(mannequinBody);
    mannequinBodyRef.current = mannequinBody;
    
    console.log('🧍 Mannequin collider created');
  };
  
  // Step physics simulation
  const stepPhysics = (deltaTime) => {
    if (!worldRef.current || !enabled) return;
    
    const timeStep = 1 / 60; // 60 FPS
    const maxSubSteps = 3;
    
    worldRef.current.step(timeStep, deltaTime, maxSubSteps);
  };
  
  // Get particle positions for rendering
  const getClothPositions = (clothIndex = 0) => {
    if (!clothBodiesRef.current[clothIndex]) return null;
    
    const { particles } = clothBodiesRef.current[clothIndex];
    return particles.map(p => ({
      x: p.position.x,
      y: p.position.y,
      z: p.position.z
    }));
  };
  
  // Apply wind force
  const applyWind = (direction = [0.5, 0, 0.5], strength = 2) => {
    clothBodiesRef.current.forEach(cloth => {
      cloth.particles.forEach(particle => {
        if (particle.mass > 0) { // Only affect dynamic particles
          particle.force.set(
            direction[0] * strength,
            direction[1] * strength,
            direction[2] * strength
          );
        }
      });
    });
  };
  
  // Reset cloth to initial position
  const resetCloth = () => {
    clothBodiesRef.current.forEach(cloth => {
      cloth.particles.forEach(particle => {
        particle.velocity.set(0, 0, 0);
        particle.angularVelocity.set(0, 0, 0);
      });
    });
  };
  
  return {
    world: worldRef.current,
    createClothGrid,
    createMannequinCollider,
    stepPhysics,
    getClothPositions,
    applyWind,
    resetCloth
  };
};