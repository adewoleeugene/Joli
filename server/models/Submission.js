const { v4: uuidv4 } = require('uuid');
const dataAccess = require('../utils/dataAccess');

class Submission {
  constructor(data) {
    this._id = data._id || data.id || uuidv4();

    this.game = data.game || data.game_id;
    this.participant = data.participant || data.participant_id;
    this.gameType = data.gameType || data.game_type;
    this.submissionType = data.submissionType || data.submission_type;
    this.textContent = data.textContent || data.text_content;
    this.mediaUrl = data.mediaUrl || data.media_url;
    this.mediaType = data.mediaType || data.media_type;
    this.location = data.location;
    this.missionId = data.missionId || data.mission_id;
    this.questionId = data.questionId || data.question_id;
    this.challengeId = data.challengeId || data.challenge_id;
    this.answer = data.answer;
    this.isCorrect = data.isCorrect || data.is_correct || null;
    this.pointsAwarded = data.pointsAwarded || data.points_awarded || 0;
    this.bonusPoints = data.bonusPoints || data.bonus_points || 0;
    this.bonusReason = data.bonusReason || data.bonus_reason;
    this.timeSpent = data.timeSpent || data.time_spent || null;
    this.submittedAt = data.submittedAt || data.submitted_at || new Date();
    this.status = data.status || 'pending';
    this.reviewedBy = data.reviewedBy || data.reviewed_by;
    this.reviewedAt = data.reviewedAt || data.reviewed_at;
    this.reviewNotes = data.reviewNotes || data.review_notes;
    this.voteData = data.voteData || data.vote_data;
    this.quizData = data.quizData || data.quiz_data || {
      answers: [],
      totalScore: 0,
      totalCorrect: 0,
      totalTime: 0
    };
    this.wordGameData = data.wordGameData || data.word_game_data || {
      word: null,
      guesses: [],
      isCompleted: false,
      attemptsUsed: 0
    };
    this.deviceInfo = data.deviceInfo || data.device_info;
    this.ipAddress = data.ipAddress || data.ip_address;
    this.isFlagged = data.isFlagged || data.is_flagged || false;
    this.flagReason = data.flagReason || data.flag_reason;
    this.isDeleted = data.isDeleted || data.is_deleted || false;
    this.createdAt = data.createdAt || data.created_at || new Date();
    this.updatedAt = data.updatedAt || data.updated_at || new Date();
  }

  // Static validation methods
  static validateSubmissionData(data) {
    const errors = [];
    
    if (!data.event) {
      errors.push('Event ID is required');
    }
    if (!data.game) {
      errors.push('Game ID is required');
    }
    if (!data.participant) {
      errors.push('Participant ID is required');
    }
    
    const validGameTypes = [
      'scavenger_hunt', 'dj_song_voting', 'guess_the_song', 'trivia',
      'hangman', 'word_scramble', 'creative_challenge', 'truth_or_dare'
    ];
    if (!data.gameType || !validGameTypes.includes(data.gameType)) {
      errors.push('Valid game type is required');
    }
    
    const validSubmissionTypes = ['text', 'photo', 'video', 'audio', 'location', 'vote', 'answer'];
    if (!data.submissionType || !validSubmissionTypes.includes(data.submissionType)) {
      errors.push('Valid submission type is required');
    }
    
    if (data.textContent && data.textContent.length > 1000) {
      errors.push('Text content must be 1000 characters or less');
    }
    
    if (data.answer && data.answer.length > 500) {
      errors.push('Answer must be 500 characters or less');
    }
    
    const validStatuses = ['pending', 'approved', 'rejected', 'flagged'];
    if (data.status && !validStatuses.includes(data.status)) {
      errors.push('Invalid status');
    }
    
    if (data.location) {
      if (data.location.latitude && (data.location.latitude < -90 || data.location.latitude > 90)) {
        errors.push('Latitude must be between -90 and 90');
      }
      if (data.location.longitude && (data.location.longitude < -180 || data.location.longitude > 180)) {
        errors.push('Longitude must be between -180 and 180');
      }
    }
    
    return errors;
  }

  static createSubmission(data) {
    const errors = Submission.validateSubmissionData(data);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    
    return new Submission(data);
  }

  // Instance methods
  get totalPoints() {
    return this.pointsAwarded + this.bonusPoints;
  }

  async approve(reviewerId, points = null, bonusPoints = 0, notes = '') {
    this.status = 'approved';
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    this.reviewNotes = notes;
    
    if (points !== null) {
      this.pointsAwarded = points;
    }
    
    if (bonusPoints > 0) {
      this.bonusPoints = bonusPoints;
    }
    
    return await this.save();
  }

  async reject(reviewerId, reason = '') {
    this.status = 'rejected';
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    this.reviewNotes = reason;
    this.pointsAwarded = 0;
    this.bonusPoints = 0;
    
    return await this.save();
  }

  async flag(reason = '') {
    this.isFlagged = true;
    this.flagReason = reason;
    this.status = 'flagged';
    
    return await this.save();
  }

  async awardBonus(points, reason = '') {
    this.bonusPoints += points;
    this.bonusReason = reason;
    
    return await this.save();
  }

  toJSON() {
    return {
      _id: this._id,
      event: this.event,
      game: this.game,
      participant: this.participant,
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
      ipAddress: this.ipAddress,
      isFlagged: this.isFlagged,
      flagReason: this.flagReason,
      isDeleted: this.isDeleted,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      totalPoints: this.totalPoints
    };
  }

  // Database operations
  static async create(submissionData) {
    const submission = Submission.createSubmission(submissionData);
    const supabaseData = Submission.convertToSupabaseFormat(submission.toJSON());
    const createdData = await dataAccess.submissions.create(supabaseData);
    return new Submission(createdData);
  }

  static async findById(id) {
    const submissionData = await dataAccess.submissions.findById(id);
    return submissionData ? new Submission(submissionData) : null;
  }

  static async findAll(filter = {}) {
    const supabaseFilter = Submission.convertFilterToSupabase(filter);
    const submissions = await dataAccess.submissions.findAll(supabaseFilter);
    return submissions.map(submission => new Submission(submission));
  }



  static async findByGame(gameId) {
    const submissions = await dataAccess.submissions.findAll({ game_id: gameId, is_deleted: false });
    return submissions.map(submission => new Submission(submission));
  }

  static async findByParticipant(participantId) {
    const submissions = await dataAccess.submissions.findAll({ participant_id: participantId, is_deleted: false });
    return submissions.map(submission => new Submission(submission));
  }

  static convertToSupabaseFormat(data) {
    return {
      id: data._id,

      game_id: data.game,
      participant_id: data.participant,
      game_type: data.gameType,
      submission_type: data.submissionType,
      text_content: data.textContent,
      media_url: data.mediaUrl,
      media_type: data.mediaType,
      location: data.location,
      mission_id: data.missionId,
      question_id: data.questionId,
      challenge_id: data.challengeId,
      answer: data.answer,
      is_correct: data.isCorrect,
      points_awarded: data.pointsAwarded,
      bonus_points: data.bonusPoints,
      bonus_reason: data.bonusReason,
      time_spent: data.timeSpent,
      submitted_at: data.submittedAt,
      status: data.status,
      reviewed_by: data.reviewedBy,
      reviewed_at: data.reviewedAt,
      review_notes: data.reviewNotes,
      vote_data: data.voteData,
      quiz_data: data.quizData,
      word_game_data: data.wordGameData,
      device_info: data.deviceInfo,
      ip_address: data.ipAddress,
      is_flagged: data.isFlagged,
      flag_reason: data.flagReason,
      is_deleted: data.isDeleted,
      created_at: data.createdAt,
      updated_at: data.updatedAt
    };
  }

  static convertFilterToSupabase(filter) {
    const supabaseFilter = {};

    if (filter.game) supabaseFilter.game_id = filter.game;
    if (filter.participant) supabaseFilter.participant_id = filter.participant;
    if (filter.gameType) supabaseFilter.game_type = filter.gameType;
    if (filter.submissionType) supabaseFilter.submission_type = filter.submissionType;
    if (filter.status) supabaseFilter.status = filter.status;
    if (filter.isDeleted !== undefined) supabaseFilter.is_deleted = filter.isDeleted;
    if (filter.isFlagged !== undefined) supabaseFilter.is_flagged = filter.isFlagged;
    return supabaseFilter;
  }



  static async getGameAnalytics(gameId) {
    const submissions = await dataAccess.submissions.findAll({ game_id: gameId, is_deleted: false });
    
    if (submissions.length === 0) {
      return {
        totalSubmissions: 0,
        approvedSubmissions: 0,
        averagePoints: 0,
        totalPoints: 0,
        averageTime: 0,
        uniqueParticipants: 0,
        approvalRate: 0
      };
    }
    
    const approvedSubmissions = submissions.filter(s => s.status === 'approved');
    const uniqueParticipants = new Set(submissions.map(s => s.participant)).size;
    const totalPoints = submissions.reduce((sum, s) => sum + s.pointsAwarded, 0);
    const totalTime = submissions.filter(s => s.timeSpent).reduce((sum, s) => sum + s.timeSpent, 0);
    const submissionsWithTime = submissions.filter(s => s.timeSpent).length;
    
    return {
      totalSubmissions: submissions.length,
      approvedSubmissions: approvedSubmissions.length,
      averagePoints: Math.round((totalPoints / submissions.length) * 100) / 100,
      totalPoints,
      averageTime: submissionsWithTime > 0 ? Math.round((totalTime / submissionsWithTime) * 100) / 100 : 0,
      uniqueParticipants,
      approvalRate: Math.round((approvedSubmissions.length / submissions.length) * 10000) / 100
    };
  }

  async update(updateData) {
    Object.assign(this, updateData);
    this.updatedAt = new Date();
    const supabaseData = Submission.convertToSupabaseFormat(this.toJSON());
    const updatedData = await dataAccess.submissions.update(this._id, supabaseData);
    if (updatedData) {
      Object.assign(this, new Submission(updatedData));
    }
    return this;
  }

  async delete() {
    this.isDeleted = true;
    this.updatedAt = new Date();
    const supabaseData = Submission.convertToSupabaseFormat(this.toJSON());
    await dataAccess.submissions.update(this._id, supabaseData);
    return this;
  }

  async save() {
    this.updatedAt = new Date();
    const supabaseData = Submission.convertToSupabaseFormat(this.toJSON());
    const updatedData = await dataAccess.submissions.update(this._id, supabaseData);
    if (updatedData) {
      Object.assign(this, new Submission(updatedData));
    }
    return this;
  }
}

module.exports = Submission;