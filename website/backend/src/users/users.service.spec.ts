import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';

const mockUser: Partial<User> = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: UserRole.CLIENT,
  isActive: true,
  clerkUserId: 'clerk_123',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      clerkUserId: 'clerk_123',
    };

    it('should create a user successfully', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null); // No existing user
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledTimes(2);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        role: UserRole.CLIENT,
        isActive: true,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { email: createUserDto.email } });
    });

    it('should throw ConflictException if Clerk ID already exists', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce(null) // No email conflict
        .mockResolvedValueOnce(mockUser); // Clerk ID conflict

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { clerkUserId: createUserDto.clerkUserId } });
    });
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id as string);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: mockUser.id } });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email as string);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { email: mockUser.email } });
    });

    it('should return null when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('non-existent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateDto = { firstName: 'Jane' };

    it('should update a user successfully', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update(mockUser.id as string, updateDto);

      expect(result).toEqual(updatedUser);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent-id', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a user successfully', async () => {
      const deactivatedUser = { ...mockUser, isActive: false };
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(deactivatedUser);

      const result = await service.deactivate(mockUser.id as string);

      expect(result.isActive).toBe(false);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return user statistics', async () => {
      mockRepository.count.mockResolvedValueOnce(10).mockResolvedValueOnce(8);
      mockRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { role: UserRole.CLIENT, count: '5' },
          { role: UserRole.ADMIN, count: '3' },
        ]),
      });

      const result = await service.getStats();

      expect(result).toEqual({
        totalUsers: 10,
        activeUsers: 8,
        inactiveUsers: 2,
        usersByRole: {
          [UserRole.CLIENT]: 5,
          [UserRole.ADMIN]: 3,
        },
      });
    });
  });
}); 