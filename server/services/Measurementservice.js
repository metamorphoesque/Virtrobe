import supabase from './supabaseClient.js';

const measurementsService = {
  async get(userId) {
    const { data, error } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async save(userId, measurements) {
    const row = {
      user_id: userId,
      gender: measurements.gender,
      height: measurements.height ?? null,
      chest: measurements.chest ?? null,
      waist: measurements.waist ?? null,
      hips: measurements.hips ?? null,
      shoulders: measurements.shoulders ?? null,
      unit_preference: measurements.unitPreference ?? 'cm',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('body_measurements')
      .upsert(row, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(userId) {
    const { error } = await supabase
      .from('body_measurements')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  },
};

export default measurementsService;