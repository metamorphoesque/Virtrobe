// src/components/pages/TryOnPage.jsx
import React from 'react';
import { User, RotateCcw } from 'lucide-react';
import Scene from '../3d/Scene';
import GenderSelector from '../TryOn/GenderSelector';
import ClothingSidebar from '../TryOn/ClothingSidebar';
import MeasurementPanel from '../TryOn/MeasurementPanel';
import SaveNotification from '../TryOn/SaveNotification';
import { useBodyMeasurements } from '../../hooks/useBodyMeasurements';
import { useGarmentUpload } from '../../hooks/useGarmentUpload';
import { useUnitConversion } from '../../hooks/useUnitConversion';
import { useNotification } from '../../hooks/useNotification';
import garmentTemplateService from '../../services/garmentTemplateService';

const TryOnPage = ({ onSave }) => {
  const [selectedClothingType, setSelectedClothingType] = React.useState('shirt');
  const [selectedTemplateId, setSelectedTemplateId] = React.useState(null);
  const mannequinRef = React.useRef(null);

  const bodyMeasurements = useBodyMeasurements();
  const garmentUpload = useGarmentUpload(bodyMeasurements.measurements);
  const unitConversion = useUnitConversion();
  const saveNotification = useNotification(3000);

  React.useEffect(() => {
    return () => {
      garmentUpload.clearGarment();
      if (window.gc) window.gc();
    };
  }, []);

  // Handle template selection — loads from Supabase, no API call
  const handleSelectTemplate = async (templateId, garmentType) => {
    try {
      const template = await garmentTemplateService.getById(templateId);
      const withUrl = await garmentTemplateService.resolveUrls(template);
      const garmentData = garmentTemplateService.templateToGarmentData(withUrl, 'template');

      setSelectedTemplateId(templateId);
      setSelectedClothingType(garmentType);
      garmentUpload.setGarmentDataDirectly(garmentData);

      console.log('👗 Template loaded:', garmentData.name, garmentData.modelUrl);
    } catch (err) {
      console.error('Failed to load template:', err);
    }
  };

  const handleImageUpload = (event) => {
    garmentUpload.handleImageUpload(event, selectedClothingType);
  };

  const handleSaveToMoodboard = () => {
    if (onSave) {
      onSave({
        id: Date.now(),
        name: `Try-On ${new Date().toLocaleDateString()}`,
        date: new Date().toLocaleDateString(),
        measurements: bodyMeasurements.measurements,
        garmentType: selectedClothingType,
        color: garmentUpload.garmentData?.dominantColor || '#000000',
        imageUrl: garmentUpload.uploadedImage
      });
    }
    saveNotification.show();
  };

  return (
    <div className="w-full h-screen flex bg-white">
      <SaveNotification isVisible={saveNotification.isVisible} />

      <div className="flex gap-4 flex-1">
        <ClothingSidebar
          selectedType={selectedClothingType}
          onSelectType={setSelectedClothingType}
          onSelectTemplate={handleSelectTemplate}
          onImageUpload={handleImageUpload}
          isDisabled={!bodyMeasurements.gender}
          isProcessing={garmentUpload.isProcessing}
          selectedTemplateId={selectedTemplateId}
        />

        <div className="flex-1 flex flex-col">
          <div className="relative bg-gray-50 w-full border border-black/10" style={{ aspectRatio: '16/9' }}>
            {!bodyMeasurements.gender && (
              <GenderSelector onSelectGender={bodyMeasurements.setGender} measurements={bodyMeasurements.measurements} />
            )}

            <Scene
              measurements={bodyMeasurements.measurements}
              showGarment={!!garmentUpload.garmentData}
              autoRotate={!garmentUpload.garmentData}
              garmentData={garmentUpload.garmentData}
              mannequinFrontFacing={180}
              mannequinRef={mannequinRef}
            />

            <div className="absolute top-4 left-4 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-black/10">
              <span className="text-xs font-semibold text-black tracking-wide">
                {garmentUpload.garmentData ? 'VIRTUAL TRY-ON' : '3D PREVIEW'}
              </span>
            </div>

            {bodyMeasurements.gender && (
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg shadow-sm bg-black text-white border border-black">
                  <span className="text-xs font-semibold capitalize">{bodyMeasurements.gender}</span>
                </div>
                <button
                  onClick={() => { bodyMeasurements.setGender(null); garmentUpload.clearGarment(); setSelectedTemplateId(null); }}
                  className="px-3 py-1.5 bg-white rounded-lg shadow-sm border border-black/20 hover:border-black"
                  title="Reset"
                >
                  <User className="w-3 h-3 text-black" />
                </button>
              </div>
            )}

            {garmentUpload.garmentData && (
              <div className="absolute top-16 right-4 bg-black text-white px-3 py-1.5 rounded-lg shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs font-medium">Front View Locked • Zoom Only</span>
                </div>
              </div>
            )}

            {garmentUpload.isProcessing && (
              <div className="absolute bottom-4 left-4 bg-black text-white px-4 py-2 rounded-lg shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">Generating 3D model...</span>
                    {garmentUpload.progress > 0 && <span className="text-[10px] text-white/70">{garmentUpload.progress}%</span>}
                  </div>
                </div>
              </div>
            )}

            {garmentUpload.error && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                <span className="text-xs font-medium">{garmentUpload.error}</span>
                <button onClick={garmentUpload.retryProcessing} className="p-1 hover:bg-red-600 rounded"><RotateCcw className="w-3 h-3" /></button>
              </div>
            )}

            {bodyMeasurements.gender && !garmentUpload.garmentData && !garmentUpload.isProcessing && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-black/10">
                <span className="text-xs text-black/70">← Pick a garment from the sidebar</span>
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
                      <div className="w-full h-full flex items-center justify-center opacity-30 group-hover:opacity-50">
                        <div className="flex flex-col items-center">
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

      <MeasurementPanel bodyMeasurements={bodyMeasurements} unitConversion={unitConversion} onSave={handleSaveToMoodboard} />
    </div>
  );
};

export default TryOnPage;