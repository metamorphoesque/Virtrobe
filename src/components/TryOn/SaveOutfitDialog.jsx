// src/components/TryOn/SaveOutfitDialog.jsx
// Shown when user clicks "Save Outfit".
// Collects name, description, tags, public/private, then calls onSave.

import React, { useState, useRef, useEffect } from 'react';
import { X, Globe, Lock, Tag, Plus, Loader2 } from 'lucide-react';

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };

const SaveOutfitDialog = ({ onSave, onClose, saving, error }) => {
  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [tagInput, setTagInput]   = useState('');
  const [tags, setTags]           = useState([]);
  const [isPublic, setIsPublic]   = useState(false);
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags((prev) => [...prev, t]);
      setTagInput('');
    }
  };

  const removeTag = (t) => setTags((prev) => prev.filter((x) => x !== t));

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name, description, tags, isPublic });
  };

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-black/6">
          <div>
            <p className="text-[9px] text-black/25 uppercase tracking-[0.3em] mb-1" style={serif}>
              Save look
            </p>
            <h2 className="text-2xl font-light text-black" style={serif}>
              Name your outfit
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-black/20 hover:text-black hover:bg-black/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">

          {/* Name */}
          <div>
            <label className="text-[9px] text-black/35 uppercase tracking-[0.2em] block mb-1.5" style={serif}>
              Name *
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Autumn Office Look"
              maxLength={80}
              className="w-full border-b border-black/12 focus:border-black bg-transparent py-2 text-black placeholder:text-black/20 outline-none transition-colors"
              style={{ ...serif, fontSize: '1rem' }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[9px] text-black/35 uppercase tracking-[0.2em] block mb-1.5" style={serif}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Tell the story of this outfit…"
              maxLength={300}
              rows={2}
              className="w-full border-b border-black/12 focus:border-black bg-transparent py-2 text-black placeholder:text-black/20 outline-none transition-colors resize-none"
              style={{ ...serif, fontSize: '0.9rem' }}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-[9px] text-black/35 uppercase tracking-[0.2em] block mb-1.5" style={serif}>
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-black/10 text-[10px] text-black/55 bg-black/[0.02]"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="text-black/30 hover:text-black ml-0.5 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add a tag…"
                maxLength={30}
                className="flex-1 border-b border-black/10 focus:border-black bg-transparent py-1.5 text-[11px] text-black placeholder:text-black/20 outline-none transition-colors"
                style={serif}
              />
              <button
                type="button"
                onClick={addTag}
                disabled={!tagInput.trim() || tags.length >= 8}
                className="p-1 rounded-lg text-black/30 hover:text-black hover:bg-black/5 transition-colors disabled:opacity-25"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center gap-4 pt-1">
            <span className="text-[10px] text-black/40 uppercase tracking-[0.15em]" style={serif}>Visibility</span>
            <div className="flex items-center gap-2 bg-black/[0.04] rounded-xl p-1 ml-auto">
              {[
                { val: false, icon: Lock,   label: 'Private' },
                { val: true,  icon: Globe,  label: 'Public'  },
              ].map(({ val, icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setIsPublic(val)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    isPublic === val
                      ? 'bg-black text-white shadow-sm'
                      : 'text-black/35 hover:text-black/70'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {isPublic && (
            <p className="text-[10px] text-black/30 leading-relaxed -mt-1" style={serif}>
              This outfit will appear on the public Moodboards feed and can be liked and commented on.
            </p>
          )}

          {/* Error */}
          {error && (
            <p className="text-[10px] text-red-400">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-black/10 text-[11px] text-black/50 hover:border-black/25 hover:text-black transition-all rounded-none"
              style={{ ...serif, letterSpacing: '0.1em' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="flex-1 py-3 bg-black text-white text-[11px] flex items-center justify-center gap-2 hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              style={{ ...serif, letterSpacing: '0.15em', textTransform: 'uppercase' }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save outfit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveOutfitDialog;