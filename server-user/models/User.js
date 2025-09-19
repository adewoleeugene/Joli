const { supabaseAdmin } = require('../config/supabase');

function attachUpdate(record) {
  if (!record) return record;
  if (typeof record.update !== 'function') {
    record.update = async (fields) => {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update(fields)
        .eq('id', record.id)
        .select('*')
        .single();
      if (error) throw error;
      Object.assign(record, data);
      return record;
    };
  }
  return record;
}

const User = {
  async findById(id) {
    if (!id) return null;
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return attachUpdate(data);
  },

  async create(payload) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return attachUpdate(data);
  },

  async updateById(id, fields) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(fields)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return attachUpdate(data);
  }
};

module.exports = User;
module.exports.User = User;