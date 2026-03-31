// src/utils/GarmentFitter.js
// ═══════════════════════════════════════════════════════════════════
//  GARMENT FITTER — RADIAL CAGE PROJECTION
//
//  Pipeline (called from WornGarment.jsx):
//
//  1. preRotateLowerBody(mesh)       — lower body upright fix
//  2. detectAndAlignFront(mesh)      — rotate geometry to face +Z
//  3. centrePivot(mesh)              — centre at origin
//  4. storeOriginalGeometry(mesh)    — snapshot for re-fitting
//  5. projectOntoBody(...)           — THE MAIN FITTING STEP
//
//  RADIAL CAGE PROJECTION:
//    When a garment_cage mesh is present, we build a cylindrical
//    radial profile (max-R per Y-step × angle-bin) from the cage.
//    This acts as a lightweight displacement modifier — garment
//    vertices are pushed to the cage surface at their angle,
//    preserving silhouette ratios.  O(1) lookup per vertex,
//    no per-triangle search, no browser crashes.
//
//    The mannequin's inner-group rotation is stripped before
//    computing the coordinate frame so the cage profile is always
//    axis-aligned with the garment's +Z front direction.
//
//  FALLBACK (no cage):
//    Angular body profile + conservative convex sweep.
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
const DEFAULT_EASE_FACTOR = 1.035; // cage already has clearance — keep tight
const EASE_BUST_BOOST     = 0.07;
const EASE_CHEST_BOOST    = 0.05;
const EASE_HIPS_BOOST     = 0.06;
const EASE_BOOST_SIGMA    = 0.10;

const PROFILE_Y_STEPS     = 48;
const PROFILE_ANG_BINS    = 16;
const GARMENT_PROFILE_BANDS = 32;
const FLARE_THRESHOLD     = 1.6;
const SMOOTH_ITERATIONS   = 2;
const SMOOTH_FACTOR       = 0.3;


// ═══════════════════════════════════════════════════════════════════
//  (CageBVH removed — replaced by radial cage profile for perf)
// ═══════════════════════════════════════════════════════════════════



// ═══════════════════════════════════════════════════════════════════
//  ANGULAR BODY PROFILE  (fallback — no cage)
// ═══════════════════════════════════════════════════════════════════

function _buildAngularBodyProfile(mannequinMesh, yMin, yMax, ySteps = PROFILE_Y_STEPS, angBins = PROFILE_ANG_BINS, toLocalMatrix = null) {
    const data = new Float32Array(ySteps * angBins);
    if (!mannequinMesh?.geometry?.attributes?.position) return { yMin, yMax, ySteps, angBins, data };

    mannequinMesh.updateMatrixWorld(true);
    const pos = mannequinMesh.geometry.attributes.position;
    const wv  = new THREE.Vector3();
    const sliceH  = ((yMax - yMin) / ySteps) * 0.7;
    const angStep = (2 * Math.PI) / angBins;

    for (let yi = 0; yi < ySteps; yi++) {
        const worldY = yMin + (yMax - yMin) * (yi / (ySteps - 1));
        for (let i = 0; i < pos.count; i++) {
            wv.fromBufferAttribute(pos, i);
            if (toLocalMatrix) wv.applyMatrix4(toLocalMatrix); else mannequinMesh.localToWorld(wv);
            if (Math.abs(wv.y - worldY) > sliceH) continue;
            const r = Math.sqrt(wv.x * wv.x + wv.z * wv.z);
            let theta = Math.atan2(wv.z, wv.x);
            if (theta < 0) theta += 2 * Math.PI;
            const ai = Math.min(Math.floor(theta / angStep), angBins - 1);
            const idx2 = yi * angBins + ai;
            if (r > data[idx2]) data[idx2] = r;
        }
    }

    for (let yi = 0; yi < ySteps; yi++) {
        for (let ai = 0; ai < angBins; ai++) {
            if (data[yi * angBins + ai] > 0.001) continue;
            const prev = data[yi * angBins + ((ai - 1 + angBins) % angBins)];
            const next = data[yi * angBins + ((ai + 1) % angBins)];
            if (prev > 0 || next > 0) data[yi * angBins + ai] = Math.max(prev, next);
        }
    }
    for (let ai = 0; ai < angBins; ai++) {
        for (let yi = 0; yi < ySteps; yi++) {
            if (data[yi * angBins + ai] > 0.001) continue;
            let above = -1, below = -1;
            for (let j = yi - 1; j >= 0; j--) { if (data[j * angBins + ai] > 0.001) { below = j; break; } }
            for (let j = yi + 1; j < ySteps; j++) { if (data[j * angBins + ai] > 0.001) { above = j; break; } }
            if (below >= 0 && above >= 0) {
                const t = (yi - below) / (above - below);
                data[yi * angBins + ai] = data[below * angBins + ai] * (1 - t) + data[above * angBins + ai] * t;
            } else if (below >= 0) data[yi * angBins + ai] = data[below * angBins + ai];
            else if (above >= 0)   data[yi * angBins + ai] = data[above * angBins + ai];
        }
    }

    return { yMin, yMax, ySteps, angBins, data };
}

function _sampleBodyProfile(profile, worldY, theta) {
    const { yMin, yMax, ySteps, angBins, data } = profile;
    let t = theta;
    while (t < 0) t += 2 * Math.PI;
    while (t >= 2 * Math.PI) t -= 2 * Math.PI;
    const yFrac = Math.max(0, Math.min(1, (worldY - yMin) / (yMax - yMin)));
    const yf = yFrac * (ySteps - 1);
    const yi0 = Math.floor(yf), yi1 = Math.min(yi0 + 1, ySteps - 1), yt = yf - yi0;
    const angStep = (2 * Math.PI) / angBins;
    const af = t / angStep;
    const ai0 = Math.floor(af) % angBins, ai1 = (ai0 + 1) % angBins, at = af - Math.floor(af);
    const r0 = data[yi0 * angBins + ai0] * (1 - at) + data[yi0 * angBins + ai1] * at;
    const r1 = data[yi1 * angBins + ai0] * (1 - at) + data[yi1 * angBins + ai1] * at;
    return r0 * (1 - yt) + r1 * yt;
}

function _avgBodyRadiusAtY(profile, worldY) {
    let sum = 0;
    for (let ai = 0; ai < profile.angBins; ai++) sum += _sampleBodyProfile(profile, worldY, (2 * Math.PI * ai) / profile.angBins);
    return sum / profile.angBins;
}

function _sampleConvexBodyRadius(profile, worldY, theta, landmarks, garmentData) {
    const { waistY, hipsY, bustY } = landmarks ?? {};
    let sweepAngle = Math.PI * 0.28;
    if (bustY !== undefined && waistY !== undefined) {
        const sigma = 0.08;
        const bw = Math.exp(-0.5 * (Math.abs(worldY - bustY) / sigma) ** 2);
        const hw = hipsY !== undefined ? Math.exp(-0.5 * (Math.abs(worldY - hipsY) / sigma) ** 2) : 0;
        const ww = Math.exp(-0.5 * (Math.abs(worldY - waistY) / (sigma * 0.8)) ** 2);
        sweepAngle = Math.PI * (0.28 + bw * 0.09 + hw * 0.07 - ww * 0.05);
        sweepAngle = Math.max(Math.PI * 0.15, Math.min(Math.PI * 0.42, sweepAngle));
    }
    const label = [garmentData?.type, garmentData?.name, garmentData?.category, ...(garmentData?.tags ?? [])].join(' ').toLowerCase();
    if (['blazer','jacket','coat','suit','denim','jeans'].some(k => label.includes(k))) {
        sweepAngle = Math.min(Math.PI * 0.42, sweepAngle + Math.PI * 0.05);
    }
    let maxR = 0;
    for (let i = 0; i <= 8; i++) {
        const r = _sampleBodyProfile(profile, worldY, theta + ((i / 8) - 0.5) * sweepAngle);
        if (r > maxR) maxR = r;
    }
    if (Math.abs(Math.abs(theta) - Math.PI) < Math.PI * 0.25) maxR = Math.max(maxR, _sampleBodyProfile(profile, worldY, 0) * 0.82);
    return maxR;
}


// ═══════════════════════════════════════════════════════════════════
//  GARMENT PROFILING
// ═══════════════════════════════════════════════════════════════════

function _buildGarmentRadialProfile(garmentRoot, numBands = GARMENT_PROFILE_BANDS) {
    garmentRoot.updateMatrixWorld(true);
    let localYMin = Infinity, localYMax = -Infinity;
    const radii = [];
    garmentRoot.traverse(child => {
        if (!child.isMesh || !child.geometry?.attributes?.position) return;
        const pos = child.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            radii.push({ y, r: Math.sqrt(x * x + z * z) });
            if (y < localYMin) localYMin = y;
            if (y > localYMax) localYMax = y;
        }
    });
    if (radii.length === 0 || localYMax - localYMin < 0.0001) return { localYMin: 0, localYMax: 1, bands: [] };
    const bandHeight = (localYMax - localYMin) / numBands;
    const bands = [];
    for (let bi = 0; bi < numBands; bi++) {
        const bMin = localYMin + bi * bandHeight, bMax = bMin + bandHeight;
        let sumR = 0, maxR = 0, count = 0;
        for (const { y, r } of radii) { if (y >= bMin && y < bMax) { sumR += r; if (r > maxR) maxR = r; count++; } }
        bands.push({ localYMin: bMin, localYMax: bMax, localYMid: (bMin + bMax) / 2, avgRadius: count > 0 ? sumR / count : 0, maxRadius: maxR, vertexCount: count });
    }
    return { localYMin, localYMax, bands };
}

function _getGarmentAvgRadius(gProfile, localY) {
    const { bands, localYMin, localYMax } = gProfile;
    if (!bands || bands.length === 0) return 0.1;
    if (localY <= localYMin) return bands[0].avgRadius || 0.1;
    if (localY >= localYMax) return bands[bands.length - 1].avgRadius || 0.1;
    for (let i = 0; i < bands.length - 1; i++) {
        if (localY >= bands[i].localYMid && localY < bands[i + 1].localYMid) {
            const t = (localY - bands[i].localYMid) / (bands[i + 1].localYMid - bands[i].localYMid);
            return (bands[i].avgRadius || 0.1) * (1 - t) + (bands[i + 1].avgRadius || 0.1) * t;
        }
    }
    return bands[bands.length - 1].avgRadius || 0.1;
}


// ═══════════════════════════════════════════════════════════════════
//  ADJACENCY & SMOOTHING
// ═══════════════════════════════════════════════════════════════════

function _buildAdjacency(geometry) {
    const count = geometry.attributes.position.count;
    const adj = new Array(count);
    for (let i = 0; i < count; i++) adj[i] = new Set();
    const idx = geometry.index;
    if (idx) {
        const iArr = idx.array;
        for (let t = 0; t < iArr.length; t += 3) {
            const a = iArr[t], b = iArr[t+1], c = iArr[t+2];
            adj[a].add(b); adj[a].add(c); adj[b].add(a); adj[b].add(c); adj[c].add(a); adj[c].add(b);
        }
    } else {
        for (let t = 0; t < count; t += 3) {
            if (t + 2 < count) {
                adj[t].add(t+1); adj[t].add(t+2); adj[t+1].add(t); adj[t+1].add(t+2); adj[t+2].add(t); adj[t+2].add(t+1);
            }
        }
    }
    return adj;
}

function _laplacianSmoothXZ(posAttr, adj, iterations = SMOOTH_ITERATIONS, factor = SMOOTH_FACTOR) {
    const count = posAttr.count;
    const tempX = new Float32Array(count), tempZ = new Float32Array(count);
    for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < count; i++) {
            const nb = adj[i];
            if (!nb || nb.size === 0) { tempX[i] = posAttr.getX(i); tempZ[i] = posAttr.getZ(i); continue; }
            let ax = 0, az = 0;
            for (const n of nb) { ax += posAttr.getX(n); az += posAttr.getZ(n); }
            ax /= nb.size; az /= nb.size;
            tempX[i] = posAttr.getX(i) + (ax - posAttr.getX(i)) * factor;
            tempZ[i] = posAttr.getZ(i) + (az - posAttr.getZ(i)) * factor;
        }
        for (let i = 0; i < count; i++) { posAttr.setX(i, tempX[i]); posAttr.setZ(i, tempZ[i]); }
    }
}


// ═══════════════════════════════════════════════════════════════════
class GarmentFitter {

    static storeOriginalGeometry(mesh) {
        mesh.traverse(child => {
            if (!child.isMesh || !child.geometry?.attributes?.position) return;
            child.geometry.userData.originalPositions = new Float32Array(child.geometry.attributes.position.array);
        });
        console.log('   📸 storeOriginalGeometry: snapshot saved');
    }

    static restoreOriginalGeometry(mesh) {
        let restored = 0;
        mesh.traverse(child => {
            if (!child.isMesh || !child.geometry?.attributes?.position) return;
            const orig = child.geometry.userData.originalPositions;
            if (!orig) return;
            child.geometry.attributes.position.array.set(orig);
            child.geometry.attributes.position.needsUpdate = true;
            child.geometry.computeVertexNormals();
            child.geometry.computeBoundingBox();
            child.geometry.computeBoundingSphere();
            restored++;
        });
        if (restored > 0) console.log(`   🔄 restoreOriginalGeometry: ${restored} mesh(es) reset`);
    }

    static detectBodyZone(garmentData) {
        const combined = [garmentData?.type, garmentData?.name, garmentData?.slot, garmentData?.category].join(' ').toLowerCase();
        if (BOTTOM_KEYWORDS.some(kw => combined.includes(kw))) return 'lower';
        if ((garmentData?.slot || '').toLowerCase() === 'lower') return 'lower';
        return 'upper';
    }

    static centrePivot(mesh) {
        mesh.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(mesh);
        const centre = new THREE.Vector3();
        box.getCenter(centre);
        mesh.traverse(child => { if (child.isMesh && child.geometry) child.geometry.translate(-centre.x, -centre.y, -centre.z); });
        mesh.position.set(0, 0, 0);
        mesh.updateMatrixWorld(true);
        console.log(`   📌 centrePivot: (${centre.x.toFixed(3)}, ${centre.y.toFixed(3)}, ${centre.z.toFixed(3)})`);
    }

    // ═══════════════════════════════════════════════════════════════
    //  preRotateLowerBody
    //  Only rotates if the garment is clearly lying flat (Y < 30%
    //  of the largest horizontal extent). Threshold was 0.6 before
    //  which incorrectly triggered on upright pants.
    // ═══════════════════════════════════════════════════════════════
    static preRotateLowerBody(mesh) {
        mesh.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const isFlat = size.y < Math.max(size.x, size.z) * 0.3;
        if (isFlat) {
            console.log(`   🔄 preRotateLowerBody: lying flat — rotating upright (Y=${size.y.toFixed(3)} X=${size.x.toFixed(3)} Z=${size.z.toFixed(3)})`);
            const rotMatrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
            mesh.traverse(child => {
                if (!child.isMesh || !child.geometry) return;
                child.geometry.applyMatrix4(rotMatrix);
                child.geometry.computeVertexNormals();
            });
            mesh.updateMatrixWorld(true);
        } else {
            console.log(`   ✅ preRotateLowerBody: already upright (Y=${size.y.toFixed(3)} X=${size.x.toFixed(3)} Z=${size.z.toFixed(3)})`);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  detectAndAlignFront
    //  If all four axis scores are within 15% of each other the
    //  garment is symmetric — skip rotation to avoid random flipping.
    // ═══════════════════════════════════════════════════════════════
    static detectAndAlignFront(mesh) {
        mesh.updateMatrixWorld(true);
        const dirScores = { '+X': 0, '-X': 0, '+Z': 0, '-Z': 0 };
        const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
        const faceNormal = new THREE.Vector3(), edge1 = new THREE.Vector3(), edge2 = new THREE.Vector3();

        mesh.traverse(child => {
            if (!child.isMesh || !child.geometry?.attributes?.position) return;
            const geo = child.geometry, pos = geo.attributes.position, nrm = geo.attributes.normal, idx = geo.index;
            const faceCount = idx ? Math.floor(idx.count / 3) : Math.floor(pos.count / 3);
            for (let fi = 0; fi < faceCount; fi++) {
                const i0 = idx ? idx.getX(fi * 3) : fi * 3;
                const i1 = idx ? idx.getX(fi * 3 + 1) : fi * 3 + 1;
                const i2 = idx ? idx.getX(fi * 3 + 2) : fi * 3 + 2;
                vA.fromBufferAttribute(pos, i0); vB.fromBufferAttribute(pos, i1); vC.fromBufferAttribute(pos, i2);
                edge1.subVectors(vB, vA); edge2.subVectors(vC, vA);
                faceNormal.crossVectors(edge1, edge2);
                const area = faceNormal.length() * 0.5;
                if (nrm) {
                    faceNormal.copy(new THREE.Vector3().fromBufferAttribute(nrm, i0))
                        .add(new THREE.Vector3().fromBufferAttribute(nrm, i1))
                        .add(new THREE.Vector3().fromBufferAttribute(nrm, i2)).normalize();
                } else faceNormal.normalize();
                dirScores['+X'] += Math.max(0, faceNormal.x) * area;
                dirScores['-X'] += Math.max(0, -faceNormal.x) * area;
                dirScores['+Z'] += Math.max(0, faceNormal.z) * area;
                dirScores['-Z'] += Math.max(0, -faceNormal.z) * area;
            }
        });

        let bestDir = '+Z', bestScore = 0;
        for (const [dir, score] of Object.entries(dirScores)) { if (score > bestScore) { bestDir = dir; bestScore = score; } }

        // Symmetric garment guard — if margin < 15%, don't rotate
        const secondBest = Object.entries(dirScores).filter(([d]) => d !== bestDir).reduce((m, [, s]) => Math.max(m, s), 0);
        const margin = bestScore > 0 ? (bestScore - secondBest) / bestScore : 0;
        if (margin < 0.15) {
            console.log(`   ⚖️ Symmetric garment (margin=${(margin*100).toFixed(1)}%) — no rotation, defaulting to +Z`);
            bestDir = '+Z';
        }

        console.log(`   🧭 Scores: +X=${dirScores['+X'].toFixed(2)} -X=${dirScores['-X'].toFixed(2)} +Z=${dirScores['+Z'].toFixed(2)} -Z=${dirScores['-Z'].toFixed(2)} → ${bestDir}`);

        const angle = { '+Z': 0, '-Z': Math.PI, '+X': -Math.PI / 2, '-X': Math.PI / 2 }[bestDir] ?? 0;
        if (Math.abs(angle) > 0.001) {
            const rotMatrix = new THREE.Matrix4().makeRotationY(angle);
            mesh.traverse(child => {
                if (!child.isMesh || !child.geometry) return;
                child.geometry.applyMatrix4(rotMatrix);
                child.geometry.computeVertexNormals();
            });
            console.log(`   🔄 Rotated ${(angle * 180 / Math.PI).toFixed(0)}° to align with +Z`);
        } else {
            console.log('   ✅ Already aligned with +Z');
        }

        mesh.updateMatrixWorld(true);
        return bestDir;
    }

    // ═══════════════════════════════════════════════════════════════
    //  projectOntoBody — RADIAL CAGE PROJECTION
    //
    //  Whether cage or mannequin body is used as the target surface,
    //  we build a cylindrical radial profile (max-R per Y × angle
    //  bin) and project garment vertices onto it.  This is a
    //  lightweight "displacement modifier" — O(1) per vertex lookup,
    //  no per-triangle search, no browser crashes.
    //
    //  FIX: mannequin inner-group rotation is stripped before
    //  computing the coordinate frame so the profile is always
    //  axis-aligned with the garment's +Z front.
    // ═══════════════════════════════════════════════════════════════
    static projectOntoBody(garmentRoot, mannequinNode, measurements, bodyZone, easeFactor = DEFAULT_EASE_FACTOR, garmentData = {}) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🎯 projectOntoBody zone=${bodyZone} ease=${easeFactor.toFixed(3)}`);

        GarmentFitter.restoreOriginalGeometry(garmentRoot);
        garmentRoot.position.set(0, 0, 0);
        garmentRoot.quaternion.identity();
        garmentRoot.scale.set(1, 1, 1);
        garmentRoot.updateMatrixWorld(true);

        const mannequinMesh = GarmentFitter.getMannequinMesh(mannequinNode);
        if (!mannequinMesh) {
            console.warn('   ⚠️ No mannequin mesh');
            return { anchorY: 2.0, zoneTop: 2.3, zoneBottom: 1.7 };
        }

        // ── Cage check ───────────────────────────────────────────────
        let cageMesh = null, useCage = false;
        if (typeof mannequinNode?.getCageMesh === 'function') {
            cageMesh = mannequinNode.getCageMesh();
            if (cageMesh) { useCage = true; console.log('   🔲 Cage found — radial cage projection mode'); }
        }

        // ── FIX: Strip mannequin inner-group rotation ────────────────
        //    The mannequin's Group may carry residual rotation.y from
        //    the auto-rotate animation.  We temporarily zero it so the
        //    cage / body profile is axis-aligned with the garment's +Z
        //    front direction.  This prevents the persistent "garment at
        //    90 degrees" artefact for lower-body garments.
        const savedQuat = mannequinNode.quaternion.clone();
        mannequinNode.quaternion.identity();
        mannequinNode.updateMatrixWorld(true);
        mannequinMesh.updateMatrixWorld(true);
        if (cageMesh) cageMesh.updateMatrixWorld(true);

        // ── Coordinate frame ─────────────────────────────────────────
        let toGarmentSpace = null;
        const parentGroup = mannequinNode.parent;
        if (parentGroup) {
            parentGroup.updateMatrixWorld(true);
            const targetMesh = cageMesh || mannequinMesh;
            toGarmentSpace = new THREE.Matrix4()
                .copy(parentGroup.matrixWorld).invert()
                .multiply(targetMesh.matrixWorld);
        }

        // Restore mannequin rotation (visual only — our toGarmentSpace
        // is already captured with the rotation stripped)
        mannequinNode.quaternion.copy(savedQuat);
        mannequinNode.updateMatrixWorld(true);

        // ── Landmarks ────────────────────────────────────────────────
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

        // ── Zone ─────────────────────────────────────────────────────
        let zoneTop, zoneBottom, anchorY, fitTop, fitBottom;
        if (bodyZone === 'upper') {
            zoneTop = neckY + 0.05; zoneBottom = waistY - 0.10;
            anchorY = shoulderY; fitTop = shoulderY; fitBottom = waistY;
        } else {
            zoneTop = waistY + 0.03;
            // Extend to near ground so pants cover the full
            // display-stand height, not just the mannequin body.
            zoneBottom = 0.02;
            anchorY = waistY; fitTop = waistY; fitBottom = hipsY;
        }
        const zoneHeight = zoneTop - zoneBottom;
        const blendWidthTop = zoneHeight * 0.25, blendWidthBottom = zoneHeight * 0.20;
        console.log(`   📐 zone top=${zoneTop.toFixed(3)} bottom=${zoneBottom.toFixed(3)} h=${zoneHeight.toFixed(3)}`);

        // ── Garment profile ──────────────────────────────────────────
        const gProfile = _buildGarmentRadialProfile(garmentRoot);
        const { localYMin: garmentLocalYMin, localYMax: garmentLocalYMax } = gProfile;
        const garmentYRange = garmentLocalYMax - garmentLocalYMin;
        const uniformScale  = garmentYRange > 0.001 ? zoneHeight / garmentYRange : 1.0;
        const globalAvgR    = gProfile.bands.reduce((s, b) => s + b.avgRadius, 0) / (gProfile.bands.length || 1);
        const maxBandR      = Math.max(...gProfile.bands.map(b => b.avgRadius));
        const flareRatio    = globalAvgR > 0.001 ? maxBandR / globalAvgR : 1.0;
        const hasFlare      = flareRatio > FLARE_THRESHOLD;
        console.log(`   👕 Y=[${garmentLocalYMin.toFixed(3)}, ${garmentLocalYMax.toFixed(3)}] flare=${flareRatio.toFixed(2)} hasFlare=${hasFlare}`);

        const bustY  = bodyZone === 'upper' ? waistY + (shoulderY - waistY) * 0.45 : -999;
        const chestY = bodyZone === 'upper' ? waistY + (shoulderY - waistY) * 0.60 : -999;

        // ── Build surface radial profile ─────────────────────────────
        //    Whether cage or body mesh, we build a cylindrical radial
        //    profile (max-R per Y-step × angle-bin).  For the cage
        //    this acts as a lightweight "displacement modifier" —
        //    garment vertices are pushed to the cage surface at their
        //    angle.  O(1) lookup per vertex, no browser crashes.
        const profileMesh   = useCage ? cageMesh : mannequinMesh;
        const SURF_Y_STEPS  = useCage ? 64 : PROFILE_Y_STEPS;
        const SURF_ANG_BINS = useCage ? 36 : PROFILE_ANG_BINS;

        const surfaceProfile = _buildAngularBodyProfile(
            profileMesh, zoneBottom - 0.1, zoneTop + 0.1,
            SURF_Y_STEPS, SURF_ANG_BINS, toGarmentSpace
        );

        if (useCage) {
            console.log(`   🔲 Cage radial profile: ${SURF_Y_STEPS}×${SURF_ANG_BINS} = ${SURF_Y_STEPS * SURF_ANG_BINS} bins`);
        }
        console.log(`   🔵 Surface: waist=${_avgBodyRadiusAtY(surfaceProfile, waistY).toFixed(4)} hips=${_avgBodyRadiusAtY(surfaceProfile, hipsY).toFixed(4)}`);

        // ── Garment-to-body scale ────────────────────────────────────
        //    Compute a uniform XZ scale so the garment's average radius
        //    at the mid-fitting-zone matches the body's.  Below the
        //    fitting zone (e.g. pant legs on a legless dressform) the
        //    garment keeps its OWN proportional shape because the body
        //    surface goes to zero and max() selects the garment radius.
        const refWorldY   = (fitTop + fitBottom) * 0.5;
        const refBodyR    = _avgBodyRadiusAtY(surfaceProfile, refWorldY);
        const refLocalY   = garmentLocalYMin + garmentYRange * 0.5;
        const refGarmentR = _getGarmentAvgRadius(gProfile, refLocalY);
        const scaleXZ     = refGarmentR > 0.001
            ? (refBodyR * easeFactor) / refGarmentR
            : uniformScale;
        console.log(`   📏 scaleXZ=${scaleXZ.toFixed(4)} (refBody=${refBodyR.toFixed(4)} refGarment=${refGarmentR.toFixed(4)})`);

        // ── Anti-peeking minimum clearance ───────────────────────────
        //    6% offset over the body surface prevents the mannequin
        //    from peaking through the garment at any angle.
        const MIN_CLEARANCE = useCage ? 1.04 : 1.06;

        // ── Per-vertex projection ────────────────────────────────────
        //    SHAPE-PRESERVING STRATEGY:
        //    For each vertex we compute TWO candidate radii:
        //      A) garmentDesignR — the garment's own shape, uniformly
        //         scaled to match the body at the reference zone
        //      B) bodyClearance — the body surface + ease offset
        //    The final radius is max(A, B).
        //      • Where the garment is already larger than the body
        //        it keeps its designed shape (no ballooning).
        //      • Where the garment would clip into the body it gets
        //        pushed outward (no peeking).
        //      • Below a legless dressform, surfaceR → 0, so the
        //        garment's own shape dominates (no leg collapse).
        let projected = 0, total = 0;

        garmentRoot.traverse(child => {
            if (!child.isMesh || !child.geometry?.attributes?.position) return;
            const posAttr = child.geometry.attributes.position;
            const adj = _buildAdjacency(child.geometry);

            for (let i = 0; i < posAttr.count; i++) {
                const lx = posAttr.getX(i), ly = posAttr.getY(i), lz = posAttr.getZ(i);
                total++;

                const yNorm  = garmentYRange > 0.001 ? (ly - garmentLocalYMin) / garmentYRange : 0.5;
                const worldY = zoneBottom + yNorm * zoneHeight;

                const localR = Math.sqrt(lx * lx + lz * lz);
                const theta  = Math.atan2(lz, lx);
                const gAvgR  = _getGarmentAvgRadius(gProfile, ly);
                const ratio  = gAvgR > 0.001 ? localR / gAvgR : 1.0;

                // ── Body surface radius at this (Y, θ) ──────────────
                const surfaceR = useCage
                    ? _sampleBodyProfile(surfaceProfile, worldY, theta)
                    : _sampleConvexBodyRadius(surfaceProfile, worldY, theta, { bustY, waistY, hipsY }, garmentData);

                // ── Bust softening (upper body) ──────────────────────
                //    Real t-shirts drape with a smooth elevated slant
                //    over the chest — they don't conform to the exact
                //    breast contour.  We soften by blending toward the
                //    Y-neighborhood peak radius, creating a tent/bridge
                //    that touches the bust peak and drapes smoothly.
                let effectiveSurfR = surfaceR;
                if (bodyZone === 'upper' && bustY > 0) {
                    const bustInfluence = Math.exp(-0.5 * ((worldY - bustY) / 0.10) ** 2);
                    if (bustInfluence > 0.1) {
                        let tentR = surfaceR;
                        for (let dy = -0.06; dy <= 0.06; dy += 0.015) {
                            const sR = useCage
                                ? _sampleBodyProfile(surfaceProfile, worldY + dy, theta)
                                : _sampleConvexBodyRadius(surfaceProfile, worldY + dy, theta, { bustY, waistY, hipsY }, garmentData);
                            if (sR > tentR) tentR = sR;
                        }
                        // Blend: at bust peak use mostly tent, fade out away
                        effectiveSurfR = surfaceR + (tentR - surfaceR) * bustInfluence * 0.65;
                    }
                }

                // ── Ease boosts (fallback only) ──────────────────────
                let vertexEase = easeFactor;
                if (!useCage) {
                    vertexEase += EASE_BUST_BOOST  * Math.exp(-0.5 * ((worldY - bustY)  / EASE_BOOST_SIGMA) ** 2)
                               + EASE_CHEST_BOOST * Math.exp(-0.5 * ((worldY - chestY) / EASE_BOOST_SIGMA) ** 2)
                               + EASE_HIPS_BOOST  * Math.exp(-0.5 * ((worldY - hipsY)  / EASE_BOOST_SIGMA) ** 2);
                }

                // ── A) Garment's own designed radius (scaled) ────────
                const garmentDesignR = localR * scaleXZ;

                // ── B) Body clearance radius ─────────────────────────
                //    effectiveSurfR * ease gives the softened drape.
                //    Below body extent, surfaceR → 0 so this → 0 too.
                const bodyClearance = effectiveSurfR > 0.001
                    ? effectiveSurfR * vertexEase
                    : 0;

                // ── Final radius = max(garment shape, body clearance)
                let newX, newY = worldY, newZ;
                let targetR;

                if (localR < 0.001) {
                    // Centre-axis vertex — keep it near centre
                    targetR = bodyClearance > 0 ? bodyClearance * 0.3 : garmentDesignR;
                } else if (hasFlare && ratio > FLARE_THRESHOLD) {
                    // Dramatic flare (skirt hem) — preserve with extra room
                    const flareR = garmentDesignR * (1.0 + (ratio - 1.0) * 0.5);
                    targetR = Math.max(flareR, bodyClearance);
                } else {
                    // Normal vertex — larger of garment or body clearance
                    targetR = Math.max(garmentDesignR, bodyClearance);
                }

                // Absolute minimum: never clip through body surface
                if (surfaceR > 0.001) {
                    targetR = Math.max(targetR, surfaceR * MIN_CLEARANCE);
                }

                newX = targetR * Math.cos(theta);
                newZ = targetR * Math.sin(theta);

                // ── Blend: fitting zone edges vs original shape ──────
                //    At the top/bottom edges of the zone (neckline,
                //    hem) smoothly blend back to the original shape to
                //    preserve design features like necklines and cuffs.
                let blend = 1.0;
                if (worldY > fitTop) {
                    const t = Math.min(1.0, (worldY - fitTop) / blendWidthTop);
                    blend = 1.0 - t; blend = blend * blend * (3.0 - 2.0 * blend);
                } else if (worldY < fitBottom) {
                    const t = Math.min(1.0, (fitBottom - worldY) / blendWidthBottom);
                    blend = 1.0 - t; blend = blend * blend * (3.0 - 2.0 * blend);
                }

                if (blend >= 0.999) {
                    posAttr.setXYZ(i, newX, newY, newZ);
                } else {
                    // Blend between projected position and garment's
                    // own scaled shape (NOT body projection)
                    const origX = lx * scaleXZ;
                    const origZ = lz * scaleXZ;
                    posAttr.setXYZ(i,
                        newX * blend + origX * (1.0 - blend),
                        worldY,
                        newZ * blend + origZ * (1.0 - blend)
                    );
                }
                projected++;
            }

            _laplacianSmoothXZ(posAttr, adj, SMOOTH_ITERATIONS, SMOOTH_FACTOR);
            posAttr.needsUpdate = true;
            child.geometry.computeVertexNormals();
            child.geometry.computeBoundingBox();
            child.geometry.computeBoundingSphere();
        });

        console.log(`   ✅ ${projected}/${total} vertices (${useCage ? 'cage-radial-projection' : 'body-radial-fallback'})`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return { anchorY, zoneTop, zoneBottom };
    }


    static applyMorphDeltas(garmentRoot, mannequinNode, mannequinMesh, measurements, bodyZone) {
        console.log(`🧬 applyMorphDeltas zone=${bodyZone}`);
        let morphableChild = null;
        garmentRoot.traverse(child => { if (child.isMesh && child.morphTargetDictionary && !morphableChild) morphableChild = child; });
        if (morphableChild && mannequinMesh?.morphTargetDictionary) {
            const mapped = GarmentFitter._applyMorphTargets(morphableChild, mannequinMesh);
            if (mapped > 0) { console.log(`   ✅ Morph targets: ${mapped} mapped`); return true; }
        }
        console.log('   ℹ️ No morph targets — projection will handle fitting');
        return false;
    }

    static getMannequinMesh(mannequinNode) {
        let mesh = null;
        if (!mannequinNode) return null;
        mannequinNode.traverse(child => { if (child.isMesh && child.morphTargetDictionary && !mesh) mesh = child; });
        if (!mesh) mannequinNode.traverse(child => { if (child.isMesh && !mesh) mesh = child; });
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
        const gDict = garmentMesh.morphTargetDictionary, gInf = garmentMesh.morphTargetInfluences;
        const mDict = mannequinMesh.morphTargetDictionary, mInf = mannequinMesh.morphTargetInfluences;
        let mapped = 0;
        for (const [mannKey, mannIdx] of Object.entries(mDict)) {
            const val = mInf[mannIdx] || 0;
            if (Math.abs(val) < 0.01) continue;
            for (const alias of (MORPH_ALIASES[mannKey] || [mannKey])) {
                if (gDict[alias] !== undefined) { gInf[gDict[alias]] = val; mapped++; break; }
            }
        }
        if (mapped > 0) garmentMesh.morphTargetInfluences = [...gInf];
        return mapped;
    }
}

export default GarmentFitter;
export { BASELINE_LANDMARKS, BASELINE_MEASUREMENTS, DEFAULT_EASE_FACTOR };