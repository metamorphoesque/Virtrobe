// --- constants ---
export const garmentTypes = {
  TOP: 'top',
  DRESS: 'dress',
  JACKET: 'jacket',
  PANTS: 'pants'
};

// --- deterministic helpers (TEMP) ---
export const getFabricByGarmentType = (type) => {
  const map = {
    top: { stretch: 'medium', weight: 'light' },
    dress: { stretch: 'low', weight: 'medium' },
    jacket: { stretch: 'low', weight: 'heavy' },
    pants: { stretch: 'medium', weight: 'medium' }
  };
  return map[type] || map.top;
};

export const getGarmentColor = () => {
  return '#000000'; // placeholder
};

// --- existing logic ---
export const calculateGarmentFit = (bodyMeasurements, garmentType) => {
  return {
    ease: {
      fit_type: 'regular'
    }
  };
};

// --- future AI hooks (unchanged) ---
export const analyzeGarmentFromImage = async (imageData) => {
  return null;
};

export const analyzeGarmentFromURL = async (url) => {
  return null;
};
