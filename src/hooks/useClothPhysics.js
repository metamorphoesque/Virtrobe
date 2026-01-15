// src/hooks/useClothPhysics.js
import { useRef, useEffect } from 'react';
import * as CANNON from 'cannon-es';

export const useClothPhysics = ({ enabled = false }) => {
  const worldRef = useRef(null);
  const clothBodyRef = useRef(null);
  const particlesRef = useRef([]);
  const constraintsRef = useRef([]);
  const mannequinBodiesRef = useRef([]);

  useEffect(() => {
    if (!enabled) return;

    // Initialize CANNON.js physics world
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
    world.defaultContactMaterial.contactEquationStiffness = 1e8;
    world.defaultContactMaterial.contactEquationRelaxation = 3;
    
    worldRef.current = world;

    return () => {
      // Cleanup
      if (worldRef.current) {
        worldRef.current.bodies.forEach(body => {
          worldRef.current.removeBody(body);
        });
        constraintsRef.current.forEach(constraint => {
          worldRef.current.removeConstraint(constraint);
        });
      }
    };
  }, [enabled]);

  const createClothBody = (width, height, segmentsX, segmentsY, position) => {
    if (!worldRef.current) return null;

    const particles = [];
    const constraints = [];
    const mass = 0.1;
    const distance = width / segmentsX;

    // Create particle grid
    for (let i = 0; i <= segmentsY; i++) {
      for (let j = 0; j <= segmentsX; j++) {
        const x = (j - segmentsX / 2) * distance;
        const y = -i * distance;
        const z = 0;

        const particle = new CANNON.Body({
          mass: i === 0 ? 0 : mass, // Top row is fixed
          shape: new CANNON.Particle(),
          position: new CANNON.Vec3(
            position[0] + x,
            position[1] + y,
            position[2] + z
          ),
          linearDamping: 0.5,
          angularDamping: 0.5
        });

        worldRef.current.addBody(particle);
        particles.push(particle);
      }
    }

    // Create distance constraints (springs between particles)
    const connect = (i1, i2, distance) => {
      const constraint = new CANNON.DistanceConstraint(
        particles[i1],
        particles[i2],
        distance,
        1e6 // stiffness
      );
      worldRef.current.addConstraint(constraint);
      constraints.push(constraint);
    };

    // Horizontal and vertical constraints
    for (let i = 0; i <= segmentsY; i++) {
      for (let j = 0; j <= segmentsX; j++) {
        const index = i * (segmentsX + 1) + j;
        
        // Horizontal
        if (j < segmentsX) {
          connect(index, index + 1, distance);
        }
        
        // Vertical
        if (i < segmentsY) {
          connect(index, index + segmentsX + 1, distance);
        }
        
        // Diagonal (for shear resistance)
        if (i < segmentsY && j < segmentsX) {
          connect(index, index + segmentsX + 2, distance * Math.sqrt(2));
          connect(index + 1, index + segmentsX + 1, distance * Math.sqrt(2));
        }
      }
    }

    particlesRef.current = particles;
    constraintsRef.current = constraints;

    return { particles, constraints };
  };

  const createMannequinCollider = (measurements) => {
    if (!worldRef.current) return;

    // Clear existing colliders
    mannequinBodiesRef.current.forEach(body => {
      worldRef.current.removeBody(body);
    });
    mannequinBodiesRef.current = [];

    const { 
      chest_cm = 90, 
      waist_cm = 75, 
      height_cm = 170,
      shoulder_width_cm = 40,
      hip_cm = 95
    } = measurements;

    const scale = height_cm / 170;

    // Create torso cylinder (main body)
    const torsoRadius = (chest_cm / 100) / (2 * Math.PI);
    const torsoHeight = height_cm / 100 * 0.35; // ~35% of height
    const torsoShape = new CANNON.Cylinder(
      torsoRadius * 0.9,
      torsoRadius * 1.1,
      torsoHeight,
      12
    );
    
    const torsoBody = new CANNON.Body({ 
      mass: 0, // Static
      shape: torsoShape,
      position: new CANNON.Vec3(0, 1.2 * scale, 0)
    });
    
    // Rotate to stand upright
    const quaternion = new CANNON.Quaternion();
    quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    torsoBody.quaternion.copy(quaternion);
    
    worldRef.current.addBody(torsoBody);
    mannequinBodiesRef.current.push(torsoBody);

    // Create shoulder spheres
    const shoulderRadius = 0.08 * scale;
    const shoulderY = 1.4 * scale;
    const shoulderZ = 0;
    const shoulderDistance = (shoulder_width_cm / 100) / 2;

    [-shoulderDistance, shoulderDistance].forEach(x => {
      const shoulderShape = new CANNON.Sphere(shoulderRadius);
      const shoulderBody = new CANNON.Body({
        mass: 0,
        shape: shoulderShape,
        position: new CANNON.Vec3(x, shoulderY, shoulderZ)
      });
      worldRef.current.addBody(shoulderBody);
      mannequinBodiesRef.current.push(shoulderBody);
    });

    // Create chest sphere for draping
    const chestRadius = torsoRadius * 1.2;
    const chestBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Sphere(chestRadius),
      position: new CANNON.Vec3(0, 1.3 * scale, 0.05)
    });
    worldRef.current.addBody(chestBody);
    mannequinBodiesRef.current.push(chestBody);
  };

  const step = (deltaTime) => {
    if (worldRef.current && enabled) {
      worldRef.current.step(1 / 60, deltaTime, 3);
    }
  };

  const getParticlePositions = () => {
    return particlesRef.current.map(p => p.position);
  };

  const applyWind = (force = 0.5) => {
    if (!enabled) return;
    
    const time = Date.now() * 0.001;
    particlesRef.current.forEach((particle, i) => {
      if (particle.mass > 0) {
        const windX = Math.sin(time + i * 0.1) * force;
        const windZ = Math.cos(time * 0.5 + i * 0.2) * force * 0.5;
        particle.applyForce(
          new CANNON.Vec3(windX, 0, windZ),
          particle.position
        );
      }
    });
  };

  const rotateMannequin = (angle) => {
    if (!enabled) return;
    
    // Rotate all mannequin colliders
    mannequinBodiesRef.current.forEach(body => {
      const pos = body.position;
      const distance = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      const currentAngle = Math.atan2(pos.z, pos.x);
      const newAngle = currentAngle + angle;
      
      body.position.x = distance * Math.cos(newAngle);
      body.position.z = distance * Math.sin(newAngle);
      
      // Rotate the body itself
      const rotQuat = new CANNON.Quaternion();
      rotQuat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);
      body.quaternion = body.quaternion.mult(rotQuat);
    });
    
    // Rotate cloth particles (only free particles)
    particlesRef.current.forEach((particle, i) => {
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

  return {
    world: worldRef.current,
    createClothBody,
    createMannequinCollider,
    step,
    getParticlePositions,
    applyWind,
    rotateMannequin,
    enabled
  };
};