// src/utils/garmentMorphAdapter.js
// ═══════════════════════════════════════════════════════════════════
//  GARMENT MORPH ADAPTER
//
//  Adapts garments to match the mannequin's body shape changes.
//  Two strategies:
//
//  1. MORPH TARGET PATH (template GLBs with shape keys):
//     Read the mannequin's morph influences and mirror them onto
//     matching garment morph targets.
//
//  2. LATTICE DEFORMATION PATH (TripoSR / depth-generated meshes):
//     Define virtual control points at body zones (bust, waist, hips)
//     and warp garment vertices using smooth inverse-distance falloff.
//     Cheap, runs once, no shape keys needed in the GLB.
// ═══════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ─────────────────────────────────────────────
//  MORPH TARGET MAPPING (garments WITH shape keys)
// ─────────────────────────────────────────────

// Maps mannequin morph names → garment morph names.
// If a garment has the exact same key, we use it directly.
// Otherwise we try these aliases.
const MORPH_ALIASES = {
    bust_large: ['bust_large', 'chest_large', 'bust_expand'],
    bust_small: ['bust_small', 'chest_small', 'bust_shrink'],
    waist_wide: ['waist_wide', 'waist_expand', 'belly_expand'],
    waist_narrow: ['waist_narrow', 'waist_shrink'],
    hips_wide: ['hips_wide', 'hip_expand', 'hips_expand'],
    hips_narrow: ['hips_narrow', 'hip_shrink', 'hips_shrink'],
    shoulders_broad: ['shoulders_broad', 'shoulder_wide', 'shoulders_wide'],
    shoulders_narrow: ['shoulders_narrow', 'shoulder_narrow'],
    height_tall: ['height_tall', 'length_long'],
    height_short: ['height_short', 'length_short'],
    weight_heavy: ['weight_heavy', 'body_large', 'overall_expand'],
    weight_light: ['weight_light', 'body_slim', 'overall_shrink'],
};

/**
 * Apply morph targets to a garment mesh that has matching shape keys.
 *
 * @param {THREE.Mesh} garmentMesh  - The morphable garment mesh
 * @param {THREE.Mesh} mannequinMesh - The morphable mannequin mesh
 * @returns {number} Number of morph targets successfully mapped
 */
export function applyMorphTargets(garmentMesh, mannequinMesh) {
    if (!garmentMesh?.morphTargetDictionary || !mannequinMesh?.morphTargetDictionary) {
        return 0;
    }

    const gDict = garmentMesh.morphTargetDictionary;
    const gInfluences = garmentMesh.morphTargetInfluences;
    const mDict = mannequinMesh.morphTargetDictionary;
    const mInfluences = mannequinMesh.morphTargetInfluences;

    let mapped = 0;

    for (const [mannKey, mannIdx] of Object.entries(mDict)) {
        const mannValue = mInfluences[mannIdx] || 0;
        if (Math.abs(mannValue) < 0.01) continue; // skip near-zero

        // Try to find matching garment morph
        const aliases = MORPH_ALIASES[mannKey] || [mannKey];
        let found = false;

        for (const alias of aliases) {
            if (gDict[alias] !== undefined) {
                gInfluences[gDict[alias]] = mannValue;
                mapped++;
                found = true;
                break;
            }
        }

        if (!found && mannValue > 0.1) {
            console.log(`   ℹ️ Garment missing morph "${mannKey}" (value=${mannValue.toFixed(2)})`);
        }
    }

    if (mapped > 0) {
        garmentMesh.morphTargetInfluences = [...gInfluences];
        console.log(`   ✅ Mapped ${mapped} morph targets from mannequin → garment`);
    }

    return mapped;
}

// ─────────────────────────────────────────────
//  LATTICE DEFORMATION (garments WITHOUT shape keys)
// ─────────────────────────────────────────────

// Baseline body measurements (the "default" mannequin shape)
const BASELINE = {
    bust_cm: 90,
    waist_cm: 70,
    hips_cm: 95,
    shoulder_width_cm: 40,
};

// Body zone Y-fractions and which measurement drives them
const DEFORM_ZONES = [
    {
        name: 'shoulder',
        yFrac: 0.84,     // fraction from bottom of garment
        radius: 0.12,    // falloff radius (fraction of garment height)
        axis: 'x',       // deform along X axis
        measureKey: 'shoulder_width_cm',
        baseline: BASELINE.shoulder_width_cm,
    },
    {
        name: 'bust',
        yFrac: 0.68,
        radius: 0.14,
        axis: 'xz',      // deform along both X and Z
        measureKey: 'bust_cm',
        baseline: BASELINE.bust_cm,
        isCircumference: true,
    },
    {
        name: 'waist',
        yFrac: 0.51,
        radius: 0.12,
        axis: 'xz',
        measureKey: 'waist_cm',
        baseline: BASELINE.waist_cm,
        isCircumference: true,
    },
    {
        name: 'hips',
        yFrac: 0.39,
        radius: 0.15,
        axis: 'xz',
        measureKey: 'hips_cm',
        baseline: BASELINE.hips_cm,
        isCircumference: true,
    },
];

/**
 * Apply lattice-style deformation to a garment mesh based on body measurements.
 * This runs ONCE after normalization — no shape keys required.
 *
 * For each body zone (bust, waist, hips, shoulders), we compute
 * a scale delta from the baseline and apply a smooth Gaussian-like
 * falloff to nearby vertices.
 *
 * @param {THREE.Object3D} garmentMesh  - The normalized garment mesh
 * @param {object}         measurements - { bust_cm, waist_cm, hips_cm, shoulder_width_cm }
 * @param {string}         bodyZone     - 'upper' or 'lower'
 * @returns {number} Number of vertices deformed
 */
export function applyLatticeDeformation(garmentMesh, measurements, bodyZone) {
    if (!measurements) return 0;

    let totalDeformed = 0;

    garmentMesh.traverse(child => {
        if (!child.isMesh || !child.geometry?.attributes?.position) return;

        const posAttr = child.geometry.attributes.position;
        const bbox = new THREE.Box3().setFromObject(child);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        bbox.getSize(size);
        bbox.getCenter(center);

        if (size.y < 0.001) return; // degenerate mesh

        const bottomY = bbox.min.y;
        const height = size.y;

        const vertex = new THREE.Vector3();
        let modified = false;

        for (const zone of DEFORM_ZONES) {
            // Only apply zones relevant to this body region
            if (bodyZone === 'upper' && zone.yFrac < 0.45) continue;  // skip hips for tops
            if (bodyZone === 'lower' && zone.yFrac > 0.55) continue;  // skip bust/shoulders for bottoms

            const rawMeasure = measurements[zone.measureKey] || zone.baseline;
            let scaleRatio;

            if (zone.isCircumference) {
                // Circumference ratio → radius ratio
                scaleRatio = rawMeasure / zone.baseline;
            } else {
                scaleRatio = rawMeasure / zone.baseline;
            }

            // Skip if nearly default (< 3% change)
            if (Math.abs(scaleRatio - 1.0) < 0.03) continue;

            const delta = scaleRatio - 1.0; // positive = expand, negative = shrink
            const zoneWorldY = bottomY + height * zone.yFrac;
            const falloffRadius = height * zone.radius;

            for (let i = 0; i < posAttr.count; i++) {
                vertex.fromBufferAttribute(posAttr, i);

                // Distance from zone center (Y axis)
                const dy = Math.abs(vertex.y - zoneWorldY);
                if (dy > falloffRadius) continue;

                // Gaussian-like falloff: strongest at center, zero at radius
                const t = dy / falloffRadius;
                const weight = Math.exp(-3.0 * t * t); // smooth bell curve

                // Apply deformation
                if (zone.axis === 'x' || zone.axis === 'xz') {
                    const offsetX = (vertex.x - center.x) * delta * weight;
                    posAttr.setX(i, vertex.x + offsetX);
                }
                if (zone.axis === 'xz' || zone.axis === 'z') {
                    const offsetZ = (vertex.z - center.z) * delta * weight;
                    posAttr.setZ(i, vertex.z + offsetZ);
                }

                if (weight > 0.01) totalDeformed++;
                modified = true;
            }
        }

        if (modified) {
            posAttr.needsUpdate = true;
            if (child.geometry.attributes.normal) {
                child.geometry.computeVertexNormals();
            }
        }
    });

    if (totalDeformed > 0) {
        console.log(`   🔩 Lattice deformation: ${totalDeformed} vertex adjustments across ${DEFORM_ZONES.length} zones`);
    }

    return totalDeformed;
}

// ─────────────────────────────────────────────
//  UNIFIED ADAPTER
// ─────────────────────────────────────────────

/**
 * Adapt a garment to match the mannequin's body shape.
 * Automatically chooses morph targets or lattice deformation.
 *
 * @param {THREE.Object3D} garmentMesh    - The garment mesh (already normalized)
 * @param {THREE.Mesh|null} mannequinMesh - The mannequin's morphable mesh (if available)
 * @param {object}          measurements  - Body measurements
 * @param {string}          bodyZone      - 'upper' or 'lower'
 */
export function adaptGarmentToBody(garmentMesh, mannequinMesh, measurements, bodyZone) {
    console.log(`🧬 Adapting garment to body shape (zone=${bodyZone})...`);

    // Try morph targets first (for template garments with shape keys)
    let morphableChild = null;
    garmentMesh.traverse(child => {
        if (child.isMesh && child.morphTargetDictionary && !morphableChild) {
            morphableChild = child;
        }
    });

    if (morphableChild && mannequinMesh) {
        const mapped = applyMorphTargets(morphableChild, mannequinMesh);
        if (mapped > 0) {
            console.log(`   ✅ Used morph target path (${mapped} targets)`);
            return;
        }
    }

    // Fall back to lattice deformation
    const deformed = applyLatticeDeformation(garmentMesh, measurements, bodyZone);
    if (deformed > 0) {
        console.log(`   ✅ Used lattice deformation path`);
    } else {
        console.log(`   ℹ️ No deformation needed (measurements near baseline)`);
    }
}

export default { applyMorphTargets, applyLatticeDeformation, adaptGarmentToBody };
