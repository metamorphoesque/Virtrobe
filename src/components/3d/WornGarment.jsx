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

    // Stage 2: Full refit — radial body projection
    const fitted = useMemo(() => {
        if (!baseMesh || !mannequinRef?.current) return null;

        const mesh = baseMesh;
        const mannequinNode = mannequinRef.current;

        // Reset transforms before projection
        mesh.position.set(0, 0, 0);
        mesh.quaternion.identity();
        mesh.scale.set(1, 1, 1);
        mesh.updateMatrixWorld(true);
        mannequinNode.updateMatrixWorld(true);

        const mannequinMesh = GarmentFitter.getMannequinMesh(mannequinNode);

        // 1. Apply morph targets if available (before projection)
        GarmentFitter.applyMorphDeltas(
            mesh, mannequinNode, mannequinMesh, measurements, bodyZone
        );

        // 2. RADIAL BODY PROJECTION — the main fitting step
        //    This replaces the old fitToMannequin() + shrinkWrapToMannequin()
        //    Vertices are reprojected directly onto the body surface + ease.
        //    No scale is applied — the projection handles all sizing.
        const result = GarmentFitter.projectOntoBody(
            mesh, mannequinNode, measurements, bodyZone
        );

        // 3. Position the mesh
        //    After projection, vertices are in world-Y space (they were
        //    written as world positions). The mesh just needs to be at origin.
        //    Since projectOntoBody writes worldY directly into vertex positions
        //    and the mesh transform is identity, the vertices ARE at their
        //    final world positions. No additional positioning needed.
        mesh.position.set(0, 0, 0);
        mesh.updateMatrixWorld(true);

        // Verify bounding box
        const box = new THREE.Box3().setFromObject(mesh);
        console.log(`   📦 Final garment bbox: y=[${box.min.y.toFixed(3)}, ${box.max.y.toFixed(3)}] x=[${box.min.x.toFixed(3)}, ${box.max.x.toFixed(3)}]`);

        return { mesh, anchorY: result.anchorY };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseMesh, bodyZone,
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