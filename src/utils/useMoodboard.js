import { useState, useEffect } from 'react';

export const useMoodboard = () => {
  const [savedOutfits, setSavedOutfits] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('moodboard');
    if (stored) setSavedOutfits(JSON.parse(stored));
  }, []);

  const saveOutfit = (outfit) => {
    const updated = [...savedOutfits, outfit];
    setSavedOutfits(updated);
    localStorage.setItem('moodboard', JSON.stringify(updated));
  };

  const removeOutfit = (id) => {
    const updated = savedOutfits.filter(o => o.id !== id);
    setSavedOutfits(updated);
    localStorage.setItem('moodboard', JSON.stringify(updated));
  };

  return { savedOutfits, saveOutfit, removeOutfit };
};