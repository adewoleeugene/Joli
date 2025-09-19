const { supabaseAdmin } = require('../config/supabase');

const Submission = {
  async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  }
};

module.exports = { Submission };