const { supabaseAdmin } = require('../config/supabase');

const Game = {
  async findByOrganizer(organizerId) {
    if (!organizerId) return [];
    const { data, error } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('organizerId', organizerId);
    if (error) throw error;
    return data || [];
  }
};

module.exports = { Game };