import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Translation } from './entities/translation.entity';
import { Document } from './entities/document.entity';
import { TranslationsService } from './translations.service';
import { TranslationsController } from './translations.controller';
import { DocumentsService } from './documents.service';
import { PricingService } from './pricing.service';
import { FileUploadService } from './file-upload.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Translation, Document]),
    MulterModule.register({
      dest: './uploads/documents',
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
        files: 10, // Maximum 10 files per request
      },
    }),
    UsersModule,
    AuthModule,
  ],
  controllers: [TranslationsController],
  providers: [
    TranslationsService,
    DocumentsService,
    PricingService,
    FileUploadService,
  ],
  exports: [TranslationsService, DocumentsService, PricingService],
})
export class TranslationsModule {} 