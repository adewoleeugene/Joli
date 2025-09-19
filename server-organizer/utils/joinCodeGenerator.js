const crypto = require('crypto');
const { supabase } = require('../config/supabase');

class JoinCodeGenerator {
  /**
   * Generate a random join code
   * @param {number} length - Length of the join code (default: 6)
   * @returns {string} - Generated join code
   */
  static generateCode(length = 6) {
    // Use alphanumeric characters excluding confusing ones (0, O, I, l, 1)
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Generate a unique join code that doesn't exist in the database
   * @param {number} length - Length of the join code (default: 6)
   * @param {number} maxAttempts - Maximum attempts to generate unique code (default: 10)
   * @returns {Promise<string>} - Unique join code
   * @throws {Error} - If unable to generate unique code after maxAttempts
   */
  static async generateUniqueCode(length = 6, maxAttempts = 10) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const code = this.generateCode(length);
      
      // Check if code already exists
      const isUnique = await this.isCodeUnique(code);
      
      if (isUnique) {
        return code;
      }
    }
    
    throw new Error(`Unable to generate unique join code after ${maxAttempts} attempts`);
  }

  /**
   * Check if a join code is unique (doesn't exist in database)
   * @param {string} code - Join code to check
   * @returns {Promise<boolean>} - True if code is unique, false otherwise
   */
  static async isCodeUnique(code) {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('id')
        .eq('join_code', code)
        .limit(1);

      if (error) {
        console.error('Error checking join code uniqueness:', error);
        throw error;
      }

      return data.length === 0;
    } catch (error) {
      console.error('Error in isCodeUnique:', error);
      throw error;
    }
  }

  /**
   * Validate join code format
   * @param {string} code - Join code to validate
   * @returns {boolean} - True if valid format, false otherwise
   */
  static isValidFormat(code) {
    if (!code || typeof code !== 'string') {
      return false;
    }

    // Check length (should be 6 characters)
    if (code.length !== 6) {
      return false;
    }

    // Check if contains only allowed characters
    const allowedChars = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/;
    return allowedChars.test(code);
  }

  /**
   * Find game by join code
   * @param {string} code - Join code to search for
   * @returns {Promise<Object|null>} - Game object if found, null otherwise
   */
  static async findGameByJoinCode(code) {
    try {
      if (!this.isValidFormat(code)) {
        return null;
      }

      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('join_code', code)
        .eq('status', 'active') // Only allow access to active games
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error finding game by join code:', error);
      return null;
    }
  }

  /**
   * Generate and assign join code to a game
   * @param {string} gameId - Game ID to assign join code to
   * @returns {Promise<string>} - Generated join code
   */
  static async assignJoinCodeToGame(gameId) {
    try {
      const joinCode = await this.generateUniqueCode();
      
      const { error } = await supabase
        .from('games')
        .update({ join_code: joinCode })
        .eq('id', gameId);

      if (error) {
        throw error;
      }

      return joinCode;
    } catch (error) {
      console.error('Error assigning join code to game:', error);
      throw error;
    }
  }

  /**
   * Remove join code from a game (disable access)
   * @param {string} gameId - Game ID to remove join code from
   * @returns {Promise<boolean>} - True if successful
   */
  static async removeJoinCodeFromGame(gameId) {
    try {
      const { error } = await supabase
        .from('games')
        .update({ join_code: null })
        .eq('id', gameId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error removing join code from game:', error);
      throw error;
    }
  }
}

module.exports = JoinCodeGenerator;