'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Journey } from '@/lib/api';
import {
  formatDate, formatFare, formatDuration, chairClassLabel,
  dayNightTone, sourceTone, gradientFor,
} from '@/lib/utils';
import {
  Card, CardHeader, Badge, Button, Input, Select, Label,
  PageHeader, Skeleton, EmptyState, cn,
} from '@/components/ui';
import {
  IconSearch, IconDownload, IconTrain, IconRoute, IconTrash, IconPencil,
  IconFilter, IconSun, IconMoon, IconUpload, IconX, IconArrowRight,
} from '@/components/icons';

const CHAIR_TYPES = ['AC_B', 'AC_S', 'SNIGDHA', 'F_BERTH', 'F_SEAT', 'SHOVAN', 'SHOVAN_CHAIR', 'LUXURY', 'OTHER'];

const EMPTY_FILTERS = {
  search: '', fromStation: '', toStation: '', trainName: '',
  chairType: '', dayNight: '', startDate: '', endDate: '',
};

export default function JourneysPage() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    api.getJourneys(params).then(setJourneys).finally(() => setLoading(false));
  };

  useEffect(load, [filters]);

  const activeCount = Object.values(filters).filter(Boolean).length;

  const exportCsv = () => {
    const headers = ['Train', 'From', 'To', 'Date', 'Departure', 'Arrival', 'Class', 'Coach', 'Fare', 'Passenger', 'Day/Night'];
    const rows = journeys.map((j) => [
      j.trainName, j.fromStation, j.toStation, formatDate(j.journeyDate), j.departureTime,
      j.arrivalTime || '', j.chairType, j.coachNo || '', j.fare, j.passengerName || '', j.dayNight,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `journeys-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this journey?')) return;
    await api.deleteJourney(id);
    load();
  };

  const set = (k: keyof typeof filters, v: string) => setFilters({ ...filters, [k]: v });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="All Journeys"
        subtitle={loading ? 'Loading journeys…' : `${journeys.length} journey${journeys.length === 1 ? '' : 's'} found`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowFilters((s) => !s)} className="lg:hidden">
              <IconFilter /> Filters{activeCount > 0 && ` (${activeCount})`}
            </Button>
            <Button variant="secondary" onClick={exportCsv}>
              <IconDownload /> Export CSV
            </Button>
            <Link href="/upload">
              <Button><IconUpload /> New</Button>
            </Link>
          </>
        }
      />

      {/* Filters */}
      <Card className={cn('animate-fade-up', showFilters ? 'block' : 'hidden lg:block')}>
        <CardHeader
          title="Filters"
          subtitle="Narrow down your journeys"
          icon={<IconFilter />}
          action={
            activeCount > 0 ? (
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                <IconX className="text-[14px]" /> Clear all
              </button>
            ) : undefined
          }
        />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Label>Search</Label>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
              <Input className="pl-10" placeholder="Train, station, PNR…" value={filters.search} onChange={(e) => set('search', e.target.value)} />
            </div>
          </div>
          <div><Label>From station</Label><Input placeholder="e.g. Dhaka" value={filters.fromStation} onChange={(e) => set('fromStation', e.target.value)} /></div>
          <div><Label>To station</Label><Input placeholder="e.g. Natore" value={filters.toStation} onChange={(e) => set('toStation', e.target.value)} /></div>
          <div><Label>Train name</Label><Input placeholder="e.g. Ekota" value={filters.trainName} onChange={(e) => set('trainName', e.target.value)} /></div>
          <div>
            <Label>Chair class</Label>
            <Select value={filters.chairType} onChange={(e) => set('chairType', e.target.value)}>
              <option value="">All classes</option>
              {CHAIR_TYPES.map((c) => <option key={c} value={c}>{chairClassLabel(c)}</option>)}
            </Select>
          </div>
          <div>
            <Label>Time of day</Label>
            <Select value={filters.dayNight} onChange={(e) => set('dayNight', e.target.value)}>
              <option value="">Day & Night</option>
              <option value="DAY">Day</option>
              <option value="NIGHT">Night</option>
            </Select>
          </div>
          <div><Label>From date</Label><Input type="date" value={filters.startDate} onChange={(e) => set('startDate', e.target.value)} /></div>
          <div><Label>To date</Label><Input type="date" value={filters.endDate} onChange={(e) => set('endDate', e.target.value)} /></div>
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <Card className="p-5 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}
        </Card>
      ) : journeys.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconRoute />}
            title="No journeys match your filters"
            description="Try adjusting the filters, or add a new journey by uploading a ticket PDF."
            action={<Link href="/upload"><Button><IconUpload /> Upload a ticket</Button></Link>}
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block animate-fade-up">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                    <th className="px-5 py-3.5 font-semibold">Train</th>
                    <th className="px-5 py-3.5 font-semibold">Route</th>
                    <th className="px-5 py-3.5 font-semibold">Date & time</th>
                    <th className="px-5 py-3.5 font-semibold">Class</th>
                    <th className="px-5 py-3.5 font-semibold">Fare</th>
                    <th className="px-5 py-3.5 font-semibold">Source</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {journeys.map((j) => (
                    <tr key={j.id} className="group transition hover:bg-brand-50/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white text-[16px]', gradientFor(j.trainName))}>
                            <IconTrain />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink-900">{j.trainName}</p>
                            <p className="text-xs text-ink-400">{j.trainNumber ? `#${j.trainNumber}` : '—'}{j.passengerName ? ` · ${j.passengerName}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-ink-700">
                          <span className="font-medium">{j.fromStation}</span>
                          <IconArrowRight className="text-[14px] text-ink-300" />
                          <span className="font-medium">{j.toStation}</span>
                        </div>
                        {j.coachNo && <p className="text-xs text-ink-400">Coach {j.coachNo}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-ink-800">{formatDate(j.journeyDate)}</p>
                        <p className="text-xs text-ink-400">{j.departureTime}{j.arrivalTime ? ` → ${j.arrivalTime}` : ''}{j.durationMins ? ` · ${formatDuration(j.durationMins)}` : ''}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge tone="brand">{chairClassLabel(j.chairType)}</Badge>
                          <Badge tone={dayNightTone(j.dayNight)}>
                            {j.dayNight === 'DAY' ? <IconSun className="text-[12px]" /> : <IconMoon className="text-[12px]" />}
                            {j.dayNight}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-ink-900">{formatFare(Number(j.fare))}</td>
                      <td className="px-5 py-3.5"><Badge tone={sourceTone(j.source)}>{j.source}</Badge></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                          <Link href={`/journeys/${j.id}`} className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 transition hover:bg-white hover:text-brand-600" title="Edit">
                            <IconPencil className="text-[16px]" />
                          </Link>
                          <button onClick={() => del(j.id)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 transition hover:bg-white hover:text-rose-600" title="Delete">
                            <IconTrash className="text-[16px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {journeys.map((j) => (
              <Card key={j.id} hover className="p-4 animate-fade-up">
                <div className="flex items-start gap-3">
                  <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white text-[18px]', gradientFor(j.trainName))}>
                    <IconTrain />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-semibold text-ink-900">{j.trainName}</p>
                      <span className="shrink-0 font-semibold text-ink-900">{formatFare(Number(j.fare))}</span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
                      {j.fromStation} <IconArrowRight className="text-[12px] text-ink-300" /> {j.toStation}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">{formatDate(j.journeyDate)} · {j.departureTime}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone="brand">{chairClassLabel(j.chairType)}</Badge>
                      <Badge tone={dayNightTone(j.dayNight)}>{j.dayNight}</Badge>
                      <Badge tone={sourceTone(j.source)}>{j.source}</Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 border-t border-ink-100 pt-3">
                  <Link href={`/journeys/${j.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full"><IconPencil className="text-[14px]" /> Edit</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => del(j.id)} className="text-rose-600 hover:bg-rose-50">
                    <IconTrash className="text-[14px]" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
