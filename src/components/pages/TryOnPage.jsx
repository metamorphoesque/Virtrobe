// src/components/pages/TryOnPage.jsx (FIXED)
import React from 'react';
import { Save, Share2, User, Wind } from 'lucide-react';
import Scene from '../3d/Scene';
import GenderSelector from '../TryOn/GenderSelector';
import ClothingSidebar from '../TryOn/ClothingSidebar';
import MeasurementPanel from '../TryOn/MeasurementPanel';
import SaveNotification from '../TryOn/SaveNotification';
import { useBodyMeasurements } from '../../hooks/useBodyMeasurements';
import { useGarmentUpload } from '../../hooks/useGarmentUpload';
import { useUnitConversion } from '../../hooks/useUnitConversion';
import { useNotification } from '../../hooks/useNotification';
import hybridGarmentGenerator from '../../services/hybridGarmentGenerator';

const TryOnPage = ({ onSave }) => {
  const [selectedClothingType, setSelectedClothingType] = React.useState('shirt');
  const [enablePhysics, setEnablePhysics] = React.useState(false);
  
  // Custom hooks
  const bodyMeasurements = useBodyMeasurements();
  const garmentUpload = useGarmentUpload(hybridGarmentGenerator, bodyMeasurements.measurements);
  const unitConversion = useUnitConversion();
  const saveNotification = useNotification(3000);
  
  const handleSaveToMoodboard = () => {
    if (onSave) {
      onSave({
        id: Date.now(),
        name: `Try-On ${new Date().toLocaleDateString()}`,
        date: new Date().toLocaleDateString(),
        measurements: bodyMeasurements.measurements,
        garmentType: selectedClothingType,
        color: garmentUpload.garmentData?.dominantColor || '#000000'
      });
    }
    saveNotification.show();
  };

  // Wrapper to pass garment type to upload handler
  const handleImageUpload = (event) => {
    garmentUpload.handleImageUpload(event, selectedClothingType);
  };
  
  return (
    <div className="w-full h-screen flex bg-white">
      <SaveNotification isVisible={saveNotification.isVisible} />
      
      <div className="flex gap-4 flex-1">
        <ClothingSidebar
          selectedType={selectedClothingType}
          onSelectType={setSelectedClothingType}
          onImageUpload={handleImageUpload}
          isDisabled={!bodyMeasurements.gender}
          isProcessing={garmentUpload.isProcessing}
        />
        
        <div className="flex-1 flex flex-col">
          <div className="relative bg-gray-50 w-full border border-black/10" style={{ aspectRatio: '16/9' }}>
            {!bodyMeasurements.gender && (
              <GenderSelector 
                onSelectGender={bodyMeasurements.setGender} 
                measurements={bodyMeasurements.measurements}
              />
            )}
            
            <Scene 
              measurements={bodyMeasurements.measurements} 
              garmentType={selectedClothingType} 
              garmentColor={garmentUpload.garmentData?.dominantColor || "#000000"} 
              showMeasurements={false} 
              showGarment={!!garmentUpload.garmentData} 
              autoRotate={true} 
              garmentData={garmentUpload.garmentData}
              enableClothPhysics={enablePhysics}
            />
            
            <div className="absolute top-4 left-4 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-black/10">
              <span className="text-xs font-semibold text-black tracking-wide">3D PREVIEW</span>
            </div>
            
            {bodyMeasurements.gender && (
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {/* Physics Toggle Button */}
                <button
                  onClick={() => setEnablePhysics(!enablePhysics)}
                  disabled={!garmentUpload.garmentData}
                  className={`px-3 py-1.5 rounded-lg shadow-sm border transition-all duration-300 ${
                    enablePhysics 
                      ? 'bg-black text-white border-black' 
                      : garmentUpload.garmentData
                        ? 'bg-white text-black border-black/20 hover:border-black'
                        : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                  title={
                    !garmentUpload.garmentData 
                      ? 'Upload a garment first' 
                      : enablePhysics 
                        ? 'Disable Cloth Physics' 
                        : 'Enable Cloth Physics'
                  }
                >
                  <Wind className="w-3 h-3" />
                </button>
                
                <div className="px-3 py-1.5 rounded-lg shadow-sm bg-black text-white border border-black">
                  <span className="text-xs font-semibold capitalize">{bodyMeasurements.gender}</span>
                </div>
                
                <button 
                  onClick={() => {
                    bodyMeasurements.setGender(null);
                    setEnablePhysics(false);
                    garmentUpload.clearGarment();
                  }} 
                  className="px-3 py-1.5 bg-white rounded-lg shadow-sm border border-black/20 hover:border-black transition-colors"
                  title="Reset and change gender"
                >
                  <User className="w-3 h-3 text-black" />
                </button>
              </div>
            )}
            
            {/* Physics Status Indicator */}
            {enablePhysics && bodyMeasurements.gender && garmentUpload.garmentData && (
              <div className="absolute top-16 right-4 bg-black text-white px-3 py-1.5 rounded-lg shadow-sm">
                <div className="flex items-center gap-2">
                  <Wind className="w-3 h-3 animate-pulse" />
                  <span className="text-xs font-medium">Physics Active</span>
                </div>
              </div>
            )}
            
            {garmentUpload.isProcessing && (
              <div className="absolute bottom-4 left-4 bg-black text-white px-4 py-2 rounded-lg shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-xs font-medium">Processing garment...</span>
                </div>
              </div>
            )}
            
            {garmentUpload.uploadedImage && bodyMeasurements.gender && !garmentUpload.isProcessing && (
              <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg overflow-hidden border border-black/10">
                <img 
                  src={garmentUpload.uploadedImage} 
                  alt="Uploaded garment" 
                  className="w-16 h-16 object-cover" 
                />
              </div>
            )}

            {garmentUpload.error && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
                <span className="text-xs font-medium">{garmentUpload.error}</span>
              </div>
            )}
          </div>
          
          {bodyMeasurements.gender && (
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
      
      <MeasurementPanel
        bodyMeasurements={bodyMeasurements}
        unitConversion={unitConversion}
        onSave={handleSaveToMoodboard}
      />
    </div>
  );
};

export default TryOnPage;