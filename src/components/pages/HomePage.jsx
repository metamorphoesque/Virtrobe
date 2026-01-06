import React, { useState, useEffect } from 'react';
import { Camera, Bookmark, Share2 } from 'lucide-react';

const HomePage = ({ outfits, onLike }) => {
  // Carousel rotation state
  const [rotation, setRotation] = useState(0);
  
  // Extended featured moodboards (6+ templates)
  const featuredMoodboards = [
    { id: 1, title: 'Evening Chic', curator: 'StyleQueen', itemCount: 12 },
    { id: 2, title: 'Urban Edge', curator: 'TrendSetter', itemCount: 18 },
    { id: 3, title: 'Summer Breeze', curator: 'FitFashion', itemCount: 15 },
    { id: 4, title: 'Minimalist Mood', curator: 'MinimalVibes', itemCount: 10 },
    { id: 5, title: 'Bold Statement', curator: 'ColorPop', itemCount: 14 },
    { id: 6, title: 'Business Ready', curator: 'ProFashion', itemCount: 16 },
    { id: 7, title: 'Casual Comfort', curator: 'RelaxedStyle', itemCount: 11 },
    { id: 8, title: 'Vintage Revival', curator: 'ClassicStyle', itemCount: 13 },
  ];
  
  // Auto-rotate carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 45) % 360); // 360/8 cards = 45deg per rotation
    }, 3500);
    return () => clearInterval(interval);
  }, []);
  
  // Gallery items with varied aspect ratios
  const galleryItems = outfits.map((outfit, index) => ({
    ...outfit,
    aspect: index % 5 === 0 ? 'landscape' : index % 3 === 0 ? 'portrait' : 'square'
  }));
  
  // Hover state for arc display
  const [hoveredCard, setHoveredCard] = useState(null);
  
  // Arc buttons configuration
  const arcButtons = [
    { icon: Camera, label: 'Try On' },
    { icon: Bookmark, label: 'Moodboard' },
    { icon: Share2, label: 'Share' },
  ];
  
  return (
    <div className="w-full pb-20 px-4">
      
      {/* CAROUSEL-STYLE FEATURED MOODBOARDS - Smaller, Portrait Size */}
      <div className="mb-32 relative h-[450px] flex items-center justify-center">
        <div className="relative w-full max-w-5xl h-full" style={{ perspective: '1200px' }}>
          {featuredMoodboards.map((board, index) => {
            const angle = (index * 45) - rotation;
            const radius = 350;
            const x = Math.sin((angle * Math.PI) / 180) * radius;
            const z = Math.cos((angle * Math.PI) / 180) * radius;
            const scale = (z + radius) / (radius * 2) * 0.8; // Reduced scale
            
            return (
              <div
                key={board.id}
                className="absolute top-1/2 left-1/2 w-56 transition-all duration-1000 ease-out cursor-pointer"
                style={{
                  transform: `translate(-50%, -50%) translate3d(${x}px, 0, ${z}px) scale(${scale})`,
                  zIndex: Math.round(scale * 100),
                  opacity: z > -200 ? scale : 0,
                }}
              >
                {/* Stack effect - 3 layers */}
                <div className="relative">
                  {/* Bottom card */}
                  <div className="absolute inset-0 bg-white rounded-xl shadow-xl translate-y-2 opacity-30" />
                  {/* Middle card */}
                  <div className="absolute inset-0 bg-white rounded-xl shadow-xl translate-y-1 opacity-50" />
                  
                  {/* Main card - Portrait orientation */}
                  <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden hover:shadow-3xl transition-shadow duration-300">
                    {/* 3D Viewport Area - Portrait */}
                    <div className="aspect-[3/4] bg-gradient-to-br from-gray-50 to-gray-100 relative flex items-center justify-center border-b border-gray-200">
                      {/* Grid background for depth */}
                      <div className="absolute inset-0 opacity-10">
                        <div 
                          className="w-full h-full"
                          style={{
                            backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
                            backgroundSize: '15px 15px'
                          }}
                        />
                      </div>
                      
                      {/* Humanoid figure placeholder */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-black/10 mb-1.5" />
                        <div className="w-14 h-20 bg-black/10 rounded-lg mb-1.5" />
                        <div className="flex gap-1.5">
                          <div className="w-5 h-16 bg-black/10 rounded-lg" />
                          <div className="w-5 h-16 bg-black/10 rounded-lg" />
                        </div>
                      </div>
                      
                      {/* Item count badge */}
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-md">
                        <span className="text-xs font-semibold text-black">{board.itemCount}</span>
                      </div>
                    </div>
                    
                    {/* Card Info */}
                    <div className="p-4 bg-white">
                      <h3 className="text-base font-serif text-black mb-0.5 tracking-tight">{board.title}</h3>
                      <p className="text-xs text-gray-500 font-light">by {board.curator}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* MASONRY GALLERY WITH PROPER ARC DISPLAY */}
      <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
        {galleryItems.map((item) => (
          <div 
            key={item.id}
            className="break-inside-avoid relative group cursor-pointer"
            onMouseEnter={() => setHoveredCard(item.id)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            {/* Card Container */}
            <div className={`bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden ${
              item.aspect === 'landscape' ? 'aspect-[4/3]' :
              item.aspect === 'portrait' ? 'aspect-[3/4]' :
              'aspect-square'
            }`}>
              
              {/* 3D Viewport Area */}
              <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 relative flex items-center justify-center">
                {/* Grid background */}
                <div className="absolute inset-0 opacity-10">
                  <div 
                    className="w-full h-full"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)',
                      backgroundSize: '18px 18px'
                    }}
                  />
                </div>
                
                {/* Humanoid figure placeholder */}
                <div className="relative z-10 flex flex-col items-center transform group-hover:scale-105 transition-transform duration-500">
                  <div className="w-8 h-8 rounded-full bg-black/10 mb-1" />
                  <div className="w-12 h-16 bg-black/10 rounded-lg mb-1" />
                  <div className="flex gap-1">
                    <div className="w-4 h-12 bg-black/10 rounded-lg" />
                    <div className="w-4 h-12 bg-black/10 rounded-lg" />
                  </div>
                </div>
                
               {/* CENTERED RADIAL ARC MENU */}
                  {hoveredCard === item.id && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      
                      {/* ARC CONTAINER */}
                      <div className="relative w-[260px] h-[260px] pointer-events-auto">
                        
                        {/* SVG RADIAL ARC */}
                        <svg
                          viewBox="0 0 260 260"
                          className="absolute inset-0"
                        >
                          {/* Soft shadowed arc only */}
                          <path
                            d="
                              M 260 130
                              A 130 130 0 0 0 130 0
                            "
                            fill="none"
                            stroke="rgba(255,255,255,0.95)"
                            strokeWidth="56"
                            strokeLinecap="round"
                            style={{
                              filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.18))'
                            }}
                          />
                        </svg>

                        {/* BUTTONS ALONG ARC */}
                        {arcButtons.map((btn, index) => {
                          // Evenly spread buttons across arc
                          const startAngle = 20;
                          const endAngle = 70;
                          const angle =
                            startAngle +
                            (index / (arcButtons.length - 1)) *
                              (endAngle - startAngle);

                          const radius = 108;
                          const radian = (angle * Math.PI) / 180;

                          const x = radius * Math.cos(radian);
                          const y = -radius * Math.sin(radian);

                          return (
                            <button
                              key={btn.label}
                              className="
                                absolute
                                w-14 h-14
                                rounded-full
                                bg-white
                                shadow-xl
                                flex flex-col
                                items-center
                                justify-center
                                transition-all
                                duration-300
                                hover:scale-110
                                hover:shadow-2xl
                                border border-black/10
                              "
                              style={{
                                left: `calc(50% + ${x}px)`,
                                top: `calc(50% + ${y}px)`,
                                transform: 'translate(-50%, -50%)',
                                animation: 'fadeIn 0.35s ease-out forwards',
                                animationDelay: `${index * 80}ms`,
                              }}
                              title={btn.label}
                            >
                              <btn.icon className="w-5 h-5 text-black mb-0.5" />
                              <span className="text-[9px] font-medium text-gray-600 tracking-tight">
                                {btn.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Like Badge */}
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-gray-100">
                  <span className="text-xs font-semibold text-black">{item.likes}</span>
                </div>
              </div>
            </div>
            
            {/* Card Caption */}
            <div className="pt-3 px-1">
              <h4 className="text-sm font-serif text-black mb-0.5 tracking-tight">{item.title}</h4>
              <p className="text-xs text-gray-500 font-light">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Load More */}
      <div className="text-center mt-16">
        <button className="px-8 py-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-black font-medium hover:-translate-y-1 border border-gray-200 hover:border-black">
          Load More
        </button>
      </div>
      
    </div>
  );
};

export default HomePage;