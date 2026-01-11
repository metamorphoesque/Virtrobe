import React, { useState, useEffect } from 'react';
import { Save, Share2, Camera, Lock, Unlock, User } from 'lucide-react';
import Scene from '../3d/Scene';
import hybridGarmentGenerator from '../../services/hybridGarmentGenerator';

const TryOnPage = ({ onSave }) => {
  const [userGender, setUserGender] = useState(null);
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
  const [garmentData, setGarmentData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const calculateBMI = (heightCm, weightKg) => {
    const heightM = heightCm / 100;
    return (weightKg / (heightM * heightM)).toFixed(1);
  };
  
  const bmi = calculateBMI(height, weight);
  
  useEffect(() => {
    if (!autoCalculate || !userGender) return;
    
    const bmiValue = parseFloat(bmi);
    const frameFactor = Math.max(0, Math.min(1, (height - 150) / 50));
    
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
    }
  }, [height, weight, bmi, userGender, autoCalculate]);
  
  const measurements = {
    gender: userGender || 'female',
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
    if (bust > hips + 4 && bustWaistDiff >= 8) return 'Triangle';
    if (hips > bust + 4 && hipWaistDiff >= 8) return 'Pear';
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
        measurements,
        garmentType: selectedClothingType,
        color: '#000000'
      });
    }
    setShowSaveNotification(true);
    setTimeout(() => setShowSaveNotification(false), 3000);
  };
  
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    
    try {
      const result = await hybridGarmentGenerator.generate(file, measurements);
      setGarmentData(result);
      
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImage(reader.result);
      reader.readAsDataURL(file);
      
      console.log('Generated garment:', result);
    } catch (error) {
      console.error('Failed to process garment:', error);
      alert('Failed to process garment. Please try another image.');
    } finally {
      setIsProcessing(false);
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
        <div className="w-24 bg-white border-r border-black/10 flex flex-col items-center py-6 gap-4">
          <div className="relative">
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" disabled={!userGender || isProcessing} />
            <label htmlFor="image-upload" className={`w-16 h-16 rounded-lg bg-white border-2 flex items-center justify-center transition-all duration-300 ${userGender && !isProcessing ? 'border-black hover:bg-black hover:text-white cursor-pointer hover:scale-105' : 'border-gray-300 opacity-40 cursor-not-allowed'}`}>
              <Camera className="w-6 h-6" />
            </label>
            <span className="text-[8px] text-gray-500 text-center block mt-1">Upload</span>
          </div>
          
          <div className="w-full h-px bg-black/10 my-2"></div>
          
          {clothingTypes.map((type) => (
            <button 
              key={type.id} 
              onClick={() => userGender && setSelectedClothingType(type.id)} 
              disabled={!userGender}
              className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center transition-all duration-300 border-2 ${!userGender ? 'opacity-40 cursor-not-allowed border-gray-300 bg-white' : selectedClothingType === type.id ? 'bg-black text-white border-black scale-105 shadow-lg' : 'bg-white border-gray-300 hover:border-black text-black'}`}
            >
              <span className="text-[10px] font-medium">{type.label}</span>
            </button>
          ))}
        </div>
        
        <div className="flex-1 flex flex-col">
          <div className="relative bg-gray-50 w-full border border-black/10" style={{ aspectRatio: '16/9' }}>
            {!userGender && (
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
                    <button onClick={() => setUserGender('female')} className="group relative bg-white rounded-lg p-4 border-2 border-gray-200 hover:border-black transition-all duration-300 hover:shadow-xl">
                      <div className="aspect-[3/4] bg-white rounded-lg mb-4 overflow-hidden border border-black/10">
                        <Scene measurements={{...measurements, gender: 'female'}} garmentType="shirt" garmentColor="#000000" showMeasurements={false} showGarment={false} autoRotate={true} garmentData={null} />
                      </div>
                      <div className="text-center">
                        <h4 className="text-lg font-medium text-black">Feminine Mannequin</h4>
                        <p className="text-xs text-gray-500 mt-1">Feminine body proportions</p>
                      </div>
                    </button>
                    
                    <button onClick={() => setUserGender('male')} className="group relative bg-white rounded-lg p-4 border-2 border-gray-200 hover:border-black transition-all duration-300 hover:shadow-xl">
                      <div className="aspect-[3/4] bg-white rounded-lg mb-4 overflow-hidden border border-black/10">
                        <Scene measurements={{...measurements, gender: 'male'}} garmentType="shirt" garmentColor="#000000" showMeasurements={false} showGarment={false} autoRotate={true} garmentData={null} />
                      </div>
                      <div className="text-center">
                        <h4 className="text-lg font-medium text-black">Masculine Mannequin</h4>
                        <p className="text-xs text-gray-500 mt-1">Masculine body proportions</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <Scene measurements={measurements} garmentType={selectedClothingType} garmentColor="#000000" showMeasurements={false} showGarment={true} autoRotate={true} garmentData={garmentData} />
            
            <div className="absolute top-4 left-4 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-black/10">
              <span className="text-xs font-semibold text-black tracking-wide">3D PREVIEW</span>
            </div>
            
            {userGender && (
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg shadow-sm bg-black text-white border border-black">
                  <span className="text-xs font-semibold capitalize">{userGender}</span>
                </div>
                <button onClick={() => setUserGender(null)} className="px-3 py-1.5 bg-white rounded-lg shadow-sm border border-black/20 hover:border-black transition-colors">
                  <User className="w-3 h-3 text-black" />
                </button>
              </div>
            )}
            
            {isProcessing && (
              <div className="absolute bottom-4 left-4 bg-black text-white px-4 py-2 rounded-lg shadow-lg">
                <span className="text-xs font-medium">Processing garment...</span>
              </div>
            )}
            
            {uploadedImage && userGender && !isProcessing && (
              <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg overflow-hidden border border-black/10">
                <img src={uploadedImage} alt="Uploaded" className="w-16 h-16 object-cover" />
              </div>
            )}
          </div>
          
          {userGender && (
            <div className="bg-white border-t border-black/10 p-6">
              <h3 className="text-sm font-medium text-black mb-4">Similar Looks</h3>
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="aspect-[3/4] bg-gray-50 rounded-lg mb-2 border border-black/10 hover:border-black transition-all">
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="flex flex-col items-center opacity-30 group-hover:opacity-50 transition-opacity">
                          <div className="w-6 h-6 rounded-full bg-black/10 mb-1" />
                          <div className="w-8 h-12 bg-black/10 rounded-lg mb-1" />
                          <div className="flex gap-1">
                            <div className="w-3 h-8 bg-black/10 rounded-lg" />
                            <div className="w-3 h-8 bg-black/10 rounded-lg" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-black font-medium">Style {i}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="w-96 bg-white border-l border-black/10 flex flex-col p-8 overflow-y-auto relative">
        {!userGender && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">Select a mannequin to analyze body profile</p>
            </div>
          </div>
        )}
        
        <div className={`${!userGender ? 'opacity-30' : 'opacity-100'} transition-opacity`}>
          <div className="mb-8">
            <h2 className="text-2xl font-light text-black mb-1">Body Measurements</h2>
            <p className="text-sm text-gray-500 font-light capitalize">{userGender || 'Not selected'}</p>
          </div>
          
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-black">Height</label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-black">{heightUnit === 'cm' ? `${height} cm` : `${heightInFt} ft`}</span>
                <button onClick={() => userGender && setHeightUnit(heightUnit === 'cm' ? 'ft' : 'cm')} disabled={!userGender} className="text-xs text-gray-600 hover:text-black px-2 py-1 rounded border border-gray-300 hover:border-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{heightUnit === 'cm' ? 'ft' : 'cm'}</button>
              </div>
            </div>
            <input type="range" min="140" max="200" value={height} onChange={(e) => userGender && setHeight(Number(e.target.value))} disabled={!userGender} className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-black disabled:cursor-not-allowed" />
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
                <button onClick={() => userGender && setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')} disabled={!userGender} className="text-xs text-gray-600 hover:text-black px-2 py-1 rounded border border-gray-300 hover:border-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{weightUnit === 'kg' ? 'lbs' : 'kg'}</button>
              </div>
            </div>
            <input type="range" min="40" max="120" value={weight} onChange={(e) => userGender && setWeight(Number(e.target.value))} disabled={!userGender} className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-black disabled:cursor-not-allowed" />
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>40kg</span>
              <span>120kg</span>
            </div>
          </div>
          
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
          
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-black">Detailed Measurements</h3>
                <p className="text-xs text-gray-500 mt-1">{autoCalculate ? 'Auto-calculated' : 'Manual mode'}</p>
              </div>
              <button onClick={() => userGender && setAutoCalculate(!autoCalculate)} disabled={!userGender} className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed border ${autoCalculate ? 'bg-white text-black border-gray-300' : 'bg-black text-white border-black'}`}>
                {autoCalculate ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {autoCalculate ? 'Enable Manual' : 'Manual'}
              </button>
            </div>
          </div>
          
          <div className="space-y-6 mb-8">
            {['shoulders', 'bust', 'waist', 'hips'].map((measurement) => {
              const values = { shoulders, bust, waist, hips };
              const ranges = { shoulders: [30, 55], bust: [70, 120], waist: [55, 100], hips: [75, 125] };
              const [min, max] = ranges[measurement];
              const value = values[measurement];
              
              return (
                <div key={measurement} className={`transition-all ${autoCalculate ? 'opacity-60' : 'opacity-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-black capitalize">{measurement}</label>
                    <span className="text-sm font-semibold text-black">{value} cm</span>
                  </div>
                  <input type="range" min={min} max={max} value={value} onChange={(e) => handleManualChange(measurement, Number(e.target.value))} disabled={autoCalculate || !userGender} className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed accent-black" />
                </div>
              );
            })}
          </div>
          
          <div className="space-y-3 pt-6 border-t border-black/10">
            <button onClick={handleSaveToMoodboard} disabled={!userGender} className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <Save className="w-4 h-4" />
              Save to Moodboard
            </button>
            
            <button disabled={!userGender} className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-black/20">
              <Share2 className="w-4 h-4" />
              Share Look
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TryOnPage;