const bcrypt = require('bcryptjs');
const dataAccess = require('../utils/dataAccess');

class User {
  constructor(userData) {
    this.id = userData.id;
    this.email = userData.email;
    this.password = userData.password;
    this.firstName = userData.first_name || userData.firstName;
    this.lastName = userData.last_name || userData.lastName;
    this.role = userData.role || 'participant';
    this.profileImage = userData.profile_image || userData.profileImage;
    this.isActive = userData.is_active !== undefined ? userData.is_active : userData.isActive !== undefined ? userData.isActive : true;
    this.createdAt = userData.created_at || userData.createdAt;
    this.updatedAt = userData.updated_at || userData.updatedAt;
  }

  // Validation methods
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password) {
    return password && password.length >= 6;
  }

  static validateRole(role) {
    const validRoles = ['organizer', 'participant'];
    return validRoles.includes(role);
  }

  // Hash password
  static async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare password
  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Database operations
  static async create(userData) {
    // Validate required fields
    if (!userData.email || !User.validateEmail(userData.email)) {
      throw new Error('Valid email is required');
    }
    
    if (!userData.password || !User.validatePassword(userData.password)) {
      throw new Error('Password must be at least 6 characters long');
    }
    
    if (!userData.firstName || !userData.lastName) {
      throw new Error('First name and last name are required');
    }
    
    if (userData.role && !User.validateRole(userData.role)) {
      throw new Error('Invalid role specified');
    }

    // Check if user already exists
    const existingUser = await dataAccess.findUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await User.hashPassword(userData.password);
    
    // Create user data with Supabase column names
    const newUserData = {
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      first_name: userData.firstName,
      last_name: userData.lastName,
      role: userData.role || 'participant',
      profile_image: userData.profileImage || null,
      is_active: true
    };

    const createdUser = await dataAccess.createUser(newUserData);
    return new User(createdUser);
  }

  static async findById(id) {
    const userData = await dataAccess.findUserById(id);
    return userData ? new User(userData) : null;
  }

  static async findByEmail(email) {
    const userData = await dataAccess.findUserByEmail(email.toLowerCase());
    return userData ? new User(userData) : null;
  }

  static async findAll(filter = {}) {
    const users = await dataAccess.findAllUsers(filter);
    return users.map(userData => new User(userData));
  }

  static async authenticate(email, password) {
    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    const isValidPassword = await User.comparePassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    return user;
  }

  async update(updateData) {
    // Validate email if being updated
    if (updateData.email && !User.validateEmail(updateData.email)) {
      throw new Error('Valid email is required');
    }
    
    // Validate password if being updated
    if (updateData.password && !User.validatePassword(updateData.password)) {
      throw new Error('Password must be at least 6 characters long');
    }
    
    // Validate role if being updated
    if (updateData.role && !User.validateRole(updateData.role)) {
      throw new Error('Invalid role specified');
    }

    // Convert to Supabase column names
    const supabaseUpdateData = {};
    if (updateData.email) supabaseUpdateData.email = updateData.email.toLowerCase();
    if (updateData.firstName) supabaseUpdateData.first_name = updateData.firstName;
    if (updateData.lastName) supabaseUpdateData.last_name = updateData.lastName;
    if (updateData.role) supabaseUpdateData.role = updateData.role;
    if (updateData.profileImage !== undefined) supabaseUpdateData.profile_image = updateData.profileImage;
    if (updateData.isActive !== undefined) supabaseUpdateData.is_active = updateData.isActive;

    // Hash password if being updated
    if (updateData.password) {
      supabaseUpdateData.password = await User.hashPassword(updateData.password);
    }

    const updatedUser = await dataAccess.updateUser(this.id, supabaseUpdateData);
    if (updatedUser) {
      Object.assign(this, new User(updatedUser));
    }
    return this;
  }

  async delete() {
    return await dataAccess.deleteById('users', this.id);
  }

  // Utility methods
  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }

  getFullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  isOrganizer() {
    return this.role === 'organizer';
  }

  isParticipant() {
    return this.role === 'participant';
  }
}

module.exports = User;