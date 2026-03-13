// src/utils/GarmentFitter.js
// ═══════════════════════════════════════════════════════════════════
//  GARMENT FITTER
//
//  Pipeline (called from WornGarment.jsx):
//
//  1. centrePivot(mesh)          — run once on load
//  2. storeOriginalGeometry(mesh) — run once on load
//  3. fitToMannequin(...)         — returns {scaleX,scaleY,scaleZ,anchorY}
//  4. mesh.scale.set(...)         — applied by WornGarment
//  5. mesh.updateMatrixWorld(true)
//  6. applyMorphDeltas(...)       — restores geometry, then morph targets if any
//  7. shrinkWrapToMannequin(...)  — WORLD SPACE: reads actual mannequin geometry,
//                                   pushes garment vertices outside body surface
//  8. WornGarment re-centres and positions mesh
//
//  KEY INSIGHT for shrinkWrap:
//    After step 4, mesh.scale is set but geometry positions are still in
//    LOCAL (pre-scale) space. We must use mesh.localToWorld() to get each
//    vertex in world space, test against body rings, then use
//    mesh.worldToLocal() to write back. This is the only correct approach.
// ═══════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ─────────────────────────────────────────────
//  BASELINE LANDMARKS  (world-space Y)
// ─────────────────────────────────────────────
const BASELINE_LANDMARKS = {
    female: {
        landmark_neck:       { y: 2.3252 },
        landmark_shoulder_L: { y: 2.2813 },
        landmark_shoulder_R: { y: 2.2813 },
        landmark_waist:      { y: 1.7739 },
        landmark_hips:       { y: 1.6641 },
    },
    male: {
        landmark_neck:       { y: 2.3717 },
        landmark_shoulder_L: { y: 2.3125 },
        landmark_shoulder_R: { y: 2.3125 },
        landmark_waist:      { y: 1.7739 },
        landmark_hips:       { y: 1.5892 },
    },
};

const BASELINE_MEASUREMENTS = {
    shoulder_width_cm: 40,
    bust_cm:           90,
    waist_cm:          70,
    hips_cm:           95,
    height_cm:         170,
};

const BOTTOM_KEYWORDS = ['pants', 'skirt', 'shorts', 'trousers', 'jeans', 'leggings', 'dress'];

const MORPH_ALIASES = {
    bust_large:       ['bust_large', 'chest_large', 'bust_expand'],
    bust_small:       ['bust_small', 'chest_small', 'bust_shrink'],
    waist_wide:       ['waist_wide', 'waist_expand', 'belly_expand'],
    waist_narrow:     ['waist_narrow', 'waist_shrink'],
    hips_wide:        ['hips_wide', 'hip_expand', 'hips_expand'],
    hips_narrow:      ['hips_narrow', 'hip_shrink', 'hips_shrink'],
    shoulders_broad:  ['shoulders_broad', 'shoulder_wide', 'shoulders_wide'],
    shoulders_narrow: ['shoulders_narrow', 'shoulder_narrow'],
    height_tall:      ['height_tall', 'length_long'],
    height_short:     ['height_short', 'length_short'],
    weight_heavy:     ['weight_heavy', 'body_large', 'overall_expand'],
    weight_light:     ['weight_light', 'body_slim', 'overall_shrink'],
};

// Ease: garment sits this fraction outside the body surface
const EASE = 1.045;

// ─────────────────────────────────────────────────────────────────
//  _sampleBodyRadius
//
//  Samples the mannequin mesh geometry at a given world-Y slice
//  to find the maximum XZ radius of the body at that height.
//
//  This reads the ACTUAL morphed mesh — not any formula.
//  sliceHalfHeight: how tall the sampling band is (world units)
//
//  Returns the maximum radius found, or 0 if no vertices in slice.
// ─────────────────────────────────────────────────────────────────
function _sampleBodyRadius(mannequinMesh, worldY, sliceHalfHeight) {
    if (!mannequinMesh?.geometry?.attributes?.position) return 0;

    mannequinMesh.updateMatrixWorld(true);

    const pos = mannequinMesh.geometry.attributes.position;
    const worldVert = new THREE.Vector3();
    let maxR = 0;
    let found = 0;

    for (let i = 0; i < pos.count; i++) {
        worldVert.fromBufferAttribute(pos, i);
        mannequinMesh.localToWorld(worldVert);

        if (Math.abs(worldVert.y - worldY) > sliceHalfHeight) continue;

        // Radius in XZ plane from world origin (mannequin is centred at x=0,z=0)
        const r = Math.sqrt(worldVert.x * worldVert.x + worldVert.z * worldVert.z);
        if (r > maxR) maxR = r;
        found++;
    }

    return maxR; // 0 if no vertices found in slice
}

// ─────────────────────────────────────────────────────────────────
//  _buildBodyProfile
//
//  Samples the body at N evenly-spaced Y positions between yBottom
//  and yTop (world space). Returns an array of { worldY, radius }
//  that represents the body's silhouette profile in that zone.
//
//  Used by shrinkWrapToMannequin to interpolate body radius at any Y.
// ─────────────────────────────────────────────────────────────────
function _buildBodyProfile(mannequinMesh, yBottom, yTop, steps = 16) {
    const profile = [];
    const sliceH  = (yTop - yBottom) / steps * 0.6; // overlap slices slightly

    for (let i = 0; i <= steps; i++) {
        const worldY  = yBottom + (yTop - yBottom) * (i / steps);
        const radius  = _sampleBodyRadius(mannequinMesh, worldY, Math.max(sliceH, 0.02));
        profile.push({ worldY, radius });
    }

    return profile;
}

// ─────────────────────────────────────────────────────────────────
//  _getBodyRadiusAtY
//
//  Interpolates the body profile to get radius at any worldY.
//  Returns 0 if outside the profile range.
// ─────────────────────────────────────────────────────────────────
function _getBodyRadiusAtY(profile, worldY) {
    if (!profile || profile.length < 2) return 0;

    // Clamp to profile range
    if (worldY <= profile[0].worldY)                  return profile[0].radius;
    if (worldY >= profile[profile.length - 1].worldY) return profile[profile.length - 1].radius;

    // Linear interpolation between nearest samples
    for (let i = 0; i < profile.length - 1; i++) {
        const a = profile[i];
        const b = profile[i + 1];
        if (worldY >= a.worldY && worldY <= b.worldY) {
            const t = (worldY - a.worldY) / (b.worldY - a.worldY);
            return a.radius + (b.radius - a.radius) * t;
        }
    }

    return 0;
}


// ═══════════════════════════════════════════════════════════════════
class GarmentFitter {

    // ───────────────────────────────────────────
    static storeOriginalGeometry(mesh) {
        mesh.traverse(child => {
            if (!child.isMesh || !child.geometry?.attributes?.position) return;
            const pos = child.geometry.attributes.position;
            child.geometry.userData.originalPositions = new Float32Array(pos.array);
        });
        console.log('   📸 storeOriginalGeometry: snapshot saved');
    }

    // ───────────────────────────────────────────
    static restoreOriginalGeometry(mesh) {
        let restored = 0;
        mesh.traverse(child => {
            if (!child.isMesh || !child.geometry?.attributes?.position) return;
            const original = child.geometry.userData.originalPositions;
            if (!original) return;
            child.geometry.attributes.position.array.set(original);
            child.geometry.attributes.position.needsUpdate = true;
            child.geometry.computeVertexNormals();
            child.geometry.computeBoundingBox();
            child.geometry.computeBoundingSphere();
            restored++;
        });
        if (restored > 0) console.log(`   🔄 restoreOriginalGeometry: ${restored} mesh(es) reset`);
    }

    // ───────────────────────────────────────────
    static detectBodyZone(garmentData) {
        const combined = [
            garmentData?.type, garmentData?.name,
            garmentData?.slot, garmentData?.category
        ].join(' ').toLowerCase();

        if (BOTTOM_KEYWORDS.some(kw => combined.includes(kw))) return 'lower';
        if ((garmentData?.slot || '').toLowerCase() === 'lower') return 'lower';
        return 'upper';
    }

    // ───────────────────────────────────────────
    static centrePivot(mesh) {
        mesh.updateMatrixWorld(true);
        const box    = new THREE.Box3().setFromObject(mesh);
        const centre = new THREE.Vector3();
        box.getCenter(centre);

        mesh.traverse(child => {
            if (child.isMesh && child.geometry) {
                child.geometry.translate(-centre.x, -centre.y, -centre.z);
            }
        });

        mesh.position.set(0, 0, 0);
        mesh.updateMatrixWorld(true);
        console.log(`   📌 centrePivot: (${centre.x.toFixed(3)}, ${centre.y.toFixed(3)}, ${centre.z.toFixed(3)})`);
    }

    // ───────────────────────────────────────────
    static measureGarment(mesh, bodyZone) {
        mesh.updateMatrixWorld(true);
        const box  = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Sample top slice for anchor width
        const sliceFrac = bodyZone === 'upper' ? 0.85 : 0.88;
        const yMin = box.min.y + size.y * sliceFrac;
        const yMax = box.max.y;

        let minX = Infinity, maxX = -Infinity, found = 0;
        mesh.traverse(child => {
            if (!child.isMesh || !child.geometry?.attributes?.position) return;
            const pos = child.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const y = pos.getY(i);
                if (y < yMin || y > yMax) continue;
                const x = pos.getX(i);
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                found++;
            }
        });

        const sliceWidth = found >= 5 ? (maxX - minX) : size.x;
        console.log(`   📏 garment: rawW=${size.x.toFixed(3)} rawH=${size.y.toFixed(3)} rawD=${size.z.toFixed(3)} topSliceW=${sliceWidth.toFixed(3)}`);
        return { rawWidth: size.x, rawHeight: size.y, rawDepth: size.z, sliceWidth };
    }

    // ───────────────────────────────────────────
    //  fitToMannequin
    //
    //  Computes scale and anchor. Does NOT touch vertices.
    //  WornGarment applies mesh.scale then calls applyMorphDeltas
    //  then shrinkWrapToMannequin.
    // ───────────────────────────────────────────
    static fitToMannequin(mesh, mannequinNode, measurements, bodyZone) {
        const gender   = measurements?.gender || 'female';
        const baseline = BASELINE_LANDMARKS[gender] || BASELINE_LANDMARKS.female;

        mesh.position.set(0, 0, 0);
        mesh.quaternion.identity();
        mesh.scale.set(1, 1, 1);
        mesh.updateMatrixWorld(true);

        const garment = GarmentFitter.measureGarment(mesh, bodyZone);

        // ── Mannequin world dimensions ──────────────────────────────
        let mannWorldHeight = 1.8;
        let mannWidth       = 0.35;
        let mannDepth       = 0.30;

        if (mannequinNode) {
            mannequinNode.updateMatrixWorld(true);
            const mBox  = new THREE.Box3().setFromObject(mannequinNode);
            const mSize = new THREE.Vector3();
            mBox.getSize(mSize);
            mannWorldHeight = mSize.y;
            mannWidth       = mSize.x;
            mannDepth       = mSize.z;
            console.log(`   📐 mannequin: H=${mSize.y.toFixed(3)} X=${mSize.x.toFixed(3)} Z=${mSize.z.toFixed(3)}`);
        }

        const worldPerCm = mannWorldHeight / (measurements?.height_cm || 170);

        // ── Live landmarks ──────────────────────────────────────────
        let liveLm = {};
        if (typeof mannequinNode?.getLiveLandmarks === 'function') {
            mannequinNode.updateMatrixWorld(true);
            liveLm = GarmentFitter.getLandmarkPositions(mannequinNode.getLiveLandmarks());
            Object.keys(liveLm).forEach(k =>
                console.log(`   📍 ${k.padEnd(24)} y=${liveLm[k].y.toFixed(4)}`)
            );
        } else {
            console.warn('   ⚠️ getLiveLandmarks not found');
        }

        const neckY  = liveLm.landmark_neck?.y  ?? baseline.landmark_neck.y;
        const waistY = liveLm.landmark_waist?.y ?? baseline.landmark_waist.y;
        const hipsY  = liveLm.landmark_hips?.y  ?? baseline.landmark_hips.y;

        // ── STEP 1: Normalise garment to mannequin scale ────────────
        // AI-generated meshes (Meshy/TripoSR) can be any scale.
        // We first normalise the garment's largest dimension to match
        // the corresponding mannequin dimension, so downstream math
        // works in consistent world-unit space.
        // 
        // Upper: normalise garment height to torso height (neck→waist)
        // Lower: normalise garment height to lower zone (waist→floor)
        let zoneHeight, anchorLandmarkName, anchorY;

        if (bodyZone === 'upper') {
            zoneHeight         = Math.abs(neckY - waistY);
            anchorLandmarkName = 'landmark_neck';
        } else {
            zoneHeight         = waistY; // waist to floor (floor=0)
            anchorLandmarkName = 'landmark_waist';
        }

        anchorY = liveLm[anchorLandmarkName]?.y ?? baseline[anchorLandmarkName]?.y ?? 2.0;

        // Normalisation scale: bring garment height to zone height
        const normScale = garment.rawHeight > 0.001 ? zoneHeight / garment.rawHeight : 1;

        // Normalised garment dimensions (what it will be after normScale)
        const normW = garment.rawWidth  * normScale;
        const normH = garment.rawHeight * normScale; // == zoneHeight
        const normD = garment.rawDepth  * normScale;

        console.log(`   📐 normalised garment: W=${normW.toFixed(3)} H=${normH.toFixed(3)} D=${normD.toFixed(3)} normScale=${normScale.toFixed(4)}`);

        // ── STEP 2: Fit to body measurements ────────────────────────
        // Starting from the normalised dimensions, compute small
        // per-axis adjustments to match body width/depth.
        // scaleY stays at normScale (height is already correct).

        const shoulderCm = measurements?.shoulder_width_cm || BASELINE_MEASUREMENTS.shoulder_width_cm;
        const waistCm    = measurements?.waist_cm    || BASELINE_MEASUREMENTS.waist_cm;
        const hipsCm     = measurements?.hips_cm     || BASELINE_MEASUREMENTS.hips_cm;

        // Target widths in world units
        const targetShoulderW = shoulderCm * worldPerCm;
        const targetWaistW    = (waistCm  / Math.PI) * worldPerCm; // diameter
        const targetHipsW     = (hipsCm   / Math.PI) * worldPerCm;

        let scaleX, scaleZ;

        if (bodyZone === 'upper') {
            // Use shoulder width as the X target
            // Only expand — never crush a wide garment (loose shirts etc)
            const targetW = targetShoulderW * EASE;
            scaleX = normW < targetW ? (targetW / normW) * normScale : normScale;

            // Z: match mannequin depth, never crush
            const targetD = mannDepth * EASE;
            scaleZ = normD < targetD ? (targetD / normD) * normScale : normScale;
        } else {
            // Lower: use hips as widest point reference
            // Narrow garments (trousers) expand to hips; wide (skirts) stay wide
            const targetW = targetHipsW * EASE;
            scaleX = normW < targetW ? (targetW / normW) * normScale : normScale;

            const targetD = mannDepth * EASE;
            scaleZ = normD < targetD ? (targetD / normD) * normScale : normScale;
        }

        const scaleY = normScale;

        const finalScaleX = Math.max(0.01, Math.min(10, scaleX));
        const finalScaleY = Math.max(0.01, Math.min(10, scaleY));
        const finalScaleZ = Math.max(0.01, Math.min(10, scaleZ));

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🔧 fitToMannequin zone=${bodyZone}`);
        console.log(`   normScale=${normScale.toFixed(4)}  final=(${finalScaleX.toFixed(3)}, ${finalScaleY.toFixed(3)}, ${finalScaleZ.toFixed(3)})`);
        console.log(`   anchorY=${anchorY.toFixed(3)}  zoneH=${zoneHeight.toFixed(3)}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return {
            scaleX: finalScaleX,
            scaleY: finalScaleY,
            scaleZ: finalScaleZ,
            anchorLandmarkName,
            anchorY,
        };
    }

    // ───────────────────────────────────────────
    //  applyMorphDeltas
    //  Morph target mirroring only. No cage deformation.
    //  shrinkWrapToMannequin handles body clearance.
    // ───────────────────────────────────────────
    static applyMorphDeltas(garmentRoot, mannequinNode, mannequinMesh, measurements, bodyZone) {
        console.log(`🧬 applyMorphDeltas zone=${bodyZone}`);
        GarmentFitter.restoreOriginalGeometry(garmentRoot);

        // Try morph target mirroring from mannequin
        let morphableChild = null;
        garmentRoot.traverse(child => {
            if (child.isMesh && child.morphTargetDictionary && !morphableChild) {
                morphableChild = child;
            }
        });

        if (morphableChild && mannequinMesh?.morphTargetDictionary) {
            const mapped = GarmentFitter._applyMorphTargets(morphableChild, mannequinMesh);
            if (mapped > 0) {
                console.log(`   ✅ Morph targets: ${mapped} mapped`);
                return;
            }
        }

        console.log('   ℹ️ No morph targets — shrinkWrap will handle clearance');
    }

    // ───────────────────────────────────────────
    //  shrinkWrapToMannequin — RING-BASED CAGE DEFORMER
    //
    //  Instead of pushing every vertex uniformly (balloon effect),
    //  we define anatomical RINGS at key body landmarks. Each ring
    //  has a target radius sampled from the real mannequin mesh.
    //
    //  Each vertex gets a BLENDED influence from its two nearest rings,
    //  weighted by Y-distance. Vertices at a ring: fully constrained.
    //  Vertices between rings: interpolated — so loose fabric stays loose,
    //  fitted areas stay fitted, and nothing balloons.
    //
    //  Rings for upper: collar, bust, waist
    //  Rings for lower: waist, hips, knee (mid), hem (free)
    //
    //  Only vertices INSIDE the required radius are pushed out.
    //  Vertices already outside are never touched. Wide skirts = zero deformation.
    // ───────────────────────────────────────────
    static shrinkWrapToMannequin(garmentRoot, mannequinNode, measurements, bodyZone, garmentWorldY = 0) {
        console.log(`🫧 ringCageDeform zone=${bodyZone} garmentWorldY=${garmentWorldY.toFixed(3)}`);

        const mannequinMesh = GarmentFitter.getMannequinMesh(mannequinNode);
        if (!mannequinMesh) {
            console.warn('   ⚠️ No mannequin mesh — skipping');
            return;
        }

        mannequinMesh.updateMatrixWorld(true);
        garmentRoot.updateMatrixWorld(true);

        const gender   = measurements?.gender || 'female';
        const baseline = BASELINE_LANDMARKS[gender] || BASELINE_LANDMARKS.female;

        let liveLm = {};
        if (typeof mannequinNode?.getLiveLandmarks === 'function') {
            liveLm = GarmentFitter.getLandmarkPositions(mannequinNode.getLiveLandmarks());
        }

        const neckY  = liveLm.landmark_neck?.y  ?? baseline.landmark_neck.y;
        const shoulderY = liveLm.landmark_shoulder_L?.y ?? baseline.landmark_shoulder_L.y;
        const waistY = liveLm.landmark_waist?.y ?? baseline.landmark_waist.y;
        const hipsY  = liveLm.landmark_hips?.y  ?? baseline.landmark_hips.y;

        // Ease: small clearance gap so garment sits ON body not IN it
        const EASE = 0.010; // 1cm

        // ── Build full body profile for radius lookups ──────────────
        const profileBottom = bodyZone === 'lower' ? 0 : waistY - 0.05;
        const profileTop    = bodyZone === 'lower' ? waistY + 0.05 : neckY + 0.05;
        const bodyProfile   = _buildBodyProfile(mannequinMesh, profileBottom, profileTop, 24);

        // ── Define constraint rings ─────────────────────────────────
        // Each ring: { worldY, radius, strength }
        // strength=1.0 → full constraint at this Y
        // strength=0.0 → this ring is informational only (used for interp)
        // 
        // Vertices between two rings get a weighted blend of both rings.
        // The blending window is ±ringInfluence world units around each ring Y.
        let rings;

        if (bodyZone === 'upper') {
            const collarR = _getBodyRadiusAtY(bodyProfile, neckY)   + EASE;
            const bustMidY = waistY + (neckY - waistY) * 0.55; // ~bust level
            const bustR   = _getBodyRadiusAtY(bodyProfile, bustMidY) + EASE;
            const waistR  = _getBodyRadiusAtY(bodyProfile, waistY)  + EASE;

            rings = [
                { worldY: neckY,    radius: collarR, label: 'collar',  strength: 1.00 },
                { worldY: bustMidY, radius: bustR,   label: 'bust',    strength: 0.85 },
                { worldY: waistY,   radius: waistR,  label: 'waist',   strength: 1.00 },
            ];
        } else {
            const waistR  = _getBodyRadiusAtY(bodyProfile, waistY) + EASE;
            const hipsR   = _getBodyRadiusAtY(bodyProfile, hipsY)  + EASE;
            const kneeY   = hipsY * 0.45; // mid lower zone
            const kneeR   = Math.max(hipsR * 0.72, waistR * 0.68); // taper below hips
            const hemY    = 0.05; // near floor — free, no constraint

            rings = [
                { worldY: waistY, radius: waistR, label: 'waist', strength: 1.00 },
                { worldY: hipsY,  radius: hipsR,  label: 'hips',  strength: 0.90 },
                { worldY: kneeY,  radius: kneeR,  label: 'knee',  strength: 0.40 },
                { worldY: hemY,   radius: 0,       label: 'hem',   strength: 0.00 }, // free hem
            ];
        }

        console.log('   🔵 Rings:');
        rings.forEach(r => console.log(`      ${r.label.padEnd(8)} worldY=${r.worldY.toFixed(3)} targetR=${r.radius.toFixed(4)} str=${r.strength.toFixed(2)}`));

        // ── Get garment world Y extents for ring falloff normalisation ──
        const garmentBox = new THREE.Box3().setFromObject(garmentRoot);
        const garmentHeight = garmentBox.max.y - garmentBox.min.y;
        // Influence radius for each ring: 20% of garment height
        const ringInfluence = garmentHeight * 0.20;

        // ── Per-vertex deformation ──────────────────────────────────
        let pushed = 0, skipped = 0, tested = 0;

        garmentRoot.traverse(child => {
            if (!child.isMesh || !child.geometry?.attributes?.position) return;

            child.updateMatrixWorld(true);
            const posAttr = child.geometry.attributes.position;
            const worldV  = new THREE.Vector3();
            const localV  = new THREE.Vector3();

            for (let i = 0; i < posAttr.count; i++) {
                localV.fromBufferAttribute(posAttr, i);
                worldV.copy(localV);
                child.localToWorld(worldV);

                // Skip vertices outside garment zone
                if (worldV.y < profileBottom || worldV.y > profileTop) {
                    skipped++;
                    continue;
                }
                tested++;

                // ── Find the two nearest rings and blend ──
                // Sort rings by distance to this vertex's worldY
                let totalWeight = 0;
                let targetR     = 0;

                for (const ring of rings) {
                    if (ring.strength < 0.01) continue; // hem ring = no constraint
                    const dy = Math.abs(worldV.y - ring.worldY);
                    if (dy > ringInfluence) continue;

                    // Gaussian falloff within influence radius
                    const t      = dy / ringInfluence;
                    const weight = Math.exp(-3.5 * t * t) * ring.strength;
                    targetR     += ring.radius * weight;
                    totalWeight += weight;
                }

                if (totalWeight < 0.001) continue;
                const requiredR = targetR / totalWeight;
                if (requiredR < 0.001) continue;

                // Current garment XZ radius from world Y-axis
                const currentR = Math.sqrt(worldV.x * worldV.x + worldV.z * worldV.z);

                // Only push outward — NEVER pull inward (preserves wide skirts)
                if (currentR >= requiredR) continue;

                if (currentR < 0.0001) {
                    worldV.x += requiredR;
                } else {
                    const scale = requiredR / currentR;
                    worldV.x  *= scale;
                    worldV.z  *= scale;
                }

                child.worldToLocal(worldV);
                posAttr.setXYZ(i, worldV.x, worldV.y, worldV.z);
                pushed++;
            }

            if (pushed > 0) {
                posAttr.needsUpdate = true;
                child.geometry.computeVertexNormals();
                child.geometry.computeBoundingBox();
                child.geometry.computeBoundingSphere();
            }
        });

        console.log(`   ✅ ringCage: ${pushed} pushed, ${tested} tested, ${skipped} outside zone`);
    }

    // ───────────────────────────────────────────
    //  STATIC HELPERS
    // ───────────────────────────────────────────

    static getMannequinMesh(mannequinNode) {
        let mesh = null;
        if (!mannequinNode) return null;
        mannequinNode.traverse(child => {
            if (child.isMesh && child.morphTargetDictionary && !mesh) mesh = child;
        });
        // Fallback: any mesh
        if (!mesh) {
            mannequinNode.traverse(child => {
                if (child.isMesh && !mesh) mesh = child;
            });
        }
        return mesh;
    }

    static getLandmarkPositions(liveLandmarks) {
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

    static _applyMorphTargets(garmentMesh, mannequinMesh) {
        if (!garmentMesh?.morphTargetDictionary || !mannequinMesh?.morphTargetDictionary) return 0;

        const gDict       = garmentMesh.morphTargetDictionary;
        const gInfluences = garmentMesh.morphTargetInfluences;
        const mDict       = mannequinMesh.morphTargetDictionary;
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
}

export default GarmentFitter;
export { BASELINE_LANDMARKS, BASELINE_MEASUREMENTS };