import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TicketParserService } from './ticket-parser.service';
import { JourneysModule } from '../journeys/journeys.module';

@Module({
  imports: [JourneysModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketParserService],
  exports: [TicketsService],
})
export class TicketsModule {}
