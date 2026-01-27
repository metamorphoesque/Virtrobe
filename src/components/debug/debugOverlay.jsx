import React, { useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';

const DebugOverlay = ({ mannequinRef, garmentData, cameraLocked }) => {
  const { camera, controls } = useThree();
  const [debugData, setDebugData] = useState({});
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!camera || !controls) return;

      setDebugData({
        camera: {
          position: {
            x: camera.position.x.toFixed(3),
            y: camera.position.y.toFixed(3),
            z: camera.position.z.toFixed(3)
          }
        },
        controls: {
          azimuthalAngle: (controls.getAzimuthalAngle() * 180 / Math.PI).toFixed(1) + '°',
          azimuthalAngleRad: controls.getAzimuthalAngle().toFixed(3) + ' rad',
          polarAngle: (controls.getPolarAngle() * 180 / Math.PI).toFixed(1) + '°',
          distance: controls.getDistance().toFixed(3)
        },
        mannequin: mannequinRef?.current ? {
          rotation: {
            y: (mannequinRef.current.rotation.y * 180 / Math.PI).toFixed(1) + '°'
          }
        } : null,
        state: { cameraLocked, garmentLoaded: !!garmentData }
      });
    }, 100);

    return () => clearInterval(interval);
  }, [camera, controls, mannequinRef, garmentData, cameraLocked]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'd' || e.key === 'D') {
        setVisible(prev => !prev);
      }
    };
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [visible]);

  if (!visible) {
    return (
      <div className="absolute top-4 left-4 bg-black/80 text-white px-2 py-1 rounded text-xs z-50">
        Press D to show debug
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-4 bg-black/90 text-white p-4 rounded-lg shadow-2xl font-mono text-xs max-h-[80vh] overflow-y-auto backdrop-blur-sm z-50">
      <div className="flex justify-between mb-3 pb-2 border-b border-white/20">
        <h3 className="font-bold text-green-400">🔍 DEBUG</h3>
        <button onClick={() => setVisible(false)} className="text-white/60 hover:text-white">Hide (D)</button>
      </div>

      <div className="mb-3">
        <h4 className="text-yellow-400 font-semibold mb-1">📷 CAMERA</h4>
        <div className="text-white/80 text-[10px]">
          Pos: ({debugData.camera?.position.x}, {debugData.camera?.position.y}, {debugData.camera?.position.z})
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-yellow-400 font-semibold mb-1">🎮 CONTROLS</h4>
        <div className="text-white/80 text-[10px] space-y-1">
          <div>Azimuthal: {debugData.controls?.azimuthalAngle} ({debugData.controls?.azimuthalAngleRad})</div>
          <div>Polar: {debugData.controls?.polarAngle}</div>
          <div>Distance: {debugData.controls?.distance}</div>
        </div>
      </div>

      {debugData.mannequin && (
        <div className="mb-3">
          <h4 className="text-yellow-400 font-semibold mb-1">🧍 MANNEQUIN</h4>
          <div className="text-white/80 text-[10px]">
            Rotation Y: {debugData.mannequin.rotation.y}
          </div>
        </div>
      )}

      <div className="mb-3">
        <h4 className="text-yellow-400 font-semibold mb-1">⚙️ STATE</h4>
        <div className="text-[10px] space-y-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${debugData.state?.cameraLocked ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span>{debugData.state?.cameraLocked ? 'LOCKED' : 'FREE'}</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-white/20 text-[9px] text-white/50">
        <div>0° = +Z | 90° = +X</div>
        <div>180° = -Z (FRONT) | 270° = -X</div>
      </div>
    </div>
  );
};

export default DebugOverlay;