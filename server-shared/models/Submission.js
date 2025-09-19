const { supabase, supabaseAdmin, handleSupabaseError } = require('../config/supabase');

class Submission {
  constructor(data) {
    this.id = data.id;

    this.gameId = data.game_id || data.gameId;
    this.participantId = data.participant_id || data.participantId;
    this.gameType = data.game_type || data.gameType;
    
    this.submissionType = data.submission_type || data.submissionType;
    
    // Content fields
    this.textContent = data.text_content || data.textContent;
    this.mediaUrl = data.media_url || data.mediaUrl;
    this.mediaType = data.media_type || data.mediaType;
    this.location = data.location || null;
    
    // Game-specific fields
    this.missionId = data.mission_id || data.missionId;
    this.questionId = data.question_id || data.questionId;
    this.challengeId = data.challenge_id || data.challengeId;
    
    // Answer and scoring
    this.answer = data.answer;
    this.isCorrect = data.is_correct !== undefined ? data.is_correct : null;
    this.pointsAwarded = data.points_awarded || data.pointsAwarded || 0;
    this.bonusPoints = data.bonus_points || data.bonusPoints || 0;
    this.bonusReason = data.bonus_reason || data.bonusReason;
    
    // Timing
    this.timeSpent = data.time_spent || data.timeSpent;
    this.submittedAt = data.submitted_at || data.submittedAt;
    
    // Review and moderation
    this.status = data.status || 'pending';
    this.reviewedBy = data.reviewed_by || data.reviewedBy;
    this.reviewedAt = data.reviewed_at || data.reviewedAt;
    this.reviewNotes = data.review_notes || data.reviewNotes;
    
    // Game-specific data structures
    this.voteData = data.vote_data || data.voteData || {};
    this.quizData = data.quiz_data || data.quizData || {
      answers: [],
      totalScore: 0,
      totalCorrect: 0,
      totalTime: 0
    };
    this.wordGameData = data.word_game_data || data.wordGameData || {
      word: null,
      guesses: [],
      isCompleted: false,
      attemptsUsed: 0
    };
    
    // Metadata
    this.deviceInfo = data.device_info || data.deviceInfo || {};
    this.ipAddress = data.ip_address || data.ipAddress;
    
    // Flags
    this.isFlagged = data.is_flagged !== undefined ? data.is_flagged : false;
    this.flagReason = data.flag_reason || data.flagReason;
    this.isDeleted = data.is_deleted !== undefined ? data.is_deleted : false;
    
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
  }

  // Create a new submission
  static async create(submissionData) {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .insert({
          event_id: submissionData.eventId,
          game_id: submissionData.gameId,
          participant_id: submissionData.participantId,
          game_type: submissionData.gameType,
          submission_type: submissionData.submissionType,
          text_content: submissionData.textContent,
          media_url: submissionData.mediaUrl,
          media_type: submissionData.mediaType,
          location: submissionData.location,
          mission_id: submissionData.missionId,
          question_id: submissionData.questionId,
          challenge_id: submissionData.challengeId,
          answer: submissionData.answer,
          is_correct: submissionData.isCorrect,
          points_awarded: submissionData.pointsAwarded || 0,
          bonus_points: submissionData.bonusPoints || 0,
          bonus_reason: submissionData.bonusReason,
          time_spent: submissionData.timeSpent,
          submitted_at: submissionData.submittedAt || new Date().toISOString(),
          status: submissionData.status || 'pending',
          vote_data: submissionData.voteData || {},
          quiz_data: submissionData.quizData || {
            answers: [],
            totalScore: 0,
            totalCorrect: 0,
            totalTime: 0
          },
          word_game_data: submissionData.wordGameData || {
            word: null,
            guesses: [],
            isCompleted: false,
            attemptsUsed: 0
          },
          device_info: submissionData.deviceInfo || {},
          ip_address: submissionData.ipAddress
        })
        .select()
        .single();

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return new Submission(data);
    } catch (error) {
      console.error('Error creating submission:', error);
      throw error;
    }
  }

  // Find submission by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          events (id, title, event_code),
          games (id, title, type),
          users (id, first_name, last_name, email)
        `)
        .eq('id', id)
        .eq('is_deleted', false)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Submission not found
        }
        throw new Error(handleSupabaseError(error));
      }

      return new Submission(data);
    } catch (error) {
      console.error('Error finding submission by ID:', error);
      throw error;
    }
  }

  // Find submissions with filters
  static async findAll(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        eventId, 
        gameId, 
        participantId, 
        status, 
        gameType,
        isFlagged
      } = options;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('submissions')
        .select(`
          *,
          events (id, title, event_code),
          games (id, title, type),
          users (id, first_name, last_name, email)
        `, { count: 'exact' })
        .eq('is_deleted', false);

      // Apply filters
      if (eventId) {
        query = query.eq('event_id', eventId);
      }
      if (gameId) {
        query = query.eq('game_id', gameId);
      }
      if (participantId) {
        query = query.eq('participant_id', participantId);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (gameType) {
        query = query.eq('game_type', gameType);
      }
      if (isFlagged !== undefined) {
        query = query.eq('is_flagged', isFlagged);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1)
        .order('submitted_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return {
        submissions: data.map(submission => new Submission(submission)),
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('Error finding submissions:', error);
      throw error;
    }
  }

  // Update submission
  async update(updateData) {
    try {
      const updateFields = {};
      
      if (updateData.textContent !== undefined) updateFields.text_content = updateData.textContent;
      if (updateData.mediaUrl !== undefined) updateFields.media_url = updateData.mediaUrl;
      if (updateData.mediaType !== undefined) updateFields.media_type = updateData.mediaType;
      if (updateData.location !== undefined) updateFields.location = updateData.location;
      if (updateData.answer !== undefined) updateFields.answer = updateData.answer;
      if (updateData.isCorrect !== undefined) updateFields.is_correct = updateData.isCorrect;
      if (updateData.pointsAwarded !== undefined) updateFields.points_awarded = updateData.pointsAwarded;
      if (updateData.bonusPoints !== undefined) updateFields.bonus_points = updateData.bonusPoints;
      if (updateData.bonusReason !== undefined) updateFields.bonus_reason = updateData.bonusReason;
      if (updateData.timeSpent !== undefined) updateFields.time_spent = updateData.timeSpent;
      if (updateData.status) updateFields.status = updateData.status;
      if (updateData.reviewedBy !== undefined) updateFields.reviewed_by = updateData.reviewedBy;
      if (updateData.reviewedAt !== undefined) updateFields.reviewed_at = updateData.reviewedAt;
      if (updateData.reviewNotes !== undefined) updateFields.review_notes = updateData.reviewNotes;
      if (updateData.voteData !== undefined) updateFields.vote_data = updateData.voteData;
      if (updateData.quizData !== undefined) updateFields.quiz_data = updateData.quizData;
      if (updateData.wordGameData !== undefined) updateFields.word_game_data = updateData.wordGameData;
      if (updateData.isFlagged !== undefined) updateFields.is_flagged = updateData.isFlagged;
      if (updateData.flagReason !== undefined) updateFields.flag_reason = updateData.flagReason;

      const { data, error } = await supabase
        .from('submissions')
        .update(updateFields)
        .eq('id', this.id)
        .select()
        .single();

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      // Update current instance
      Object.assign(this, new Submission(data));
      return this;
    } catch (error) {
      console.error('Error updating submission:', error);
      throw error;
    }
  }

  // Soft delete submission
  async delete() {
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ is_deleted: true })
        .eq('id', this.id);

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      this.isDeleted = true;
      return true;
    } catch (error) {
      console.error('Error deleting submission:', error);
      throw error;
    }
  }

  // Get total points (base + bonus)
  get totalPoints() {
    return this.pointsAwarded + this.bonusPoints;
  }

  // Approve submission
  async approve(reviewerId, points = null, bonusPoints = 0, notes = '') {
    try {
      const updateData = {
        status: 'approved',
        reviewedBy: reviewerId,
        reviewedAt: new Date().toISOString(),
        reviewNotes: notes
      };
      
      if (points !== null) {
        updateData.pointsAwarded = points;
      }
      
      if (bonusPoints > 0) {
        updateData.bonusPoints = bonusPoints;
      }
      
      return await this.update(updateData);
    } catch (error) {
      console.error('Error approving submission:', error);
      throw error;
    }
  }

  // Reject submission
  async reject(reviewerId, reason = '') {
    try {
      return await this.update({
        status: 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: new Date().toISOString(),
        reviewNotes: reason,
        pointsAwarded: 0,
        bonusPoints: 0
      });
    } catch (error) {
      console.error('Error rejecting submission:', error);
      throw error;
    }
  }

  // Flag submission
  async flag(reason = '') {
    try {
      return await this.update({
        isFlagged: true,
        flagReason: reason,
        status: 'flagged'
      });
    } catch (error) {
      console.error('Error flagging submission:', error);
      throw error;
    }
  }

  // Award bonus points
  async awardBonus(points, reason = '') {
    try {
      return await this.update({
        bonusPoints: this.bonusPoints + points,
        bonusReason: reason
      });
    } catch (error) {
      console.error('Error awarding bonus points:', error);
      throw error;
    }
  }



  // Get game analytics
  static async getGameAnalytics(gameId) {
    try {
      const { data, error } = await supabase.rpc('get_game_analytics', {
        game_id: gameId
      });

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data;
    } catch (error) {
      console.error('Error getting game analytics:', error);
      throw error;
    }
  }

  // Get submissions by game and participant
  static async findByGameAndParticipant(gameId, participantId) {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('game_id', gameId)
        .eq('participant_id', participantId)
        .eq('is_deleted', false)
        .order('submitted_at', { ascending: false });

      if (error) {
        throw new Error(handleSupabaseError(error));
      }

      return data.map(submission => new Submission(submission));
    } catch (error) {
      console.error('Error finding submissions by game and participant:', error);
      throw error;
    }
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,

      gameId: this.gameId,
      participantId: this.participantId,
      gameType: this.gameType,
      submissionType: this.submissionType,
      textContent: this.textContent,
      mediaUrl: this.mediaUrl,
      mediaType: this.mediaType,
      location: this.location,
      missionId: this.missionId,
      questionId: this.questionId,
      challengeId: this.challengeId,
      answer: this.answer,
      isCorrect: this.isCorrect,
      pointsAwarded: this.pointsAwarded,
      bonusPoints: this.bonusPoints,
      bonusReason: this.bonusReason,
      totalPoints: this.totalPoints,
      timeSpent: this.timeSpent,
      submittedAt: this.submittedAt,
      status: this.status,
      reviewedBy: this.reviewedBy,
      reviewedAt: this.reviewedAt,
      reviewNotes: this.reviewNotes,
      voteData: this.voteData,
      quizData: this.quizData,
      wordGameData: this.wordGameData,
      deviceInfo: this.deviceInfo,
      isFlagged: this.isFlagged,
      flagReason: this.flagReason,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Submission;