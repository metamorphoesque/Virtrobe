// src/components/3d/PhysicsGarment.jsx
//
// REFACTORED: Uses garmentNormalizer + garmentMorphAdapter for
// robust one-time fitting. Per-frame work is minimal (position +
// rotation tracking only — no scale recomputation).
//
// DRAPE EFFECT:
// After scaling/positioning, a one-time surface-conform pass snaps garment
// vertices to the mannequin surface + fabric offset, creating the appearance
// that the garment is "worn" on the body. Zero runtime cost — runs once.

import React, { useRef, useMemo, Suspense } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { normalizeGarment, detectBodyZone } from '../../utils/garmentNormalizer';
import { adaptGarmentToBody } from '../../utils/garmentMorphAdapter';

const GARMENT_Y_CORRECTION = -Math.PI / 2;

// Pre-allocated — never allocate inside useFrame
const _anchorPos = new THREE.Vector3();
const _finalPos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _mannSize = new THREE.Vector3();
const _correction = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0), GARMENT_Y_CORRECTION
);

// ─────────────────────────────────────────────
//  SURFACE SNAP — runs ONCE after first frame positions the garment
//
//  For each garment vertex:
//    1. Transform it into world space using the garment's world matrix
//    2. Cast a ray from the mannequin center axis outward through
//       the vertex position
//    3. Find where that ray hits the mannequin surface
//    4. Snap the vertex to [ surfaceHit + fabricOffset ] so the
//       garment hugs the body at a realistic textile distance
//
//  This both pushes vertices OUT of the body AND pulls distant
//  vertices INWARD, making the garment conform to the actual
//  mannequin geometry.
// ─────────────────────────────────────────────

// Per-body-zone fabric offsets (world units)
// These represent how far the fabric sits above the skin
const FABRIC_OFFSETS = {
  torso: 0.012,   // chest / waist / hips
  shoulder: 0.014,   // slightly thicker around shoulders
  limbs: 0.008,   // arms / legs — thinner
  default: 0.010,
};

// How aggressively to snap vertices that are far from the surface.
// 1.0 = fully snap to surface; lower = gentler (preserves garment shape)
const SNAP_STRENGTH_INWARD = 0.75;  // pulling floating vertices toward body
const SNAP_STRENGTH_OUTWARD = 1.0;   // pushing intersecting vertices out (full)

// Maximum snap distance (world units) — vertices further than this
// from the surface are NOT snapped (e.g. wide sleeves, flared hems)
const MAX_SNAP_DISTANCE = 0.12;

// Decide offset based on vertex Y position relative to mannequin
function getFabricOffset(yFrac) {
  // yFrac: 0 = feet, 1 = head
  if (yFrac >= 0.80) return FABRIC_OFFSETS.shoulder;
  if (yFrac >= 0.35 && yFrac < 0.80) return FABRIC_OFFSETS.torso;
  return FABRIC_OFFSETS.limbs;
}

/**
 * Collect all Mesh children from a scene graph into a flat array.
 * Used as the raycasting target set.
 */
function collectMeshes(root) {
  const meshes = [];
  root.traverse(child => {
    if (child.isMesh && child.geometry) meshes.push(child);
  });
  return meshes;
}

/**
 * Apply surface-snapping to a garment mesh so it conforms to the
 * mannequin's actual body geometry.
 *
 * Called ONCE after the garment is positioned and scaled in the scene.
 *
 * @param {THREE.Object3D} garmentRoot   - The garment scene graph (primitive)
 * @param {THREE.Object3D} garmentWrapper - The <primitive> node with pos/rot/scale applied
 * @param {THREE.Object3D} mannequinRef  - The mannequin group node
 */
function applySurfaceSnap(garmentRoot, garmentWrapper, mannequinRef) {
  if (!mannequinRef) return;

  // ── Build mannequin spatial data ───────────────────────────────────
  mannequinRef.updateMatrixWorld(true);
  garmentWrapper.updateMatrixWorld(true);

  const mannBox = new THREE.Box3().setFromObject(mannequinRef);
  const mannCenter = new THREE.Vector3();
  const mannSize = new THREE.Vector3();
  mannBox.getCenter(mannCenter);
  mannBox.getSize(mannSize);

  // Vertical center axis of the mannequin (X, Z)
  const axisX = mannCenter.x;
  const axisZ = mannCenter.z;

  // Collect mannequin mesh geometry for raycasting
  const mannMeshes = collectMeshes(mannequinRef);
  if (mannMeshes.length === 0) {
    console.warn('⚠️ Surface snap: no mannequin meshes found, skipping');
    return;
  }

  const raycaster = new THREE.Raycaster();
  raycaster.near = 0;
  raycaster.far = mannSize.x * 3; // generous range

  // We need the garment wrapper's world matrix and its inverse
  // to transform vertices: local → world → modify → back to local
  const garmentWorldMatrix = garmentWrapper.matrixWorld.clone();
  const garmentWorldMatrixInverse = garmentWorldMatrix.clone().invert();

  let snappedInward = 0;
  let snappedOutward = 0;
  let skippedFar = 0;
  let rayMisses = 0;

  garmentRoot.traverse(child => {
    if (!child.isMesh || !child.geometry?.attributes?.position) return;

    const posAttr = child.geometry.attributes.position;
    const localVert = new THREE.Vector3();
    const worldVert = new THREE.Vector3();
    const newWorldVert = new THREE.Vector3();
    let modified = false;

    // If the child mesh itself has transforms, we need to account for those too
    child.updateMatrixWorld(true);

    for (let i = 0; i < posAttr.count; i++) {
      localVert.fromBufferAttribute(posAttr, i);

      // ── Transform vertex to world space ─────────────────────────
      // The vertex goes through: childMesh local → garmentRoot local → world
      worldVert.copy(localVert);
      worldVert.applyMatrix4(child.matrixWorld);  // child local → garment local
      // But child.matrixWorld is relative to the garment root, not the scene.
      // We need it relative to the wrapper (which has scale/pos/rot applied)
      // Re-do: get the full chain
      // child sits inside garmentRoot, which sits inside garmentWrapper
      // child.matrixWorld gives us: child → garmentRoot (since garmentRoot is
      // the object attached to the <primitive>). We then multiply by the
      // wrapper's world matrix to get true world position.
      //
      // Actually, since garmentWrapper IS the <primitive> node, and
      // child.matrixWorld is computed recursively from the scene root,
      // child.matrixWorld already includes the wrapper's transform.
      // So worldVert = localVert * child.matrixWorld is already in world space.
      // (We called garmentWrapper.updateMatrixWorld(true) above which
      // propagates down to all children.)

      // Horizontal vector from mannequin center axis to vertex
      const dx = worldVert.x - axisX;
      const dz = worldVert.z - axisZ;
      const horizDist = Math.sqrt(dx * dx + dz * dz);

      if (horizDist < 0.001) continue; // on the center axis, skip

      // yFrac: fractional height on the mannequin (0 = feet, 1 = head)
      const yFrac = mannSize.y > 0.01
        ? (worldVert.y - mannBox.min.y) / mannSize.y
        : 0.5;

      // Skip vertices clearly outside the mannequin's vertical range
      // (e.g. below feet or above head — let them stay untouched)
      if (yFrac < -0.05 || yFrac > 1.05) continue;

      // ── Raycast from center axis toward vertex ──────────────────
      const dirX = dx / horizDist;
      const dirZ = dz / horizDist;

      const rayOrigin = new THREE.Vector3(axisX, worldVert.y, axisZ);
      const rayDir = new THREE.Vector3(dirX, 0, dirZ).normalize();
      raycaster.set(rayOrigin, rayDir);

      const hits = raycaster.intersectObjects(mannMeshes, false);

      if (hits.length === 0) {
        rayMisses++;
        continue;
      }

      // Distance from center axis to mannequin surface
      const surfaceDist = hits[0].distance;
      const fabricOffset = getFabricOffset(yFrac);
      const targetDist = surfaceDist + fabricOffset;

      // How far is the vertex from where it should be?
      const delta = horizDist - targetDist;

      if (Math.abs(delta) < 0.001) continue; // already at the right distance

      // Skip vertices that are very far from the body — these are likely
      // intentional design elements (wide sleeves, flared hems, etc.)
      if (Math.abs(delta) > MAX_SNAP_DISTANCE) {
        skippedFar++;
        continue;
      }

      // ── Compute new position ────────────────────────────────────
      let newDist;
      if (delta < 0) {
        // Vertex is INSIDE the body → push outward (full strength)
        newDist = horizDist - delta * SNAP_STRENGTH_OUTWARD;
        snappedOutward++;
      } else {
        // Vertex is OUTSIDE (floating) → pull inward (partial strength
        // to preserve garment shape)
        newDist = horizDist - delta * SNAP_STRENGTH_INWARD;
        snappedInward++;
      }

      // New world position for this vertex
      newWorldVert.set(
        axisX + dirX * newDist,
        worldVert.y,
        axisZ + dirZ * newDist
      );

      // ── Transform back to local space ───────────────────────────
      // Inverse of child.matrixWorld brings us from world → child local
      const invChildWorld = child.matrixWorld.clone().invert();
      newWorldVert.applyMatrix4(invChildWorld);

      posAttr.setX(i, newWorldVert.x);
      posAttr.setY(i, newWorldVert.y); // keep Y unchanged conceptually,
      posAttr.setZ(i, newWorldVert.z); // but inverse transform may shift it

      modified = true;
    }

    if (modified) {
      posAttr.needsUpdate = true;
      if (child.geometry.attributes.normal) {
        child.geometry.computeVertexNormals();
      }
      child.geometry.computeBoundingBox();
      child.geometry.computeBoundingSphere();
    }
  });

  console.log(
    `🧥 Surface snap: ${snappedOutward} pushed out, ${snappedInward} pulled in, ` +
    `${skippedFar} too far (preserved), ${rayMisses} ray misses`
  );
}


// ─────────────────────────────────────────────
//  COMPONENTS
// ─────────────────────────────────────────────
const PhysicsGarment = ({ garmentData, mannequinRef, measurements }) => {
  const modelUrl = garmentData?.modelUrl;
  if (!modelUrl) return null;

  const fullModelUrl = modelUrl.startsWith('http')
    ? modelUrl
    : `http://localhost:5000${modelUrl}`;

  return (
    <Suspense fallback={<LoadingIndicator />}>
      <GarmentMesh
        modelUrl={fullModelUrl}
        garmentData={garmentData}
        mannequinRef={mannequinRef}
        measurements={measurements}
      />
    </Suspense>
  );
};

const GarmentMesh = ({ modelUrl, garmentData, mannequinRef, measurements }) => {
  const meshRef = useRef();
  const conformedRef = useRef(false); // ensure snap runs only once
  const adaptedRef = useRef(false);   // ensure morph/lattice runs only once
  const frameCount = useRef(0);       // wait a few frames before snapping
  const gltf = useLoader(GLTFLoader, modelUrl);

  const bodyZone = useMemo(() => detectBodyZone(garmentData), [garmentData]);

  // ── One-time normalization ──────────────────────────────────────────
  // Clone + normalize + compute scale/anchor ONCE per model
  const normalized = useMemo(() => {
    const mesh = gltf.scene.clone(true);

    mesh.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Run the full normalization pipeline
    const result = normalizeGarment(mesh, garmentData, measurements, mannequinRef);

    // Reset flags — new model needs fresh conform + adapt
    conformedRef.current = false;
    adaptedRef.current = false;
    frameCount.current = 0;

    return result;
  }, [gltf, garmentData.name, garmentData.type]);

  // ── One-time morph/lattice adaptation ───────────────────────────────
  // Runs once when measurements or normalized mesh are available
  useMemo(() => {
    if (adaptedRef.current) return;
    if (!normalized?.mesh || !measurements) return;

    // Find the mannequin's morphable mesh (if available)
    let mannequinMesh = null;
    if (mannequinRef?.current) {
      mannequinRef.current.traverse(child => {
        if (child.isMesh && child.morphTargetDictionary && !mannequinMesh) {
          mannequinMesh = child;
        }
      });
    }

    adaptGarmentToBody(normalized.mesh, mannequinMesh, measurements, bodyZone);
    adaptedRef.current = true;
  }, [normalized, measurements, bodyZone]);

  // ── Per-frame: position + rotation tracking only ───────────────────
  // Scale is computed ONCE in normalization. Only anchor position and
  // rotation follow the mannequin per frame (very cheap).
  useFrame(() => {
    if (!meshRef.current || !mannequinRef?.current || !normalized) return;

    mannequinRef.current.updateMatrixWorld(true);

    // Match mannequin rotation + Y correction
    mannequinRef.current.getWorldQuaternion(_quat);
    _quat.multiply(_correction);

    // Recompute anchor Y from live landmarks (they move with morph targets)
    let anchorY = normalized.anchorY;

    const getLandmarks = mannequinRef.current.getLiveLandmarks;
    if (getLandmarks) {
      const lm = getLandmarks();

      let anchorNode;
      if (bodyZone === 'upper') {
        anchorNode = lm['landmark_neck'] || lm['landmark_shoulder_L'];
      } else {
        anchorNode = lm['landmark_waist'] || lm['landmark_hips'];
      }

      if (anchorNode) {
        anchorNode.updateWorldMatrix(true, false);
        anchorNode.getWorldPosition(_anchorPos);
        anchorY = _anchorPos.y;
      }
    }

    // Position: centered on X/Z, anchored on Y with top-offset
    _finalPos.set(0, anchorY - normalized.garmentTopOffset * normalized.scale, 0);

    meshRef.current.position.copy(_finalPos);
    meshRef.current.quaternion.copy(_quat);
    meshRef.current.scale.setScalar(normalized.scale);

    // ── ONE-TIME SURFACE SNAP ──────────────────────────────────────
    // Wait a few frames so the garment is fully positioned and the
    // world matrices are up to date before snapping.
    frameCount.current++;

    if (!conformedRef.current && normalized.scale > 0.01 && mannequinRef.current && frameCount.current > 5) {
      conformedRef.current = true;

      // Must be in the NEXT frame so all matrices are fully propagated
      requestAnimationFrame(() => {
        if (!meshRef.current || !mannequinRef.current) return;
        meshRef.current.updateMatrixWorld(true);
        applySurfaceSnap(normalized.mesh, meshRef.current, mannequinRef.current);
      });
    }
  });

  return <primitive ref={meshRef} object={normalized.mesh} />;
};

const LoadingIndicator = () => (
  <mesh position={[0, 1, 0]}>
    <boxGeometry args={[0.3, 0.6, 0.2]} />
    <meshStandardMaterial color="#cccccc" transparent opacity={0.3} wireframe />
  </mesh>
);

export default PhysicsGarment;