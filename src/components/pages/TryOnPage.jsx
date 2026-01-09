import React, { useState, useEffect } from 'react';
import { Save, Share2, Camera, Lock, Unlock } from 'lucide-react';
import Scene from '../3d/Scene';


const TryOnPage = ({ onSave, userGender = 'female' }) => {
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(65);
  const [bust, setBust] = useState(90);
  const [waist, setWaist] = useState(70);
  const [hips, setHips] = useState(95);
  const [shoulders, setShoulders] = useState(40);
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [heightUnit, setHeightUnit] = useState('cm');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [selectedClothingType, setSelectedClothingType] = useState('shirt');
  const [uploadedImage, setUploadedImage] = useState(null);
  
  const calculateBMI = (heightCm, weightKg) => {
    const heightM = heightCm / 100;
    return (weightKg / (heightM * heightM)).toFixed(1);
  };
  
  const bmi = calculateBMI(height, weight);
  
  useEffect(() => {
    if (!autoCalculate) {
      console.log('⏸ Auto-calculate OFF - Manual mode active');
      return;
    }
    
    const bmiValue = parseFloat(bmi);
    const frameFactor = Math.max(0, Math.min(1, (height - 150) / 50));
    
    console.log(' Auto-calculating measurements:', { height, weight, bmi: bmiValue, frameFactor });
    
    if (userGender === 'female') {
      const baseShoulders = 38;
      const shouldersCalc = baseShoulders + (frameFactor * 7);
      
      let bustCalc, waistCalc, hipsCalc;
      
      if (bmiValue < 18.5) {
        bustCalc = 78 + (frameFactor * 6);
        waistCalc = 61 + (frameFactor * 5);
        hipsCalc = 82 + (frameFactor * 6);
      } else if (bmiValue < 20) {
        bustCalc = 82 + (frameFactor * 7) + ((bmiValue - 18.5) * 2);
        waistCalc = 64 + (frameFactor * 6) + ((bmiValue - 18.5) * 1.5);
        hipsCalc = 86 + (frameFactor * 7) + ((bmiValue - 18.5) * 2);
      } else if (bmiValue < 23) {
        bustCalc = 86 + (frameFactor * 8) + ((bmiValue - 20) * 2);
        waistCalc = 68 + (frameFactor * 7) + ((bmiValue - 20) * 1.5);
        hipsCalc = 90 + (frameFactor * 8) + ((bmiValue - 20) * 2.5);
      } else if (bmiValue < 25) {
        bustCalc = 92 + (frameFactor * 9) + ((bmiValue - 23) * 2);
        waistCalc = 72 + (frameFactor * 8) + ((bmiValue - 23) * 2);
        hipsCalc = 97 + (frameFactor * 9) + ((bmiValue - 23) * 2.5);
      } else if (bmiValue < 27) {
        bustCalc = 96 + (frameFactor * 10) + ((bmiValue - 25) * 2.5);
        waistCalc = 77 + (frameFactor * 9) + ((bmiValue - 25) * 3);
        hipsCalc = 102 + (frameFactor * 10) + ((bmiValue - 25) * 2.5);
      } else if (bmiValue < 30) {
        bustCalc = 101 + (frameFactor * 11) + ((bmiValue - 27) * 2.5);
        waistCalc = 83 + (frameFactor * 10) + ((bmiValue - 27) * 3);
        hipsCalc = 108 + (frameFactor * 11) + ((bmiValue - 27) * 2.5);
      } else {
        bustCalc = 108 + (frameFactor * 12) + ((bmiValue - 30) * 2);
        waistCalc = 92 + (frameFactor * 12) + ((bmiValue - 30) * 3);
        hipsCalc = 115 + (frameFactor * 13) + ((bmiValue - 30) * 2);
      }
      
      setShoulders(Math.round(shouldersCalc));
      setBust(Math.round(bustCalc));
      setWaist(Math.round(waistCalc));
      setHips(Math.round(hipsCalc));
      
      console.log('Female measurements:', {
        shoulders: Math.round(shouldersCalc),
        bust: Math.round(bustCalc),
        waist: Math.round(waistCalc),
        hips: Math.round(hipsCalc)
      });
      
    } else {
      const baseShoulders = 44;
      const shouldersCalc = baseShoulders + (frameFactor * 8);
      
      let bustCalc, waistCalc, hipsCalc;
      
      if (bmiValue < 18.5) {
        bustCalc = 85 + (frameFactor * 8);
        waistCalc = 70 + (frameFactor * 7);
        hipsCalc = 85 + (frameFactor * 6);
      } else if (bmiValue < 20) {
        bustCalc = 89 + (frameFactor * 9) + ((bmiValue - 18.5) * 2);
        waistCalc = 74 + (frameFactor * 8) + ((bmiValue - 18.5) * 1.5);
        hipsCalc = 88 + (frameFactor * 7) + ((bmiValue - 18.5) * 1.2);
      } else if (bmiValue < 23) {
        bustCalc = 93 + (frameFactor * 10) + ((bmiValue - 20) * 2.5);
        waistCalc = 77 + (frameFactor * 9) + ((bmiValue - 20) * 2);
        hipsCalc = 91 + (frameFactor * 8) + ((bmiValue - 20) * 1.5);
      } else if (bmiValue < 25) {
        bustCalc = 98 + (frameFactor * 11) + ((bmiValue - 23) * 2.5);
        waistCalc = 81 + (frameFactor * 10) + ((bmiValue - 23) * 2.5);
        hipsCalc = 94 + (frameFactor * 9) + ((bmiValue - 23) * 1.5);
      } else if (bmiValue < 27) {
        bustCalc = 103 + (frameFactor * 12) + ((bmiValue - 25) * 3);
        waistCalc = 86 + (frameFactor * 11) + ((bmiValue - 25) * 3.5);
        hipsCalc = 97 + (frameFactor * 10) + ((bmiValue - 25) * 2);
      } else if (bmiValue < 30) {
        bustCalc = 109 + (frameFactor * 13) + ((bmiValue - 27) * 3);
        waistCalc = 93 + (frameFactor * 12) + ((bmiValue - 27) * 4);
        hipsCalc = 101 + (frameFactor * 11) + ((bmiValue - 27) * 2);
      } else {
        bustCalc = 115 + (frameFactor * 14) + ((bmiValue - 30) * 2.5);
        waistCalc = 105 + (frameFactor * 14) + ((bmiValue - 30) * 4);
        hipsCalc = 107 + (frameFactor * 12) + ((bmiValue - 30) * 1.8);
      }
      
      setShoulders(Math.round(shouldersCalc));
      setBust(Math.round(bustCalc));
      setWaist(Math.round(waistCalc));
      setHips(Math.round(hipsCalc));
      
      console.log('Male measurements:', {
        shoulders: Math.round(shouldersCalc),
        bust: Math.round(bustCalc),
        waist: Math.round(waistCalc),
        hips: Math.round(hipsCalc)
      });
    }
    
  }, [height, weight, bmi, userGender, autoCalculate]);
  
  const measurements = {
    gender: userGender,
    height_cm: height,
    weight_kg: weight,
    bmi: parseFloat(bmi),
    bust_cm: bust,
    waist_cm: waist,
    hips_cm: hips,
    shoulder_width_cm: shoulders
  };
  
  const getBodyType = () => {
    const bustWaistDiff = bust - waist;
    const hipWaistDiff = hips - waist;
    const bustHipDiff = Math.abs(bust - hips);
    
    if (bustHipDiff <= 3 && bustWaistDiff >= 12 && hipWaistDiff >= 12) return 'Hourglass';
    if (bust > hips + 4 && bustWaistDiff >= 8) return 'Triangle (Top-Heavy)';
    if (hips > bust + 4 && hipWaistDiff >= 8) return 'Pear (Bottom-Heavy)';
    if (bustWaistDiff < 8 && hipWaistDiff < 8) return 'Rectangle';
    return 'Athletic';
  };
  
  const heightInFt = (height / 30.48).toFixed(1);
  const weightInLbs = (weight * 2.20462).toFixed(1);
  
  const handleSaveToMoodboard = () => {
    if (onSave) {
      onSave({
        id: Date.now(),
        name: `Try-On ${new Date().toLocaleDateString()}`,
        date: new Date().toLocaleDateString(),
        measurements: measurements,
        garmentType: selectedClothingType,
        color: '#000000'
      });
    }
    
    setShowSaveNotification(true);
    setTimeout(() => setShowSaveNotification(false), 3000);
  };
  
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImage(reader.result);
      reader.readAsDataURL(file);
    }
  };
  
  const clothingTypes = [
    { id: 'shirt', label: 'Shirt' },
    { id: 'dress', label: 'Dress' },
    { id: 'pants', label: 'Pants' },
    { id: 'skirt', label: 'Skirt' },
    { id: 'shorts', label: 'Shorts' },
    { id: 't-shirt', label: 'T-Shirt' },
  ];
  
  const handleManualChange = (type, value) => {
    if (!autoCalculate) console.log(` Manual adjustment: ${type} = ${value}cm`);
    
    switch(type) {
      case 'shoulders': setShoulders(value); break;
      case 'bust': setBust(value); break;
      case 'waist': setWaist(value); break;
      case 'hips': setHips(value); break;
    }
  };
  
  return (
    <div className="w-full h-screen flex bg-white">
      {showSaveNotification && (
        <div className="fixed top-24 right-6 z-50 bg-black text-white px-6 py-3 rounded-full shadow-2xl">
          <div className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            <span className="font-medium text-sm">Saved to Moodboard</span>
          </div>
        </div>
      )}
      
      <div className="flex gap-4 flex-1">
        <div className="w-24 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-4">
          <div className="relative">
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
            <label htmlFor="image-upload" className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 hover:border-black flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105">
              <Camera className="w-6 h-6 text-black" />
            </label>
            <span className="text-[8px] text-gray-500 text-center block mt-1">Upload</span>
          </div>
          
          <div className="w-full h-px bg-gray-200 my-2"></div>
          
          {clothingTypes.map((type) => (
            <button key={type.id} onClick={() => setSelectedClothingType(type.id)} className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${selectedClothingType === type.id ? 'bg-black text-white scale-105 shadow-lg' : 'bg-gray-100 hover:bg-gray-200 border-2 border-gray-200 hover:border-black text-gray-700'}`}>
              <span className="text-[10px] font-medium">{type.label}</span>
            </button>
          ))}
        </div>
        
        <div className="flex-1 flex flex-col">
          <div className="relative bg-gray-50 w-full max-w-md mx-auto" style={{ aspectRatio: '3/4' }}>
            <Scene measurements={measurements} garmentType={selectedClothingType} garmentColor="#000000" showMeasurements={false} showGarment={true} autoRotate={true} />
            
            <div className="absolute top-4 left-4 bg-white px-3 py-1.5 rounded-full shadow-md border border-gray-200">
              <span className="text-xs font-semibold text-black tracking-wide">3D PREVIEW</span>
            </div>
            
            <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 ${autoCalculate ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
              {autoCalculate ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              <span className="text-xs font-semibold">{autoCalculate ? 'AUTO' : 'MANUAL'}</span>
            </div>
            
            {uploadedImage && (
              <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg overflow-hidden">
                <img src={uploadedImage} alt="Uploaded" className="w-16 h-16 object-cover" />
              </div>
            )}
          </div>
          
          <div className="bg-white border-t border-gray-200 p-6">
            <h3 className="text-sm font-medium text-black mb-4">Similar Looks</h3>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="group cursor-pointer">
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
                  <p className="text-xs text-gray-600 font-medium">Style {i}</p>
                  <p className="text-xs text-gray-400">Similar fit</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col p-8 overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-serif text-black mb-1">Body Measurements</h2>
          <p className="text-sm text-gray-500 font-light">Adjust your dimensions</p>
        </div>
        
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-black">Height</label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-black">{heightUnit === 'cm' ? `${height} cm` : `${heightInFt} ft`}</span>
              <button onClick={() => setHeightUnit(heightUnit === 'cm' ? 'ft' : 'cm')} className="text-xs text-gray-500 hover:text-black transition-colors px-2 py-1 rounded border border-gray-300 hover:border-black">{heightUnit === 'cm' ? 'ft' : 'cm'}</button>
            </div>
          </div>
          <input type="range" min="140" max="200" value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-black" style={{ background: `linear-gradient(to right, #000 0%, #000 ${((height - 140) / 60) * 100}%, #e5e7eb ${((height - 140) / 60) * 100}%, #e5e7eb 100%)` }} />
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>140cm</span>
            <span>200cm</span>
          </div>
        </div>
        
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-black">Weight</label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-black">{weightUnit === 'kg' ? `${weight} kg` : `${weightInLbs} lbs`}</span>
              <button onClick={() => setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')} className="text-xs text-gray-500 hover:text-black transition-colors px-2 py-1 rounded border border-gray-300 hover:border-black">{weightUnit === 'kg' ? 'lbs' : 'kg'}</button>
            </div>
          </div>
          <input type="range" min="40" max="120" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-black" style={{ background: `linear-gradient(to right, #000 0%, #000 ${((weight - 40) / 80) * 100}%, #e5e7eb ${((weight - 40) / 80) * 100}%, #e5e7eb 100%)` }} />
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>40kg</span>
            <span>120kg</span>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">BMI</span>
            <span className="text-lg font-bold text-black">{bmi}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">Body Type</span>
            <span className="text-sm font-semibold text-black">{getBodyType()}</span>
          </div>
        </div>
        
        <div className="border-t border-gray-200 my-8"></div>
        
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-black">Detailed Measurements</h3>
              <p className="text-xs text-gray-500 mt-1">{autoCalculate ? 'Auto-calculated approximation from BMI' : 'Manual fine-tuning enabled'}</p>
            </div>
            <button onClick={() => { const newAutoState = !autoCalculate; setAutoCalculate(newAutoState); console.log(newAutoState ? ' Switched to AUTO mode' : '🔓 Switched to MANUAL mode'); }} className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 shadow-sm ${autoCalculate ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-black text-white hover:bg-gray-800'}`}>
              {autoCalculate ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {autoCalculate ? 'Enable Manual' : 'Using Manual'}
            </button>
          </div>
          
          {!autoCalculate && (
            <div className="bg-black-50 border border-black-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-white-800 font-medium">All bodies are unique. Manual mode active to fine-tune your measurements below for perfect fit.</p>
            </div>
          )}
        </div>
        
        <div className="space-y-6 mb-8">
          <div className={`transition-all ${autoCalculate ? 'opacity-60' : 'opacity-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-black flex items-center gap-2">Shoulders{!autoCalculate && <span className="text-black-600">●</span>}</label>
              <span className="text-sm font-semibold text-black">{shoulders} cm</span>
            </div>
            <input type="range" min="30" max="55" value={shoulders} onChange={(e) => handleManualChange('shoulders', Number(e.target.value))} disabled={autoCalculate} className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed accent-black" style={{ background: autoCalculate ? '#e5e7eb' : `linear-gradient(to right, #000 0%, #000 ${((shoulders - 30) / 25) * 100}%, #e5e7eb ${((shoulders - 30) / 25) * 100}%, #e5e7eb 100%)` }} />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>30cm</span>
              <span>55cm</span>
            </div>
          </div>
          
          <div className={`transition-all ${autoCalculate ? 'opacity-60' : 'opacity-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-black flex items-center gap-2">Bust{!autoCalculate && <span className="text-black-600">●</span>}</label>
              <span className="text-sm font-semibold text-black">{bust} cm</span>
            </div>
            <input type="range" min="70" max="120" value={bust} onChange={(e) => handleManualChange('bust', Number(e.target.value))} disabled={autoCalculate} className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed accent-black" style={{ background: autoCalculate ? '#e5e7eb' : `linear-gradient(to right, #000 0%, #000 ${((bust - 70) / 50) * 100}%, #e5e7eb ${((bust - 70) / 50) * 100}%, #e5e7eb 100%)` }} />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>70cm</span>
              <span>120cm</span>
            </div>
          </div>
          
          <div className={`transition-all ${autoCalculate ? 'opacity-60' : 'opacity-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-black flex items-center gap-2">Waist{!autoCalculate && <span className="text-black-600">●</span>}</label>
              <span className="text-sm font-semibold text-black">{waist} cm</span>
            </div>
            <input type="range" min="55" max="100" value={waist} onChange={(e) => handleManualChange('waist', Number(e.target.value))} disabled={autoCalculate} className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed accent-black" style={{ background: autoCalculate ? '#e5e7eb' : `linear-gradient(to right, #000 0%, #000 ${((waist - 55) / 45) * 100}%, #e5e7eb ${((waist - 55) / 45) * 100}%, #e5e7eb 100%)` }} />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>55cm</span>
              <span>100cm</span>
            </div>
          </div>
          
          <div className={`transition-all ${autoCalculate ? 'opacity-60' : 'opacity-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-black flex items-center gap-2">Hips{!autoCalculate && <span className="text-black-600">●</span>}</label>
              <span className="text-sm font-semibold text-black">{hips} cm</span>
            </div>
            <input type="range" min="75" max="125" value={hips} onChange={(e) => handleManualChange('hips', Number(e.target.value))} disabled={autoCalculate} className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed accent-black" style={{ background: autoCalculate ? '#e5e7eb' : `linear-gradient(to right, #000 0%, #000 ${((hips - 75) / 50) * 100}%, #e5e7eb ${((hips - 75) / 50) * 100}%, #e5e7eb 100%)` }} />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>75cm</span>
              <span>125cm</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-3 pt-6 border-t border-gray-200">
          <button onClick={handleSaveToMoodboard} className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            Save to Moodboard
          </button>
          
          <button className="w-full bg-gray-100 text-black py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" />
            Share Look
          </button>
        </div>
        
        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-black mb-3">Current Measurements</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-gray-600">Height:</span><span className="font-medium text-black">{height}cm</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Weight:</span><span className="font-medium text-black">{weight}kg</span></div>
            <div className="flex justify-between"><span className="text-gray-600">BMI:</span><span className="font-medium text-black">{bmi}</span></div>
            <div className="h-px bg-gray-200 my-2"></div>
            <div className="flex justify-between"><span className="text-gray-600">Shoulders:</span><span className="font-medium text-black">{shoulders}cm</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Bust:</span><span className="font-medium text-black">{bust}cm</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Waist:</span><span className="font-medium text-black">{waist}cm</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Hips:</span><span className="font-medium text-black">{hips}cm</span></div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default TryOnPage;