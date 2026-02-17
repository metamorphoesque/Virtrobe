// src/hooks/useGarmentUpload.js
// ============================================
// GARMENT UPLOAD HOOK - 3D VERSION
// Uses HuggingFace TripoSR for FREE 3D mesh generation
// ============================================

import { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

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

      // Step 2: Send to backend for 3D generation
      console.log('🚀 Sending to HuggingFace TripoSR...');
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('garment_type', garmentType || 'shirt');

      const response = await fetch(`${API_BASE_URL}/garments/generate-sync`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      // Step 3: Handle Server-Sent Events stream for progress
      const reader2 = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader2.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));
            
            switch (data.type) {
              case 'progress':
                setProgress(data.progress);
                console.log(`   Progress: ${data.progress}% - ${data.status}`);
                break;
              
              case 'info':
                console.log('   ℹ️ ', data.message);
                break;
              
              case 'complete':
                setProgress(100);
                
                // Build garment data object (matches your old structure)
                const result = {
                  // 3D mesh data
                  modelUrl: data.garment.modelUrl,
                  taskId: data.garment.taskId,
                  
                  // Metadata (compatible with your existing code)
                  type: garmentType || 'shirt',
                  fileName: file.name,
                  fileSize: file.size,
                  method: '3D-Mesh',
                  service: 'HuggingFace-TripoSR',
                  free: true,
                  
                  // Dummy color (you can enhance this later)
                  dominantColor: '#808080',
                  
                  // Flag for Scene component to know this is 3D
                  is3D: true
                };

                console.log('✅ 3D mesh generation complete:', {
                  modelUrl: result.modelUrl,
                  method: result.method,
                  cost: 'FREE'
                });

                setGarmentData(result);
                return result;
              
              case 'error':
                throw new Error(data.error);
            }
          }
        }
      }

    } catch (err) {
      console.error('❌ Failed to generate 3D mesh:', err);
      
      // Better error messages
      let errorMessage = err.message;
      
      if (errorMessage.includes('loading')) {
        errorMessage = 'Model is warming up (20-30s). Please wait and try again.';
      } else if (errorMessage.includes('ECONNREFUSED')) {
        errorMessage = 'Backend server not running. Start it with: cd server && node server.js';
      }
      
      setError(errorMessage);
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
    
    console.log('🔄 Retrying 3D mesh generation...');
    
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