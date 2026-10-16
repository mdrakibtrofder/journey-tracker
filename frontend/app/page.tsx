'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { AnalyticsFacets, AnalyticsFilters, AnalyticsOverview } from '@/lib/api';
import {
  ChartCard, BarSeries, AreaSeries, DonutChart, HistogramChart, CalendarHeatmap,
  InsightCard, BudgetMeter, NoData,
} from '@/components/charts';
import { AnalyticsFilterBar, presetRange, type RangePreset } from '@/components/AnalyticsFilters';
import { Badge, Button, Card, CardHeader, Skeleton, StatCard } from '@/components/ui';
import {
  IconTrain, IconWallet, IconClock, IconRoute, IconTicket, IconSun, IconMoon, IconCalendar,
  IconChart, IconSparkles, IconArrowRight, IconUpload, IconPlus, IconGrid, IconFile,
} from '@/components/icons';
import { chairClassLabel, dayNightTone, formatDate, formatFare, gradientFor } from '@/lib/utils';

const BUDGET_KEY = 'jt.monthly-budget';

const fmtFare = (v: number) => formatFare(v);
const fmtInt = (v: number) => Number(v || 0).toLocaleString('en-IN');

export default function Dashboard() {
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
    setFilters((f) => ({ ...f, ...presetRange(p) }));
  }, []);

  const onBudget = (v: string) => {
    setBudget(v);
    if (typeof window !== 'undefined') window.localStorage.setItem(BUDGET_KEY, v);
  };

  const k = overview?.kpis || {};
  const recent = overview?.recent || [];
  const latest = recent[0];

  const odRanking = useMemo(() => {
    if (!overview) return [];
    const map = new Map<string, { station: string; Origin: number; Destination: number }>();
    overview.origin.slice(0, 6).forEach((s) => map.set(s.station, { station: s.station, Origin: s.journeys, Destination: 0 }));
    overview.destination.slice(0, 6).forEach((s) => {
      const cur = map.get(s.station) || { station: s.station, Origin: 0, Destination: 0 };
      cur.Destination = s.journeys;
      map.set(s.station, cur);
    });
    return [...map.values()].sort((a, b) => b.Origin + b.Destination - (a.Origin + a.Destination));
  }, [overview]);

  if (loading && !overview) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 rounded-3xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total Journeys', value: fmtInt(k.totalJourneys), icon: <IconTrain />, gradient: 'bg-gradient-brand', hint: `${fmtInt(k.totalTravelDays)} travel days` },
    { label: 'Total Fare Spent', value: fmtFare(k.totalFare), icon: <IconWallet />, gradient: 'bg-gradient-emerald', hint: `${fmtFare(k.avgFare)} avg / journey` },
    { label: 'Unique Routes', value: fmtInt(k.uniqueRoutes), icon: <IconRoute />, gradient: 'bg-gradient-amber', hint: `${fmtInt(k.uniqueTrains)} trains` },
    { label: 'Avg. Fare per Journey', value: fmtFare(k.avgFare), icon: <IconWallet />, gradient: 'bg-gradient-accent' },
    { label: 'Most Travelled Train', value: k.mostFrequentTrain?.train || '—', icon: <IconTrain />, gradient: 'bg-gradient-brand', hint: k.mostFrequentTrain ? `${k.mostFrequentTrain.journeys} journeys` : undefined },
    { label: 'Top Origin', value: k.mostVisitedOrigin?.station || '—', icon: <IconRoute />, gradient: 'bg-gradient-emerald', hint: k.mostVisitedOrigin ? `${k.mostVisitedOrigin.journeys} departures` : undefined },
    { label: 'Top Destination', value: k.mostVisitedDestination?.station || '—', icon: <IconRoute />, gradient: 'bg-gradient-amber', hint: k.mostVisitedDestination ? `${k.mostVisitedDestination.journeys} arrivals` : undefined },
    { label: 'Day Journeys', value: fmtInt(k.dayJourneys), icon: <IconSun />, gradient: 'bg-gradient-amber', hint: `${k.dayPct ?? 0}% of all trips` },
    { label: 'Night Journeys', value: fmtInt(k.nightJourneys), icon: <IconMoon />, gradient: 'bg-gradient-slate', hint: `${k.nightPct ?? 0}% of all trips` },
    { label: 'Avg. Monthly Spend', value: fmtFare(k.avgMonthlySpend), icon: <IconCalendar />, gradient: 'bg-gradient-brand', hint: `${fmtInt(k.monthsSpan)} months of data` },
    { label: 'Total Travel Days', value: fmtInt(k.totalTravelDays), icon: <IconCalendar />, gradient: 'bg-gradient-accent', hint: `${fmtInt(k.totalTravelWeeks)} travel weeks` },
    { label: 'Avg. Journeys / Month', value: k.avgPerMonth ?? 0, icon: <IconChart />, gradient: 'bg-gradient-amber', hint: `${k.avgPerWeek ?? 0} per week` },
    { label: 'Most Used Chair Class', value: k.mostUsedChairClass ? chairClassLabel(k.mostUsedChairClass.chairType) : '—', icon: <IconTicket />, gradient: 'bg-gradient-brand', hint: k.mostUsedChairClass ? `${k.mostUsedChairClass.journeys} journeys` : undefined },
  ];

  const cmp = overview?.comparison;
  const dayMix = (overview?.byDayNight || []).map((d) => ({
    name: d.dayNight === 'DAY' ? 'Day' : 'Night',
    value: d.journeys,
  }));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-brand p-6 shadow-glow animate-fade-up sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-accent-300/30 blur-3xl" />
        <IconTrain className="pointer-events-none absolute -bottom-6 right-6 text-[140px] text-white/10 animate-float" />

        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur">
            <IconSparkles className="text-[13px]" /> Travel analytics
          </div>
          <h1 className="mt-3 max-w-lg text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
            Your Bangladesh Railway journeys, beautifully organised
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/75">
            {overview?.meta.filtered ?? 0} journeys in view
            {overview?.meta.total ? ` of ${overview.meta.total} tracked` : ''}
            {overview?.meta.dateRange ? ` · ${overview.meta.dateRange.min} → ${overview.meta.dateRange.max}` : ''}.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href="/upload">
              <Button className="bg-white text-brand-700 shadow-soft hover:bg-white/90">
                <IconUpload /> Upload PDF
              </Button>
            </Link>
            <Link href="/journeys/new">
              <Button className="bg-white/15 text-white ring-1 ring-inset ring-white/25 backdrop-blur hover:bg-white/25">
                <IconPlus /> Add Manually
              </Button>
            </Link>
            <Link href="/analytics">
              <Button className="bg-white/15 text-white ring-1 ring-inset ring-white/25 backdrop-blur hover:bg-white/25">
                <IconChart /> Deep analytics <IconArrowRight />
              </Button>
            </Link>
          </div>

          <div className="mt-7 grid max-w-2xl grid-cols-2 gap-4 border-t border-white/15 pt-5 sm:grid-cols-4">
            {[
              { label: 'Journeys', value: fmtInt(k.totalJourneys) },
              { label: 'Total fare', value: fmtFare(k.totalFare) },
              { label: 'Routes', value: fmtInt(k.uniqueRoutes) },
              { label: 'Travel days', value: fmtInt(k.totalTravelDays) },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-lg font-bold text-white sm:text-xl">{s.value}</div>
                <div className="text-xs font-medium text-white/70">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
          <Link href="/analytics">
            <Button size="sm" variant="outline">
              <IconGrid className="text-[14px]" /> Analytics workspace
            </Button>
          </Link>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((c, i) => (
          <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} gradient={c.gradient} hint={c.hint} delay={i * 25} />
        ))}
      </div>

      {/* Insights + comparison + budget */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="animate-fade-up lg:col-span-2">
          <CardHeader title="Quick Insights" subtitle="Generated from your travel history" icon={<IconSparkles />} />
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            {(overview?.insights || []).length === 0 && <NoData message="Add a few journeys to unlock insights" />}
            {(overview?.insights || []).map((ins, i) => (
              <InsightCard key={i} insight={ins} />
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="animate-fade-up">
            <CardHeader title="This month vs last" subtitle={cmp?.current ? `${cmp.current.label} vs ${cmp.previous?.label ?? '—'}` : 'Not enough data'} icon={<IconChart />} />
            <div className="p-5">
              {cmp?.current ? (
                <div className="space-y-4">
                  {[
                    { label: 'Journeys', cur: cmp.current.journeys, prev: cmp.previous?.journeys ?? 0 },
                    { label: 'Fare', cur: cmp.current.fare, prev: cmp.previous?.fare ?? 0, money: true },
                    { label: 'Avg. fare', cur: cmp.current.avgFare, prev: cmp.previous?.avgFare ?? 0, money: true },
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
                  <div className="grid grid-cols-2 gap-3 border-t border-ink-100 pt-3 text-center">
                    <div>
                      <div className="text-lg font-bold text-ink-900">{cmp.current.day}</div>
                      <div className="text-xs text-ink-500">Day trips</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-ink-900">{cmp.current.night}</div>
                      <div className="text-xs text-ink-500">Night trips</div>
                    </div>
                  </div>
                </div>
              ) : (
                <NoData />
              )}
            </div>
          </Card>

          <Card className="animate-fade-up">
            <CardHeader title="Monthly Budget" subtitle="Spending progress" icon={<IconWallet />} />
            <div className="p-5">
              {budget && Number(budget) > 0 ? (
                <BudgetMeter spent={k.currentMonthFare || 0} budget={Number(budget)} />
              ) : (
                <p className="text-sm text-ink-400">Set a monthly budget in the filter bar to track your spending progress.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Activity calendar */}
      <ChartCard
        title="Journey Activity Calendar"
        subtitle="Daily travel activity"
        icon={<IconCalendar />}
        height=""
        action={
          <div className="flex gap-3 text-xs font-medium text-ink-500">
            <span>{fmtInt(k.totalTravelDays)} days travelled</span>
            <span className="text-ink-300">·</span>
            <span>Longest streak {k.longestDayStreak ?? 0}d</span>
          </div>
        }
      >
        <div className="p-1">
          <CalendarHeatmap days={overview?.calendar || []} metric="journeys" />
        </div>
      </ChartCard>

      {/* Trends */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Monthly Journey Trend"
          subtitle="Journeys per month"
          icon={<IconChart />}
          action={<Link href="/analytics" className="text-xs font-semibold text-brand-600">Drill down →</Link>}
        >
          <AreaSeries data={overview?.monthly || []} xKey="month" areas={[{ key: 'journeys', name: 'Journeys', color: '#6366f1' }]} />
        </ChartCard>

        <ChartCard title="Monthly Fare Trend" subtitle="Spending per month" icon={<IconWallet />}>
          <AreaSeries
            data={overview?.monthly || []}
            xKey="month"
            areas={[{ key: 'fare', name: 'Fare', color: '#10b981' }]}
            format={fmtFare}
          />
        </ChartCard>

        <ChartCard title="Day vs Night Split" subtitle="Departure time mix" icon={<IconSun />}>
          <DonutChart data={dayMix} centerValue={fmtInt(k.totalJourneys)} centerLabel="journeys" />
        </ChartCard>

        <ChartCard title="Chair Class Distribution" subtitle="Seat classes you travel" icon={<IconTicket />}>
          <DonutChart
            data={(overview?.byChairType || []).map((c) => ({ name: chairClassLabel(c.chairType), value: c.journeys }))}
            centerValue={fmtInt(k.uniqueTrains)}
            centerLabel="trains"
          />
        </ChartCard>

        <ChartCard title="Top 5 Trains" subtitle="Most frequently used" icon={<IconTrain />}>
          <BarSeries
            horizontal
            data={(overview?.byTrain || []).slice(0, 5).map((t) => ({ ...t, label: t.train }))}
            xKey="label"
            bars={[{ key: 'journeys', name: 'Journeys', color: '#6366f1' }]}
          />
        </ChartCard>

        <ChartCard title="Top 5 Routes" subtitle="Most travelled origin → destination" icon={<IconRoute />}>
          <BarSeries
            horizontal
            data={(overview?.routes || []).slice(0, 5)}
            xKey="route"
            yWidth={150}
            bars={[{ key: 'journeys', name: 'Journeys', color: '#06b6d4' }]}
          />
        </ChartCard>

        <ChartCard title="Fare Distribution" subtitle="How your fares are spread" icon={<IconWallet />}>
          <HistogramChart bins={overview?.fareHistogram || []} />
        </ChartCard>

        <ChartCard title="Weekly Travel Pattern" subtitle="Journeys by day of week" icon={<IconCalendar />}>
          <BarSeries
            data={overview?.weekday || []}
            xKey="day"
            bars={[{ key: 'journeys', name: 'Journeys', color: '#f59e0b' }]}
            hideLegend
          />
        </ChartCard>

        <ChartCard title="Hourly Departure Pattern" subtitle="Journey frequency by departure hour" icon={<IconClock />}>
          <BarSeries
            data={overview?.hourly || []}
            xKey="hour"
            bars={[{ key: 'journeys', name: 'Journeys', color: '#ec4899' }]}
            xAngle={-45}
            xHeight={44}
            hideLegend
          />
        </ChartCard>

        <ChartCard title="Travel Frequency by Month" subtitle="Active travel days each month" icon={<IconCalendar />}>
          <BarSeries
            data={overview?.monthly || []}
            xKey="month"
            bars={[{ key: 'activeDays', name: 'Active days', color: '#10b981' }]}
            hideLegend
          />
        </ChartCard>

        <ChartCard title="Average Fare by Chair Class" subtitle="Cost across seat classes" icon={<IconTicket />}>
          <BarSeries
            data={(overview?.byChairType || []).map((c) => ({ ...c, label: chairClassLabel(c.chairType) }))}
            xKey="label"
            bars={[{ key: 'avgFare', name: 'Avg fare', color: '#f43f5e' }]}
            format={fmtFare}
            xAngle={-20}
            xHeight={40}
            hideLegend
          />
        </ChartCard>

        <ChartCard title="Spending Breakdown by Train" subtitle="Total fare contributed per train" icon={<IconWallet />}>
          <BarSeries
            horizontal
            data={(overview?.byTrain || []).slice(0, 6)}
            xKey="train"
            yWidth={150}
            bars={[{ key: 'fare', name: 'Fare', color: '#4338ca' }]}
            format={fmtFare}
          />
        </ChartCard>

        <ChartCard title="Origin vs Destination Ranking" subtitle="Most common departure and arrival stations" icon={<IconRoute />}>
          {odRanking.length ? (
            <BarSeries
              data={odRanking}
              xKey="station"
              bars={[
                { key: 'Origin', name: 'As origin', color: '#6366f1' },
                { key: 'Destination', name: 'As destination', color: '#06b6d4' },
              ]}
              xAngle={-20}
              xHeight={44}
            />
          ) : (
            <NoData />
          )}
        </ChartCard>
      </div>

      {/* Streak + recent */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="animate-fade-up">
          <CardHeader title="Travel Streak" subtitle="Consistency at a glance" icon={<IconSparkles />} />
          <div className="grid grid-cols-2 gap-4 p-5">
            {[
              { label: 'Longest day streak', value: `${k.longestDayStreak ?? 0} days` },
              { label: 'Longest week streak', value: `${k.longestWeekStreak ?? 0} weeks` },
              { label: 'Travel days', value: fmtInt(k.totalTravelDays) },
              { label: 'Best month', value: overview?.streak.bestMonth ? `${overview.streak.bestMonth.month} · ${overview.streak.bestMonth.journeys}` : '—' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-ink-50/70 p-3">
                <div className="text-lg font-bold text-ink-900">{s.value}</div>
                <div className="text-xs font-medium text-ink-500">{s.label}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="animate-fade-up lg:col-span-2">
          <CardHeader
            title="Recent Journeys"
            subtitle={latest ? `Latest: ${latest.trainName} · ${formatDate(latest.journeyDate)}` : 'Your latest trips'}
            icon={<IconRoute />}
            action={
              <Link href="/journeys" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition hover:text-brand-700">
                View all <IconArrowRight className="text-[15px]" />
              </Link>
            }
          />
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
              <p className="text-sm text-ink-500">No journeys yet — upload a ticket or add one manually.</p>
              <Link href="/upload">
                <Button><IconUpload /> Upload your first ticket</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {recent.map((j) => (
                <Link key={j.id} href={`/journeys/${j.id}`} className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-brand-50/40">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white text-[18px] ${gradientFor(j.trainName)}`}>
                    <IconTrain />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink-900">{j.trainName}</p>
                      {j.trainNumber && <span className="text-xs text-ink-400">#{j.trainNumber}</span>}
                    </div>
                    <p className="truncate text-xs text-ink-500">
                      {j.fromStation} <span className="text-ink-300">→</span> {j.toStation} · {j.departureTime}
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold text-ink-800">{formatFare(j.fare)}</p>
                    <p className="text-xs text-ink-400">{formatDate(j.journeyDate)}</p>
                  </div>
                  <Badge tone={dayNightTone(j.dayNight)}>
                    {j.dayNight === 'DAY' ? <IconSun className="text-[12px]" /> : <IconMoon className="text-[12px]" />}
                    {j.dayNight}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { href: '/analytics', title: 'Deep analytics workspace', text: 'Distributions, heatmaps, forecasts and comparisons', icon: <IconChart /> },
          { href: '/journeys', title: 'Browse all journeys', text: 'Search, filter and export your records', icon: <IconFile /> },
          { href: '/upload', title: 'Import tickets', text: 'Drop PDFs and parse them in bulk', icon: <IconUpload /> },
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
