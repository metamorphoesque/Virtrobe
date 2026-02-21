// src/hooks/useClothPhysics.js
// ============================================
// CLOTH PHYSICS ENGINE — CANNON-ES
// Manages physics world, mannequin colliders,
// cloth particle systems, and constraint networks
// ============================================

import { useRef, useMemo, useCallback } from 'react';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';

// ── Pin thresholds per garment type ──
// Fraction of garment height (from top) that is pinned
const PIN_FRACTIONS = {
  shirt:  0.08,
  jacket: 0.08,
  dress:  0.06,
  pants:  0.06,
  shorts: 0.06,
  skirt:  0.08,
};

export const useClothPhysics = () => {
  // ── Refs (persist across renders, no re-render triggers) ──
  const worldRef            = useRef(null);
  const clothMaterialRef    = useRef(null);
  const mannequinMaterialRef = useRef(null);
  const clothParticlesRef   = useRef([]);
  const clothConstraintsRef = useRef([]);
  const mannequinBodiesRef  = useRef([]);
  const isReadyRef          = useRef(false);
  const settleFrameRef      = useRef(0);

  // ── Create CANNON world (lazy, synchronous) ──
  const ensureWorld = useCallback(() => {
    if (worldRef.current) return worldRef.current;

    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.solver.iterations = 15;
    world.solver.tolerance  = 0.0001;

    // Materials
    const clothMat     = new CANNON.Material('cloth');
    const mannequinMat = new CANNON.Material('mannequin');

    world.addContactMaterial(new CANNON.ContactMaterial(clothMat, mannequinMat, {
      friction: 0.5,
      restitution: 0.05,
      contactEquationStiffness: 1e7,
      contactEquationRelaxation: 3,
    }));

    clothMaterialRef.current     = clothMat;
    mannequinMaterialRef.current = mannequinMat;
    worldRef.current = world;

    console.log('🌍 CANNON physics world created');
    return world;
  }, []);

  // ── Build mannequin collision bodies from measurements + ref ──
  const createMannequinColliders = useCallback((measurements, mannequinRef) => {
    const world = ensureWorld();

    // Remove old colliders
    mannequinBodiesRef.current.forEach(b => { try { world.removeBody(b); } catch(_){} });
    mannequinBodiesRef.current = [];

    const {
      bust_cm            = 90,
      waist_cm           = 70,
      hips_cm            = 95,
      shoulder_width_cm  = 40,
    } = measurements;

    // Get mannequin world-space bounds
    let center = new THREE.Vector3(0, 1, 0);
    let size   = new THREE.Vector3(0.3, 1.6, 0.2);

    if (mannequinRef?.current) {
      mannequinRef.current.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(mannequinRef.current);
      box.getCenter(center);
      box.getSize(size);
    }

    const mat    = mannequinMaterialRef.current;
    const bottom = center.y - size.y * 0.5;
    const H      = size.y;

    // Radii from circumference
    const bustR   = (bust_cm   / 100) / (2 * Math.PI);
    const waistR  = (waist_cm  / 100) / (2 * Math.PI);
    const hipR    = (hips_cm   / 100) / (2 * Math.PI);
    const shoulderHalf = (shoulder_width_cm / 100) / 2;

    const addCylinder = (rTop, rBot, h, y) => {
      const body = new CANNON.Body({
        mass: 0, material: mat,
        shape: new CANNON.Cylinder(rTop, rBot, h, 12),
        position: new CANNON.Vec3(center.x, y, center.z),
      });
      world.addBody(body);
      mannequinBodiesRef.current.push(body);
    };

    const addSphere = (r, x, y, z) => {
      const body = new CANNON.Body({
        mass: 0, material: mat,
        shape: new CANNON.Sphere(r),
        position: new CANNON.Vec3(x, y, z),
      });
      world.addBody(body);
      mannequinBodiesRef.current.push(body);
    };

    // 1. Upper chest  65–82 %
    addCylinder(bustR * 0.90, bustR, H * 0.17, bottom + H * 0.735);
    // 2. Waist        50–65 %
    addCylinder(bustR * 0.95, waistR, H * 0.15, bottom + H * 0.575);
    // 3. Hips         33–50 %
    addCylinder(waistR, hipR, H * 0.17, bottom + H * 0.415);
    // 4. Shoulder caps
    const shY = bottom + H * 0.83;
    addSphere(bustR * 0.45, center.x - shoulderHalf, shY, center.z);
    addSphere(bustR * 0.45, center.x + shoulderHalf, shY, center.z);
    // 5. Bust spheres (front)
    addSphere(bustR * 0.55, center.x - bustR * 0.35, bottom + H * 0.72, center.z + bustR * 0.3);
    addSphere(bustR * 0.55, center.x + bustR * 0.35, bottom + H * 0.72, center.z + bustR * 0.3);
    // 6. Neck
    addCylinder(bustR * 0.28, bustR * 0.24, H * 0.06, bottom + H * 0.88);

    console.log(`🧍 ${mannequinBodiesRef.current.length} mannequin colliders created`);
  }, [ensureWorld]);

  // ── Create cloth particles + constraints from world-space positions ──
  const createClothParticles = useCallback((
    worldPositions,   // THREE.Vector3[]  — all vertex world positions
    garmentType = 'shirt',
    targetCount = 280
  ) => {
    const world = ensureWorld();

    // Tear down previous cloth
    clothConstraintsRef.current.forEach(c => { try { world.removeConstraint(c); } catch(_){} });
    clothParticlesRef.current.forEach(p =>   { try { world.removeBody(p); } catch(_){} });
    clothParticlesRef.current   = [];
    clothConstraintsRef.current = [];
    isReadyRef.current   = false;
    settleFrameRef.current = 0;

    const total    = worldPositions.length;
    const skipRate = Math.max(1, Math.floor(total / targetCount));
    const mat      = clothMaterialRef.current;

    // Compute Y range
    let minY = Infinity, maxY = -Infinity;
    for (const p of worldPositions) {
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const pinFrac   = PIN_FRACTIONS[garmentType] ?? 0.08;
    const pinThresh = maxY - (maxY - minY) * pinFrac;

    // Sample vertices → particles
    const particles       = [];
    const particleVertMap  = [];   // particleIdx → vertexIdx
    const vertToParticle   = new Map(); // vertexIdx → particleIdx
    const origPositions    = [];   // original world pos per particle

    for (let i = 0; i < total; i += skipRate) {
      const wp = worldPositions[i];
      const isPinned = wp.y >= pinThresh;

      const body = new CANNON.Body({
        mass:           isPinned ? 0 : 0.08,
        material:       mat,
        shape:          new CANNON.Sphere(0.008),
        position:       new CANNON.Vec3(wp.x, wp.y, wp.z),
        linearDamping:  0.55,
        angularDamping: 0.8,
      });

      world.addBody(body);
      const idx = particles.length;
      particles.push(body);
      particleVertMap.push(i);
      vertToParticle.set(i, idx);
      origPositions.push({ x: wp.x, y: wp.y, z: wp.z });
    }

    // K-nearest-neighbor constraints
    const K = 6;
    const connected = new Set();
    const constraints = [];

    for (let i = 0; i < particles.length; i++) {
      const pi = particles[i].position;
      const dists = [];
      for (let j = 0; j < particles.length; j++) {
        if (i === j) continue;
        const pj = particles[j].position;
        const dx = pi.x - pj.x, dy = pi.y - pj.y, dz = pi.z - pj.z;
        dists.push({ j, d: Math.sqrt(dx*dx + dy*dy + dz*dz) });
      }
      dists.sort((a, b) => a.d - b.d);

      for (let n = 0; n < Math.min(K, dists.length); n++) {
        const { j, d } = dists[n];
        const key = `${Math.min(i,j)}_${Math.max(i,j)}`;
        if (connected.has(key)) continue;
        connected.add(key);
        const c = new CANNON.DistanceConstraint(particles[i], particles[j], d, 1e5);
        world.addConstraint(c);
        constraints.push(c);
      }
    }

    clothParticlesRef.current   = particles;
    clothConstraintsRef.current = constraints;
    isReadyRef.current = true;

    console.log(`👕 Cloth: ${particles.length} particles, ${constraints.length} constraints (skip=${skipRate})`);

    // Build interpolation map for ALL vertices (including non-sampled)
    const interpMap = buildInterpolationMap(worldPositions, particles, particleVertMap, vertToParticle, origPositions);

    return { particles, constraints, particleVertMap, vertToParticle, origPositions, interpMap };
  }, [ensureWorld]);

  // ── Step simulation ──
  const step = useCallback((dt) => {
    if (!worldRef.current || !isReadyRef.current) return;
    const clamped = Math.min(dt, 1 / 30);

    // Gentle settling: reduced gravity for first ~120 frames
    if (settleFrameRef.current < 120) {
      const t = settleFrameRef.current / 120;
      worldRef.current.gravity.set(0, -9.82 * (0.2 + 0.8 * t), 0);
      settleFrameRef.current++;
    }

    worldRef.current.step(1 / 60, clamped, 3);
  }, []);

  // ── Wind ──
  const applyWind = useCallback((strength = 0.25) => {
    if (!isReadyRef.current) return;
    const t = performance.now() * 0.001;
    for (let i = 0; i < clothParticlesRef.current.length; i++) {
      const p = clothParticlesRef.current[i];
      if (p.mass === 0) continue;
      p.applyForce(
        new CANNON.Vec3(
          Math.sin(t * 0.7 + i * 0.15) * strength,
          Math.sin(t * 0.3 + i * 0.1)  * strength * 0.08,
          Math.cos(t * 0.5 + i * 0.2)  * strength * 0.4,
        ),
        p.position,
      );
    }
  }, []);

  // ── Dispose everything ──
  const dispose = useCallback(() => {
    const w = worldRef.current;
    if (!w) return;
    clothConstraintsRef.current.forEach(c => { try { w.removeConstraint(c); } catch(_){} });
    clothParticlesRef.current.forEach(p =>   { try { w.removeBody(p); } catch(_){} });
    mannequinBodiesRef.current.forEach(b =>  { try { w.removeBody(b); } catch(_){} });
    clothParticlesRef.current   = [];
    clothConstraintsRef.current = [];
    mannequinBodiesRef.current  = [];
    isReadyRef.current = false;
    console.log('🧹 Cloth physics disposed');
  }, []);

  return {
    ensureWorld,
    createMannequinColliders,
    createClothParticles,
    step,
    applyWind,
    dispose,
    get isReady()   { return isReadyRef.current; },
    get particles() { return clothParticlesRef.current; },
    get mannequinBodies() { return mannequinBodiesRef.current; },
  };
};

// ── Build interpolation map (called once per garment) ──
// For every vertex, stores how to reconstruct its position
// from nearby physics particles using inverse-distance weighting.
function buildInterpolationMap(worldPositions, particles, particleVertMap, vertToParticle, origPositions) {
  const total = worldPositions.length;
  const map   = new Array(total);

  for (let i = 0; i < total; i++) {
    if (vertToParticle.has(i)) {
      // Directly mapped
      map[i] = { direct: true, pIdx: vertToParticle.get(i) };
    } else {
      // Find 3 nearest particles by original position
      const v = worldPositions[i];
      const nearest = [];
      for (let p = 0; p < origPositions.length; p++) {
        const op = origPositions[p];
        const dx = v.x - op.x, dy = v.y - op.y, dz = v.z - op.z;
        nearest.push({ p, d: Math.sqrt(dx*dx + dy*dy + dz*dz) });
      }
      nearest.sort((a, b) => a.d - b.d);
      const top3 = nearest.slice(0, 3);

      const totalInv = top3.reduce((s, n) => s + 1 / Math.max(n.d, 0.0001), 0);
      map[i] = {
        direct: false,
        neighbors: top3.map(n => ({
          pIdx:   n.p,
          weight: (1 / Math.max(n.d, 0.0001)) / totalInv,
        })),
      };
    }
  }
  return map;
}