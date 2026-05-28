import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller.js';
import { PropertiesService } from './properties.service.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { EmailService } from '../email/email.service.js';

@Module({
  controllers: [PropertiesController],
  providers: [PropertiesService, RolesGuard, EmailService],
})
export class PropertiesModule {}
