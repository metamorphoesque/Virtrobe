// 3. src/hooks/useUnitConversion.js (NEW)
// ============================================
import { useState } from 'react';

export const useUnitConversion = () => {
  const [heightUnit, setHeightUnit] = useState('cm');
  const [weightUnit, setWeightUnit] = useState('kg');
  
  const convertHeight = (heightCm) => {
    if (heightUnit === 'ft') {
      return (heightCm / 30.48).toFixed(1);
    }
    return heightCm;
  };
  
  const convertWeight = (weightKg) => {
    if (weightUnit === 'lbs') {
      return (weightKg * 2.20462).toFixed(1);
    }
    return weightKg;
  };
  
  const toggleHeightUnit = () => {
    setHeightUnit(prev => prev === 'cm' ? 'ft' : 'cm');
  };
  
  const toggleWeightUnit = () => {
    setWeightUnit(prev => prev === 'kg' ? 'lbs' : 'kg');
  };
  
  return {
    heightUnit,
    weightUnit,
    convertHeight,
    convertWeight,
    toggleHeightUnit,
    toggleWeightUnit
  };
};