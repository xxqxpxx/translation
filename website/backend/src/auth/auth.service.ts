import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';

export interface ClerkUser {
  id: string;
  email_addresses: { email_address: string }[];
  first_name: string;
  last_name: string;
  image_url?: string;
}

export interface JwtPayload {
  sub: string; // Clerk user ID
  email: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly clerkSecretKey: string;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY') || '';
  }

  /**
   * Verify JWT token from Clerk
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.clerkSecretKey,
      });
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Get or create user from Clerk token
   */
  async validateUser(payload: JwtPayload): Promise<User> {
    // First try to find existing user by Clerk ID
    let user = await this.userRepository.findOne({
      where: { clerkUserId: payload.sub },
    });

    if (!user) {
      // If no user found, fetch from Clerk and create
      const clerkUser = await this.fetchClerkUser(payload.sub);
      user = await this.createUserFromClerk(clerkUser);
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    return user;
  }

  /**
   * Fetch user details from Clerk API
   */
  private async fetchClerkUser(clerkUserId: string): Promise<ClerkUser> {
    try {
      const response = await fetch(`https://api.clerk.dev/v1/users/${clerkUserId}`, {
        headers: {
          'Authorization': `Bearer ${this.clerkSecretKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Clerk API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new UnauthorizedException('Failed to fetch user from Clerk');
    }
  }

  /**
   * Create user in local database from Clerk user data
   */
  private async createUserFromClerk(clerkUser: ClerkUser): Promise<User> {
    const user = this.userRepository.create({
      clerkUserId: clerkUser.id,
      email: clerkUser.email_addresses[0]?.email_address,
      firstName: clerkUser.first_name || '',
      lastName: clerkUser.last_name || '',
      role: UserRole.CLIENT, // Default role
      avatarUrl: clerkUser.image_url,
      isActive: true,
    });

    return await this.userRepository.save(user);
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: string, role: UserRole, adminUser: User): Promise<User> {
    if (adminUser.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Only admins can update user roles');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    user.role = role;
    return await this.userRepository.save(user);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  /**
   * Get user by Clerk ID
   */
  async getUserByClerkId(clerkUserId: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { clerkUserId } });
  }
} 