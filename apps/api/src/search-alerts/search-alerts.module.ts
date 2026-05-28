import { Module } from '@nestjs/common';
import { SearchAlertsController } from './search-alerts.controller.js';
import { SearchAlertsService } from './search-alerts.service.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [EmailModule],
  controllers: [SearchAlertsController],
  providers: [SearchAlertsService],
})
export class SearchAlertsModule {}
