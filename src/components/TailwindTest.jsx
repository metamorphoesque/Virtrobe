import React from 'react';

// Simple test to see if Tailwind is working
function TailwindTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-8">
      <div className="max-w-2xl mx-auto bg-white/95 rounded-3xl shadow-[0_20px_60px_rgba(127,29,29,0.4)] p-12 border-4 border-amber-600/50">
        <h1 className="text-5xl font-bold text-red-950 mb-6 text-center">
          🎨 Tailwind Test
        </h1>
        
        <div className="space-y-4 text-center">
          <p className="text-xl text-stone-700">
            If you see a <strong className="text-red-900">vintage red background</strong> with this centered white card, Tailwind is working correctly.
          </p>
          
          <div className="pt-6 border-t-2 border-red-200">
            <h2 className="text-2xl font-bold text-red-950 mb-4">What You Should See:</h2>
            <ul className="text-left text-stone-700 space-y-2 text-lg">
              <li>✅ Dark red gradient background filling the screen</li>
              <li>✅ This white card centered horizontally</li>
              <li>✅ Gold/amber border around the card</li>
              <li>✅ Large shadows behind the card</li>
              <li>✅ Custom fonts (Playfair Display for headings)</li>
            </ul>
          </div>
          
          <div className="pt-6">
            <button className="px-8 py-4 bg-gradient-to-r from-amber-600 to-yellow-700 text-red-950 font-bold rounded-full shadow-[0_6px_24px_rgba(217,119,6,0.5)] hover:scale-105 hover:shadow-[0_8px_32px_rgba(217,119,6,0.6)] transition-all duration-300 text-lg">
              Hover Me - I Should Lift Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TailwindTest;