// src/components/GenderSelection.jsx
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { useGLTF } from '@react-three/drei';
import { Users } from 'lucide-react';

// Simple mannequin preview component
const MannequinPreview = ({ modelPath }) => {
  const { scene } = useGLTF(modelPath);
  
  return (
    <group position={[0, 0.5, 0]} scale={0.5}>
      <primitive object={scene} />
    </group>
  );
};

const GenderSelection = ({ onSelectGender }) => {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-full mb-4">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-serif text-black mb-2">Choose Your Avatar</h1>
        <p className="text-gray-600">Select a body type to begin your virtual try-on experience</p>
      </div>
      
      {/* Gender Selection Cards */}
      <div className="grid grid-cols-2 gap-8 max-w-4xl w-full">
        
        {/* FEMALE OPTION */}
        <button
          onClick={() => onSelectGender('female')}
          className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-black"
        >
          {/* 3D Preview */}
          <div className="aspect-[3/4] bg-gradient-to-br from-pink-50 to-purple-50 relative">
            <Canvas camera={{ position: [0, 1.2, 3], fov: 50 }}>
              <ambientLight intensity={0.6} />
              <spotLight position={[0, 5, 0]} intensity={1} angle={0.6} penumbra={0.5} />
              <directionalLight position={[2, 3, 2]} intensity={0.4} />
              <Environment preset="studio" />
              
              <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={3} blur={2} />
              
              <MannequinPreview modelPath="/models/female_mannequin.glb" />
              
              <OrbitControls 
                enableZoom={false} 
                enablePan={false}
                autoRotate
                autoRotateSpeed={2}
                minPolarAngle={Math.PI / 3}
                maxPolarAngle={Math.PI / 2}
              />
            </Canvas>
            
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent pointer-events-none"></div>
          </div>
          
          {/* Label */}
          <div className="p-6 text-center">
            <h3 className="text-2xl font-semibold text-black mb-2 group-hover:text-purple-600 transition-colors">
              Female
            </h3>
            <p className="text-sm text-gray-600">
              Designed for feminine body proportions
            </p>
          </div>
          
          {/* Hover effect */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300 pointer-events-none"></div>
        </button>
        
        {/* MALE OPTION */}
        <button
          onClick={() => onSelectGender('male')}
          className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-black"
        >
          {/* 3D Preview */}
          <div className="aspect-[3/4] bg-gradient-to-br from-blue-50 to-cyan-50 relative">
            <Canvas camera={{ position: [0, 1.2, 3], fov: 50 }}>
              <ambientLight intensity={0.6} />
              <spotLight position={[0, 5, 0]} intensity={1} angle={0.6} penumbra={0.5} />
              <directionalLight position={[2, 3, 2]} intensity={0.4} />
              <Environment preset="studio" />
              
              <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={3} blur={2} />
              
              <MannequinPreview modelPath="/models/male_mannequin.glb" />
              
              <OrbitControls 
                enableZoom={false} 
                enablePan={false}
                autoRotate
                autoRotateSpeed={2}
                minPolarAngle={Math.PI / 3}
                maxPolarAngle={Math.PI / 2}
              />
            </Canvas>
            
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent pointer-events-none"></div>
          </div>
          
          {/* Label */}
          <div className="p-6 text-center">
            <h3 className="text-2xl font-semibold text-black mb-2 group-hover:text-blue-600 transition-colors">
              Male
            </h3>
            <p className="text-sm text-gray-600">
              Designed for masculine body proportions
            </p>
          </div>
          
          {/* Hover effect */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300 pointer-events-none"></div>
        </button>
        
      </div>
      
      {/* Footer note */}
      <p className="text-xs text-gray-500 mt-8 text-center max-w-md">
        You can change this selection later. Both options support full body customization.
      </p>
      
    </div>
  );
};

// Preload both models
useGLTF.preload('/models/female_mannequin.glb');
useGLTF.preload('/models/male_mannequin.glb');

export default GenderSelection;