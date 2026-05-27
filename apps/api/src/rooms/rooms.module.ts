import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';
import { RolesGuard } from '../auth/roles.guard.js';

@Module({
  controllers: [RoomsController],
  providers: [RoomsService, RolesGuard],
})
export class RoomsModule {}
