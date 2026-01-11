// 2. src/hooks/useGarmentUpload.js (NEW)
// ============================================
import { useState } from 'react';

export const useGarmentUpload = (hybridGarmentGenerator, measurements) => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [garmentData, setGarmentData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
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
  
  return {
    uploadedImage,
    garmentData,
    isProcessing,
    handleImageUpload
  };
};