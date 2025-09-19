const { v4: uuidv4 } = require('uuid');
const dataAccess = require('../utils/dataAccess');

class Game {
  constructor(data) {
    this._id = data._id || data.id || uuidv4();
    this.title = data.title;
    this.description = data.description;
    this.type = data.type;
    this.organizerId = data.organizerId || data.organizer_id;
    this.creator = data.creator || data.creator_id;
    this.status = data.status || 'draft';
    this.order = data.order || 0;
    this.pointsPerCorrect = data.pointsPerCorrect || data.points_per_correct || 10;
    this.timeLimit = data.timeLimit || data.time_limit || null;
    this.missions = data.missions || [];
    this.playlist = data.playlist || {
      spotifyPlaylistId: null,
      appleMusicPlaylistId: null,
      songs: [],
      currentSong: 0,
      voteCooldown: 300
    };
    this.questions = data.questions || [];
    this.words = data.words || [];
    this.hangmanSettings = data.hangmanSettings || data.hangman_settings || {
      maxGuesses: 6,
      showHints: true,
      timePerWord: null
    };
    this.scrambledWords = data.scrambledWords || data.scrambled_words || [];
    this.challenges = data.challenges || [];
    this.settings = data.settings || {
      allowSkip: false,
      shuffleQuestions: false,
      showCorrectAnswers: true,
      allowRetries: false,
      bonusPointsEnabled: true,
      speedBonusEnabled: false
    };
    this.analytics = data.analytics || {
      totalPlayers: 0,
      totalSubmissions: 0,
      averageScore: 0,
      completionRate: 0,
      averageTime: 0
    };
    this.isDeleted = data.isDeleted || data.is_deleted || false;
    this.createdAt = data.createdAt || data.created_at || new Date();
    this.updatedAt = data.updatedAt || data.updated_at || new Date();
  }

  // Static validation methods
  static validateGameData(data) {
    const errors = [];
    
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Title is required');
    }
    if (data.title && data.title.length > 100) {
      errors.push('Title must be 100 characters or less');
    }
    if (data.description && data.description.length > 500) {
      errors.push('Description must be 500 characters or less');
    }
    
    const validTypes = [
      'scavenger_hunt', 'dj_song_voting', 'guess_the_song', 'trivia',
      'hangman', 'word_scramble', 'creative_challenge', 'truth_or_dare'
    ];
    if (!data.type || !validTypes.includes(data.type)) {
      errors.push('Valid game type is required');
    }
    
    if (!data.event) {
      errors.push('Event ID is required');
    }
    if (!data.creator) {
      errors.push('Creator ID is required');
    }
    
    const validStatuses = ['draft', 'active', 'paused', 'completed'];
    if (data.status && !validStatuses.includes(data.status)) {
      errors.push('Invalid status');
    }
    
    return errors;
  }

  static createGame(data) {
    const errors = Game.validateGameData(data);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    
    return new Game({
      ...data,
      title: data.title.trim()
    });
  }

  // Instance methods
  get totalPossiblePoints() {
    switch (this.type) {
      case 'scavenger_hunt':
        return this.missions.reduce((total, mission) => total + mission.points, 0);
      case 'trivia':
      case 'guess_the_song':
        return this.questions.reduce((total, question) => total + question.points, 0);
      case 'word_scramble':
        return this.scrambledWords.reduce((total, word) => total + word.points, 0);
      case 'creative_challenge':
      case 'truth_or_dare':
        return this.challenges.reduce((total, challenge) => total + challenge.points, 0);
      default:
        return this.pointsPerCorrect;
    }
  }

  getNextItem(currentIndex = 0) {
    switch (this.type) {
      case 'scavenger_hunt':
        return this.missions[currentIndex] || null;
      case 'trivia':
      case 'guess_the_song':
        return this.questions[currentIndex] || null;
      case 'hangman':
        return this.words[currentIndex] || null;
      case 'word_scramble':
        return this.scrambledWords[currentIndex] || null;
      case 'creative_challenge':
      case 'truth_or_dare':
        return this.challenges[currentIndex] || null;
      default:
        return null;
    }
  }

  calculateScore(answers, timeSpent = null) {
    let score = 0;
    let correctAnswers = 0;
    
    switch (this.type) {
      case 'trivia':
      case 'guess_the_song':
        this.questions.forEach((question, index) => {
          if (answers[index] && answers[index].toLowerCase() === question.correctAnswer.toLowerCase()) {
            score += question.points;
            correctAnswers++;
            
            // Speed bonus if enabled
            if (this.settings.speedBonusEnabled && timeSpent && timeSpent[index]) {
              const timeBonus = Math.max(0, question.timeLimit - timeSpent[index]) * 0.1;
              score += Math.floor(timeBonus);
            }
          }
        });
        break;
      default:
        score = this.pointsPerCorrect;
    }
    
    return { score, correctAnswers };
  }

  updateAnalytics(newData) {
    this.analytics = { ...this.analytics, ...newData };
    this.updatedAt = new Date();
  }

  toJSON() {
    return {
      _id: this._id,
      title: this.title,
      description: this.description,
      type: this.type,
      event: this.event,
      creator: this.creator,
      status: this.status,
      order: this.order,
      pointsPerCorrect: this.pointsPerCorrect,
      timeLimit: this.timeLimit,
      missions: this.missions,
      playlist: this.playlist,
      questions: this.questions,
      words: this.words,
      hangmanSettings: this.hangmanSettings,
      scrambledWords: this.scrambledWords,
      challenges: this.challenges,
      settings: this.settings,
      analytics: this.analytics,
      isDeleted: this.isDeleted,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      totalPossiblePoints: this.totalPossiblePoints
    };
  }

  // Database operations
  static async create(gameData) {
    const game = Game.createGame(gameData);
    const supabaseData = game.toSupabaseFormat();
    const createdGame = await dataAccess.games.create(supabaseData);
    return new Game(createdGame);
  }

  static async findById(id) {
    const gameData = await dataAccess.games.findById(id);
    return gameData ? new Game(gameData) : null;
  }

  static async findAll(filter = {}) {
    const supabaseFilter = Game.convertFilterToSupabase(filter);
    const games = await dataAccess.games.findAll(supabaseFilter);
    return games.map(game => new Game(game));
  }



  static async findByCreator(creatorId) {
    const games = await dataAccess.games.findAll({ creator_id: creatorId, is_deleted: false });
    return games.map(game => new Game(game));
  }

  static convertFilterToSupabase(filter) {
    const supabaseFilter = {};
    if (filter.organizerId) supabaseFilter.organizer_id = filter.organizerId;
    if (filter.creator) supabaseFilter.creator_id = filter.creator;
    if (filter.isDeleted !== undefined) supabaseFilter.is_deleted = filter.isDeleted;
    if (filter.status) supabaseFilter.status = filter.status;
    if (filter.type) supabaseFilter.type = filter.type;
    return supabaseFilter;
  }

  toSupabaseFormat() {
    return {
      id: this._id,
      title: this.title,
      description: this.description,
      type: this.type,
      organizer_id: this.organizerId,
      creator_id: this.creator,
      status: this.status,
      order: this.order,
      points_per_correct: this.pointsPerCorrect,
      time_limit: this.timeLimit,
      missions: this.missions,
      playlist: this.playlist,
      questions: this.questions,
      words: this.words,
      hangman_settings: this.hangmanSettings,
      scrambled_words: this.scrambledWords,
      challenges: this.challenges,
      settings: this.settings,
      analytics: this.analytics,
      is_deleted: this.isDeleted,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  async update(updateData) {
    Object.assign(this, updateData);
    this.updatedAt = new Date();
    const supabaseData = this.toSupabaseFormat();
    const updatedGame = await dataAccess.games.update(this._id, supabaseData);
    if (updatedGame) {
      Object.assign(this, new Game(updatedGame));
    }
    return this;
  }

  async delete() {
    this.isDeleted = true;
    this.updatedAt = new Date();
    const supabaseData = this.toSupabaseFormat();
    await dataAccess.games.update(this._id, supabaseData);
    return this;
  }

  async save() {
    this.updatedAt = new Date();
    const supabaseData = this.toSupabaseFormat();
    const savedGame = await dataAccess.games.update(this._id, supabaseData);
    if (savedGame) {
      Object.assign(this, new Game(savedGame));
    }
    return this;
  }
}

module.exports = Game;