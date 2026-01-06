import React, { useState } from 'react';
import { Camera, Upload, Link as LinkIcon, Search, X, Sparkles, ImageIcon } from 'lucide-react';
import { validateImageFile, readFileAsDataURL, validateURL } from '../../utils/fileHandlers';

const SearchPage = ({ onSearch }) => {
  const [searchMethod, setSearchMethod] = useState('link');
  const [linkUrl, setLinkUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    setError('');
    
    if (file) {
      const validation = validateImageFile(file);
      
      if (!validation.isValid) {
        setError(validation.errors[0]);
        return;
      }
      
      try {
        const dataURL = await readFileAsDataURL(file);
        setUploadedImage(dataURL);
      } catch (err) {
        setError('Failed to load image');
      }
    }
  };
  
  const handleSearch = async () => {
    setError('');
    setIsAnalyzing(true);
    
    try {
      if (searchMethod === 'link') {
        if (!validateURL(linkUrl)) {
          setError('Please enter a valid URL');
          setIsAnalyzing(false);
          return;
        }
        await onSearch({ type: 'link', data: linkUrl });
      } else if (uploadedImage) {
        await onSearch({ type: 'image', data: uploadedImage });
      }
    } catch (err) {
      setError('Failed to analyze garment');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-atelier-cream via-atelier-beige to-atelier-parchment">
      <div className="max-w-4xl mx-auto px-6 py-12">
        
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-atelier-bronze to-atelier-copper rounded-full mb-6 shadow-editorial">
            <ImageIcon className="w-10 h-10 text-atelier-cream" />
          </div>
          <h1 className="text-5xl font-display font-semibold text-atelier-espresso mb-4 tracking-tighter">
            Find Your Perfect Outfit
          </h1>
          <p className="text-lg text-atelier-stone-dark font-body max-w-2xl mx-auto leading-relaxed">
            Upload an image or paste a product link to begin your virtual try-on experience
          </p>
        </div>
        
        {/* Main Card */}
        <div className="bg-white rounded-4xl shadow-strong p-8 border-2 border-atelier-stone/20 animate-scale-in">
          
          {/* Method Toggle */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => {
                setSearchMethod('link');
                setError('');
              }}
              className={`group relative py-6 rounded-3xl font-body font-semibold text-lg transition-all duration-500 overflow-hidden ${
                searchMethod === 'link'
                  ? 'bg-gradient-to-br from-atelier-espresso-light to-atelier-espresso text-atelier-cream shadow-editorial scale-105'
                  : 'bg-atelier-beige text-atelier-stone-darker hover:bg-atelier-parchment hover:scale-102 shadow-soft'
              }`}
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                <LinkIcon className="w-6 h-6" />
                <span>Paste Link</span>
              </div>
              {searchMethod === 'link' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-slide-in-right" />
              )}
            </button>
            
            <button
              onClick={() => {
                setSearchMethod('upload');
                setError('');
              }}
              className={`group relative py-6 rounded-3xl font-body font-semibold text-lg transition-all duration-500 overflow-hidden ${
                searchMethod === 'upload'
                  ? 'bg-gradient-to-br from-atelier-espresso-light to-atelier-espresso text-atelier-cream shadow-editorial scale-105'
                  : 'bg-atelier-beige text-atelier-stone-darker hover:bg-atelier-parchment hover:scale-102 shadow-soft'
              }`}
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                <Upload className="w-6 h-6" />
                <span>Upload Image</span>
              </div>
              {searchMethod === 'upload' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-slide-in-right" />
              )}
            </button>
          </div>
          
          {/* Link Input */}
          {searchMethod === 'link' && (
            <div className="space-y-4 animate-fade-in">
              <label className="block text-caption mb-3">
                Product URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => {
                    setLinkUrl(e.target.value);
                    setError('');
                  }}
                  placeholder="https://example.com/product..."
                  className="w-full px-6 py-5 border-2 border-atelier-stone/30 rounded-3xl focus:ring-4 focus:ring-atelier-espresso-lighter/20 focus:border-atelier-espresso-light transition-all duration-300 bg-atelier-cream text-atelier-espresso font-body placeholder:text-atelier-stone placeholder:italic shadow-inner-soft"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-atelier-stone">
                  <LinkIcon className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}
          
          {/* Image Upload */}
          {searchMethod === 'upload' && (
            <div className="animate-fade-in">
              <label className="block text-caption mb-4">
                Upload Garment Image
              </label>
              <div className={`relative border-3 border-dashed rounded-4xl p-12 text-center transition-all duration-500 ${
                uploadedImage 
                  ? 'border-atelier-espresso-light bg-gradient-to-br from-atelier-beige to-atelier-parchment shadow-editorial' 
                  : 'border-atelier-stone/40 hover:border-atelier-espresso-lighter bg-white hover:bg-atelier-cream shadow-soft hover:shadow-editorial'
              }`}>
                {uploadedImage ? (
                  <div className="relative animate-scale-in">
                    <img 
                      src={uploadedImage} 
                      alt="Uploaded" 
                      className="max-h-96 mx-auto rounded-3xl shadow-strong border-2 border-atelier-stone/20" 
                    />
                    <button
                      onClick={() => {
                        setUploadedImage(null);
                        setError('');
                      }}
                      className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-atelier-espresso-light to-atelier-espresso rounded-full flex items-center justify-center hover:from-atelier-espresso hover:to-atelier-espresso transition-all duration-300 shadow-strong hover:scale-110 btn-hover-lift"
                    >
                      <X className="w-6 h-6 text-atelier-cream" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <div className="w-24 h-24 bg-gradient-to-br from-atelier-bronze to-atelier-copper rounded-full mx-auto mb-6 flex items-center justify-center shadow-editorial hover:shadow-strong transition-all duration-300 hover:scale-110">
                      <Camera className="w-12 h-12 text-atelier-cream" />
                    </div>
                    <p className="text-atelier-espresso font-body font-semibold mb-3 text-lg">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-atelier-stone-dark font-body">
                      PNG, JPG or WebP (max 10MB)
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="mt-6 p-5 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-3xl animate-shake">
              <p className="text-red-800 text-sm font-body font-semibold flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                {error}
              </p>
            </div>
          )}
          
          {/* Analyze Button */}
          <button
            onClick={handleSearch}
            disabled={(!linkUrl && !uploadedImage) || isAnalyzing}
            className={`w-full mt-8 py-6 rounded-full font-display font-bold text-xl transition-all duration-500 flex items-center justify-center gap-3 ${
              (linkUrl || uploadedImage) && !isAnalyzing
                ? 'bg-gradient-to-r from-atelier-espresso-light to-atelier-espresso text-atelier-cream hover:from-atelier-espresso hover:to-atelier-espresso shadow-editorial hover:shadow-strong btn-hover-lift'
                : 'bg-atelier-stone/30 text-atelier-stone-dark cursor-not-allowed'
            }`}
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-atelier-cream"></div>
                <span>Analyzing Garment...</span>
              </>
            ) : (
              <>
                <Search className="w-6 h-6" />
                <span>Analyze & Try On</span>
              </>
            )}
          </button>
        </div>
        
        {/* Info Section */}
        <div className="mt-12 bg-white rounded-4xl shadow-editorial p-8 border-2 border-atelier-stone/20 animate-fade-in">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-200 to-amber-300 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-soft">
              <Sparkles className="w-7 h-7 text-amber-900" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-semibold text-atelier-espresso mb-2 tracking-tight">
                How it works
              </h3>
              <p className="text-atelier-stone-dark font-body leading-relaxed">
                Experience the future of fashion with our intelligent virtual try-on system
              </p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="p-6 bg-gradient-to-br from-atelier-beige to-atelier-parchment rounded-3xl border border-atelier-stone/20 hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-atelier-bronze to-atelier-copper rounded-2xl flex items-center justify-center mb-4 shadow-soft">
                <LinkIcon className="w-6 h-6 text-atelier-cream" />
              </div>
              <div className="font-body font-semibold text-atelier-espresso mb-2">Paste Product Links</div>
              <div className="text-sm text-atelier-stone-dark font-body leading-relaxed">
                Copy any fashion product URL from your favorite online stores
              </div>
            </div>
            
            <div className="p-6 bg-gradient-to-br from-atelier-beige to-atelier-parchment rounded-3xl border border-atelier-stone/20 hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-atelier-bronze to-atelier-copper rounded-2xl flex items-center justify-center mb-4 shadow-soft">
                <Camera className="w-6 h-6 text-atelier-cream" />
              </div>
              <div className="font-body font-semibold text-atelier-espresso mb-2">Upload Photos</div>
              <div className="text-sm text-atelier-stone-dark font-body leading-relaxed">
                Take a picture of any garment you'd like to try on virtually
              </div>
            </div>
            
            <div className="p-6 bg-gradient-to-br from-atelier-beige to-atelier-parchment rounded-3xl border border-atelier-stone/20 hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-atelier-bronze to-atelier-copper rounded-2xl flex items-center justify-center mb-4 shadow-soft">
                <Sparkles className="w-6 h-6 text-atelier-cream" />
              </div>
              <div className="font-body font-semibold text-atelier-espresso mb-2">AI Analysis</div>
              <div className="text-sm text-atelier-stone-dark font-body leading-relaxed">
                Our system analyzes fit, drape, and proportions in real-time
              </div>
            </div>
            
            <div className="p-6 bg-gradient-to-br from-atelier-beige to-atelier-parchment rounded-3xl border border-atelier-stone/20 hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-atelier-bronze to-atelier-copper rounded-2xl flex items-center justify-center mb-4 shadow-soft">
                <ImageIcon className="w-6 h-6 text-atelier-cream" />
              </div>
              <div className="font-body font-semibold text-atelier-espresso mb-2">Instant Preview</div>
              <div className="text-sm text-atelier-stone-dark font-body leading-relaxed">
                See realistic visualization on your personalized mannequin
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default SearchPage;