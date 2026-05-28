import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service.js';
import { EmailService } from '../email/email.service.js';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';

@Module({
  providers: [SchedulerService, EmailService, WhatsAppService],
})
export class SchedulerModule {}
