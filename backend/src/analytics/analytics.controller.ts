import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  summary() { return this.analyticsService.summary(); }

  @Get('by-station')
  byStation() { return this.analyticsService.byStation(); }

  @Get('by-train')
  byTrain() { return this.analyticsService.byTrain(); }

  @Get('by-chair-type')
  byChairType() { return this.analyticsService.byChairType(); }

  @Get('by-day-night')
  byDayNight() { return this.analyticsService.byDayNight(); }

  @Get('by-month')
  byMonth() { return this.analyticsService.byMonth(); }

  @Get('routes')
  routes() { return this.analyticsService.routes(); }
}
