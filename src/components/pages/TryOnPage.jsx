import React, { useState } from 'react';
import { Save, Share2, Camera } from 'lucide-react';
import Scene from '../3d/Scene';
import { useBodyMeasurements } from '../../hooks/useBodyMeasurements';
import { useGarmentFit } from '../../hooks/useGarmentFit';

const TryOnPage = ({ onSave, userGender }) => {
  const {
    measurements,
    height,
    weight,
    updateHeight,
    updateWeight
  } = useBodyMeasurements(userGender);
  
  const {
    selectedGarment,
    fitAnalysis,
    garmentColor,
    changeGarment,
    updateColor
  } = useGarmentFit(measurements);
  
  // State management
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [heightUnit, setHeightUnit] = useState('cm'); // cm or ft
  const [weightUnit, setWeightUnit] = useState('kg'); // kg or lbs
  const [selectedClothingType, setSelectedClothingType] = useState('shirt'); // clothing selection
  const [uploadedImage, setUploadedImage] = useState(null); // uploaded garment image
  
  // Unit conversions
  const heightInCm = height;
  const heightInFt = (height / 30.48).toFixed(1);
  const weightInKg = weight;
  const weightInLbs = (weight * 2.20462).toFixed(1);
  
  const handleSaveToMoodboard = () => {
    onSave({
      id: Date.now(),
      name: `Try-On ${new Date().toLocaleDateString()}`,
      date: new Date().toLocaleDateString(),
      measurements: measurements,
      garmentType: selectedGarment,
      color: garmentColor
    });
    
    setShowSaveNotification(true);
    setTimeout(() => setShowSaveNotification(false), 3000);
  };
  
  const handleShareWithCommunity = () => {
    // Placeholder for future community sharing feature
    console.log('Share with Virtrobe community');
  };
  
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result);
        console.log('Image uploaded:', file.name);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const clothingTypes = [
    { 
      id: 'shirt', 
      label: 'Shirt', 
      icon: () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    { 
      id: 'dress', 
      label: 'Dress', 
      icon: () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10M12 3v18M16 11l-4-4-4 4M8 7l4 4 4-4" />
        </svg>
      )
    },
    { 
      id: 'pants', 
      label: 'Pants', 
      icon: () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v18M15 3v18M9 3h6M9 21h6M6 3h12" />
        </svg>
      )
    },
    { 
      id: 'skirt', 
      label: 'Skirt', 
      icon: () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12l6 6 6-6M8 10h8" />
        </svg>
      )
    },
    { 
      id: 'shorts', 
      label: 'Shorts', 
      icon: () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v9M15 3v9M9 12h6M7 3h10M9 12v3M15 12v3" />
        </svg>
      )
    },
    { 
      id: 't-shirt', 
      label: 'T-Shirt', 
      icon: () => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l3-3h12l3 3v14H3V7zM9 7v14M15 7v14" />
        </svg>
      )
    },
  ];
  
  // Body type classification logic
  const getBodyType = () => {
    const { bust_cm, waist_cm, hips_cm } = measurements;
    const bustWaistDiff = bust_cm - waist_cm;
    const hipWaistDiff = hips_cm - waist_cm;
    
    if (Math.abs(bust_cm - hips_cm) <= 5 && waist_cm < bust_cm - 10) return 'Hourglass';
    if (bust_cm > hips_cm + 5) return 'Triangle (Top-Heavy)';
    if (hips_cm > bust_cm + 5) return 'Pear (Bottom-Heavy)';
    if (bustWaistDiff < 10 && hipWaistDiff < 10) return 'Rectangle';
    return 'Athletic';
  };
  
  return (
    <div className="w-full h-screen flex bg-white">
      
      {/* Save Notification */}
      {showSaveNotification && (
        <div className="fixed top-24 right-6 z-50 bg-black text-white px-6 py-3 rounded-full shadow-2xl animate-fade-in">
          <div className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            <span className="font-medium text-sm">Saved to Moodboard</span>
          </div>
        </div>
      )}
      
      {/* LEFT PANEL - Clothing Selection + 3D Viewport (9:16) */}
      <div className="flex gap-4 flex-1">
        
        {/* CLOTHING SELECTOR SIDEBAR */}
        <div className="w-24 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-4">
          
          {/* Upload Button */}
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 hover:border-black flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105"
            >
              <Camera className="w-6 h-6 text-black" />
            </label>
            <span className="text-[8px] text-gray-500 text-center block mt-1">Upload</span>
          </div>
          
          <div className="w-full h-px bg-gray-200 my-2"></div>
          
          {/* Clothing Type Buttons */}
          {clothingTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedClothingType(type.id)}
              className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${
                selectedClothingType === type.id
                  ? 'bg-black text-white scale-105 shadow-lg'
                  : 'bg-gray-100 hover:bg-gray-200 border-2 border-gray-200 hover:border-black text-gray-700'
              }`}
            >
              <type.icon />
              <span className="text-[8px] font-medium mt-1">{type.label}</span>
            </button>
          ))}
          
        </div>
        
        {/* 3D VIEWPORT - Compact Portrait Ratio (3:4) */}
        <div className="flex-1 flex flex-col">
          
          <div className="relative bg-gray-50 w-full max-w-md mx-auto" style={{ aspectRatio: '3/4' }}>
            <Scene
              measurements={measurements}
              garmentType={selectedClothingType}
              garmentColor={garmentColor}
              showMeasurements={false}
              showGarment={true}
              autoRotate={true}
            />
            
            {/* Viewport Label */}
            <div className="absolute top-4 left-4 bg-white px-3 py-1.5 rounded-full shadow-md border border-gray-200">
              <span className="text-xs font-semibold text-black tracking-wide">3D PREVIEW</span>
            </div>
            
            {/* Selected Clothing Indicator */}
            {selectedClothingType && (
              <div className="absolute top-4 right-4 bg-black text-white px-3 py-1.5 rounded-full shadow-lg">
                <span className="text-xs font-semibold capitalize">{selectedClothingType}</span>
              </div>
            )}
            
            {/* Uploaded Image Indicator */}
            {uploadedImage && (
              <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg overflow-hidden">
                <img src={uploadedImage} alt="Uploaded" className="w-16 h-16 object-cover" />
              </div>
            )}
          </div>
          
          {/* Similar Looks Section - Below 3D Viewport */}
          <div className="bg-white border-t border-gray-200 p-6">
            <h3 className="text-sm font-medium text-black mb-4">Similar Looks</h3>
            <div className="grid grid-cols-4 gap-4">
              
              {/* Card 1 */}
              <div className="group cursor-pointer">
                <div className="aspect-[3/4] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg mb-2 overflow-hidden border border-gray-200 hover:border-black transition-all duration-300">
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="flex flex-col items-center opacity-40 group-hover:opacity-60 transition-opacity">
                      <div className="w-6 h-6 rounded-full bg-black/10 mb-1" />
                      <div className="w-8 h-12 bg-black/10 rounded-lg mb-1" />
                      <div className="flex gap-1">
                        <div className="w-3 h-8 bg-black/10 rounded-lg" />
                        <div className="w-3 h-8 bg-black/10 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 font-medium">Casual Shirt</p>
                <p className="text-xs text-gray-400">Similar fit</p>
              </div>
              
              {/* Card 2 */}
              <div className="group cursor-pointer">
                <div className="aspect-[3/4] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg mb-2 overflow-hidden border border-gray-200 hover:border-black transition-all duration-300">
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="flex flex-col items-center opacity-40 group-hover:opacity-60 transition-opacity">
                      <div className="w-6 h-6 rounded-full bg-black/10 mb-1" />
                      <div className="w-8 h-12 bg-black/10 rounded-lg mb-1" />
                      <div className="flex gap-1">
                        <div className="w-3 h-8 bg-black/10 rounded-lg" />
                        <div className="w-3 h-8 bg-black/10 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 font-medium">Fitted Blazer</p>
                <p className="text-xs text-gray-400">Similar style</p>
              </div>
              
              {/* Card 3 */}
              <div className="group cursor-pointer">
                <div className="aspect-[3/4] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg mb-2 overflow-hidden border border-gray-200 hover:border-black transition-all duration-300">
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="flex flex-col items-center opacity-40 group-hover:opacity-60 transition-opacity">
                      <div className="w-6 h-6 rounded-full bg-black/10 mb-1" />
                      <div className="w-8 h-12 bg-black/10 rounded-lg mb-1" />
                      <div className="flex gap-1">
                        <div className="w-3 h-8 bg-black/10 rounded-lg" />
                        <div className="w-3 h-8 bg-black/10 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 font-medium">Summer Dress</p>
                <p className="text-xs text-gray-400">Your measurements</p>
              </div>
              
              {/* Card 4 */}
              <div className="group cursor-pointer">
                <div className="aspect-[3/4] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg mb-2 overflow-hidden border border-gray-200 hover:border-black transition-all duration-300">
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="flex flex-col items-center opacity-40 group-hover:opacity-60 transition-opacity">
                      <div className="w-6 h-6 rounded-full bg-black/10 mb-1" />
                      <div className="w-8 h-12 bg-black/10 rounded-lg mb-1" />
                      <div className="flex gap-1">
                        <div className="w-3 h-8 bg-black/10 rounded-lg" />
                        <div className="w-3 h-8 bg-black/10 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 font-medium">Knit Sweater</p>
                <p className="text-xs text-gray-400">Recommended</p>
              </div>
              
            </div>
          </div>
          
        </div>
        
      </div>
      
      {/* RIGHT PANEL - Minimalist Controls (Non-scrollable) */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col p-8">
        
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-serif text-black mb-1">Body Measurements</h2>
          <p className="text-sm text-gray-500 font-light">Adjust your dimensions</p>
        </div>
        
        {/* HEIGHT SLIDER */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-black">Height</label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-black">
                {heightUnit === 'cm' ? `${heightInCm} cm` : `${heightInFt} ft`}
              </span>
              <button
                onClick={() => setHeightUnit(heightUnit === 'cm' ? 'ft' : 'cm')}
                className="text-xs text-gray-500 hover:text-black transition-colors px-2 py-1 rounded border border-gray-300 hover:border-black"
              >
                {heightUnit === 'cm' ? 'ft' : 'cm'}
              </button>
            </div>
          </div>
          <input
            type="range"
            min="140"
            max="200"
            value={height}
            onChange={(e) => updateHeight(Number(e.target.value))}
            className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer slider-black"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>140cm</span>
            <span>200cm</span>
          </div>
        </div>
        
        {/* WEIGHT SLIDER */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-black">Weight</label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-black">
                {weightUnit === 'kg' ? `${weightInKg} kg` : `${weightInLbs} lbs`}
              </span>
              <button
                onClick={() => setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')}
                className="text-xs text-gray-500 hover:text-black transition-colors px-2 py-1 rounded border border-gray-300 hover:border-black"
              >
                {weightUnit === 'kg' ? 'lbs' : 'kg'}
              </button>
            </div>
          </div>
          <input
            type="range"
            min="40"
            max="120"
            value={weight}
            onChange={(e) => updateWeight(Number(e.target.value))}
            className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer slider-black"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>40kg</span>
            <span>120kg</span>
          </div>
        </div>
        
        {/* DIVIDER */}
        <div className="border-t border-gray-200 my-8"></div>
        
        {/* BODY PROFILE - Two Columns */}
        <div className="mb-8 flex-1">
          <h3 className="text-sm font-medium text-black mb-4">Body Profile</h3>
          <div className="grid grid-cols-2 gap-3">
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Gender</div>
              <div className="text-sm font-semibold text-black capitalize">{measurements.gender}</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">BMI</div>
              <div className="text-sm font-semibold text-black">{measurements.bmi}</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Body Type</div>
              <div className="text-sm font-semibold text-black">{getBodyType()}</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Shoulders</div>
              <div className="text-sm font-semibold text-black">{measurements.shoulder_width_cm} cm</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Bust</div>
              <div className="text-sm font-semibold text-black">{measurements.bust_cm} cm</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Waist</div>
              <div className="text-sm font-semibold text-black">{measurements.waist_cm} cm</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 col-span-2">
              <div className="text-xs text-gray-500 mb-1">Hips</div>
              <div className="text-sm font-semibold text-black">{measurements.hips_cm} cm</div>
            </div>
            
          </div>
        </div>
        
        {/* DIVIDER */}
        <div className="border-t border-gray-200 my-8"></div>
        
        {/* FIT ANALYSIS */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-black mb-4">Fit Analysis</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-xs text-gray-600">Fit Type</span>
              <span className="text-sm font-semibold text-black capitalize">{fitAnalysis.fit_type}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-xs text-gray-600">Recommended Size</span>
              <span className="text-sm font-semibold text-black">{fitAnalysis.recommended_size || 'M'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-xs text-gray-600">Bust Ease</span>
              <span className="text-sm font-semibold text-black">{fitAnalysis.ease?.bust || 'Standard'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-gray-600">Waist Ease</span>
              <span className="text-sm font-semibold text-black">{fitAnalysis.ease?.waist || 'Standard'}</span>
            </div>
          </div>
        </div>
        
        {/* ACTION BUTTONS */}
        <div className="space-y-3 mt-auto">
          
          <button
            onClick={handleSaveToMoodboard}
            className="w-full py-3 px-4 bg-black text-white rounded-full font-medium text-sm hover:bg-gray-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <Save className="w-4 h-4" />
            Save to Moodboard
          </button>
          
          <button
            onClick={handleShareWithCommunity}
            className="w-full py-3 px-4 bg-white text-black rounded-full font-medium text-sm hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-2 border border-gray-300 hover:border-black"
          >
            <Share2 className="w-4 h-4" />
            Share with Virtrobe
          </button>
          
        </div>
        
      </div>
    </div>
  );
};

export default TryOnPage;