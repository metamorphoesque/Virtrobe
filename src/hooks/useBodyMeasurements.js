//1. src/hooks/useBodyMeasurements.js (UPDATED)
// ============================================
import { useState, useEffect } from 'react';

export const useBodyMeasurements = (initialGender = null) => {
  const [gender, setGender] = useState(initialGender);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(65);
  const [autoCalculate, setAutoCalculate] = useState(true);
  
  // Manual measurements
  const [shoulders, setShoulders] = useState(40);
  const [bust, setBust] = useState(90);
  const [waist, setWaist] = useState(70);
  const [hips, setHips] = useState(95);
  
  const calculateBMI = () => {
    const heightM = height / 100;
    return (weight / (heightM * heightM)).toFixed(1);
  };
  
  const bmi = calculateBMI();
  
  // Auto-calculate measurements based on BMI
  useEffect(() => {
    if (!autoCalculate || !gender) return;
    
    const bmiValue = parseFloat(bmi);
    const frameFactor = Math.max(0, Math.min(1, (height - 150) / 50));
    
    if (gender === 'female') {
      const baseShoulders = 38;
      const shouldersCalc = baseShoulders + (frameFactor * 7);
      let bustCalc, waistCalc, hipsCalc;
      
      if (bmiValue < 18.5) {
        bustCalc = 78 + (frameFactor * 6);
        waistCalc = 61 + (frameFactor * 5);
        hipsCalc = 82 + (frameFactor * 6);
      } else if (bmiValue < 20) {
        bustCalc = 82 + (frameFactor * 7) + ((bmiValue - 18.5) * 2);
        waistCalc = 64 + (frameFactor * 6) + ((bmiValue - 18.5) * 1.5);
        hipsCalc = 86 + (frameFactor * 7) + ((bmiValue - 18.5) * 2);
      } else if (bmiValue < 23) {
        bustCalc = 86 + (frameFactor * 8) + ((bmiValue - 20) * 2);
        waistCalc = 68 + (frameFactor * 7) + ((bmiValue - 20) * 1.5);
        hipsCalc = 90 + (frameFactor * 8) + ((bmiValue - 20) * 2.5);
      } else if (bmiValue < 25) {
        bustCalc = 92 + (frameFactor * 9) + ((bmiValue - 23) * 2);
        waistCalc = 72 + (frameFactor * 8) + ((bmiValue - 23) * 2);
        hipsCalc = 97 + (frameFactor * 9) + ((bmiValue - 23) * 2.5);
      } else if (bmiValue < 27) {
        bustCalc = 96 + (frameFactor * 10) + ((bmiValue - 25) * 2.5);
        waistCalc = 77 + (frameFactor * 9) + ((bmiValue - 25) * 3);
        hipsCalc = 102 + (frameFactor * 10) + ((bmiValue - 25) * 2.5);
      } else if (bmiValue < 30) {
        bustCalc = 101 + (frameFactor * 11) + ((bmiValue - 27) * 2.5);
        waistCalc = 83 + (frameFactor * 10) + ((bmiValue - 27) * 3);
        hipsCalc = 108 + (frameFactor * 11) + ((bmiValue - 27) * 2.5);
      } else {
        bustCalc = 108 + (frameFactor * 12) + ((bmiValue - 30) * 2);
        waistCalc = 92 + (frameFactor * 12) + ((bmiValue - 30) * 3);
        hipsCalc = 115 + (frameFactor * 13) + ((bmiValue - 30) * 2);
      }
      
      setShoulders(Math.round(shouldersCalc));
      setBust(Math.round(bustCalc));
      setWaist(Math.round(waistCalc));
      setHips(Math.round(hipsCalc));
    } else {
      const baseShoulders = 44;
      const shouldersCalc = baseShoulders + (frameFactor * 8);
      let bustCalc, waistCalc, hipsCalc;
      
      if (bmiValue < 18.5) {
        bustCalc = 85 + (frameFactor * 8);
        waistCalc = 70 + (frameFactor * 7);
        hipsCalc = 85 + (frameFactor * 6);
      } else if (bmiValue < 20) {
        bustCalc = 89 + (frameFactor * 9) + ((bmiValue - 18.5) * 2);
        waistCalc = 74 + (frameFactor * 8) + ((bmiValue - 18.5) * 1.5);
        hipsCalc = 88 + (frameFactor * 7) + ((bmiValue - 18.5) * 1.2);
      } else if (bmiValue < 23) {
        bustCalc = 93 + (frameFactor * 10) + ((bmiValue - 20) * 2.5);
        waistCalc = 77 + (frameFactor * 9) + ((bmiValue - 20) * 2);
        hipsCalc = 91 + (frameFactor * 8) + ((bmiValue - 20) * 1.5);
      } else if (bmiValue < 25) {
        bustCalc = 98 + (frameFactor * 11) + ((bmiValue - 23) * 2.5);
        waistCalc = 81 + (frameFactor * 10) + ((bmiValue - 23) * 2.5);
        hipsCalc = 94 + (frameFactor * 9) + ((bmiValue - 23) * 1.5);
      } else if (bmiValue < 27) {
        bustCalc = 103 + (frameFactor * 12) + ((bmiValue - 25) * 3);
        waistCalc = 86 + (frameFactor * 11) + ((bmiValue - 25) * 3.5);
        hipsCalc = 97 + (frameFactor * 10) + ((bmiValue - 25) * 2);
      } else if (bmiValue < 30) {
        bustCalc = 109 + (frameFactor * 13) + ((bmiValue - 27) * 3);
        waistCalc = 93 + (frameFactor * 12) + ((bmiValue - 27) * 4);
        hipsCalc = 101 + (frameFactor * 11) + ((bmiValue - 27) * 2);
      } else {
        bustCalc = 115 + (frameFactor * 14) + ((bmiValue - 30) * 2.5);
        waistCalc = 105 + (frameFactor * 14) + ((bmiValue - 30) * 4);
        hipsCalc = 107 + (frameFactor * 12) + ((bmiValue - 30) * 1.8);
      }
      
      setShoulders(Math.round(shouldersCalc));
      setBust(Math.round(bustCalc));
      setWaist(Math.round(waistCalc));
      setHips(Math.round(hipsCalc));
    }
  }, [height, weight, bmi, gender, autoCalculate]);
  
  const getBodyType = () => {
    const bustWaistDiff = bust - waist;
    const hipWaistDiff = hips - waist;
    const bustHipDiff = Math.abs(bust - hips);
    
    if (bustHipDiff <= 3 && bustWaistDiff >= 12 && hipWaistDiff >= 12) return 'Hourglass';
    if (bust > hips + 4 && bustWaistDiff >= 8) return 'Triangle';
    if (hips > bust + 4 && hipWaistDiff >= 8) return 'Pear';
    if (bustWaistDiff < 8 && hipWaistDiff < 8) return 'Rectangle';
    return 'Athletic';
  };
  
  const measurements = {
    gender: gender || 'female',
    height_cm: height,
    weight_kg: weight,
    bmi: parseFloat(bmi),
    bust_cm: bust,
    waist_cm: waist,
    hips_cm: hips,
    shoulder_width_cm: shoulders
  };
  
  const updateManual = (type, value) => {
    switch(type) {
      case 'shoulders': setShoulders(value); break;
      case 'bust': setBust(value); break;
      case 'waist': setWaist(value); break;
      case 'hips': setHips(value); break;
    }
  };
  
  return {
    gender,
    setGender,
    height,
    setHeight,
    weight,
    setWeight,
    shoulders,
    bust,
    waist,
    hips,
    autoCalculate,
    setAutoCalculate,
    bmi,
    measurements,
    getBodyType,
    updateManual
  };
};