// src/components/3d/PhysicsGarment.jsx

import React, { useRef, useMemo, Suspense } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

const GARMENT_Y_CORRECTION = -Math.PI / 2;

// Allocated once, reused every frame — no GC pressure
const _shL = new THREE.Vector3();
const _shR = new THREE.Vector3();
const _neck = new THREE.Vector3();
const _waist = new THREE.Vector3();
const _hips = new THREE.Vector3();
const _midpoint = new THREE.Vector3();
const _finalPos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _correction = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    GARMENT_Y_CORRECTION
);

// Helper — safely get world position from an Object3D landmark node
function getWorldPos(node, target) {
    if (!node) return false;
    // Force the node's world matrix to be current before reading
    if (node.isObject3D) node.updateWorldMatrix(true, false);
    node.getWorldPosition(target);
    return true;
}

const PhysicsGarment = ({ garmentData, mannequinRef, measurements }) => {
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

const GarmentMesh = ({ modelUrl, garmentData, mannequinRef, measurements }) => {
    const meshRef = useRef();
    const frameCount = useRef(0); // for throttled debug logging
    const gltf = useLoader(GLTFLoader, modelUrl);

    // Classify garment type once
    const isBottom = useMemo(() => {
        const name = (garmentData.name || '').toLowerCase();
        const cat = (garmentData.category || garmentData.type || '').toLowerCase();
        return name.includes('pant') || name.includes('skirt') || name.includes('short') ||
            cat.includes('bottom') || cat.includes('pant') || cat.includes('skirt');
    }, [garmentData]);

    // Clone + measure natural geometry — runs once per model
    const { mesh, garmentWidth, garmentTopOffset } = useMemo(() => {
        const mesh = gltf.scene.clone(true);
        mesh.position.set(0, 0, 0);
        mesh.quaternion.identity();

        // CRITICAL: **DO NOT** reset scale to (1,1,1) here!
        // Tripo SR meshes often have a root scale of (100, 100, 100) or (0.01) based on FBX/GLB export settings.
        // We must measure the box using exactly whatever scale the model naturally imports with!
        mesh.updateMatrixWorld(true);

        mesh.traverse(child => {
            if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
        });

        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());

        console.log(`📦 ${garmentData.name} | raw X=${size.x.toFixed(3)} Y=${size.y.toFixed(3)} Z=${size.z.toFixed(3)}`);

        return {
            mesh,
            garmentWidth: size.x,       // width at scale=1
            garmentTopOffset: size.y / 2,   // center-to-top distance at scale=1
        };
    }, [gltf, garmentData.name]);

    useFrame(() => {
        if (!meshRef.current || !mannequinRef?.current) return;

        // CRITICAL: update the entire mannequin subtree world matrices
        // before reading any landmark world positions
        mannequinRef.current.updateMatrixWorld(true);

        // Get mannequin world quaternion + Blender Y correction
        mannequinRef.current.getWorldQuaternion(_quat);
        _quat.multiply(_correction);

        const getLandmarks = mannequinRef.current.getLiveLandmarks;
        if (!getLandmarks) return;
        const lm = getLandmarks();

        let scale = 1;
        let anchorX = 0;
        let anchorY = 0;
        let anchorZ = 0;

        if (!isBottom) {
            // ── TOPS ────────────────────────────────────────────────────────────
            // Scale = real shoulder span / garment X width
            const shLNode = lm['landmark_shoulder_L'];
            const shRNode = lm['landmark_shoulder_R'];
            const neckNode = lm['landmark_neck'];

            if (!getWorldPos(shLNode, _shL) || !getWorldPos(shRNode, _shR)) return;

            const shoulderSpan = _shL.distanceTo(_shR);
            scale = garmentWidth > 0 ? shoulderSpan / garmentWidth : 1;

            // Midpoint between shoulders = XZ anchor
            _midpoint.addVectors(_shL, _shR).multiplyScalar(0.5);
            anchorX = _midpoint.x;
            anchorZ = _midpoint.z;

            // Neck Y = where top edge of garment sits
            if (getWorldPos(neckNode, _neck)) {
                anchorY = _neck.y;
            } else {
                anchorY = _midpoint.y;
            }

            // Log only every 120 frames (~2 seconds) to avoid spam
            frameCount.current++;
            if (frameCount.current % 120 === 0) {
                console.log(`👕 ${garmentData.name} | span=${(shoulderSpan * 100).toFixed(1)}cm | scale=${scale.toFixed(3)}`);
            }

        } else {
            // ── BOTTOMS ─────────────────────────────────────────────────────────
            // Scale = hip diameter / garment X width
            const waistNode = lm['landmark_waist'];
            const hipsNode = lm['landmark_hips'];

            // Use hips node for XZ position, waist for Y anchor
            const haveHips = getWorldPos(hipsNode, _hips);
            const haveWaist = getWorldPos(waistNode, _waist);

            if (!haveHips && !haveWaist) return;

            const hips_cm = measurements?.hips_cm || 90;
            const hipDiameter = (hips_cm / 100) / Math.PI; // circumference → diameter
            scale = garmentWidth > 0 ? (hipDiameter / garmentWidth) * 1.1 : 1;

            // XZ from hips, Y from waist (pants hang from waist)
            const ref = haveHips ? _hips : _waist;
            anchorX = ref.x;
            anchorZ = ref.z;
            anchorY = haveWaist ? _waist.y : _hips.y + 0.05;

            frameCount.current++;
            if (frameCount.current % 120 === 0) {
                console.log(`👖 ${garmentData.name} | hipD=${(hipDiameter * 100).toFixed(1)}cm | scale=${scale.toFixed(3)}`);
            }
        }

        // ── Final position ───────────────────────────────────────────────────
        // Top edge of scaled garment = anchorY
        // Center = anchorY - (garmentTopOffset * scale)
        _finalPos.set(
            anchorX,
            anchorY - garmentTopOffset * scale,
            anchorZ,
        );

        meshRef.current.position.copy(_finalPos);
        meshRef.current.quaternion.copy(_quat);
        // To ensure scale is applied relative to the mesh's original loaded size:
        // We must multiply our calculated ratio by the mesh's innate X-scale.
        const baseScale = mesh.scale.x || 1;
        meshRef.current.scale.setScalar(scale * baseScale);
    });

    return <primitive ref={meshRef} object={mesh} />;
};

const LoadingIndicator = () => (
    <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.3, 0.6, 0.2]} />
        <meshStandardMaterial color="#cccccc" transparent opacity={0.3} wireframe />
    </mesh>
);

export default PhysicsGarment;