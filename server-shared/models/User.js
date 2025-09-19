const { supabase, supabaseAdmin } = require('../config/supabase');

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.firstName = data.firstName || data.first_name;
    this.lastName = data.lastName || data.last_name;
    this.role = data.role || 'participant';
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.emailVerified = data.emailVerified || data.email_verified || false;
    this.lastLoginAt = data.lastLoginAt || data.last_login;
    this.createdAt = data.createdAt || data.created_at;

    this.organizationName = data.organizationName || data.organization;
    this.organizationDescription = data.organizationDescription || data.organization_description;
  }

  static async findById(id) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // User not found
        }
        throw error;
      }

      return new User(data);
    } catch (error) {
      console.error('Error finding user by ID:', error);
      return null;
    }
  }

  static async findByEmail(email) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // User not found
        }
        throw error;
      }

      return new User(data);
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  static async create(userData) {
    try {
      const insertData = {
        id: userData.id,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role || 'participant',
        is_active: userData.isActive !== undefined ? userData.isActive : true,
        email_verified: userData.emailVerified || false,
        last_login: userData.lastLoginAt || new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      if (userData.organizationName !== undefined) {
        insertData.organization = userData.organizationName;
      }
      if (userData.organizationDescription !== undefined) {
        insertData.organization_description = userData.organizationDescription;
      }

      let { data, error } = await supabaseAdmin
        .from('users')
        .insert(insertData)
        .select()
        .single();

      // If schema cache doesn't know about organization_description, retry without it
      if (
        error &&
        error.code === 'PGRST204' &&
        typeof error.message === 'string' &&
        error.message.includes("organization_description")
      ) {
        console.warn("Schema cache missing 'organization_description'. Retrying insert without it. Consider running: NOTIFY pgrst, 'reload schema';");
        const retryInsert = { ...insertData };
        delete retryInsert.organization_description;

        const retry = await supabaseAdmin
          .from('users')
          .insert(retryInsert)
          .select()
          .single();

        data = retry.data;
        error = retry.error;
      }

      if (error) {
        throw error;
      }

      return new User(data);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const updateFields = {};
      
      if (updateData.firstName !== undefined) updateFields.first_name = updateData.firstName;
      if (updateData.lastName !== undefined) updateFields.last_name = updateData.lastName;
      if (updateData.role !== undefined) updateFields.role = updateData.role;
      if (updateData.isActive !== undefined) updateFields.is_active = updateData.isActive;
      if (updateData.emailVerified !== undefined) updateFields.email_verified = updateData.emailVerified;
      if (updateData.lastLoginAt !== undefined) updateFields.last_login = updateData.lastLoginAt;
      if (updateData.organizationName !== undefined) updateFields.organization = updateData.organizationName;
      if (updateData.organizationDescription !== undefined) updateFields.organization_description = updateData.organizationDescription;
      
      updateFields.updated_at = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updateFields)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new User(data);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async findAll(options = {}) {
    try {
      let query = supabaseAdmin.from('users').select('*');
      
      if (options.role) {
        query = query.eq('role', options.role);
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

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data.map(user => new User(user));
    } catch (error) {
      console.error('Error finding all users:', error);
      throw error;
    }
  }

  async save() {
    try {
      if (this.id) {
        // Update existing user
        return await User.update(this.id, this);
      } else {
        // Create new user
        return await User.create(this);
      }
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }

  async delete() {
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', this.id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

module.exports = User;