'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { AnalyticsFacets, AnalyticsFilters, AnalyticsOverview } from '@/lib/api';
import {
  ChartCard, BarSeries, AreaSeries, LineSeries, DonutChart, HistogramChart, BoxPlot,
  Heatmap, CalendarHeatmap, BumpChart, ParetoChart, TreemapChart, SankeyDiagram,
  RadarCompare, ForecastChart, ScatterSeries, NoData, BudgetMeter, InsightCard,
} from '@/components/charts';
import { AnalyticsFilterBar, presetRange, type RangePreset } from '@/components/AnalyticsFilters';
import AnalyticsTable from '@/components/AnalyticsTable';
import NetworkGraph from '@/components/NetworkGraph';
import { Badge, Button, Card, CardHeader, PageHeader, Skeleton, StatCard } from '@/components/ui';
import {
  IconChart, IconWallet, IconClock, IconRoute, IconTrain, IconTicket, IconSun, IconMoon,
  IconSparkles, IconCalendar, IconFilter, IconGrid, IconAlert, IconSpark, IconDownload,
  IconArrowRight, IconFile,
} from '@/components/icons';
import { chairClassLabel, formatDate, formatFare } from '@/lib/utils';

const BUDGET_KEY = 'jt.monthly-budget';
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));

const fmtInt = (v: unknown) => Number(v || 0).toLocaleString('en-IN');
const fmtFare = (v: number) => formatFare(v);
const fmtPct = (v: unknown) => (v == null ? '—' : `${v}%`);
const fmtSignedPct = (v: number | null | undefined) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v}%`);
/** Recharts passes the datum for Bar `onClick`; unwrap the payload defensively. */
const pick = (d: any) => (d && d.payload ? d.payload : d);
const fmtClock = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

const monthRange = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${key}-01`, to: `${key}-${String(last).padStart(2, '0')}` };
};

function SectionTitle({
  icon, title, subtitle, count,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-3 pt-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-brand-soft text-[19px] text-brand-600 ring-1 ring-inset ring-brand-100">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-bold tracking-tight text-ink-900">{title}</h2>
        {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
      </div>
      {count != null && (
        <Badge tone="slate" className="ml-1 shrink-0">
          {count} visuals
        </Badge>
      )}
    </div>
  );
}

function RankedList({
  title, valueLabel, rows,
}: {
  title: string;
  valueLabel: string;
  rows: { label: string; sub?: string; value: string }[];
}) {
  return (
    <div className="p-5">
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-ink-400">
        <span>{title}</span>
        <span>{valueLabel}</span>
      </div>
      {rows.length === 0 ? (
        <NoData />
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-brand-50/50">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-ink-100 text-[11px] font-bold text-ink-600">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-800">{r.label}</p>
                {r.sub && <p className="truncate text-[11px] text-ink-400">{r.sub}</p>}
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-800">{r.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const [preset, setPreset] = useState<RangePreset>('all');
  const [budget, setBudget] = useState('');
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [facets, setFacets] = useState<AnalyticsFacets | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(BUDGET_KEY) : null;
    if (saved) setBudget(saved);
  }, []);

  useEffect(() => {
    api.analytics.facets().then(setFacets).catch(() => setFacets(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.analytics
      .overview({ ...filters, budget: budget || undefined })
      .then((res) => {
        if (!cancelled) setOverview(res);
      })
      .catch(() => {
        if (!cancelled) setOverview(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, budget]);

  const patch = useCallback((p: Partial<AnalyticsFilters>) => setFilters((f) => ({ ...f, ...p })), []);

  const applyPreset = useCallback((p: RangePreset) => {
    setPreset(p);
    const r = presetRange(p);
    setFilters((f) => ({ ...f, from: r.from, to: r.to }));
  }, []);

  const onBudget = (v: string) => {
    setBudget(v);
    if (typeof window !== 'undefined') window.localStorage.setItem(BUDGET_KEY, v);
  };

  const drillMonth = useCallback(
    (key?: string) => {
      if (!key) return;
      setPreset('custom');
      setFilters((f) => ({ ...f, ...monthRange(key) }));
    },
    [],
  );

  /* ------------------------------ derived data ----------------------------- */

  const k = overview?.kpis || {};
  const meta = overview?.meta;

  const odMatrixGrid = useMemo(() => {
    const od = overview?.odMatrix || [];
    if (!od.length) return { columns: [] as string[], rows: [] as { label: string; values: number[] }[] };
    const froms = [...new Set(od.map((o) => o.from))].slice(0, 8);
    const tos = [...new Set(od.map((o) => o.to))].slice(0, 8);
    const lookup = new Map(od.map((o) => [`${o.from}||${o.to}`, o.journeys]));
    return {
      columns: tos,
      rows: froms.map((from) => ({ label: from, values: tos.map((to) => lookup.get(`${from}||${to}`) || 0) })),
    };
  }, [overview]);

  const seasonalityGrid = useMemo(() => {
    const rows = overview?.seasonality || [];
    if (!rows.length) return { columns: MONTH_LABELS, rows: [] as { label: string; values: number[] }[] };
    const years = [...new Set(rows.map((r) => r.year))];
    return {
      columns: MONTH_LABELS,
      rows: years.map((year) => ({
        label: String(year),
        values: MONTH_LABELS.map((_, mi) => rows.find((r) => r.year === year && r.monthIndex === mi)?.journeys || 0),
      })),
    };
  }, [overview]);

  const yoyChart = useMemo(() => {
    const yoy = overview?.yoy || [];
    if (!yoy.length) return { data: [] as Record<string, any>[], keys: [] as string[] };
    const keys = yoy.map((y) => `y${y.year}`);
    const data = MONTH_LABELS.map((month, mi) => {
      const row: Record<string, any> = { month };
      yoy.forEach((y) => {
        row[`y${y.year}`] = y.months.find((m) => m.monthIndex === mi)?.journeys || 0;
      });
      return row;
    });
    return { data, keys };
  }, [overview]);

  const weekdayWeekendChart = useMemo(() => {
    const w = overview?.weekdayWeekend;
    if (!w) return [];
    return [
      { name: 'Weekday', journeys: w.weekday.journeys, fare: w.weekday.fare, avgFare: w.weekday.avgFare },
      { name: 'Weekend', journeys: w.weekend.journeys, fare: w.weekend.fare, avgFare: w.weekend.avgFare },
    ];
  }, [overview]);

  const monthlyWithPrev = useMemo(() => {
    const monthly = overview?.monthly || [];
    return monthly.map((m, i) => ({ ...m, prevFare: i >= 12 ? monthly[i - 12].fare : null }));
  }, [overview]);

  const topMonths = useMemo(
    () => [...(overview?.monthly || [])].sort((a, b) => b.fare - a.fare).slice(0, 6),
    [overview],
  );

  const heatRows = (rows: { day: string; hours: number[] }[] | undefined) =>
    (rows || []).map((r) => ({ label: r.day, values: r.hours }));

  const firstSeg = filters.from || meta?.dateRange?.min || 'the start';
  const lastSeg = filters.to || meta?.dateRange?.max || 'now';

  if (loading && !overview) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-96 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Deep analysis" title="Analytics" subtitle="Could not load analytics." />
        <Card className="p-10 text-center">
          <p className="text-sm text-ink-500">The analytics service did not respond. Make sure the backend is running on port 3001.</p>
        </Card>
      </div>
    );
  }

  /* --------------------------------- KPIs --------------------------------- */

  const cmp = overview.comparison;
  const dayMix = (overview.byDayNight || []).map((d) => ({ name: d.dayNight === 'DAY' ? 'Day' : 'Night', value: d.journeys }));
  const chairJourneys = (overview.byChairType || []).map((c) => ({ name: chairClassLabel(c.chairType), value: c.journeys }));
  const chairFare = (overview.byChairType || []).map((c) => ({ name: chairClassLabel(c.chairType), ...c, label: chairClassLabel(c.chairType) }));
  const dayNightFare = (overview.byDayNight || []).map((d) => ({ name: d.dayNight === 'DAY' ? 'Day' : 'Night', fare: d.fare, avgFare: d.avgFare }));

  const advKpis = [
    { label: 'Total Journeys', value: fmtInt(k.totalJourneys), icon: <IconTrain />, gradient: 'bg-gradient-brand', hint: `${fmtInt(k.totalTravelDays)} travel days` },
    { label: 'Total Fare Spent', value: fmtFare(k.totalFare), icon: <IconWallet />, gradient: 'bg-gradient-emerald', hint: `${fmtFare(k.avgFarePerDayTravelled)} per travel day` },
    { label: 'Avg. Fare / Journey', value: fmtFare(k.avgFare), icon: <IconWallet />, gradient: 'bg-gradient-accent' },
    { label: 'Median Fare', value: fmtFare(k.medianFare), icon: <IconWallet />, gradient: 'bg-gradient-accent', hint: `spread ${fmtFare(k.fareSpread)}` },
    { label: 'Highest Fare', value: fmtFare(k.highestFare), icon: <IconWallet />, gradient: 'bg-gradient-rose' },
    { label: 'Lowest Fare', value: fmtFare(k.lowestFare), icon: <IconWallet />, gradient: 'bg-gradient-emerald' },
    { label: 'Unique Routes', value: fmtInt(k.uniqueRoutes), icon: <IconRoute />, gradient: 'bg-gradient-amber', hint: `${fmtInt(k.uniqueTrains)} trains` },
    { label: 'Unique Trains', value: fmtInt(k.uniqueTrains), icon: <IconTrain />, gradient: 'bg-gradient-brand' },
    { label: 'Unique Origins', value: fmtInt(k.uniqueOrigins), icon: <IconRoute />, gradient: 'bg-gradient-emerald' },
    { label: 'Unique Destinations', value: fmtInt(k.uniqueDestinations), icon: <IconRoute />, gradient: 'bg-gradient-amber' },
    { label: 'Most Frequent Train', value: k.mostFrequentTrain?.train || '—', icon: <IconTrain />, gradient: 'bg-gradient-brand', hint: k.mostFrequentTrain ? `${k.mostFrequentTrain.journeys} journeys` : undefined },
    { label: 'Most Frequent Route', value: k.mostFrequentRoute?.route || '—', icon: <IconRoute />, gradient: 'bg-gradient-emerald', hint: k.mostFrequentRoute ? `${k.mostFrequentRoute.journeys} journeys` : undefined },
    { label: 'Most Expensive Route', value: k.mostExpensiveRoute?.route || '—', icon: <IconWallet />, gradient: 'bg-gradient-rose', hint: k.mostExpensiveRoute ? `${fmtFare(k.mostExpensiveRoute.avgFare)} avg` : undefined },
    { label: 'Cheapest Route (avg)', value: k.cheapestRoute?.route || '—', icon: <IconWallet />, gradient: 'bg-gradient-emerald', hint: k.cheapestRoute ? `${fmtFare(k.cheapestRoute.avgFare)} avg` : undefined },
    { label: 'Day Journey %', value: fmtPct(k.dayPct), icon: <IconSun />, gradient: 'bg-gradient-amber', hint: `${fmtInt(k.dayJourneys)} trips` },
    { label: 'Night Journey %', value: fmtPct(k.nightPct), icon: <IconMoon />, gradient: 'bg-gradient-slate', hint: `${fmtInt(k.nightJourneys)} trips` },
    { label: 'Avg. Journeys / Week', value: k.avgPerWeek ?? 0, icon: <IconChart />, gradient: 'bg-gradient-accent', hint: `${fmtInt(k.totalTravelWeeks)} travel weeks` },
    { label: 'Avg. Journeys / Month', value: k.avgPerMonth ?? 0, icon: <IconCalendar />, gradient: 'bg-gradient-brand', hint: `${fmtInt(k.monthsSpan)} months` },
    { label: 'MoM Journey Growth', value: fmtSignedPct(k.momJourneyGrowth), icon: <IconChart />, gradient: (k.momJourneyGrowth ?? 0) >= 0 ? 'bg-gradient-emerald' : 'bg-gradient-rose', hint: cmp?.previous ? `vs ${cmp.previous.label}` : undefined },
    { label: 'MoM Fare Growth', value: fmtSignedPct(k.momFareGrowth), icon: <IconWallet />, gradient: (k.momFareGrowth ?? 0) >= 0 ? 'bg-gradient-amber' : 'bg-gradient-emerald', hint: cmp?.previous ? `vs ${cmp.previous.label}` : undefined },
    { label: 'Most Used Chair Class', value: k.mostUsedChairClass ? chairClassLabel(k.mostUsedChairClass.chairType) : '—', icon: <IconTicket />, gradient: 'bg-gradient-brand', hint: k.mostUsedChairClass ? `${k.mostUsedChairClass.journeys} journeys` : undefined },
    { label: 'Efficiency Score', value: `${k.efficiencyScore ?? 0}/100`, icon: <IconSpark />, gradient: 'bg-gradient-accent', hint: 'economy share + consistency' },
  ];

  const compact = filters.trainName || filters.chairType || filters.fromStation || filters.toStation || filters.dayNight
    ? `Filtered: ${[filters.trainName, filters.chairType && chairClassLabel(filters.chairType), filters.fromStation, filters.toStation, filters.dayNight].filter(Boolean).join(' · ')}`
    : `${overview.meta.filtered} of ${overview.meta.total} journeys in view`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          eyebrow="Deep analysis"
          title="Analytics workspace"
          subtitle={`${compact} · ${firstSeg} → ${lastSeg}`}
        />
        <div className="flex flex-wrap gap-2.5 pb-1">
          <Link href="/">
            <Button variant="outline" size="sm">
              <IconGrid className="text-[15px]" /> Dashboard
            </Button>
          </Link>
          <Link href="/journeys">
            <Button variant="outline" size="sm">
              <IconFile className="text-[15px]" /> All journeys
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={() => typeof window !== 'undefined' && window.print()}>
            <IconDownload className="text-[15px]" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <AnalyticsFilterBar
        value={filters}
        onChange={patch}
        facets={facets}
        preset={preset}
        onPreset={applyPreset}
        showBudget
        budget={budget}
        onBudget={onBudget}
        extra={
          <a href="#journeys-table" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            Jump to table ↓
          </a>
        }
      />

      {/* Advanced KPIs */}
      <div className="space-y-4">
        <SectionTitle
          icon={<IconSpark />}
          title="Advanced KPIs"
          subtitle="Headline metrics for the current selection"
          count={advKpis.length}
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
          {advKpis.map((c, i) => (
            <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} gradient={c.gradient} hint={c.hint} delay={i * 18} />
          ))}
        </div>
      </div>

      {/* Comparison + insights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="animate-fade-up lg:col-span-2">
          <CardHeader
            title="Quick Insights"
            subtitle="Automatically generated personal travel insights"
            icon={<IconSparkles />}
          />
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            {overview.insights.length === 0 && <NoData message="Add a few journeys to unlock insights" />}
            {overview.insights.map((ins, i) => (
              <InsightCard key={i} insight={ins} />
            ))}
          </div>
        </Card>

        <Card className="animate-fade-up">
          <CardHeader
            title="Period over period"
            subtitle={cmp?.current ? `${cmp.current.label} vs ${cmp.previous?.label ?? '—'}` : 'Not enough data'}
            icon={<IconChart />}
          />
          <div className="p-5">
            {cmp?.current ? (
              <div className="space-y-3">
                {[
                  { label: 'Journeys', cur: cmp.current.journeys, prev: cmp.previous?.journeys ?? 0 },
                  { label: 'Fare', cur: cmp.current.fare, prev: cmp.previous?.fare ?? 0, money: true },
                  { label: 'Avg. fare', cur: cmp.current.avgFare, prev: cmp.previous?.avgFare ?? 0, money: true },
                  { label: 'Day trips', cur: cmp.current.day, prev: cmp.previous?.day ?? 0 },
                  { label: 'Night trips', cur: cmp.current.night, prev: cmp.previous?.night ?? 0 },
                ].map((row) => {
                  const delta = row.cur - row.prev;
                  const pct = row.prev ? Math.round((delta / row.prev) * 100) : null;
                  const up = delta >= 0;
                  return (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-ink-500">{row.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-ink-900">{row.money ? fmtFare(row.cur) : fmtInt(row.cur)}</span>
                        <Badge tone={up ? 'emerald' : 'rose'}>
                          {up ? '▲' : '▼'} {pct === null ? '—' : `${Math.abs(pct)}%`}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <NoData />
            )}
          </div>
        </Card>
      </div>

      {/* ------------------------- Trends & time series ------------------------ */}
      <div className="space-y-4">
        <SectionTitle
          icon={<IconChart />}
          title="Journey trends & time-series"
          subtitle="How travel volume and spending move over time · click bars to drill down"
          count={15}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Monthly Journey Trend" subtitle="Journeys per month" icon={<IconChart />}>
            <AreaSeries
              data={overview.monthly}
              xKey="month"
              areas={[{ key: 'journeys', name: 'Journeys', color: '#6366f1' }]}
            />
          </ChartCard>

          <ChartCard title="Monthly Fare Trend" subtitle="Total fare, average fare and same month last year" icon={<IconWallet />}>
            <LineSeries
              data={monthlyWithPrev}
              xKey="month"
              lines={[
                { key: 'fare', name: 'Total fare', color: '#10b981' },
                { key: 'avgFare', name: 'Avg fare', color: '#6366f1' },
                { key: 'prevFare', name: 'Prev. year', color: '#94a3b8' },
              ]}
              dashedKeys={['prevFare']}
              connectNulls
            />
          </ChartCard>

          <ChartCard title="Weekly Journey Trend" subtitle="Journeys per ISO week (last 26)" icon={<IconCalendar />}>
            <LineSeries data={overview.weekly} xKey="week" lines={[{ key: 'journeys', name: 'Journeys', color: '#8b5cf6' }]} hideLegend />
          </ChartCard>

          <ChartCard title="Daily Fare Spending" subtitle="Fare spent on each travel day" icon={<IconWallet />}>
            <LineSeries data={overview.calendar} xKey="date" lines={[{ key: 'fare', name: 'Fare', color: '#f59e0b' }]} format={fmtFare} hideLegend />
          </ChartCard>

          <ChartCard title="Cumulative Fare Spending" subtitle="Running total of spend" icon={<IconWallet />}>
            <AreaSeries
              data={overview.cumulative}
              xKey="month"
              areas={[{ key: 'fare', name: 'Cumulative fare', color: '#10b981' }]}
              format={fmtFare}
            />
          </ChartCard>

          <ChartCard title="Cumulative Journey Count" subtitle="Running total of journeys" icon={<IconChart />}>
            <AreaSeries
              data={overview.cumulative}
              xKey="month"
              areas={[{ key: 'journeys', name: 'Cumulative journeys', color: '#6366f1' }]}
            />
          </ChartCard>

          <ChartCard title="Rolling Average Journey Frequency" subtitle="3-month rolling average" icon={<IconChart />}>
            <LineSeries
              data={overview.rolling}
              xKey="month"
              lines={[{ key: 'journeys', name: 'Rolling journeys', color: '#06b6d4' }]}
              connectNulls
              hideLegend
            />
          </ChartCard>

          <ChartCard title="Rolling Average Fare" subtitle="3-month rolling average spend" icon={<IconWallet />}>
            <LineSeries
              data={overview.rolling}
              xKey="month"
              lines={[{ key: 'fare', name: 'Rolling fare', color: '#ec4899' }]}
              format={fmtFare}
              connectNulls
              hideLegend
            />
          </ChartCard>

          <ChartCard title="Journey Growth Rate" subtitle="Month-over-month change in journeys" icon={<IconChart />}>
            <LineSeries
              data={overview.growth}
              xKey="month"
              lines={[{ key: 'journeyGrowth', name: 'Journey growth %', color: '#10b981' }]}
              unit="%"
              connectNulls
              hideLegend
            />
          </ChartCard>

          <ChartCard title="Fare Growth Rate" subtitle="Month-over-month change in spending" icon={<IconWallet />}>
            <LineSeries
              data={overview.growth}
              xKey="month"
              lines={[{ key: 'fareGrowth', name: 'Fare growth %', color: '#f43f5e' }]}
              unit="%"
              connectNulls
              hideLegend
            />
          </ChartCard>

          <ChartCard title="Day vs Night Trend" subtitle="Departure mix over time" icon={<IconSun />}>
            <AreaSeries
              data={overview.dayNightTrend}
              xKey="month"
              stacked
              areas={[
                { key: 'Day', name: 'Day', color: '#f59e0b' },
                { key: 'Night', name: 'Night', color: '#6366f1' },
              ]}
            />
          </ChartCard>

          <ChartCard title="Active Travel Days per Month" subtitle="Days with at least one journey · tap a bar to drill in" icon={<IconCalendar />}>
            <BarSeries
              data={overview.monthly}
              xKey="month"
              bars={[{ key: 'activeDays', name: 'Active days', color: '#10b981' }]}
              hideLegend
              onBarClick={(d) => drillMonth(pick(d)?.key)}
            />
          </ChartCard>

          <ChartCard title="Monthly Metrics Comparison" subtitle="Normalised journeys vs fare radar" icon={<IconChart />}>
            <RadarCompare data={overview.radarMonthly} keys={['Journeys', 'Fare']} angleKey="subject" />
          </ChartCard>

          <ChartCard title="Year-over-Year Comparison" subtitle="Monthly journeys by year" icon={<IconCalendar />}>
            <BarSeries
              data={yoyChart.data}
              xKey="month"
              bars={yoyChart.keys.map((key) => ({ key, name: key.slice(1) }))}
              xAngle={-25}
              xHeight={40}
            />
          </ChartCard>

          <ChartCard
            title="Travel Activity Calendar"
            subtitle="Daily travel heatmap across the period"
            icon={<IconCalendar />}
            height=""
            className="lg:col-span-2"
            action={<span className="text-xs font-medium text-ink-500">{fmtInt(k.totalTravelDays)} days travelled</span>}
          >
            <div className="p-1">
              <CalendarHeatmap days={overview.calendar} metric="journeys" />
            </div>
          </ChartCard>

          <ChartCard title="Travel Frequency by Time of Day" subtitle="Weekday × departure hour heatmap" icon={<IconClock />} height="" className="lg:col-span-2">
            <div className="p-1">
              <Heatmap rows={heatRows(overview.weekdayHourHeatmap)} columns={HOUR_LABELS} />
            </div>
          </ChartCard>

          <ChartCard title="Monthly Travel Seasonality" subtitle="Journeys per month, year by year" icon={<IconCalendar />} height="">
            <Heatmap rows={seasonalityGrid.rows} columns={seasonalityGrid.columns} base="6,182,212" />
          </ChartCard>

          <ChartCard title="Train vs Monthly Journeys" subtitle="Top trains across months" icon={<IconTrain />} height="">
            <Heatmap rows={overview.heatmaps.trainMonth.rows} columns={overview.heatmaps.columns} />
          </ChartCard>

          <ChartCard title="Route vs Monthly Journeys" subtitle="Top routes across months" icon={<IconRoute />} height="" className="lg:col-span-2">
            <Heatmap rows={overview.heatmaps.routeMonth.rows} columns={overview.heatmaps.columns} base="16,185,129" />
          </ChartCard>
        </div>
      </div>

      {/* --------------------------- Train & routes --------------------------- */}
      <div className="space-y-4">
        <SectionTitle
          icon={<IconTrain />}
          title="Train & route analytics"
          subtitle="Which services and corridors carry your travel · click a bar to filter"
          count={20}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Journeys by Train" subtitle="Tap a bar to filter by that train" icon={<IconTrain />}>
            <BarSeries
              data={overview.byTrain.slice(0, 12)}
              xKey="train"
              bars={[{ key: 'journeys', name: 'Journeys', color: '#6366f1' }]}
              xAngle={-24}
              xHeight={62}
              hideLegend
              onBarClick={(d) => patch({ trainName: pick(d)?.train })}
            />
          </ChartCard>

          <ChartCard title="Top 10 Routes" subtitle="Most travelled origin → destination pairs" icon={<IconRoute />}>
            <BarSeries
              horizontal
              data={overview.routes.slice(0, 10)}
              xKey="route"
              yWidth={150}
              bars={[{ key: 'journeys', name: 'Journeys', color: '#06b6d4' }]}
              onBarClick={(d) => {
                const r = pick(d);
                if (r?.from && r?.to) patch({ fromStation: r.from, toStation: r.to });
              }}
            />
          </ChartCard>

          <ChartCard title="Chair Class Distribution" subtitle="Share of journeys by class" icon={<IconTicket />}>
            <DonutChart data={chairJourneys} centerValue={fmtInt(k.totalJourneys)} centerLabel="journeys" />
          </ChartCard>

          <ChartCard title="Day vs Night Distribution" subtitle="Departure-time split" icon={<IconSun />}>
            <DonutChart data={dayMix} colors={['#f59e0b', '#6366f1']} centerValue={`${k.dayPct ?? 0}%`} centerLabel="day trips" />
          </ChartCard>

          <ChartCard title="Fare Spent by Origin Station" subtitle="Total spend departing each station" icon={<IconWallet />}>
            <BarSeries
              data={overview.origin.slice(0, 10)}
              xKey="station"
              bars={[{ key: 'fare', name: 'Fare', color: '#8b5cf6' }]}
              format={fmtFare}
              xAngle={-24}
              xHeight={62}
              hideLegend
            />
          </ChartCard>

          <ChartCard title="Fare Spent by Destination Station" subtitle="Total spend arriving at each station" icon={<IconWallet />}>
            <BarSeries
              data={overview.destination.slice(0, 10)}
              xKey="station"
              bars={[{ key: 'fare', name: 'Fare', color: '#ec4899' }]}
              format={fmtFare}
              xAngle={-24}
              xHeight={62}
              hideLegend
            />
          </ChartCard>

          <ChartCard title="Average Fare by Train" subtitle="Cost per journey on each service" icon={<IconWallet />}>
            <BarSeries
              data={overview.byTrain.slice(0, 10).map((t) => ({ ...t, label: t.train }))}
              xKey="label"
              bars={[{ key: 'avgFare', name: 'Avg fare', color: '#f43f5e' }]}
              format={fmtFare}
              xAngle={-24}
              xHeight={62}
              hideLegend
            />
          </ChartCard>

          <ChartCard title="Average Fare by Route" subtitle="Cost per journey on each corridor" icon={<IconWallet />}>
            <BarSeries
              horizontal
              data={overview.routes.slice(0, 10)}
              xKey="route"
              yWidth={150}
              bars={[{ key: 'avgFare', name: 'Avg fare', color: '#4338ca' }]}
              format={fmtFare}
            />
          </ChartCard>

          <ChartCard title="Journey Count by Origin" subtitle="How often each station is a departure point" icon={<IconRoute />}>
            <BarSeries
              data={overview.origin.slice(0, 10)}
              xKey="station"
              bars={[{ key: 'journeys', name: 'Departures', color: '#6366f1' }]}
              xAngle={-24}
              xHeight={62}
              hideLegend
            />
          </ChartCard>

          <ChartCard title="Journey Count by Destination" subtitle="How often each station is an arrival point" icon={<IconRoute />}>
            <BarSeries
              data={overview.destination.slice(0, 10)}
              xKey="station"
              bars={[{ key: 'journeys', name: 'Arrivals', color: '#06b6d4' }]}
              xAngle={-24}
              xHeight={62}
              hideLegend
            />
          </ChartCard>

          <ChartCard title="Train Usage Share" subtitle="Journeys per train as a share" icon={<IconTrain />}>
            <TreemapChart data={overview.byTrain.slice(0, 12).map((t) => ({ name: t.train, size: t.journeys }))} />
          </ChartCard>

          <ChartCard title="Route Popularity Share" subtitle="Journeys per route as a share" icon={<IconRoute />}>
            <TreemapChart data={overview.routes.slice(0, 12).map((r) => ({ name: r.route, size: r.journeys }))} />
          </ChartCard>

          <ChartCard title="Origin → Destination Flow" subtitle="Station-to-station journey flows" icon={<IconRoute />} className="lg:col-span-2">
            <SankeyDiagram
              nodes={[...new Set([...(overview.network.nodes || []).map((n) => n.id)])].map((name) => ({ name }))}
              links={(overview.network.links || []).slice(0, 24).map((l) => ({ source: l.source, target: l.target, value: l.journeys }))}
            />
          </ChartCard>

          <ChartCard title="Station Connectivity Network" subtitle="Force-directed map of your stations and routes" icon={<IconRoute />} className="lg:col-span-2" height="h-96">
            <NetworkGraph payload={overview.network} />
          </ChartCard>

          <ChartCard title="Train vs Chair Class" subtitle="Class mix for the top services" icon={<IconTrain />}>
            <BarSeries
              data={overview.stacked.trainChair.slice(0, 6)}
              xKey="train"
              bars={overview.stacked.chairKeys.map((c) => ({ key: c, name: chairClassLabel(c) }))}
              xAngle={-20}
              xHeight={54}
              maxBarSize={20}
            />
          </ChartCard>

          <ChartCard title="Train vs Day/Night" subtitle="Day and night trips per service" icon={<IconSun />}>
            <BarSeries
              data={overview.stacked.trainDayNight.slice(0, 8)}
              xKey="train"
              stacked
              bars={[
                { key: 'Day', name: 'Day', color: '#f59e0b' },
                { key: 'Night', name: 'Night', color: '#6366f1' },
              ]}
              xAngle={-20}
              xHeight={54}
            />
          </ChartCard>

          <ChartCard title="Top Train Ranking Over Time" subtitle="Monthly rank of your top five trains" icon={<IconChart />} className="lg:col-span-2">
            <BumpChart data={overview.bump} keys={overview.bumpKeys} />
          </ChartCard>

          <ChartCard title="Route Frequency vs Avg Fare" subtitle="Frequent routes and what they cost" icon={<IconRoute />}>
            <ScatterSeries
              data={overview.scatter.routeFreqVsFare}
              xKey="journeys"
              yKey="avgFare"
              labelKey="route"
              unitX="Journeys"
              unitY="Avg fare"
              formatY={fmtFare}
              color="#6366f1"
            />
          </ChartCard>

          <ChartCard title="Origin–Destination Matrix" subtitle="Journeys between top origins and destinations" icon={<IconRoute />} height="" className="lg:col-span-2">
            <Heatmap rows={odMatrixGrid.rows} columns={odMatrixGrid.columns} base="99,102,241" />
          </ChartCard>
        </div>
      </div>

      {/* ------------------------------ Fare spend ---------------------------- */}
      <div className="space-y-4">
        <SectionTitle
          icon={<IconWallet />}
          title="Fare & spending analytics"
          subtitle="Where the money goes, and how far it stretches"
          count={18}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Fare Distribution" subtitle="How fares are spread across bins" icon={<IconWallet />}>
            <HistogramChart bins={overview.fareHistogram} />
          </ChartCard>

          <ChartCard
            title="Fare Percentiles & Outliers"
            subtitle="Quartiles, mean and unusual fares"
            icon={<IconWallet />}
            action={<span className="text-xs font-medium text-ink-500">{overview.fareBox?.outliers.length ?? 0} outliers</span>}
          >
            {overview.fareBox ? (
              <BoxPlot items={[{ label: 'All fares', stats: overview.fareBox }]} format={fmtFare} color="#6366f1" />
            ) : (
              <NoData />
            )}
          </ChartCard>

          <ChartCard title="Average Fare by Chair Class" subtitle="Cost per class" icon={<IconTicket />}>
            <BarSeries
              data={chairFare}
              xKey="label"
              bars={[{ key: 'avgFare', name: 'Avg fare', color: '#6366f1' }]}
              format={fmtFare}
              xAngle={-20}
              xHeight={50}
              hideLegend
            />
          </ChartCard>

          <ChartCard title="Total Fare by Chair Class" subtitle="Where your spend is concentrated" icon={<IconTicket />}>
            <BarSeries
              data={chairFare}
              xKey="label"
              bars={[{ key: 'fare', name: 'Total fare', color: '#10b981' }]}
              format={fmtFare}
              xAngle={-20}
              xHeight={50}
              hideLegend
            />
          </ChartCard>

          <ChartCard title="Monthly Spending by Chair Class" subtitle="Stacked spend over time" icon={<IconWallet />}>
            <AreaSeries
              data={overview.stacked.fareByChairMonth}
              xKey="month"
              stacked
              areas={overview.stacked.chairKeys.map((c) => ({ key: c, name: chairClassLabel(c) }))}
              format={fmtFare}
            />
          </ChartCard>

          <ChartCard title="Fare Share by Train" subtitle="Spend distribution across services" icon={<IconTrain />}>
            <DonutChart
              data={overview.byTrain.slice(0, 8).map((t) => ({ name: t.train, value: t.fare }))}
              format={(v) => formatFare(Math.round(v))}
              centerValue={fmtFare(k.totalFare)}
              centerLabel="total fare"
            />
          </ChartCard>

          <ChartCard title="Fare Share by Route" subtitle="Spend distribution across corridors" icon={<IconRoute />}>
            <TreemapChart data={overview.routes.slice(0, 12).map((r) => ({ name: r.route, size: r.fare }))} />
          </ChartCard>

          <ChartCard title="Average Fare by Month" subtitle="What a journey costs over time" icon={<IconWallet />}>
            <LineSeries data={overview.monthly} xKey="month" lines={[{ key: 'avgFare', name: 'Avg fare', color: '#8b5cf6' }]} format={fmtFare} hideLegend />
          </ChartCard>

          <ChartCard title="Fare per Journey Over Time" subtitle="Total fare and journey count per month" icon={<IconWallet />}>
            <BarSeries
              data={overview.monthly}
              xKey="month"
              bars={[
                { key: 'fare', name: 'Fare', color: '#10b981' },
                { key: 'journeys', name: 'Journeys', color: '#6366f1' },
              ]}
              format={fmtFare}
            />
          </ChartCard>

          <ChartCard title="Spending Contribution by Train" subtitle="Pareto: trains that drive your spend" icon={<IconTrain />}>
            <ParetoChart data={overview.paretoTrain} format={fmtFare} />
          </ChartCard>

          <ChartCard title="Spending Contribution by Route" subtitle="Pareto: routes that drive your spend" icon={<IconRoute />}>
            <ParetoChart data={overview.paretoRoute} format={fmtFare} />
          </ChartCard>

          {budget && Number(budget) > 0 && (
            <>
              <ChartCard title="Budget vs Actual Spending" subtitle="This month against your monthly budget" icon={<IconWallet />}>
                <BarSeries
                  data={[
                    { name: 'Budget', value: Number(budget) },
                    { name: 'Actual', value: k.currentMonthFare || 0 },
                  ]}
                  xKey="name"
                  bars={[
                    {
                      key: 'value',
                      name: 'Amount',
                      colorFor: (d: any) => (d.name === 'Budget' ? '#94a3b8' : (k.currentMonthFare || 0) > Number(budget) ? '#e11d48' : '#10b981'),
                    },
                  ]}
                  format={fmtFare}
                  hideLegend
                />
              </ChartCard>

              <Card className="animate-fade-up">
                <CardHeader title="Monthly Budget Utilization" subtitle="Spending progress" icon={<IconWallet />} />
                <div className="p-5">
                  <BudgetMeter spent={k.currentMonthFare || 0} budget={Number(budget)} />
                </div>
              </Card>
            </>
          )}

          <ChartCard title="Spending Forecast" subtitle="Linear projection of monthly fare" icon={<IconSpark />}>
            <ForecastChart
              data={overview.forecast}
              actualKey="fare"
              forecastKey="fareForecast"
              format={fmtFare}
              label="Actual fare"
              forecastLabel="Forecast fare"
              actualColor="#10b981"
            />
          </ChartCard>

          <ChartCard title="Highest-Spending Months" subtitle="Your most expensive months" icon={<IconWallet />}>
            <BarSeries
              data={topMonths.map((m) => ({ month: m.month, fare: m.fare }))}
              xKey="month"
              bars={[{ key: 'fare', name: 'Fare', color: '#f43f5e' }]}
              format={fmtFare}
              hideLegend
            />
          </ChartCard>

          <ChartCard title="Fare Variation by Route" subtitle="Fare spread for your top corridors" icon={<IconRoute />}>
            <BoxPlot
              items={overview.routeBoxes.filter((r) => r.fare).map((r) => ({ label: r.label, stats: r.fare! }))}
              format={fmtFare}
              color="#6366f1"
            />
          </ChartCard>
        </div>
      </div>

      {/* --------------------------- Day/night & habits ----------------------- */}
      <div className="space-y-4">
        <SectionTitle
          icon={<IconSun />}
          title="Day/night & travel behaviour"
          subtitle="When you travel and how your habits are shaped"
          count={13}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Day vs Night Journeys" subtitle="Trip split by departure time" icon={<IconSun />}>
            <DonutChart data={dayMix} colors={['#f59e0b', '#6366f1']} centerValue={fmtInt(k.totalJourneys)} centerLabel="journeys" />
          </ChartCard>

          <ChartCard title="Day vs Night Fare Spending" subtitle="Where your money is spent" icon={<IconWallet />}>
            <BarSeries
              data={dayNightFare}
              xKey="name"
              bars={[{ key: 'fare', name: 'Total fare', color: '#10b981' }]}
              format={fmtFare}
              hideLegend
            />
          </ChartCard>

          <ChartCard title="Average Fare: Day vs Night" subtitle="Which departure time costs more" icon={<IconWallet />}>
            <BarSeries
              data={dayNightFare}
              xKey="name"
              bars={[{ key: 'avgFare', name: 'Avg fare', color: '#6366f1' }]}
              format={fmtFare}
              hideLegend
            />
          </ChartCard>

          <ChartCard title="Day vs Night by Chair Class" subtitle="Class mix for day and night trips" icon={<IconTicket />}>
            <BarSeries
              data={overview.stacked.dayNightChair.map((d) => ({ ...d, label: chairClassLabel(d.chairType) }))}
              xKey="label"
              stacked
              bars={[
                { key: 'Day', name: 'Day', color: '#f59e0b' },
                { key: 'Night', name: 'Night', color: '#6366f1' },
              ]}
              xAngle={-20}
              xHeight={50}
            />
          </ChartCard>

          <ChartCard title="Departure Hour Distribution" subtitle="Journey frequency by hour" icon={<IconClock />}>
            <HistogramChart
              bins={overview.hourly.map((h) => ({ label: h.hour, from: h.hourNum, to: h.hourNum + 1, count: h.journeys }))}
              color="#ec4899"
            />
          </ChartCard>

          <ChartCard title="Departure Time vs Fare" subtitle="Do you pay more at certain hours?" icon={<IconWallet />}>
            <ScatterSeries
              data={overview.scatter.deptTimeVsFare}
              xKey="deptMins"
              yKey="fare"
              labelKey="trainName"
              unitX="Departure"
              unitY="Fare"
              formatX={fmtClock}
              formatY={fmtFare}
              color="#6366f1"
            />
          </ChartCard>

          <ChartCard title="Weekday vs Weekend Journeys" subtitle="When you travel more" icon={<IconCalendar />}>
            <BarSeries
              data={weekdayWeekendChart}
              xKey="name"
              bars={[{ key: 'journeys', name: 'Journeys', color: '#6366f1' }]}
              hideLegend
            />
          </ChartCard>

          <ChartCard title="Weekday vs Weekend Spending" subtitle="Total spend by day type" icon={<IconWallet />}>
            <BarSeries
              data={weekdayWeekendChart}
              xKey="name"
              bars={[{ key: 'fare', name: 'Fare', color: '#10b981' }]}
              format={fmtFare}
              hideLegend
            />
          </ChartCard>

          <ChartCard title="Day-of-Week Popularity" subtitle="Journeys by weekday" icon={<IconCalendar />}>
            <BarSeries
              data={overview.weekday}
              xKey="day"
              bars={[{ key: 'journeys', name: 'Journeys', color: '#f59e0b' }]}
              hideLegend
            />
          </ChartCard>

          <Card className="animate-fade-up">
            <CardHeader title="Travel Behaviour Segments" subtitle="Grouped summary of your habits" icon={<IconGrid />} />
            <div className="grid grid-cols-2 gap-3 p-5">
              {[
                { label: 'Day trips', value: fmtInt(k.dayJourneys), sub: `${k.dayPct ?? 0}% of all` },
                { label: 'Night trips', value: fmtInt(k.nightJourneys), sub: `${k.nightPct ?? 0}% of all` },
                { label: 'Weekday trips', value: fmtInt(overview.weekdayWeekend.weekday.journeys), sub: `${fmtFare(overview.weekdayWeekend.weekday.avgFare)} avg` },
                { label: 'Weekend trips', value: fmtInt(overview.weekdayWeekend.weekend.journeys), sub: `${fmtFare(overview.weekdayWeekend.weekend.avgFare)} avg` },
                { label: 'Travel days', value: fmtInt(k.totalTravelDays), sub: `${fmtInt(k.totalTravelWeeks)} weeks` },
                { label: 'Avg. fare / day', value: fmtFare(k.avgFarePerDayTravelled), sub: 'on travel days' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-ink-50/70 p-3">
                  <div className="text-lg font-bold text-ink-900">{s.value}</div>
                  <div className="text-xs font-medium text-ink-500">{s.label}</div>
                  <div className="text-[11px] text-ink-400">{s.sub}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="animate-fade-up">
            <CardHeader title="Travel Habit Changes" subtitle="Longest streaks and best month" icon={<IconSparkles />} />
            <div className="grid grid-cols-2 gap-3 p-5">
              {[
                { label: 'Longest day streak', value: `${k.longestDayStreak ?? 0} days` },
                { label: 'Longest week streak', value: `${k.longestWeekStreak ?? 0} weeks` },
                { label: 'Best month', value: overview.streak.bestMonth ? `${overview.streak.bestMonth.month} · ${overview.streak.bestMonth.journeys}` : '—' },
                { label: 'Efficiency score', value: `${k.efficiencyScore ?? 0}/100` },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-ink-50/70 p-3">
                  <div className="text-lg font-bold text-ink-900">{s.value}</div>
                  <div className="text-xs font-medium text-ink-500">{s.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ------------------------ Advanced comparisons ------------------------ */}
      <div className="space-y-4">
        <SectionTitle
          icon={<IconSpark />}
          title="Advanced comparisons & insights"
          subtitle="Scatter relationships, radar comparisons, forecasts and anomaly detection"
          count={9}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Train Popularity vs Avg Fare" subtitle="Usage against cost per service" icon={<IconTrain />}>
            <ScatterSeries
              data={overview.scatter.trainPopVsFare}
              xKey="journeys"
              yKey="avgFare"
              zKey="fare"
              labelKey="train"
              unitX="Journeys"
              unitY="Avg fare"
              formatY={fmtFare}
              color="#8b5cf6"
            />
          </ChartCard>

          <ChartCard title="Route Popularity vs Avg Fare" subtitle="Usage against cost per corridor" icon={<IconRoute />}>
            <ScatterSeries
              data={overview.scatter.routeFreqVsFare}
              xKey="journeys"
              yKey="avgFare"
              zKey="fare"
              labelKey="route"
              unitX="Journeys"
              unitY="Avg fare"
              formatY={fmtFare}
              color="#06b6d4"
            />
          </ChartCard>

          <ChartCard title="Chair Class vs Fare Distribution" subtitle="Fare spread for each class" icon={<IconTicket />}>
            <BoxPlot
              items={overview.chairBoxes.filter((c) => c.fare).map((c) => ({ label: chairClassLabel(c.label), stats: c.fare! }))}
              format={fmtFare}
              color="#8b5cf6"
            />
          </ChartCard>

          <ChartCard title="Train Performance Comparison" subtitle="Normalised journeys, fare and avg fare" icon={<IconTrain />}>
            <RadarCompare data={overview.radarTrain} keys={overview.radarTrainKeys} angleKey="metric" />
          </ChartCard>

          <ChartCard title="Journey Frequency Forecast" subtitle="Linear projection of monthly journeys" icon={<IconSpark />}>
            <ForecastChart
              data={overview.forecast}
              actualKey="journeys"
              forecastKey="journeysForecast"
              label="Actual journeys"
              forecastLabel="Forecast journeys"
              actualColor="#6366f1"
            />
          </ChartCard>

          <Card className="animate-fade-up">
            <CardHeader
              title="Anomaly Detection"
              subtitle="Fares well outside your normal range"
              icon={<IconAlert />}
              action={<Badge tone={overview.anomalies.length ? 'amber' : 'emerald'}>{overview.anomalies.length} flagged</Badge>}
            />
            {overview.anomalies.length === 0 ? (
              <div className="p-6 text-sm text-ink-400">No unusual entries detected — your data looks consistent.</div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {overview.anomalies.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100">
                      <IconAlert />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-800">
                        {a.type} · {a.trainName}
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {a.route} · {formatDate(a.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink-900">{fmtFare(a.value)}</p>
                      <p className="text-[11px] text-ink-400">
                        expected {fmtFare(a.expected)} · z {a.z}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="animate-fade-up lg:col-span-2">
            <CardHeader title="Most & Least Expensive" subtitle="Ranked journeys from the current selection" icon={<IconChart />} />
            <div className="grid grid-cols-1 gap-4 p-1 sm:grid-cols-2">
              <RankedList title="Most expensive" valueLabel="Fare" rows={buildRanked(overview, 'desc')} />
              <RankedList title="Cheapest" valueLabel="Fare" rows={buildRanked(overview, 'asc')} />
            </div>
          </Card>
        </div>
      </div>

      {/* --------------------------- Detailed table --------------------------- */}
      <div className="space-y-4">
        <SectionTitle
          icon={<IconFilter />}
          title="Detailed data & reporting"
          subtitle="Search, sort, filter, drill down and export the underlying journeys"
          count={14}
        />
        <AnalyticsTable filters={filters} />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { href: '/', title: 'Back to dashboard', text: 'Quick insights, recent activity and your budget', icon: <IconGrid /> },
          { href: '/journeys', title: 'Browse all journeys', text: 'Full record list with search and bulk actions', icon: <IconFile /> },
          { href: '/upload', title: 'Import more tickets', text: 'Drop PDFs and parse them in bulk', icon: <IconTrain /> },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="group animate-fade-up">
            <Card hover className="h-full p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-brand-soft text-[20px] text-brand-600 ring-1 ring-inset ring-brand-100">
                {l.icon}
              </span>
              <h3 className="mt-3 font-semibold text-ink-900">{l.title}</h3>
              <p className="mt-1 text-sm text-ink-500">{l.text}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                Open <IconArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* Build ranked rows from the pre-computed top journeys. */
function buildRanked(overview: AnalyticsOverview, dir: 'asc' | 'desc') {
  const t = overview.topJourneys;
  const j = dir === 'desc' ? t.expensive : t.cheapest;
  if (!j) return [];
  return [{
    label: j.trainName,
    sub: `${j.fromStation} → ${j.toStation} · ${formatDate(j.journeyDate)}`,
    value: formatFare(j.fare),
  }];
}
