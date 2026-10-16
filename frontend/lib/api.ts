const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Journey {
  id: string;
  ticketNo?: string;
  trainName: string;
  trainNumber?: string;
  fromStation: string;
  toStation: string;
  journeyDate: string;
  departureTime: string;
  dayNight: string;
  chairType: string;
  coachNo?: string;
  seatNo?: string;
  fare: number;
  passengerName?: string;
  boardingPoint?: string;
  issuedAt?: string;
  transactionId?: string;
  source: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedTicket {
  ticketNo?: string;
  trainName?: string;
  trainNumber?: string;
  fromStation?: string;
  toStation?: string;
  journeyDate?: string;
  departureTime?: string;
  chairType?: string;
  coachNo?: string;
  seatNo?: string;
  fare?: number;
  passengerName?: string;
  boardingPoint?: string;
  issuedAt?: string;
  transactionId?: string;
}

export interface BulkParseResult {
  fileName: string;
  filePath: string;
  parsed?: ParsedTicket;
  error?: string;
}

/** Distinct existing values per column — powers the search dropdowns. */
export interface JourneyFacets {
  trainNames: string[];
  trainNumbers: string[];
  fromStations: string[];
  toStations: string[];
  departureTimes: string[];
  chairTypes: string[];
  coachNos: string[];
  passengerNames: string[];
  ticketNos: string[];
  /** YYYY-MM-DD */
  journeyDates: string[];
}

export interface DuplicateEntry {
  index: number;
  ticketNo: string;
  existing: Journey | null;
}

export interface BulkConfirmResult {
  created: Journey[];
  createdCount: number;
  failed: { index: number; message: string }[];
  failedCount: number;
  duplicates: DuplicateEntry[];
  duplicateCount: number;
}

/* ------------------------------- analytics ------------------------------- */

export interface AnalyticsFilters {
  from?: string;
  to?: string;
  trainName?: string;
  chairType?: string;
  fromStation?: string;
  toStation?: string;
  dayNight?: string;
  budget?: number | string;
  [k: string]: string | number | undefined;
}

export interface JourneyRow {
  id: string;
  ticketNo: string | null;
  trainName: string;
  trainNumber: string | null;
  fromStation: string;
  toStation: string;
  journeyDate: string;
  departureTime: string;
  fare: number;
  chairType: string;
  dayNight: string;
  coachNo: string | null;
  passengerName: string | null;
  issuedAt: string | null;
  source: string;
}

export interface AnalyticsFacets {
  trainNames: string[];
  chairTypes: string[];
  fromStations: string[];
  toStations: string[];
  dateRange: { min: string; max: string } | null;
}

export interface AnalyticsTable {
  items: JourneyRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MonthPoint { month: string; key: string; journeys: number; fare: number; avgFare: number; activeDays: number }
export interface WeekPoint { week: string; key: string; journeys: number; fare: number }
export interface PeriodPoint { month: string; key: string; journeys: number | null; fare: number | null }
export interface GrowthPoint { month: string; key: string; journeyGrowth: number | null; fareGrowth: number | null }
export interface YearRow { year: number; journeys: number; fare: number; months: { month: string; monthIndex: number; journeys: number; fare: number }[] }
export interface DayNightPoint { month: string; key: string; Day: number; Night: number }

export interface TrainStat { train: string; journeys: number; fare: number; avgFare: number }
export interface ChairStat { chairType: string; journeys: number; fare: number; avgFare: number }
export interface DayNightStat { dayNight: string; journeys: number; fare: number; avgFare: number }
export interface StationStat { station: string; journeys: number; fare: number; avgFare: number }
export interface RouteStat { route: string; from: string; to: string; journeys: number; fare: number; avgFare: number }

export interface HistogramBin { label: string; from: number; to: number; count: number }
export interface BoxStats { min: number; q1: number; median: number; q3: number; max: number; mean: number; lowFence: number; highFence: number; outliers: number[] }
export interface HeatmapRow { day: string; hours: number[] }
export interface HeatmapGridRow { label: string; values: number[] }
export interface HeatmapGrid { columns: string[]; trainMonth: { rows: HeatmapGridRow[] }; routeMonth: { rows: HeatmapGridRow[] } }
export interface BoxGroup { label: string; fare: BoxStats | null }
export interface CalendarDay { date: string; journeys: number; fare: number }
export interface StackedDayNight { train: string; Day: number; Night: number }
export interface ParetoRow { name: string; value: number; cumulative: number }
export interface Insight { tone: string; title: string; text: string }
export interface Anomaly { id: string; type: string; value: number; expected: number; z: number; trainName: string; route: string; date: string }
export interface PeriodSummary { label: string; key: string; journeys: number; fare: number; avgFare: number; day: number; night: number }
export interface NetworkPayload {
  nodes: { id: string; journeys: number; fare: number }[];
  links: { source: string; target: string; route: string; journeys: number; fare: number }[];
}

export interface AnalyticsOverview {
  meta: { filtered: number; total: number; dateRange: { min: string; max: string } | null; months: number; generatedAt: string };
  kpis: Record<string, any>;
  monthly: MonthPoint[];
  cumulative: { month: string; key: string; journeys: number; fare: number }[];
  rolling: PeriodPoint[];
  growth: GrowthPoint[];
  weekly: WeekPoint[];
  yoy: YearRow[];
  seasonality: { year: number; month: string; monthIndex: number; journeys: number; fare: number }[];
  dayNightTrend: DayNightPoint[];
  byTrain: TrainStat[];
  byChairType: ChairStat[];
  byDayNight: DayNightStat[];
  origin: StationStat[];
  destination: StationStat[];
  routes: RouteStat[];
  weekday: { day: string; journeys: number; fare: number }[];
  hourly: { hour: string; hourNum: number; journeys: number; fare: number }[];
  weekdayHourHeatmap: HeatmapRow[];
  calendar: CalendarDay[];
  odMatrix: { route: string; from: string; to: string; journeys: number }[];
  heatmaps: HeatmapGrid;
  weekdayWeekend: { weekday: { journeys: number; fare: number; avgFare: number }; weekend: { journeys: number; fare: number; avgFare: number } };
  fareHistogram: HistogramBin[];
  routeBoxes: BoxGroup[];
  chairBoxes: { label: string; fare: BoxStats | null }[];
  fareBox: BoxStats | null;
  paretoTrain: ParetoRow[];
  paretoRoute: ParetoRow[];
  scatter: {
    routeFreqVsFare: { route: string; journeys: number; avgFare: number; fare: number }[];
    trainPopVsFare: { train: string; journeys: number; avgFare: number; fare: number }[];
    deptTimeVsFare: { id: string; deptMins: number; fare: number; trainName: string; date: string }[];
  };
  stacked: {
    trainChair: Record<string, any>[];
    trainDayNight: StackedDayNight[];
    dayNightChair: { chairType: string; Day: number; Night: number }[];
    fareByChairMonth: Record<string, any>[];
    chairKeys: string[];
    trainKeys: string[];
  };
  radarMonthly: { subject: string; Journeys: number; Fare: number }[];
  radarTrain: Record<string, any>[];
  radarTrainKeys: string[];
  bump: Record<string, any>[];
  bumpKeys: string[];
  forecast: { month: string; key: string; journeys: number | null; fare: number | null; journeysForecast: number | null; fareForecast: number | null }[];
  anomalies: Anomaly[];
  topJourneys: { expensive: JourneyRow | null; cheapest: JourneyRow | null };
  streak: { longestDayStreak: number; longestWeekStreak: number; travelDatesCount: number; bestMonth: MonthPoint | null };
  comparison: { current: PeriodSummary | null; previous: PeriodSummary | null };
  network: NetworkPayload;
  insights: Insight[];
  recent: JourneyRow[];
}

const qs = (params?: Record<string, any>) => {
  if (!params) return '';
  const clean: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') clean[k] = String(v);
  });
  return Object.keys(clean).length ? '?' + new URLSearchParams(clean).toString() : '';
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

export const api = {
  getJourneys: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<Journey[]>(`/journeys${qs}`);
  },
  getFacets: () => request<JourneyFacets>('/journeys/facets'),
  getJourney: (id: string) => request<Journey>(`/journeys/${id}`),
  createJourney: (data: Partial<Journey>) =>
    request<Journey>('/journeys', { method: 'POST', body: JSON.stringify(data) }),
  updateJourney: (id: string, data: Partial<Journey>) =>
    request<Journey>(`/journeys/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteJourney: (id: string) =>
    request<Journey>(`/journeys/${id}`, { method: 'DELETE' }),
  deleteJourneys: (ids: string[]) =>
    request<{ deleted: number }>('/journeys', { method: 'DELETE', body: JSON.stringify({ ids }) }),
  uploadTicket: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${API}/tickets/upload`, { method: 'POST', body: fd }).then((r) =>
      r.ok ? r.json() : r.json().then((e) => { throw new Error(e.message); })
    );
  },
  uploadTickets: async (files: File[]): Promise<BulkParseResult[]> => {
    const fd = new FormData();
    files.forEach((file) => fd.append('files', file));
    const res = await fetch(`${API}/tickets/upload-many`, { method: 'POST', body: fd });
    // Read as text first: a proxy/over-limit rejection is often HTML, not JSON,
    // and res.json() would then surface a useless parse error.
    const raw = await res.text();
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
    if (!res.ok) {
      const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
      throw new Error(
        message ||
        `Upload failed (HTTP ${res.status}${res.status === 413 ? ' — the request was too large' : ''}).`,
      );
    }
    return (Array.isArray(data) ? data : []) as BulkParseResult[];
  },
  confirmTicket: (parsed: ParsedTicket) =>
    request<Journey>('/tickets/confirm', { method: 'POST', body: JSON.stringify({ parsed }) }),
  confirmTickets: (list: ParsedTicket[]) =>
    request<BulkConfirmResult>('/tickets/confirm-many', { method: 'POST', body: JSON.stringify({ parsed: list }) }),
  analytics: {
    overview: (filters?: AnalyticsFilters) => request<AnalyticsOverview>(`/analytics/overview${qs(filters)}`),
    facets: (filters?: AnalyticsFilters) => request<AnalyticsFacets>(`/analytics/facets${qs(filters)}`),
    journeys: (filters?: AnalyticsFilters) => request<AnalyticsTable>(`/analytics/journeys${qs(filters)}`),
  },
};
