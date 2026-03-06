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

        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            if (y >= yBandMin && y <= yBandMax) {
                minX = Math.min(minX, pos.getX(i));
                maxX = Math.max(maxX, pos.getX(i));
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
    const zone = BODY_ZONES[bodyZone];

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔧 NORMALIZING "${garmentData.name}" | zone=${bodyZone}`);

    // ── Step 1: Reset transforms (keep native scale) ─────────────────────
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
    mesh.updateMatrixWorld(true);

    // ── Step 2: Get mannequin world-space dimensions ─────────────────────
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

    // ── Step 3: Compute the body-zone height in world units ──────────────
    const zoneWorldHeight = mannWorldHeight * (zone.topFrac - zone.bottomFrac);

    // ── Step 4: Measure the garment's relevant width at the anchor slice ─
    const garmentSliceWidth = measureSliceWidth(mesh, zone.sliceBand[0], zone.sliceBand[1]);

    // ── Step 5: Compute the target width from measurements ───────────────
    const rawMeasurement = measurements?.[zone.measurementKey] || zone.measurementBaseline;
    let targetWidth_cm = rawMeasurement;

    if (zone.useCircumference) {
        // Convert circumference to diameter (front-facing width)
        targetWidth_cm = rawMeasurement / Math.PI;
    }

    const targetWorldWidth = targetWidth_cm * worldPerCm;

    // ── Step 6: Compute uniform scale ────────────────────────────────────
    // Scale so the garment's relevant slice matches the mannequin's body width
    let scale = garmentSliceWidth > 0.001 ? targetWorldWidth / garmentSliceWidth : 1;

    // Safety clamp — don't allow absurd scales
    scale = Math.max(0.05, Math.min(5.0, scale));

    // Ease factor — garments should be slightly wider than the raw body
    // measurement so the surface-snap pass can pull them inward to conform.
    // Without ease, the garment starts skin-tight and can only be pushed
    // outward, leaving floating gaps on concave regions.
    if (bodyZone === 'lower') {
        scale *= 1.08;  // bottoms need more ease (hips + movement room)
    } else {
        scale *= 1.05;  // tops need slight ease (shoulders + chest)
    }

    // ── Step 7: Compute anchor Y position ────────────────────────────────
    let anchorY;
    if (mannequinRef?.current) {
        const getLandmarks = mannequinRef.current.getLiveLandmarks;
        if (getLandmarks) {
            const lm = getLandmarks();
            const anchorLandmark = bodyZone === 'upper'
                ? (lm['landmark_neck'] || lm['landmark_shoulder_L'])
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

    // ── Step 8: Compute garment top offset for positioning ───────────────
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
