import { UserDao } from '../dao';
import { SelectUser } from '../db/external_schema';
import { logger } from '../utils/logger';

export class UserService {
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
}




