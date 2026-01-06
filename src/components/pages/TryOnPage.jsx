import React, { useState } from 'react';
import { Save, Share2, User } from 'lucide-react';
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
      
      {/* LEFT PANEL - 3D Viewport */}
      <div className="flex-1 relative bg-gray-50">
        <Scene
          measurements={measurements}
          garmentType={selectedGarment}
          garmentColor={garmentColor}
          showMeasurements={false}
          showGarment={true}
          autoRotate={true}
        />
        
        {/* Viewport Label */}
        <div className="absolute top-6 left-6 bg-white px-4 py-2 rounded-full shadow-md border border-gray-200">
          <span className="text-xs font-semibold text-black tracking-wide">3D PREVIEW</span>
        </div>
      </div>
      
      {/* RIGHT PANEL - Minimalist Controls */}
      <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto p-8">
        
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
          <div className="flex justify-between text-xs text-gray-400 mt-1">
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
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>40kg</span>
            <span>120kg</span>
          </div>
        </div>
        
        {/* DIVIDER */}
        <div className="border-t border-gray-200 my-8"></div>
        
        {/* BODY PROFILE GRID */}
        <div className="mb-8">
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
        
        {/* DIVIDER */}
        <div className="border-t border-gray-200 my-8"></div>
        
        {/* ACTION BUTTONS */}
        <div className="space-y-3">
          
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
        
        {/* INFO NOTE */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600 leading-relaxed">
            <span className="font-semibold text-black">Note:</span> Measurements are calculated based on height and weight using standard body proportions. For more accurate fitting, consider manual measurements.
          </p>
        </div>
        
      </div>
    </div>
  );
};

export default TryOnPage;