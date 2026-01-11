// 6. src/components/TryOn/ClothingSidebar.jsx (NEW)
// ============================================
import React from 'react';
import { Camera } from 'lucide-react';

const ClothingSidebar = ({ 
  selectedType, 
  onSelectType, 
  onImageUpload, 
  isDisabled,
  isProcessing 
}) => {
  const clothingTypes = [
    { id: 'shirt', label: 'Shirt' },
    { id: 'dress', label: 'Dress' },
    { id: 'pants', label: 'Pants' },
    { id: 'skirt', label: 'Skirt' },
    { id: 'shorts', label: 'Shorts' },
    { id: 't-shirt', label: 'T-Shirt' },
  ];
  
  return (
    <div className="w-24 bg-white border-r border-black/10 flex flex-col items-center py-6 gap-4">
      <div className="relative">
        <input 
          type="file" 
          accept="image/*" 
          onChange={onImageUpload} 
          className="hidden" 
          id="image-upload" 
          disabled={isDisabled || isProcessing} 
        />
        <label 
          htmlFor="image-upload" 
          className={`w-16 h-16 rounded-lg bg-white border-2 flex items-center justify-center transition-all duration-300 ${
            !isDisabled && !isProcessing 
              ? 'border-black hover:bg-black hover:text-white cursor-pointer hover:scale-105' 
              : 'border-gray-300 opacity-40 cursor-not-allowed'
          }`}
        >
          <Camera className="w-6 h-6" />
        </label>
        <span className="text-[8px] text-gray-500 text-center block mt-1">Upload</span>
      </div>
      
      <div className="w-full h-px bg-black/10 my-2"></div>
      
      {clothingTypes.map((type) => (
        <button 
          key={type.id} 
          onClick={() => !isDisabled && onSelectType(type.id)} 
          disabled={isDisabled}
          className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center transition-all duration-300 border-2 ${
            isDisabled 
              ? 'opacity-40 cursor-not-allowed border-gray-300 bg-white' 
              : selectedType === type.id 
                ? 'bg-black text-white border-black scale-105 shadow-lg' 
                : 'bg-white border-gray-300 hover:border-black text-black'
          }`}
        >
          <span className="text-[10px] font-medium">{type.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ClothingSidebar;
