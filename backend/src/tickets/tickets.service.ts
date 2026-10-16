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

  async parseMany(files: Express.Multer.File[]) {
    return Promise.all(
      files.map(async (file) => {
        try {
          const parsed = await this.parser.parsePdf(file.path);
          return { fileName: file.originalname, filePath: file.path, parsed };
        } catch (e: any) {
          return {
            fileName: file.originalname,
            filePath: file.path,
            error: e?.message || 'Failed to parse ticket.',
          };
        }
      }),
    );
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

  async confirmMany(list: ParsedTicket[]) {
    const created: any[] = [];
    const failed: { index: number; message: string }[] = [];
    const duplicates: { index: number; ticketNo: string; existing: any }[] = [];

    for (let i = 0; i < list.length; i++) {
      try {
        created.push(await this.confirm(list[i]));
      } catch (e: any) {
        const ticketNo = list[i].ticketNo?.trim();
        // A conflict means the PNR already exists — surface the stored journey
        // so the UI can link straight to its preview.
        if (e?.status === 409 && ticketNo) {
          const existing = await this.journeys.findByTicketNo(ticketNo);
          duplicates.push({ index: i, ticketNo, existing });
        } else {
          failed.push({ index: i, message: e?.message || 'Failed to save journey.' });
        }
      }
    }

    return {
      created,
      createdCount: created.length,
      failed,
      failedCount: failed.length,
      duplicates,
      duplicateCount: duplicates.length,
    };
  }
}
