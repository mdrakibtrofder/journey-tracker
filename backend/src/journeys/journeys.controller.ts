import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.journeysService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJourneyDto) {
    return this.journeysService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.journeysService.remove(id);
  }
}
