import { useState, useEffect, useMemo } from 'react';
import { calculateBodyMeasurements, validateMeasurements } from '../utils/bodyCalculations';

export const useBodyMeasurements = (initialGender = 'female') => {
  const [gender, setGender] = useState(initialGender);
  const [height, setHeight] = useState(initialGender === 'male' ? 175 : 163);
  const [weight, setWeight] = useState(initialGender === 'male' ? 70 : 52);
  const [customMeasurements, setCustomMeasurements] = useState(null);
  
  const measurements = useMemo(() => {
    const calculated = calculateBodyMeasurements(height, weight, gender);
    
    if (customMeasurements) {
      return { ...calculated, ...customMeasurements };
    }
    
    return calculated;
  }, [height, weight, gender, customMeasurements]);
  
  const validation = useMemo(() => {
    return validateMeasurements(measurements);
  }, [measurements]);
  
  const updateHeight = (newHeight) => {
    setHeight(Math.max(140, Math.min(220, newHeight)));
  };
  
  const updateWeight = (newWeight) => {
    setWeight(Math.max(40, Math.min(200, newWeight)));
  };
  
  const updateGender = (newGender) => {
    setGender(newGender);
    setHeight(newGender === 'male' ? 175 : 163);
    setWeight(newGender === 'male' ? 70 : 52);
  };
  
  const updateCustomMeasurement = (key, value) => {
    setCustomMeasurements(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const resetToCalculated = () => {
    setCustomMeasurements(null);
  };
  
  useEffect(() => {
    const stored = localStorage.getItem('fitverse_body_measurements');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setGender(parsed.gender || initialGender);
        setHeight(parsed.height || height);
        setWeight(parsed.weight || weight);
        setCustomMeasurements(parsed.custom || null);
      } catch (error) {
        console.error('Failed to load stored measurements:', error);
      }
    }
  }, []);
  
  useEffect(() => {
    const toStore = {
      gender,
      height,
      weight,
      custom: customMeasurements
    };
    localStorage.setItem('fitverse_body_measurements', JSON.stringify(toStore));
  }, [gender, height, weight, customMeasurements]);
  
  return {
    measurements,
    validation,
    height,
    weight,
    gender,
    updateHeight,
    updateWeight,
    updateGender,
    updateCustomMeasurement,
    resetToCalculated,
    hasCustomMeasurements: customMeasurements !== null
  };
};