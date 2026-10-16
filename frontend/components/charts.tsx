'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, Legend,
  LineChart, Line, AreaChart, Area, PieChart, Pie, ComposedChart, ScatterChart, Scatter, ZAxis,
  Treemap, Sankey, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { CHART_COLORS, CHART_TOOLTIP_STYLE, formatFare } from '@/lib/utils';
import type { BoxStats, HistogramBin, HeatmapGridRow, HeatmapRow, ParetoRow } from '@/lib/api';
import { Card, CardHeader, cn } from './ui';

export const AXIS = { fontSize: 11, fill: '#64748b' };
export const GRID_COLOR = '#eef2f7';

const fmtNum = (v: unknown) => Number(v || 0).toLocaleString('en-IN');

/* -------------------------------- container ------------------------------- */

export function ChartCard({
  title,
  subtitle,
  icon,
  action,
  height = 'h-72',
  children,
  className = '',
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  /** Tailwind height class for the plot area, e.g. "h-72". Use "" for auto. */
  height?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <Card className={cn('animate-fade-up', className)}>
      <CardHeader title={title} subtitle={subtitle} icon={icon} action={action} />
      <div className={cn('p-5', height)} style={{ animationDelay: `${delay}ms` }}>
        {children}
      </div>
    </Card>
  );
}

/* --------------------------------- tooltip -------------------------------- */

function Tip({ active, payload, label, unit = '', format = fmtNum, labelKey }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-ink-200 bg-white/95 px-3 py-2 text-xs shadow-card-hover backdrop-blur">
      <div className="mb-1 font-semibold text-ink-900">{labelKey ? point?.[labelKey] : label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-ink-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke || p.fill }} />
          <span>{p.name}:</span>
          <span className="font-semibold text-ink-900">
            {format(p.value)}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------- bars ---------------------------------- */

export interface SeriesDef {
  key: string;
  name?: string;
  color?: string;
  stackId?: string;
  /** Per-datum colour override (e.g. highlight a clicked row). */
  colorFor?: (d: any) => string;
}

export function BarSeries({
  data,
  xKey,
  bars,
  horizontal = false,
  unit = '',
  format = fmtNum,
  onBarClick,
  stacked = false,
  maxBarSize = 34,
  xAngle,
  xHeight,
  yWidth,
  hideLegend = false,
  labelKey,
}: {
  data: any[];
  xKey: string;
  bars: SeriesDef[];
  horizontal?: boolean;
  unit?: string;
  format?: (v: number) => string;
  onBarClick?: (d: any) => void;
  stacked?: boolean;
  maxBarSize?: number;
  xAngle?: number;
  xHeight?: number;
  yWidth?: number;
  hideLegend?: boolean;
  labelKey?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 8, right: 16, bottom: xAngle ? 22 : 4, left: horizontal ? 4 : -4 }}
      >
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" horizontal={!horizontal} vertical={horizontal} />
        {horizontal ? (
          <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => fmtNum(v)} />
        ) : (
          <XAxis
            dataKey={xKey}
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={xAngle}
            height={xHeight}
            textAnchor={xAngle ? 'end' : 'middle'}
          />
        )}
        {horizontal ? (
          <YAxis type="category" dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} width={yWidth ?? 132} />
        ) : (
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={yWidth} />
        )}
        <Tooltip content={<Tip unit={unit} format={format} labelKey={labelKey} />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
        {!hideLegend && bars.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />}
        {bars.map((b, i) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.name || b.key}
            fill={b.color || CHART_COLORS[i % CHART_COLORS.length]}
            stackId={stacked ? 'stack' : b.stackId}
            radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}
            maxBarSize={maxBarSize}
            onClick={onBarClick}
            cursor={onBarClick ? 'pointer' : undefined}
          >
            {b.colorFor && data.map((d, di) => <Cell key={di} fill={b.colorFor!(d)} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------------------------------- lines --------------------------------- */

export function LineSeries({
  data,
  xKey,
  lines,
  unit = '',
  format = fmtNum,
  dashedKeys = [],
  connectNulls = false,
  hideLegend = false,
  labelKey,
}: {
  data: any[];
  xKey: string;
  lines: SeriesDef[];
  unit?: string;
  format?: (v: number) => string;
  dashedKeys?: string[];
  connectNulls?: boolean;
  hideLegend?: boolean;
  labelKey?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -4 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip content={<Tip unit={unit} format={format} labelKey={labelKey} />} />
        {!hideLegend && lines.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />}
        {lines.map((l, i) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.name || l.key}
            stroke={l.color || CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2.4}
            dot={{ r: 2.5, strokeWidth: 0, fill: l.color || CHART_COLORS[i] }}
            activeDot={{ r: 4 }}
            strokeDasharray={dashedKeys.includes(l.key) ? '5 4' : undefined}
            connectNulls={connectNulls}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ---------------------------------- areas --------------------------------- */

export function AreaSeries({
  data,
  xKey,
  areas,
  unit = '',
  format = fmtNum,
  stacked = false,
  hideLegend = false,
  labelKey,
}: {
  data: any[];
  xKey: string;
  areas: SeriesDef[];
  unit?: string;
  format?: (v: number) => string;
  stacked?: boolean;
  hideLegend?: boolean;
  labelKey?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -4 }}>
        <defs>
          {areas.map((a, i) => {
            const color = a.color || CHART_COLORS[i % CHART_COLORS.length];
            return (
              <linearGradient key={a.key} id={`grad-${a.key}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={color} stopOpacity={0.04} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip content={<Tip unit={unit} format={format} labelKey={labelKey} />} />
        {!hideLegend && areas.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />}
        {areas.map((a, i) => {
          const color = a.color || CHART_COLORS[i % CHART_COLORS.length];
          return (
            <Area
              key={a.key}
              type="monotone"
              dataKey={a.key}
              name={a.name || a.key}
              stroke={color}
              strokeWidth={2.2}
              fill={`url(#grad-${a.key}-${i})`}
              stackId={stacked ? 'stack' : undefined}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---------------------------------- donut --------------------------------- */

export function DonutChart({
  data,
  nameKey = 'name',
  valueKey = 'value',
  colors = CHART_COLORS,
  unit = '',
  format = fmtNum,
  centerValue,
  centerLabel,
}: {
  data: Record<string, any>[];
  nameKey?: string;
  valueKey?: string;
  colors?: string[];
  unit?: string;
  format?: (v: number) => string;
  centerValue?: string | number;
  centerLabel?: string;
}) {
  const total = data.reduce((a, d) => a + Number(d[valueKey] || 0), 0);
  if (!data.length) return <NoData />;
  return (
    <div className="flex h-full items-center gap-4">
      <div className="relative h-full w-[46%] min-w-[130px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey={valueKey}
              nameKey={nameKey}
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<Tip unit={unit} format={format} labelKey={nameKey} />} />
          </PieChart>
        </ResponsiveContainer>
        {centerValue !== undefined && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-xl font-bold tracking-tight text-ink-900">{centerValue}</div>
              {centerLabel && (
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{centerLabel}</div>
              )}
            </div>
          </div>
        )}
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 overflow-y-auto">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[i % colors.length] }} />
            <span className="min-w-0 flex-1 truncate text-ink-600">{d[nameKey]}</span>
            <span className="font-semibold text-ink-800">{format(Number(d[valueKey] || 0))}</span>
            <span className="w-9 text-right tabular-nums text-ink-400">
              {total ? Math.round((Number(d[valueKey] || 0) / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------- histogram ------------------------------- */

export function HistogramChart({ bins, color = '#6366f1', unit = '' }: { bins: HistogramBin[]; color?: string; unit?: string }) {
  if (!bins.length) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={bins} margin={{ top: 8, right: 12, bottom: 18, left: -6 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={0} angle={-24} textAnchor="end" height={46} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          content={({ active, payload, label }: any) =>
            active && payload?.length ? (
              <div className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs shadow-card-hover">
                <div className="font-semibold text-ink-900">{label}</div>
                <div className="text-ink-600">
                  {payload[0].value} journeys{unit}
                </div>
              </div>
            ) : null
          }
          cursor={{ fill: 'rgba(99,102,241,0.06)' }}
        />
        <Bar dataKey="count" name="Journeys" fill={color} radius={[6, 6, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------- box plot ------------------------------- */

const clampPct = (v: number) => Math.max(0, Math.min(100, v));

function BoxRow({ stats, format, color }: { stats: BoxStats; format: (v: number) => string; color: string }) {
  const all = [stats.min, stats.max, stats.lowFence, stats.highFence, ...stats.outliers];
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (lo > 0) lo = Math.max(0, lo - (hi - lo) * 0.06);
  hi = hi + (hi - lo) * 0.06;
  const span = hi - lo || 1;
  const px = (v: number) => clampPct(((v - lo) / span) * 100);

  return (
    <div className="relative h-10">
      {/* whisker */}
      <div
        className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded bg-ink-200"
        style={{ left: `${px(Math.min(stats.min, stats.lowFence))}%`, width: `${px(Math.max(stats.max, stats.highFence)) - px(Math.min(stats.min, stats.lowFence))}%` }}
      />
      {/* caps */}
      <div className="absolute top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded bg-ink-300" style={{ left: `${px(stats.min)}%` }} />
      <div className="absolute top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded bg-ink-300" style={{ left: `${px(stats.max)}%` }} />
      {/* fences */}
      <div className="absolute top-1/2 h-2.5 w-[1.5px] -translate-y-1/2 bg-ink-200" style={{ left: `${px(stats.lowFence)}%` }} />
      <div className="absolute top-1/2 h-2.5 w-[1.5px] -translate-y-1/2 bg-ink-200" style={{ left: `${px(stats.highFence)}%` }} />
      {/* box */}
      <div
        className="absolute top-1/2 h-6 -translate-y-1/2 rounded-md border-[1.5px]"
        style={{ left: `${px(stats.q1)}%`, width: `${Math.max(1.5, px(stats.q3) - px(stats.q1))}%`, borderColor: color, background: `${color}1f` }}
        title={`Q1 ${format(stats.q1)} · median ${format(stats.median)} · Q3 ${format(stats.q3)}`}
      />
      {/* median */}
      <div className="absolute top-1/2 h-6 w-[2.5px] -translate-y-1/2 rounded bg-ink-900" style={{ left: `${px(stats.median)}%` }} />
      {/* mean */}
      <div className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 rounded-[2px] bg-amber-500" style={{ left: `calc(${px(stats.mean)}% - 5px)` }} title={`mean ${format(stats.mean)}`} />
      {/* outliers */}
      {stats.outliers.map((o, i) => (
        <div
          key={i}
          className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-rose-400 ring-1 ring-white"
          style={{ left: `calc(${px(o)}% - 4px)` }}
          title={`outlier ${format(o)}`}
        />
      ))}
    </div>
  );
}

export function BoxPlot({
  items,
  format = fmtNum,
  color = '#6366f1',
  showAxis = true,
}: {
  items: { label: string; stats: BoxStats }[];
  format?: (v: number) => string;
  color?: string;
  showAxis?: boolean;
}) {
  const domain = useMemo(() => {
    const all = items.flatMap((i) => [i.stats.min, i.stats.max, ...i.stats.outliers]);
    if (!all.length) return null;
    let lo = Math.min(...all);
    let hi = Math.max(...all);
    if (lo > 0) lo = Math.max(0, lo - (hi - lo) * 0.06);
    hi = hi + (hi - lo) * 0.06;
    return { lo, hi };
  }, [items]);

  if (!items.length || !domain) return <NoData />;

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-3">
            <div className="w-24 shrink-0 truncate text-right text-xs font-medium text-ink-600" title={it.label}>
              {it.label}
            </div>
            <div className="min-w-0 flex-1">
              <BoxRow stats={it.stats} format={format} color={color} />
            </div>
          </div>
        ))}
      </div>
      {showAxis && (
        <div className="mt-1.5 flex items-center gap-3">
          <div className="w-24 shrink-0" />
          <div className="flex min-w-0 flex-1 justify-between text-[10px] tabular-nums text-ink-400">
            <span>{format(domain.lo)}</span>
            <span>{format((domain.lo + domain.hi) / 2)}</span>
            <span>{format(domain.hi)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- heatmap -------------------------------- */

function heatColor(v: number, max: number, base = '99,102,241') {
  if (!v || max <= 0) return 'rgba(15,23,42,0.045)';
  const t = Math.min(1, v / max);
  return `rgba(${base},${(0.14 + t * 0.78).toFixed(3)})`;
}

export function Heatmap({
  rows,
  columns,
  format = fmtNum,
  base = '99,102,241',
  labelWidth = 128,
  cellWidth = 34,
  cellHeight = 26,
  showValues = true,
}: {
  rows: HeatmapGridRow[];
  columns: string[];
  format?: (v: number) => string;
  base?: string;
  labelWidth?: number;
  cellWidth?: number;
  cellHeight?: number;
  showValues?: boolean;
}) {
  const max = useMemo(() => Math.max(1, ...rows.flatMap((r) => r.values)), [rows]);
  if (!rows.length || !columns.length) return <NoData />;

  return (
    <div className="h-full overflow-auto">
      <div style={{ minWidth: labelWidth + columns.length * (cellWidth + 4) }}>
        <div className="sticky top-0 z-10 flex bg-white/85 backdrop-blur">
          <div style={{ width: labelWidth }} className="shrink-0" />
          {columns.map((c, i) => (
            <div
              key={i}
              className="shrink-0 truncate px-0.5 pb-1.5 text-center text-[10px] font-semibold text-ink-400"
              style={{ width: cellWidth + 4 }}
              title={c}
            >
              {c}
            </div>
          ))}
        </div>
        {rows.map((r) => (
          <div key={r.label} className="flex items-center">
            <div className="shrink-0 truncate pr-3 text-xs font-medium text-ink-600" style={{ width: labelWidth }} title={r.label}>
              {r.label}
            </div>
            {r.values.map((v, i) => (
              <div
                key={i}
                className="mx-[2px] grid shrink-0 place-items-center rounded-md transition hover:ring-2 hover:ring-brand-300"
                style={{ width: cellWidth, height: cellHeight, background: heatColor(v, max, base) }}
                title={`${r.label} · ${columns[i]}: ${format(v)}`}
              >
                {showValues && v > 0 && (
                  <span
                    className="text-[10px] font-semibold tabular-nums"
                    style={{ color: v / max > 0.5 ? '#ffffff' : '#334155' }}
                  >
                    {v}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
        <div className="mt-3 flex items-center gap-2 pl-1 text-[10px] font-medium text-ink-400">
          <span>Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <span key={t} className="h-3 w-3 rounded-sm" style={{ background: heatColor(t * max || 0.0001, max, base) }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- calendar heatmap ---------------------------- */

export function CalendarHeatmap({
  days,
  metric = 'journeys',
  format = fmtNum,
}: {
  days: { date: string; journeys: number; fare: number }[];
  metric?: 'journeys' | 'fare';
  format?: (v: number) => string;
}) {
  const built = useMemo(() => {
    if (!days.length) return null;
    const map = new Map(days.map((d) => [d.date, d]));
    const dates = days.map((d) => d.date).sort();
    const first = new Date(`${dates[0]}T00:00:00Z`);
    const last = new Date(`${dates[dates.length - 1]}T00:00:00Z`);
    const gridStart = new Date(first);
    gridStart.setUTCDate(gridStart.getUTCDate() - ((gridStart.getUTCDay() + 6) % 7));

    const weeks: { date: Date; days: (Date | null)[]; label?: string }[] = [];
    let cursor = new Date(gridStart);
    let lastMonth = -1;
    while (cursor <= last) {
      const col: (Date | null)[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(cursor);
        d.setUTCDate(d.getUTCDate() + i);
        col.push(d > last ? null : d);
      }
      const labelMonth = cursor.getUTCMonth();
      const label = labelMonth !== lastMonth ? cursor.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }) : undefined;
      lastMonth = labelMonth;
      weeks.push({ date: new Date(cursor), days: col, label });
      const next = new Date(cursor);
      next.setUTCDate(next.getUTCDate() + 7);
      cursor = next;
    }
    const max = Math.max(1, ...days.map((d) => d[metric]));
    return { map, weeks, max };
  }, [days, metric]);

  if (!built) return <NoData />;
  const { map, weeks, max } = built;

  return (
    <div className="h-full overflow-auto pb-1">
      <div className="flex gap-[3px]">
        <div className="mr-1 flex shrink-0 flex-col justify-between py-[18px] text-[10px] font-medium text-ink-400">
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
          <span>Sun</span>
        </div>
        {weeks.map((w, wi) => (
          <div key={wi} className="flex shrink-0 flex-col gap-[3px]">
            <span className="h-4 text-[10px] font-semibold text-ink-400">{w.label || ''}</span>
            {w.days.map((d, di) => {
              if (!d) return <span key={di} className="h-3.5 w-3.5" />;
              const key = d.toISOString().slice(0, 10);
              const rec = map.get(key);
              const v = rec ? rec[metric] : 0;
              return (
                <span
                  key={di}
                  className="h-3.5 w-3.5 rounded-[3px] transition hover:ring-2 hover:ring-brand-300"
                  style={{ background: heatColor(v, max) }}
                  title={`${key}${rec ? ` · ${format(v)} ${metric}` : ' · no travel'}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] font-medium text-ink-400">
        <span>Less</span>
        {[0.0001, 0.25, 0.5, 0.75, 1].map((t) => (
          <span key={t} className="h-3 w-3 rounded-[3px]" style={{ background: heatColor(t * max, max) }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

/* -------------------------------- bump chart ------------------------------ */

export function BumpChart({ data, keys, colors = CHART_COLORS, xKey = 'month' }: { data: any[]; keys: string[]; colors?: string[]; xKey?: string }) {
  if (!data.length || !keys.length) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -20 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis reversed domain={[1, keys.length]} allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `#${v}`} />
        <Tooltip
          content={({ active, payload, label }: any) =>
            active && payload?.length ? (
              <div className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs shadow-card-hover">
                <div className="mb-1 font-semibold text-ink-900">{label}</div>
                {[...payload]
                  .filter((p: any) => p.value != null)
                  .sort((a: any, b: any) => a.value - b.value)
                  .map((p: any) => (
                    <div key={p.name} className="flex items-center gap-2 text-ink-600">
                      <span className="h-2 w-2 rounded-full" style={{ background: p.stroke }} />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <span className="font-semibold text-ink-900">#{p.value}</span>
                    </div>
                  ))}
              </div>
            ) : null
          }
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
        {keys.map((k, i) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            name={k}
            stroke={colors[i % colors.length]}
            strokeWidth={2.6}
            dot={{ r: 3.5, strokeWidth: 0, fill: colors[i % colors.length] }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------- pareto --------------------------------- */

export function ParetoChart({
  data,
  unit = '',
  format = fmtNum,
  xKey = 'name',
  valueKey = 'value',
}: {
  data: ParetoRow[];
  unit?: string;
  format?: (v: number) => string;
  xKey?: string;
  valueKey?: string;
}) {
  if (!data.length) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 28, left: -6 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} interval={0} angle={-22} textAnchor="end" height={54} />
        <YAxis yAxisId="left" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={AXIS} axisLine={false} tickLine={false} unit="%" />
        <Tooltip content={<Tip unit={unit} format={format} labelKey={xKey} />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
        <Bar yAxisId="left" dataKey={valueKey} name="Spend" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={42} />
        <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative %" stroke="#f59e0b" strokeWidth={2.4} dot={{ r: 3.5, strokeWidth: 0, fill: '#f59e0b' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------- treemap -------------------------------- */

function TreeCell(props: any) {
  const { x, y, width, height, index } = props;
  const d = props.payload || props;
  const color = CHART_COLORS[index % CHART_COLORS.length];
  const name = d.name ?? d.train ?? d.route ?? '';
  const value = d.size ?? d.value ?? 0;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={6} fill={color} fillOpacity={0.92} stroke="#fff" strokeWidth={2} />
      {width > 52 && height > 26 && (
        <>
          <text x={x + 8} y={y + 18} fontSize={11} fontWeight={600} fill="#fff">
            {String(name).length > Math.floor(width / 7) ? `${String(name).slice(0, Math.floor(width / 7))}…` : name}
          </text>
          {height > 40 && (
            <text x={x + 8} y={y + 33} fontSize={10} fill="#fff" fillOpacity={0.85}>
              {fmtNum(value)}
            </text>
          )}
        </>
      )}
    </g>
  );
}

export function TreemapChart({ data }: { data: { name: string; size: number }[] }) {
  if (!data.length) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap data={data} dataKey="size" nameKey="name" stroke="#fff" content={<TreeCell />} isAnimationActive={false}>
        <Tooltip content={<Tip format={fmtNum} labelKey="name" />} />
      </Treemap>
    </ResponsiveContainer>
  );
}

/* ---------------------------------- sankey -------------------------------- */

function SankeyNode(props: any) {
  const { x, y, width, height, index, payload, containerWidth } = props;
  const color = CHART_COLORS[(index ?? 0) % CHART_COLORS.length];
  const isRight = x + width > (containerWidth ?? 800) * 0.6;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={3} fill={color} />
      <text
        x={isRight ? x - 6 : x + width + 6}
        y={y + height / 2}
        textAnchor={isRight ? 'end' : 'start'}
        dominantBaseline="middle"
        fontSize={11}
        fontWeight={600}
        fill="#334155"
      >
        {payload?.name}
      </text>
    </g>
  );
}

function SankeyLink(props: any) {
  const { sourceX, sourceY, sourceControlX, targetX, targetY, targetControlX, linkWidth, index } = props;
  return (
    <path
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={CHART_COLORS[(index ?? 0) % CHART_COLORS.length]}
      strokeOpacity={0.26}
      strokeWidth={Math.max(1, linkWidth)}
    />
  );
}

export function SankeyDiagram({ nodes, links }: { nodes: { name: string }[]; links: { source: string; target: string; value: number }[] }) {
  const data = useMemo(() => {
    if (!links.length) return null;

    // Recharts' Sankey resolves node depths with unbounded recursion, so a cyclic
    // graph (return trips give both A→B and B→A) blows the call stack. Keep only
    // the highest-value edges that keep the graph acyclic.
    const candidates = links
      .filter((l) => l.source !== l.target && l.value > 0)
      .sort((a, b) => b.value - a.value);

    const adj = new Map<string, Set<string>>();
    const reaches = (from: string, to: string) => {
      const stack = [from];
      const seen = new Set([from]);
      while (stack.length) {
        const cur = stack.pop()!;
        if (cur === to) return true;
        for (const nxt of adj.get(cur) || []) {
          if (!seen.has(nxt)) {
            seen.add(nxt);
            stack.push(nxt);
          }
        }
      }
      return false;
    };

    const kept = candidates.filter((l) => {
      if (reaches(l.target, l.source)) return false;
      if (!adj.has(l.source)) adj.set(l.source, new Set());
      adj.get(l.source)!.add(l.target);
      return true;
    });
    if (!kept.length) return null;

    const used = new Set<string>();
    kept.forEach((l) => {
      used.add(l.source);
      used.add(l.target);
    });
    const names = [...used];
    const remap = new Map(names.map((name, i) => [name, i]));
    return {
      nodes: names.map((name) => ({ name })),
      links: kept.map((l) => ({ source: remap.get(l.source)!, target: remap.get(l.target)!, value: l.value })),
    };
  }, [nodes, links]);

  if (!data) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <Sankey
        data={data}
        node={<SankeyNode />}
        link={<SankeyLink />}
        nodePadding={18}
        nodeWidth={12}
        margin={{ top: 8, right: 90, bottom: 8, left: 20 }}
      >
        <Tooltip
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null;
            const p = payload[0]?.payload;
            const label = p?.payload?.name || p?.name || p?.source?.name;
            const value = p?.value ?? p?.payload?.value;
            return (
              <div className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs shadow-card-hover">
                <div className="font-semibold text-ink-900">{label}</div>
                {value != null && <div className="text-ink-600">{fmtNum(value)} journeys</div>}
              </div>
            );
          }}
        />
      </Sankey>
    </ResponsiveContainer>
  );
}

/* ---------------------------------- radar --------------------------------- */

export function RadarCompare({
  data,
  keys,
  colors = CHART_COLORS,
  angleKey,
}: {
  data: any[];
  keys: string[];
  colors?: string[];
  angleKey: string;
}) {
  if (!data.length || !keys.length) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey={angleKey} tick={{ fontSize: 11, fill: '#64748b' }} />
        <PolarRadiusAxis tick={{ fontSize: 10, fill: '#94a3b8' }} angle={30} />
        <Tooltip content={<Tip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
        {keys.map((k, i) => (
          <Radar
            key={k}
            name={k}
            dataKey={k}
            stroke={colors[i % colors.length]}
            fill={colors[i % colors.length]}
            fillOpacity={0.22}
            strokeWidth={2}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------- forecast ------------------------------- */

export function ForecastChart({
  data,
  xKey = 'month',
  actualKey,
  forecastKey,
  unit = '',
  format = fmtNum,
  actualColor = '#6366f1',
  forecastColor = '#f59e0b',
  label = 'Actual',
  forecastLabel = 'Forecast',
}: {
  data: Record<string, any>[];
  xKey?: string;
  actualKey: string;
  forecastKey: string;
  unit?: string;
  format?: (v: number) => string;
  actualColor?: string;
  forecastColor?: string;
  label?: string;
  forecastLabel?: string;
}) {
  const bridged = useMemo(() => {
    let lastIdx = -1;
    data.forEach((d, i) => {
      if (d[actualKey] != null) lastIdx = i;
    });
    return data.map((d, i) => ({
      ...d,
      [`${forecastKey}__bridge`]: i === lastIdx ? d[actualKey] : d[forecastKey],
    }));
  }, [data, actualKey, forecastKey]);

  if (!data.length) return <NoData />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={bridged} margin={{ top: 8, right: 16, bottom: 4, left: -4 }}>
        <defs>
          <linearGradient id="grad-forecast-actual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={actualColor} stopOpacity={0.4} />
            <stop offset="100%" stopColor={actualColor} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip
          content={({ active, payload, label: lbl }: any) =>
            active && payload?.length ? (
              <div className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs shadow-card-hover">
                <div className="mb-1 font-semibold text-ink-900">{lbl}</div>
                {payload
                  .filter((p: any) => p.value != null)
                  .map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-ink-600">
                      <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke }} />
                      <span>{p.name}:</span>
                      <span className="font-semibold text-ink-900">
                        {format(p.value)}
                        {unit}
                      </span>
                    </div>
                  ))}
              </div>
            ) : null
          }
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
        <Area type="monotone" dataKey={actualKey} name={label} stroke={actualColor} strokeWidth={2.4} fill="url(#grad-forecast-actual)" />
        <Line
          type="monotone"
          dataKey={`${forecastKey}__bridge`}
          name={forecastLabel}
          stroke={forecastColor}
          strokeWidth={2.4}
          strokeDasharray="6 4"
          dot={{ r: 3, strokeWidth: 0, fill: forecastColor }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------- scatter -------------------------------- */

export function ScatterSeries({
  data,
  xKey,
  yKey,
  zKey,
  labelKey,
  color = '#6366f1',
  unitX = '',
  unitY = '',
  formatX = fmtNum,
  formatY = fmtNum,
  groups,
}: {
  data?: Record<string, any>[];
  xKey: string;
  yKey: string;
  zKey?: string;
  labelKey?: string;
  color?: string;
  unitX?: string;
  unitY?: string;
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
  groups?: { name: string; color: string; points: Record<string, any>[] }[];
}) {
  const sets = groups ?? [{ name: labelKey || 'Points', color, points: data || [] }];
  if (!sets.length || !sets[0].points.length) return <NoData />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 10, right: 16, bottom: 14, left: -4 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey={xKey}
          name={unitX}
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatX(Number(v))}
          domain={['auto', 'auto']}
        />
        <YAxis
          type="number"
          dataKey={yKey}
          name={unitY}
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatY(Number(v))}
          domain={['auto', 'auto']}
        />
        {zKey && <ZAxis type="number" dataKey={zKey} range={[36, 260]} />}
        <Tooltip
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null;
            const p = payload[0]?.payload;
            return (
              <div className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs shadow-card-hover">
                {labelKey && p?.[labelKey] && <div className="mb-1 max-w-[220px] truncate font-semibold text-ink-900">{p[labelKey]}</div>}
                <div className="text-ink-600">
                  {unitX}: <b className="text-ink-900">{formatX(Number(p?.[xKey] ?? 0))}</b>
                </div>
                <div className="text-ink-600">
                  {unitY}: <b className="text-ink-900">{formatY(Number(p?.[yKey] ?? 0))}</b>
                </div>
              </div>
            );
          }}
        />
        {sets.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />}
        {sets.map((s, i) => (
          <Scatter key={i} name={s.name} data={s.points} fill={s.color} fillOpacity={0.75} />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------- helpers -------------------------------- */

export function NoData({ message = 'Not enough data yet' }: { message?: string }) {
  return (
    <div className="grid h-full place-items-center">
      <p className="text-sm text-ink-400">{message}</p>
    </div>
  );
}

export function BudgetMeter({
  spent,
  budget,
  label = 'This month',
}: {
  spent: number;
  budget: number;
  label?: string;
}) {
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const capped = Math.min(100, pct);
  const tone = pct > 100 ? '#e11d48' : pct > 80 ? '#f59e0b' : '#10b981';
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-bold tracking-tight text-ink-900">{formatFare(spent)}</div>
          <div className="text-xs font-medium text-ink-500">
            {label} · of {formatFare(budget)} budget
          </div>
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset"
          style={{ color: tone, background: `${tone}14`, borderColor: tone }}
        >
          {Math.round(pct)}%
        </span>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${capped}%`, background: tone }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-ink-500">
        <span>{budget - spent >= 0 ? `${formatFare(budget - spent)} left` : `${formatFare(spent - budget)} over`}</span>
        <span>100%</span>
      </div>
    </div>
  );
}

const INSIGHT_TONES: Record<string, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  accent: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  slate: 'bg-ink-100 text-ink-600 ring-ink-200',
};

export function InsightCard({ insight }: { insight: { tone: string; title: string; text: string } }) {
  return (
    <div className={cn('rounded-2xl p-4 ring-1 ring-inset', INSIGHT_TONES[insight.tone] || INSIGHT_TONES.brand)}>
      <p className="text-sm font-semibold leading-snug">{insight.title}</p>
      <p className="mt-1 text-xs leading-relaxed opacity-85">{insight.text}</p>
    </div>
  );
}

export const fmtFareAxis = (v: number) => formatFare(v);
