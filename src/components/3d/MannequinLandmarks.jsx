// src/components/3d/MannequinLandmarks.jsx
// DEV TOOL — Body landmark markers. Runs ONCE, not per frame.
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

// yFrac = fraction of mannequin height from the BOTTOM.
// Lowered all values by ~0.04 vs previous version.
const DEFAULT_LANDMARKS = {
    neck: { yFrac: 0.84, color: '#ff2222', label: 'Neck' },
    shoulder_left: { yFrac: 0.76, xFrac: -0.50, color: '#ff8800', label: 'L Shoulder' },
    shoulder_right: { yFrac: 0.76, xFrac: 0.50, color: '#ff8800', label: 'R Shoulder' },
    bust: { yFrac: 0.68, color: '#ff00ff', label: 'Bust' },
    waist: { yFrac: 0.51, color: '#00ff88', label: 'Waist' },
    hips: { yFrac: 0.39, color: '#0088ff', label: 'Hips' },
    knee: { yFrac: 0.20, color: '#8888ff', label: 'Knee' },
};

const MannequinLandmarks = ({
    mannequinRef,
    measurements = {},
    enabled = true,
    overrides = {},
    showRings = true,
    showDiscs = true,
    showSpheres = true,
}) => {
    const groupRef = useRef();

    // Stable key — only recompute when measurements actually change
    const measKey = `${measurements.bust_cm}_${measurements.waist_cm}_${measurements.hips_cm}_${measurements.shoulder_width_cm}_${measurements.height_cm}`;

    const landmarks = useMemo(() => {
        const merged = {};
        for (const [key, def] of Object.entries(DEFAULT_LANDMARKS)) {
            merged[key] = { ...def, ...(overrides[key] || {}) };
        }
        return merged;
    }, [overrides]);

    const landmarkPositions = useMemo(() => {
        if (!mannequinRef?.current) return null;

        const mannequin = mannequinRef.current;
        mannequin.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(mannequin);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const bottomY = center.y - size.y * 0.5;

        const {
            bust_cm = 90, waist_cm = 70,
            hips_cm = 95, shoulder_width_cm = 40,
        } = measurements;

        const bustR = (bust_cm / 100) / (2 * Math.PI);
        const waistR = (waist_cm / 100) / (2 * Math.PI);
        const hipR = (hips_cm / 100) / (2 * Math.PI);
        const shoulderHW = (shoulder_width_cm / 100) / 2;

        const positions = {};
        for (const [key, lm] of Object.entries(landmarks)) {
            const y = bottomY + size.y * lm.yFrac;
            const x = center.x + (lm.xFrac ? size.x * lm.xFrac : 0);

            let ringRadius = size.x * 0.45;
            if (key === 'bust') ringRadius = bustR;
            if (key === 'waist') ringRadius = waistR;
            if (key === 'hips') ringRadius = hipR;
            if (key.startsWith('shoulder')) ringRadius = 0.03;
            if (key === 'neck') ringRadius = bustR * 0.32;
            if (key === 'knee') ringRadius = size.x * 0.26;

            positions[key] = { x, y, z: center.z, ringRadius, color: lm.color };
        }

        if (positions.shoulder_left) positions.shoulder_left.x = center.x - shoulderHW;
        if (positions.shoulder_right) positions.shoulder_right.x = center.x + shoulderHW;

        console.log('📍 Landmarks (runs once per measKey):',
            Object.entries(positions).map(([k, v]) => `${k}:${v.y.toFixed(3)}`).join(' | '));
        return positions;
    }, [mannequinRef, measKey, landmarks]); // measKey prevents per-frame spam

    if (!enabled || !landmarkPositions) return null;

    return (
        <group ref={groupRef}>
            {Object.entries(landmarkPositions).map(([key, lm]) => (
                <group key={key} position={[lm.x, lm.y, lm.z]}>
                    {showRings && !key.startsWith('shoulder') && (
                        <mesh rotation={[Math.PI / 2, 0, 0]}>
                            <torusGeometry args={[lm.ringRadius, 0.009, 8, 48]} />
                            <meshBasicMaterial color={lm.color} transparent opacity={0.95} />
                        </mesh>
                    )}
                    {showDiscs && !key.startsWith('shoulder') && (
                        <mesh rotation={[Math.PI / 2, 0, 0]}>
                            <circleGeometry args={[lm.ringRadius, 32]} />
                            <meshBasicMaterial color={lm.color} transparent opacity={0.12}
                                side={THREE.DoubleSide} depthWrite={false} />
                        </mesh>
                    )}
                    {showSpheres && (
                        <mesh>
                            <sphereGeometry args={[key.startsWith('shoulder') ? 0.028 : 0.02, 12, 12]} />
                            <meshBasicMaterial color={lm.color} />
                        </mesh>
                    )}
                    {!key.startsWith('shoulder') && (
                        <>
                            <mesh position={[lm.ringRadius + 0.04, 0, 0]}>
                                <boxGeometry args={[0.07, 0.005, 0.005]} />
                                <meshBasicMaterial color={lm.color} />
                            </mesh>
                            <mesh position={[-(lm.ringRadius + 0.04), 0, 0]}>
                                <boxGeometry args={[0.07, 0.005, 0.005]} />
                                <meshBasicMaterial color={lm.color} />
                            </mesh>
                        </>
                    )}
                </group>
            ))}
            <MannequinFrontArrow landmarkPositions={landmarkPositions} />
            <VerticalGuideLine landmarkPositions={landmarkPositions} />
        </group>
    );
};

const MannequinFrontArrow = ({ landmarkPositions }) => {
    const arrow = useMemo(() => {
        const b = landmarkPositions?.bust;
        if (!b) return null;
        return new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, b.y, 0),
            0.65, 0x00ff44, 0.12, 0.07,
        );
    }, [landmarkPositions]);
    if (!arrow) return null;
    return <primitive object={arrow} />;
};

const VerticalGuideLine = ({ landmarkPositions }) => {
    const { neck, knee } = landmarkPositions;
    if (!neck || !knee) return null;
    const height = neck.y - knee.y;
    return (
        <mesh position={[neck.x, (neck.y + knee.y) / 2, neck.z]}>
            <boxGeometry args={[0.004, height, 0.004]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.45} />
        </mesh>
    );
};

if (typeof window !== 'undefined') {
    window.__printLandmarks = () =>
        console.log('📍 Landmark defaults:', JSON.stringify(DEFAULT_LANDMARKS, null, 2));
}

export default MannequinLandmarks;
export { DEFAULT_LANDMARKS };
