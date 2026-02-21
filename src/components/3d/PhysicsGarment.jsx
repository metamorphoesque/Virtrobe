// src/components/3d/PhysicsGarment.jsx
// ============================================
// GARMENT LOADER — Anchor-point positioning
// Position is computed from the mannequin bounding box
// directly, NOT from bodyTargets (avoids per-frame recompute).
// ============================================

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { addFrontMarker, tagFrontDirection } from '../../utils/frontFaceMarker';

// ─────────────────────────────────────────────
//  THE ONE KNOB TO TURN — same as old GarmentLoader3D
// ─────────────────────────────────────────────
const GARMENT_Y_CORRECTION = -Math.PI / 2;

// ── Garment height as a fraction of mannequin bounding-box height ──
const HEIGHT_RATIOS = {
    shirt: 0.40,
    jacket: 0.45,
    dress: 0.72,
    pants: 0.52,
    shorts: 0.28,
    skirt: 0.35,
};

// ── Where the TOP EDGE of the garment should sit ──
// Fraction of mannequin height measured from the BOTTOM.
// e.g. 0.80 = 80% from the bottom = shoulder line
const TOP_ANCHORS = {
    shirt: 0.80,   // shoulders
    jacket: 0.80,
    dress: 0.80,
    pants: 0.55,   // waist
    shorts: 0.55,
    skirt: 0.55,
};

function getMannequinWorldQuaternion(ref) {
    if (!ref?.current) return null;
    ref.current.updateMatrixWorld(true);
    const q = new THREE.Quaternion();
    ref.current.getWorldQuaternion(q);
    return q;
}

// ─────────────────────────────────────────────
//  TOP-LEVEL WRAPPER
// ─────────────────────────────────────────────
const PhysicsGarment = ({ garmentData, measurements, mannequinRef }) => {
    const [mannequinData, setMannequinData] = useState(null);

    const modelUrl = garmentData?.modelUrl;
    if (!modelUrl) return null;

    const fullModelUrl = modelUrl.startsWith('http')
        ? modelUrl
        : `http://localhost:5000${modelUrl}`;

    // Stable key for mannequin bounds — only recompute when values change
    const measKey = `${measurements.gender}_${measurements.height_cm}_${measurements.weight_kg}_${measurements.bust_cm}_${measurements.waist_cm}_${measurements.hips_cm}_${measurements.shoulder_width_cm}`;

    useEffect(() => {
        if (!mannequinRef?.current) return;
        const mannequin = mannequinRef.current;
        mannequin.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(mannequin);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        setMannequinData(prev => {
            if (prev &&
                Math.abs(prev.size.y - size.y) < 0.001 &&
                Math.abs(prev.center.y - center.y) < 0.001) {
                return prev;
            }
            const bottomY = center.y - size.y * 0.5;
            console.log('📐 Mannequin bounds:',
                'size:', size.toArray().map(v => v.toFixed(3)),
                'center:', center.toArray().map(v => v.toFixed(3)),
                'bottomY:', bottomY.toFixed(3),
                'topY:', (center.y + size.y * 0.5).toFixed(3));
            return { size, center, bottomY };
        });
    }, [mannequinRef, measKey]);

    // ── Compute garment transform from anchor points ──
    // NO bodyTargets — purely from mannequin bounding box
    const garmentTransform = useMemo(() => {
        if (!mannequinData) return null;
        const { size, center, bottomY } = mannequinData;
        const garmentType = garmentData.type || 'shirt';

        const heightRatio = HEIGHT_RATIOS[garmentType] ?? 0.40;
        const topAnchor = TOP_ANCHORS[garmentType] ?? 0.80;
        const targetHeight = size.y * heightRatio;

        // Top edge of garment at the anchor point
        const garmentTopY = bottomY + size.y * topAnchor;
        // Center the garment below its top edge
        const garmentCenterY = garmentTopY - targetHeight / 2;

        const position = new THREE.Vector3(center.x, garmentCenterY, center.z);

        console.log(`📍 ${garmentType}: topAnchorY=${garmentTopY.toFixed(3)}, centerY=${garmentCenterY.toFixed(3)}, targetH=${targetHeight.toFixed(3)}`);

        return {
            targetHeight,
            position,
            mannequinQuat: getMannequinWorldQuaternion(mannequinRef),
        };
    }, [mannequinData, garmentData.type, mannequinRef]);

    return (
        <Suspense fallback={<LoadingIndicator />}>
            <GarmentMesh
                modelUrl={fullModelUrl}
                transform={garmentTransform}
                garmentData={garmentData}
                mannequinRef={mannequinRef}
            />
        </Suspense>
    );
};

// ─────────────────────────────────────────────
//  INNER MESH
// ─────────────────────────────────────────────
const GarmentMesh = ({ modelUrl, transform, garmentData, mannequinRef }) => {
    const meshRef = useRef();
    const gltf = useLoader(GLTFLoader, modelUrl);

    // Raw diagnostic — once per model load
    useEffect(() => {
        const raw = gltf.scene;
        raw.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(raw);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        console.log('🔍 RAW GLB:', `X=${size.x.toFixed(3)} Y=${size.y.toFixed(3)} Z=${size.z.toFixed(3)}`);
    }, [gltf]);

    // Build positioned garment mesh — same proven logic as GarmentLoader3D
    const garmentMesh = useMemo(() => {
        const mesh = gltf.scene.clone(true);
        if (!transform) return mesh;

        // 1. Reset
        mesh.position.set(0, 0, 0);
        mesh.quaternion.identity();
        mesh.scale.set(1, 1, 1);
        mesh.updateMatrixWorld(true);

        // 2. Measure raw size
        const bbox = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        bbox.getSize(size);
        bbox.getCenter(center);
        const garmentHeight = Math.max(size.x, size.y, size.z);
        const scale = transform.targetHeight / garmentHeight;

        // 3. Center at origin
        mesh.position.sub(center);

        // 4. Apply mannequin quaternion + Y correction
        if (transform.mannequinQuat) {
            mesh.setRotationFromQuaternion(transform.mannequinQuat);
            const correction = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 1, 0),
                GARMENT_Y_CORRECTION,
            );
            mesh.quaternion.multiply(correction);
        }

        // 5. Scale
        mesh.scale.setScalar(scale);

        // 6. Position
        mesh.position.copy(transform.position);

        // 7. Shadows
        mesh.traverse(child => {
            if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
        });

        // 8. Debug markers
        tagFrontDirection(mesh, '+Z');
        addFrontMarker(mesh, '+Z', 0.3, 0xff0000);
        mesh.updateMatrixWorld(true);

        console.log('📦', garmentData.name,
            '| scale:', scale.toFixed(3),
            '| pos:', transform.position.toArray().map(n => n.toFixed(3)));
        return mesh;
    }, [gltf, transform, garmentData.name]);

    // Re-sync rotation every frame
    useFrame(() => {
        if (!meshRef.current || !mannequinRef?.current) return;
        const q = new THREE.Quaternion();
        mannequinRef.current.getWorldQuaternion(q);
        const correction = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            GARMENT_Y_CORRECTION,
        );
        q.multiply(correction);
        meshRef.current.setRotationFromQuaternion(q);
    });

    return <primitive ref={meshRef} object={garmentMesh} />;
};

const LoadingIndicator = () => (
    <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.3, 0.6, 0.2]} />
        <meshStandardMaterial color="#cccccc" transparent opacity={0.3} wireframe />
    </mesh>
);

export default PhysicsGarment;
