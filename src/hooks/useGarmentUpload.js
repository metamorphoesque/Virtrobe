// src/hooks/useGarmentUpload.js
// ============================================
// UPDATED to use productionGarmentService
// ============================================

import { useState } from 'react';
import productionGarmentService from '../services/ai/productionGarmentService';

export const useGarmentUpload = (measurements) => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [garmentData, setGarmentData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleImageUpload = async (event, garmentType) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🎨 Processing garment upload...');
      console.log('   Type:', garmentType);
      console.log('   Measurements:', measurements);

      // Generate using production service
      const result = await productionGarmentService.generate(file, measurements);

      // Override type if user specified
      if (garmentType) {
        result.type = garmentType;
      }

      setGarmentData(result);

      // Store uploaded image for preview
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImage(reader.result);
      reader.readAsDataURL(file);

      console.log('✅ Generated garment:', result);

    } catch (err) {
      console.error('❌ Failed to process garment:', err);
      setError('Failed to process garment. Please try another image.');
      setGarmentData(null);
      setUploadedImage(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearGarment = () => {
    setGarmentData(null);
    setUploadedImage(null);
    setError(null);
  };

  return {
    uploadedImage,
    garmentData,
    isProcessing,
    error,
    handleImageUpload,
    clearGarment
  };
};