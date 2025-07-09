import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User as UserDecorator } from '../auth/decorators/user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { InterpretersService, CreateInterpreterDto, UpdateInterpreterDto, InterpreterFilterDto } from './interpreters.service';
import { SessionsService, CreateSessionDto, UpdateSessionDto, SessionFilterDto, RescheduleSessionDto, CancelSessionDto } from '../sessions/sessions.service';
import { Interpreter, AvailabilityStatus } from './entities/interpreter.entity';
import { InterpreterSession, InterpreterSessionStatus, SessionRating } from '../sessions/entities/interpreter-session.entity';

@ApiTags('interpreters')
@Controller('interpreters')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InterpretersController {
  constructor(
    private readonly interpretersService: InterpretersService,
    private readonly sessionsService: SessionsService,
  ) {}

  // ===== INTERPRETER PROFILE MANAGEMENT =====

  @Post()
  @ApiOperation({ summary: 'Create interpreter profile' })
  @ApiResponse({ status: 201, description: 'Interpreter profile created successfully' })
  @Roles(UserRole.INTERPRETER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async createInterpreter(
    @Body(ValidationPipe) createInterpreterDto: CreateInterpreterDto,
    @UserDecorator() user: any,
  ): Promise<{ success: boolean; data: Interpreter; message: string }> {
    // Ensure user can only create their own profile (unless admin)
    if (user.role !== UserRole.ADMIN && createInterpreterDto.userId !== user.sub) {
      createInterpreterDto.userId = user.sub;
    }

    const interpreter = await this.interpretersService.createInterpreter(createInterpreterDto);
    
    return {
      success: true,
      data: interpreter,
      message: 'Interpreter profile created successfully',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all interpreters with filters' })
  @ApiResponse({ status: 200, description: 'Interpreters retrieved successfully' })
  async findAllInterpreters(
    @Query() filters: InterpreterFilterDto,
  ): Promise<{ success: boolean; data: { interpreters: Interpreter[]; total: number; page: number; limit: number } }> {
    const result = await this.interpretersService.findAll(filters);
    
    return {
      success: true,
      data: {
        ...result,
        page: filters.page || 1,
        limit: filters.limit || 20,
      },
    };
  }

  @Get('matching')
  @ApiOperation({ summary: 'Find matching interpreters for specific criteria' })
  @ApiResponse({ status: 200, description: 'Matching interpreters found' })
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async findMatchingInterpreters(
    @Query('sourceLanguage') sourceLanguage: string,
    @Query('targetLanguage') targetLanguage: string,
    @Query('sessionType') sessionType: string,
    @Query('specialization') specialization: string,
    @Query('scheduledDate') scheduledDate: string,
    @Query('duration') duration: string,
  ): Promise<{ success: boolean; data: Interpreter[] }> {
    const matchingInterpreters = await this.interpretersService.findMatchingInterpreters({
      sourceLanguage,
      targetLanguage,
      sessionType: sessionType as any,
      specialization: specialization as any,
      scheduledDate: new Date(scheduledDate),
      duration: parseInt(duration),
    });
    
    return {
      success: true,
      data: matchingInterpreters,
    };
  }

  @Get('my-profile')
  @ApiOperation({ summary: 'Get current user interpreter profile' })
  @ApiResponse({ status: 200, description: 'Interpreter profile retrieved' })
  @Roles(UserRole.INTERPRETER)
  @UseGuards(RolesGuard)
  async getMyProfile(
    @UserDecorator() user: any,
  ): Promise<{ success: boolean; data: Interpreter }> {
    const interpreter = await this.interpretersService.findByUserId(user.sub);
    
    return {
      success: true,
      data: interpreter,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get interpreter by ID' })
  @ApiResponse({ status: 200, description: 'Interpreter retrieved successfully' })
  async findOneInterpreter(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; data: Interpreter }> {
    const interpreter = await this.interpretersService.findOne(id);
    
    return {
      success: true,
      data: interpreter,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update interpreter profile' })
  @ApiResponse({ status: 200, description: 'Interpreter profile updated successfully' })
  async updateInterpreter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateInterpreterDto: UpdateInterpreterDto,
    @UserDecorator() user: any,
  ): Promise<{ success: boolean; data: Interpreter; message: string }> {
    const interpreter = await this.interpretersService.update(id, updateInterpreterDto, user.sub);
    
    return {
      success: true,
      data: interpreter,
      message: 'Interpreter profile updated successfully',
    };
  }

  @Patch(':id/availability')
  @ApiOperation({ summary: 'Update interpreter availability status' })
  @ApiResponse({ status: 200, description: 'Availability status updated' })
  @Roles(UserRole.INTERPRETER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async updateAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: AvailabilityStatus,
    @UserDecorator() user: any,
  ): Promise<{ success: boolean; data: Interpreter; message: string }> {
    const interpreter = await this.interpretersService.updateAvailabilityStatus(id, status);
    
    return {
      success: true,
      data: interpreter,
      message: 'Availability status updated successfully',
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update interpreter status (admin only)' })
  @ApiResponse({ status: 200, description: 'Interpreter status updated' })
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
    @UserDecorator() user: any,
  ): Promise<{ success: boolean; data: Interpreter; message: string }> {
    const interpreter = await this.interpretersService.updateStatus(id, status as any, user.sub);
    
    return {
      success: true,
      data: interpreter,
      message: 'Interpreter status updated successfully',
    };
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get interpreter statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; data: any }> {
    const statistics = await this.interpretersService.getStatistics(id);
    
    return {
      success: true,
      data: statistics,
    };
  }

  // ===== SESSION BOOKING AND MANAGEMENT =====

  @Post('sessions')
  @ApiOperation({ summary: 'Book an interpreter session' })
  @ApiResponse({ status: 201, description: 'Session booked successfully' })
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async bookSession(
    @Body(ValidationPipe) createSessionDto: CreateSessionDto,
    @UserDecorator() user: any,
  ): Promise<{ success: boolean; data: InterpreterSession; message: string }> {
    // Ensure client can only book for themselves (unless admin)
    if (user.role !== UserRole.ADMIN) {
      createSessionDto.clientId = user.sub;
    }

    const session = await this.sessionsService.createSession(createSessionDto);
    
    return {
      success: true,
      data: session,
      message: 'Session booked successfully',
    };
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get sessions with filters' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  async findAllSessions(
    @Query() filters: SessionFilterDto,
    @UserDecorator() user: any,
  ): Promise<{ success: boolean; data: { sessions: InterpreterSession[]; total: number; page: number; limit: number } }> {
    // Filter sessions based on user role
    if (user.role === UserRole.CLIENT) {
      filters.clientId = user.sub;
    } else if (user.role === UserRole.INTERPRETER) {
      const interpreter = await this.interpretersService.findByUserId(user.sub);
      filters.interpreterId = interpreter.id;
    }
    // Admins can see all sessions (no additional filtering)

    const result = await this.sessionsService.findAll(filters);
    
    return {
      success: true,
      data: {
        ...result,
        page: filters.page || 1,
        limit: filters.limit || 20,
      },
    };
  }

  @Get('sessions/upcoming')
  @ApiOperation({ summary: 'Get upcoming sessions for current user' })
  @ApiResponse({ status: 200, description: 'Upcoming sessions retrieved' })
  async getUpcomingSessions(
    @UserDecorator() user: any,
  ): Promise<{ success: boolean; data: InterpreterSession[] }> {
    const sessions = await this.sessionsService.getUpcomingSessions(user.sub, user.role);
    
    return {
      success: true,
      data: sessions,
    };
  }

  @Get('sessions/statistics')
  @ApiOperation({ summary: 'Get session statistics for current user' })
  @ApiResponse({ status: 200, description: 'Session statistics retrieved' })
  async getSessionStatistics(
    @UserDecorator() user: any,
  ): Promise<{ success: boolean; data: any }> {
    const statistics = await this.sessionsService.getSessionStatistics(user.sub, user.role);
    
    return {
      success: true,
      data: statistics,
    };
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiResponse({ status: 200, description: 'Session retrieved successfully' })
  async findOneSession(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; data: InterpreterSession }> {
    const session = await this.sessionsService.findOne(id);
    
    return {
      success: true,
      data: session,
    };
  }

  @Put('sessions/:id')
  @ApiOperation({ summary: 'Update session details' })
  @ApiResponse({ status: 200, description: 'Session updated successfully' })
  async updateSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateSessionDto: UpdateSessionDto,
    @UserDecorator() user: any,
  ): Promise<{ success: boolean; data: InterpreterSession; message: string }> {
    const session = await this.sessionsService.update(id, updateSessionDto, user.sub);
    
    return {
      success: true,
      data: session,
      message: 'Session updated successfully',
    };
  }

  @Patch('sessions/:id/status')
  @ApiOperation({ summary: 'Update session status' })
  @ApiResponse({ status: 200, description: 'Session status updated' })
  async updateSessionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: InterpreterSessionStatus,
    @UserDecorator() user: any,
  ): Promise<{ success: boolean; data: InterpreterSession; message: string }> {
    const session = await this.sessionsService.updateStatus(id, status, user.sub);
    
    return {
      success: true,
      data: session,
      message: 'Session status updated successfully',
    };
  }

  @Patch('sessions/:id/reschedule')
  @ApiOperation({ summary: 'Reschedule a session' })
  @ApiResponse({ status: 200, description: 'Session rescheduled successfully' })
  async rescheduleSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) rescheduleDto: RescheduleSessionDto,
    @UserDecorator() user: any,
  ): Promise<{ success: boolean; data: InterpreterSession; message: string }> {
    const session = await this.sessionsService.rescheduleSession(id, rescheduleDto, user.sub);
    
    return {
      success: true,
      data: session,
      message: 'Session rescheduled successfully',
    };
  }

  @Patch('sessions/:id/cancel')
  @ApiOperation({ summary: 'Cancel a session' })
  @ApiResponse({ status: 200, description: 'Session cancelled successfully' })
  async cancelSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) cancelDto: CancelSessionDto,
    @UserDecorator() user: any,
  ): Promise<{ success: boolean; data: InterpreterSession; message: string }> {
    const session = await this.sessionsService.cancelSession(id, cancelDto, user.sub);
    
    return {
      success: true,
      data: session,
      message: 'Session cancelled successfully',
    };
  }

  @Post('sessions/:id/rate')
  @ApiOperation({ summary: 'Rate a completed session' })
  @ApiResponse({ status: 200, description: 'Session rated successfully' })
  async rateSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) rating: SessionRating,
    @UserDecorator() user: any,
  ): Promise<{ success: boolean; data: InterpreterSession; message: string }> {
    // Determine rater role
    const session = await this.sessionsService.findOne(id);
    let raterRole: 'client' | 'interpreter';
    
    if (session.clientId === user.sub) {
      raterRole = 'client';
    } else if (session.interpreter?.userId === user.sub) {
      raterRole = 'interpreter';
    } else {
      throw new Error('You are not authorized to rate this session');
    }

    const updatedSession = await this.sessionsService.addRating(id, rating, raterRole);
    
    return {
      success: true,
      data: updatedSession,
      message: 'Session rated successfully',
    };
  }
} 