// File upload and handling utilities

export const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsDataURL(file);
  });
};

export const validateImageFile = (file) => {
  const errors = [];
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  
  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }
  
  if (file.size > maxSize) {
    errors.push('File size must be less than 10MB');
  }
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('File must be JPEG, PNG, or WebP format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const compressImage = async (dataURL, maxWidth = 1024, quality = 0.8) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataURL;
  });
};

export const extractImageDimensions = (dataURL) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height
      });
    };
    img.src = dataURL;
  });
};

export const downloadCanvas = (canvasElement, filename = 'tryon.png') => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvasElement.toDataURL();
  link.click();
};

export const shareImage = async (imageData, title = 'My FitVerse Try-On') => {
  if (navigator.share) {
    try {
      const blob = await (await fetch(imageData)).blob();
      const file = new File([blob], 'tryon.png', { type: 'image/png' });
      
      await navigator.share({
        title: title,
        text: 'Check out my virtual try-on!',
        files: [file]
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  } else {
    return { success: false, error: 'Sharing not supported on this device' };
  }
};

export const validateURL = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

export const extractDomainFromURL = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
};