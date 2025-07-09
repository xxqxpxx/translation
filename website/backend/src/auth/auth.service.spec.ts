import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService, ClerkUser, JwtPayload } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';

const mockUser: Partial<User> = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: UserRole.CLIENT,
  isActive: true,
  clerkUserId: 'clerk_123',
};

const mockClerkUser: ClerkUser = {
  id: 'clerk_123',
  email_addresses: [{ email_address: 'test@example.com' }],
  first_name: 'John',
  last_name: 'Doe',
  image_url: 'https://example.com/avatar.jpg',
};

const mockJwtPayload: JwtPayload = {
  sub: 'clerk_123',
  email: 'test@example.com',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

const mockRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockJwtService = {
  verify: jest.fn(),
};

// Mock global fetch
global.fetch = jest.fn();

describe('AuthService', () => {
  let service: AuthService;
  let repository: Repository<User>;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    mockConfigService.get.mockReturnValue('test-secret-key');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      mockJwtService.verify.mockReturnValue(mockJwtPayload);

      const result = await service.verifyToken('valid-token');

      expect(result).toEqual(mockJwtPayload);
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret-key',
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.verifyToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return existing user', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser(mockJwtPayload);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { clerkUserId: mockJwtPayload.sub },
      });
    });

    it('should create new user if not exists', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      // Mock fetch for Clerk API call
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockClerkUser),
      });

      const result = await service.validateUser(mockJwtPayload);

      expect(result).toEqual(mockUser);
      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.clerk.dev/v1/users/${mockJwtPayload.sub}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-secret-key',
          }),
        }),
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockRepository.findOne.mockResolvedValue(inactiveUser);

      await expect(service.validateUser(mockJwtPayload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when Clerk API fails', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      // Mock failed Clerk API call
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(service.validateUser(mockJwtPayload)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateUserRole', () => {
    const adminUser = { ...mockUser, role: UserRole.ADMIN } as User;
    const targetUser = { ...mockUser, id: 'target-user-id' } as User;

    it('should update user role when called by admin', async () => {
      mockRepository.findOne.mockResolvedValue(targetUser);
      mockRepository.save.mockResolvedValue({ ...targetUser, role: UserRole.INTERPRETER });

      const result = await service.updateUserRole('target-user-id', UserRole.INTERPRETER, adminUser);

      expect(result.role).toBe(UserRole.INTERPRETER);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when called by non-admin', async () => {
      const clientUser = { ...mockUser, role: UserRole.CLIENT } as User;

      await expect(
        service.updateUserRole('target-user-id', UserRole.INTERPRETER, clientUser)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when target user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateUserRole('non-existent-id', UserRole.INTERPRETER, adminUser)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserById(mockUser.id as string);

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserById('non-existent-id');

      expect(result).toBeNull();
    });
  });
}); 