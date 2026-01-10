import React from 'react';

const HybridGarment = ({ garmentData }) => {
  if (!garmentData || !garmentData.mesh) {
    return null;
  }

  return (
    <primitive 
      object={garmentData.mesh} 
      position={garmentData.mesh.position}
      rotation={[0, 0, 0]}
    />
  );
};

export default HybridGarment;