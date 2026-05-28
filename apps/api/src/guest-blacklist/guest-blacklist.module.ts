import { Module } from '@nestjs/common';
import { GuestBlacklistController } from './guest-blacklist.controller.js';
import { GuestBlacklistService } from './guest-blacklist.service.js';

@Module({
  controllers: [GuestBlacklistController],
  providers: [GuestBlacklistService],
  exports: [GuestBlacklistService],
})
export class GuestBlacklistModule {}
