import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto, JourneysTableQueryDto } from './dto/analytics-query.dto';

/* ------------------------------- small maths ------------------------------ */

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
const round = (n: number, d = 0) => {
  const f = 10 ** d;
  return Math.round((n + Number.EPSILON) * f) / f;
};
const num = (v: unknown) => Number(v || 0);

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

function boxStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowFence = q1 - 1.5 * iqr;
  const highFence = q3 + 1.5 * iqr;
  return {
    min: round(sorted[0]),
    q1: round(q1),
    median: round(median),
    q3: round(q3),
    max: round(sorted[sorted.length - 1]),
    mean: round(mean(sorted)),
    lowFence: round(lowFence),
    highFence: round(highFence),
    outliers: sorted.filter((v) => v < lowFence || v > highFence).map((v) => round(v)),
  };
}

/** Equal-width histogram bins, with a small overflow bucket at the top. */
function histogram(values: number[], binCount = 8, label?: (from: number, to: number, i: number) => string) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ label: label ? label(min, max, 0) : `${round(min)}`, from: round(min), to: round(max), count: values.length }];
  const width = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => {
    const from = min + width * i;
    const to = i === binCount - 1 ? max : min + width * (i + 1);
    return {
      label: label ? label(from, to, i) : `${round(from)}–${round(to)}`,
      from: round(from),
      to: round(to),
      count: 0,
    };
  });
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count += 1;
  }
  return bins;
}

function linearFit(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n < 2) {
    const y = n ? points[0].y : 0;
    return { slope: 0, intercept: y };
  }
  const mx = mean(points.map((p) => p.x));
  const my = mean(points.map((p) => p.y));
  const denom = sum(points.map((p) => (p.x - mx) ** 2));
  const slope = denom === 0 ? 0 : sum(points.map((p) => (p.x - mx) * (p.y - my))) / denom;
  return { slope, intercept: my - slope * mx };
}

function rollingAverage(values: number[], window = 3): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null;
    return round(mean(values.slice(i - window + 1, i + 1)), 1);
  });
}

function pareto(entries: { name: string; value: number }[], limit = 12) {
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  const total = sum(sorted.map((e) => e.value)) || 1;
  let running = 0;
  const rows = sorted.map((e) => {
    running += e.value;
    return {
      name: e.name,
      value: round(e.value),
      cumulative: round((running / total) * 100, 1),
    };
  });
  if (rows.length <= limit) return rows;
  const head = rows.slice(0, limit);
  const tail = rows.slice(limit);
  return [
    ...head,
    {
      name: 'Others',
      value: round(sum(tail.map((t) => t.value))),
      cumulative: 100,
    },
  ];
}

/* --------------------------------- dates --------------------------------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthKey = (d: Date) => d.toISOString().slice(0, 7);
const monthLabel = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
/** 0 = Monday … 6 = Sunday */
const dayIndex = (d: Date) => (d.getUTCDay() + 6) % 7;
const startOfIsoWeek = (d: Date) => {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  copy.setUTCDate(copy.getUTCDate() - dayIndex(copy));
  return copy;
};
const addMonths = (key: string, delta: number) => {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7)) - 1 + delta;
  const date = new Date(Date.UTC(y, m, 1));
  return date.toISOString().slice(0, 7);
};

/* --------------------------------- types --------------------------------- */

export interface Row {
  id: string;
  ticketNo: string | null;
  trainName: string;
  trainNumber: string | null;
  fromStation: string;
  toStation: string;
  journeyDate: Date;
  departureTime: string;
  fare: number;
  chairType: string;
  dayNight: string;
  coachNo: string | null;
  passengerName: string | null;
  issuedAt: Date | null;
  source: string;
}

interface Bucket {
  journeys: number;
  fare: number;
}

const emptyBucket = (): Bucket => ({ journeys: 0, fare: 0 });

function addTo(map: Map<string, Bucket>, key: string, fare: number) {
  const b = map.get(key) || emptyBucket();
  b.journeys += 1;
  b.fare += fare;
  map.set(key, b);
}

function exportBucket(key: string, b: Bucket, keyName: string): Record<string, any> {
  return {
    [keyName]: key,
    journeys: b.journeys,
    fare: round(b.fare),
    avgFare: round(b.fare / b.journeys),
  };
}

/* -------------------------------- service -------------------------------- */

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private where(dto: AnalyticsQueryDto) {
    const where: any = {};
    if (dto.trainName) where.trainName = dto.trainName;
    if (dto.chairType) where.chairType = dto.chairType;
    if (dto.fromStation) where.fromStation = dto.fromStation;
    if (dto.toStation) where.toStation = dto.toStation;
    if (dto.dayNight) where.dayNight = dto.dayNight;
    if (dto.from || dto.to) {
      where.journeyDate = {};
      if (dto.from) where.journeyDate.gte = new Date(`${dto.from}T00:00:00.000Z`);
      if (dto.to) where.journeyDate.lte = new Date(`${dto.to}T23:59:59.999Z`);
    }
    if (dto.minFare != null || dto.maxFare != null) {
      where.fare = {};
      if (dto.minFare != null) where.fare.gte = dto.minFare;
      if (dto.maxFare != null) where.fare.lte = dto.maxFare;
    }
    if (dto.search) {
      const words = dto.search.trim().split(/\s+/).filter(Boolean);
      if (words.length) {
        const fields = ['trainName', 'trainNumber', 'fromStation', 'toStation', 'chairType', 'coachNo', 'passengerName', 'ticketNo'];
        where.AND = words.map((w) => ({
          OR: fields.map((f) => ({ [f]: { contains: w, mode: 'insensitive' } })),
        }));
      }
    }
    return where;
  }

  private select = {
    id: true,
    ticketNo: true,
    trainName: true,
    trainNumber: true,
    fromStation: true,
    toStation: true,
    journeyDate: true,
    departureTime: true,
    fare: true,
    chairType: true,
    dayNight: true,
    coachNo: true,
    passengerName: true,
    issuedAt: true,
    source: true,
  } as const;

  private async rows(dto: AnalyticsQueryDto): Promise<Row[]> {
    const found = await this.prisma.journey.findMany({
      where: this.where(dto),
      select: this.select,
      orderBy: { journeyDate: 'asc' },
    });
    return found.map((r) => ({ ...r, fare: num(r.fare) })) as Row[];
  }

  /** Filter dropdown values, scoped to the current filter set. */
  async facets(dto: AnalyticsQueryDto) {
    const rows = await this.rows(dto);
    const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean))).sort((a, b) => a.localeCompare(b));
    return {
      trainNames: uniq(rows.map((r) => r.trainName)),
      chairTypes: uniq(rows.map((r) => r.chairType)),
      fromStations: uniq(rows.map((r) => r.fromStation)),
      toStations: uniq(rows.map((r) => r.toStation)),
      dateRange: rows.length
        ? { min: iso(rows[0].journeyDate), max: iso(rows[rows.length - 1].journeyDate) }
        : null,
    };
  }

  /**
   * Everything the dashboard and analytics pages need, computed in one pass so
   * both pages stay in sync and the client makes a single request.
   */
  async overview(dto: AnalyticsQueryDto) {
    const [rows, totalAll] = await Promise.all([
      this.rows(dto),
      this.prisma.journey.count(),
    ]);

    const fares = rows.map((r) => r.fare);

    /* ---------------------------- grouped buckets ---------------------------- */
    const byTrainMap = new Map<string, Bucket>();
    const byChairMap = new Map<string, Bucket>();
    const byDayNightMap = new Map<string, Bucket>();
    const originMap = new Map<string, Bucket>();
    const destMap = new Map<string, Bucket>();
    const routeMap = new Map<string, Bucket & { from: string; to: string }>();
    const monthMap = new Map<string, Bucket & { days: Set<string> }>();
    const weekdayMap = new Map<number, Bucket>();
    const hourMap = new Map<number, Bucket>();
    const monthChairMap = new Map<string, Map<string, number>>();

    for (const r of rows) {
      addTo(byTrainMap, r.trainName, r.fare);
      addTo(byChairMap, r.chairType, r.fare);
      addTo(byDayNightMap, r.dayNight, r.fare);
      addTo(originMap, r.fromStation, r.fare);
      addTo(destMap, r.toStation, r.fare);

      const routeKey = `${r.fromStation} → ${r.toStation}`;
      let rb = routeMap.get(routeKey);
      if (!rb) {
        rb = { ...emptyBucket(), from: r.fromStation, to: r.toStation };
        routeMap.set(routeKey, rb);
      }
      rb.journeys += 1;
      rb.fare += r.fare;

      const mk = monthKey(r.journeyDate);
      let mb = monthMap.get(mk);
      if (!mb) {
        mb = { ...emptyBucket(), days: new Set<string>() };
        monthMap.set(mk, mb);
      }
      mb.journeys += 1;
      mb.fare += r.fare;
      mb.days.add(iso(r.journeyDate));

      const di = dayIndex(r.journeyDate);
      const db = weekdayMap.get(di) || emptyBucket();
      db.journeys += 1;
      db.fare += r.fare;
      weekdayMap.set(di, db);

      const hour = Number((r.departureTime || '0:0').split(':')[0]) || 0;
      const hb = hourMap.get(hour) || emptyBucket();
      hb.journeys += 1;
      hb.fare += r.fare;
      hourMap.set(hour, hb);

      const chairForMonth = monthChairMap.get(mk) || new Map<string, number>();
      chairForMonth.set(r.chairType, (chairForMonth.get(r.chairType) || 0) + r.fare);
      monthChairMap.set(mk, chairForMonth);
    }

    const months = Array.from(monthMap.keys()).sort();
    const chairKeys = Array.from(byChairMap.keys()).sort();
    const trainKeys = Array.from(byTrainMap.entries())
      .sort((a, b) => b[1].journeys - a[1].journeys)
      .slice(0, 6)
      .map(([k]) => k);

    /* ------------------------------- time series ----------------------------- */
    const filledMonths: string[] = [];
    if (months.length) {
      let cursor = months[0];
      const last = months[months.length - 1];
      while (cursor <= last) {
        filledMonths.push(cursor);
        cursor = addMonths(cursor, 1);
      }
    }

    const monthly = filledMonths.map((m) => {
      const b = monthMap.get(m);
      return {
        month: monthLabel(m),
        key: m,
        journeys: b?.journeys || 0,
        fare: round(b?.fare || 0),
        avgFare: b?.journeys ? round((b.fare || 0) / b.journeys) : 0,
        activeDays: b?.days.size || 0,
      };
    });

    const journeySeries = monthly.map((m) => m.journeys);
    const fareSeries = monthly.map((m) => m.fare);

    let runJ = 0;
    let runF = 0;
    const cumulative = monthly.map((m) => {
      runJ += m.journeys;
      runF += m.fare;
      return { month: m.month, key: m.key, journeys: runJ, fare: round(runF) };
    });

    const rollJ = rollingAverage(journeySeries, 3);
    const rollF = rollingAverage(fareSeries, 3);
    const rolling = monthly.map((m, i) => ({
      month: m.month,
      key: m.key,
      journeys: rollJ[i],
      fare: rollF[i],
    }));

    const growth = monthly.map((m, i) => {
      if (i === 0) return { month: m.month, key: m.key, journeyGrowth: null as number | null, fareGrowth: null as number | null };
      const prev = monthly[i - 1];
      return {
        month: m.month,
        key: m.key,
        journeyGrowth: prev.journeys ? round(((m.journeys - prev.journeys) / prev.journeys) * 100, 1) : null,
        fareGrowth: prev.fare ? round(((m.fare - prev.fare) / prev.fare) * 100, 1) : null,
      };
    });

    const yearMap = new Map<number, { months: { month: string; index: number; journeys: number; fare: number }[]; journeys: number; fare: number }>();
    for (const m of monthly) {
      const year = Number(m.key.slice(0, 4));
      const entry = yearMap.get(year) || { months: [], journeys: 0, fare: 0 };
      entry.months.push({ month: MONTHS[Number(m.key.slice(5, 7)) - 1], index: Number(m.key.slice(5, 7)), journeys: m.journeys, fare: m.fare });
      entry.journeys += m.journeys;
      entry.fare += m.fare;
      yearMap.set(year, entry);
    }
    const years = Array.from(yearMap.keys()).sort();
    const yoy = years.map((y) => ({
      year: y,
      months: MONTHS.map((label, i) => {
        const found = yearMap.get(y)!.months.find((mm) => mm.index === i + 1);
        return { month: label, monthIndex: i + 1, journeys: found?.journeys || 0, fare: found?.fare || 0 };
      }),
      journeys: yearMap.get(y)!.journeys,
      fare: round(yearMap.get(y)!.fare),
    }));

    // Month-of-year seasonality across every year, for the seasonal heatmap.
    const seasonality = years.flatMap((y) =>
      yoy
        .find((e) => e.year === y)!
        .months.map((mm) => ({ year: y, month: mm.month, monthIndex: mm.monthIndex, journeys: mm.journeys, fare: mm.fare })),
    );

    const dayNightTrend = monthly.map((m) => {
      const b = monthMap.get(m.key);
      const day = rows.filter((r) => monthKey(r.journeyDate) === m.key && r.dayNight === 'DAY').length;
      const night = (b?.journeys || 0) - day;
      return { month: m.month, key: m.key, Day: day, Night: night };
    });

    /* ------------------------------ distributions ---------------------------- */
    const fareHistogram = histogram(fares, 8, (from, to) => `৳${Math.round(from)}–${Math.round(to)}`);
    const fareBox = boxStats(fares);

    /* --------------------------- ranking / comparison ------------------------ */
    const byTrain = Array.from(byTrainMap.entries())
      .map(([k, b]) => exportBucket(k, b, 'train'))
      .sort((a, b) => b.journeys - a.journeys);
    const byChairType = Array.from(byChairMap.entries())
      .map(([k, b]) => exportBucket(k, b, 'chairType'))
      .sort((a, b) => b.journeys - a.journeys);
    const byDayNight = Array.from(byDayNightMap.entries())
      .map(([k, b]) => exportBucket(k, b, 'dayNight'))
      .sort((a, b) => b.journeys - a.journeys);
    const origin = Array.from(originMap.entries())
      .map(([k, b]) => exportBucket(k, b, 'station'))
      .sort((a, b) => b.journeys - a.journeys);
    const destination = Array.from(destMap.entries())
      .map(([k, b]) => exportBucket(k, b, 'station'))
      .sort((a, b) => b.journeys - a.journeys);
    const routes = Array.from(routeMap.entries())
      .map(([k, b]) => ({
        route: k,
        from: b.from,
        to: b.to,
        journeys: b.journeys,
        fare: round(b.fare),
        avgFare: round(b.fare / b.journeys),
      }))
      .sort((a, b) => b.journeys - a.journeys);

    const weekday = DAYS.map((label, i) => {
      const b = weekdayMap.get(i);
      return { day: label, journeys: b?.journeys || 0, fare: round(b?.fare || 0) };
    });
    const hourly = Array.from({ length: 24 }, (_, h) => {
      const b = hourMap.get(h);
      return { hour: `${String(h).padStart(2, '0')}:00`, hourNum: h, journeys: b?.journeys || 0, fare: round(b?.fare || 0) };
    });

    const weekdayHourHeatmap = DAYS.map((day, di) => {
      const hours = Array.from({ length: 24 }, (_, h) =>
        rows.filter((r) => dayIndex(r.journeyDate) === di && (Number((r.departureTime || '0:0').split(':')[0]) || 0) === h).length,
      );
      return { day, hours };
    });

    const odMatrix = Array.from(routeMap.entries())
      .map(([route, b]) => ({ route, from: b.from, to: b.to, journeys: b.journeys }))
      .sort((a, b) => b.journeys - a.journeys);

    const calendar = Array.from(monthMap.values())
      .flatMap((b) => Array.from(b.days))
      .sort()
      .map((date) => {
        const dayRows = rows.filter((r) => iso(r.journeyDate) === date);
        return { date, journeys: dayRows.length, fare: round(sum(dayRows.map((r) => r.fare))) };
      });

    /* ---------------------- weekly series & heatmap grids -------------------- */
    const weekMap = new Map<string, Bucket>();
    for (const r of rows) addTo(weekMap, iso(startOfIsoWeek(r.journeyDate)), r.fare);
    const weekly = Array.from(weekMap.keys())
      .sort()
      .map((k) => {
        const b = weekMap.get(k)!;
        return { week: `${MONTHS[Number(k.slice(5, 7)) - 1]} ${Number(k.slice(8, 10))}`, key: k, journeys: b.journeys, fare: round(b.fare) };
      })
      .slice(-26);

    const trainHeatKeys = byTrain.slice(0, 8).map((t) => t.train);
    const routeHeatKeys = routes.slice(0, 8);
    const heatmaps = {
      columns: monthly.map((m) => m.month),
      trainMonth: {
        rows: trainHeatKeys.map((train) => ({
          label: train,
          values: months.map((mk) => rows.filter((r) => r.trainName === train && monthKey(r.journeyDate) === mk).length),
        })),
      },
      routeMonth: {
        rows: routeHeatKeys.map((rt) => ({
          label: rt.route,
          values: months.map((mk) => rows.filter((r) => `${r.fromStation} → ${r.toStation}` === rt.route && monthKey(r.journeyDate) === mk).length),
        })),
      },
    };

    /* --------------------- per-group boxes & hour profiles ------------------- */
    const fareOfRoute = (route: string) => rows.filter((r) => `${r.fromStation} → ${r.toStation}` === route).map((r) => r.fare);
    const routeBoxes = routes.slice(0, 6).map((rt) => ({
      label: rt.route,
      fare: boxStats(fareOfRoute(rt.route)),
    }));
    const chairBoxes = chairKeys.map((c) => ({
      label: c,
      fare: boxStats(rows.filter((r) => r.chairType === c).map((r) => r.fare)),
    }));

    const weekdayWeekend = (() => {
      const wd = rows.filter((r) => dayIndex(r.journeyDate) <= 4);
      const we = rows.filter((r) => dayIndex(r.journeyDate) >= 5);
      const pack = (list: Row[]) => ({
        journeys: list.length,
        fare: round(sum(list.map((r) => r.fare))),
        avgFare: list.length ? round(sum(list.map((r) => r.fare)) / list.length) : 0,
      });
      return { weekday: pack(wd), weekend: pack(we) };
    })();

    /* -------------------------------- stacked -------------------------------- */
    const trainChair = byTrain.slice(0, 8).map((t) => {
      const row: Record<string, any> = { train: t.train };
      chairKeys.forEach((c) => {
        row[c] = rows.filter((r) => r.trainName === t.train && r.chairType === c).length;
      });
      return row;
    });
    const trainDayNight = byTrain.slice(0, 8).map((t) => ({
      train: t.train,
      Day: rows.filter((r) => r.trainName === t.train && r.dayNight === 'DAY').length,
      Night: rows.filter((r) => r.trainName === t.train && r.dayNight === 'NIGHT').length,
    }));
    const dayNightChair = chairKeys.map((c) => ({
      chairType: c,
      Day: rows.filter((r) => r.chairType === c && r.dayNight === 'DAY').length,
      Night: rows.filter((r) => r.chairType === c && r.dayNight === 'NIGHT').length,
    }));
    const fareByChairMonth = monthly.map((m) => {
      const row: Record<string, any> = { month: m.month, key: m.key };
      const chairForMonth = monthChairMap.get(m.key);
      chairKeys.forEach((c) => { row[c] = round(chairForMonth?.get(c) || 0); });
      return row;
    });

    /* -------------------------------- scatter -------------------------------- */
    const scatter = {
      routeFreqVsFare: routes.slice(0, 30).map((r) => ({ route: r.route, journeys: r.journeys, avgFare: r.avgFare, fare: r.fare })),
      trainPopVsFare: byTrain.map((t) => ({ train: t.train, journeys: t.journeys, avgFare: t.avgFare, fare: t.fare })),
      deptTimeVsFare: rows.map((r) => ({
        id: r.id,
        deptMins: (Number((r.departureTime || '0:0').split(':')[0]) || 0) * 60 + (Number((r.departureTime || '0:0').split(':')[1]) || 0),
        fare: round(r.fare),
        trainName: r.trainName,
        date: iso(r.journeyDate),
      })),
    };

    /* --------------------------------- radar --------------------------------- */
    const maxOf = (xs: number[]) => Math.max(1, ...xs);
    const radarMonthly = monthly.slice(-6).map((m) => ({
      subject: m.month,
      Journeys: round((m.journeys / maxOf(monthly.map((x) => x.journeys))) * 100),
      Fare: round((m.fare / maxOf(monthly.map((x) => x.fare))) * 100),
    }));
    const radarTrainMetrics = ['Journeys', 'Fare', 'Avg fare'];
    const radarTrain = radarTrainMetrics.map((metric) => {
      const row: Record<string, any> = { metric };
      const top = byTrain.slice(0, 5);
      const values = top.map((t) => (metric === 'Journeys' ? t.journeys : metric === 'Fare' ? t.fare : t.avgFare));
      const max = maxOf(values);
      top.forEach((t, i) => { row[t.train] = round((values[i] / max) * 100); });
      return row;
    });

    /* ---------------------------------- bump --------------------------------- */
    const bumpKeys = Array.from(byTrainMap.entries())
      .sort((a, b) => b[1].journeys - a[1].journeys)
      .slice(0, 5)
      .map(([k]) => k);
    const bump = monthly.map((m) => {
      const ranked = bumpKeys
        .map((train) => ({
          train,
          journeys: rows.filter((r) => monthKey(r.journeyDate) === m.key && r.trainName === train).length,
        }))
        .sort((a, b) => b.journeys - a.journeys);
      const row: Record<string, any> = { month: m.month, key: m.key };
      ranked.forEach((r, i) => { row[r.train] = r.journeys > 0 ? i + 1 : null; });
      return row;
    });

    /* -------------------------------- forecast ------------------------------- */
    const points = monthly.map((m, i) => ({ x: i, y: m.journeys }));
    const farePoints = monthly.map((m, i) => ({ x: i, y: m.fare }));
    const fitJ = linearFit(points);
    const fitF = linearFit(farePoints);
    const forecast = [
      ...monthly.map((m) => ({ month: m.month, key: m.key, journeys: m.journeys, fare: m.fare, journeysForecast: null as number | null, fareForecast: null as number | null })),
      ...(monthly.length >= 3
        ? [1, 2, 3].map((step) => {
            const x = monthly.length - 1 + step;
            const key = addMonths(months[months.length - 1], step);
            return {
              month: monthLabel(key),
              key,
              journeys: null as number | null,
              fare: null as number | null,
              journeysForecast: Math.max(0, round(fitJ.slope * x + fitJ.intercept)),
              fareForecast: Math.max(0, round(fitF.slope * x + fitF.intercept)),
            };
          })
        : []),
    ];

    /* ------------------------------- anomalies ------------------------------- */
    const anomalies: any[] = [];
    if (fares.length >= 6) {
      const fareSd = stddev(fares);
      const fareMean = mean(fares);
      for (const r of rows) {
        const z = fareSd ? (r.fare - fareMean) / fareSd : 0;
        if (Math.abs(z) >= 2.5) {
          anomalies.push({
            id: r.id,
            type: 'Fare',
            value: round(r.fare),
            expected: round(fareMean),
            z: round(z, 1),
            trainName: r.trainName,
            route: `${r.fromStation} → ${r.toStation}`,
            date: iso(r.journeyDate),
          });
        }
      }
    }
    /* ------------------------------- top trips ------------------------------- */
    const topJourneys = {
      expensive: rows.length ? [...rows].sort((a, b) => b.fare - a.fare)[0] : null,
      cheapest: rows.length ? [...rows].sort((a, b) => a.fare - b.fare)[0] : null,
    };

    /* --------------------------------- streaks -------------------------------- */
    const travelDates = Array.from(new Set(rows.map((r) => iso(r.journeyDate)))).sort();
    let longestDayStreak = 0;
    let run = 0;
    let prev: string | null = null;
    for (const d of travelDates) {
      if (prev) {
        const expected = new Date(`${prev}T00:00:00.000Z`);
        expected.setUTCDate(expected.getUTCDate() + 1);
        run = iso(expected) === d ? run + 1 : 1;
      } else {
        run = 1;
      }
      longestDayStreak = Math.max(longestDayStreak, run);
      prev = d;
    }
    const weeks = Array.from(new Set(rows.map((r) => iso(startOfIsoWeek(r.journeyDate))))).sort();
    let longestWeekStreak = 0;
    let weekRun = 0;
    let prevWeek: string | null = null;
    for (const w of weeks) {
      if (prevWeek) {
        const expected = new Date(`${prevWeek}T00:00:00.000Z`);
        expected.setUTCDate(expected.getUTCDate() + 7);
        weekRun = iso(expected) === w ? weekRun + 1 : 1;
      } else {
        weekRun = 1;
      }
      longestWeekStreak = Math.max(longestWeekStreak, weekRun);
      prevWeek = w;
    }
    const streak = {
      longestDayStreak,
      longestWeekStreak,
      travelDatesCount: travelDates.length,
      bestMonth: monthly.length ? monthly.reduce((a, b) => (b.journeys > a.journeys ? b : a)) : null,
    };

    /* ------------------------------- comparison ------------------------------ */
    const nowKey = new Date().toISOString().slice(0, 7);
    const currentKey = months.includes(nowKey) ? nowKey : months[months.length - 1] || null;
    const previousKey = currentKey ? months[months.indexOf(currentKey) - 1] || null : null;
    const packPeriod = (key: string | null) => {
      if (!key) return null;
      const list = rows.filter((r) => monthKey(r.journeyDate) === key);
      const f = sum(list.map((r) => r.fare));
      return {
        label: monthLabel(key),
        key,
        journeys: list.length,
        fare: round(f),
        avgFare: list.length ? round(f / list.length) : 0,
        day: list.filter((r) => r.dayNight === 'DAY').length,
        night: list.filter((r) => r.dayNight === 'NIGHT').length,
      };
    };
    const comparison = { current: packPeriod(currentKey), previous: packPeriod(previousKey) };

    /* -------------------------------- network -------------------------------- */
    const stationStats = new Map<string, Bucket>();
    for (const r of rows) {
      addTo(stationStats, r.fromStation, r.fare);
      addTo(stationStats, r.toStation, 0);
    }
    const network = {
      nodes: Array.from(stationStats.entries()).map(([id, b]) => ({ id, journeys: b.journeys, fare: round(b.fare) })),
      links: Array.from(routeMap.entries()).map(([route, b]) => ({ source: b.from, target: b.to, route, journeys: b.journeys, fare: round(b.fare) })),
    };

    /* ---------------------------------- KPIs --------------------------------- */
    const totalFare = sum(fares);
    const totalJourneys = rows.length;
    const monthCount = months.length || 1;
    const weekCount = weeks.length || 1;
    const dayOnly = rows.filter((r) => r.dayNight === 'DAY').length;
    const nightOnly = totalJourneys - dayOnly;
    const routeCount = routeMap.size;
    const trainCount = byTrainMap.size;
    const sortedFares = [...fares].sort((a, b) => a - b);
    const monthFareMap = new Map(monthly.map((m) => [m.key, m.fare]));
    const currentMonthFare = currentKey ? monthFareMap.get(currentKey) || 0 : 0;

    const kpis: Record<string, any> = {
      totalJourneys,
      totalFare: round(totalFare),
      avgFare: totalJourneys ? round(totalFare / totalJourneys) : 0,
      medianFare: round(quantile(sortedFares, 0.5)),
      highestFare: fares.length ? round(Math.max(...fares)) : 0,
      lowestFare: fares.length ? round(Math.min(...fares)) : 0,
      fareSpread: fares.length ? round(Math.max(...fares) - Math.min(...fares)) : 0,

      uniqueRoutes: routeCount,
      uniqueTrains: trainCount,
      uniqueOrigins: originMap.size,
      uniqueDestinations: destMap.size,
      totalTravelDays: travelDates.length,
      totalTravelWeeks: weeks.length,
      monthsSpan: months.length,

      mostFrequentTrain: byTrain[0] || null,
      mostFrequentRoute: routes[0] || null,
      mostExpensiveRoute: routes.length ? [...routes].sort((a, b) => b.avgFare - a.avgFare)[0] : null,
      cheapestRoute: routes.length ? [...routes].sort((a, b) => a.avgFare - b.avgFare)[0] : null,
      mostUsedChairClass: byChairType[0] || null,
      mostVisitedOrigin: origin[0] || null,
      mostVisitedDestination: destination[0] || null,

      dayJourneys: dayOnly,
      nightJourneys: nightOnly,
      dayPct: totalJourneys ? round((dayOnly / totalJourneys) * 100, 1) : 0,
      nightPct: totalJourneys ? round((nightOnly / totalJourneys) * 100, 1) : 0,

      avgPerMonth: round(totalJourneys / monthCount, 1),
      avgPerWeek: round(totalJourneys / weekCount, 2),
      avgMonthlySpend: round(totalFare / monthCount),
      avgWeeklySpend: round(totalFare / weekCount),

      momJourneyGrowth: comparison.current && comparison.previous && comparison.previous.journeys
        ? round(((comparison.current.journeys - comparison.previous.journeys) / comparison.previous.journeys) * 100, 1)
        : null,
      momFareGrowth: comparison.current && comparison.previous && comparison.previous.fare
        ? round(((comparison.current.fare - comparison.previous.fare) / comparison.previous.fare) * 100, 1)
        : null,

      bestMonth: streak.bestMonth,
      longestDayStreak,
      longestWeekStreak,
      avgFarePerDayTravelled: travelDates.length ? round(totalFare / travelDates.length) : 0,

      budget: dto.budget ?? null,
      currentMonthFare: round(currentMonthFare),
      budgetUtilization: dto.budget ? round((currentMonthFare / dto.budget) * 100, 1) : null,
      budgetRemaining: dto.budget ? round(dto.budget - currentMonthFare) : null,

      // "Efficiency score": share of your spending that went to non-AC classes
      // combined with how consistently you travel — a simple 0–100 heuristic.
      efficiencyScore: (() => {
        if (!totalJourneys) return 0;
        const economyShare = sum(rows.filter((r) => ['SHOVAN', 'SHOVAN_CHAIR', 'F_SEAT', 'F_BERTH'].includes(r.chairType)).map((r) => r.fare)) / (totalFare || 1);
        const consistency = Math.min(1, travelDates.length / (months.length * 4 || 1));
        return round(economyShare * 60 + consistency * 40);
      })(),
    };

    /* -------------------------------- insights ------------------------------- */
    const insights: { tone: string; title: string; text: string }[] = [];
    if (totalJourneys) {
      if (kpis.mostFrequentTrain) {
        insights.push({
          tone: 'brand',
          title: `You travel most on ${kpis.mostFrequentTrain.train}`,
          text: `${kpis.mostFrequentTrain.journeys} of your ${totalJourneys} journeys (${round((kpis.mostFrequentTrain.journeys / totalJourneys) * 100)}%) were on this service.`,
        });
      }
      if (kpis.mostFrequentRoute) {
        insights.push({
          tone: 'emerald',
          title: 'Favourite route',
          text: `${kpis.mostFrequentRoute.route} is your top route with ${kpis.mostFrequentRoute.journeys} trips, averaging ৳${kpis.mostFrequentRoute.avgFare} each.`,
        });
      }
      if (comparison.current && comparison.previous) {
        const delta = comparison.current.journeys - comparison.previous.journeys;
        insights.push({
          tone: delta >= 0 ? 'emerald' : 'amber',
          title: `${monthLabel(comparison.current.key)} vs ${monthLabel(comparison.previous.key)}`,
          text: delta === 0
            ? `You made the same number of journeys (${comparison.current.journeys}) in both months.`
            : `You made ${Math.abs(delta)} ${delta > 0 ? 'more' : 'fewer'} journeys in ${monthLabel(comparison.current.key)} than ${monthLabel(comparison.previous.key)}.`,
        });
      }
      if (nightOnly > dayOnly) {
        insights.push({
          tone: 'violet',
          title: 'Night traveller',
          text: `${round((nightOnly / totalJourneys) * 100)}% of your journeys depart at night.`,
        });
      } else {
        insights.push({
          tone: 'amber',
          title: 'Day traveller',
          text: `${round((dayOnly / totalJourneys) * 100)}% of your journeys depart during the day.`,
        });
      }
      if (dto.budget) {
        const used = kpis.budgetUtilization as number;
        insights.push({
          tone: used > 100 ? 'rose' : used > 80 ? 'amber' : 'emerald',
          title: `Budget ${used > 100 ? 'exceeded' : 'on track'}`,
          text: `You have spent ৳${kpis.currentMonthFare} of your ৳${dto.budget} monthly budget (${used}%).`,
        });
      }
      const chairTop = kpis.mostUsedChairClass;
      if (chairTop) {
        insights.push({
          tone: 'brand',
          title: `${chairTop.chairType.replace(/_/g, ' ')} is your go-to class`,
          text: `${chairTop.journeys} journeys in this class, ৳${chairTop.avgFare} average fare.`,
        });
      }
      if (weekdayWeekend.weekend.journeys > weekdayWeekend.weekday.journeys) {
        insights.push({ tone: 'violet', title: 'Weekend traveller', text: 'More of your journeys happen on weekends than weekdays.' });
      }
      const busiest = [...weekday].sort((a, b) => b.journeys - a.journeys)[0];
      if (busiest && busiest.journeys) {
        insights.push({ tone: 'accent', title: `${busiest.day} is your busiest day`, text: `${busiest.journeys} journeys departed on a ${busiest.day}.` });
      }
      if (longestDayStreak > 1) {
        insights.push({ tone: 'emerald', title: `${longestDayStreak}-day travel streak`, text: `That's your longest run of consecutive travel days.` });
      }
      if (anomalies.length) {
        insights.push({
          tone: 'amber',
          title: `${anomalies.length} unusual ${anomalies.length === 1 ? 'entry' : 'entries'} detected`,
          text: `Fares well outside your normal range — worth a quick review.`,
        });
      }
    }

    /* ---------------------------------- meta --------------------------------- */
    const meta = {
      filtered: totalJourneys,
      total: totalAll,
      dateRange: rows.length ? { min: iso(rows[0].journeyDate), max: iso(rows[rows.length - 1].journeyDate) } : null,
      months: months.length,
      generatedAt: new Date().toISOString(),
    };

    const recent = [...rows]
      .sort((a, b) => b.journeyDate.getTime() - a.journeyDate.getTime() || b.departureTime.localeCompare(a.departureTime))
      .slice(0, 6);

    return {
      meta,
      kpis,
      monthly,
      cumulative,
      rolling,
      growth,
      weekly,
      yoy,
      seasonality,
      dayNightTrend,
      byTrain,
      byChairType,
      byDayNight,
      origin,
      destination,
      routes,
      weekday,
      hourly,
      weekdayHourHeatmap,
      calendar,
      odMatrix,
      heatmaps,
      weekdayWeekend,
      fareHistogram,
      routeBoxes,
      chairBoxes,
      fareBox,
      paretoTrain: pareto(byTrain.map((t) => ({ name: t.train, value: t.fare }))),
      paretoRoute: pareto(routes.map((r) => ({ name: r.route, value: r.fare }))),
      scatter,
      stacked: { trainChair, trainDayNight, dayNightChair, fareByChairMonth, chairKeys, trainKeys },
      radarMonthly,
      radarTrain,
      radarTrainKeys: byTrain.slice(0, 5).map((t) => t.train),
      bump,
      bumpKeys,
      forecast,
      anomalies,
      topJourneys,
      streak,
      comparison,
      network,
      insights,
      recent,
    };
  }

  /** Filtered, sorted, paginated journey list for the analytics data table. */
  async journeysTable(dto: JourneysTableQueryDto) {
    const rows = await this.rows(dto);
    const sort = dto.sort || 'date';
    const dir = dto.order || 'desc';
    const sorted = [...rows].sort((a, b) => {
      let diff = 0;
      if (sort === 'fare') diff = a.fare - b.fare;
      else diff = a.journeyDate.getTime() - b.journeyDate.getTime() || a.departureTime.localeCompare(b.departureTime);
      return dir === 'asc' ? diff : -diff;
    });

    const page = dto.page || 1;
    const pageSize = Math.min(dto.pageSize || 25, 200);
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);

    return {
      items: items.map((r) => ({
        ...r,
        journeyDate: iso(r.journeyDate),
        issuedAt: r.issuedAt ? r.issuedAt.toISOString() : null,
      })),
      total: sorted.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(sorted.length / pageSize)),
    };
  }
}
