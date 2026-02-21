// src/components/3d/MannequinLandmarks.jsx
// ============================================
// DEV TOOL — Large, visible body landmark markers
// Shows colored rings, discs, and spheres for
// shoulders, neck, bust, waist, hips on the mannequin.
//
// Toggle with the `enabled` prop.
// Adjust yFrac values to match your mannequin model,
// then use those same fractions in PhysicsGarment.jsx
// for accurate garment positioning.
// ============================================

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

// ── Default landmark fractions (from bottom of mannequin bounding box) ──
// TUNE THESE until the rings line up with your mannequin model.
// Then copy the values to PhysicsGarment's TOP_ANCHORS.
const DEFAULT_LANDMARKS = {
    neck: { yFrac: 0.88, color: '#ff0000', label: 'Neck' },
    shoulder_left: { yFrac: 0.80, xFrac: -0.50, color: '#ff8800', label: 'L Shoulder' },
    shoulder_right: { yFrac: 0.80, xFrac: 0.50, color: '#ff8800', label: 'R Shoulder' },
    bust: { yFrac: 0.72, color: '#ff00ff', label: 'Bust' },
    waist: { yFrac: 0.55, color: '#00ff00', label: 'Waist' },
    hips: { yFrac: 0.44, color: '#0088ff', label: 'Hips' },
    knee: { yFrac: 0.24, color: '#8888ff', label: 'Knee' },
};

const MannequinLandmarks = ({
    mannequinRef,
    measurements = {},
    enabled = true,
    overrides = {},
    showRings = true,
    showDiscs = true,     // translucent horizontal discs
    showSpheres = true,
}) => {
    const groupRef = useRef();

    // Merge overrides
    const landmarks = useMemo(() => {
        const merged = {};
        for (const [key, def] of Object.entries(DEFAULT_LANDMARKS)) {
            merged[key] = { ...def, ...(overrides[key] || {}) };
        }
        return merged;
    }, [overrides]);

    // Compute world-space positions
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
            bust_cm = 90,
            waist_cm = 70,
            hips_cm = 95,
            shoulder_width_cm = 40,
        } = measurements;

        const bustR = (bust_cm / 100) / (2 * Math.PI);
        const waistR = (waist_cm / 100) / (2 * Math.PI);
        const hipR = (hips_cm / 100) / (2 * Math.PI);
        const shoulderHW = (shoulder_width_cm / 100) / 2;

        const positions = {};
        for (const [key, lm] of Object.entries(landmarks)) {
            const y = bottomY + size.y * lm.yFrac;
            const x = center.x + (lm.xFrac ? size.x * lm.xFrac : 0);
            const z = center.z;

            let ringRadius = size.x * 0.5;
            if (key === 'bust') ringRadius = bustR;
            if (key === 'waist') ringRadius = waistR;
            if (key === 'hips') ringRadius = hipR;
            if (key.startsWith('shoulder')) ringRadius = 0.04;
            if (key === 'neck') ringRadius = bustR * 0.35;
            if (key === 'knee') ringRadius = size.x * 0.28;

            positions[key] = { x, y, z, ringRadius, color: lm.color, label: lm.label };
        }

        // Override shoulder X from measurement
        if (positions.shoulder_left) positions.shoulder_left.x = center.x - shoulderHW;
        if (positions.shoulder_right) positions.shoulder_right.x = center.x + shoulderHW;

        // Log positions for dev tuning
        console.log('📍 Landmark Y positions:',
            Object.entries(positions).map(([k, v]) => `${k}: ${v.y.toFixed(3)}`).join(' | '));

        return positions;
    }, [mannequinRef, measurements, landmarks]);

    if (!enabled || !landmarkPositions) return null;

    return (
        <group ref={groupRef}>
            {Object.entries(landmarkPositions).map(([key, lm]) => (
                <group key={key} position={[lm.x, lm.y, lm.z]}>
                    {/* ── THICK RING (torus) ── */}
                    {showRings && !key.startsWith('shoulder') && (
                        <mesh rotation={[Math.PI / 2, 0, 0]}>
                            <torusGeometry args={[lm.ringRadius, 0.008, 8, 48]} />
                            <meshBasicMaterial color={lm.color} transparent opacity={0.9} />
                        </mesh>
                    )}

                    {/* ── TRANSLUCENT DISC — makes the horizontal plane obvious ── */}
                    {showDiscs && !key.startsWith('shoulder') && (
                        <mesh rotation={[Math.PI / 2, 0, 0]}>
                            <circleGeometry args={[lm.ringRadius, 32]} />
                            <meshBasicMaterial
                                color={lm.color}
                                transparent
                                opacity={0.15}
                                side={THREE.DoubleSide}
                                depthWrite={false}
                            />
                        </mesh>
                    )}

                    {/* ── BIG SPHERE marker ── */}
                    {showSpheres && (
                        <mesh>
                            <sphereGeometry args={[key.startsWith('shoulder') ? 0.025 : 0.018, 12, 12]} />
                            <meshBasicMaterial color={lm.color} />
                        </mesh>
                    )}

                    {/* ── Horizontal dash lines extending outward ── */}
                    {!key.startsWith('shoulder') && (
                        <>
                            <mesh position={[lm.ringRadius + 0.04, 0, 0]}>
                                <boxGeometry args={[0.06, 0.004, 0.004]} />
                                <meshBasicMaterial color={lm.color} />
                            </mesh>
                            <mesh position={[-(lm.ringRadius + 0.04), 0, 0]}>
                                <boxGeometry args={[0.06, 0.004, 0.004]} />
                                <meshBasicMaterial color={lm.color} />
                            </mesh>
                        </>
                    )}
                </group>
            ))}

            {/* ── FRONT-FACE arrow at bust height ── */}
            <MannequinFrontArrow landmarkPositions={landmarkPositions} />

            {/* ── Vertical center line (connects landmarks) ── */}
            <VerticalGuideLine landmarkPositions={landmarkPositions} />
        </group>
    );
};

// ── Green arrow showing mannequin +Z front direction ──
const MannequinFrontArrow = ({ landmarkPositions }) => {
    const arrow = useMemo(() => {
        const bustPos = landmarkPositions?.bust;
        if (!bustPos) return null;
        const dir = new THREE.Vector3(0, 0, 1);
        const origin = new THREE.Vector3(0, bustPos.y, 0);
        return new THREE.ArrowHelper(dir, origin, 0.6, 0x00ff00, 0.10, 0.06);
    }, [landmarkPositions]);

    if (!arrow) return null;
    return <primitive object={arrow} />;
};

// ── Thin vertical line from neck to knee ──
const VerticalGuideLine = ({ landmarkPositions }) => {
    const { neck, knee } = landmarkPositions;
    if (!neck || !knee) return null;

    const height = neck.y - knee.y;
    const centerY = (neck.y + knee.y) / 2;

    return (
        <mesh position={[neck.x, centerY, neck.z]}>
            <boxGeometry args={[0.003, height, 0.003]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
        </mesh>
    );
};

// ── Console helper ──
if (typeof window !== 'undefined') {
    window.__printLandmarks = () => {
        console.log('📍 Default landmark fractions:', JSON.stringify(DEFAULT_LANDMARKS, null, 2));
        console.log('Override via <MannequinLandmarks overrides={{ waist: { yFrac: 0.57 } }} />');
    };
}

export default MannequinLandmarks;
export { DEFAULT_LANDMARKS };
