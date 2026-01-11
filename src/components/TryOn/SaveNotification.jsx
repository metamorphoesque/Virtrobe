// 9. src/components/TryOn/SaveNotification.jsx (NEW)
// ============================================
import React from 'react';
import { Save } from 'lucide-react';

const SaveNotification = ({ isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed top-24 right-6 z-50 bg-black text-white px-6 py-3 rounded-full shadow-2xl">
      <div className="flex items-center gap-2">
        <Save className="w-4 h-4" />
        <span className="font-medium text-sm">Saved to Moodboard</span>
      </div>
    </div>
  );
};

export default SaveNotification;
