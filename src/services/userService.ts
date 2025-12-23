import { UserDao, CreateUser, UpdateUser } from '../dao/userDao';
import { SelectUser } from '../db/schema';
import { logger } from '../utils/logger';
import { AuthService } from './authService';

export class UserService {
  /**
   * Create a new user
   */
  static async createUser(userData: CreateUser): Promise<SelectUser | null> {
    try {
      // Check if user already exists
      const existingUser = await UserDao.findByEmail(userData.email);
      if (existingUser) {
        logger.warn(`Attempt to create user with existing email: ${userData.email}`);
        throw new Error('User with this email already exists');
      }

      // Hash the password before saving
      const hashedPassword = await AuthService.hashPassword(userData.password);
      const userToCreate = {
        ...userData,
        password: hashedPassword,
      };

      const user = await UserDao.create(userToCreate);
      if (user) {
        logger.info(`User service: Created user ${user.email}`);
      }
      return user;
    } catch (error) {
      logger.error('UserService error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user information
   */
  static async updateUser(id: string, userData: UpdateUser): Promise<SelectUser | null> {
    try {
      // Check if user exists
      const existingUser = await UserDao.findById(id);
      if (!existingUser) {
        logger.warn(`Attempt to update non-existent user: ${id}`);
        throw new Error('User not found');
      }

      // If email is being updated, check for conflicts
      if (userData.email && userData.email !== existingUser.email) {
        const emailExists = await UserDao.existsByEmail(userData.email);
        if (emailExists) {
          logger.warn(`Attempt to update user ${id} with existing email: ${userData.email}`);
          throw new Error('Email already in use by another user');
        }
      }

      // If password is being updated, hash it
      const dataToUpdate = { ...userData };
      if (userData.password) {
        dataToUpdate.password = await AuthService.hashPassword(userData.password);
      }

      const updatedUser = await UserDao.update(id, dataToUpdate);
      if (updatedUser) {
        logger.info(`User service: Updated user ${id}`);
      }
      return updatedUser;
    } catch (error) {
      logger.error('UserService error updating user:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findUserById(id: string): Promise<SelectUser | null> {
    try {
      return await UserDao.findById(id);
    } catch (error) {
      logger.error('UserService error finding user by ID:', error);
      throw new Error('Failed to find user');
    }
  }

  /**
   * Find user by email
   */
  static async findUserByEmail(email: string): Promise<SelectUser | null> {
    try {
      return await UserDao.findByEmail(email);
    } catch (error) {
      logger.error('UserService error finding user by email:', error);
      throw new Error('Failed to find user');
    }
  }

  /**
   * Delete user by ID
   */
  static async deleteUser(id: string): Promise<boolean> {
    try {
      // Check if user exists
      const existingUser = await UserDao.findById(id);
      if (!existingUser) {
        logger.warn(`Attempt to delete non-existent user: ${id}`);
        return false;
      }

      const deleted = await UserDao.deleteById(id);
      if (deleted) {
        logger.info(`User service: Deleted user ${id}`);
      }
      return deleted;
    } catch (error) {
      logger.error('UserService error deleting user:', error);
      throw error;
    }
  }

  /**
   * Check if user exists by email
   */
  static async userExistsByEmail(email: string): Promise<boolean> {
    try {
      return await UserDao.existsByEmail(email);
    } catch (error) {
      logger.error('UserService error checking user existence:', error);
      return false;
    }
  }

  /**
   * Get user without password (safe for responses)
   */
  static async findUserByIdSafe(id: string): Promise<Omit<SelectUser, 'password'> | null> {
    try {
      const user = await UserDao.findById(id);
      if (!user) return null;

      // Remove password from response
      const { password, ...safeUser } = user;
      return safeUser;
    } catch (error) {
      logger.error('UserService error finding user safely:', error);
      throw new Error('Failed to find user');
    }
  }

  /**
   * Get user by email without password (safe for responses)
   */
  static async findUserByEmailSafe(email: string): Promise<Omit<SelectUser, 'password'> | null> {
    try {
      const user = await UserDao.findByEmail(email);
      if (!user) return null;

      // Remove password from response
      const { password, ...safeUser } = user;
      return safeUser;
    } catch (error) {
      logger.error('UserService error finding user by email safely:', error);
      throw new Error('Failed to find user');
    }
  }

  /**
   * Validate user data
   */
  static validateUserData(userData: Partial<CreateUser>): string[] {
    const errors: string[] = [];

    if (userData.email) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;      
      if (!emailRegex.test(userData.email)) {
        errors.push('Invalid email format');
      }
    }

    if (userData.password) {
      if (userData.password.length < 8) {
        errors.push('Password must be at least 8 characters long');
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(userData.password)) {
        errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      }
    }
    console.log('errors', errors);
    return errors;
  }
}




