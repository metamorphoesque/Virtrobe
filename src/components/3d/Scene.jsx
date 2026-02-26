// src/components/3d/Scene.jsx
import React, { useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, Grid, useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import MorphableMannequin from './MorphableMannequin';
import PhysicsGarment from './PhysicsGarment';
import MannequinLandmarks from './MannequinLandmarks';
import LandmarkDebugger from './LandmarkDebugger';

const DisplayStand = ({ position = [0, 0, 0], scale = 1 }) => {
  const { scene } = useGLTF('/models/DisplayStand.glb');
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);
  return <primitive object={clonedScene} position={position} scale={scale} />;
};

useGLTF.preload('/models/DisplayStand.glb');

const CameraController = () => {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 1.2, 4);
    camera.lookAt(0, 1, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return <OrbitControls makeDefault target={[0, 1, 0]} />;
};

const MannequinRotationController = ({ groupRef, shouldFaceFront }) => {
  useFrame(() => {
    if (!groupRef.current) return;
    if (shouldFaceFront) {
      const targetRotation = Math.PI / 2;
      const currentRotation = groupRef.current.rotation.y;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(currentRotation, targetRotation, 0.1);
      if (Math.abs(targetRotation - groupRef.current.rotation.y) < 0.01) {
        groupRef.current.rotation.y = targetRotation;
      }
    }
  });
  return null;
};

const AxisGizmo = () => {
  const axesRef = useRef();
  React.useEffect(() => {
    if (!axesRef.current) return;
    axesRef.current.matrixAutoUpdate = false;
  }, []);
  const axesHelper = React.useMemo(() => new THREE.AxesHelper(0.4), []);
  return (
    <group position={[-1.5, 0.1, -1.5]}>
      <primitive object={axesHelper} ref={axesRef} />
    </group>
  );
};

const BodyDebugBounds = ({ mannequinRef }) => {
  const upperRef = useRef();
  const lowerRef = useRef();

  useFrame(() => {
    if (!mannequinRef?.current || !upperRef.current || !lowerRef.current) return;
    const mannequin = mannequinRef.current;
    mannequin.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(mannequin);
    const size = new THREE.Vector3();
    box.getSize(size);

    const splitY = box.min.y + size.y * 0.55;

    const upperBox = new THREE.Box3(
      new THREE.Vector3(box.min.x, splitY, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z)
    );
    const lowerBox = new THREE.Box3(
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, splitY, box.max.z)
    );

    const applyBoxToMesh = (b, mesh) => {
      const bSize = new THREE.Vector3();
      const bCenter = new THREE.Vector3();
      b.getSize(bSize);
      b.getCenter(bCenter);
      mesh.position.copy(bCenter);
      mesh.scale.set(bSize.x, bSize.y, bSize.z);
    };

    applyBoxToMesh(upperBox, upperRef.current);
    applyBoxToMesh(lowerBox, lowerRef.current);
  });

  return (
    <group>
      <mesh ref={upperRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#00ff88" wireframe transparent opacity={0.5} />
      </mesh>
      <mesh ref={lowerRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#0088ff" wireframe transparent opacity={0.5} />
      </mesh>
    </group>
  );
};

const FRONT_ROTATION_Y = Math.PI / 2;

const SceneContent = ({
  measurements,
  // Layer 0 — free tier: one upper + one lower
  upperGarmentData,
  lowerGarmentData,
  // Fallback: legacy single garmentData prop
  garmentData,
  showGarment,
  autoRotate,
  mannequinRef,
}) => {
  const internalRef = useRef();
  const groupRef = useRef();

  // Resolve which garments to actually render.
  // If the caller uses the new upperGarmentData/lowerGarmentData props, use those.
  // Otherwise fall back to the legacy single garmentData prop (treated as upper).
  const resolvedUpper = upperGarmentData ?? (garmentData?.slot !== 'lower' ? garmentData : null);
  const resolvedLower = lowerGarmentData ?? (garmentData?.slot === 'lower' ? garmentData : null);
  const hasAnyGarment = !!(resolvedUpper || resolvedLower);

  useEffect(() => {
    if (hasAnyGarment && groupRef.current) {
      groupRef.current.rotation.y = FRONT_ROTATION_Y;
      groupRef.current.updateMatrixWorld(true);
    }
  }, [hasAnyGarment]);

  const standHeight = ((measurements?.height_cm ?? 170) / 100) * 0.45;

  return (
    <>
      <CameraController />

      <MannequinRotationController
        groupRef={groupRef}
        shouldFaceFront={hasAnyGarment}
      />

      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />

      <Environment preset="city" background={false} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#000000" roughness={0.2} metalness={0.7} />
      </mesh>

      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.3}
        sectionThickness={0.5}
        cellColor="#ffffff"
        sectionColor="#ffffff"
        fadeDistance={15}
        fadeStrength={1}
        position={[0, 0.01, 0]}
      />

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.08}
        scale={4}
        blur={4.5}
        far={2}
        color="#ffffff"
      />
      <LandmarkDebugger mannequinRef={internalRef} />
      
      <AxisGizmo />

      <group rotation={[0, Math.PI / 2, 0]}>
        <DisplayStand position={[0, 0.7, 0]} scale={0.7} />
      </group>

      <group ref={groupRef} rotation={[0, FRONT_ROTATION_Y, 0]}>
        <MorphableMannequin
          ref={(node) => {
            internalRef.current = node;
            if (mannequinRef) {
              typeof mannequinRef === 'function'
                ? mannequinRef(node)
                : (mannequinRef.current = node);
            }
          }}
          measurements={measurements}
          autoRotate={autoRotate && !hasAnyGarment}
          standHeight={standHeight - 0.2}
        />

        {/* Layer 0 upper garment */}
        {resolvedUpper && (
          <PhysicsGarment
            key={`upper-0-${resolvedUpper.id ?? resolvedUpper.name}`}
            garmentData={resolvedUpper}
            measurements={measurements}
            mannequinRef={internalRef}
            slot="upper"
            layer={0}
          />
        )}

        {/* Layer 0 lower garment */}
        {resolvedLower && (
          <PhysicsGarment
            key={`lower-0-${resolvedLower.id ?? resolvedLower.name}`}
            garmentData={resolvedLower}
            measurements={measurements}
            mannequinRef={internalRef}
            slot="lower"
            layer={0}
          />
        )}

        <BodyDebugBounds mannequinRef={internalRef} />

        <MannequinLandmarks
          mannequinRef={internalRef}
          measurements={measurements}
          enabled={true}
          showRings={true}
          showDiscs={true}
          showSpheres={true}
        />
      </group>
    </>
  );
};

const Scene = (props) => {
  const { mannequinRef, ...sceneProps } = props;

  const handleContextLost = (event) => {
    event.preventDefault();
    console.error('WebGL context lost');
  };

  const handleContextRestored = () => {
    console.log('WebGL context restored');
  };

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 1.2, 4], fov: 50 }}
        shadows
        style={{ background: '#ffffff' }}
        gl={{
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0xffffff, 1);
          scene.background = new THREE.Color(0xffffff);
          gl.domElement.addEventListener('webglcontextlost', handleContextLost);
          gl.domElement.addEventListener('webglcontextrestored', handleContextRestored);
        }}
      >
        <SceneContent {...sceneProps} mannequinRef={mannequinRef} />
      </Canvas>
    </div>
  );
};

export default Scene;