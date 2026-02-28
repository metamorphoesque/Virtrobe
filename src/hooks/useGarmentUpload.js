// src/hooks/useGarmentUpload.js
// ============================================
// GARMENT UPLOAD HOOK
// Supports both template loading AND API upload
// ============================================

import { useState } from 'react';
import { supabase } from '../lib/supabase';

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Get the current user's auth token for backend API calls.
 * Returns headers object with Authorization if authenticated.
 */
async function getAuthHeaders() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { 'Authorization': `Bearer ${session.access_token}` };
    }
  } catch (err) {
    console.warn('⚠️ Could not get auth token:', err.message);
  }
  return {};
}

export const useGarmentUpload = (measurements) => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [garmentData, setGarmentData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  // ═══════════════════════════════════════════════════════
  // TEMPLATE MODE — Direct garment data injection
  // Called when user picks a template from sidebar
  // ═══════════════════════════════════════════════════════
  const setGarmentDataDirectly = (data) => {
    console.log('👗 Loading template directly:', data.name);
    setGarmentData(data);
    setError(null);
    setProgress(100);
    setUploadedImage(null);
    setIsProcessing(false);
  };

  // ═══════════════════════════════════════════════════════
  // UPLOAD MODE — API-based 3D generation
  // Called when user uploads a custom image
  // ═══════════════════════════════════════════════════════
  const handleImageUpload = async (event, garmentType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Max 10MB');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      console.log('🎨 Processing garment upload...');
      console.log('   Type:', garmentType, '| File:', file.name);

      // Store preview
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImage(reader.result);
      reader.readAsDataURL(file);
      setProgress(10);

      // Send to backend (with auth token)
      const formData = new FormData();
      formData.append('image', file);
      formData.append('garment_type', garmentType || 'shirt');

      const authHeaders = await getAuthHeaders();

      const response = await fetch(`${API_BASE_URL}/garments/generate-sync`, {
        method: 'POST',
        body: formData,
        headers: {
          ...authHeaders,
          // Note: Do NOT set Content-Type here — fetch auto-sets it with boundary for FormData
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      // Read SSE stream
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
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.substring(6));

          if (data.type === 'progress') {
            setProgress(data.progress);
            console.log(`   ${data.progress}% - ${data.status}`);
          } else if (data.type === 'info') {
            console.log('   ℹ️', data.message);
          } else if (data.type === 'complete') {
            setProgress(100);
            const result = {
              modelUrl: data.garment.modelUrl,
              taskId: data.garment.taskId,
              type: garmentType || 'shirt',
              fileName: file.name,
              dominantColor: '#808080',
              is3D: true,
              isTemplate: false
            };
            console.log('✅ 3D mesh ready:', result.modelUrl);
            setGarmentData(result);
            return result;
          } else if (data.type === 'error') {
            throw new Error(data.error);
          }
        }
      }

    } catch (err) {
      console.error('❌ Upload failed:', err);
      let msg = err.message;
      if (msg.includes('ECONNREFUSED')) msg = 'Backend not running';
      setError(msg);
      setGarmentData(null);
      setUploadedImage(null);
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearGarment = () => {
    setGarmentData(null);
    setUploadedImage(null);
    setError(null);
    setProgress(0);
  };

  const retryProcessing = async () => {
    if (!uploadedImage) return;
    const res = await fetch(uploadedImage);
    const blob = await res.blob();
    const file = new File([blob], 'garment.jpg', { type: 'image/jpeg' });
    await handleImageUpload({ target: { files: [file] } }, garmentData?.type || 'shirt');
  };

  return {
    uploadedImage,
    garmentData,
    isProcessing,
    error,
    progress,
    handleImageUpload,
    setGarmentDataDirectly,  // ← THIS IS THE KEY FUNCTION
    clearGarment,
    retryProcessing
  };
};