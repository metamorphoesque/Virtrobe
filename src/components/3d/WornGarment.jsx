// src/components/3d/WornGarment.jsx
// ═══════════════════════════════════════════════════════════════════
//  WORN GARMENT — R3F component that replaces PhysicsGarment.
//
//  Calls GarmentFitter ONCE on load inside useMemo.
//  Per-frame work is limited to rotation sync only — no position
//  or scale changes per frame.
//
//  Handles both TripoSR and Blender template GLBs via isTemplate.
// ═══════════════════════════════════════════════════════════════════

import React, { useRef, useMemo, Suspense } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import GarmentFitter from '../../utils/GarmentFitter';

// Pre-allocated — never GC inside useFrame
const _anchorPos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const GARMENT_Y_CORRECTION = -Math.PI / 2;
const _correction = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0), GARMENT_Y_CORRECTION
);

// ─────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────

const WornGarment = ({ garmentData, mannequinRef, measurements }) => {
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

// ─────────────────────────────────────────────
//  GARMENT MESH — the actual fitted garment
// ─────────────────────────────────────────────

const GarmentMesh = ({ modelUrl, garmentData, mannequinRef, measurements }) => {
    const meshRef = useRef();
    const gltf = useLoader(GLTFLoader, modelUrl);

    const isTemplate = garmentData?.isTemplate === true;

    // ── Detect body zone (stable) ──────────────────────────────────
    const bodyZone = useMemo(
        () => GarmentFitter.detectBodyZone(garmentData),
        [garmentData.name, garmentData.type, garmentData.category, garmentData.slot]
    );

    // ── One-time: clone + pivot + fit + morph ──────────────────────
    //
    //  Pipeline:
    //    1. Clone the GLB scene
    //    2. centrePivot() — fix arbitrary TripoSR pivots
    //    3. fitToMannequin() — compute per-axis scale + anchor
    //    4. Apply scale
    //    5. applyMorphDeltas() — shape keys or cage deformer
    //    6. Compute garment top Y for anchor positioning
    //
    const fitted = useMemo(() => {
        console.log(`🧥 WornGarment: fitting "${garmentData.name}" (zone=${bodyZone}, isTemplate=${isTemplate})...`);

        // 1. Clone
        const mesh = gltf.scene.clone(true);
        mesh.position.set(0, 0, 0);
        mesh.quaternion.identity();
        mesh.scale.set(1, 1, 1);

        mesh.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // 2. Centre pivot — BEFORE scaling (Blender "Set Origin to Geometry")
        //    For template garments the pivot is typically pre-set, but
        //    it's safe to run anyway (no-op if already centred).
        GarmentFitter.centrePivot(mesh);

        // 3. Get mannequin ref for fitting
        const mannNode = mannequinRef?.current ?? null;
        const mannequinMesh = mannNode ? GarmentFitter.getMannequinMesh(mannNode) : null;

        // 4. Fit → per-axis scale + anchor info
        const fitting = GarmentFitter.fitToMannequin(
            mesh, mannNode, measurements, bodyZone, isTemplate
        );

        // 5. Apply independent per-axis scale
        mesh.scale.set(fitting.scaleX, fitting.scaleY, fitting.scaleZ);
        mesh.updateMatrixWorld(true);

        // 6. Apply morph deltas (shape keys or cage deformer) — runs ONCE
        GarmentFitter.applyMorphDeltas(
            mesh, mannNode, mannequinMesh, measurements, bodyZone
        );

        // 7. Anchor positioning — top of garment aligns with anchor landmark
        mesh.position.set(0, 0, 0);
        mesh.updateMatrixWorld(true);
        const scaledBox = new THREE.Box3().setFromObject(mesh);
        const garmentTopY = scaledBox.max.y;

        // Position: top of garment at anchorY, centred on X/Z
        mesh.position.set(0, fitting.anchorY - garmentTopY, 0);

        console.log(`   garmentTopY=${garmentTopY.toFixed(4)}, anchorY=${fitting.anchorY.toFixed(4)}`);
        console.log(`   → positionY=${(fitting.anchorY - garmentTopY).toFixed(4)}`);

        return {
            mesh,
            anchorName: fitting.anchorLandmarkName,
            anchorY: fitting.anchorY,
            garmentTopY,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gltf, garmentData.name, garmentData.type, garmentData.modelUrl,
        bodyZone, isTemplate,
        measurements?.gender, measurements?.height_cm,
        measurements?.bust_cm, measurements?.waist_cm,
        measurements?.hips_cm, measurements?.shoulder_width_cm,
        measurements?.bmi]);

    // ── Per-frame: rotation sync only ──────────────────────────────
    //
    //  The garment is a child of the same rotated <group> as the
    //  mannequin so it inherits the transform automatically. But we
    //  also sync the mannequin's world quaternion with the -π/2 Y
    //  correction that is already working. Only rotation — no
    //  position or scale changes per frame.
    //
    useFrame(() => {
        if (!meshRef.current || !mannequinRef?.current || !fitted) return;

        mannequinRef.current.updateMatrixWorld(true);

        // Rotation sync: copy mannequin world quaternion + Y correction
        mannequinRef.current.getWorldQuaternion(_quat);
        _quat.multiply(_correction);
        meshRef.current.quaternion.copy(_quat);

        // Live anchor Y tracking (landmarks move with morph targets)
        let anchorY = fitted.anchorY;
        const getLandmarks = mannequinRef.current.getLiveLandmarks;
        if (getLandmarks) {
            const lm = getLandmarks();
            const anchorNode = lm[fitted.anchorName];
            if (anchorNode) {
                anchorNode.updateWorldMatrix(true, false);
                anchorNode.getWorldPosition(_anchorPos);
                anchorY = _anchorPos.y;
            }
        }

        // Anchor: top of garment at landmark Y, centred on X/Z
        meshRef.current.position.set(0, anchorY - fitted.garmentTopY, 0);
    });

    return <primitive ref={meshRef} object={fitted.mesh} />;
};

// ─────────────────────────────────────────────
//  LOADING INDICATOR
// ─────────────────────────────────────────────

const LoadingIndicator = () => (
    <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.3, 0.6, 0.2]} />
        <meshStandardMaterial color="#cccccc" transparent opacity={0.3} wireframe />
    </mesh>
);

export default WornGarment;
