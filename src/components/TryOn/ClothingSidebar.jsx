// src/components/TryOn/ClothingSidebar.jsx (UPDATED)
import React from 'react';
import { Upload, Shirt, User, Wind } from 'lucide-react';

const ClothingSidebar = ({
  selectedType,
  onSelectType,
  onImageUpload,
  isDisabled = false,
  isProcessing = false
}) => {
  const clothingTypes = [
    { id: 'shirt', icon: '👔', label: 'Shirt' },
    { id: 'tshirt', icon: '👕', label: 'T-Shirt' },
    { id: 'dress', icon: '👗', label: 'Dress' },
    { id: 'pants', icon: '👖', label: 'Pants' },
    { id: 'skirt', icon: '👘', label: 'Skirt' },
    { id: 'shorts', icon: '🩳', label: 'Shorts' }
  ];

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (JPG, PNG, etc.)');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      console.log('📁 File selected:', file.name, '/', selectedType);
      
      // Pass event directly - the hook will handle extraction
      onImageUpload(event);
    }
  };

  return (
    <div className="w-64 bg-white border-r border-black/10 flex flex-col">
      {/* Upload Section */}
      <div className="p-6 border-b border-black/10">
        <h3 className="text-sm font-semibold text-black mb-3 uppercase tracking-wide">
          Upload Garment
        </h3>
        
        <label className={`
          relative flex flex-col items-center justify-center
          w-full h-32 border-2 border-dashed rounded-lg
          cursor-pointer transition-all duration-300
          ${isDisabled 
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50' 
            : isProcessing
              ? 'border-black bg-black/5'
              : 'border-black/20 hover:border-black hover:bg-gray-50'
          }
        `}>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isDisabled || isProcessing}
          />
          
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              <span className="text-xs text-black/60">Processing...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-black/40" />
              <span className="text-xs text-black/60">
                {isDisabled ? 'Select gender first' : 'Click to upload'}
              </span>
            </div>
          )}
        </label>

        {isDisabled && (
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800 flex items-center gap-2">
              <User className="w-3 h-3" />
              Please select a gender to continue
            </p>
          </div>
        )}
      </div>

      {/* Clothing Type Selection */}
      <div className="flex-1 p-6 overflow-y-auto">
        <h3 className="text-sm font-semibold text-black mb-3 uppercase tracking-wide">
          Select Type
        </h3>
        
        <div className="grid grid-cols-2 gap-2">
          {clothingTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => onSelectType(type.id)}
              disabled={isDisabled}
              className={`
                p-4 rounded-lg border-2 transition-all duration-200
                ${selectedType === type.id
                  ? 'border-black bg-black text-white'
                  : isDisabled
                    ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'border-black/20 hover:border-black bg-white text-black'
                }
              `}
            >
              <div className="text-2xl mb-1">{type.icon}</div>
              <div className="text-xs font-medium">{type.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="p-6 border-t border-black/10 bg-gray-50">
        <h4 className="text-xs font-semibold text-black mb-2 uppercase">
          Tips
        </h4>
        <ul className="text-xs text-black/60 space-y-1">
          <li>• Use clear, front-facing photos</li>
          <li>• Remove background if possible</li>
          <li>• Ensure good lighting</li>
          <li>• Max file size: 10MB</li>
        </ul>
      </div>
    </div>
  );
};

export default ClothingSidebar;