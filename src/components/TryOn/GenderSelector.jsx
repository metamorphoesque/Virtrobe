import React from 'react';
import { User } from 'lucide-react';
import Scene from '../3d/Scene';

const GenderSelector = ({ onSelectGender, measurements }) => {
  return (
    <div className="absolute inset-0 bg-white z-10 flex items-center justify-center p-8">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-full mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-3xl font-light text-black mb-2">Select Your Mannequin</h3>
          <p className="text-sm text-gray-500">Choose a silhouette type to begin</p>
        </div>
        
        <div className="grid grid-cols-2 gap-8">
          <button 
            onClick={() => onSelectGender('female')} 
            className="group relative bg-white rounded-lg p-4 border-2 border-gray-200 hover:border-black transition-all duration-300 hover:shadow-xl"
          >
            <div className="aspect-[3/4] bg-white rounded-lg mb-4 overflow-hidden border border-black/10">
              <Scene 
                measurements={{...measurements, gender: 'female'}} 
                garmentType="shirt" 
                garmentColor="#000000" 
                showMeasurements={false} 
                showGarment={false} 
                autoRotate={true} 
                garmentData={null} 
              />
            </div>
            <div className="text-center">
              <h4 className="text-lg font-medium text-black">Feminine Mannequin</h4>
              <p className="text-xs text-gray-500 mt-1">Feminine body proportions</p>
            </div>
          </button>
          
          <button 
            onClick={() => onSelectGender('male')} 
            className="group relative bg-white rounded-lg p-4 border-2 border-gray-200 hover:border-black transition-all duration-300 hover:shadow-xl"
          >
            <div className="aspect-[3/4] bg-white rounded-lg mb-4 overflow-hidden border border-black/10">
              <Scene 
                measurements={{...measurements, gender: 'male'}} 
                garmentType="shirt" 
                garmentColor="#000000" 
                showMeasurements={false} 
                showGarment={false} 
                autoRotate={true} 
                garmentData={null} 
              />
            </div>
            <div className="text-center">
              <h4 className="text-lg font-medium text-black">Masculine Mannequin</h4>
              <p className="text-xs text-gray-500 mt-1">Masculine body proportions</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenderSelector;
