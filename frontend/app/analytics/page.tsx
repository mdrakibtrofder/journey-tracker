'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatFare, formatDuration, chairClassLabel, CHART_COLORS, CHART_TOOLTIP_STYLE } from '@/lib/utils';
import { Card, CardHeader, PageHeader, StatCard, Skeleton } from '@/components/ui';
import {
  IconTrain, IconWallet, IconClock, IconRoute,
  IconTicket, IconSun, IconSparkles,
} from '@/components/icons';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, Area, AreaChart,
} from 'recharts';

const AXIS = { fontSize: 11, fill: '#64748b' };
const GRID = '#eef2f7';

function ChartBody({ children }: { children: React.ReactNode }) {
  return <div className="h-72 p-5">{children}</div>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.analytics.summary(),
      api.analytics.byStation(),
      api.analytics.byTrain(),
      api.analytics.byChairType(),
      api.analytics.byDayNight(),
      api.analytics.byMonth(),
      api.analytics.routes(),
    ]).then(([summary, station, train, chair, dn, month, routes]) => {
      setData({ summary, station, train, chair, dn, month, routes });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-72 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const routeCount = (data.routes || []).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        subtitle="A visual breakdown of your train journeys across stations, trains and classes."
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Journeys" value={data.summary?.totalJourneys ?? 0} icon={<IconTrain />} gradient="bg-gradient-brand" delay={0} />
        <StatCard label="Total Fare Spent" value={formatFare(data.summary?.totalFare ?? 0)} icon={<IconWallet />} gradient="bg-gradient-emerald" delay={60} />
        <StatCard label="Avg. Duration" value={formatDuration(data.summary?.avgDurationMins)} icon={<IconClock />} gradient="bg-gradient-accent" delay={120} />
        <StatCard label="Unique Routes" value={routeCount} icon={<IconRoute />} gradient="bg-gradient-amber" delay={180} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="animate-fade-up">
          <CardHeader title="Journeys by Train" subtitle="Trips per train service" icon={<IconTrain />} />
          <ChartBody>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.train || []} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-train" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke={GRID} vertical={false} />
                <XAxis dataKey="train" tick={AXIS} angle={-20} textAnchor="end" height={64} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip {...CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                <Bar dataKey="count" name="Journeys" fill="url(#grad-train)" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBody>
        </Card>

        <Card className="animate-fade-up">
          <CardHeader title="Chair Class Distribution" subtitle="Share of journeys by class" icon={<IconTicket />} />
          <ChartBody>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.chair || []}
                  dataKey="count"
                  nameKey="chairType"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="none"
                  label={(e: any) => chairClassLabel(e.chairType)}
                >
                  {(data.chair || []).map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: any, n: any) => [v, chairClassLabel(n)]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartBody>
        </Card>

        <Card className="animate-fade-up">
          <CardHeader title="Day vs Night Journeys" subtitle="Travel-time split" icon={<IconSun />} />
          <ChartBody>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.dn || []}
                  dataKey="count"
                  nameKey="dayNight"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="none"
                  label
                >
                  {(data.dn || []).map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.dayNight === 'DAY' ? '#f59e0b' : '#6366f1'} />
                  ))}
                </Pie>
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartBody>
        </Card>

        <Card className="animate-fade-up">
          <CardHeader title="Monthly Journey Trend" subtitle="Journeys over time" icon={<IconSparkles />} />
          <ChartBody>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.month || []} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-month" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke={GRID} vertical={false} />
                <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="count" name="Journeys" stroke="#6366f1" strokeWidth={2.5} fill="url(#grad-month)" dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartBody>
        </Card>

        <Card className="animate-fade-up lg:col-span-2">
          <CardHeader title="Top Routes" subtitle="Most frequent origin → destination pairs" icon={<IconRoute />} />
          <ChartBody>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(data.routes || []).slice(0, 10)} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-route" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke={GRID} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="route" tick={AXIS} width={190} tickLine={false} axisLine={false} />
                <Tooltip {...CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(16,185,129,0.06)' }} />
                <Bar dataKey="count" name="Journeys" fill="url(#grad-route)" radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBody>
        </Card>

        <Card className="animate-fade-up lg:col-span-2">
          <CardHeader title="Fare Spent by Station" subtitle="Total spend per origin station" icon={<IconWallet />} />
          <ChartBody>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.station?.from || []} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-fare" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke={GRID} vertical={false} />
                <XAxis dataKey="station" tick={AXIS} angle={-20} textAnchor="end" height={64} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip {...CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(139,92,246,0.06)' }} formatter={(v: any) => formatFare(v)} />
                <Bar dataKey="fare" name="Fare" fill="url(#grad-fare)" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBody>
        </Card>
      </div>
    </div>
  );
}
