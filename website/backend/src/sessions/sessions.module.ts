import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsService } from './sessions.service';
import { InterpreterSession } from './entities/interpreter-session.entity';
import { UsersModule } from '../users/users.module';
import { InterpretersModule } from '../interpreters/interpreters.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InterpreterSession]),
    forwardRef(() => UsersModule),
    forwardRef(() => InterpretersModule),
  ],
  providers: [SessionsService],
  exports: [SessionsService, TypeOrmModule],
})
export class SessionsModule {} 