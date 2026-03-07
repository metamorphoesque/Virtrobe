// src/services/GarmentFitter.js
// ═══════════════════════════════════════════════════════════════════
//  GARMENT FITTER — Single service for fitting any garment (template
//  or TripoSR) onto the morphable mannequin.
//
//  Three main methods:
//    measureGarment()    – samples mesh widths at body-zone Y fractions
//    fitToMannequin()    – per-axis scale + anchor positioning
//    applyMorphDeltas()  – shape keys (if available) OR cage deformer
//
//  No cloth simulation. No per-frame vertex work. Browser-safe.
// ═══════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ─────────────────────────────────────────────
//  BASELINE LANDMARKS (world-space Y values)
//  Derived from log output at default measurements:
//    female: 170cm, bust 90, waist 70, hips 95, shoulders 40
//    male:   170cm, bust 95, waist 80, hips 95, shoulders 44
//  Group scale = 0.5, standHeight ≈ 0.565
// ─────────────────────────────────────────────

const BASELINE_LANDMARKS = {
    female: {
        landmark_neck: { y: 2.3252 },
        landmark_shoulder_L: { y: 2.2813 },
        landmark_shoulder_R: { y: 2.2813 },
        landmark_waist: { y: 1.7739 },
        landmark_hips: { y: 1.6641 },
    },
    male: {
        landmark_neck: { y: 2.3717 },
        landmark_shoulder_L: { y: 2.3125 },
        landmark_shoulder_R: { y: 2.3125 },
        landmark_waist: { y: 1.7739 },
        landmark_hips: { y: 1.5892 },
    },
};

// Default measurements that correspond to the baseline landmarks above
const BASELINE_MEASUREMENTS = {
    female: { bust_cm: 90, waist_cm: 70, hips_cm: 95, shoulder_width_cm: 40, height_cm: 170 },
    male: { bust_cm: 95, waist_cm: 80, hips_cm: 95, shoulder_width_cm: 44, height_cm: 170 },
};

// ─────────────────────────────────────────────
//  BODY ZONE DETECTION
// ─────────────────────────────────────────────

const BOTTOM_KEYWORDS = new Set([
    'pant', 'pants', 'skirt', 'short', 'shorts', 'trouser', 'trousers',
    'jeans', 'legging', 'leggings', 'bottom', 'bottoms',
]);

// ─────────────────────────────────────────────
//  MORPH TARGET ALIASES
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
//  CAGE DEFORMER CONSTANTS
// ─────────────────────────────────────────────

// Cage control rows — Y fractions of the garment (0 = bottom, 1 = top)
// Each row maps to a landmark region on the mannequin
const CAGE_ROWS_UPPER = [
    { name: 'shoulders', yFrac: 0.92, landmark: 'landmark_shoulder_L', axis: 'x', radius: 0.10 },
    { name: 'bust', yFrac: 0.72, landmark: 'landmark_neck', axis: 'xz', radius: 0.14 },
    { name: 'waist', yFrac: 0.35, landmark: 'landmark_waist', axis: 'xz', radius: 0.18 },
    { name: 'hem', yFrac: 0.05, landmark: 'landmark_hips', axis: 'xz', radius: 0.12 },
];

const CAGE_ROWS_LOWER = [
    { name: 'waistband', yFrac: 0.95, landmark: 'landmark_waist', axis: 'xz', radius: 0.10 },
    { name: 'hips', yFrac: 0.80, landmark: 'landmark_hips', axis: 'xz', radius: 0.16 },
    { name: 'thigh', yFrac: 0.50, landmark: 'landmark_hips', axis: 'xz', radius: 0.18 },
    { name: 'knee', yFrac: 0.20, landmark: 'landmark_hips', axis: 'xz', radius: 0.14 },
];

// ─────────────────────────────────────────────
//  EASE FACTORS — garment sits slightly larger
//  than the raw body to avoid poke-through
// ─────────────────────────────────────────────

const EASE = {
    upper: { x: 1.08, z: 1.10 },  // tops are wider + deeper than skin
    lower: { x: 1.10, z: 1.12 },  // bottoms need more room (hips + movement)
};


// ═══════════════════════════════════════════════════════════════════
//  GARMENT FITTER CLASS
// ═══════════════════════════════════════════════════════════════════

class GarmentFitter {

    // ───────────────────────────────────────────
    //  detectBodyZone(garmentData)
    //  Returns 'upper' or 'lower'
    // ───────────────────────────────────────────

    static detectBodyZone(garmentData) {
        const name = (garmentData?.name || '').toLowerCase();
        const type = (garmentData?.category || garmentData?.type || '').toLowerCase();
        const slot = (garmentData?.slot || '').toLowerCase();
        const combined = `${name} ${type} ${slot}`;

        for (const keyword of BOTTOM_KEYWORDS) {
            if (combined.includes(keyword)) return 'lower';
        }
        if (slot === 'lower') return 'lower';
        return 'upper';
    }

    // ───────────────────────────────────────────
    //  measureGarment(garmentRoot)
    //
    //  Samples the mesh at standard Y fractions
    //  (shoulder / bust / waist / hips) and returns
    //  widths in garment-local units.
    //
    //  NOTE: Call BEFORE any scaling is applied.
    // ───────────────────────────────────────────

    static measureGarment(garmentRoot) {
        garmentRoot.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(garmentRoot);
        const size = new THREE.Vector3();
        bbox.getSize(size);

        if (size.y < 0.001) {
            console.warn('⚠️ GarmentFitter.measureGarment: garment has zero height');
            return { shoulderWidth: size.x, bustWidth: size.x, waistWidth: size.x, hipsWidth: size.x, torsoHeight: size.y };
        }

        // Y fractions for each body zone (0 = bottom of garment, 1 = top)
        const slices = {
            shoulder: { yMinFrac: 0.88, yMaxFrac: 1.00 },
            bust: { yMinFrac: 0.65, yMaxFrac: 0.78 },
            waist: { yMinFrac: 0.35, yMaxFrac: 0.48 },
            hips: { yMinFrac: 0.15, yMaxFrac: 0.28 },
        };

        const measure = (yMinFrac, yMaxFrac) => {
            const yBandMin = bbox.min.y + size.y * yMinFrac;
            const yBandMax = bbox.min.y + size.y * yMaxFrac;

            let minX = Infinity, maxX = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;
            let found = 0;

            garmentRoot.traverse(child => {
                if (!child.isMesh || !child.geometry?.attributes?.position) return;
                const pos = child.geometry.attributes.position;
                // If child has own transforms, apply them
                child.updateMatrixWorld(true);
                const v = new THREE.Vector3();

                for (let i = 0; i < pos.count; i++) {
                    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
                    // Transform to garment-root-local space
                    v.applyMatrix4(child.matrixWorld);
                    // Then undo garment root's world transform to stay in garment-local
                    v.applyMatrix4(garmentRoot.matrixWorld.clone().invert());

                    if (v.y >= yBandMin && v.y <= yBandMax) {
                        minX = Math.min(minX, v.x);
                        maxX = Math.max(maxX, v.x);
                        minZ = Math.min(minZ, v.z);
                        maxZ = Math.max(maxZ, v.z);
                        found++;
                    }
                }
            });

            if (found < 3) return { width: size.x, depth: size.z };
            return { width: maxX - minX, depth: maxZ - minZ };
        };

        const shoulder = measure(slices.shoulder.yMinFrac, slices.shoulder.yMaxFrac);
        const bust = measure(slices.bust.yMinFrac, slices.bust.yMaxFrac);
        const waist = measure(slices.waist.yMinFrac, slices.waist.yMaxFrac);
        const hips = measure(slices.hips.yMinFrac, slices.hips.yMaxFrac);

        const result = {
            shoulderWidth: shoulder.width,
            shoulderDepth: shoulder.depth,
            bustWidth: bust.width,
            bustDepth: bust.depth,
            waistWidth: waist.width,
            waistDepth: waist.depth,
            hipsWidth: hips.width,
            hipsDepth: hips.depth,
            torsoHeight: size.y,
            totalWidth: size.x,
            totalDepth: size.z,
        };

        console.log(`📏 GarmentFitter.measureGarment:`, result);
        return result;
    }

    // ───────────────────────────────────────────
    //  fitToMannequin(garmentRoot, liveLandmarks,
    //                 measurements, bodyZone)
    //
    //  Computes per-axis scale (X/Z independently)
    //  from measurement ratios. Positions top of
    //  garment at anchor landmark.
    //
    //  Returns { scaleX, scaleY, scaleZ, positionY,
    //            anchorLandmarkName }
    // ───────────────────────────────────────────

    static fitToMannequin(garmentRoot, liveLandmarks, measurements, bodyZone) {
        const gender = measurements?.gender || 'female';
        const baseline = BASELINE_LANDMARKS[gender] || BASELINE_LANDMARKS.female;
        const baseM = BASELINE_MEASUREMENTS[gender] || BASELINE_MEASUREMENTS.female;
        const ease = EASE[bodyZone] || EASE.upper;

        // ── 1. Measure the garment at its native scale ─────────────────
        garmentRoot.position.set(0, 0, 0);
        garmentRoot.quaternion.identity();
        garmentRoot.scale.set(1, 1, 1);
        garmentRoot.updateMatrixWorld(true);

        const gMeas = GarmentFitter.measureGarment(garmentRoot);

        // ── 2. Get live landmark world positions ───────────────────────
        const lmPos = GarmentFitter._getLandmarkPositions(liveLandmarks);

        // ── 3. Compute target body-zone dimensions ────────────────────
        let targetWidth, targetDepth, targetHeight;
        let anchorLandmarkName;

        if (bodyZone === 'upper') {
            anchorLandmarkName = 'landmark_neck';

            // Shoulder width in world units
            const shoulderL = lmPos.landmark_shoulder_L;
            const shoulderR = lmPos.landmark_shoulder_R;
            if (shoulderL && shoulderR) {
                targetWidth = Math.abs(shoulderL.x - shoulderR.x);
            } else {
                // Fallback: use measurement ratio vs baseline
                const ratio = (measurements?.shoulder_width_cm || 40) / baseM.shoulder_width_cm;
                const baselineShoulderSpan = Math.abs(
                    (baseline.landmark_shoulder_L?.y || 2.28) - (baseline.landmark_shoulder_R?.y || 2.28)
                );
                // Shoulders are along X axis; approximate from measurement ratio
                targetWidth = ratio * 0.38; // ~0.38 world units at baseline
            }

            // Torso height: neck → waist
            const neckY = lmPos.landmark_neck?.y ?? baseline.landmark_neck.y;
            const waistY = lmPos.landmark_waist?.y ?? baseline.landmark_waist.y;
            targetHeight = Math.abs(neckY - waistY);

            // Depth from bust circumference → diameter
            const bustCm = measurements?.bust_cm || baseM.bust_cm;
            const bustDiameter = bustCm / Math.PI;
            const worldPerCm = targetHeight / ((measurements?.height_cm || 170) * 0.33);
            // 0.33 ≈ fraction of total height that is neck-to-waist
            targetDepth = bustDiameter * worldPerCm;

        } else {
            // Lower body
            anchorLandmarkName = 'landmark_waist';

            const waistY = lmPos.landmark_waist?.y ?? baseline.landmark_waist.y;
            const hipsY = lmPos.landmark_hips?.y ?? baseline.landmark_hips.y;

            // Width from hips circumference → diameter
            const hipsCm = measurements?.hips_cm || baseM.hips_cm;
            const hipsDiameter = hipsCm / Math.PI;
            const mannHeight = (lmPos.landmark_neck?.y ?? baseline.landmark_neck.y) -
                (lmPos.landmark_hips?.y ?? baseline.landmark_hips.y);
            const worldPerCm = mannHeight / ((measurements?.height_cm || 170) * 0.39);
            targetWidth = hipsDiameter * worldPerCm;
            targetDepth = targetWidth * 0.85; // slightly shallower front-to-back

            // Height: waist → approximate ankle (2× waist-to-hips distance)
            targetHeight = Math.abs(waistY - hipsY) * 4.5;
        }

        // ── 4. Compute per-axis scales ────────────────────────────────
        const primaryWidth = bodyZone === 'upper' ? gMeas.shoulderWidth : gMeas.hipsWidth;
        const primaryDepth = bodyZone === 'upper' ? gMeas.bustDepth : gMeas.hipsDepth;

        let scaleX = primaryWidth > 0.001 ? (targetWidth / primaryWidth) * ease.x : 1;
        let scaleZ = primaryDepth > 0.001 ? (targetDepth / primaryDepth) * ease.z : scaleX;
        let scaleY = gMeas.torsoHeight > 0.001 ? targetHeight / gMeas.torsoHeight : scaleX;

        // Safety clamp
        scaleX = Math.max(0.05, Math.min(5.0, scaleX));
        scaleY = Math.max(0.05, Math.min(5.0, scaleY));
        scaleZ = Math.max(0.05, Math.min(5.0, scaleZ));

        // ── 5. Compute anchor Y position ──────────────────────────────
        const anchorY = lmPos[anchorLandmarkName]?.y ?? baseline[anchorLandmarkName]?.y ?? 2.0;

        // Compute garment's top-offset (how far the garment's top edge is from its origin)
        const gBox = new THREE.Box3().setFromObject(garmentRoot);
        const gTop = gBox.max.y;
        const gOriginToTop = gTop; // garment origin is at (0,0,0) since we reset transforms

        // Position: anchor the garment's top edge at the anchor landmark Y
        const positionY = anchorY - gOriginToTop * scaleY;

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🔧 GarmentFitter.fitToMannequin | zone=${bodyZone}`);
        console.log(`   target: W=${targetWidth?.toFixed(4)} D=${targetDepth?.toFixed(4)} H=${targetHeight?.toFixed(4)}`);
        console.log(`   garment native: W=${primaryWidth?.toFixed(4)} D=${primaryDepth?.toFixed(4)} H=${gMeas.torsoHeight?.toFixed(4)}`);
        console.log(`   scale: X=${scaleX.toFixed(4)} Y=${scaleY.toFixed(4)} Z=${scaleZ.toFixed(4)}`);
        console.log(`   anchorY=${anchorY.toFixed(4)} → positionY=${positionY.toFixed(4)}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return { scaleX, scaleY, scaleZ, positionY, anchorLandmarkName, anchorY };
    }

    // ───────────────────────────────────────────
    //  applyMorphDeltas(garmentRoot, liveLandmarks,
    //    baselineLandmarks, measurements, bodyZone)
    //
    //  TWO PATHS:
    //   A) Garment HAS matching shape keys → drive them
    //      from mannequin morph influences directly
    //   B) No shape keys → cage deformer
    // ───────────────────────────────────────────

    static applyMorphDeltas(garmentRoot, liveLandmarks, mannequinMesh, measurements, bodyZone) {
        const gender = measurements?.gender || 'female';

        // ── Try morph target path first ───────────────────────────────
        let morphableChild = null;
        garmentRoot.traverse(child => {
            if (child.isMesh && child.morphTargetDictionary && !morphableChild) {
                morphableChild = child;
            }
        });

        if (morphableChild && mannequinMesh?.morphTargetDictionary) {
            const mapped = GarmentFitter._applyMorphTargets(morphableChild, mannequinMesh);
            if (mapped > 0) {
                console.log(`✅ GarmentFitter: morph target path (${mapped} targets mapped)`);
                return;
            }
        }

        // ── Cage deformer path ────────────────────────────────────────
        const baseline = BASELINE_LANDMARKS[gender] || BASELINE_LANDMARKS.female;
        const livePos = GarmentFitter._getLandmarkPositions(liveLandmarks);
        const cageRows = bodyZone === 'upper' ? CAGE_ROWS_UPPER : CAGE_ROWS_LOWER;

        // Compute deltas: how much each landmark has moved from baseline
        const deltas = {};
        for (const row of cageRows) {
            const baseY = baseline[row.landmark]?.y ?? 0;
            const liveY = livePos[row.landmark]?.y ?? baseY;
            // Vertical delta
            deltas[row.name] = { dy: liveY - baseY };
        }

        // Check if any deltas are significant
        const maxDelta = Math.max(...Object.values(deltas).map(d => Math.abs(d.dy)));
        if (maxDelta < 0.005) {
            console.log('ℹ️ GarmentFitter: cage deformer — no significant deltas, skipping');
            return;
        }

        let totalDeformed = 0;

        garmentRoot.traverse(child => {
            if (!child.isMesh || !child.geometry?.attributes?.position) return;

            const posAttr = child.geometry.attributes.position;
            const bbox = new THREE.Box3().setFromObject(child);
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            bbox.getSize(size);
            bbox.getCenter(center);

            if (size.y < 0.001) return;

            const bottomY = bbox.min.y;
            const height = size.y;

            const vertex = new THREE.Vector3();
            let modified = false;

            for (const row of cageRows) {
                const delta = deltas[row.name];
                if (Math.abs(delta.dy) < 0.003) continue;

                const zoneWorldY = bottomY + height * row.yFrac;
                const falloffRadius = height * row.radius;

                // Compute a scale factor for the X/Z deformation
                // based on how much the landmark moved vertically.
                // This is a heuristic: vertical movement typically correlates
                // with body width changes (e.g., wider hips push hips landmark down).
                const scaleFactor = delta.dy * 2.0; // amplification factor

                for (let i = 0; i < posAttr.count; i++) {
                    vertex.fromBufferAttribute(posAttr, i);

                    const dy = Math.abs(vertex.y - zoneWorldY);
                    if (dy > falloffRadius) continue;

                    // Gaussian falloff
                    const t = dy / falloffRadius;
                    const weight = Math.exp(-3.0 * t * t);

                    if (row.axis === 'x' || row.axis === 'xz') {
                        const offsetX = (vertex.x - center.x) * scaleFactor * weight;
                        posAttr.setX(i, vertex.x + offsetX);
                    }
                    if (row.axis === 'xz' || row.axis === 'z') {
                        const offsetZ = (vertex.z - center.z) * scaleFactor * weight;
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
                child.geometry.computeBoundingBox();
                child.geometry.computeBoundingSphere();
            }
        });

        if (totalDeformed > 0) {
            console.log(`✅ GarmentFitter: cage deformer path (${totalDeformed} vertex adjustments)`);
        } else {
            console.log('ℹ️ GarmentFitter: cage deformer — no vertices in range');
        }
    }

    // ───────────────────────────────────────────
    //  INTERNAL HELPERS
    // ───────────────────────────────────────────

    /**
     * Mirror mannequin morph target influences onto matching garment morphs.
     */
    static _applyMorphTargets(garmentMesh, mannequinMesh) {
        if (!garmentMesh?.morphTargetDictionary || !mannequinMesh?.morphTargetDictionary) return 0;

        const gDict = garmentMesh.morphTargetDictionary;
        const gInfluences = garmentMesh.morphTargetInfluences;
        const mDict = mannequinMesh.morphTargetDictionary;
        const mInfluences = mannequinMesh.morphTargetInfluences;

        let mapped = 0;

        for (const [mannKey, mannIdx] of Object.entries(mDict)) {
            const mannValue = mInfluences[mannIdx] || 0;
            if (Math.abs(mannValue) < 0.01) continue;

            const aliases = MORPH_ALIASES[mannKey] || [mannKey];
            for (const alias of aliases) {
                if (gDict[alias] !== undefined) {
                    gInfluences[gDict[alias]] = mannValue;
                    mapped++;
                    break;
                }
            }
        }

        if (mapped > 0) {
            garmentMesh.morphTargetInfluences = [...gInfluences];
        }

        return mapped;
    }

    /**
     * Extract world-space positions from the live landmark nodes.
     * Returns { landmark_neck: { x, y, z }, ... }
     */
    static _getLandmarkPositions(liveLandmarks) {
        const result = {};
        if (!liveLandmarks) return result;

        const pos = new THREE.Vector3();

        for (const [name, node] of Object.entries(liveLandmarks)) {
            if (!node) continue;
            node.updateWorldMatrix(true, false);
            node.getWorldPosition(pos);
            result[name] = { x: pos.x, y: pos.y, z: pos.z };
        }

        return result;
    }

    /**
     * Get the mannequin's morphable mesh (first child with morphTargetDictionary).
     */
    static getMannequinMesh(mannequinRef) {
        let mesh = null;
        if (!mannequinRef) return null;
        mannequinRef.traverse(child => {
            if (child.isMesh && child.morphTargetDictionary && !mesh) {
                mesh = child;
            }
        });
        return mesh;
    }
}

export default GarmentFitter;
export { BASELINE_LANDMARKS, BASELINE_MEASUREMENTS };
