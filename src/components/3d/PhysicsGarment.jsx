// src/components/3d/PhysicsGarment.jsx
// ============================================
// GARMENT LOADER — 1:1 Life-Size Alignment
// Assumes the GLB is already exported at the correct
// real-world scale and relative position to fit the body.
// NO scale math, NO centering math. 
// Just matches the mannequin world transform.
// ============================================

import React, { useRef, useMemo, Suspense } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

// If Blender exported with a 90-degree offset, keep this. 
// If garments load sideways, change to 0.
const GARMENT_Y_CORRECTION = -Math.PI / 2;

const PhysicsGarment = ({ garmentData, mannequinRef }) => {
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
            />
        </Suspense>
    );
};

const GarmentMesh = ({ modelUrl, garmentData, mannequinRef }) => {
    const meshRef = useRef();
    const gltf = useLoader(GLTFLoader, modelUrl);

    const garmentMesh = useMemo(() => {
        const mesh = gltf.scene.clone(true);

        // Reset any baked-in transforms from the loader
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

        console.log(`📦 Loaded ${garmentData.name} at 1:1 scale.`);
        return mesh;
    }, [gltf, garmentData.name]);

    // Lock to mannequin world position and rotation every frame
    useFrame(() => {
        if (!meshRef.current || !mannequinRef?.current) return;

        // 1. Get mannequin world position
        const mannequinPos = new THREE.Vector3();
        mannequinRef.current.getWorldPosition(mannequinPos);

        // 2. Get mannequin world rotation
        const mannequinQuat = new THREE.Quaternion();
        mannequinRef.current.getWorldQuaternion(mannequinQuat);

        // 3. Apply Y-correction for Blender exports
        if (GARMENT_Y_CORRECTION !== 0) {
            const correction = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 1, 0),
                GARMENT_Y_CORRECTION
            );
            mannequinQuat.multiply(correction);
        }

        // 4. Force garment to match exactly
        meshRef.current.position.copy(mannequinPos);
        meshRef.current.quaternion.copy(mannequinQuat);

        // Ensure scale is exactly 1
        meshRef.current.scale.set(1, 1, 1);
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
