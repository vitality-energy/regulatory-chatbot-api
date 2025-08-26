import { UserService } from '../services/userService';
import { UserDao } from '../dao/userDao';
import { logger } from '../utils/logger';

// Mock dependencies
jest.mock('../dao/userDao');
jest.mock('../utils/logger');

const mockedUserDao = UserDao as jest.Mocked<typeof UserDao>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('UserService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateUserData = {
    email: 'test@example.com',
    password: 'hashedPassword',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      mockedUserDao.findByEmail.mockResolvedValue(null);
      mockedUserDao.create.mockResolvedValue(mockUser);

      const result = await UserService.createUser(mockCreateUserData);

      expect(mockedUserDao.findByEmail).toHaveBeenCalledWith(mockCreateUserData.email);
      expect(mockedUserDao.create).toHaveBeenCalledWith(mockCreateUserData);
      expect(mockedLogger.info).toHaveBeenCalledWith(`User service: Created user ${mockUser.email}`);
      expect(result).toEqual(mockUser);
    });

    it('should throw error when user already exists', async () => {
      mockedUserDao.findByEmail.mockResolvedValue(mockUser);

      await expect(UserService.createUser(mockCreateUserData)).rejects.toThrow('User with this email already exists');
      expect(mockedLogger.warn).toHaveBeenCalledWith(`Attempt to create user with existing email: ${mockCreateUserData.email}`);
    });

    it('should handle DAO errors', async () => {
      const error = new Error('Database error');
      mockedUserDao.findByEmail.mockRejectedValue(error);

      await expect(UserService.createUser(mockCreateUserData)).rejects.toThrow('Database error');
      expect(mockedLogger.error).toHaveBeenCalledWith('UserService error creating user:', error);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userId = 'user-123';
      const updateData = { email: 'updated@example.com' };
      const updatedUser = { ...mockUser, ...updateData };

      mockedUserDao.findById.mockResolvedValue(mockUser);
      mockedUserDao.existsByEmail.mockResolvedValue(false);
      mockedUserDao.update.mockResolvedValue(updatedUser);

      const result = await UserService.updateUser(userId, updateData);

      expect(mockedUserDao.findById).toHaveBeenCalledWith(userId);
      expect(mockedUserDao.existsByEmail).toHaveBeenCalledWith(updateData.email);
      expect(mockedUserDao.update).toHaveBeenCalledWith(userId, updateData);
      expect(mockedLogger.info).toHaveBeenCalledWith(`User service: Updated user ${userId}`);
      expect(result).toEqual(updatedUser);
    });

    it('should throw error when user not found', async () => {
      const userId = 'non-existent-user';
      const updateData = { email: 'updated@example.com' };

      mockedUserDao.findById.mockResolvedValue(null);

      await expect(UserService.updateUser(userId, updateData)).rejects.toThrow('User not found');
      expect(mockedLogger.warn).toHaveBeenCalledWith(`Attempt to update non-existent user: ${userId}`);
    });

    it('should throw error when email already exists', async () => {
      const userId = 'user-123';
      const updateData = { email: 'existing@example.com' };

      mockedUserDao.findById.mockResolvedValue(mockUser);
      mockedUserDao.existsByEmail.mockResolvedValue(true);

      await expect(UserService.updateUser(userId, updateData)).rejects.toThrow('Email already in use by another user');
      expect(mockedLogger.warn).toHaveBeenCalledWith(`Attempt to update user ${userId} with existing email: ${updateData.email}`);
    });

    it('should not check email existence when email is not being updated', async () => {
      const userId = 'user-123';
      const updateData = { password: 'newPassword' };
      const updatedUser = { ...mockUser, ...updateData };

      mockedUserDao.findById.mockResolvedValue(mockUser);
      mockedUserDao.update.mockResolvedValue(updatedUser);

      const result = await UserService.updateUser(userId, updateData);

      expect(mockedUserDao.existsByEmail).not.toHaveBeenCalled();
      expect(result).toEqual(updatedUser);
    });
  });

  describe('findUserById', () => {
    it('should find user by ID successfully', async () => {
      const userId = 'user-123';

      mockedUserDao.findById.mockResolvedValue(mockUser);

      const result = await UserService.findUserById(userId);

      expect(mockedUserDao.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it('should handle DAO errors', async () => {
      const userId = 'user-123';
      const error = new Error('Database error');

      mockedUserDao.findById.mockRejectedValue(error);

      await expect(UserService.findUserById(userId)).rejects.toThrow('Failed to find user');
      expect(mockedLogger.error).toHaveBeenCalledWith('UserService error finding user by ID:', error);
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email successfully', async () => {
      const email = 'test@example.com';

      mockedUserDao.findByEmail.mockResolvedValue(mockUser);

      const result = await UserService.findUserByEmail(email);

      expect(mockedUserDao.findByEmail).toHaveBeenCalledWith(email);
      expect(result).toEqual(mockUser);
    });

    it('should handle DAO errors', async () => {
      const email = 'test@example.com';
      const error = new Error('Database error');

      mockedUserDao.findByEmail.mockRejectedValue(error);

      await expect(UserService.findUserByEmail(email)).rejects.toThrow('Failed to find user');
      expect(mockedLogger.error).toHaveBeenCalledWith('UserService error finding user by email:', error);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const userId = 'user-123';

      mockedUserDao.findById.mockResolvedValue(mockUser);
      mockedUserDao.deleteById.mockResolvedValue(true);

      const result = await UserService.deleteUser(userId);

      expect(mockedUserDao.findById).toHaveBeenCalledWith(userId);
      expect(mockedUserDao.deleteById).toHaveBeenCalledWith(userId);
      expect(mockedLogger.info).toHaveBeenCalledWith(`User service: Deleted user ${userId}`);
      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      const userId = 'non-existent-user';

      mockedUserDao.findById.mockResolvedValue(null);

      const result = await UserService.deleteUser(userId);

      expect(mockedLogger.warn).toHaveBeenCalledWith(`Attempt to delete non-existent user: ${userId}`);
      expect(mockedUserDao.deleteById).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle DAO errors', async () => {
      const userId = 'user-123';
      const error = new Error('Database error');

      mockedUserDao.findById.mockRejectedValue(error);

      await expect(UserService.deleteUser(userId)).rejects.toThrow('Database error');
      expect(mockedLogger.error).toHaveBeenCalledWith('UserService error deleting user:', error);
    });
  });

  describe('userExistsByEmail', () => {
    it('should return true when user exists', async () => {
      const email = 'test@example.com';

      mockedUserDao.existsByEmail.mockResolvedValue(true);

      const result = await UserService.userExistsByEmail(email);

      expect(mockedUserDao.existsByEmail).toHaveBeenCalledWith(email);
      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      const email = 'nonexistent@example.com';

      mockedUserDao.existsByEmail.mockResolvedValue(false);

      const result = await UserService.userExistsByEmail(email);

      expect(result).toBe(false);
    });

    it('should handle DAO errors', async () => {
      const email = 'test@example.com';
      const error = new Error('Database error');

      mockedUserDao.existsByEmail.mockRejectedValue(error);

      const result = await UserService.userExistsByEmail(email);

      expect(mockedLogger.error).toHaveBeenCalledWith('UserService error checking user existence:', error);
      expect(result).toBe(false);
    });
  });

  describe('findUserByIdSafe', () => {
    it('should return user without password', async () => {
      const userId = 'user-123';
      const { password, ...safeUser } = mockUser;

      mockedUserDao.findById.mockResolvedValue(mockUser);

      const result = await UserService.findUserByIdSafe(userId);

      expect(mockedUserDao.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(safeUser);
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user not found', async () => {
      const userId = 'non-existent-user';

      mockedUserDao.findById.mockResolvedValue(null);

      const result = await UserService.findUserByIdSafe(userId);

      expect(result).toBeNull();
    });
  });

  describe('findUserByEmailSafe', () => {
    it('should return user without password', async () => {
      const email = 'test@example.com';
      const { password, ...safeUser } = mockUser;

      mockedUserDao.findByEmail.mockResolvedValue(mockUser);

      const result = await UserService.findUserByEmailSafe(email);

      expect(mockedUserDao.findByEmail).toHaveBeenCalledWith(email);
      expect(result).toEqual(safeUser);
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user not found', async () => {
      const email = 'nonexistent@example.com';

      mockedUserDao.findByEmail.mockResolvedValue(null);

      const result = await UserService.findUserByEmailSafe(email);

      expect(result).toBeNull();
    });
  });

  describe('validateUserData', () => {
    it('should return empty array for valid data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'StrongPassword123',
      };

      const errors = UserService.validateUserData(validData);

      expect(errors).toEqual([]);
    });

    it('should return error for invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'StrongPassword123',
      };

      const errors = UserService.validateUserData(invalidData);

      expect(errors).toContain('Invalid email format');
    });

    it('should return error for weak password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
      };

      const errors = UserService.validateUserData(invalidData);

      expect(errors).toContain('Password must be at least 8 characters long');
      expect(errors).toContain('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    });

    it('should return multiple errors for invalid data', () => {

      const invalidData = {
        email: 'invalid-email',
        password: 'weak',
      };

      const errors = UserService.validateUserData(invalidData);

      expect(errors.length).toBeGreaterThan(1);
      expect(errors).toContain('Invalid email format');
      expect(errors).toContain('Password must be at least 8 characters long');
    });
  });
});



