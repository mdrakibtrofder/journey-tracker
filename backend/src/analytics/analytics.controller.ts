import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto, JourneysTableQueryDto } from './dto/analytics-query.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /** One payload with every KPI, series and distribution both pages render. */
  @Get('overview')
  overview(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.overview(query);
  }

  /** Filter options, scoped to the active filters. */
  @Get('facets')
  facets(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.facets(query);
  }

  /** Filtered, sorted and paginated rows for the analytics data table. */
  @Get('journeys')
  journeys(@Query() query: JourneysTableQueryDto) {
    return this.analyticsService.journeysTable(query);
  }
}
