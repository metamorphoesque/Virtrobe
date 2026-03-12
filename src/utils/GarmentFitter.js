// src/utils/GarmentFitter.js
// ═══════════════════════════════════════════════════════════════════
//  GARMENT FITTER — Pure service class, no React, no R3F imports.
//
//  Takes mesh + landmarks + measurements, mutates mesh in place.
//
//  Public methods:
//    centrePivot(mesh)
//    measureGarment(mesh, bodyZone)
//    fitToMannequin(mesh, mannequinRef, measurements, bodyZone, isTemplate)
//    applyMorphDeltas(mesh, mannequinRef, mannequinMesh, measurements, bodyZone)
//
//  Static helpers:
//    detectBodyZone(garmentData)
//    getMannequinMesh(mannequinRef)
// ═══════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ─────────────────────────────────────────────
//  BASELINE LANDMARKS (world-space Y values)
//  Female: 170 cm, bust 90, waist 70, hips 95, shoulders 40
//  Male:   170 cm, bust 95, waist 80, hips 95, shoulders 44
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

const BASELINE_MEASUREMENTS = {
    shoulder_width_cm: 40,
    bust_cm: 90,
    waist_cm: 70,
    hips_cm: 95,
    height_cm: 170,
};

// ─────────────────────────────────────────────
//  BODY ZONE DETECTION
// ─────────────────────────────────────────────

const BOTTOM_KEYWORDS = ['pants', 'skirt', 'shorts', 'trousers', 'jeans', 'leggings'];

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
//  CAGE DEFORMER BANDS
//  4 horizontal bands per zone, blended with
//  Gaussian falloff. Run ONCE, not per frame.
// ─────────────────────────────────────────────

const CAGE_BANDS_UPPER = [
    { name: 'shoulder', yFrac: 0.92, measureKey: 'shoulder_width_cm', baseline: 40, axis: 'x', radius: 0.10 },
    { name: 'bust', yFrac: 0.72, measureKey: 'bust_cm', baseline: 90, axis: 'xz', radius: 0.14, isCircumference: true },
    { name: 'waist', yFrac: 0.35, measureKey: 'waist_cm', baseline: 70, axis: 'xz', radius: 0.18, isCircumference: true },
    { name: 'hips', yFrac: 0.05, measureKey: 'hips_cm', baseline: 95, axis: 'xz', radius: 0.12, isCircumference: true },
];

const CAGE_BANDS_LOWER = [
    { name: 'waistband', yFrac: 0.95, measureKey: 'waist_cm', baseline: 70, axis: 'xz', radius: 0.10, isCircumference: true },
    { name: 'hips', yFrac: 0.80, measureKey: 'hips_cm', baseline: 95, axis: 'xz', radius: 0.16, isCircumference: true },
    { name: 'thigh', yFrac: 0.50, measureKey: 'hips_cm', baseline: 95, axis: 'xz', radius: 0.18, isCircumference: true },
    { name: 'knee', yFrac: 0.20, measureKey: 'hips_cm', baseline: 95, axis: 'xz', radius: 0.14, isCircumference: true },
];

// ─────────────────────────────────────────────
//  EASE FACTOR — garment slightly wider than
//  body to prevent poke-through without raycasting
// ─────────────────────────────────────────────

const EASE = 1.06;


// ═══════════════════════════════════════════════════════════════════
//  GARMENT FITTER CLASS
// ═══════════════════════════════════════════════════════════════════

class GarmentFitter {

    // ───────────────────────────────────────────
    //  detectBodyZone — static, no instance needed
    // ───────────────────────────────────────────

    static detectBodyZone(garmentData) {
        const isTemplate = garmentData?.isTemplate === true;
        const type = (garmentData?.type || '').toLowerCase();
        const name = (garmentData?.name || '').toLowerCase();
        const slot = (garmentData?.slot || '').toLowerCase();
        const category = (garmentData?.category || '').toLowerCase();
        const combined = `${name} ${type} ${category} ${slot}`;

        if (BOTTOM_KEYWORDS.some(kw => combined.includes(kw))) return 'lower';
        if (slot === 'lower') return 'lower';
        return 'upper';
    }

    // ───────────────────────────────────────────
    //  centrePivot — "Set Origin to Geometry"
    //
    //  TripoSR meshes have arbitrary pivots.
    //  Shift geometry so pivot = bounding box
    //  centre. Must run BEFORE any scale/position.
    // ───────────────────────────────────────────

    static centrePivot(mesh) {
        mesh.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(mesh);
        const centre = new THREE.Vector3();
        box.getCenter(centre);

        // Shift every child geometry so the mesh pivot is at bbox centre
        mesh.traverse(child => {
            if (child.isMesh && child.geometry) {
                child.geometry.translate(-centre.x, -centre.y, -centre.z);
            }
        });

        mesh.position.set(0, 0, 0);
        mesh.updateMatrixWorld(true);

        console.log(`   📌 centrePivot: shifted by (${centre.x.toFixed(4)}, ${centre.y.toFixed(4)}, ${centre.z.toFixed(4)})`);
    }

    // ───────────────────────────────────────────
    //  measureGarment — sample raw garment dims
    //
    //  Returns { rawWidth, rawHeight, rawDepth,
    //            sliceWidth } where sliceWidth is
    //  the X-span of vertices in the shoulder/hip
    //  band of the garment.
    // ───────────────────────────────────────────

    static measureGarment(mesh, bodyZone) {
        mesh.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Slice band: top 15% for uppers, top 10% for lowers
        const sliceFracTop = 1.0;
        const sliceFracBottom = bodyZone === 'upper' ? 0.85 : 0.90;

        const yBandMin = box.min.y + size.y * sliceFracBottom;
        const yBandMax = box.min.y + size.y * sliceFracTop;

        let minX = Infinity, maxX = -Infinity;
        let found = 0;

        mesh.traverse(child => {
            if (!child.isMesh || !child.geometry?.attributes?.position) return;
            const pos = child.geometry.attributes.position;

            for (let i = 0; i < pos.count; i++) {
                const y = pos.getY(i);
                if (y >= yBandMin && y <= yBandMax) {
                    const x = pos.getX(i);
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    found++;
                }
            }
        });

        const sliceWidth = found >= 5 ? (maxX - minX) : size.x;

        if (found < 5) {
            console.warn(`   ⚠️ Slice band [${sliceFracBottom}–${sliceFracTop}] only ${found} verts, using full bbox X`);
        }

        console.log(`   📏 measureGarment: rawW=${size.x.toFixed(4)} rawH=${size.y.toFixed(4)} rawD=${size.z.toFixed(4)} sliceW=${sliceWidth.toFixed(4)} (${found} verts)`);

        return {
            rawWidth: size.x,
            rawHeight: size.y,
            rawDepth: size.z,
            sliceWidth,
        };
    }

    // ───────────────────────────────────────────
    //  fitToMannequin
    //
    //  Three independent axes:
    //    Y — garment height matches body zone
    //    X — garment width matches shoulder/hip
    //    Z — garment depth matches mannequin depth
    //
    //  Returns { scaleX, scaleY, scaleZ,
    //            anchorLandmarkName, anchorY }
    // ───────────────────────────────────────────

    static fitToMannequin(mesh, mannequinRef, measurements, bodyZone, isTemplate = false) {
        const gender = measurements?.gender || 'female';
        const baseline = BASELINE_LANDMARKS[gender] || BASELINE_LANDMARKS.female;

        // ── 1. Reset transforms ──────────────────────────────────────
        mesh.position.set(0, 0, 0);
        mesh.quaternion.identity();
        mesh.scale.set(1, 1, 1);
        mesh.updateMatrixWorld(true);

        // ── 2. Measure raw garment ───────────────────────────────────
        const garment = GarmentFitter.measureGarment(mesh, bodyZone);

        // ── 3. Mannequin world dimensions ────────────────────────────
        let mannWorldHeight = 1.8085; // fallback (female default)
        let mannZoneDepth = 0.3;    // fallback

        if (mannequinRef) {
            mannequinRef.updateMatrixWorld(true);
            const mannBox = new THREE.Box3().setFromObject(mannequinRef);
            const mannSize = new THREE.Vector3();
            mannBox.getSize(mannSize);
            mannWorldHeight = mannSize.y;

            // Zone fraction of Z depth
            const zoneFrac = bodyZone === 'upper'
                ? 0.35   // upper torso ≈ 35% of total depth
                : 0.30;  // lower body  ≈ 30%
            mannZoneDepth = mannSize.z * zoneFrac;
        }

        const personHeight_cm = measurements?.height_cm || 170;
        const worldPerCm = mannWorldHeight / personHeight_cm;

        // ── 4. Get live landmark Y positions ─────────────────────────
        let liveLm = {};
        if (mannequinRef?.getLiveLandmarks) {
            liveLm = GarmentFitter._getLandmarkPositions(mannequinRef.getLiveLandmarks());
        }

        // ── 5. Compute targets per axis ──────────────────────────────
        let anchorLandmarkName;
        let zoneHeight, targetSliceWidth;

        if (bodyZone === 'upper') {
            anchorLandmarkName = 'landmark_neck';

            // Y: neck → waist
            const neckY = liveLm.landmark_neck?.y ?? baseline.landmark_neck.y;
            const waistY = liveLm.landmark_waist?.y ?? baseline.landmark_waist.y;
            zoneHeight = Math.abs(neckY - waistY);

            // X: shoulder_width_cm → world
            const shoulderCm = measurements?.shoulder_width_cm || BASELINE_MEASUREMENTS.shoulder_width_cm;
            targetSliceWidth = shoulderCm * worldPerCm;

        } else {
            anchorLandmarkName = 'landmark_waist';

            // Y: waist → near ankle (hips.y * 0.1 gives approximate ankle)
            const waistY = liveLm.landmark_waist?.y ?? baseline.landmark_waist.y;
            const hipsY = liveLm.landmark_hips?.y ?? baseline.landmark_hips.y;
            zoneHeight = Math.abs(waistY - hipsY * 0.1);

            // X: hips_cm / π → diameter → world
            const hipsCm = measurements?.hips_cm || BASELINE_MEASUREMENTS.hips_cm;
            targetSliceWidth = (hipsCm / Math.PI) * worldPerCm;
        }

        // ── 6. Per-axis scales ───────────────────────────────────────
        let scaleY = garment.rawHeight > 0.001 ? zoneHeight / garment.rawHeight : 1;
        let scaleX = garment.sliceWidth > 0.001 ? (targetSliceWidth * EASE) / garment.sliceWidth : 1;
        let scaleZ = garment.rawDepth > 0.001 ? (mannZoneDepth * EASE) / garment.rawDepth : scaleX;

        // Safety clamp
        scaleX = Math.max(0.05, Math.min(5.0, scaleX));
        scaleY = Math.max(0.05, Math.min(5.0, scaleY));
        scaleZ = Math.max(0.05, Math.min(5.0, scaleZ));

        // ── 7. Anchor Y ─────────────────────────────────────────────
        const anchorY = liveLm[anchorLandmarkName]?.y
            ?? baseline[anchorLandmarkName]?.y
            ?? 2.0;

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🔧 GarmentFitter.fitToMannequin | zone=${bodyZone}`);
        console.log(`   mannWorldH=${mannWorldHeight.toFixed(4)} worldPerCm=${worldPerCm.toFixed(5)}`);
        console.log(`   garment: rawW=${garment.rawWidth.toFixed(4)} rawH=${garment.rawHeight.toFixed(4)} rawD=${garment.rawDepth.toFixed(4)} sliceW=${garment.sliceWidth.toFixed(4)}`);
        console.log(`   target: zoneH=${zoneHeight.toFixed(4)} sliceW=${targetSliceWidth.toFixed(4)} zoneD=${mannZoneDepth.toFixed(4)}`);
        console.log(`   scale: X=${scaleX.toFixed(4)} Y=${scaleY.toFixed(4)} Z=${scaleZ.toFixed(4)}`);
        console.log(`   anchorLandmark=${anchorLandmarkName} anchorY=${anchorY.toFixed(4)}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return { scaleX, scaleY, scaleZ, anchorLandmarkName, anchorY };
    }

    // ───────────────────────────────────────────
    //  applyMorphDeltas
    //
    //  Path A: garment GLB has morph targets
    //    matching mannequin shape key names →
    //    drive them directly from mannequin
    //    influences.
    //
    //  Path B: no shape keys → one-time cage
    //    deformation. 4 horizontal bands, Gaussian
    //    falloff, radial displacement. Runs ONCE.
    // ───────────────────────────────────────────

    static applyMorphDeltas(garmentRoot, mannequinRef, mannequinMesh, measurements, bodyZone) {
        console.log(`🧬 applyMorphDeltas | zone=${bodyZone}`);

        // ── Path A: morph targets ────────────────────────────────────
        let morphableChild = null;
        garmentRoot.traverse(child => {
            if (child.isMesh && child.morphTargetDictionary && !morphableChild) {
                morphableChild = child;
            }
        });

        if (morphableChild && mannequinMesh?.morphTargetDictionary) {
            const mapped = GarmentFitter._applyMorphTargets(morphableChild, mannequinMesh);
            if (mapped > 0) {
                console.log(`   ✅ Morph target path: ${mapped} targets mapped`);
                return;
            }
        }

        // ── Path B: cage deformer ────────────────────────────────────
        if (!measurements) {
            console.log('   ℹ️ No measurements, skipping cage deformer');
            return;
        }

        const bands = bodyZone === 'upper' ? CAGE_BANDS_UPPER : CAGE_BANDS_LOWER;
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

            for (const band of bands) {
                const userVal = measurements[band.measureKey] || band.baseline;
                const delta = (userVal - band.baseline) / band.baseline;

                // Skip if ≤ 3% change from baseline
                if (Math.abs(delta) < 0.03) continue;

                const bandWorldY = bottomY + height * band.yFrac;
                const falloffRadius = height * band.radius;

                for (let i = 0; i < posAttr.count; i++) {
                    vertex.fromBufferAttribute(posAttr, i);

                    const dy = Math.abs(vertex.y - bandWorldY);
                    if (dy > falloffRadius) continue;

                    // Gaussian falloff — smooth bell curve
                    const t = dy / falloffRadius;
                    const weight = Math.exp(-3.0 * t * t);

                    // Radial displacement = delta × distance from centre axis
                    if (band.axis === 'x' || band.axis === 'xz') {
                        const distX = vertex.x - center.x;
                        posAttr.setX(i, vertex.x + distX * delta * weight);
                    }
                    if (band.axis === 'xz' || band.axis === 'z') {
                        const distZ = vertex.z - center.z;
                        posAttr.setZ(i, vertex.z + distZ * delta * weight);
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
            console.log(`   ✅ Cage deformer: ${totalDeformed} vertex adjustments across ${bands.length} bands`);
        } else {
            console.log('   ℹ️ No deformation needed (measurements near baseline)');
        }
    }

    // ───────────────────────────────────────────
    //  STATIC HELPERS
    // ───────────────────────────────────────────

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

    // ─── PRIVATE ─────────────────────────────────────────────────

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

        if (mapped > 0) garmentMesh.morphTargetInfluences = [...gInfluences];
        return mapped;
    }

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
}

export default GarmentFitter;
export { BASELINE_LANDMARKS, BASELINE_MEASUREMENTS };
