// src/components/pages/AdminPage.jsx
// ============================================
// ADMIN PANEL
// Upload GLB templates, manage the garment library.
// Access via /admin route (protect this in production)
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Eye, EyeOff, Plus, RefreshCw, Package } from 'lucide-react';
import garmentTemplateService from '../../services/garmentTemplateService';

const GARMENT_TYPES = ['shirt', 'dress', 'pants', 'jacket', 'skirt', 'shorts', 'accessory'];

// ─── Upload Form ──────────────────────────────────────

const UploadForm = ({ onSuccess }) => {
  const [form, setForm] = useState({
    name: '',
    type: 'shirt',
    colors: '#ffffff',
    tags: '',
    brand: '',
  });
  const [glbFile, setGlbFile] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const glbRef = useRef();
  const thumbRef = useRef();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!glbFile) { setError('GLB file is required'); return; }
    if (!form.name.trim()) { setError('Name is required'); return; }

    setLoading(true);
    setError(null);

    try {
      const colors = form.colors
        .split(',')
        .map(c => c.trim())
        .filter(c => c.startsWith('#'));

      const tags = form.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      await garmentTemplateService.saveTemplate({
        name: form.name.trim(),
        type: form.type,
        glbFile,
        thumbnailFile: thumbFile,
        colors,
        tags,
        brand: form.brand.trim() || null,
        createdBy: 'admin'
      });

      // Reset form
      setForm({ name: '', type: 'shirt', colors: '#ffffff', tags: '', brand: '' });
      setGlbFile(null);
      setThumbFile(null);
      glbRef.current.value = '';
      if (thumbRef.current) thumbRef.current.value = '';
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-black/10 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-black mb-6 flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Add New Template
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Name */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-black/60 mb-1">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. White Oversized Tee"
            className="w-full px-3 py-2 text-sm border border-black/20 rounded-lg focus:outline-none focus:border-black"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-black/60 mb-1">Type *</label>
          <select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-black/20 rounded-lg focus:outline-none focus:border-black bg-white"
          >
            {GARMENT_TYPES.map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Brand */}
        <div>
          <label className="block text-xs font-medium text-black/60 mb-1">Brand</label>
          <input
            type="text"
            value={form.brand}
            onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
            placeholder="e.g. Zara, H&M"
            className="w-full px-3 py-2 text-sm border border-black/20 rounded-lg focus:outline-none focus:border-black"
          />
        </div>

        {/* Colors */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-black/60 mb-1">
            Colors (comma-separated hex)
          </label>
          <input
            type="text"
            value={form.colors}
            onChange={e => setForm(f => ({ ...f, colors: e.target.value }))}
            placeholder="#ffffff, #000000, #1a1a2e"
            className="w-full px-3 py-2 text-sm border border-black/20 rounded-lg focus:outline-none focus:border-black font-mono"
          />
        </div>

        {/* Tags */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-black/60 mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={form.tags}
            onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            placeholder="casual, summer, oversized"
            className="w-full px-3 py-2 text-sm border border-black/20 rounded-lg focus:outline-none focus:border-black"
          />
        </div>
      </div>

      {/* File uploads */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-black/60 mb-1">GLB File *</label>
          <div
            onClick={() => glbRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
              ${glbFile ? 'border-black bg-black/5' : 'border-black/20 hover:border-black/40'}`}
          >
            <Package className="w-6 h-6 mx-auto mb-1 text-black/40" />
            <p className="text-xs text-black/50">
              {glbFile ? glbFile.name : 'Click to upload .glb'}
            </p>
            <input
              ref={glbRef}
              type="file"
              accept=".glb"
              className="hidden"
              onChange={e => setGlbFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-black/60 mb-1">Thumbnail (optional)</label>
          <div
            onClick={() => thumbRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
              ${thumbFile ? 'border-black bg-black/5' : 'border-black/20 hover:border-black/40'}`}
          >
            {thumbFile ? (
              <img
                src={URL.createObjectURL(thumbFile)}
                alt="thumb"
                className="w-12 h-12 object-cover rounded mx-auto"
              />
            ) : (
              <>
                <Upload className="w-6 h-6 mx-auto mb-1 text-black/40" />
                <p className="text-xs text-black/50">Click to upload image</p>
              </>
            )}
            <input
              ref={thumbRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => setThumbFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-black/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Uploading to Supabase...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Save Template
          </>
        )}
      </button>
    </form>
  );
};

// ─── Template Row ─────────────────────────────────────

const TemplateRow = ({ template, onDelete, onToggle }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await garmentTemplateService.deleteTemplate(template.id);
      onDelete(template.id);
    } catch (err) {
      alert('Delete failed: ' + err.message);
      setDeleting(false);
    }
  };

  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg border transition-colors
      ${template.is_active ? 'border-black/10 bg-white' : 'border-black/5 bg-black/5 opacity-60'}`}>

      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-black/10">
        {template.thumbnail_url ? (
          <img src={template.thumbnail_url} alt={template.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl">
            {{ shirt:'👕', dress:'👗', pants:'👖', jacket:'🧥', skirt:'👗', shorts:'🩳', accessory:'👟' }[template.type] || '👔'}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-black truncate">{template.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-black/40 uppercase tracking-wide">{template.type}</span>
          {template.brand && <span className="text-[10px] text-black/40">· {template.brand}</span>}
          <span className="text-[10px] text-black/30">· {template.use_count} uses</span>
        </div>
        {template.tags?.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {template.tags.slice(0, 4).map(tag => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-black/5 rounded text-black/50">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Colors */}
      <div className="flex gap-1">
        {(template.colors || []).slice(0, 5).map(color => (
          <div key={color} className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: color }} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onToggle(template.id, !template.is_active)}
          className="p-1.5 hover:bg-black/5 rounded-lg transition-colors"
          title={template.is_active ? 'Hide from users' : 'Show to users'}
        >
          {template.is_active
            ? <Eye className="w-3.5 h-3.5 text-black/40" />
            : <EyeOff className="w-3.5 h-3.5 text-black/40" />
          }
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className={`w-3.5 h-3.5 ${deleting ? 'text-black/20' : 'text-red-400'}`} />
        </button>
      </div>
    </div>
  );
};

// ─── Main Admin Page ──────────────────────────────────

const AdminPage = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const all = await garmentTemplateService.getAll();
      setTemplates(all);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = (id) => setTemplates(t => t.filter(x => x.id !== id));

  const handleToggle = async (id, isActive) => {
    await garmentTemplateService.updateTemplate(id, { is_active: isActive });
    setTemplates(t => t.map(x => x.id === id ? { ...x, is_active: isActive } : x));
  };

  const filtered = filter === 'all' ? templates : templates.filter(t => t.type === filter);

  const stats = {
    total: templates.length,
    active: templates.filter(t => t.is_active).length,
    uses: templates.reduce((sum, t) => sum + (t.use_count || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-black/40 uppercase tracking-widest mb-1">Virtrobe</p>
            <h1 className="text-2xl font-bold text-black">Garment Library</h1>
          </div>
          <button onClick={load} className="p-2 hover:bg-black/5 rounded-lg transition-colors">
            <RefreshCw className={`w-4 h-4 text-black/40 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Templates', value: stats.total },
            { label: 'Active (visible)', value: stats.active },
            { label: 'Total Served', value: stats.uses }
          ].map(s => (
            <div key={s.label} className="bg-white border border-black/10 rounded-xl p-4">
              <p className="text-2xl font-bold text-black">{s.value}</p>
              <p className="text-xs text-black/40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-6">

          {/* Upload form — left col */}
          <div className="col-span-2">
            <UploadForm onSuccess={load} />
          </div>

          {/* Template list — right col */}
          <div className="col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-black">Templates</h2>

              {/* Type filter */}
              <div className="flex gap-1">
                {['all', ...GARMENT_TYPES].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-2 py-1 text-[10px] rounded-md transition-colors font-medium
                      ${filter === type ? 'bg-black text-white' : 'bg-white text-black/50 border border-black/10 hover:border-black/30'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-black/30">
                <Package className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No templates yet</p>
                <p className="text-xs mt-1">Upload your first GLB to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(template => (
                  <TemplateRow
                    key={template.id}
                    template={template}
                    onDelete={handleDelete}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminPage;