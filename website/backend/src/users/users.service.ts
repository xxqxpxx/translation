import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  phoneNumber?: string;
  address?: string;
  clerkUserId: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  preferences?: Record<string, any>;
  isActive?: boolean;
}

export interface UserSearchFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    timestamp: string;
    version: string;
    requestId: string;
    pagination: PaginationMeta;
  };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user with email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if user with Clerk ID already exists
    const existingClerkUser = await this.userRepository.findOne({
      where: { clerkUserId: createUserDto.clerkUserId },
    });

    if (existingClerkUser) {
      throw new ConflictException('User with this Clerk ID already exists');
    }

    const user = this.userRepository.create({
      ...createUserDto,
      role: createUserDto.role || UserRole.CLIENT,
      isActive: true,
    });

    return await this.userRepository.save(user);
  }

  /**
   * Get all users with pagination and filtering
   */
  async findAll(
    paginationQuery: PaginatedRequest,
    filters: UserSearchFilters = {},
  ): Promise<PaginatedResponse<User>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = paginationQuery;
    const { role, isActive } = filters;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Apply filters
    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply sorting
    queryBuilder.orderBy(`user.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Apply pagination
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: users,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        requestId: 'generated-id',
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    };
  }

  /**
   * Get user by ID
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Get user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  /**
   * Get user by Clerk ID
   */
  async findByClerkId(clerkUserId: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { clerkUserId } });
  }

  /**
   * Update user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    Object.assign(user, updateUserDto);

    return await this.userRepository.save(user);
  }

  /**
   * Update user role (admin only)
   */
  async updateRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findOne(id);
    user.role = role;
    return await this.userRepository.save(user);
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivate(id: string): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = false;
    return await this.userRepository.save(user);
  }

  /**
   * Activate user
   */
  async activate(id: string): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = true;
    return await this.userRepository.save(user);
  }

  /**
   * Get user statistics
   */
  async getStats() {
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({ where: { isActive: true } });
    const usersByRole = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item.role] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }

  /**
   * Search users by name or email
   */
  async search(query: string, limit: number = 10): Promise<User[]> {
    return await this.userRepository.find({
      where: [
        { firstName: ILike(`%${query}%`) },
        { lastName: ILike(`%${query}%`) },
        { email: ILike(`%${query}%`) },
      ],
      take: limit,
      order: { firstName: 'ASC' },
    });
  }
} 