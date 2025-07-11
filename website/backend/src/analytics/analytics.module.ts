import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Translation } from '../translations/entities/translation.entity';
import { InterpreterSession } from '../sessions/entities/interpreter-session.entity';
import { Invoice } from '../payments/entities/invoice.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Translation, InterpreterSession, Invoice])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {} 