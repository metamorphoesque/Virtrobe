import React, { useState } from 'react';
import { Plus, Eye, EyeOff, Ruler, Palette, Save, Info } from 'lucide-react';
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
    fabricProperties,
    garmentColor,
    fitQuality,
    recommendations,
    changeGarment,
    updateColor
  } = useGarmentFit(measurements);
  
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showGarment, setShowGarment] = useState(true);
  const [customColor, setCustomColor] = useState(garmentColor);
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  
  const handleSaveToMoodboard = () => {
    onSave({
      id: Date.now(),
      name: `${selectedGarment.charAt(0).toUpperCase() + selectedGarment.slice(1)} Try-On`,
      date: new Date().toLocaleDateString(),
      emoji: selectedGarment === 'jacket' ? '🧥' : selectedGarment === 'shirt' ? '👔' : '👗',
      measurements: measurements,
      garmentType: selectedGarment,
      color: customColor
    });
    
    // Show notification
    setShowSaveNotification(true);
    setTimeout(() => setShowSaveNotification(false), 3000);
  };
  
  const colorPresets = [
    { name: 'Black', value: '#1a1a1a' },
    { name: 'Navy', value: '#1e3a8a' },
    { name: 'Brown', value: '#78350f' },
    { name: 'Olive', value: '#3f4f1f' },
    { name: 'Gray', value: '#4b5563' },
    { name: 'Beige', value: '#d4b5a0' },
    { name: 'White', value: '#f5f5f5' },
    { name: 'Burgundy', value: '#7f1d1d' }
  ];
  
  const handleColorChange = (color) => {
    setCustomColor(color);
    updateColor(color);
  };
  
  return (
    <div className="w-full h-screen flex bg-stone-50 relative">
      {/* Save Notification */}
      {showSaveNotification && (
        <div className="fixed top-24 right-6 z-50 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-full shadow-2xl animate-fade-in">
          <div className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            <span className="font-bold">Saved to Moodboard!</span>
          </div>
        </div>
      )}
      
      {/* Left Panel - Controls */}
      <div className="w-96 bg-gradient-to-b from-amber-50 to-stone-100 shadow-2xl p-6 overflow-y-auto border-r-2 border-stone-200">
        <h2 className="text-3xl font-bold text-stone-800 mb-6">Virtual Try-On</h2>
        
        {/* Body Measurements */}
        <div className="mb-6 bg-white rounded-3xl p-5 shadow-lg border-2 border-stone-200">
          <div className="flex items-center gap-2 mb-4">
            <Ruler className="w-5 h-5 text-amber-700" />
            <h3 className="text-lg font-bold text-stone-800">Body Measurements</h3>
          </div>
          
          <div className="mb-5">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-stone-700">Height</label>
              <span className="text-amber-800 font-bold text-lg">{height} cm</span>
            </div>
            <input
              type="range"
              min="140"
              max="200"
              value={height}
              onChange={(e) => updateHeight(Number(e.target.value))}
              className="w-full h-3 bg-stone-200 rounded-full appearance-none cursor-pointer accent-amber-700"
            />
            <div className="flex justify-between text-xs text-stone-500 mt-1">
              <span>140</span>
              <span>200</span>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-stone-700">Weight</label>
              <span className="text-amber-800 font-bold text-lg">{weight} kg</span>
            </div>
            <input
              type="range"
              min="40"
              max="120"
              value={weight}
              onChange={(e) => updateWeight(Number(e.target.value))}
              className="w-full h-3 bg-stone-200 rounded-full appearance-none cursor-pointer accent-amber-700"
            />
            <div className="flex justify-between text-xs text-stone-500 mt-1">
              <span>40</span>
              <span>120</span>
            </div>
          </div>
        </div>
        
        {/* Body Profile */}
        <div className="mb-6 p-5 bg-gradient-to-br from-amber-100 to-amber-50 rounded-3xl border-2 border-amber-200 shadow-lg">
          <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Body Profile
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs text-amber-800">
            <div className="bg-white bg-opacity-60 rounded-2xl p-3">
              <div className="text-stone-600 font-semibold mb-1">Gender</div>
              <div className="font-bold text-amber-900 capitalize">{measurements.gender}</div>
            </div>
            <div className="bg-white bg-opacity-60 rounded-2xl p-3">
              <div className="text-stone-600 font-semibold mb-1">Type</div>
              <div className="font-bold text-amber-900">{measurements.body_type}</div>
            </div>
            <div className="bg-white bg-opacity-60 rounded-2xl p-3">
              <div className="text-stone-600 font-semibold mb-1">BMI</div>
              <div className="font-bold text-amber-900">{measurements.bmi}</div>
            </div>
            <div className="bg-white bg-opacity-60 rounded-2xl p-3">
              <div className="text-stone-600 font-semibold mb-1">Shoulders</div>
              <div className="font-bold text-amber-900">{measurements.shoulder_width_cm} cm</div>
            </div>
            <div className="bg-white bg-opacity-60 rounded-2xl p-3">
              <div className="text-stone-600 font-semibold mb-1">Bust/Chest</div>
              <div className="font-bold text-amber-900">{measurements.bust_cm} cm</div>
            </div>
            <div className="bg-white bg-opacity-60 rounded-2xl p-3">
              <div className="text-stone-600 font-semibold mb-1">Waist</div>
              <div className="font-bold text-amber-900">{measurements.waist_cm} cm</div>
            </div>
            <div className="bg-white bg-opacity-60 rounded-2xl p-3 col-span-2">
              <div className="text-stone-600 font-semibold mb-1">Hips</div>
              <div className="font-bold text-amber-900">{measurements.hips_cm} cm</div>
            </div>
          </div>
        </div>
        
        {/* Garment Selection */}
        <div className="mb-6 bg-white rounded-3xl p-5 shadow-lg border-2 border-stone-200">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-amber-700" />
            <h3 className="text-lg font-bold text-stone-800">Garment Style</h3>
          </div>
          
          <select
            value={selectedGarment}
            onChange={(e) => changeGarment(e.target.value)}
            className="w-full p-3 border-2 border-stone-300 rounded-full mb-4 bg-stone-50 text-stone-800 font-semibold focus:ring-4 focus:ring-amber-200 focus:border-amber-600 transition cursor-pointer"
          >
            <option value="jacket">Structured Jacket</option>
            <option value="shirt">Casual Shirt</option>
            <option value="dress">Fitted Dress</option>
          </select>
          
          {/* Color Picker */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-stone-700 mb-3 block">Choose Color</label>
            <div className="grid grid-cols-4 gap-3">
              {colorPresets.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleColorChange(color.value)}
                  className={`h-12 rounded-2xl transition-all duration-300 ${
                    customColor === color.value 
                      ? 'ring-4 ring-amber-600 scale-110 shadow-xl' 
                      : 'hover:scale-105 shadow-md hover:shadow-lg'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {customColor === color.value && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full shadow-lg"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Fit Analysis */}
          <div className="mt-4 p-4 bg-gradient-to-br from-stone-50 to-amber-50 rounded-2xl border border-stone-200">
            <h4 className="text-sm font-bold text-stone-700 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-600 rounded-full"></div>
              Fit Analysis
            </h4>
            <div className="space-y-2 text-xs text-stone-600">
              <div className="flex justify-between items-center p-2 bg-white rounded-xl">
                <span className="font-semibold">Fit Type:</span>
                <span className="font-bold text-amber-800 capitalize">{fitAnalysis.fit_type}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded-xl">
                <span className="font-semibold">Quality:</span>
                <span className={`font-bold px-3 py-1 rounded-full ${
                  fitQuality.score >= 90 ? 'bg-green-100 text-green-700' : 
                  fitQuality.score >= 75 ? 'bg-amber-100 text-amber-700' : 
                  'bg-orange-100 text-orange-700'
                }`}>
                  {fitQuality.rating}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded-xl">
                <span className="font-semibold">Bust Ease:</span>
                <span className="font-bold text-stone-700">{fitAnalysis.ease.bust}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded-xl">
                <span className="font-semibold">Waist Ease:</span>
                <span className="font-bold text-stone-700">{fitAnalysis.ease.waist}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Fabric Properties */}
        <div className="mb-6 p-5 bg-gradient-to-br from-stone-100 to-stone-50 rounded-3xl border-2 border-stone-200 shadow-lg">
          <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-stone-600 rounded-full"></div>
            Fabric Details
          </h3>
          <div className="space-y-2 text-xs text-stone-700">
            <div className="flex justify-between p-2 bg-white rounded-xl">
              <span className="font-semibold">Material:</span>
              <span className="font-bold text-stone-800">{fabricProperties.type}</span>
            </div>
            <div className="flex justify-between p-2 bg-white rounded-xl">
              <span className="font-semibold">Stiffness:</span>
              <span className="font-bold text-stone-800 capitalize">{fabricProperties.stiffness}</span>
            </div>
            <div className="flex justify-between p-2 bg-white rounded-xl">
              <span className="font-semibold">Drape:</span>
              <span className="font-bold text-stone-800 capitalize">{fabricProperties.drape}</span>
            </div>
            <div className="flex justify-between p-2 bg-white rounded-xl">
              <span className="font-semibold">Thickness:</span>
              <span className="font-bold text-stone-800">{fabricProperties.thickness_mm} mm</span>
            </div>
          </div>
        </div>
        
        {/* View Controls */}
        <div className="space-y-3">
          <button
            onClick={() => setShowMeasurements(!showMeasurements)}
            className={`w-full py-3 px-4 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              showMeasurements 
                ? 'bg-amber-800 text-amber-50 shadow-lg scale-105' 
                : 'bg-stone-200 text-stone-700 hover:bg-stone-300 hover:scale-102'
            }`}
          >
            {showMeasurements ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            {showMeasurements ? 'Hide' : 'Show'} Measurements
          </button>
          
          <button
            onClick={() => setShowGarment(!showGarment)}
            className={`w-full py-3 px-4 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              showGarment 
                ? 'bg-amber-700 text-amber-50 shadow-lg scale-105' 
                : 'bg-stone-200 text-stone-700 hover:bg-stone-300 hover:scale-102'
            }`}
          >
            {showGarment ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            {showGarment ? 'Hide' : 'Show'} Garment
          </button>
          
          <button
            onClick={handleSaveToMoodboard}
            className="w-full py-4 px-4 rounded-full font-bold bg-gradient-to-r from-amber-700 to-amber-900 text-amber-50 hover:from-amber-800 hover:to-amber-950 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-2 transform hover:-translate-y-1"
          >
            <Save className="w-5 h-5" />
            Save to Moodboard
          </button>
        </div>
        
        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-3xl">
            <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Recommendations
            </h4>
            <ul className="space-y-1 text-xs text-blue-800">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Right Panel - 3D Viewer */}
      <div className="flex-1 relative bg-gradient-to-br from-stone-100 to-amber-50">
        <Scene
          measurements={measurements}
          garmentType={selectedGarment}
          garmentColor={customColor}
          showMeasurements={showMeasurements}
          showGarment={showGarment}
          autoRotate={true}
        />
        
        {/* Instructions Overlay */}
        <div className="absolute top-6 right-6 bg-white bg-opacity-95 p-5 rounded-3xl shadow-2xl max-w-xs border-2 border-stone-200">
          <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
            <span className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white text-xs">💡</span>
            Controls
          </h3>
          <ul className="text-xs text-stone-700 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-amber-700 font-bold">•</span>
              <span>Drag to rotate the view</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-700 font-bold">•</span>
              <span>Scroll to zoom in/out</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-700 font-bold">•</span>
              <span>Model auto-rotates slowly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-700 font-bold">•</span>
              <span>Adjust sliders for perfect fit</span>
            </li>
          </ul>
        </div>
        
        {/* Fit Quality Badge */}
        <div className="absolute bottom-6 left-6 bg-white bg-opacity-95 px-6 py-4 rounded-full shadow-xl border-2 border-stone-200">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-stone-700">Fit Quality:</span>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${
                fitQuality.score >= 90 ? 'text-green-600' : 
                fitQuality.score >= 75 ? 'text-amber-600' : 'text-orange-600'
              }`}>
                {fitQuality.rating}
              </span>
              <span className="text-sm text-stone-500">({fitQuality.score}%)</span>
            </div>
          </div>
        </div>
        
        {/* Size Recommendation */}
        <div className="absolute bottom-6 right-6 bg-gradient-to-r from-amber-700 to-amber-900 text-amber-50 px-6 py-3 rounded-full shadow-xl border-2 border-amber-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Recommended Size:</span>
            <span className="text-xl font-bold">{fitAnalysis.recommended_size || 'M'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TryOnPage;