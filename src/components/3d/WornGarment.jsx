// src/components/3d/WornGarment.jsx
import React, { useRef, useMemo, Suspense } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import GarmentFitter from '../../utils/GarmentFitter';

const _quat = new THREE.Quaternion();
const GARMENT_Y_CORRECTION = -Math.PI / 2;
const _correction = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0), GARMENT_Y_CORRECTION
);

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

const GarmentMesh = ({ modelUrl, garmentData, mannequinRef, measurements }) => {
    const meshRef = useRef();
    const gltf = useLoader(GLTFLoader, modelUrl);
    const isTemplate = garmentData?.isTemplate === true;

    const bodyZone = useMemo(
        () => GarmentFitter.detectBodyZone(garmentData),
        [garmentData.name, garmentData.type, garmentData.category, garmentData.slot]
    );

    // Stage 1: Clone + pivot + snapshot (only when model changes)
    const baseMesh = useMemo(() => {
        const mesh = gltf.scene.clone(true);
        mesh.position.set(0, 0, 0);
        mesh.quaternion.identity();
        mesh.scale.set(1, 1, 1);

        mesh.traverse(child => {
            if (child.isMesh) {
                child.geometry = child.geometry.clone();
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        GarmentFitter.centrePivot(mesh);
        GarmentFitter.storeOriginalGeometry(mesh);
        return mesh;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gltf, garmentData.name, garmentData.type, garmentData.modelUrl]);

    // Stage 2: Full refit on every measurement change
    const fitted = useMemo(() => {
        if (!baseMesh || !mannequinRef?.current) return null;

        const mesh = baseMesh;
        const mannequinNode = mannequinRef.current;

        mesh.position.set(0, 0, 0);
        mesh.quaternion.identity();
        mesh.scale.set(1, 1, 1);
        mesh.updateMatrixWorld(true);

        mannequinNode.updateMatrixWorld(true);

        const mannequinMesh = GarmentFitter.getMannequinMesh(mannequinNode);

        // 1. Get scale + anchor
        const fitting = GarmentFitter.fitToMannequin(
            mesh, mannequinNode, measurements, bodyZone, isTemplate
        );

        // 2. Apply scale
        mesh.scale.set(fitting.scaleX, fitting.scaleY, fitting.scaleZ);
        mesh.updateMatrixWorld(true);

        // 3. Morph targets
        GarmentFitter.applyMorphDeltas(
            mesh, mannequinNode, mannequinMesh, measurements, bodyZone
        );

        // 4. POSITION FIRST — shrinkWrap needs correct world matrices
        mesh.position.set(0, 0, 0);
        mesh.updateMatrixWorld(true);
        const scaledBox = new THREE.Box3().setFromObject(mesh);
        const scaledCenter = new THREE.Vector3();
        scaledBox.getCenter(scaledCenter);

        const offsetX = -scaledCenter.x;
        const offsetZ = -scaledCenter.z;
        const posY    = fitting.anchorY - scaledBox.max.y;

        mesh.position.set(offsetX, posY, offsetZ);
        mesh.updateMatrixWorld(true);

        // 5. SHRINKWRAP AFTER POSITIONING
        GarmentFitter.shrinkWrapToMannequin(
            mesh, mannequinNode, measurements, bodyZone, posY
        );

        return { mesh, offsetX, offsetZ };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseMesh, bodyZone, isTemplate,
        measurements?.gender,
        measurements?.height_cm,
        measurements?.bust_cm,
        measurements?.waist_cm,
        measurements?.hips_cm,
        measurements?.shoulder_width_cm,
        measurements?.bmi,
    ]);

    useFrame(() => {
        if (!meshRef.current || !mannequinRef?.current || !fitted) return;
        mannequinRef.current.getWorldQuaternion(_quat);
        _quat.multiply(_correction);
        meshRef.current.quaternion.copy(_quat);
    });

    if (!fitted) return null;
    return <primitive ref={meshRef} object={fitted.mesh} />;
};

const LoadingIndicator = () => (
    <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.3, 0.6, 0.2]} />
        <meshStandardMaterial color="#cccccc" transparent opacity={0.3} wireframe />
    </mesh>
);

export default WornGarment;