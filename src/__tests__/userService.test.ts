import { UserService } from '../services';
import { UserDao } from '../dao';
import { logger } from '../utils/logger';

// Mock dependencies
jest.mock('../dao');
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

  beforeEach(() => {
    jest.clearAllMocks();
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

});



