const { supabaseAdmin } = require('../config/supabase');

function buildRange(page = 1, limit = 20) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { from, to };
}

async function getAllSubmissions(filters = {}, { page = 1, limit = 20 } = {}) {
  let query = supabaseAdmin.from('submissions').select('*', { count: 'exact' });
  if (filters.event) query = query.eq('event', filters.event);
  if (filters.eventIds) query = query.in('event', filters.eventIds);
  if (filters.game) query = query.eq('game', filters.game);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.participant) query = query.eq('participant', filters.participant);
  const { from, to } = buildRange(page, limit);
  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return {
    submissions: data || [],
    pagination: {
      current: page,
      pages: Math.ceil((count || 0) / limit),
      total: count || 0
    }
  };
}

async function getSubmission(id) {
  const { data, error } = await supabaseAdmin.from('submissions').select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

async function createSubmission(submissionData) {
  const { data, error } = await supabaseAdmin.from('submissions').insert(submissionData).select('*').single();
  if (error) throw error;
  return data;
}

async function updateSubmission(id, updateData) {
  const { data, error } = await supabaseAdmin
    .from('submissions')
    .update({ ...updateData, updatedAt: new Date() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  getAllSubmissions,
  getSubmission,
  createSubmission,
  updateSubmission
};