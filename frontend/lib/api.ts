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
  arrivalTime?: string;
  durationMins?: number;
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

export interface BulkParseResult {
  fileName: string;
  filePath: string;
  parsed?: ParsedTicket;
  error?: string;
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
    summary: () => request('/analytics/summary'),
    byStation: () => request('/analytics/by-station'),
    byTrain: () => request('/analytics/by-train'),
    byChairType: () => request('/analytics/by-chair-type'),
    byDayNight: () => request('/analytics/by-day-night'),
    byMonth: () => request('/analytics/by-month'),
    routes: () => request('/analytics/routes'),
  },
};
