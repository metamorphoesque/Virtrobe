import React from 'react';
import { Wind, RotateCcw, Settings } from 'lucide-react';

const PhysicsControls = ({ 
  enabled, 
  onToggle, 
  onReset,
  className = ''
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  
  return (
    <div className={`bg-white rounded-lg shadow-lg border border-black/10 ${className}`}>
      <div className="p-4">
        {/* Main Toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wind className={`w-4 h-4 ${enabled ? 'text-black' : 'text-gray-400'}`} />
            <span className="text-sm font-medium text-black">Cloth Physics</span>
          </div>
          <button
            onClick={onToggle}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              enabled 
                ? 'bg-black text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {enabled ? 'ON' : 'OFF'}
          </button>
        </div>
        
        {/* Reset Button */}
        {enabled && (
          <button
            onClick={onReset}
            className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-medium text-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Simulation
          </button>
        )}
        
        {/* Advanced Settings Toggle */}
        {enabled && (
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full mt-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-medium text-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <Settings className="w-3 h-3" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
        )}
      </div>
      
      {/* Advanced Controls (collapsed by default) */}
      {enabled && showAdvanced && (
        <div className="border-t border-black/10 p-4 bg-gray-50">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Cloth Stiffness
              </label>
              <input 
                type="range" 
                min="50" 
                max="200" 
                defaultValue="100"
                className="w-full h-1 bg-gray-300 rounded-full appearance-none cursor-pointer accent-black"
              />
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Wind Strength
              </label>
              <input 
                type="range" 
                min="0" 
                max="5" 
                defaultValue="2"
                step="0.5"
                className="w-full h-1 bg-gray-300 rounded-full appearance-none cursor-pointer accent-black"
              />
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Gravity
              </label>
              <input 
                type="range" 
                min="5" 
                max="15" 
                defaultValue="9.82"
                step="0.5"
                className="w-full h-1 bg-gray-300 rounded-full appearance-none cursor-pointer accent-black"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhysicsControls;