import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import pdfParse from 'pdf-parse';
import { mapChairType } from '../journeys/journeys.service';

export interface ParsedTicket {
  ticketNo?: string;
  trainName?: string;
  trainNumber?: string;
  fromStation?: string;
  toStation?: string;
  journeyDate?: string;
  departureTime?: string;
  arrivalTime?: string;
  chairType?: string;
  coachNo?: string;
  seatNo?: string;
  fare?: number;
  passengerName?: string;
  boardingPoint?: string;
  issuedAt?: string;
  transactionId?: string;
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * BD Railway tickets have the format:
 *   "English Label (বাংলা অনুবাদ)Value"
 * This function finds the English label, skips the parenthesized Bengali text,
 * and returns the value that follows until end of line.
 */
function extractField(text: string, labelPattern: string): string | undefined {
  // labelPattern is treated as a regex source (callers must escape special chars)
  const re = new RegExp(`${labelPattern}\\s*(?:\\([^)]*\\))?\\s*(.+)`, 'i');
  const m = text.match(re);
  if (!m) return undefined;
  let val = clean(m[1]);
  val = val.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return val || undefined;
}

@Injectable()
export class TicketParserService {
  async parsePdf(filePath: string): Promise<ParsedTicket> {
    const buffer = fs.readFileSync(filePath);
    let text: string;
    try {
      const data = await pdfParse(buffer);
      text = data.text;
    } catch (e) {
      throw new BadRequestException('Failed to parse PDF. Ensure it is a valid ticket.');
    }
    return this.parseText(text);
  }

  parseText(text: string): ParsedTicket {
    const result: ParsedTicket = {};
    text = text.replace(/\r/g, '');

    // PNR Number
    const pnr = extractField(text, 'PNR Number');
    result.ticketNo = pnr;

    // Train Name & Number — e.g. "EKOTA EXPRESS [705]"
    const trainField = extractField(text, 'Train Name & Number');
    if (trainField) {
      const tm = trainField.match(/^(.+?)\s*\[(\d+)\]/);
      if (tm) {
        result.trainName = clean(tm[1]);
        result.trainNumber = tm[2];
      } else {
        result.trainName = trainField;
      }
    }

    // From / To Station
    result.fromStation = extractField(text, 'From Station');
    result.toStation = extractField(text, 'To Station');

    // Journey Date & Time — "10-10-2026 14:57"
    const journeyDT = extractField(text, 'Journey Date & Time');
    if (journeyDT) {
      const dm = journeyDT.match(/(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2})/);
      if (dm) {
        result.journeyDate = this.normalizeDate(dm[1]);
        result.departureTime = dm[2];
      }
    }

    // Issue Date & Time
    const issueDT = extractField(text, 'Issue Date & Time');
    if (issueDT) {
      const im = issueDT.match(/(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2})/);
      if (im) result.issuedAt = `${this.normalizeDate(im[1])} ${im[2]}`;
    }

    // Class Name — e.g. "S_CHAIR"
    const cls = extractField(text, 'Class Name');
    if (cls) result.chairType = mapChairType(cls);

    // Coach Name / Seat(s) — e.g. "JA-52"
    const coach = extractField(text, 'Coach Name / Seat\\(s\\)');
    if (coach) {
      result.coachNo = coach;
    }

    // Fare — use "Fare" line (value is on the same line). Avoid matching "Total Fare".
    const fareField = extractField(text, '(?<!Total )Fare');
    if (fareField) {
      const fm = fareField.match(/(?:BDT|৳)?\s*([\d,]+\.?\d*)/);
      if (fm) result.fare = parseFloat(fm[1].replace(/,/g, ''));
    }

    // Passenger Name — appears on its own line after the label
    const nameLine = extractField(text, 'Passenger Name');
    if (nameLine && /[A-Za-z]/.test(nameLine)) {
      result.passengerName = nameLine;
    } else {
      // Fallback: name is on the next line after "Passenger Name (...)"
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const idx = lines.findIndex(l => /Passenger Name/i.test(l));
      if (idx >= 0 && lines[idx + 1]) {
        const candidate = lines[idx + 1];
        if (/^[A-Za-z.\s'-]+$/.test(candidate)) {
          result.passengerName = clean(candidate);
        }
      }
    }

    return result;
  }

  private normalizeDate(raw: string): string {
    const parts = raw.split('-');
    if (parts.length === 3) {
      const [day, mon, year] = parts;
      if (/^\d{4}$/.test(year)) return `${year}-${mon}-${day}`;
    }
    return raw;
  }
}
