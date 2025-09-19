const { supabase, supabaseAdmin } = require('../config/supabase');

class Game {
  constructor(data) {
    this.id = data.id;
    this.name = data.title || data.name;
    this.description = data.description;
    this.image = data.image;
    this.organizerId = data.organizerId || data.organizer_id;
    this.type = data.type;
    this.rules = data.rules;
    this.maxParticipants = data.maxParticipants || data.max_participants;
    this.startTime = data.startTime || data.start_time;
    this.endTime = data.endTime || data.end_time;
    this.status = data.status || 'draft';
    this.joinCode = data.joinCode || data.join_code;
    this.createdAt = data.createdAt || data.created_at;
    this.updatedAt = data.updatedAt || data.updated_at;
  }

  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return new Game(data);
    } catch (error) {
      console.error('Error finding game by ID:', error);
      return null;
    }
  }



  static async create(gameData) {
    try {
      // Use supabaseAdmin for INSERT operations to bypass RLS policies
      const { data, error } = await supabaseAdmin
        .from('games')
        .insert({
          title: gameData.name,
          description: gameData.description,
          image: gameData.image,
          organizer_id: gameData.organizerId,
          type: gameData.type,
          rules: gameData.rules,
          max_participants: gameData.maxParticipants,
          start_time: gameData.startTime,
          end_time: gameData.endTime,
          status: gameData.status || 'draft',
          join_code: gameData.joinCode,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Game(data);
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const updateFields = {};
      
      if (updateData.name) updateFields.title = updateData.name;
      if (updateData.description) updateFields.description = updateData.description;
      if (updateData.image !== undefined) updateFields.image = updateData.image;
      if (updateData.type) updateFields.type = updateData.type;
      if (updateData.rules) updateFields.rules = updateData.rules;
      if (updateData.maxParticipants) updateFields.max_participants = updateData.maxParticipants;
      if (updateData.startTime) updateFields.start_time = updateData.startTime;
      if (updateData.endTime) updateFields.end_time = updateData.endTime;
      if (updateData.status) updateFields.status = updateData.status;
      if (updateData.isActive !== undefined) updateFields.is_active = updateData.isActive;
      if (updateData.joinCode !== undefined) updateFields.join_code = updateData.joinCode;
      
      updateFields.updated_at = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('games')
        .update(updateFields)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Game(data);
    } catch (error) {
      console.error('Error updating game:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { error } = await supabaseAdmin
        .from('games')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error deleting game:', error);
      throw error;
    }
  }

  static async findAll(options = {}) {
    try {
      let query = supabase.from('games').select('*');
      
      // Add support for filtering by organizer
      if (options.organizerId) {
        query = query.eq('organizer_id', options.organizerId);
      }
      
      if (options.status) {
        query = query.eq('status', options.status);
      }
      
      if (options.type) {
        query = query.eq('type', options.type);
      }
      
      if (options.isActive !== undefined) {
        query = query.eq('is_active', options.isActive);
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data.map(game => new Game(game));
    } catch (error) {
      console.error('Error finding all games:', error);
      throw error;
    }
  }
}

module.exports = Game;