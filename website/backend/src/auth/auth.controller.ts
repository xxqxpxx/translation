import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { User } from './decorators/user.decorator';
import { Roles } from './decorators/roles.decorator';
import { Public } from './decorators/public.decorator';
import { User as UserEntity, UserRole } from '../users/entities/user.entity';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiBearerAuth('JWT-auth')
  async getProfile(@User() user: UserEntity): Promise<UserEntity> {
    return user;
  }

  @Get('users/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiBearerAuth('JWT-auth')
  async getUserById(@Param('id') id: string): Promise<UserEntity | null> {
    return this.authService.getUserById(id);
  }

  @Put('users/:id/role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user role (Admin only)' })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiBearerAuth('JWT-auth')
  async updateUserRole(
    @Param('id') userId: string,
    @Body() body: { role: UserRole },
    @User() adminUser: UserEntity,
  ): Promise<UserEntity> {
    return this.authService.updateUserRole(userId, body.role, adminUser);
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Authentication health check' })
  @ApiResponse({ status: 200, description: 'Authentication service is healthy' })
  async healthCheck() {
    return {
      status: 'healthy',
      service: 'authentication',
      timestamp: new Date().toISOString(),
    };
  }
} 