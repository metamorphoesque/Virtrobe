// src/utils/GarmentFitter.js
// ═══════════════════════════════════════════════════════════════════
//  GARMENT FITTER — RADIAL BODY PROJECTION
//
//  Pipeline (called from WornGarment.jsx):
//
//  1. centrePivot(mesh)              — once on load
//  2. storeOriginalGeometry(mesh)    — once on load
//  3. projectOntoBody(...)           — THE MAIN FITTING STEP
//     • restores original geometry
//     • maps garment Y → body Y (proportional remap)
//     • projects each vertex radially onto body surface + ease
//     • preserves garment's relative radial variation (flares/tapers)
//     • returns { anchorY, bodyZoneTop, bodyZoneBottom }
//  4. WornGarment positions mesh at anchorY
//
//  KEY INSIGHT:
//    Instead of scale-normalize-expand (which crushes proportions),
//    we REPROJECT every vertex onto the body surface. The garment's
//    own silhouette (flares, tapers) is preserved as a radial ratio,
//    but the absolute size comes from the mannequin mesh.
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

// ─────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────
// Ease = garment sits this factor outside the body surface
const EASE_FACTOR = 1.06;

// Number of Y slices and angular bins for body profile
const PROFILE_Y_STEPS  = 40;
const PROFILE_ANG_BINS = 16;

// How many Y-bands to use when computing garment's radial profile
const GARMENT_PROFILE_BANDS = 32;

// Flare threshold: if garment radius / avg radius > this, it's a flare
const FLARE_THRESHOLD = 1.6;

// Smoothing: Laplacian iterations after projection
const SMOOTH_ITERATIONS = 2;
const SMOOTH_FACTOR     = 0.3;


// ═══════════════════════════════════════════════════════════════════
//  BODY PROFILING
//
//  Build an angular body profile: at each Y height and each angle θ,
//  what is the radius of the mannequin body? This gives us a 2D
//  lookup table: (worldY, θ) → radius.
// ═══════════════════════════════════════════════════════════════════

/**
 * Build a 2D body profile: for each Y-slice and angle bin, record the
 * maximum XZ radius of the mannequin mesh.
 *
 * Returns: { yMin, yMax, ySteps, angBins, data: Float32Array[ySteps * angBins] }
 * data[yIdx * angBins + angIdx] = radius at that (y, angle) pair
 */
function _buildAngularBodyProfile(mannequinMesh, yMin, yMax, ySteps = PROFILE_Y_STEPS, angBins = PROFILE_ANG_BINS) {
    const data = new Float32Array(ySteps * angBins);
    if (!mannequinMesh?.geometry?.attributes?.position) {
        return { yMin, yMax, ySteps, angBins, data };
    }

    mannequinMesh.updateMatrixWorld(true);
    const pos = mannequinMesh.geometry.attributes.position;
    const wv  = new THREE.Vector3();

    // Half-height of the Y-slice sampling band
    const sliceH = ((yMax - yMin) / ySteps) * 0.7;
    const angStep = (2 * Math.PI) / angBins;

    for (let yi = 0; yi < ySteps; yi++) {
        const worldY = yMin + (yMax - yMin) * (yi / (ySteps - 1));

        for (let i = 0; i < pos.count; i++) {
            wv.fromBufferAttribute(pos, i);
            mannequinMesh.localToWorld(wv);

            if (Math.abs(wv.y - worldY) > sliceH) continue;

            const r   = Math.sqrt(wv.x * wv.x + wv.z * wv.z);
            let theta  = Math.atan2(wv.z, wv.x);
            if (theta < 0) theta += 2 * Math.PI;
            const ai   = Math.min(Math.floor(theta / angStep), angBins - 1);
            const idx  = yi * angBins + ai;

            if (r > data[idx]) data[idx] = r;
        }
    }

    // Fill zero bins by interpolating from neighbors (angular)
    for (let yi = 0; yi < ySteps; yi++) {
        for (let ai = 0; ai < angBins; ai++) {
            if (data[yi * angBins + ai] > 0.001) continue;
            const prev = data[yi * angBins + ((ai - 1 + angBins) % angBins)];
            const next = data[yi * angBins + ((ai + 1) % angBins)];
            if (prev > 0 || next > 0) {
                data[yi * angBins + ai] = Math.max(prev, next);
            }
        }
    }

    // Fill zero Y-slices by interpolating vertically
    for (let ai = 0; ai < angBins; ai++) {
        for (let yi = 0; yi < ySteps; yi++) {
            if (data[yi * angBins + ai] > 0.001) continue;
            // Find nearest non-zero above and below
            let above = -1, below = -1;
            for (let j = yi - 1; j >= 0; j--) { if (data[j * angBins + ai] > 0.001) { below = j; break; } }
            for (let j = yi + 1; j < ySteps; j++) { if (data[j * angBins + ai] > 0.001) { above = j; break; } }
            if (below >= 0 && above >= 0) {
                const t = (yi - below) / (above - below);
                data[yi * angBins + ai] = data[below * angBins + ai] * (1 - t) + data[above * angBins + ai] * t;
            } else if (below >= 0) {
                data[yi * angBins + ai] = data[below * angBins + ai];
            } else if (above >= 0) {
                data[yi * angBins + ai] = data[above * angBins + ai];
            }
        }
    }

    return { yMin, yMax, ySteps, angBins, data };
}

/**
 * Look up body radius at (worldY, theta) from the angular profile.
 * Uses bilinear interpolation.
 */
function _sampleBodyProfile(profile, worldY, theta) {
    const { yMin, yMax, ySteps, angBins, data } = profile;

    // Normalise theta to [0, 2π)
    let t = theta;
    while (t < 0) t += 2 * Math.PI;
    while (t >= 2 * Math.PI) t -= 2 * Math.PI;

    // Y index (continuous)
    const yFrac = Math.max(0, Math.min(1, (worldY - yMin) / (yMax - yMin)));
    const yf    = yFrac * (ySteps - 1);
    const yi0   = Math.floor(yf);
    const yi1   = Math.min(yi0 + 1, ySteps - 1);
    const yt    = yf - yi0;

    // Angle index (continuous, wrapping)
    const angStep = (2 * Math.PI) / angBins;
    const af      = t / angStep;
    const ai0     = Math.floor(af) % angBins;
    const ai1     = (ai0 + 1) % angBins;
    const at      = af - Math.floor(af);

    // Bilinear interpolation
    const r00 = data[yi0 * angBins + ai0];
    const r01 = data[yi0 * angBins + ai1];
    const r10 = data[yi1 * angBins + ai0];
    const r11 = data[yi1 * angBins + ai1];

    const r0 = r00 * (1 - at) + r01 * at;
    const r1 = r10 * (1 - at) + r11 * at;

    return r0 * (1 - yt) + r1 * yt;
}

/**
 * Get the average body radius at a given worldY (across all angles).
 */
function _avgBodyRadiusAtY(profile, worldY) {
    let sum = 0;
    for (let ai = 0; ai < profile.angBins; ai++) {
        const theta = (2 * Math.PI * ai) / profile.angBins;
        sum += _sampleBodyProfile(profile, worldY, theta);
    }
    return sum / profile.angBins;
}


// ═══════════════════════════════════════════════════════════════════
//  GARMENT PROFILING
//
//  Compute the garment's own radial profile: for each Y-band, what's
//  the average and max XZ radius? This tells us where the garment
//  flares, tapers, or stays tight relative to itself.
// ═══════════════════════════════════════════════════════════════════

/**
 * Build a garment radial profile in local space.
 * Returns: { bands: [ { localYMin, localYMax, avgRadius, maxRadius, vertexCount } ] }
 */
function _buildGarmentRadialProfile(garmentRoot, numBands = GARMENT_PROFILE_BANDS) {
    // First get local-space bounding box
    garmentRoot.updateMatrixWorld(true);

    let localYMin = Infinity, localYMax = -Infinity;
    const radii = []; // collect all (localY, r) pairs

    garmentRoot.traverse(child => {
        if (!child.isMesh || !child.geometry?.attributes?.position) return;
        const pos = child.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const z = pos.getZ(i);
            const r = Math.sqrt(x * x + z * z);
            radii.push({ y, r });
            if (y < localYMin) localYMin = y;
            if (y > localYMax) localYMax = y;
        }
    });

    if (radii.length === 0 || localYMax - localYMin < 0.0001) {
        return { localYMin: 0, localYMax: 1, bands: [] };
    }

    const bandHeight = (localYMax - localYMin) / numBands;
    const bands = [];

    for (let bi = 0; bi < numBands; bi++) {
        const bMin = localYMin + bi * bandHeight;
        const bMax = bMin + bandHeight;
        let sumR = 0, maxR = 0, count = 0;

        for (const { y, r } of radii) {
            if (y >= bMin && y < bMax) {
                sumR += r;
                if (r > maxR) maxR = r;
                count++;
            }
        }

        bands.push({
            localYMin: bMin,
            localYMax: bMax,
            localYMid: (bMin + bMax) / 2,
            avgRadius: count > 0 ? sumR / count : 0,
            maxRadius: maxR,
            vertexCount: count,
        });
    }

    return { localYMin, localYMax, bands };
}

/**
 * Get garment's average radius at a given local Y by interpolating bands.
 */
function _getGarmentAvgRadius(gProfile, localY) {
    const { bands, localYMin, localYMax } = gProfile;
    if (!bands || bands.length === 0) return 0.1;

    // Clamp
    if (localY <= localYMin) return bands[0].avgRadius || 0.1;
    if (localY >= localYMax) return bands[bands.length - 1].avgRadius || 0.1;

    for (let i = 0; i < bands.length - 1; i++) {
        if (localY >= bands[i].localYMid && localY < bands[i + 1].localYMid) {
            const t = (localY - bands[i].localYMid) / (bands[i + 1].localYMid - bands[i].localYMid);
            const r0 = bands[i].avgRadius || 0.1;
            const r1 = bands[i + 1].avgRadius || 0.1;
            return r0 * (1 - t) + r1 * t;
        }
    }

    return bands[bands.length - 1].avgRadius || 0.1;
}


// ═══════════════════════════════════════════════════════════════════
//  ADJACENCY & SMOOTHING
//
//  After projection, run a gentle Laplacian smooth to reduce
//  creasing artifacts from the radial projection.
// ═══════════════════════════════════════════════════════════════════

/**
 * Build adjacency list from index buffer (or position-based if unindexed).
 */
function _buildAdjacency(geometry) {
    const posAttr = geometry.attributes.position;
    const count   = posAttr.count;
    const adj     = new Array(count);
    for (let i = 0; i < count; i++) adj[i] = new Set();

    const idx = geometry.index;
    if (idx) {
        const iArr = idx.array;
        for (let t = 0; t < iArr.length; t += 3) {
            const a = iArr[t], b = iArr[t + 1], c = iArr[t + 2];
            adj[a].add(b); adj[a].add(c);
            adj[b].add(a); adj[b].add(c);
            adj[c].add(a); adj[c].add(b);
        }
    } else {
        // Non-indexed: every 3 vertices form a face
        for (let t = 0; t < count; t += 3) {
            const a = t, b = t + 1, c = t + 2;
            if (c < count) {
                adj[a].add(b); adj[a].add(c);
                adj[b].add(a); adj[b].add(c);
                adj[c].add(a); adj[c].add(b);
            }
        }
    }

    return adj;
}

/**
 * Laplacian smooth on XZ only (preserve Y mapping).
 * Gentle — only smooths the radial position, not vertical.
 */
function _laplacianSmoothXZ(posAttr, adj, iterations = SMOOTH_ITERATIONS, factor = SMOOTH_FACTOR) {
    const count = posAttr.count;
    const tempX = new Float32Array(count);
    const tempZ = new Float32Array(count);

    for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < count; i++) {
            const neighbors = adj[i];
            if (!neighbors || neighbors.size === 0) {
                tempX[i] = posAttr.getX(i);
                tempZ[i] = posAttr.getZ(i);
                continue;
            }

            let avgX = 0, avgZ = 0;
            for (const n of neighbors) {
                avgX += posAttr.getX(n);
                avgZ += posAttr.getZ(n);
            }
            avgX /= neighbors.size;
            avgZ /= neighbors.size;

            const curX = posAttr.getX(i);
            const curZ = posAttr.getZ(i);

            tempX[i] = curX + (avgX - curX) * factor;
            tempZ[i] = curZ + (avgZ - curZ) * factor;
        }

        // Write back
        for (let i = 0; i < count; i++) {
            posAttr.setX(i, tempX[i]);
            posAttr.setZ(i, tempZ[i]);
        }
    }
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

    // ═══════════════════════════════════════════════════════════════
    //  projectOntoBody — THE CORE FITTING ALGORITHM
    //
    //  This replaces both fitToMannequin() and shrinkWrapToMannequin().
    //
    //  For each garment vertex:
    //    1. Map local Y → world Y (proportional remap to body zone)
    //    2. Compute angular position θ in XZ plane
    //    3. Get garment's local radial ratio (how far out vs avg at that Y)
    //    4. Sample body radius at (worldY, θ) from angular profile
    //    5. New radius = body_radius * EASE * clamp(ratio, ...)
    //    6. Write back local position
    //
    //  Returns { anchorY, zoneTop, zoneBottom } for positioning.
    // ═══════════════════════════════════════════════════════════════
    static projectOntoBody(garmentRoot, mannequinNode, measurements, bodyZone) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🎯 projectOntoBody zone=${bodyZone}`);

        // ── 0. Restore clean geometry ───────────────────────────────
        GarmentFitter.restoreOriginalGeometry(garmentRoot);
        garmentRoot.position.set(0, 0, 0);
        garmentRoot.quaternion.identity();
        garmentRoot.scale.set(1, 1, 1);
        garmentRoot.updateMatrixWorld(true);

        // ── 1. Get mannequin references ─────────────────────────────
        const mannequinMesh = GarmentFitter.getMannequinMesh(mannequinNode);
        if (!mannequinMesh) {
            console.warn('   ⚠️ No mannequin mesh — cannot project');
            return { anchorY: 2.0, zoneTop: 2.3, zoneBottom: 1.7 };
        }

        mannequinNode.updateMatrixWorld(true);
        mannequinMesh.updateMatrixWorld(true);

        // ── 2. Get landmarks ────────────────────────────────────────
        const gender   = measurements?.gender || 'female';
        const baseline = BASELINE_LANDMARKS[gender] || BASELINE_LANDMARKS.female;

        let liveLm = {};
        if (typeof mannequinNode?.getLiveLandmarks === 'function') {
            liveLm = GarmentFitter.getLandmarkPositions(mannequinNode.getLiveLandmarks());
        }

        const neckY     = liveLm.landmark_neck?.y       ?? baseline.landmark_neck.y;
        const shoulderY = liveLm.landmark_shoulder_L?.y  ?? baseline.landmark_shoulder_L.y;
        const waistY    = liveLm.landmark_waist?.y       ?? baseline.landmark_waist.y;
        const hipsY     = liveLm.landmark_hips?.y        ?? baseline.landmark_hips.y;

        console.log(`   📍 neckY=${neckY.toFixed(3)} shoulderY=${shoulderY.toFixed(3)} waistY=${waistY.toFixed(3)} hipsY=${hipsY.toFixed(3)}`);

        // ── 3. Define target body zone ──────────────────────────────
        // Upper: shoulder → waist (with some extension above for collar and below for hip overhang)
        // Lower: waist → floor
        let zoneTop, zoneBottom, anchorY;

        if (bodyZone === 'upper') {
            zoneTop    = neckY + 0.03;    // slightly above neck for collar
            zoneBottom = waistY - 0.08;   // slightly below waist for shirt hem
            anchorY    = shoulderY;
        } else {
            zoneTop    = waistY + 0.03;   // slightly above waist
            zoneBottom = 0.0;             // floor
            anchorY    = waistY;
        }

        const zoneHeight = zoneTop - zoneBottom;
        console.log(`   📐 zone: top=${zoneTop.toFixed(3)} bottom=${zoneBottom.toFixed(3)} height=${zoneHeight.toFixed(3)}`);

        // ── 4. Build angular body profile ───────────────────────────
        // Extend sampling range a bit beyond the zone
        const profileMargin = 0.1;
        const bodyProfile = _buildAngularBodyProfile(
            mannequinMesh,
            zoneBottom - profileMargin,
            zoneTop + profileMargin,
            PROFILE_Y_STEPS,
            PROFILE_ANG_BINS
        );

        // Log average radii at key heights
        console.log(`   🔵 Body radii: neck=${_avgBodyRadiusAtY(bodyProfile, neckY).toFixed(4)} shoulder=${_avgBodyRadiusAtY(bodyProfile, shoulderY).toFixed(4)} waist=${_avgBodyRadiusAtY(bodyProfile, waistY).toFixed(4)} hips=${_avgBodyRadiusAtY(bodyProfile, hipsY).toFixed(4)}`);

        // ── 5. Build garment radial profile ─────────────────────────
        const gProfile = _buildGarmentRadialProfile(garmentRoot);
        console.log(`   👕 Garment Y range: [${gProfile.localYMin.toFixed(3)}, ${gProfile.localYMax.toFixed(3)}]`);

        // ── 6. Determine garment type characteristics ───────────────
        // Check if this garment has significant flare (skirts, dresses)
        const topBands    = gProfile.bands.slice(Math.floor(gProfile.bands.length * 0.6));
        const bottomBands = gProfile.bands.slice(0, Math.floor(gProfile.bands.length * 0.4));
        const topAvgR     = topBands.reduce((s, b) => s + b.avgRadius, 0) / (topBands.length || 1);
        const bottomAvgR  = bottomBands.reduce((s, b) => s + b.avgRadius, 0) / (bottomBands.length || 1);
        // Note: in centred local space, Y grows upward. "top" of garment = higher Y.
        // For garment like a skirt: bottom bands have larger radius (flare)
        // Actually after centrePivot, the garment is centred at origin.
        // Let's just measure the overall radial variation.
        const globalAvgR = gProfile.bands.reduce((s, b) => s + b.avgRadius, 0) / (gProfile.bands.length || 1);
        const maxBandR   = Math.max(...gProfile.bands.map(b => b.avgRadius));
        const flareRatio = globalAvgR > 0.001 ? maxBandR / globalAvgR : 1.0;
        const hasFlare   = flareRatio > FLARE_THRESHOLD;

        console.log(`   📊 flareRatio=${flareRatio.toFixed(2)} hasFlare=${hasFlare}`);

        // ── 7. Per-vertex radial projection ─────────────────────────
        const garmentLocalYMin = gProfile.localYMin;
        const garmentLocalYMax = gProfile.localYMax;
        const garmentYRange    = garmentLocalYMax - garmentLocalYMin;

        let projected = 0, total = 0;

        garmentRoot.traverse(child => {
            if (!child.isMesh || !child.geometry?.attributes?.position) return;

            const posAttr = child.geometry.attributes.position;
            const adj     = _buildAdjacency(child.geometry);

            for (let i = 0; i < posAttr.count; i++) {
                const lx = posAttr.getX(i);
                const ly = posAttr.getY(i);
                const lz = posAttr.getZ(i);

                total++;

                // 7a. Map local Y → [0, 1] normalised position in garment
                const yNorm = garmentYRange > 0.001
                    ? (ly - garmentLocalYMin) / garmentYRange
                    : 0.5;

                // 7b. Remap to world Y within the body zone
                const worldY = zoneBottom + yNorm * zoneHeight;

                // 7c. Angular position in XZ plane
                const localR = Math.sqrt(lx * lx + lz * lz);
                let theta = Math.atan2(lz, lx);

                // 7d. Garment's average radius at this Y-level
                const gAvgR = _getGarmentAvgRadius(gProfile, ly);

                // 7e. Radial ratio: how far out is this vertex relative to garment's own average?
                // ratio > 1 = outer (flare), ratio < 1 = inner (taper)
                let ratio = gAvgR > 0.001 ? localR / gAvgR : 1.0;

                // 7f. Body radius at this (worldY, θ)
                const bodyR = _sampleBodyProfile(bodyProfile, worldY, theta);

                // 7g. Compute target radius
                let targetR;

                if (localR < 0.001) {
                    // Interior/seam vertex near the Y-axis
                    // Place at half body radius
                    targetR = bodyR * EASE_FACTOR * 0.5;
                } else if (hasFlare && ratio > FLARE_THRESHOLD) {
                    // Flared section: preserve the flare but scaled relative to body
                    // The flare amount beyond threshold is kept proportionally
                    const flareAmount = ratio - 1.0;
                    targetR = bodyR * EASE_FACTOR * (1.0 + flareAmount * 0.7);
                } else if (ratio > 1.0) {
                    // Slightly loose/wide area: ease outward gently
                    // Blend between body-hugging and preserving looseness
                    const looseAmount = ratio - 1.0;
                    targetR = bodyR * EASE_FACTOR * (1.0 + looseAmount * 0.4);
                } else {
                    // Tight/fitted area: sit right on the body + ease
                    // Slight modulation by ratio to preserve surface detail
                    targetR = bodyR * EASE_FACTOR * Math.max(0.85, ratio);
                }

                // 7h. Never go inside the body
                targetR = Math.max(targetR, bodyR * 1.005);

                // 7i. Compute new local position
                // The new position in world space is (targetR * cos(θ), worldY, targetR * sin(θ))
                // But we need to write in local space — since garment has identity transform,
                // local = world for XZ, but Y needs to be the mapped local Y.
                const newX = targetR * Math.cos(theta);
                const newZ = targetR * Math.sin(theta);
                // Y: the mapped world position is where this vertex "wants" to be.
                // But we can't write worldY directly because the mesh will be positioned later.
                // Instead, we remap worldY back to a local Y that, after positioning,
                // ends up at worldY. Since the mesh position is set by WornGarment
                // after this function returns, we write the world-relative Y.
                // The mesh will be positioned so its bounding box top aligns with anchorY.
                // So we write positions relative to the zone, and let WornGarment handle final Y.
                const newY = worldY;

                posAttr.setXYZ(i, newX, newY, newZ);
                projected++;
            }

            // ── 8. Laplacian smooth XZ ──────────────────────────────
            _laplacianSmoothXZ(posAttr, adj, SMOOTH_ITERATIONS, SMOOTH_FACTOR);

            // ── 9. Final cleanup ────────────────────────────────────
            posAttr.needsUpdate = true;
            child.geometry.computeVertexNormals();
            child.geometry.computeBoundingBox();
            child.geometry.computeBoundingSphere();
        });

        console.log(`   ✅ Projected ${projected}/${total} vertices`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return {
            anchorY,
            zoneTop,
            zoneBottom,
        };
    }


    // ───────────────────────────────────────────
    //  applyMorphDeltas
    //  Morph target mirroring only. Called BEFORE projectOntoBody
    //  for garments that have morph targets matching the mannequin.
    // ───────────────────────────────────────────
    static applyMorphDeltas(garmentRoot, mannequinNode, mannequinMesh, measurements, bodyZone) {
        console.log(`🧬 applyMorphDeltas zone=${bodyZone}`);

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
                return true;
            }
        }

        console.log('   ℹ️ No morph targets — projection will handle fitting');
        return false;
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