import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException } from '@nestjs/common';
import { JourneysService } from './journeys.service';
import { CreateJourneyDto, UpdateJourneyDto, QueryJourneyDto } from './dto/journey.dto';

@Controller('journeys')
export class JourneysController {
  constructor(private readonly journeysService: JourneysService) {}

  @Post()
  create(@Body() dto: CreateJourneyDto) {
    return this.journeysService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryJourneyDto) {
    return this.journeysService.findAll(query);
  }

  // Must be declared before ':id' so it isn't captured as an id.
  @Get('facets')
  facets() {
    return this.journeysService.facets();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.journeysService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJourneyDto) {
    return this.journeysService.update(id, dto);
  }

  @Delete()
  removeMany(@Body() body: { ids?: string[] }) {
    const ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];
    if (!ids.length) throw new BadRequestException('No journey ids provided');
    return this.journeysService.removeMany(ids);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.journeysService.remove(id);
  }
}
