const { supabase } = require('../config/supabase');

class Submission {
  constructor(data) {
    this.id = data.id;
    this.gameId = data.gameId || data.game_id;
    this.userId = data.userId || data.user_id;
    this.content = data.content;
    this.fileUrl = data.fileUrl || data.file_url;
    this.fileName = data.fileName || data.file_name;
    this.fileSize = data.fileSize || data.file_size;
    this.status = data.status || 'submitted';
    this.score = data.score;
    this.feedback = data.feedback;
    this.submittedAt = data.submittedAt || data.submitted_at;
    this.reviewedAt = data.reviewedAt || data.reviewed_at;
    this.reviewedBy = data.reviewedBy || data.reviewed_by;
    this.createdAt = data.createdAt || data.created_at;
    this.updatedAt = data.updatedAt || data.updated_at;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
  }

  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return new Submission(data);
    } catch (error) {
      console.error('Error finding submission by ID:', error);
      return null;
    }
  }

  static async findByGame(gameId, options = {}) {
    try {
      let query = supabase
        .from('submissions')
        .select('*')
        .eq('game_id', gameId);

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      query = query.order('submitted_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data.map(submission => new Submission(submission));
    } catch (error) {
      console.error('Error finding submissions by game:', error);
      throw error;
    }
  }

  static async findByUser(userId, options = {}) {
    try {
      let query = supabase
        .from('submissions')
        .select('*')
        .eq('user_id', userId);

      if (options.gameId) {
        query = query.eq('game_id', options.gameId);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      query = query.order('submitted_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data.map(submission => new Submission(submission));
    } catch (error) {
      console.error('Error finding submissions by user:', error);
      throw error;
    }
  }

  static async create(submissionData) {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .insert({
          game_id: submissionData.gameId,
          user_id: submissionData.userId,
          content: submissionData.content,
          file_url: submissionData.fileUrl,
          file_name: submissionData.fileName,
          file_size: submissionData.fileSize,
          status: submissionData.status || 'submitted',
          score: submissionData.score,
          feedback: submissionData.feedback,
          submitted_at: submissionData.submittedAt || new Date().toISOString(),
          is_active: submissionData.isActive !== undefined ? submissionData.isActive : true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Submission(data);
    } catch (error) {
      console.error('Error creating submission:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const updateFields = {};
      
      if (updateData.content) updateFields.content = updateData.content;
      if (updateData.fileUrl) updateFields.file_url = updateData.fileUrl;
      if (updateData.fileName) updateFields.file_name = updateData.fileName;
      if (updateData.fileSize) updateFields.file_size = updateData.fileSize;
      if (updateData.status) updateFields.status = updateData.status;
      if (updateData.score !== undefined) updateFields.score = updateData.score;
      if (updateData.feedback) updateFields.feedback = updateData.feedback;
      if (updateData.reviewedAt) updateFields.reviewed_at = updateData.reviewedAt;
      if (updateData.reviewedBy) updateFields.reviewed_by = updateData.reviewedBy;
      if (updateData.isActive !== undefined) updateFields.is_active = updateData.isActive;
      
      updateFields.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('submissions')
        .update(updateFields)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Submission(data);
    } catch (error) {
      console.error('Error updating submission:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error deleting submission:', error);
      throw error;
    }
  }

  static async findAll(options = {}) {
    try {
      let query = supabase.from('submissions').select('*');
      
      if (options.status) {
        query = query.eq('status', options.status);
      }
      
      if (options.gameId) {
        query = query.eq('game_id', options.gameId);
      }
      
      if (options.gameIds) {
        query = query.in('game_id', options.gameIds);
      }
      
      if (options.userId) {
        query = query.eq('user_id', options.userId);
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

      query = query.order('submitted_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data.map(submission => new Submission(submission));
    } catch (error) {
      console.error('Error finding all submissions:', error);
      throw error;
    }
  }
}

module.exports = Submission;