import { useState, useMemo } from 'react';
import { 
  calculateGarmentFit, 
  getFabricByGarmentType, 
  getGarmentColor,
  garmentTypes 
} from '../utils/garmentAnalysis';

export const useGarmentFit = (bodyMeasurements) => {
  const [selectedGarment, setSelectedGarment] = useState(garmentTypes.JACKET);
  const [customColor, setCustomColor] = useState(null);
  const [customFabric, setCustomFabric] = useState(null);
  
  const fitAnalysis = useMemo(() => {
    return calculateGarmentFit(bodyMeasurements, selectedGarment);
  }, [bodyMeasurements, selectedGarment]);
  
  const fabricProperties = useMemo(() => {
    return customFabric || getFabricByGarmentType(selectedGarment);
  }, [selectedGarment, customFabric]);
  
  const garmentColor = useMemo(() => {
    return customColor || getGarmentColor(selectedGarment);
  }, [selectedGarment, customColor]);
  
  const fitQuality = useMemo(() => {
    const { bust_cm, waist_cm, hips_cm } = bodyMeasurements;
    const { ease } = fitAnalysis;
    
    let score = 100;
    
    if (ease.fit_type === 'fitted' && bodyMeasurements.bmi > 25) {
      score -= 10;
    }
    
    if (ease.fit_type === 'loose' && bodyMeasurements.bmi < 20) {
      score -= 5;
    }
    
    const proportionRatio = waist_cm / hips_cm;
    if (proportionRatio < 0.65 || proportionRatio > 0.85) {
      score -= 5;
    }
    
    return {
      score: Math.max(0, score),
      rating: score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Fair' : 'Poor',
      confidence: score >= 80
    };
  }, [bodyMeasurements, fitAnalysis]);
  
  const recommendations = useMemo(() => {
    const recs = [];
    
    if (fitQuality.score < 75) {
      if (bodyMeasurements.bmi < 18.5) {
        recs.push('Consider a more fitted style for better proportions');
      } else if (bodyMeasurements.bmi > 28) {
        recs.push('A relaxed fit may provide more comfort');
      }
    }
    
    if (selectedGarment === garmentTypes.JACKET) {
      recs.push('Ensure shoulder seams align with your natural shoulder line');
    }
    
    if (selectedGarment === garmentTypes.DRESS) {
      recs.push('Check that the waistline hits at your natural waist');
    }
    
    return recs;
  }, [fitQuality, bodyMeasurements, selectedGarment]);
  
  const changeGarment = (garmentType) => {
    setSelectedGarment(garmentType);
    setCustomColor(null);
    setCustomFabric(null);
  };
  
  const updateColor = (color) => {
    setCustomColor(color);
  };
  
  const updateFabric = (fabric) => {
    setCustomFabric(fabric);
  };
  
  const resetCustomizations = () => {
    setCustomColor(null);
    setCustomFabric(null);
  };
  
  return {
    selectedGarment,
    fitAnalysis,
    fabricProperties,
    garmentColor,
    fitQuality,
    recommendations,
    changeGarment,
    updateColor,
    updateFabric,
    resetCustomizations,
    hasCustomizations: customColor !== null || customFabric !== null
  };
};