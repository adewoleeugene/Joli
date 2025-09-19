const { supabaseAdmin } = require('../config/supabase');

function buildRange(page = 1, limit = 20) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { from, to };
}

async function getAllGames(filters = {}, { page = 1, limit = 20 } = {}) {
  let query = supabaseAdmin.from('games').select('*', { count: 'exact' });
  if (filters.event) query = query.eq('event', filters.event);
  if (filters.eventIds) query = query.in('event', filters.eventIds);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.status) query = query.eq('status', filters.status);
  const { from, to } = buildRange(page, limit);
  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return {
    games: data || [],
    pagination: {
      current: page,
      pages: Math.ceil((count || 0) / limit),
      total: count || 0
    }
  };
}

async function getGame(id) {
  const { data, error } = await supabaseAdmin.from('games').select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

async function createGame(gameData) {
  const { data, error } = await supabaseAdmin.from('games').insert(gameData).select('*').single();
  if (error) throw error;
  return data;
}

async function updateGame(id, updateData) {
  const { data, error } = await supabaseAdmin
    .from('games')
    .update({ ...updateData, updatedAt: new Date() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function deleteGame(id) {
  const { error } = await supabaseAdmin.from('games').delete().eq('id', id);
  if (error) throw error;
  return true;
}

async function getGameAnalytics(id) {
  // Minimal placeholder
  return { stats: {}, updatedAt: new Date() };
}

async function getGameLeaderboard(id) {
  // Minimal placeholder
  return { rankings: [], updatedAt: new Date() };
}

module.exports = {
  getAllGames,
  getGame,
  createGame,
  updateGame,
  deleteGame,
  getGameAnalytics,
  getGameLeaderboard
};