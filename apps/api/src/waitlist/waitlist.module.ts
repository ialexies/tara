import { Module } from '@nestjs/common';
import { WaitlistController } from './waitlist.controller.js';
import { WaitlistService } from './waitlist.service.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [EmailModule],
  controllers: [WaitlistController],
  providers: [WaitlistService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
