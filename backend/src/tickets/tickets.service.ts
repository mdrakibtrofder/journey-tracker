import { Injectable } from '@nestjs/common';
import { TicketParserService, ParsedTicket } from './ticket-parser.service';
import { JourneysService } from '../journeys/journeys.service';

@Injectable()
export class TicketsService {
  constructor(
    private parser: TicketParserService,
    private journeys: JourneysService,
  ) {}

  async parse(filePath: string): Promise<ParsedTicket> {
    return this.parser.parsePdf(filePath);
  }

  async confirm(parsed: ParsedTicket) {
    return this.journeys.create({
      ticketNo: parsed.ticketNo,
      trainName: parsed.trainName || 'UNKNOWN',
      trainNumber: parsed.trainNumber,
      fromStation: parsed.fromStation || '',
      toStation: parsed.toStation || '',
      journeyDate: parsed.journeyDate || new Date().toISOString(),
      departureTime: parsed.departureTime || '00:00',
      arrivalTime: parsed.arrivalTime,
      chairType: parsed.chairType as any,
      coachNo: parsed.coachNo,
      seatNo: parsed.seatNo,
      fare: parsed.fare,
      passengerName: parsed.passengerName,
      boardingPoint: parsed.boardingPoint,
      issuedAt: parsed.issuedAt,
      transactionId: parsed.transactionId,
      source: 'PDF' as any,
    });
  }
}
