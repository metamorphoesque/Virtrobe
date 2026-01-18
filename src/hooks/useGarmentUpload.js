// src/hooks/useGarmentUpload.js
// ============================================
// UPDATED: Now uses TripoSR instead of hybridGarmentGenerator
// ============================================

import { useState } from 'react';


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
      console.log('🎨 Processing garment upload with TripoSR...');
      console.log('   Type:', garmentType);
      console.log('   Measurements:', measurements);

      // Generate 3D mesh using TripoSR
      const result = await triposrService.generate(file, measurements);
      setGarmentData(result);

      // Store uploaded image for preview
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImage(reader.result);
      reader.readAsDataURL(file);

      console.log('✅ TripoSR generation complete:', result);

    } catch (err) {
      console.error('❌ Failed to process garment:', err);
      setError(err.message || 'Failed to process garment. Please try another image.');
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