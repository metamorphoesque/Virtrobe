// src/components/3d/Scene.jsx
import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
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

// ---------------------------------------------------------------------------
// Camera controller — exposes flyToFront() and capture() via ref
// ---------------------------------------------------------------------------
const CameraController = forwardRef(({ onReady }, ref) => {
  const { camera, gl, scene } = useThree();
  const orbitRef = useRef();
  const flyTarget = useRef(null); // { pos: Vector3, look: Vector3 }
  const flying = useRef(false);

  useEffect(() => {
    camera.position.set(0, 1.2, 4);
    camera.lookAt(0, 1, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  useImperativeHandle(ref, () => ({
    // Smoothly fly camera to front-facing position then call cb
    flyToFront(cb) {
      flyTarget.current = {
        pos: new THREE.Vector3(0, 1.2, 3.2),
        look: new THREE.Vector3(0, 1.1, 0),
        cb,
      };
      flying.current = true;
      if (orbitRef.current) orbitRef.current.enabled = false;
    },
    // Capture canvas as base64 PNG
    capture() {
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/png');
    },
    // Re-enable orbit controls after capture
    enableOrbit() {
      if (orbitRef.current) orbitRef.current.enabled = true;
    },
  }));

  useFrame(() => {
    if (!flying.current || !flyTarget.current) return;
    const { pos, look, cb } = flyTarget.current;

    camera.position.lerp(pos, 0.08);
    const currentLook = new THREE.Vector3();
    camera.getWorldDirection(currentLook);
    const desiredDir = look.clone().sub(camera.position).normalize();
    currentLook.lerp(desiredDir, 0.08);

    if (camera.position.distanceTo(pos) < 0.015) {
      camera.position.copy(pos);
      flying.current = false;
      flyTarget.current = null;
      cb?.();
    }
  });

  return <OrbitControls ref={orbitRef} makeDefault target={[0, 1, 0]} />;
});

const MannequinRotationController = ({ groupRef, shouldFaceFront, viewAngle }) => {
  useFrame(() => {
    if (!groupRef.current) return;
    // viewAngle overrides shouldFaceFront when explicitly set
    const target = viewAngle !== undefined
      ? viewAngle
      : shouldFaceFront ? Math.PI / 2 : groupRef.current.rotation.y;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y, target, 0.1
    );
  });
  return null;
};

const AxisGizmo = () => {
  const axesHelper = React.useMemo(() => new THREE.AxesHelper(0.4), []);
  return (
    <group position={[-1.5, 0.1, -1.5]}>
      <primitive object={axesHelper} />
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

    const applyBox = (b, mesh) => {
      const s = new THREE.Vector3(), c = new THREE.Vector3();
      b.getSize(s); b.getCenter(c);
      mesh.position.copy(c);
      mesh.scale.set(s.x, s.y, s.z);
    };

    applyBox(new THREE.Box3(
      new THREE.Vector3(box.min.x, splitY, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z)
    ), upperRef.current);
    applyBox(new THREE.Box3(
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, splitY, box.max.z)
    ), lowerRef.current);
  });

  return (
    <group>
      <mesh ref={upperRef}><boxGeometry args={[1,1,1]} /><meshBasicMaterial color="#00ff88" wireframe transparent opacity={0.5} /></mesh>
      <mesh ref={lowerRef}><boxGeometry args={[1,1,1]} /><meshBasicMaterial color="#0088ff" wireframe transparent opacity={0.5} /></mesh>
    </group>
  );
};

const FRONT_ROTATION_Y = Math.PI / 2;

// View angles: front, side-left, back
const VIEW_ANGLES = {
  front: Math.PI / 2,
  side:  Math.PI,
  back:  (3 * Math.PI) / 2,
};

const SceneContent = forwardRef(({
  measurements,
  upperGarmentData,
  lowerGarmentData,
  garmentData,
  showGarment,
  autoRotate,
  mannequinRef,
  viewAngle,        // ← controlled from TryOnPage via SceneOverlay
}, ref) => {
  const internalRef = useRef();
  const groupRef = useRef();
  const cameraRef = useRef();

  const resolvedUpper = upperGarmentData ?? (garmentData?.slot !== 'lower' ? garmentData : null);
  const resolvedLower = lowerGarmentData ?? (garmentData?.slot === 'lower' ? garmentData : null);
  const hasAnyGarment = !!(resolvedUpper || resolvedLower);

  useEffect(() => {
    if (hasAnyGarment && groupRef.current) {
      groupRef.current.rotation.y = FRONT_ROTATION_Y;
      groupRef.current.updateMatrixWorld(true);
    }
  }, [hasAnyGarment]);

  // Expose capture + flyToFront to parent (TryOnPage)
  useImperativeHandle(ref, () => ({
    capture: () => cameraRef.current?.capture(),
    flyToFront: (cb) => cameraRef.current?.flyToFront(cb),
    enableOrbit: () => cameraRef.current?.enableOrbit(),
  }));

  const standHeight = ((measurements?.height_cm ?? 170) / 100) * 0.45;

  return (
    <>
      <CameraController ref={cameraRef} />

      <MannequinRotationController
        groupRef={groupRef}
        shouldFaceFront={hasAnyGarment}
        viewAngle={viewAngle !== undefined ? VIEW_ANGLES[viewAngle] : undefined}
      />

      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      <Environment preset="city" background={false} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#000000" roughness={0.2} metalness={0.7} />
      </mesh>

      <Grid args={[20, 20]} cellSize={0.5} cellThickness={0.3} sectionThickness={0.5}
        cellColor="#ffffff" sectionColor="#ffffff" fadeDistance={15} fadeStrength={1}
        position={[0, 0.01, 0]} />

      <ContactShadows position={[0, 0.01, 0]} opacity={0.08} scale={4} blur={4.5} far={2} color="#ffffff" />

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

        {resolvedUpper && (
          <PhysicsGarment
            key={`upper-0-${resolvedUpper.id ?? resolvedUpper.name}`}
            garmentData={resolvedUpper} measurements={measurements}
            mannequinRef={internalRef} slot="upper" layer={0}
          />
        )}

        {resolvedLower && (
          <PhysicsGarment
            key={`lower-0-${resolvedLower.id ?? resolvedLower.name}`}
            garmentData={resolvedLower} measurements={measurements}
            mannequinRef={internalRef} slot="lower" layer={0}
          />
        )}

        <BodyDebugBounds mannequinRef={internalRef} />
        <MannequinLandmarks mannequinRef={internalRef} measurements={measurements}
          enabled={true} showRings={true} showDiscs={true} showSpheres={true} />
      </group>
    </>
  );
});

// ---------------------------------------------------------------------------
// Scene — forwards ref so TryOnPage can call capture() + flyToFront()
// ---------------------------------------------------------------------------
const Scene = forwardRef((props, ref) => {
  const { mannequinRef, ...sceneProps } = props;

  const handleContextLost = (e) => { e.preventDefault(); console.error('WebGL context lost'); };
  const handleContextRestored = () => console.log('WebGL context restored');

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 1.2, 4], fov: 50 }}
        shadows
        style={{ background: '#ffffff' }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0xffffff, 1);
          scene.background = new THREE.Color(0xffffff);
          gl.domElement.addEventListener('webglcontextlost', handleContextLost);
          gl.domElement.addEventListener('webglcontextrestored', handleContextRestored);
        }}
      >
        <SceneContent ref={ref} {...sceneProps} mannequinRef={mannequinRef} />
      </Canvas>
    </div>
  );
});

export default Scene;