import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterpretersService } from './interpreters.service';
import { InterpretersController } from './interpreters.controller';
import { Interpreter } from './entities/interpreter.entity';
import { UsersModule } from '../users/users.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Interpreter]),
    forwardRef(() => UsersModule),
    forwardRef(() => SessionsModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [InterpretersController],
  providers: [InterpretersService],
  exports: [InterpretersService, TypeOrmModule],
})
export class InterpretersModule {} 