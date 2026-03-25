// src/components/3d/Scene.jsx
import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, Grid, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import MorphableMannequin from './MorphableMannequin';
import WornGarment from './WornGarment';
import MannequinLandmarks from './MannequinLandmarks';
import LandmarkDebugger from './LandmarkDebugger';

const DisplayStand = ({ position = [0, 0, 0], scale = 1 }) => {
  const { scene } = useGLTF('/models/DisplayStand.glb');
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);
  return <primitive object={clonedScene} position={position} scale={scale} />;
};
useGLTF.preload('/models/DisplayStand.glb');

// ---------------------------------------------------------------------------
// Camera controller — LOCKED camera, no orbiting.  Exposes flyToFront()
// and capture() via ref.  The camera is stationary at a fixed position.
// ---------------------------------------------------------------------------
const CameraController = forwardRef(({ onReady }, ref) => {
  const { camera, gl, scene } = useThree();
  const flyTarget = useRef(null);
  const flying = useRef(false);

  useEffect(() => {
    camera.position.set(0, 1.2, 4);
    camera.lookAt(0, 1, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  useImperativeHandle(ref, () => ({
    flyToFront(cb) {
      flyTarget.current = {
        pos: new THREE.Vector3(0, 1.2, 3.2),
        look: new THREE.Vector3(0, 1.1, 0),
        cb,
      };
      flying.current = true;
    },
    capture() {
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/png');
    },
    enableOrbit() {
      // no-op — orbit controls are removed
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

  // No OrbitControls — camera is completely locked
  return null;
});

// ---------------------------------------------------------------------------
// Mannequin rotation controller — lerps the group rotation based on either
// viewAngle (from the Front/Side/Back buttons) OR userAngle (from pointer
// drag on the canvas).
// ---------------------------------------------------------------------------
const MannequinRotationController = ({ groupRef, shouldFaceFront, viewAngle, userAngle }) => {
  useFrame(() => {
    if (!groupRef.current) return;

    // Priority: userAngle (from drag) > viewAngle (from buttons) > auto
    let target;
    if (userAngle !== undefined && userAngle !== null) {
      target = userAngle;
    } else if (viewAngle !== undefined) {
      target = viewAngle;
    } else if (shouldFaceFront) {
      target = Math.PI / 2;
    } else {
      return; // auto-rotate is handled elsewhere
    }

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
      <mesh ref={upperRef}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#00ff88" wireframe transparent opacity={0.5} /></mesh>
      <mesh ref={lowerRef}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#0088ff" wireframe transparent opacity={0.5} /></mesh>
    </group>
  );
};

const FRONT_ROTATION_Y = Math.PI / 2;

// View angles: front, side-left, back
const VIEW_ANGLES = {
  front: Math.PI / 2,
  side: Math.PI,
  back: (3 * Math.PI) / 2,
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
  easeFactor,       // ← ease slider value
  userAngle,        // ← pointer-drag rotation angle
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
        userAngle={userAngle}
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
          <WornGarment
            key={`upper-0-${resolvedUpper.id ?? resolvedUpper.name}`}
            garmentData={resolvedUpper} measurements={measurements}
            mannequinRef={internalRef}
            easeFactor={easeFactor}
          />
        )}

        {resolvedLower && (
          <WornGarment
            key={`lower-0-${resolvedLower.id ?? resolvedLower.name}`}
            garmentData={resolvedLower} measurements={measurements}
            mannequinRef={internalRef}
            easeFactor={easeFactor}
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
// Camera is locked. Pointer drag on the canvas rotates the mannequin.
// ---------------------------------------------------------------------------
const Scene = forwardRef((props, ref) => {
  const { mannequinRef, ...sceneProps } = props;

  // ── Pointer-drag rotation state ──────────────────────────────
  const [userAngle, setUserAngle] = useState(null);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const angleRef = useRef(FRONT_ROTATION_Y);

  // When viewAngle changes from the buttons, drop userAngle so the
  // MannequinRotationController picks up the button value.
  useEffect(() => {
    if (props.viewAngle !== undefined) {
      const target = VIEW_ANGLES[props.viewAngle];
      if (target !== undefined) {
        angleRef.current = target;
        setUserAngle(null);
      }
    }
  }, [props.viewAngle]);

  // Has garment = allow drag rotation
  const hasGarment = !!(props.upperGarmentData || props.lowerGarmentData);

  const onPointerDown = useCallback((e) => {
    if (!hasGarment) return;
    dragging.current = true;
    lastX.current = e.clientX;
  }, [hasGarment]);

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return;
    const deltaX = e.clientX - lastX.current;
    lastX.current = e.clientX;
    // Sensitivity: ~3px per degree
    angleRef.current += deltaX * 0.006;
    setUserAngle(angleRef.current);
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleContextLost = (e) => { e.preventDefault(); console.error('WebGL context lost'); };
  const handleContextRestored = () => console.log('WebGL context restored');

  return (
    <div
      className="w-full h-full"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{ cursor: hasGarment ? 'grab' : 'default' }}
    >
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
        <SceneContent
          ref={ref}
          {...sceneProps}
          mannequinRef={mannequinRef}
          userAngle={userAngle}
        />
      </Canvas>
    </div>
  );
});

export default Scene;