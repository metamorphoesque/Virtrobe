// src/utils/garmentNormalizer.js
// ═══════════════════════════════════════════════════════════════════
//  GARMENT NORMALIZER — One-time scale/position pipeline
//
//  Every garment (TripoSR, template, depth-mesh) passes through
//  this ONCE on load.  Output: a mesh at the correct world-space
//  scale + metadata for anchor positioning.
//
//  Replaces the fragile per-frame scaling in PhysicsGarment.
// ═══════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import meshStandardizer from './meshStandardizer';

// ─────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────

// Body-zone height fractions (fraction of full mannequin height)
const BODY_ZONES = {
    upper: {
        // Tops: neck → waist
        topFrac: 0.84,    // neck
        bottomFrac: 0.51,  // waist
        anchorFrac: 0.84,  // anchor at neck
        sliceBand: [0.80, 1.0], // shoulder slice = top 20% of garment
        measurementKey: 'shoulder_width_cm',
        measurementBaseline: 40, // cm
    },
    lower: {
        // Bottoms: waist → ankle
        topFrac: 0.51,    // waist
        bottomFrac: 0.02,  // ankle
        anchorFrac: 0.51,  // anchor at waist
        sliceBand: [0.85, 1.0], // waistband slice = top 15% of garment
        measurementKey: 'hips_cm',
        measurementBaseline: 95, // cm
        useCircumference: true,  // hips_cm is circumference, need diameter
    },
};

// Names that indicate a bottom garment
const BOTTOM_NAMES = new Set([
    'pant', 'pants', 'skirt', 'short', 'shorts', 'trouser', 'trousers',
    'jeans', 'legging', 'leggings', 'bottom', 'bottoms',
]);

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

/**
 * Detect whether a garment is upper or lower body.
 */
function detectBodyZone(garmentData) {
    const name = (garmentData.name || '').toLowerCase();
    const type = (garmentData.category || garmentData.type || '').toLowerCase();
    const combined = `${name} ${type}`;

    for (const keyword of BOTTOM_NAMES) {
        if (combined.includes(keyword)) return 'lower';
    }
    return 'upper';
}

/**
 * Detect the source of a garment mesh for orientation correction.
 */
function detectSource(garmentData) {
    if (garmentData.isTemplate || garmentData.fromCache) return 'template';
    if (garmentData.modelUrl?.includes('triposr') ||
        garmentData.modelUrl?.includes('huggingface')) return 'triposr';
    if (garmentData.modelUrl?.includes('localhost:5000')) return 'triposr';
    return 'unknown';
}

/**
 * Measure the width of a horizontal slice of the mesh.
 * yMinFrac / yMaxFrac are fractions of the mesh's total height.
 * Returns the X-axis span of vertices in that band.
 */
function measureSliceWidth(mesh, yMinFrac, yMaxFrac) {
    mesh.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    const yBandMin = bbox.min.y + size.y * yMinFrac;
    const yBandMax = bbox.min.y + size.y * yMaxFrac;

    let minX = Infinity, maxX = -Infinity, found = 0;

    mesh.traverse(child => {
        if (!child.isMesh || !child.geometry?.attributes?.position) return;
        const pos = child.geometry.attributes.position;
        const vertex = new THREE.Vector3();

        for (let i = 0; i < pos.count; i++) {
            vertex.fromBufferAttribute(pos, i);
            // Apply the child's local transform to get mesh-space coordinates
            child.localToWorld(vertex);

            if (vertex.y >= yBandMin && vertex.y <= yBandMax) {
                minX = Math.min(minX, vertex.x);
                maxX = Math.max(maxX, vertex.x);
                found++;
            }
        }
    });

    if (found < 5) {
        console.warn(`⚠️ garmentNormalizer: slice [${yMinFrac}–${yMaxFrac}] only ${found} verts, using full bbox X`);
        return size.x;
    }

    return maxX - minX;
}

// ─────────────────────────────────────────────
//  MAIN NORMALIZER
// ─────────────────────────────────────────────

/**
 * Normalize a garment mesh and compute fitting metadata.
 *
 * @param {THREE.Object3D} mesh       - The raw garment scene (cloned)
 * @param {object}         garmentData - { name, type, category, modelUrl, isTemplate, ... }
 * @param {object}         measurements - { height_cm, bust_cm, waist_cm, hips_cm, shoulder_width_cm, ... }
 * @param {THREE.Object3D} mannequinRef - Reference to the mannequin group (for world-space bounds)
 *
 * @returns {{ mesh, scale, anchorY, bodyZone, garmentHeight, garmentTopOffset }}
 */
export function normalizeGarment(mesh, garmentData, measurements, mannequinRef) {
    const bodyZone = detectBodyZone(garmentData);
    const source = detectSource(garmentData);
    const zone = BODY_ZONES[bodyZone];

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔧 NORMALIZING "${garmentData.name}" | zone=${bodyZone} | source=${source}`);

    // ── Step 1: Reset transforms ─────────────────────────────────────────
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
    mesh.updateMatrixWorld(true);

    // ── Step 2: Orientation correction (via meshStandardizer) ────────────
    meshStandardizer.applyStandardization(mesh, source);
    // After this, mesh height (Y) is normalized to ~1.0, centered at origin

    // ── Step 3: Get mannequin world-space dimensions ─────────────────────
    let mannWorldHeight = 1.6; // fallback
    let mannCenter = new THREE.Vector3(0, 1, 0);
    let mannMin = 0;

    if (mannequinRef?.current) {
        mannequinRef.current.updateMatrixWorld(true);
        const mannBox = new THREE.Box3().setFromObject(mannequinRef.current);
        const mannSize = new THREE.Vector3();
        mannBox.getSize(mannSize);
        mannBox.getCenter(mannCenter);
        mannWorldHeight = mannSize.y;
        mannMin = mannBox.min.y;
    }

    const personHeight_cm = measurements?.height_cm || 170;
    const worldPerCm = mannWorldHeight / personHeight_cm;

    // ── Step 4: Compute the body-zone height in world units ──────────────
    const zoneWorldHeight = mannWorldHeight * (zone.topFrac - zone.bottomFrac);

    // ── Step 5: Measure the garment's relevant width at the anchor slice ─
    const garmentSliceWidth = measureSliceWidth(mesh, zone.sliceBand[0], zone.sliceBand[1]);

    // ── Step 6: Compute the target width from measurements ───────────────
    const rawMeasurement = measurements?.[zone.measurementKey] || zone.measurementBaseline;
    let targetWidth_cm = rawMeasurement;

    if (zone.useCircumference) {
        // Convert circumference to diameter (front-facing width)
        targetWidth_cm = rawMeasurement / Math.PI;
    }

    const targetWorldWidth = targetWidth_cm * worldPerCm;

    // ── Step 7: Compute uniform scale ────────────────────────────────────
    // Scale so the garment's relevant slice matches the mannequin's body width
    let scale = garmentSliceWidth > 0.001 ? targetWorldWidth / garmentSliceWidth : 1;

    // Safety clamp — don't allow absurd scales
    scale = Math.max(0.1, Math.min(5.0, scale));

    // For bottoms, add a small ease factor (garments are slightly wider than body)
    if (bodyZone === 'lower') {
        scale *= 1.08;
    }

    // ── Step 8: Compute anchor Y position ────────────────────────────────
    let anchorY;
    if (mannequinRef?.current) {
        const getLandmarks = mannequinRef.current.getLiveLandmarks;
        if (getLandmarks) {
            const lm = getLandmarks();
            const anchorLandmark = bodyZone === 'upper'
                ? (lm['landmark_neck'] || lm['landmark_shoulder_left'])
                : (lm['landmark_waist'] || lm['landmark_hips']);

            if (anchorLandmark) {
                anchorLandmark.updateWorldMatrix(true, false);
                const pos = new THREE.Vector3();
                anchorLandmark.getWorldPosition(pos);
                anchorY = pos.y;
            }
        }
    }

    // Fallback: use body zone fraction
    if (anchorY === undefined) {
        anchorY = mannMin + mannWorldHeight * zone.anchorFrac;
    }

    // ── Step 9: Compute garment top offset for positioning ───────────────
    const gBox = new THREE.Box3().setFromObject(mesh);
    const gSize = new THREE.Vector3();
    gBox.getSize(gSize);
    const garmentTopOffset = gSize.y / 2;

    console.log(`   mannequin: worldH=${mannWorldHeight.toFixed(3)}, worldPerCm=${worldPerCm.toFixed(5)}`);
    console.log(`   garment slice width: ${garmentSliceWidth.toFixed(4)}`);
    console.log(`   target: ${rawMeasurement}cm → ${targetWorldWidth.toFixed(4)} world units`);
    console.log(`   scale: ${scale.toFixed(4)}`);
    console.log(`   anchorY: ${anchorY.toFixed(4)}`);
    console.log('✅ Normalization complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
        mesh,
        scale,
        anchorY,
        bodyZone,
        garmentHeight: gSize.y,
        garmentTopOffset,
        garmentSliceWidth,
        zoneWorldHeight,
    };
}

export { detectBodyZone, measureSliceWidth, BODY_ZONES };
export default { normalizeGarment, detectBodyZone, measureSliceWidth };
