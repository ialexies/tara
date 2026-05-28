import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service.js';
import { EmailService } from '../email/email.service.js';

@Module({
  providers: [SchedulerService, EmailService],
})
export class SchedulerModule {}
