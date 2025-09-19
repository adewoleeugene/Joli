/**
 * Join Code Cache Utility
 * Manages persistent storage of join codes for the entire game lifecycle
 * Codes persist until the game is explicitly deleted
 */

interface CacheEntry {
  joinCode: string;
  timestamp: string;
  gameStatus: 'draft' | 'active' | 'paused' | 'completed' | 'scheduled';
  lastUpdated: string;
}

interface JoinCodeCacheData {
  [gameId: string]: CacheEntry;
}

const JOIN_CODE_CACHE_KEY = 'joli_join_codes_persistent';

class JoinCodeCache {
  /**
   * Get cached join code for a game
   * @param {string} gameId - Game ID
   * @returns {string|null} - Cached join code or null if not found
   */
  static getCachedJoinCode(gameId: string): string | null {
    try {
      const cache = this.getCache();
      const entry = cache[gameId];
      
      if (!entry) {
        return null;
      }
      
      // No expiry - codes persist for entire game lifecycle
      return entry.joinCode;
    } catch (error) {
      console.error('Error getting cached join code:', error);
      return null;
    }
  }
  
  /**
   * Cache a join code for a game
   * @param {string} gameId - Game ID
   * @param {string} joinCode - Join code to cache
   * @param {string} gameStatus - Current game status (optional, defaults to 'draft')
   */
  static setCachedJoinCode(gameId: string, joinCode: string, gameStatus: 'draft' | 'active' | 'paused' | 'completed' | 'scheduled' = 'draft'): void {
    try {
      const cache = this.getCache();
      const now = new Date().toISOString();
      
      cache[gameId] = {
        joinCode,
        timestamp: now,
        gameStatus,
        lastUpdated: now
      };
      
      localStorage.setItem(JOIN_CODE_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error caching join code:', error);
    }
  }
  
  /**
   * Remove cached join code for a game
   * @param {string} gameId - Game ID
   */
  static removeCachedJoinCode(gameId: string): void {
    try {
      const cache = this.getCache();
      delete cache[gameId];
      localStorage.setItem(JOIN_CODE_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error removing cached join code:', error);
    }
  }
  
  /**
   * Clear all cached join codes
   */
  static clearCache(): void {
    try {
      localStorage.removeItem(JOIN_CODE_CACHE_KEY);
    } catch (error) {
      console.error('Error clearing join code cache:', error);
    }
  }
  
  /**
   * Get the entire cache object
   * @returns {Object} - Cache object
   */
  static getCache(): JoinCodeCacheData {
    try {
      const cacheStr = localStorage.getItem(JOIN_CODE_CACHE_KEY);
      return cacheStr ? JSON.parse(cacheStr) : {};
    } catch (error) {
      console.error('Error parsing join code cache:', error);
      return {};
    }
  }
  
  /**
   * Check if a join code is cached for a game
   * @param {string} gameId - Game ID
   * @returns {boolean} - True if cached
   */
  static hasCachedJoinCode(gameId: string): boolean {
    return this.getCachedJoinCode(gameId) !== null;
  }
  
  /**
   * Update game status in cache
   * @param {string} gameId - Game ID
   * @param {string} gameStatus - New game status
   */
  static updateGameStatus(gameId: string, gameStatus: 'draft' | 'active' | 'paused' | 'completed' | 'scheduled'): void {
    try {
      const cache = this.getCache();
      const entry = cache[gameId];
      
      if (entry) {
        entry.gameStatus = gameStatus;
        entry.lastUpdated = new Date().toISOString();
        localStorage.setItem(JOIN_CODE_CACHE_KEY, JSON.stringify(cache));
      }
    } catch (error) {
      console.error('Error updating game status in cache:', error);
    }
  }
  
  /**
   * Remove cached join code when game is deleted
   * This is the only way cached codes should be removed
   * @param {string} gameId - Game ID
   */
  static removeGameFromCache(gameId: string): void {
    try {
      const cache = this.getCache();
      delete cache[gameId];
      localStorage.setItem(JOIN_CODE_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error removing game from cache:', error);
    }
  }
  
  /**
   * Sync cached join code with game data
   * If game has a join code but cache doesn't, cache it
   * If cache has a join code but game doesn't, use cached version
   * @param {any} game - Game object
   * @returns {any} - Game object with persistent join code
   */
  static syncJoinCode(game: any): any {
    if (!game || !game.id) {
      return game;
    }
    
    const cachedJoinCode = this.getCachedJoinCode(game.id);
    const gameStatus = game.status || 'draft';
    
    if (cachedJoinCode && !game.joinCode) {
      // Use cached join code if game doesn't have one
      this.updateGameStatus(game.id, gameStatus);
      return { ...game, joinCode: cachedJoinCode };
    } else if (game.joinCode && !cachedJoinCode) {
      // Cache the join code if not already cached
      this.setCachedJoinCode(game.id, game.joinCode, gameStatus);
    } else if (game.joinCode && cachedJoinCode) {
      // Update game status in cache if both exist
      this.updateGameStatus(game.id, gameStatus);
    }
    
    return game;
  }
}

export default JoinCodeCache;