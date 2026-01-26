// src/hooks/useGarmentUpload.js
// ============================================
// GARMENT UPLOAD HOOK - 2.5D VERSION
// Uses client-side 2D processing pipeline
// ============================================

import { useState } from 'react';
import garment2DProcessor from '../services/garment2D/garment2DProcessor'; // Note: Capital 'D' in 2D

export const useGarmentUpload = (measurements) => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [garmentData, setGarmentData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleImageUpload = async (event, garmentType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Please upload an image under 10MB');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      console.log('🎨 Processing garment upload...');
      console.log('   Type:', garmentType);
      console.log('   File:', file.name);
      console.log('   Size:', (file.size / 1024).toFixed(2), 'KB');
      console.log('   Measurements:', measurements);

      // Step 1: Store uploaded image preview
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImage(reader.result);
      reader.readAsDataURL(file);
      setProgress(10);

      // Step 2: Process with 2.5D pipeline
      console.log('📦 Starting 2.5D processing pipeline...');
      setProgress(20);

      const result = await garment2DProcessor.process(file, measurements);
      setProgress(90);

      // Add metadata
      result.type = garmentType || 'shirt';
      result.fileName = file.name;
      result.fileSize = file.size;

      console.log('✅ Garment processing complete:', {
        method: result.method,
        dominantColor: result.dominantColor,
        texturesReady: !!(result.garmentTexture && result.depthTexture && result.normalTexture)
      });

      setGarmentData(result);
      setProgress(100);

    } catch (err) {
      console.error('❌ Failed to process garment:', err);
      setError(err.message || 'Failed to process garment. Please try another image.');
      setGarmentData(null);
      setUploadedImage(null);
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearGarment = () => {
    console.log('🗑️ Clearing garment data');
    setGarmentData(null);
    setUploadedImage(null);
    setError(null);
    setProgress(0);
  };

  const retryProcessing = async () => {
    if (!uploadedImage) return;
    
    console.log('🔄 Retrying garment processing...');
    // Convert data URL back to file for reprocessing
    const response = await fetch(uploadedImage);
    const blob = await response.blob();
    const file = new File([blob], 'garment.jpg', { type: 'image/jpeg' });
    
    const mockEvent = {
      target: {
        files: [file]
      }
    };
    
    await handleImageUpload(mockEvent, garmentData?.type || 'shirt');
  };

  return {
    uploadedImage,
    garmentData,
    isProcessing,
    error,
    progress,
    handleImageUpload,
    clearGarment,
    retryProcessing
  };
};