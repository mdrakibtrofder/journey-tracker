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
  uploadTicket: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${API}/tickets/upload`, { method: 'POST', body: fd }).then((r) =>
      r.ok ? r.json() : r.json().then((e) => { throw new Error(e.message); })
    );
  },
  confirmTicket: (parsed: ParsedTicket) =>
    request<Journey>('/tickets/confirm', { method: 'POST', body: JSON.stringify({ parsed }) }),
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
