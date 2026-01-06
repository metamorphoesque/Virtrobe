import { useState } from 'react';

export const useMoodboard = () => {
  const [savedOutfits, setSavedOutfits] = useState([]);

  const saveOutfit = (outfit) => {
    setSavedOutfits((prev) => [...prev, outfit]);
  };

  const removeOutfit = (id) => {
    setSavedOutfits((prev) => prev.filter(o => o.id !== id));
  };

  return {
    savedOutfits,
    saveOutfit,
    removeOutfit
  };
};
