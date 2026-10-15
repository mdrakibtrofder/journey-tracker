import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJourneyDto, UpdateJourneyDto, QueryJourneyDto } from './dto/journey.dto';
import { ChairType } from '@prisma/client';

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function computeDuration(dep: string, arr?: string): number | null {
  if (!arr) return null;
  let d = parseTime(dep);
  let a = parseTime(arr);
  if (a < d) a += 24 * 60; // overnight
  return a - d;
}

function computeDayNight(dep: string): string {
  const mins = parseTime(dep);
  return mins >= 360 && mins < 1080 ? 'DAY' : 'NIGHT';
}

const CHAIR_MAP: Record<string, ChairType> = {
  'AC_B': ChairType.AC_B, 'AC B': ChairType.AC_B, 'AC-B': ChairType.AC_B,
  'AC_S': ChairType.AC_S, 'AC S': ChairType.AC_S, 'AC-S': ChairType.AC_S,
  'SNIGDHA': ChairType.SNIGDHA,
  'F_BERTH': ChairType.F_BERTH, 'F BERTH': ChairType.F_BERTH,
  'F_SEAT': ChairType.F_SEAT, 'F SEAT': ChairType.F_SEAT,
  'SHOVAN': ChairType.SHOVAN,
  'SHOVAN_CHAIR': ChairType.SHOVAN_CHAIR, 'SHOVAN CHAIR': ChairType.SHOVAN_CHAIR, 'S_CHAIR': ChairType.SHOVAN_CHAIR,
  'LUXURY': ChairType.LUXURY,
};

export function mapChairType(raw?: string): ChairType {
  if (!raw) return ChairType.OTHER;
  const key = raw.trim().toUpperCase();
  return CHAIR_MAP[key] || ChairType.OTHER;
}

@Injectable()
export class JourneysService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateJourneyDto) {
    // An empty string is a real value for the unique ticketNo column, so two
    // blank tickets would collide. Normalise blanks to null (Postgres allows
    // many nulls) so only genuine duplicates are rejected.
    const ticketNo = dto.ticketNo?.trim() || undefined;
    const data: any = {
      ...dto,
      ticketNo,
      chairType: dto.chairType || ChairType.OTHER,
      dayNight: computeDayNight(dto.departureTime),
      durationMins: computeDuration(dto.departureTime, dto.arrivalTime),
      journeyDate: new Date(dto.journeyDate),
      fare: dto.fare ?? 0,
    };
    if (dto.issuedAt) data.issuedAt = new Date(dto.issuedAt);
    try {
      return await this.prisma.journey.create({ data });
    } catch (e: any) {
      // P2002 = unique constraint violation on ticketNo.
      if (e?.code === 'P2002') {
        throw new ConflictException(
          `Ticket ${ticketNo} already exists — it was skipped.`,
        );
      }
      throw e;
    }
  }

  async findAll(query: QueryJourneyDto) {
    const where: any = {};
    if (query.fromStation) where.fromStation = { contains: query.fromStation, mode: 'insensitive' };
    if (query.toStation) where.toStation = { contains: query.toStation, mode: 'insensitive' };
    if (query.trainName) where.trainName = { contains: query.trainName, mode: 'insensitive' };
    if (query.chairType) where.chairType = query.chairType as ChairType;
    if (query.dayNight) where.dayNight = query.dayNight;
    if (query.startDate || query.endDate) {
      where.journeyDate = {};
      if (query.startDate) where.journeyDate.gte = new Date(query.startDate);
      if (query.endDate) where.journeyDate.lte = new Date(query.endDate);
    }
    if (query.search) {
      where.OR = [
        { trainName: { contains: query.search, mode: 'insensitive' } },
        { fromStation: { contains: query.search, mode: 'insensitive' } },
        { toStation: { contains: query.search, mode: 'insensitive' } },
        { passengerName: { contains: query.search, mode: 'insensitive' } },
        { ticketNo: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.journey.findMany({ where, orderBy: { journeyDate: 'desc' } });
  }

  async findOne(id: string) {
    const journey = await this.prisma.journey.findUnique({ where: { id } });
    if (!journey) throw new NotFoundException('Journey not found');
    return journey;
  }

  async findByTicketNo(ticketNo: string) {
    return this.prisma.journey.findUnique({ where: { ticketNo } });
  }

  async update(id: string, dto: UpdateJourneyDto) {
    const data: any = { ...dto };
    if (dto.departureTime) data.dayNight = computeDayNight(dto.departureTime);
    if (dto.departureTime || dto.arrivalTime) {
      const existing = await this.findOne(id);
      data.durationMins = computeDuration(
        dto.departureTime || existing.departureTime,
        dto.arrivalTime || existing.arrivalTime || undefined,
      );
    }
    if (dto.journeyDate) data.journeyDate = new Date(dto.journeyDate);
    if (dto.issuedAt) data.issuedAt = new Date(dto.issuedAt);
    return this.prisma.journey.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.journey.delete({ where: { id } });
  }

  async removeMany(ids: string[]) {
    const res = await this.prisma.journey.deleteMany({ where: { id: { in: ids } } });
    return { deleted: res.count };
  }
}
