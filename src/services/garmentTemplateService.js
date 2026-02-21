// src/services/garmentTemplateService.js
// SUPABASE GARMENT TEMPLATE SERVICE
// Handles fetching, uploading, and deleting templates from Supabase
import { supabase, getSignedUrl, uploadFile, STORAGE_BUCKET } from '../lib/supabase';

class GarmentTemplateService {
  async getAll() {
    console.log('📡 Fetching all templates from Supabase...');
    const { data, error } = await supabase
      .from('garment_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase fetch error:', error);
      throw error;
    }

    // Resolve URLs for the admin view to show thumbnails immediately
    return this.resolveAllUrls(data || []);
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

    return data;
  }

  async resolveUrls(template) {
    try {
      const glbUrl = await getSignedUrl(template.glb_path);
      const thumbnailUrl = template.thumbnail_path
        ? await getSignedUrl(template.thumbnail_path)
        : null;

      return { ...template, glb_url: glbUrl, thumbnail_url: thumbnailUrl };
    } catch (err) {
      console.error('❌ Failed to generate signed URLs for', template.name, err);
      // Return template without URLs if signing fails, rather than crashing the whole list
      return template;
    }
  }

  async resolveAllUrls(templates) {
    return Promise.all(templates.map(t => this.resolveUrls(t)));
  }

  templateToGarmentData(template) {
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
    return garmentData;
  }

  // ─── ADMIN METHODS ─────────────────────────────────────────

  async saveTemplate(data) {
    console.log('💾 Saving new template:', data.name);
    // Generate a secure UUID for the files
    const id = crypto.randomUUID();

    let glbPath = null;
    let thumbPath = null;

    try {
      // 1. Upload GLB
      glbPath = `glbs/${id}.glb`;
      await uploadFile(glbPath, data.glbFile, data.glbFile.type || 'model/gltf-binary');

      // 2. Upload Thumbnail (optional)
      if (data.thumbnailFile) {
        const ext = data.thumbnailFile.name.split('.').pop() || 'jpg';
        thumbPath = `thumbnails/${id}.${ext}`;
        await uploadFile(thumbPath, data.thumbnailFile, data.thumbnailFile.type);
      }

      // 3. Insert into Database
      const { data: dbData, error } = await supabase
        .from('garment_templates')
        .insert({
          id, // optional: we can enforce the generated ID here
          name: data.name,
          type: data.type,
          brand: data.brand || null,
          colors: data.colors || [],
          tags: data.tags || [],
          glb_path: glbPath,
          thumbnail_path: thumbPath,
          dominant_color: data.colors?.[0] || null,
          created_by: data.createdBy,
          is_active: true,
          front_direction: null, // auto-detect
          rotation_y_deg: 0, // default
        })
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Template saved successfully:', dbData);
      return dbData;

    } catch (err) {
      console.error('❌ Save template failed:', err);
      // Clean up orphaned files if DB insert fails
      if (glbPath) await supabase.storage.from(STORAGE_BUCKET).remove([glbPath]).catch(console.error);
      if (thumbPath) await supabase.storage.from(STORAGE_BUCKET).remove([thumbPath]).catch(console.error);
      throw err;
    }
  }

  async updateTemplate(id, updates) {
    console.log(`📝 Updating template ${id}:`, updates);
    const { data, error } = await supabase
      .from('garment_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Update failed:', error);
      throw error;
    }
    return data;
  }

  async deleteTemplate(id) {
    console.log(`🗑️ Deleting template ${id}`);

    // First get the template so we know which files to delete
    const template = await this.getById(id);
    if (!template) throw new Error('Template not found');

    // Delete files concurrently
    const filesToDelete = [];
    if (template.glb_path) filesToDelete.push(template.glb_path);
    if (template.thumbnail_path) filesToDelete.push(template.thumbnail_path);

    if (filesToDelete.length > 0) {
      console.log('Removing files:', filesToDelete);
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(filesToDelete);

      if (storageError) console.error('⚠️ Storage cleanup warning:', storageError);
    }

    // Delete DB record
    const { error: dbError } = await supabase
      .from('garment_templates')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('❌ DB delete failed:', dbError);
      throw dbError;
    }

    console.log('✅ Template deleted');
    return true;
  }
}

export default new GarmentTemplateService();