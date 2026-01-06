import React, { useState } from 'react';
import { User } from 'lucide-react';


const WelcomePage = ({ onComplete }) => {
  const [gender, setGender] = useState(null);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-atelier-cream via-atelier-beige to-atelier-parchment flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="w-28 h-28 bg-gradient-to-br from-atelier-espresso-light to-atelier-espresso rounded-full mx-auto mb-8 flex items-center justify-center shadow-strong">
            <User className="w-14 h-14 text-atelier-cream" />
          </div>
          
          <h1 className="text-5xl font-display font-semibold text-atelier-espresso mb-4 tracking-tight">
            Welcome to Silouvera
          </h1>
          
          <p className="text-lg text-atelier-espresso-light font-body max-w-md mx-auto leading-relaxed">
            Your personal virtual atelier. Where precision meets elegance, 
            and every silhouette is uniquely yours.
          </p>
        </div>
        
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-editorial p-10 border-2 border-atelier-stone/20 animate-scale-in">
          <div className="mb-8">
            <p className="text-caption text-center mb-6">Select Your Form</p>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Female Option */}
              <button
                onClick={() => setGender('female')}
                className={`
                  group relative p-10 rounded-3xl border-3 transition-all duration-500
                  ${gender === 'female'
                    ? 'border-atelier-espresso bg-gradient-to-br from-atelier-beige to-atelier-parchment shadow-strong scale-105'
                    : 'border-atelier-stone/30 hover:border-atelier-espresso-light bg-atelier-cream hover:bg-atelier-beige hover:scale-102 shadow-soft'
                  }
                `}
              >
                {/* Icon */}
                <div className={`
                  text-7xl mb-4 transition-transform duration-300
                  ${gender === 'female' ? 'scale-110' : 'group-hover:scale-105'}
                `}>
                  👩
                </div>
                
                {/* Label */}
                <div className="font-display text-2xl text-atelier-espresso font-semibold mb-2">
                  Feminine
                </div>
                <div className="text-sm text-atelier-stone-dark font-body">
                  Refined proportions
                </div>
                
                {/* Selection Indicator */}
                {gender === 'female' && (
                  <div className="absolute top-4 right-4 w-8 h-8 bg-atelier-espresso rounded-full flex items-center justify-center shadow-soft animate-scale-in">
                    <div className="w-3 h-3 bg-atelier-cream rounded-full"></div>
                  </div>
                )}
              </button>
              
              {/* Male Option */}
              <button
                onClick={() => setGender('male')}
                className={`
                  group relative p-10 rounded-3xl border-3 transition-all duration-500
                  ${gender === 'male'
                    ? 'border-atelier-espresso bg-gradient-to-br from-atelier-beige to-atelier-parchment shadow-strong scale-105'
                    : 'border-atelier-stone/30 hover:border-atelier-espresso-light bg-atelier-cream hover:bg-atelier-beige hover:scale-102 shadow-soft'
                  }
                `}
              >
                {/* Icon */}
                <div className={`
                  text-7xl mb-4 transition-transform duration-300
                  ${gender === 'male' ? 'scale-110' : 'group-hover:scale-105'}
                `}>
                  👨
                </div>
                
                {/* Label */}
                <div className="font-display text-2xl text-atelier-espresso font-semibold mb-2">
                  Masculine
                </div>
                <div className="text-sm text-atelier-stone-dark font-body">
                  Structured form
                </div>
                
                {/* Selection Indicator */}
                {gender === 'male' && (
                  <div className="absolute top-4 right-4 w-8 h-8 bg-atelier-espresso rounded-full flex items-center justify-center shadow-soft animate-scale-in">
                    <div className="w-3 h-3 bg-atelier-cream rounded-full"></div>
                  </div>
                )}
              </button>
            </div>
          </div>
          
          {/* Continue Button */}
          <button
            onClick={() => gender && onComplete(gender)}
            disabled={!gender}
            className={`
              w-full py-5 rounded-full font-body font-semibold text-lg 
              transition-all duration-300 btn-hover-lift
              ${gender
                ? 'bg-gradient-to-r from-atelier-espresso-light to-atelier-espresso text-atelier-cream shadow-editorial'
                : 'bg-atelier-stone/30 text-atelier-stone-dark cursor-not-allowed'
              }
            `}
          >
            {gender ? 'Enter Your Atelier' : 'Please Select Form'}
          </button>
        </div>
        
        {/* Footer Note */}
        <p className="text-center text-sm text-atelier-stone-dark font-body mt-6 italic">
          Your measurements remain private and are stored locally on your device
        </p>
      </div>
    </div>
  );
};

export default WelcomePage;