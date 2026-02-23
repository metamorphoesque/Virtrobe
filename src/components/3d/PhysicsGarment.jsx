// src/components/3d/PhysicsGarment.jsx

import React, { useRef, useMemo, Suspense } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

const GARMENT_Y_CORRECTION = -Math.PI / 2;

// Pre-allocated — never allocate inside useFrame
const _neck = new THREE.Vector3();
const _waist = new THREE.Vector3();
const _hips = new THREE.Vector3();
const _mannCenter = new THREE.Vector3();
const _mannSize = new THREE.Vector3();
const _finalPos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _correction = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0), GARMENT_Y_CORRECTION
);

// ─────────────────────────────────────────────
//  SLICE MEASUREMENT
//  Measure garment X width within a vertical band.
//  Avoids leg-flare or collar-flare inflating the measurement.
// ─────────────────────────────────────────────
function measureSliceWidth(mesh, yMinFrac, yMaxFrac) {
    mesh.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    const yBandMin = bbox.min.y + size.y * yMinFrac;
    const yBandMax = bbox.min.y + size.y * yMaxFrac;

    let minX = Infinity;
    let maxX = -Infinity;
    let found = 0;

    mesh.traverse(child => {
        if (!child.isMesh || !child.geometry?.attributes?.position) return;
        const pos = child.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            if (y >= yBandMin && y <= yBandMax) {
                minX = Math.min(minX, pos.getX(i));
                maxX = Math.max(maxX, pos.getX(i));
                found++;
            }
        }
    });

    if (found < 10) {
        console.warn(`⚠️ Slice [${yMinFrac}–${yMaxFrac}]: only ${found} verts, falling back to full bbox X`);
        return size.x;
    }

    const width = maxX - minX;
    console.log(`📏 Slice [${(yMinFrac * 100).toFixed(0)}–${(yMaxFrac * 100).toFixed(0)}%]: ${found} verts → width=${width.toFixed(4)}`);
    return width;
}

// ─────────────────────────────────────────────
//  COMPONENTS
// ─────────────────────────────────────────────
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
    const frameCount = useRef(0);
    const gltf = useLoader(GLTFLoader, modelUrl);

    const isBottom = useMemo(() => {
        const name = (garmentData.name || '').toLowerCase();
        const cat = (garmentData.category || garmentData.type || '').toLowerCase();
        return name.includes('pant') || name.includes('skirt') || name.includes('short') ||
            cat.includes('bottom') || cat.includes('pant') || cat.includes('skirt');
    }, [garmentData]);

    // Clone + measure at scale=1 once per model
    const { mesh, relevantWidth, garmentTopOffset } = useMemo(() => {
        const mesh = gltf.scene.clone(true);
        mesh.position.set(0, 0, 0);
        mesh.quaternion.identity();
        mesh.scale.set(1, 1, 1);
        mesh.updateMatrixWorld(true);

        mesh.traverse(child => {
            if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
        });

        const bbox = new THREE.Box3().setFromObject(mesh);
        const size = bbox.getSize(new THREE.Vector3());

        // Tops:    measure shoulder/collar opening = top 20% of mesh
        // Bottoms: measure waistband opening       = top 15% of mesh
        const relevantWidth = isBottom
            ? measureSliceWidth(mesh, 0.85, 1.0)
            : measureSliceWidth(mesh, 0.80, 1.0);

        console.log(
            `📦 ${garmentData.name} | ` +
            `full X=${size.x.toFixed(3)} Y=${size.y.toFixed(3)} | ` +
            `relevantWidth=${relevantWidth.toFixed(3)} | isBottom=${isBottom}`
        );

        return {
            mesh,
            relevantWidth,
            garmentTopOffset: size.y / 2,  // center-to-top at scale=1
        };
    }, [gltf, garmentData.name, isBottom]);

    useFrame(() => {
        if (!meshRef.current || !mannequinRef?.current) return;

        mannequinRef.current.updateMatrixWorld(true);

        mannequinRef.current.getWorldQuaternion(_quat);
        _quat.multiply(_correction);

        const getLandmarks = mannequinRef.current.getLiveLandmarks;
        if (!getLandmarks) return;
        const lm = getLandmarks();

        // Mannequin world dimensions
        const mannBox = new THREE.Box3().setFromObject(mannequinRef.current);
        mannBox.getSize(_mannSize);
        mannBox.getCenter(_mannCenter);

        const mannWorldHeight = _mannSize.y;
        const personHeight_cm = measurements?.height_cm || 170;

        // Universal unit bridge:
        // worldPerCm = how many world units = 1 cm on this mannequin
        // e.g. mannequin is 1.81 world units tall, person is 170cm
        //   → worldPerCm = 1.81 / 170 = 0.01065 world units per cm
        const worldPerCm = mannWorldHeight / personHeight_cm;

        let scale = 1;
        let anchorY = 0;

        if (!isBottom) {
            // ── TOPS ────────────────────────────────────────────────────────────
            // Target: shoulder_width_cm → world units
            // e.g. 40cm × 0.01065 = 0.426 world units shoulder span
            const shoulder_cm = measurements?.shoulder_width_cm || 40;
            const targetWorldWidth = shoulder_cm * worldPerCm;

            scale = relevantWidth > 0 ? targetWorldWidth / relevantWidth : 1;

            // Anchor Y = neck landmark world position
            const neckNode = lm['landmark_neck'];
            if (neckNode) {
                neckNode.updateWorldMatrix(true, false);
                neckNode.getWorldPosition(_neck);
                anchorY = _neck.y;
            } else {
                anchorY = mannBox.min.y + mannWorldHeight * 0.88;
            }

            frameCount.current++;
            if (frameCount.current % 120 === 0) {
                console.log(
                    `👕 ${garmentData.name} | ` +
                    `shoulder=${shoulder_cm}cm → ${targetWorldWidth.toFixed(4)}wu | ` +
                    `sliceW=${relevantWidth.toFixed(4)} | scale=${scale.toFixed(3)} | ` +
                    `neckY=${anchorY.toFixed(3)} | worldPerCm=${worldPerCm.toFixed(5)}`
                );
            }

        } else {
            // ── BOTTOMS ──────────────────────────────────────────────────────────
            // Target: hip WIDTH in world units
            // hips_cm is circumference → diameter = hips_cm / π
            // diameter in world units  = (hips_cm / π) × worldPerCm
            //
            // e.g. hips=90cm → diameter=28.6cm → 28.6 × 0.01065 = 0.305 world units
            const hips_cm = measurements?.hips_cm || 90;
            const hipDiameter_cm = hips_cm / Math.PI;           // circumference → diameter in cm
            const targetWorldWidth = hipDiameter_cm * worldPerCm; // cm → world units

            // 1.08 ease factor so pants aren't vacuum-sealed
            scale = relevantWidth > 0 ? (targetWorldWidth / relevantWidth) * 1.08 : 1;

            // Anchor Y = waist landmark (pants hang from waist, not hips)
            const waistNode = lm['landmark_waist'];
            const hipsNode = lm['landmark_hips'];

            if (waistNode) {
                waistNode.updateWorldMatrix(true, false);
                waistNode.getWorldPosition(_waist);
                anchorY = _waist.y;
            } else if (hipsNode) {
                hipsNode.updateWorldMatrix(true, false);
                hipsNode.getWorldPosition(_hips);
                anchorY = _hips.y + 0.05;
            } else {
                anchorY = mannBox.min.y + mannWorldHeight * 0.58;
            }

            frameCount.current++;
            if (frameCount.current % 120 === 0) {
                console.log(
                    `👖 ${garmentData.name} | ` +
                    `hips=${hips_cm}cm → dia=${hipDiameter_cm.toFixed(1)}cm → ${targetWorldWidth.toFixed(4)}wu | ` +
                    `sliceW=${relevantWidth.toFixed(4)} | scale=${scale.toFixed(3)} | ` +
                    `waistY=${anchorY.toFixed(3)} | worldPerCm=${worldPerCm.toFixed(5)}`
                );
            }
        }

        // Position: top edge of scaled garment sits exactly at anchorY
        // garmentTopOffset = half-height at scale=1
        // At `scale`, half-height = garmentTopOffset × scale
        _finalPos.set(
            _mannCenter.x,
            anchorY - garmentTopOffset * scale,
            _mannCenter.z,
        );

        meshRef.current.position.copy(_finalPos);
        meshRef.current.quaternion.copy(_quat);
        meshRef.current.scale.setScalar(scale);
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