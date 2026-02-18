// src/services/garmentTemplateService.js
// ============================================
// SMART GARMENT SERVICE
//
// Flow for every upload:
//   1. Hash image → check Supabase for exact match
//   2. No exact match → check type + dominant color
//   3. No similar match → call Meshy API → save to Supabase
//   4. Always returns same garmentData shape
// ============================================

import { supabase, uploadFile } from '../lib/supabase';

export const GARMENT_CONFIGS = {
  shirt:     { heightRatio: 0.38, widthMultiplier: 1.05, positionY:  0.18, positionZ: 0.08 },
  dress:     { heightRatio: 0.75, widthMultiplier: 1.10, positionY:  0.05, positionZ: 0.08 },
  pants:     { heightRatio: 0.48, widthMultiplier: 1.00, positionY: -0.28, positionZ: 0.08 },
  jacket:    { heightRatio: 0.44, widthMultiplier: 1.18, positionY:  0.18, positionZ: 0.10 },
  skirt:     { heightRatio: 0.35, widthMultiplier: 1.05, positionY: -0.10, positionZ: 0.08 },
  shorts:    { heightRatio: 0.28, widthMultiplier: 1.00, positionY: -0.20, positionZ: 0.08 },
  accessory: { heightRatio: 0.15, widthMultiplier: 0.80, positionY:  0.40, positionZ: 0.12 }
};

class GarmentTemplateService {

  // ─── READ ─────────────────────────────────────────────

  async getAll() {
    const { data, error } = await supabase
      .from('garment_templates')
      .select('*')
      .eq('is_active', true)
      .order('use_count', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getByType(type) {
    const { data, error } = await supabase
      .from('garment_templates')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .order('use_count', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getById(id) {
    const { data, error } = await supabase
      .from('garment_templates')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  // ─── SIMILARITY MATCHING ──────────────────────────────

  async findByHash(imageHash) {
    const { data } = await supabase
      .from('garment_templates')
      .select('*')
      .eq('image_hash', imageHash)
      .eq('is_active', true)
      .maybeSingle();
    return data || null;
  }

  async findSimilar(type, dominantColor) {
    const { data } = await supabase
      .from('garment_templates')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .order('use_count', { ascending: false });

    if (!data?.length) return null;
    if (!dominantColor) return data[0];

    const target = hexToRgb(dominantColor);
    if (!target) return data[0];

    let closest = null;
    let minDist = Infinity;

    for (const t of data) {
      if (!t.dominant_color) continue;
      const rgb = hexToRgb(t.dominant_color);
      if (!rgb) continue;
      const dist = colorDistance(target, rgb);
      if (dist < minDist) { minDist = dist; closest = t; }
    }

    // Only match if color is reasonably close
    return minDist < 80 ? closest : null;
  }

  // Main cache lookup — called before every Meshy API call
  async findOrNull(imageHash, garmentType, dominantColor) {
    console.log('🔍 Checking Supabase cache...');

    const exact = await this.findByHash(imageHash);
    if (exact) {
      console.log('⚡ Exact cache hit:', exact.name);
      this.incrementUseCount(exact.id);
      return { template: exact, matchType: 'exact' };
    }

    const similar = await this.findSimilar(garmentType, dominantColor);
    if (similar) {
      console.log('🎨 Similar match:', similar.name);
      this.incrementUseCount(similar.id);
      return { template: similar, matchType: 'similar' };
    }

    console.log('❌ No cache match — will call Meshy');
    return null;
  }

  // ─── WRITE ────────────────────────────────────────────

  async saveTemplate({ name, type, glbFile, thumbnailFile, colors = [], tags = [],
    brand = null, imageHash = null, dominantColor = null, colorPalette = [], createdBy = 'admin' }) {

    const id = crypto.randomUUID();

    const glbUrl = await uploadFile(`glbs/${id}.glb`, glbFile, 'model/gltf-binary');

    let thumbnailUrl = null;
    if (thumbnailFile) {
      thumbnailUrl = await uploadFile(`thumbs/${id}.jpg`, thumbnailFile, 'image/jpeg');
    }

    const { data, error } = await supabase
      .from('garment_templates')
      .insert({ id, name, type, glb_url: glbUrl, thumbnail_url: thumbnailUrl,
        colors, tags, brand, image_hash: imageHash, dominant_color: dominantColor,
        color_palette: colorPalette, created_by: createdBy, is_active: true })
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Saved to Supabase:', name);
    return data;
  }

  async updateTemplate(id, updates) {
    const { data, error } = await supabase
      .from('garment_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteTemplate(id) {
    const template = await this.getById(id);
    if (template?.glb_url) {
      const glbPath = `glbs/${id}.glb`;
      await supabase.storage.from('garments').remove([glbPath]);
    }
    if (template?.thumbnail_url) {
      await supabase.storage.from('garments').remove([`thumbs/${id}.jpg`]);
    }
    const { error } = await supabase.from('garment_templates').delete().eq('id', id);
    if (error) throw error;
  }

  incrementUseCount(id) {
    supabase.rpc('increment_use_count', { template_id: id });
  }

  // ─── SHAPE ADAPTER ────────────────────────────────────
  // Converts a DB row to the garmentData shape Scene.jsx expects

  templateToGarmentData(template, matchType = 'template') {
    return {
      modelUrl: template.glb_url,
      taskId: template.id,
      type: template.type,
      name: template.name,
      dominantColor: template.dominant_color || template.colors?.[0] || '#808080',
      availableColors: template.colors || [],
      tags: template.tags || [],
      is3D: true,
      isTemplate: true,
      matchType,
      fromCache: matchType !== 'generated'
    };
  }

  getConfig(type) {
    return GARMENT_CONFIGS[type] || GARMENT_CONFIGS.shirt;
  }
}

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r: parseInt(r[1],16), g: parseInt(r[2],16), b: parseInt(r[3],16) } : null;
}

function colorDistance(a, b) {
  return Math.sqrt((a.r-b.r)**2 + (a.g-b.g)**2 + (a.b-b.b)**2);
}

export default new GarmentTemplateService();