// src/components/3d/WornGarment.jsx
// ═══════════════════════════════════════════════════════════════════
//  WORN GARMENT — R3F component that replaces PhysicsGarment.
//
//  Uses GarmentFitter for one-time fitting. Per-frame work is
//  limited to rotation sync + live anchor Y only.
//
//  Handles both:
//    • Hand-modelled Blender template GLBs (with shape keys)
//    • TripoSR generated GLBs (chaotic topology, no shape keys)
// ═══════════════════════════════════════════════════════════════════

import React, { useRef, useMemo, Suspense } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import GarmentFitter from '../../services/GarmentFitter';

// Pre-allocated — never GC inside useFrame
const _quat = new THREE.Quaternion();
const _anchorPos = new THREE.Vector3();

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

    // ── Detect body zone (stable across renders) ───────────────────
    const bodyZone = useMemo(
        () => GarmentFitter.detectBodyZone(garmentData),
        [garmentData.name, garmentData.type, garmentData.category, garmentData.slot]
    );

    // ── One-time: clone + fit + morph adaptation ───────────────────
    //
    //  Runs ONCE per garment model. Dependencies are primitives
    //  (not object refs) to avoid re-render loops.
    //
    //  Output:
    //    mesh          — the cloned, scaled, morph-adapted Object3D
    //    anchorName    — which landmark to anchor to in useFrame
    //    garmentTopY   — the scaled garment's top Y in local space
    //                    (used to compute: position.y = anchorY - garmentTopY)
    const fitted = useMemo(() => {
        console.log(`🧥 WornGarment: fitting "${garmentData.name}" (zone=${bodyZone})...`);

        // 1. Clone the loaded scene
        const mesh = gltf.scene.clone(true);
        mesh.position.set(0, 0, 0);
        mesh.quaternion.identity();
        mesh.scale.set(1, 1, 1);

        // Enable shadows
        mesh.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // 2. Get live landmarks from mannequin
        let liveLandmarks = {};
        let mannequinMesh = null;
        if (mannequinRef?.current) {
            mannequinRef.current.updateMatrixWorld(true);
            const getLm = mannequinRef.current.getLiveLandmarks;
            if (getLm) liveLandmarks = getLm();
            mannequinMesh = GarmentFitter.getMannequinMesh(mannequinRef.current);
        }

        // 3. Fit to mannequin → per-axis scale + anchor info
        const fitting = GarmentFitter.fitToMannequin(
            mesh, liveLandmarks, measurements, bodyZone
        );

        // 4. Apply the computed scale to the mesh itself
        mesh.scale.set(fitting.scaleX, fitting.scaleY, fitting.scaleZ);
        mesh.updateMatrixWorld(true);

        // 5. Apply morph deltas (shape keys or cage deformer)
        //    Runs AFTER scale so cage deformer verts are in correct space
        GarmentFitter.applyMorphDeltas(
            mesh, liveLandmarks, mannequinMesh, measurements, bodyZone
        );

        // 6. Compute the garment's top Y after scaling
        //    (this is the offset we subtract from the anchor to position correctly)
        mesh.updateMatrixWorld(true);
        const scaledBox = new THREE.Box3().setFromObject(mesh);
        const garmentTopY = scaledBox.max.y;

        return {
            mesh,
            anchorName: fitting.anchorLandmarkName,
            anchorY: fitting.anchorY,
            garmentTopY,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gltf, garmentData, bodyZone,
        measurements?.gender, measurements?.height_cm,
        measurements?.bust_cm, measurements?.waist_cm,
        measurements?.hips_cm, measurements?.shoulder_width_cm,
        measurements?.bmi]);

    // ── Per-frame: rotation sync + live anchor Y ───────────────────
    //  Extremely cheap:
    //    • One getWorldQuaternion
    //    • One getWorldPosition (if landmark exists)
    //    • Set position + quaternion on the wrapper node
    //    • No vertex work, no bounding box, no raycasting
    useFrame(() => {
        if (!meshRef.current || !mannequinRef?.current || !fitted) return;

        mannequinRef.current.updateMatrixWorld(true);

        // ── Rotation: match mannequin + Y correction ───
        mannequinRef.current.getWorldQuaternion(_quat);
        _quat.multiply(_correction);
        meshRef.current.quaternion.copy(_quat);

        // ── Position: anchor garment top to live landmark Y ───
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

        // garment top edge → anchor Y
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
