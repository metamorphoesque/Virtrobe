// src/components/3d/WornGarment.jsx
import React, { useRef, useMemo, Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import GarmentFitter from '../../utils/GarmentFitter';
import { DEFAULT_EASE_FACTOR } from '../../utils/GarmentFitter';

const WornGarment = ({ garmentData, mannequinRef, measurements, easeFactor }) => {
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
                easeFactor={easeFactor}
            />
        </Suspense>
    );
};

const GarmentMesh = ({ modelUrl, garmentData, mannequinRef, measurements, easeFactor }) => {
    const meshRef = useRef();
    const gltf = useLoader(GLTFLoader, modelUrl);

    const bodyZone = useMemo(
        () => GarmentFitter.detectBodyZone(garmentData),
        [garmentData.name, garmentData.type, garmentData.category, garmentData.slot]
    );

    // Stage 1: Clone + FRONT-FACE ALIGNMENT + pivot + snapshot (only when model changes)
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

        // ▸ Detect the garment's front face and rotate geometry so it
        //   aligns with the mannequin's front (+Z). Must happen BEFORE
        //   centrePivot and storeOriginalGeometry.
        GarmentFitter.detectAndAlignFront(mesh);
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
        const ease = easeFactor ?? DEFAULT_EASE_FACTOR;

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
        //    Vertices are reprojected directly onto the body surface + ease.
        //    easeFactor controls how tight/loose the garment fits.
        const result = GarmentFitter.projectOntoBody(
            mesh, mannequinNode, measurements, bodyZone, ease
        );

        // 3. No positioning needed — projectOntoBody writes vertex Y as the
        //    final world-Y, derived from live landmarks (which already include
        //    standHeight via getWorldPosition). The mesh stays at identity
        //    transform.
        mesh.position.set(0, 0, 0);
        mesh.updateMatrixWorld(true);

        // Verify bounding box matches expected zone
        const box = new THREE.Box3().setFromObject(mesh);
        console.log(`   📦 Final garment bbox: y=[${box.min.y.toFixed(3)}, ${box.max.y.toFixed(3)}] x=[${box.min.x.toFixed(3)}, ${box.max.x.toFixed(3)}]`);

        return { mesh, anchorY: result.anchorY };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseMesh, bodyZone, easeFactor,
        measurements?.gender,
        measurements?.height_cm,
        measurements?.bust_cm,
        measurements?.waist_cm,
        measurements?.hips_cm,
        measurements?.shoulder_width_cm,
        measurements?.bmi,
    ]);

    // NOTE: No useFrame rotation sync needed.
    // The garment is a child of the same <group> as the mannequin in Scene.jsx,
    // so it inherits the parent group's rotation automatically.

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