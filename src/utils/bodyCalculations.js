// Body measurement calculation utilities

export const calculateBMI = (height, weight) => {
  return weight / Math.pow(height / 100, 2);
};

export const getBodyType = (bmi) => {
  if (bmi < 18.5) return 'Petite';
  if (bmi < 25) return 'Regular';
  if (bmi < 30) return 'Curvy';
  return 'Plus';
};

export const calculateBodyMeasurements = (height, weight, gender) => {
  const bmi = calculateBMI(height, weight);
  const heightFactor = height / 170;
  const weightFactor = weight / 65;
  
  // Gender-specific body proportion adjustments
  const genderFactors = gender === 'male' 
    ? { 
        shoulder: 1.15, 
        bust: 0.95, 
        waist: 1.05, 
        hip: 0.92,
        baseHeight: 175,
        baseWeight: 70
      }
    : { 
        shoulder: 1.0, 
        bust: 1.0, 
        waist: 1.0, 
        hip: 1.0,
        baseHeight: 165,
        baseWeight: 55
      };
  
  return {
    height_cm: height,
    weight_kg: weight,
    gender: gender,
    bmi: bmi.toFixed(1),
    body_type: getBodyType(bmi),
    shoulder_width_cm: Math.round(
      (36 + (heightFactor * 4) + (weightFactor * 2)) * genderFactors.shoulder
    ),
    bust_cm: Math.round(
      (80 + (weightFactor * 8) + (heightFactor * 3)) * genderFactors.bust
    ),
    waist_cm: Math.round(
      (60 + (weightFactor * 10) + (heightFactor * 2)) * genderFactors.waist
    ),
    hips_cm: Math.round(
      (85 + (weightFactor * 9) + (heightFactor * 3)) * genderFactors.hip
    ),
    arm_length_cm: Math.round(55 + (heightFactor * 5)),
    torso_length_cm: Math.round(45 + (heightFactor * 3)),
    inseam_cm: Math.round(height * 0.47),
    posture: 'Neutral'
  };
};

export const getScaleFactors = (measurements, gender) => {
  const baseValues = gender === 'male'
    ? { height: 175, bust: 95, waist: 80, hip: 95 }
    : { height: 165, bust: 85, waist: 65, hip: 90 };
  
  return {
    height: measurements.height_cm / baseValues.height,
    bust: measurements.bust_cm / baseValues.bust,
    waist: measurements.waist_cm / baseValues.waist,
    hip: measurements.hips_cm / baseValues.hip
  };
};

export const validateMeasurements = (measurements) => {
  const errors = [];
  
  if (measurements.height_cm < 140 || measurements.height_cm > 220) {
    errors.push('Height must be between 140-220 cm');
  }
  
  if (measurements.weight_kg < 40 || measurements.weight_kg > 200) {
    errors.push('Weight must be between 40-200 kg');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};