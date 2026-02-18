// src/components/TryOn/ClothingSidebar.jsx
// ============================================
// CLOTHING SIDEBAR — SUPABASE TEMPLATE MODE
// ============================================

import React, { useState, useEffect } from 'react';
import { Upload, ChevronDown, RefreshCw } from 'lucide-react';
import garmentTemplateService from '../../services/garmentTemplateService';

const TYPE_META = {
  shirt:     { label: 'Shirts',     icon: '👔' },
  dress:     { label: 'Dresses',    icon: '👗' },
  pants:     { label: 'Pants',      icon: '👖' },
  jacket:    { label: 'Jackets',    icon: '🧥' },
  skirt:     { label: 'Skirts',     icon: '👘' },
  shorts:    { label: 'Shorts',     icon: '🩳' },
  accessory: { label: 'Accessories', icon: '👟' }
};

const ClothingSidebar = ({
  selectedType, onSelectType, onSelectTemplate, onImageUpload,
  isDisabled, isProcessing, selectedTemplateId
}) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedType, setExpandedType] = useState(null);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const all = await garmentTemplateService.getAll();
      const withUrls = await garmentTemplateService.resolveAllUrls(all);
      setTemplates(withUrls);
      console.log('📚 Loaded', withUrls.length, 'templates from Supabase');
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const groupedTemplates = templates.reduce((acc, t) => {
    const type = t.type || 'shirt';
    if (!acc[type]) acc[type] = [];
    acc[type].push(t);
    return acc;
  }, {});

  const handleTypeClick = (type) => {
    setExpandedType(expandedType === type ? null : type);
    onSelectType?.(type);
  };

  const handleTemplateClick = (template) => {
    if (isDisabled) return;
    onSelectTemplate?.(template.id, template.type);
  };

  return (
    <div className="w-64 bg-white border-r border-black/10 flex flex-col overflow-hidden">
      <div className="px-4 py-4 border-b border-black/10 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-black tracking-wide uppercase">Wardrobe</p>
          <p className="text-[10px] text-black/40 mt-0.5">
            {loading ? 'Loading...' : `${templates.length} templates`}
          </p>
        </div>
        <button onClick={loadTemplates} className="p-1.5 hover:bg-black/5 rounded-lg" title="Refresh">
          <RefreshCw className={`w-3.5 h-3.5 text-black/40 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isDisabled && (
        <div className="mx-3 mt-3 px-3 py-2 bg-black/5 rounded-lg">
          <p className="text-[10px] text-black/50 text-center">Select gender first</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-sm text-black/30 mb-1">No templates yet</p>
            <p className="text-[10px] text-black/20">Upload GLBs via /admin</p>
          </div>
        ) : (
          Object.entries(groupedTemplates).map(([type, typeTemplates]) => {
            const meta = TYPE_META[type] || { label: type, icon: '👔' };
            const isExpanded = expandedType === type;

            return (
              <div key={type}>
                <button
                  onClick={() => handleTypeClick(type)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors
                    ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-black/5'}
                    ${isExpanded ? 'bg-black/5' : ''}`}
                  disabled={isDisabled}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{meta.icon}</span>
                    <span className="text-xs font-semibold text-black">{meta.label}</span>
                    <span className="text-[10px] text-black/30">({typeTemplates.length})</span>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-black/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                    {typeTemplates.map((template) => {
                      const isActive = selectedTemplateId === template.id;
                      return (
                        <button
                          key={template.id}
                          onClick={() => handleTemplateClick(template)}
                          disabled={isDisabled}
                          className={`group relative rounded-lg border overflow-hidden transition-all text-left
                            ${isActive ? 'border-black shadow-sm ring-1 ring-black' : 'border-black/10 hover:border-black/40'}
                            ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <div className="aspect-[3/4] bg-gray-50 flex items-center justify-center">
                            {template.thumbnail_url ? (
                              <img src={template.thumbnail_url} alt={template.name} className="w-full h-full object-cover"
                                onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                              <div className="text-2xl opacity-20">{meta.icon}</div>
                            )}
                          </div>
                          <div className="px-2 py-1.5">
                            <p className="text-[10px] font-medium text-black leading-tight truncate">{template.name}</p>
                            {template.tags?.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {template.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="text-[8px] px-1 py-0.5 bg-black/5 rounded text-black/50">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          {isActive && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-black rounded-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-black/10 p-3">
        <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-dashed transition-all
          ${isDisabled || isProcessing ? 'border-black/10 text-black/30 cursor-not-allowed' : 'border-black/20 text-black/50 hover:border-black hover:text-black cursor-pointer'}`}>
          <Upload className="w-3 h-3" />
          <span className="text-[10px] font-medium">{isProcessing ? 'Generating...' : 'Upload custom'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} disabled={isDisabled || isProcessing} />
        </label>
        <p className="text-[9px] text-black/30 text-center mt-1.5">{isProcessing ? 'Please wait...' : 'Generate from photo'}</p>
      </div>
    </div>
  );
};

export default ClothingSidebar;