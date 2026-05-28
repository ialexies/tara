import { Module } from '@nestjs/common';
import { PriceRulesController } from './price-rules.controller.js';
import { PriceRulesService } from './price-rules.service.js';
import { RolesGuard } from '../auth/roles.guard.js';

@Module({
  controllers: [PriceRulesController],
  providers: [PriceRulesService, RolesGuard],
  exports: [PriceRulesService],
})
export class PriceRulesModule {}
