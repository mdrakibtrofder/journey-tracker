export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function parseDateLike(d?: string | null): Date | null {
  if (!d) return null;
  // The PDF parser emits "YYYY-MM-DD HH:mm"; normalise the separator so every
  // browser parses it.
  const dt = new Date(d.replace(' ', 'T'));
  return isNaN(dt.getTime()) ? null : dt;
}

/** "10 Oct 2026, 14:57" — for issue date & time. */
export function formatDateTime(d?: string | null): string {
  const dt = parseDateLike(d);
  if (!dt) return '—';
  return dt.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

/** Value for a <input type="datetime-local"> (YYYY-MM-DDTHH:mm). */
export function toDateTimeLocal(d?: string | null): string {
  const dt = parseDateLike(d);
  if (!dt) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export function formatFare(n: number): string {
  return `৳ ${Number(n || 0).toLocaleString('en-IN')}`;
}

export function chairClassLabel(c: string): string {
  return (c || '').replace(/_/g, ' ');
}

/** Badge tone for day/night */
export function dayNightTone(dn: string): 'amber' | 'violet' {
  return dn === 'DAY' ? 'amber' : 'violet';
}

/** Badge tone for journey source */
export function sourceTone(source: string): 'emerald' | 'brand' {
  return source === 'PDF' ? 'emerald' : 'brand';
}

/** Deterministic gradient class for a train/station, for chips & avatars */
export const GRADIENTS = [
  'bg-gradient-brand',
  'bg-gradient-accent',
  'bg-gradient-emerald',
  'bg-gradient-amber',
  'bg-gradient-rose',
  'bg-gradient-slate',
];

export function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

/** Recharts palette matched to the design system */
export const CHART_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#0ea5e9'];

/** Shared tooltip styling for recharts */
export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 8px 24px -8px rgba(15,23,42,0.18)',
    fontSize: 12,
    padding: '8px 12px',
  },
  labelStyle: { fontWeight: 600, color: '#0f172a', marginBottom: 2 },
  itemStyle: { color: '#475569' },
} as const;
