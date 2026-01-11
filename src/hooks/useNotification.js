// 4. src/hooks/useNotification.js (NEW)
// ============================================
import { useState } from 'react';

export const useNotification = (duration = 3000) => {
  const [isVisible, setIsVisible] = useState(false);
  
  const show = () => {
    setIsVisible(true);
    setTimeout(() => setIsVisible(false), duration);
  };
  
  return {
    isVisible,
    show
  };
};