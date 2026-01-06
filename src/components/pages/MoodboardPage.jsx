import React from 'react';
import { Layout, X, Download, Share2, Sparkles, Calendar, TrendingUp, Package } from 'lucide-react';

const MoodboardPage = ({ savedOutfits, onRemove, onExport }) => {
  const handleExportAll = () => {
    const dataStr = JSON.stringify(savedOutfits, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `virtoube_moodboard_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-atelier-cream via-atelier-beige to-atelier-parchment">
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-atelier-bronze to-atelier-copper rounded-full mb-6 shadow-editorial">
            <Layout className="w-10 h-10 text-atelier-cream" />
          </div>
          <h1 className="text-5xl font-display font-semibold text-atelier-espresso mb-4 tracking-tighter">
            My Moodboard
          </h1>
          <p className="text-lg text-atelier-stone-dark font-body max-w-2xl mx-auto leading-relaxed">
            Your curated collection of virtual try-ons and style inspirations
          </p>
        </div>
        
        {savedOutfits.length === 0 ? (
          /* Empty State */
          <div className="text-center py-32 bg-white rounded-4xl border-3 border-atelier-stone/20 shadow-strong animate-scale-in">
            <div className="w-28 h-28 bg-gradient-to-br from-atelier-beige-dark to-atelier-parchment rounded-full mx-auto mb-8 flex items-center justify-center shadow-editorial">
              <Layout className="w-14 h-14 text-atelier-espresso-light" />
            </div>
            <h3 className="text-3xl font-display font-semibold text-atelier-espresso mb-4">
              Your moodboard awaits
            </h3>
            <p className="text-atelier-stone-dark font-body mb-8 text-lg max-w-md mx-auto leading-relaxed">
              Save your favorite try-ons and build a personal style collection
            </p>
            <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-br from-atelier-beige to-atelier-parchment rounded-full text-sm text-atelier-stone-darker font-body font-semibold border-2 border-atelier-stone/30 shadow-soft">
              <Sparkles className="w-5 h-5 text-atelier-bronze" />
              <span>Try on some outfits to get started</span>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-fade-in">
              <div className="bg-white rounded-4xl p-8 border-2 border-atelier-stone/20 shadow-editorial hover:shadow-strong transition-all duration-300 hover:-translate-y-2 card-hover">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-atelier-bronze to-atelier-copper rounded-3xl flex items-center justify-center shadow-soft">
                    <Package className="w-8 h-8 text-atelier-cream" />
                  </div>
                  <div>
                    <div className="text-4xl font-display font-bold text-atelier-espresso">{savedOutfits.length}</div>
                    <div className="text-sm text-atelier-stone-dark font-body font-semibold tracking-wide mt-1">
                      Saved Outfits
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-4xl p-8 border-2 border-atelier-stone/20 shadow-editorial hover:shadow-strong transition-all duration-300 hover:-translate-y-2 card-hover">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-atelier-espresso-lighter to-atelier-espresso-light rounded-3xl flex items-center justify-center shadow-soft">
                    <TrendingUp className="w-8 h-8 text-atelier-cream" />
                  </div>
                  <div>
                    <div className="text-4xl font-display font-bold text-atelier-espresso">
                      {new Set(savedOutfits.map(o => o.garmentType)).size}
                    </div>
                    <div className="text-sm text-atelier-stone-dark font-body font-semibold tracking-wide mt-1">
                      Garment Types
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-4xl p-8 border-2 border-atelier-stone/20 shadow-editorial hover:shadow-strong transition-all duration-300 hover:-translate-y-2 card-hover">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-300 to-amber-400 rounded-3xl flex items-center justify-center shadow-soft">
                    <Calendar className="w-8 h-8 text-amber-900" />
                  </div>
                  <div>
                    <div className="text-4xl font-display font-bold text-atelier-espresso">
                      {savedOutfits[0]?.date || 'N/A'}
                    </div>
                    <div className="text-sm text-atelier-stone-dark font-body font-semibold tracking-wide mt-1">
                      Latest Save
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Export Button */}
            <div className="flex justify-end mb-8 animate-fade-in">
              <button
                onClick={handleExportAll}
                className="px-8 py-4 bg-gradient-to-r from-atelier-espresso-light to-atelier-espresso text-atelier-cream rounded-full font-body font-semibold shadow-editorial hover:shadow-strong transition-all duration-300 flex items-center gap-3 btn-hover-lift"
              >
                <Download className="w-5 h-5" />
                <span>Export Collection</span>
              </button>
            </div>
            
            {/* Outfit Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {savedOutfits.map((outfit, index) => (
                <div 
                  key={outfit.id} 
                  className="bg-white rounded-4xl shadow-editorial overflow-hidden relative group border-2 border-atelier-stone/20 hover:border-atelier-espresso-lighter hover:shadow-strong transition-all duration-500 card-hover animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Delete Button */}
                  <button
                    onClick={() => onRemove(outfit.id)}
                    className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-atelier-espresso-light to-atelier-espresso rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 hover:from-atelier-espresso hover:to-atelier-espresso shadow-strong hover:scale-110 btn-hover-lift"
                  >
                    <X className="w-6 h-6 text-atelier-cream" />
                  </button>
                  
                  {/* Outfit Preview */}
                  <div className="aspect-square bg-gradient-to-br from-atelier-beige via-atelier-parchment to-atelier-beige-dark flex items-center justify-center relative overflow-hidden">
                    {/* Subtle Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 left-0 w-full h-full" 
                           style={{
                             backgroundImage: 'radial-gradient(circle, #5d4037 1px, transparent 1px)',
                             backgroundSize: '24px 24px'
                           }}
                      />
                    </div>
                    
                    {/* Emoji Display */}
                    <div className="text-8xl transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 relative z-10">
                      {outfit.emoji}
                    </div>
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-atelier-espresso/90 via-atelier-espresso/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-5">
                      <div className="flex gap-2 w-full">
                        <button className="flex-1 py-3 glass-parchment rounded-full text-atelier-espresso text-sm font-body font-semibold hover:bg-atelier-cream/80 transition-all duration-300 flex items-center justify-center gap-2 shadow-soft">
                          <Share2 className="w-4 h-4" />
                          <span>Share</span>
                        </button>
                        <button className="flex-1 py-3 glass-parchment rounded-full text-atelier-espresso text-sm font-body font-semibold hover:bg-atelier-cream/80 transition-all duration-300 flex items-center justify-center gap-2 shadow-soft">
                          <Download className="w-4 h-4" />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Outfit Info */}
                  <div className="p-6 bg-gradient-to-b from-white to-atelier-cream">
                    <h3 className="font-display font-semibold text-atelier-espresso mb-3 text-xl tracking-tight">
                      {outfit.name}
                    </h3>
                    <div className="space-y-2 text-xs text-atelier-stone-darker font-body">
                      <div className="flex justify-between items-center p-3 bg-atelier-beige rounded-2xl">
                        <span className="font-medium">Saved:</span>
                        <span className="font-bold text-atelier-espresso">{outfit.date}</span>
                      </div>
                      {outfit.garmentType && (
                        <div className="flex justify-between items-center p-3 bg-atelier-beige rounded-2xl">
                          <span className="font-medium">Type:</span>
                          <span className="font-bold capitalize text-atelier-espresso">{outfit.garmentType}</span>
                        </div>
                      )}
                      {outfit.measurements && (
                        <div className="flex justify-between items-center p-3 bg-atelier-beige rounded-2xl">
                          <span className="font-medium">Fit:</span>
                          <span className="font-bold text-atelier-espresso">{outfit.measurements.body_type}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Color Indicator */}
                    {outfit.color && (
                      <div className="mt-4 flex items-center gap-3 p-3 bg-atelier-beige rounded-2xl">
                        <span className="text-xs text-atelier-stone-darker font-body font-semibold">Color:</span>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-10 h-10 rounded-full border-3 border-atelier-stone/30 shadow-inner-soft"
                            style={{ backgroundColor: outfit.color }}
                          />
                          <span className="text-xs font-body font-semibold text-atelier-espresso capitalize">
                            {outfit.color}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        
        {/* Tips Section */}
        {savedOutfits.length > 0 && (
          <div className="mt-16 bg-white rounded-4xl shadow-editorial p-8 border-2 border-atelier-stone/20 animate-fade-in">
            <div className="flex items-start gap-5 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-200 to-amber-300 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-soft">
                <Sparkles className="w-7 h-7 text-amber-900" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-semibold text-atelier-espresso mb-3 tracking-tight">
                  Pro Tips for Your Collection
                </h3>
                <p className="text-atelier-stone-dark font-body leading-relaxed mb-4">
                  Make the most of your virtual wardrobe with these expert suggestions
                </p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 bg-gradient-to-br from-atelier-beige to-atelier-parchment rounded-3xl border border-atelier-stone/20 hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-start gap-3">
                  <span className="text-atelier-bronze font-bold text-xl">•</span>
                  <span className="text-sm text-atelier-stone-darker font-body leading-relaxed">
                    Export your moodboard regularly to create a permanent backup of your style journey
                  </span>
                </div>
              </div>
              
              <div className="p-5 bg-gradient-to-br from-atelier-beige to-atelier-parchment rounded-3xl border border-atelier-stone/20 hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-start gap-3">
                  <span className="text-atelier-bronze font-bold text-xl">•</span>
                  <span className="text-sm text-atelier-stone-darker font-body leading-relaxed">
                    Share individual outfits with friends and family for instant style feedback
                  </span>
                </div>
              </div>
              
              <div className="p-5 bg-gradient-to-br from-atelier-beige to-atelier-parchment rounded-3xl border border-atelier-stone/20 hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-start gap-3">
                  <span className="text-atelier-bronze font-bold text-xl">•</span>
                  <span className="text-sm text-atelier-stone-darker font-body leading-relaxed">
                    Compare different styles side by side to find your signature look
                  </span>
                </div>
              </div>
              
              <div className="p-5 bg-gradient-to-br from-atelier-beige to-atelier-parchment rounded-3xl border border-atelier-stone/20 hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-start gap-3">
                  <span className="text-atelier-bronze font-bold text-xl">•</span>
                  <span className="text-sm text-atelier-stone-darker font-body leading-relaxed">
                    Use your saved collections as a shopping reference for real-world purchases
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default MoodboardPage;