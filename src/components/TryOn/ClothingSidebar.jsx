// src/components/TryOn/ClothingSidebar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Camera, ChevronDown, RefreshCw, Lock } from 'lucide-react';
import garmentTemplateService from '../../services/garmentTemplateService';

// ---------------------------------------------------------------------------
// B&W SVG icons — one per garment type
// ---------------------------------------------------------------------------
const SVG_ICONS = {
  shirt: (
    <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 flex-shrink-0">
      <path d="M11 3L4 8l3 3 3-2v16h12V9l3 2 3-3-7-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11 3c0 2.761 2.239 5 5 5s5-2.239 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  dress: (
    <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 flex-shrink-0">
      <path d="M12 3h8M12 3l-5 8h4l-5 18h20L21 11h4l-5-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11 11h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  pants: (
    <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 flex-shrink-0">
      <path d="M6 4h20v5l-4 19h-4l-2-10-2 10H10L6 9V4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 9h20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  jacket: (
    <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 flex-shrink-0">
      <path d="M11 3L4 8l2 5 4-2v16h12V11l4 2 2-5-7-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11 3c1 3.5 10 3.5 10 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16 13v7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  skirt: (
    <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 flex-shrink-0">
      <path d="M9 4h14v4L5 28h22L13 8V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 8h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  shorts: (
    <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 flex-shrink-0">
      <path d="M6 4h20v4l-3 13h-5l-2-6-2 6H9L6 8V4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 8h20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  accessory: (
    <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 flex-shrink-0">
      <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M16 6v4M16 22v4M6 16h4M22 16h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
};

const FallbackIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 flex-shrink-0">
    <rect x="6" y="6" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M6 14h20" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const TYPE_LABELS = {
  shirt:     'Shirts',
  dress:     'Dresses',
  pants:     'Trousers',
  jacket:    'Jackets',
  skirt:     'Skirts',
  shorts:    'Shorts',
  accessory: 'Accessories',
};

// ---------------------------------------------------------------------------
// Template card (grid cell inside accordion)
// ---------------------------------------------------------------------------
const TemplateCard = ({ template, isActive, onClick, isDisabled, typeMeta }) => (
  <button
    onClick={() => !isDisabled && onClick(template.id, template.type)}
    disabled={isDisabled}
    className={`group relative rounded-xl border overflow-hidden text-left transition-all duration-150
      ${isActive
        ? 'border-black ring-1 ring-black shadow-sm'
        : 'border-black/8 hover:border-black/30'
      }
      ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    <div className="aspect-[3/4] bg-black/[0.03] flex items-center justify-center overflow-hidden">
      {template.thumbnail_url ? (
        <img
          src={template.thumbnail_url}
          alt={template.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        <span className="text-black/10">
          {SVG_ICONS[template.type] ?? <FallbackIcon />}
        </span>
      )}
    </div>
    <div className="px-2 py-1.5">
      <p className="text-[10px] font-medium text-black leading-tight truncate">{template.name}</p>
      {template.tags?.length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {template.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-[8px] px-1 py-0.5 bg-black/5 rounded text-black/40">{tag}</span>
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

// ---------------------------------------------------------------------------
// Accordion section per garment type
// ---------------------------------------------------------------------------
const TypeSection = ({ type, templates, selectedTemplateId, onSelectTemplate, isDisabled }) => {
  const [open, setOpen] = useState(false);
  const Icon = SVG_ICONS[type] ?? <FallbackIcon />;
  const label = TYPE_LABELS[type] ?? type;

  return (
    <div className="border-b border-black/[0.06] last:border-0">
      <button
        onClick={() => templates.length > 0 && !isDisabled && setOpen((v) => !v)}
        disabled={isDisabled || templates.length === 0}
        className={`w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors
          ${isDisabled || templates.length === 0
            ? 'opacity-30 cursor-not-allowed'
            : 'hover:bg-black/[0.025] cursor-pointer'
          }
          ${open ? 'bg-black/[0.02]' : ''}
        `}
      >
        <span className="text-black/45">{Icon}</span>
        <span className="flex-1 text-[11px] font-semibold text-black tracking-wide">{label}</span>
        <span className="text-[9px] text-black/25 tabular-nums">{templates.length}</span>
        {templates.length > 0 && (
          <ChevronDown className={`w-3 h-3 text-black/25 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 grid grid-cols-2 gap-2">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              isActive={selectedTemplateId === t.id}
              onClick={onSelectTemplate}
              isDisabled={isDisabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// "Your Collection" tab content
// ---------------------------------------------------------------------------
const YourCollection = ({ uploads, isLoggedIn, onSelectTemplate, selectedTemplateId, isDisabled, onOpenAuth }) => {
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-14 text-center">
        <div className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center mb-3">
          <Lock className="w-3.5 h-3.5 text-black/30" />
        </div>
        <p className="text-[11px] font-medium text-black/40 mb-1">Sign in to view your collection</p>
        <p className="text-[10px] text-black/25 leading-relaxed mb-5">
          Upload and save your own garments to try on
        </p>
        <button
          onClick={onOpenAuth}
          className="px-4 py-2 bg-black text-white text-[10px] font-medium rounded-xl hover:bg-black/80 transition-colors"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (uploads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-14 text-center opacity-35">
        <Camera className="w-7 h-7 text-black/20 mb-3" strokeWidth={1} />
        <p className="text-[11px] text-black/40">No uploads yet</p>
        <p className="text-[10px] text-black/25 mt-1 leading-relaxed">
          Tap the camera icon above to upload a garment photo
        </p>
      </div>
    );
  }

  return (
    <div className="px-3 py-3 grid grid-cols-2 gap-2">
      {uploads.map((t) => (
        <TemplateCard
          key={t.id}
          template={t}
          isActive={selectedTemplateId === t.id}
          onClick={onSelectTemplate}
          isDisabled={isDisabled}
        />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ClothingSidebar
// ---------------------------------------------------------------------------
const ClothingSidebar = ({
  selectedType,
  onSelectType,
  onSelectTemplate,
  onImageUpload,
  isDisabled,
  isProcessing,
  selectedTemplateId,
  // new props
  isLoggedIn = false,
  userUploads = [],
  onOpenAuth,
}) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('templates'); // 'templates' | 'yours'
  const fileInputRef = useRef(null);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const all = await garmentTemplateService.getAll();
      const withUrls = await garmentTemplateService.resolveAllUrls(all);
      setTemplates(withUrls);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group templates by type
  const grouped = templates.reduce((acc, t) => {
    const key = t.type || 'shirt';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  // Ordered type keys — show types that have templates first
  const typeOrder = Object.keys(TYPE_LABELS);
  const sortedTypes = [
    ...typeOrder.filter((t) => grouped[t]?.length > 0),
    ...typeOrder.filter((t) => !grouped[t]?.length),
  ];

  const handleCameraClick = () => {
    if (!isLoggedIn) { onOpenAuth?.(); return; }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    onImageUpload?.(e);
    e.target.value = '';
  };

  return (
    <div className="w-60 bg-white border-r border-black/8 flex flex-col overflow-hidden flex-shrink-0">

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3.5 border-b border-black/8">
        <div>
          <p className="text-[11px] font-semibold text-black uppercase tracking-[0.15em]">Wardrobe</p>
          <p className="text-[9px] text-black/30 mt-0.5">
            {loading ? 'Loading…' : `${templates.length} templates`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Refresh */}
          <button
            onClick={loadTemplates}
            className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
            title="Refresh templates"
          >
            <RefreshCw className={`w-3 h-3 text-black/30 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {/* Camera upload */}
          <button
            onClick={handleCameraClick}
            disabled={isProcessing}
            title={isLoggedIn ? 'Upload garment photo' : 'Sign in to upload'}
            className={`p-1.5 rounded-lg transition-all
              ${isProcessing
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-black hover:text-white text-black/40 active:scale-90'
              }
            `}
          >
            {isProcessing
              ? <div className="w-3 h-3 border border-black/30 border-t-black/70 rounded-full animate-spin" />
              : <Camera className="w-3.5 h-3.5" />
            }
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* ── Disabled hint ── */}
      {isDisabled && (
        <div className="mx-3 mt-2.5 px-3 py-1.5 bg-black/[0.04] rounded-lg">
          <p className="text-[9px] text-black/40 text-center">Select gender first</p>
        </div>
      )}

      {/* ── Tab switcher ── */}
      <div className="flex-shrink-0 flex border-b border-black/8 bg-black/[0.01]">
        {[['templates', 'Templates'], ['yours', 'Your Collection']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] transition-all border-b-[1.5px]
              ${activeTab === id
                ? 'border-black text-black bg-white'
                : 'border-transparent text-black/28 hover:text-black/55'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'templates' ? (
          loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-black/15 border-t-black/50 rounded-full animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-14 px-4 opacity-40">
              <p className="text-[11px] text-black/40">No templates yet</p>
              <p className="text-[9px] text-black/25 mt-1">Upload GLBs via /admin</p>
            </div>
          ) : (
            sortedTypes.map((type) => (
              <TypeSection
                key={type}
                type={type}
                templates={grouped[type] ?? []}
                selectedTemplateId={selectedTemplateId}
                onSelectTemplate={(id, t) => {
                  onSelectType?.(t);
                  onSelectTemplate?.(id, t);
                }}
                isDisabled={isDisabled}
              />
            ))
          )
        ) : (
          <YourCollection
            uploads={userUploads}
            isLoggedIn={isLoggedIn}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={onSelectTemplate}
            isDisabled={isDisabled}
            onOpenAuth={onOpenAuth}
          />
        )}
      </div>

      {/* ── Processing bar ── */}
      {isProcessing && (
        <div className="flex-shrink-0 px-4 py-2.5 border-t border-black/8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-black/20 border-t-black/60 rounded-full animate-spin flex-shrink-0" />
            <span className="text-[10px] text-black/40">Generating garment…</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClothingSidebar;