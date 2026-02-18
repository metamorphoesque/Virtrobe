// src/services/garmentTemplateService.js
// MINIMAL VERSION - Only Supabase template loading
import { supabase, getSignedUrl } from '../lib/supabase';

class GarmentTemplateService {

  async getAll() {
    console.log('📡 Fetching all templates from Supabase...');
    const { data, error } = await supabase
      .from('garment_templates')
      .select('*')
      .eq('is_active', true)
      .order('use_count', { ascending: false });
    
    if (error) {
      console.error('❌ Supabase fetch error:', error);
      throw error;
    }
    
    console.log('✅ Fetched', data?.length || 0, 'templates');
    return data || [];
  }

  async getById(id) {
    console.log('📡 Fetching template by ID:', id);
    const { data, error } = await supabase
      .from('garment_templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('❌ Supabase fetch error:', error);
      throw error;
    }
    
    console.log('✅ Fetched template:', data.name);
    return data;
  }

  async resolveUrls(template) {
    console.log('🔐 Generating signed URLs for:', template.name);
    try {
      const glbUrl = await getSignedUrl(template.glb_path);
      const thumbnailUrl = template.thumbnail_path 
        ? await getSignedUrl(template.thumbnail_path) 
        : null;
      
      console.log('✅ Signed URLs generated');
      console.log('   GLB:', glbUrl.substring(0, 60) + '...');
      if (thumbnailUrl) console.log('   Thumb:', thumbnailUrl.substring(0, 60) + '...');
      
      return { ...template, glb_url: glbUrl, thumbnail_url: thumbnailUrl };
    } catch (err) {
      console.error('❌ Failed to generate signed URLs:', err);
      throw err;
    }
  }

  async resolveAllUrls(templates) {
    console.log('🔐 Resolving URLs for', templates.length, 'templates...');
    return Promise.all(templates.map(t => this.resolveUrls(t)));
  }

  templateToGarmentData(template) {
    console.log('🎨 Converting template to garmentData:', template.name);
    const garmentData = {
      modelUrl: template.glb_url,
      taskId: template.id,
      type: template.type,
      name: template.name,
      dominantColor: template.dominant_color || template.colors?.[0] || '#808080',
      availableColors: template.colors || [],
      tags: template.tags || [],
      is3D: true,
      isTemplate: true,
      fromCache: true
    };
    console.log('✅ GarmentData ready:', garmentData);
    return garmentData;
  }
}

export default new GarmentTemplateService();