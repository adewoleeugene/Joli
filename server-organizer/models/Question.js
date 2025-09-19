const { supabase, supabaseAdmin } = require('../config/supabase');

class Question {
  constructor(data) {
    this.id = data.id;
    this.gameId = data.gameId || data.game_id;
    this.question = data.question;
    this.type = data.type;
    this.options = data.options;
    this.correctAnswer = data.correctAnswer || data.correct_answer;
    this.timeLimit = data.timeLimit || data.time_limit;
    this.createdAt = data.createdAt || data.created_at;
    this.updatedAt = data.updatedAt || data.updated_at;
  }

  static async findById(id) {
    try {
      const { data, error } = await supabaseAdmin
        .from('questions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return new Question(data);
    } catch (error) {
      console.error('Error finding question by ID:', error);
      return null;
    }
  }

  static async findByGameId(gameId, orderBy = 'created_at') {
    try {
      let query = supabaseAdmin
        .from('questions')
        .select('*')
        .eq('game_id', gameId);

      // Apply ordering based on the orderBy parameter
      switch (orderBy) {
        case 'point_value':
          query = query.order('points', { ascending: false }).order('created_at', { ascending: true });
          break;
        case 'alphabetical':
          query = query.order('question', { ascending: true });
          break;
        case 'random':
          // For random, we'll fetch all and shuffle in JavaScript
          query = query.order('created_at', { ascending: true });
          break;
        default:
          query = query.order('created_at', { ascending: true });
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      let questions = data.map(question => new Question(question));

      // Handle random ordering
      if (orderBy === 'random') {
        questions = this.shuffleArray(questions);
      }

      return questions;
    } catch (error) {
      console.error('Error finding questions by game ID:', error);
      return [];
    }
  }

  // Helper method to shuffle array for random ordering
  static shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static async create(questionData) {
    try {
      // Use supabaseAdmin for INSERT operations to bypass RLS policies
      const { data, error } = await supabaseAdmin
        .from('questions')
        .insert({
          game_id: questionData.gameId,
          question: questionData.question,
          type: questionData.type,
          options: questionData.options,
          correct_answer: questionData.correctAnswer,
          time_limit: questionData.timeLimit || 60, // Default to 60 seconds if not specified
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Question(data);
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const updateFields = {};
      
      if (updateData.question) updateFields.question = updateData.question;
      if (updateData.type) updateFields.type = updateData.type;
      if (updateData.options) updateFields.options = updateData.options;
      if (updateData.correctAnswer) updateFields.correct_answer = updateData.correctAnswer;
      if (updateData.timeLimit !== undefined) updateFields.time_limit = updateData.timeLimit;
      if (updateData.displayOrder !== undefined) updateFields.display_order = updateData.displayOrder;
      
      updateFields.updated_at = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('questions')
        .update(updateFields)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Question(data);
    } catch (error) {
      console.error('Error updating question:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { error } = await supabaseAdmin
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  }
}

module.exports = Question;