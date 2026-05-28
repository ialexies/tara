import { Module } from '@nestjs/common';
import { PropertyStaffController } from './property-staff.controller.js';
import { PropertyStaffService } from './property-staff.service.js';

@Module({
  controllers: [PropertyStaffController],
  providers: [PropertyStaffService],
  exports: [PropertyStaffService],
})
export class PropertyStaffModule {}
