const { v4: uuidv4 } = require('uuid');

// Supabase data access layer
class DataAccess {
  constructor() {
    // Don't initialize clients in constructor - use lazy initialization
  }

  // Get the appropriate client based on context
  getClient(useAdmin = false) {
    // Lazy initialization - get clients from global when needed
    const supabase = global.supabase;
    const supabaseAdmin = global.supabaseAdmin;
    
    if (!supabase || !supabaseAdmin) {
      throw new Error('Supabase clients not initialized. Make sure database connection is established.');
    }
    
    return useAdmin ? supabaseAdmin : supabase;
  }

  // Generic CRUD operations
  async create(table, data, useAdmin = true) {
    try {
      const client = this.getClient(useAdmin);
      const id = data.id || uuidv4();
      const timestamp = new Date().toISOString();
      
      const newItem = {
        ...data,
        id,
        created_at: timestamp,
        updated_at: timestamp
      };

      const { data: result, error } = await client
        .from(table)
        .insert([newItem])
        .select()
        .single();

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      return result;
    } catch (error) {
      throw new Error(`Error creating ${table}: ${error.message}`);
    }
  }

  async find(table, filter = {}, options = {}, useAdmin = false) {
    try {
      const client = this.getClient(useAdmin);
      let query = client.from(table).select(options.select || '*');

      // Apply filters
      Object.entries(filter).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      // Apply sorting
      if (options.sort) {
        Object.entries(options.sort).forEach(([field, order]) => {
          query = query.order(field, { ascending: order === 1 });
        });
      }

      // Apply pagination
      if (options.skip || options.limit) {
        const from = options.skip || 0;
        const to = options.limit ? from + options.limit - 1 : undefined;
        if (to !== undefined) {
          query = query.range(from, to);
        }
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Error finding ${table}: ${error.message}`);
    }
  }

  async findById(table, id, useAdmin = false) {
    try {
      const client = this.getClient(useAdmin);
      const { data, error } = await client
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Supabase error: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      throw new Error(`Error finding ${table} by ID: ${error.message}`);
    }
  }

  async findOne(table, filter = {}, useAdmin = false) {
    try {
      const results = await this.find(table, filter, { limit: 1 }, useAdmin);
      return results[0] || null;
    } catch (error) {
      throw new Error(`Error finding one ${table}: ${error.message}`);
    }
  }

  async count(table, filter = {}, useAdmin = false) {
    try {
      const client = this.getClient(useAdmin);
      let query = client.from(table).select('*', { count: 'exact', head: true });

      // Apply filters
      Object.entries(filter).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { count, error } = await query;

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      throw new Error(`Error counting ${table}: ${error.message}`);
    }
  }

  // Advanced query with joins
  async findWithJoin(table, joins = [], filter = {}, options = {}, useAdmin = false) {
    try {
      const client = this.getClient(useAdmin);
      let selectClause = '*';
      
      if (joins.length > 0) {
        const joinClauses = joins.map(join => {
          if (typeof join === 'string') {
            return join;
          }
          return `${join.table}(${join.select || '*'})`;
        });
        selectClause = `*, ${joinClauses.join(', ')}`;
      }
      
      let query = client.from(table).select(selectClause);

      // Apply filters
      Object.entries(filter).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      // Apply sorting
      if (options.sort) {
        Object.entries(options.sort).forEach(([field, order]) => {
          query = query.order(field, { ascending: order === 1 });
        });
      }

      // Apply pagination
      if (options.skip || options.limit) {
        const from = options.skip || 0;
        const to = options.limit ? from + options.limit - 1 : undefined;
        if (to !== undefined) {
          query = query.range(from, to);
        }
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Error finding ${table} with joins: ${error.message}`);
    }
  }

  async updateById(table, id, updateData, useAdmin = true) {
    try {
      const client = this.getClient(useAdmin);
      const { data, error } = await client
        .from(table)
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Supabase error: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      throw new Error(`Error updating ${table}: ${error.message}`);
    }
  }

  async deleteById(table, id, useAdmin = true) {
    try {
      const client = this.getClient(useAdmin);
      const { data, error } = await client
        .from(table)
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Supabase error: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      throw new Error(`Error deleting ${table}: ${error.message}`);
    }
  }

  // Specific methods for different collections
  
  // Users
  async createUser(userData) {
    return this.create('users', userData);
  }

  async findUserByEmail(email) {
    return this.findOne('users', { email });
  }

  async findUserById(id) {
    return this.findById('users', id);
  }

  async updateUser(id, updateData) {
    return this.updateById('users', id, updateData);
  }

  async findAllUsers(filter = {}) {
    return this.find('users', filter);
  }



  // Games
  async createGame(gameData) {
    return this.create('games', gameData);
  }

  async findAllGames(filter = {}) {
    return this.find('games', filter);
  }

  async findGameById(id) {
    return this.findById('games', id);
  }

  async updateGame(id, updateData) {
    return this.updateById('games', id, updateData);
  }

  async deleteGame(id) {
    return this.deleteById('games', id);
  }

  // Submissions
  async createSubmission(submissionData) {
    return this.create('submissions', submissionData);
  }

  async findAllSubmissions(filter = {}) {
    return this.find('submissions', filter);
  }

  async findSubmissionById(id) {
    return this.findById('submissions', id);
  }

  async updateSubmission(id, updateData) {
    return this.updateById('submissions', id, updateData);
  }

  async deleteSubmission(id) {
    return this.deleteById('submissions', id);
  }



  // Notifications
  async createNotification(notificationData) {
    return this.create('notifications', notificationData);
  }

  async findUserNotifications(userId, unreadOnly = false) {
    const filter = { user_id: userId };
    if (unreadOnly) {
      filter.read = false;
    }
    return this.find('notifications', filter, { 
      sort: { created_at: -1 } 
    });
  }

  async markNotificationAsRead(id) {
    return this.updateById('notifications', id, { read: true });
  }
}

module.exports = new DataAccess();