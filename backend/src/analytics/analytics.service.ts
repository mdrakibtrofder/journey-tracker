import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async summary() {
    const [total, fareSum] = await Promise.all([
      this.prisma.journey.count(),
      this.prisma.journey.aggregate({ _sum: { fare: true } }),
    ]);
    const all = await this.prisma.journey.findMany({ select: { durationMins: true } });
    const durations = all.map(j => j.durationMins).filter((d): d is number => d != null);
    const avgDuration = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;
    return {
      totalJourneys: total,
      totalFare: fareSum._sum.fare ? Number(fareSum._sum.fare) : 0,
      avgDurationMins: avgDuration,
    };
  }

  async byStation() {
    const from = await this.prisma.journey.groupBy({
      by: ['fromStation'],
      _count: true,
      _sum: { fare: true },
      orderBy: { _count: { fromStation: 'desc' } },
    });
    const to = await this.prisma.journey.groupBy({
      by: ['toStation'],
      _count: true,
      _sum: { fare: true },
    });
    return { from: from.map(r => ({ station: r.fromStation, count: r._count, fare: Number(r._sum.fare || 0) })),
             to: to.map(r => ({ station: r.toStation, count: r._count, fare: Number(r._sum.fare || 0) })) };
  }

  async byTrain() {
    const rows = await this.prisma.journey.groupBy({
      by: ['trainName'],
      _count: true,
      _sum: { fare: true },
      orderBy: { _count: { trainName: 'desc' } },
    });
    return rows.map(r => ({ train: r.trainName, count: r._count, fare: Number(r._sum.fare || 0) }));
  }

  async byChairType() {
    const rows = await this.prisma.journey.groupBy({
      by: ['chairType'],
      _count: true,
      _sum: { fare: true },
    });
    return rows.map(r => ({ chairType: r.chairType, count: r._count, fare: Number(r._sum.fare || 0) }));
  }

  async byDayNight() {
    const rows = await this.prisma.journey.groupBy({
      by: ['dayNight'],
      _count: true,
      _sum: { fare: true },
    });
    return rows.map(r => ({ dayNight: r.dayNight, count: r._count, fare: Number(r._sum.fare || 0) }));
  }

  async byMonth() {
    const rows = await this.prisma.journey.findMany({
      select: { journeyDate: true, fare: true },
      orderBy: { journeyDate: 'asc' },
    });
    const map = new Map<string, { month: string; count: number; fare: number }>();
    for (const r of rows) {
      const month = r.journeyDate.toISOString().slice(0, 7);
      const cur = map.get(month) || { month, count: 0, fare: 0 };
      cur.count += 1;
      cur.fare += Number(r.fare);
      map.set(month, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }

  async routes() {
    const rows = await this.prisma.journey.groupBy({
      by: ['fromStation', 'toStation'],
      _count: true,
      _sum: { fare: true },
      orderBy: { _count: { fromStation: 'desc' } },
    });
    return rows.map(r => ({
      route: `${r.fromStation} → ${r.toStation}`,
      from: r.fromStation,
      to: r.toStation,
      count: r._count,
      fare: Number(r._sum.fare || 0),
    }));
  }
}
