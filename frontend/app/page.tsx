'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, Journey } from '@/lib/api';
import { formatDate, formatFare, formatDuration, dayNightTone, gradientFor } from '@/lib/utils';
import { Card, CardHeader, Badge, Button, StatCard, Skeleton, EmptyState } from '@/components/ui';
import {
  IconTrain, IconWallet, IconClock, IconRoute, IconUpload, IconPlus,
  IconArrowRight, IconSun, IconMoon, IconSparkles,
} from '@/components/icons';

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.analytics.summary(), api.getJourneys()])
      .then(([s, j]) => {
        setSummary(s);
        setJourneys(j);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const mix = useMemo(() => {
    const day = journeys.filter((j) => j.dayNight === 'DAY').length;
    const night = journeys.filter((j) => j.dayNight === 'NIGHT').length;
    const total = day + night || 1;

    const trainCounts = new Map<string, number>();
    journeys.forEach((j) => trainCounts.set(j.trainName, (trainCounts.get(j.trainName) || 0) + 1));
    const topTrains = [...trainCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({ name, count }));

    const routes = new Set(journeys.map((j) => `${j.fromStation}→${j.toStation}`));

    return {
      day, night, total,
      dayPct: Math.round((day / total) * 100),
      topTrains,
      routeCount: routes.size,
      maxTrain: topTrains[0]?.count || 1,
    };
  }, [journeys]);

  const recent = journeys.slice(0, 6);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-brand p-6 shadow-glow animate-fade-up sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-accent-300/30 blur-3xl" />
        <IconTrain className="pointer-events-none absolute -bottom-6 right-6 text-[140px] text-white/10 animate-float" />

        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur">
            <IconSparkles className="text-[13px]" /> Overview
          </div>
          <h1 className="mt-3 max-w-lg text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
            Your Bangladesh Railway journeys, beautifully organised
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/75">
            Import tickets, track every trip and uncover patterns across stations, trains and classes.
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
          </div>

          <div className="mt-7 grid max-w-xl grid-cols-3 gap-4 border-t border-white/15 pt-5">
            {[
              { label: 'Journeys', value: summary?.totalJourneys ?? 0 },
              { label: 'Total fare', value: formatFare(summary?.totalFare ?? 0) },
              { label: 'Avg. duration', value: formatDuration(summary?.avgDurationMins) },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-xl font-bold text-white sm:text-2xl">{s.value}</div>
                <div className="text-xs font-medium text-white/70">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Journeys" value={summary?.totalJourneys ?? 0} icon={<IconTrain />} gradient="bg-gradient-brand" delay={0} />
        <StatCard label="Total Fare Spent" value={formatFare(summary?.totalFare ?? 0)} icon={<IconWallet />} gradient="bg-gradient-emerald" delay={60} />
        <StatCard label="Avg. Duration" value={formatDuration(summary?.avgDurationMins)} icon={<IconClock />} gradient="bg-gradient-accent" delay={120} />
        <StatCard label="Unique Routes" value={mix.routeCount} icon={<IconRoute />} gradient="bg-gradient-amber" delay={180} />
      </div>

      {/* Recent + mix */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 animate-fade-up">
          <CardHeader
            title="Recent Journeys"
            subtitle="Your latest trips"
            icon={<IconRoute />}
            action={
              <Link href="/journeys" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition hover:text-brand-700">
                View all <IconArrowRight className="text-[15px]" />
              </Link>
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              icon={<IconTrain />}
              title="No journeys yet"
              description="Upload a Bangladesh Railway ticket PDF or add a journey manually to get started."
              action={
                <Link href="/upload">
                  <Button><IconUpload /> Upload your first ticket</Button>
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-ink-100">
              {recent.map((j) => (
                <Link
                  key={j.id}
                  href={`/journeys/${j.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-brand-50/40"
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white text-[18px] ${gradientFor(j.trainName)}`}>
                    <IconTrain />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink-900">{j.trainName}</p>
                      {j.trainNumber && <span className="text-xs text-ink-400">#{j.trainNumber}</span>}
                    </div>
                    <p className="truncate text-xs text-ink-500">
                      {j.fromStation} <span className="text-ink-300">→</span> {j.toStation}
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold text-ink-800">{formatFare(Number(j.fare))}</p>
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

        <div className="space-y-6">
          <Card className="animate-fade-up" >
            <CardHeader title="Day vs Night" subtitle="Travel time split" icon={<IconSun />} />
            <div className="p-5">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-l-full bg-gradient-amber transition-all duration-700" style={{ width: `${mix.dayPct}%` }} />
                <div className="h-full flex-1 rounded-r-full bg-gradient-brand" />
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 font-medium text-ink-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-amber" /> Day
                </span>
                <span className="font-bold text-ink-900">{mix.day}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 font-medium text-ink-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-brand" /> Night
                </span>
                <span className="font-bold text-ink-900">{mix.night}</span>
              </div>
            </div>
          </Card>

          <Card className="animate-fade-up">
            <CardHeader title="Top Trains" subtitle="Most travelled" icon={<IconTrain />} />
            <div className="space-y-3.5 p-5">
              {mix.topTrains.length === 0 && <p className="text-sm text-ink-400">No data yet.</p>}
              {mix.topTrains.map((t) => (
                <div key={t.name}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="truncate font-medium text-ink-700">{t.name}</span>
                    <span className="font-semibold text-ink-500">{t.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={`h-full rounded-full ${gradientFor(t.name)} transition-all duration-700`}
                      style={{ width: `${Math.max(8, (t.count / mix.maxTrain) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
