// src/hooks/useBodyMeasurements.js
import { useState, useEffect } from 'react';

export const useBodyMeasurements = (gender = 'female') => {
  // Primary measurements (user inputs)
  const [height, setHeight] = useState(170); // cm
  const [weight, setWeight] = useState(65); // kg
  
  // Optional manual measurements (can be user-defined)
  const [shoulders, setShoulders] = useState(null);
  const [bust, setBust] = useState(null);
  const [waist, setWaist] = useState(null);
  const [hips, setHips] = useState(null);
  
  // Calculated measurements object
  const [measurements, setMeasurements] = useState({});
  
  // Calculate body measurements based on height and weight
  useEffect(() => {
    calculateMeasurements();
  }, [height, weight, shoulders, bust, waist, hips, gender]);
  
  const calculateMeasurements = () => {
    // BMI calculation
    const heightInMeters = height / 100;
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
    
    // Estimate body measurements based on height and weight
    // These formulas are approximations based on anthropometric data
    
    // For females (default formulas)
    let estimatedShoulders, estimatedBust, estimatedWaist, estimatedHips;
    
    if (gender === 'female') {
      // Female body proportions
      estimatedShoulders = (height * 0.23).toFixed(1); // ~23% of height
      estimatedBust = (height * 0.49 + weight * 0.25).toFixed(1); // Influenced by both
      estimatedWaist = (height * 0.38 + weight * 0.15).toFixed(1);
      estimatedHips = (height * 0.53 + weight * 0.28).toFixed(1);
    } else {
      // Male body proportions (broader shoulders, narrower hips)
      estimatedShoulders = (height * 0.26).toFixed(1);
      estimatedBust = (height * 0.52 + weight * 0.3).toFixed(1);
      estimatedWaist = (height * 0.44 + weight * 0.18).toFixed(1);
      estimatedHips = (height * 0.49 + weight * 0.22).toFixed(1);
    }
    
    // Body type classification
    const bustWaistDiff = parseFloat(estimatedBust) - parseFloat(estimatedWaist);
    const hipWaistDiff = parseFloat(estimatedHips) - parseFloat(estimatedWaist);
    
    let bodyType = 'Rectangle';
    if (Math.abs(parseFloat(estimatedBust) - parseFloat(estimatedHips)) <= 5 && bustWaistDiff > 10) {
      bodyType = 'Hourglass';
    } else if (parseFloat(estimatedBust) > parseFloat(estimatedHips) + 5) {
      bodyType = 'Triangle';
    } else if (parseFloat(estimatedHips) > parseFloat(estimatedBust) + 5) {
      bodyType = 'Pear';
    } else if (bustWaistDiff < 10 && hipWaistDiff < 10) {
      bodyType = 'Rectangle';
    }
    
    // Use manual inputs if provided, otherwise use calculated
    setMeasurements({
      gender,
      height_cm: height,
      weight_kg: weight,
      shoulder_width_cm: shoulders || parseFloat(estimatedShoulders),
      bust_cm: bust || parseFloat(estimatedBust),
      waist_cm: waist || parseFloat(estimatedWaist),
      hips_cm: hips || parseFloat(estimatedHips),
      bmi: parseFloat(bmi),
      body_type: bodyType
    });
  };
  
  // Update functions
  const updateHeight = (newHeight) => {
    setHeight(newHeight);
  };
  
  const updateWeight = (newWeight) => {
    setWeight(newWeight);
  };
  
  const updateShoulders = (value) => {
    setShoulders(value);
  };
  
  const updateBust = (value) => {
    setBust(value);
  };
  
  const updateWaist = (value) => {
    setWaist(value);
  };
  
  const updateHips = (value) => {
    setHips(value);
  };
  
  // Reset to calculated values
  const resetToCalculated = () => {
    setShoulders(null);
    setBust(null);
    setWaist(null);
    setHips(null);
  };
  
  return {
    measurements,
    height,
    weight,
    shoulders,
    bust,
    waist,
    hips,
    updateHeight,
    updateWeight,
    updateShoulders,
    updateBust,
    updateWaist,
    updateHips,
    resetToCalculated
  };
};