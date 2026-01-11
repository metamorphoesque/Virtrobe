// 8. src/components/TryOn/MeasurementPanel.jsx (NEW)
// ============================================
import React from 'react';
import { Save, Share2, Lock, Unlock } from 'lucide-react';

const MeasurementPanel = ({ bodyMeasurements, unitConversion, onSave }) => {
  const {
    gender,
    height,
    setHeight,
    weight,
    setWeight,
    shoulders,
    bust,
    waist,
    hips,
    autoCalculate,
    setAutoCalculate,
    bmi,
    getBodyType,
    updateManual
  } = bodyMeasurements;
  
  const { 
    heightUnit, 
    weightUnit, 
    convertHeight, 
    convertWeight, 
    toggleHeightUnit, 
    toggleWeightUnit 
  } = unitConversion;
  
  return (
    <div className="w-96 bg-white border-l border-black/10 flex flex-col p-8 overflow-y-auto relative">
      {!gender && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">Select a mannequin to analyze body profile</p>
          </div>
        </div>
      )}
      
      <div className={`${!gender ? 'opacity-30' : 'opacity-100'} transition-opacity`}>
        <div className="mb-8">
          <h2 className="text-2xl font-light text-black mb-1">Body Measurements</h2>
          <p className="text-sm text-gray-500 font-light capitalize">{gender || 'Not selected'}</p>
        </div>
        
        {/* Height Control */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-black">Height</label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-black">
                {heightUnit === 'cm' ? `${height} cm` : `${convertHeight(height)} ft`}
              </span>
              <button 
                onClick={() => gender && toggleHeightUnit()} 
                disabled={!gender} 
                className="text-xs text-gray-600 hover:text-black px-2 py-1 rounded border border-gray-300 hover:border-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            onChange={(e) => gender && setHeight(Number(e.target.value))} 
            disabled={!gender} 
            className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-black disabled:cursor-not-allowed" 
          />
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>140cm</span>
            <span>200cm</span>
          </div>
        </div>
        
        {/* Weight Control */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-black">Weight</label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-black">
                {weightUnit === 'kg' ? `${weight} kg` : `${convertWeight(weight)} lbs`}
              </span>
              <button 
                onClick={() => gender && toggleWeightUnit()} 
                disabled={!gender} 
                className="text-xs text-gray-600 hover:text-black px-2 py-1 rounded border border-gray-300 hover:border-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            onChange={(e) => gender && setWeight(Number(e.target.value))} 
            disabled={!gender} 
            className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-black disabled:cursor-not-allowed" 
          />
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>40kg</span>
            <span>120kg</span>
          </div>
        </div>
        
        {/* BMI & Body Type */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8 border border-black/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">BMI</span>
            <span className="text-lg font-bold text-black">{bmi}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">Body Type</span>
            <span className="text-sm font-semibold text-black">{getBodyType()}</span>
          </div>
        </div>
        
        <div className="border-t border-black/10 my-8"></div>
        
        {/* Auto/Manual Toggle */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-black">Detailed Measurements</h3>
              <p className="text-xs text-gray-500 mt-1">{autoCalculate ? 'Auto-calculated' : 'Manual mode'}</p>
            </div>
            <button 
              onClick={() => gender && setAutoCalculate(!autoCalculate)} 
              disabled={!gender} 
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed border ${
                autoCalculate 
                  ? 'bg-white text-black border-gray-300' 
                  : 'bg-black text-white border-black'
              }`}
            >
              {autoCalculate ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {autoCalculate ? 'Enable Manual' : 'Manual'}
            </button>
          </div>
        </div>
        
        {/* Detailed Measurements */}
        <div className="space-y-6 mb-8">
          {[
            { key: 'shoulders', value: shoulders, min: 30, max: 55 },
            { key: 'bust', value: bust, min: 70, max: 120 },
            { key: 'waist', value: waist, min: 55, max: 100 },
            { key: 'hips', value: hips, min: 75, max: 125 }
          ].map(({ key, value, min, max }) => (
            <div key={key} className={`transition-all ${autoCalculate ? 'opacity-60' : 'opacity-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-black capitalize">{key}</label>
                <span className="text-sm font-semibold text-black">{value} cm</span>
              </div>
              <input 
                type="range" 
                min={min} 
                max={max} 
                value={value} 
                onChange={(e) => updateManual(key, Number(e.target.value))} 
                disabled={autoCalculate || !gender} 
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed accent-black" 
              />
            </div>
          ))}
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-3 pt-6 border-t border-black/10">
          <button 
            onClick={onSave} 
            disabled={!gender} 
            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Save to Moodboard
          </button>
          
          <button 
            disabled={!gender} 
            className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-black/20"
          >
            <Share2 className="w-4 h-4" />
            Share Look
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeasurementPanel;