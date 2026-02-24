// src/components/TryOn/MeasurementPanel.jsx
import React from 'react';
import { Lock, Unlock, ChevronDown, ChevronUp, Ruler } from 'lucide-react';

const MeasurementPanel = ({ bodyMeasurements = {}, unitConversion = {} }) => {
  const {
    gender = null,
    height = 170,
    setHeight = () => {},
    weight = 65,
    setWeight = () => {},
    shoulders = 40,
    bust = 90,
    waist = 70,
    hips = 95,
    autoCalculate = true,
    setAutoCalculate = () => {},
    bmi = '—',
    getBodyType = () => '—',
    updateManual = () => {},
  } = bodyMeasurements;

  const {
    heightUnit = 'cm',
    weightUnit = 'kg',
    convertHeight = (v) => v,
    convertWeight = (v) => v,
    toggleHeightUnit = () => {},
    toggleWeightUnit = () => {},
  } = unitConversion;

  // Collapsible sections
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [bmiOpen, setBmiOpen] = React.useState(false);

  return (
    <div className="w-80 bg-white border-l border-black/10 flex flex-col overflow-y-auto relative flex-shrink-0">
      {/* Locked overlay when no gender selected */}
      {!gender && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-center pointer-events-none">
          <div className="text-center px-6">
            <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-3">
              <Ruler className="w-5 h-5 text-black/30" />
            </div>
            <p className="text-xs font-medium text-black/40 leading-relaxed">
              Select your silhouette to adjust body measurements
            </p>
          </div>
        </div>
      )}

      <div className={`flex flex-col h-full ${!gender ? 'opacity-20' : 'opacity-100'} transition-opacity duration-300`}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-black/6">
          <h2 className="text-sm font-semibold text-black tracking-wide uppercase">Measurements</h2>
          <p className="text-xs text-black/40 mt-0.5 capitalize">{gender || '—'}</p>
        </div>

        {/* Height */}
        <div className="px-6 py-5 border-b border-black/6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-black/60 uppercase tracking-wide">Height</label>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-black tabular-nums">
                {heightUnit === 'cm' ? `${height} cm` : `${convertHeight(height)} ft`}
              </span>
              <button
                onClick={() => gender && toggleHeightUnit()}
                disabled={!gender}
                className="text-[10px] text-black/50 hover:text-black px-1.5 py-0.5 rounded border border-black/15 hover:border-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {heightUnit === 'cm' ? 'ft' : 'cm'}
              </button>
            </div>
          </div>
          <input
            type="range" min="140" max="200" value={height}
            onChange={(e) => gender && setHeight(Number(e.target.value))}
            disabled={!gender}
            className="w-full h-1.5 bg-black/10 rounded-full appearance-none cursor-pointer accent-black disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-[10px] text-black/25 mt-1.5">
            <span>140cm</span><span>200cm</span>
          </div>
        </div>

        {/* Weight */}
        <div className="px-6 py-5 border-b border-black/6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-black/60 uppercase tracking-wide">Weight</label>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-black tabular-nums">
                {weightUnit === 'kg' ? `${weight} kg` : `${convertWeight(weight)} lbs`}
              </span>
              <button
                onClick={() => gender && toggleWeightUnit()}
                disabled={!gender}
                className="text-[10px] text-black/50 hover:text-black px-1.5 py-0.5 rounded border border-black/15 hover:border-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {weightUnit === 'kg' ? 'lbs' : 'kg'}
              </button>
            </div>
          </div>
          <input
            type="range" min="40" max="120" value={weight}
            onChange={(e) => gender && setWeight(Number(e.target.value))}
            disabled={!gender}
            className="w-full h-1.5 bg-black/10 rounded-full appearance-none cursor-pointer accent-black disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-[10px] text-black/25 mt-1.5">
            <span>40kg</span><span>120kg</span>
          </div>
        </div>

        {/* BMI — collapsible */}
        <div className="border-b border-black/6">
          <button
            onClick={() => setBmiOpen((v) => !v)}
            disabled={!gender}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-black/[0.02] transition-colors disabled:cursor-not-allowed"
          >
            <span className="text-xs font-medium text-black/60 uppercase tracking-wide">Body Profile</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-black">{bmi}</span>
              {bmiOpen
                ? <ChevronUp className="w-3.5 h-3.5 text-black/30" />
                : <ChevronDown className="w-3.5 h-3.5 text-black/30" />
              }
            </div>
          </button>

          {bmiOpen && (
            <div className="px-6 pb-4 space-y-2">
              <div className="bg-black/[0.03] rounded-lg p-3 flex items-center justify-between">
                <span className="text-xs text-black/50">BMI</span>
                <span className="text-sm font-bold text-black">{bmi}</span>
              </div>
              <div className="bg-black/[0.03] rounded-lg p-3 flex items-center justify-between">
                <span className="text-xs text-black/50">Body Type</span>
                <span className="text-xs font-semibold text-black">{getBodyType()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Measurements — collapsible */}
        <div className="border-b border-black/6">
          <button
            onClick={() => setDetailsOpen((v) => !v)}
            disabled={!gender}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-black/[0.02] transition-colors disabled:cursor-not-allowed"
          >
            <div>
              <span className="text-xs font-medium text-black/60 uppercase tracking-wide">Detailed Measurements</span>
              <p className="text-[10px] text-black/30 mt-0.5">{autoCalculate ? 'Auto-calculated' : 'Manual'}</p>
            </div>
            {detailsOpen
              ? <ChevronUp className="w-3.5 h-3.5 text-black/30" />
              : <ChevronDown className="w-3.5 h-3.5 text-black/30" />
            }
          </button>

          {detailsOpen && (
            <div className="px-6 pb-5 space-y-1">
              {/* Auto / Manual toggle */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] text-black/40">
                  {autoCalculate ? 'Calculated from height & weight' : 'Drag to adjust manually'}
                </span>
                <button
                  onClick={() => gender && setAutoCalculate(!autoCalculate)}
                  disabled={!gender}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    autoCalculate
                      ? 'bg-white text-black border-black/20 hover:border-black'
                      : 'bg-black text-white border-black'
                  }`}
                >
                  {autoCalculate ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                  {autoCalculate ? 'Manual' : 'Auto'}
                </button>
              </div>

              {[
                { key: 'shoulders', value: shoulders, min: 30, max: 55 },
                { key: 'bust', value: bust, min: 70, max: 120 },
                { key: 'waist', value: waist, min: 55, max: 100 },
                { key: 'hips', value: hips, min: 75, max: 125 },
              ].map(({ key, value, min, max }) => (
                <div key={key} className={`py-3 transition-opacity ${autoCalculate ? 'opacity-50' : 'opacity-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-medium text-black/60 uppercase tracking-wide">{key}</label>
                    <span className="text-xs font-semibold text-black tabular-nums">{value} cm</span>
                  </div>
                  <input
                    type="range" min={min} max={max} value={value}
                    onChange={(e) => updateManual(key, Number(e.target.value))}
                    disabled={autoCalculate || !gender}
                    className="w-full h-1.5 bg-black/10 rounded-full appearance-none cursor-pointer accent-black disabled:cursor-not-allowed"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />
      </div>
    </div>
  );
};

export default MeasurementPanel;