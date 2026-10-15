'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Journey, JourneyFacets } from '@/lib/api';
import {
  formatDate, formatDateTime, formatFare, chairClassLabel,
  dayNightTone, sourceTone, gradientFor,
} from '@/lib/utils';
import {
  Card, Badge, Button, Select, Label, Combobox,
  PageHeader, Skeleton, EmptyState, Checkbox, ConfirmDialog, cn,
} from '@/components/ui';
import type { ComboboxOption } from '@/components/ui';
import { JourneyPreviewModal } from '@/components/JourneyPreview';
import {
  IconSearch, IconDownload, IconTrain, IconRoute, IconTrash, IconPencil,
  IconFilter, IconSun, IconMoon, IconUpload, IconX, IconArrowRight, IconCheck, IconEye,
  IconOpen, IconChevronDown, IconCalendar, IconClock,
} from '@/components/icons';

const CHAIR_TYPES = ['AC_B', 'AC_S', 'SNIGDHA', 'F_BERTH', 'F_SEAT', 'SHOVAN', 'SHOVAN_CHAIR', 'LUXURY', 'OTHER'];

const EMPTY_FILTERS = {
  search: '', fromStation: '', toStation: '', trainName: '',
  chairType: '', dayNight: '', departureTime: '', journeyDate: '',
};

const asOptions = (values: string[], group?: string): ComboboxOption[] =>
  values.map((value) => ({ value, group }));

export default function JourneysPage() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [facets, setFacets] = useState<JourneyFacets | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [previewing, setPreviewing] = useState<Journey | null>(null);

  const loadFacets = () => {
    api.getFacets().then(setFacets).catch(() => {});
  };

  useEffect(loadFacets, []);

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([k, v]) => {
      // journeyDate is a single dropdown; the API expects a start/end range.
      if (!v || k === 'journeyDate') return;
      params[k] = v;
    });
    if (filters.journeyDate) {
      params.startDate = filters.journeyDate;
      params.endDate = filters.journeyDate;
    }
    api.getJourneys(params)
      .then((list) => {
        setJourneys(list);
        const ids = new Set(list.map((j) => j.id));
        setSelected((prev) => prev.filter((id) => ids.has(id)));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [filters]);

  const activeCount = Object.values(filters).filter(Boolean).length;
  const advancedCount = Object.entries(filters).filter(([k, v]) => k !== 'search' && Boolean(v)).length;

  // Global search suggestions: existing values straight from every column, so
  // the dropdown never offers something that isn't in the data.
  const searchOptions: ComboboxOption[] = facets
    ? [
        ...facets.trainNames.map((v) => ({ value: v, group: 'Train' })),
        ...facets.trainNumbers.map((v) => ({ value: v, group: 'Train no.' })),
        ...facets.fromStations.map((v) => ({ value: v, group: 'From station' })),
        ...facets.toStations.map((v) => ({ value: v, group: 'To station' })),
        ...facets.ticketNos.map((v) => ({ value: v, group: 'PNR / ticket' })),
        ...facets.passengerNames.map((v) => ({ value: v, group: 'Passenger' })),
        ...facets.coachNos.map((v) => ({ value: v, group: 'Coach' })),
        ...facets.departureTimes.map((v) => ({ value: v, group: 'Journey time' })),
      ]
    : [];

  const dateOptions: ComboboxOption[] = (facets?.journeyDates || []).map((v) => ({
    value: v,
    label: formatDate(v),
  }));

  const chairOptions: ComboboxOption[] = (facets?.chairTypes?.length ? facets.chairTypes : CHAIR_TYPES)
    .map((v) => ({ value: v, label: chairClassLabel(v) }));

  const timeOptions: ComboboxOption[] = asOptions(facets?.departureTimes || []);

  const allSelected = journeys.length > 0 && selected.length === journeys.length;

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAll = () => setSelected(allSelected ? [] : journeys.map((j) => j.id));

  const askDelete = (ids: string[]) => { if (ids.length) setPendingIds(ids); };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteJourneys(pendingIds);
      setSelected((prev) => prev.filter((id) => !pendingIds.includes(id)));
      setPendingIds([]);
      load();
      loadFacets();
    } finally {
      setDeleting(false);
    }
  };

  const pendingJourneys = journeys.filter((j) => pendingIds.includes(j.id));

  const exportCsv = () => {
    const headers = ['Train', 'From', 'To', 'Date', 'Journey Time', 'Issued At', 'Class', 'Coach', 'Fare', 'Passenger', 'Day/Night'];
    const rows = journeys.map((j) => [
      j.trainName, j.fromStation, j.toStation, formatDate(j.journeyDate), j.departureTime,
      formatDateTime(j.issuedAt), j.chairType, j.coachNo || '', j.fare, j.passengerName || '', j.dayNight,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `journeys-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const set = (k: keyof typeof filters, v: string) => setFilters({ ...filters, [k]: v });

  return (
    <div className={cn('space-y-6', selected.length > 0 && 'pb-24')}>
      <PageHeader
        eyebrow="Manage"
        title="All Journeys"
        subtitle={loading ? 'Loading journeys…' : `${journeys.length} journey${journeys.length === 1 ? '' : 's'} found`}
        actions={
          <>
            {journeys.length > 0 && (
              <Button variant="secondary" onClick={toggleAll}>
                <Checkbox checked={allSelected} readOnly tabIndex={-1} className="pointer-events-none" />
                {allSelected ? 'Clear all' : 'Select all'}
              </Button>
            )}
            <Button variant="secondary" onClick={exportCsv}>
              <IconDownload /> Export CSV
            </Button>
            <Link href="/upload">
              <Button><IconUpload /> New</Button>
            </Link>
          </>
        }
      />

      {/* Search bar + advanced filters */}
      <Card className="animate-fade-up">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-0 flex-1">
            <Combobox
              value={filters.search}
              onChange={(v) => set('search', v)}
              options={searchOptions}
              icon={<IconSearch className="text-[18px]" />}
              emptyOption="Clear search"
              placeholder="Search everything — train, station, PNR, passenger, time…"
            />
          </div>

          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            onClick={() => setShowFilters((s) => !s)}
          >
            <IconFilter /> Advanced search
            {advancedCount > 0 && (
              <span className={cn(
                'grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold',
                showFilters ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-700',
              )}>
                {advancedCount}
              </span>
            )}
            <IconChevronDown className={cn('text-[16px] transition-transform duration-200', showFilters && 'rotate-180')} />
          </Button>

          {activeCount > 0 && (
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 hover:text-brand-700"
            >
              <IconX className="text-[14px]" /> Clear all
            </button>
          )}
        </div>

        {showFilters && (
          <div className="animate-fade-up border-t border-ink-100">
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>From station</Label>
                <Combobox
                  value={filters.fromStation}
                  onChange={(v) => set('fromStation', v)}
                  options={asOptions(facets?.fromStations || [])}
                  icon={<IconRoute className="text-[17px]" />}
                  emptyOption="All stations"
                  placeholder="Pick a station"
                />
              </div>
              <div>
                <Label>To station</Label>
                <Combobox
                  value={filters.toStation}
                  onChange={(v) => set('toStation', v)}
                  options={asOptions(facets?.toStations || [])}
                  icon={<IconRoute className="text-[17px]" />}
                  emptyOption="All stations"
                  placeholder="Pick a station"
                />
              </div>
              <div>
                <Label>Train name</Label>
                <Combobox
                  value={filters.trainName}
                  onChange={(v) => set('trainName', v)}
                  options={asOptions(facets?.trainNames || [])}
                  icon={<IconTrain className="text-[17px]" />}
                  emptyOption="All trains"
                  placeholder="Pick a train"
                />
              </div>
              <div>
                <Label>Journey date</Label>
                <Combobox
                  value={filters.journeyDate}
                  onChange={(v) => set('journeyDate', v)}
                  options={dateOptions}
                  icon={<IconCalendar className="text-[17px]" />}
                  emptyOption="All dates"
                  placeholder="Pick a date"
                />
              </div>
              <div>
                <Label>Journey time</Label>
                <Combobox
                  value={filters.departureTime}
                  onChange={(v) => set('departureTime', v)}
                  options={timeOptions}
                  icon={<IconClock className="text-[17px]" />}
                  emptyOption="All times"
                  placeholder="Pick a time"
                />
              </div>
              <div>
                <Label>Chair class</Label>
                <Combobox
                  value={filters.chairType}
                  onChange={(v) => set('chairType', v)}
                  options={chairOptions}
                  emptyOption="All classes"
                  placeholder="Pick a class"
                />
              </div>
              <div>
                <Label>Time of day</Label>
                <Select value={filters.dayNight} onChange={(e) => set('dayNight', e.target.value)}>
                  <option value="">Day & Night</option>
                  <option value="DAY">Day</option>
                  <option value="NIGHT">Night</option>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-ink-100 px-5 py-3">
              <p className="text-xs text-ink-400">
                {activeCount > 0 ? `${activeCount} filter${activeCount === 1 ? '' : 's'} active` : 'No advanced filters applied'}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                <IconChevronDown className="rotate-180 text-[16px]" /> Hide advanced
              </Button>
            </div>
          </div>
        )}
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
                    <th className="w-10 py-3.5 pl-5 pr-1">
                      <Checkbox
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Select all journeys"
                      />
                    </th>
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
                    <tr key={j.id} className={cn('group transition', selected.includes(j.id) ? 'bg-brand-50/60' : 'hover:bg-brand-50/40')}>
                      <td className="py-3.5 pl-5 pr-1">
                        <Checkbox
                          checked={selected.includes(j.id)}
                          onChange={() => toggle(j.id)}
                          aria-label={`Select ${j.trainName}`}
                        />
                      </td>
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
                        <p className="text-xs text-ink-400">{j.departureTime}</p>
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
                          <Link href={`/journeys/${j.id}`} className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 transition hover:bg-white hover:text-brand-600" title="View">
                            <IconOpen className="text-[16px]" />
                          </Link>
                          <button onClick={() => setPreviewing(j)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 transition hover:bg-white hover:text-brand-600" title="Preview">
                            <IconEye className="text-[16px]" />
                          </button>
                          <Link href={`/journeys/${j.id}?edit=1`} className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 transition hover:bg-white hover:text-brand-600" title="Edit">
                            <IconPencil className="text-[16px]" />
                          </Link>
                          <button onClick={() => askDelete([j.id])} className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 transition hover:bg-white hover:text-rose-600" title="Delete">
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
            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 text-sm font-semibold text-ink-600">
                <Checkbox checked={allSelected} onChange={toggleAll} /> Select all
              </label>
              {selected.length > 0 && (
                <span className="text-xs font-semibold text-brand-600">{selected.length} selected</span>
              )}
            </div>
            {journeys.map((j) => (
              <Card key={j.id} hover className={cn('p-4 animate-fade-up', selected.includes(j.id) && 'border-brand-300 bg-brand-50/40')}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selected.includes(j.id)}
                    onChange={() => toggle(j.id)}
                    className="mt-1"
                    aria-label={`Select ${j.trainName}`}
                  />
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
                    <Button variant="secondary" size="sm" className="w-full"><IconOpen className="text-[14px]" /> View</Button>
                  </Link>
                  <Button variant="secondary" size="sm" onClick={() => setPreviewing(j)}>
                    <IconEye className="text-[14px]" /> Preview
                  </Button>
                  <Link href={`/journeys/${j.id}?edit=1`}>
                    <Button variant="secondary" size="sm"><IconPencil className="text-[14px]" /> Edit</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => askDelete([j.id])} className="text-rose-600 hover:bg-rose-50">
                    <IconTrash className="text-[14px]" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200/70 bg-white/85 px-4 py-3.5 shadow-card-hover backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-ink-600">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand-soft text-brand-600 ring-1 ring-inset ring-brand-100">
                <IconCheck />
              </span>
              <span><strong className="text-ink-900">{selected.length}</strong> journey{selected.length === 1 ? '' : 's'} selected</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Button variant="ghost" onClick={() => setSelected([])} disabled={deleting}>Clear selection</Button>
              <Button variant="danger" onClick={() => askDelete(selected)} disabled={deleting}>
                <IconTrash /> Delete {selected.length === 1 ? 'journey' : `${selected.length} journeys`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      <JourneyPreviewModal
        journey={previewing}
        open={!!previewing}
        onClose={() => setPreviewing(null)}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={pendingIds.length > 0}
        title={pendingIds.length > 1 ? `Delete ${pendingIds.length} journeys?` : 'Delete this journey?'}
        description={
          pendingIds.length > 1
            ? 'These journeys will be permanently removed from your history. This action cannot be undone.'
            : 'This journey will be permanently removed from your history. This action cannot be undone.'
        }
        confirmLabel={pendingIds.length > 1 ? `Delete ${pendingIds.length} journeys` : 'Delete journey'}
        loadingLabel="Deleting…"
        loading={deleting}
        onCancel={() => setPendingIds([])}
        onConfirm={confirmDelete}
      >
        {pendingJourneys.length > 0 && (
          <ul className="max-h-52 space-y-1.5 overflow-y-auto rounded-2xl border border-rose-100 bg-rose-50/60 p-3">
            {pendingJourneys.slice(0, 4).map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-semibold text-ink-800">{j.trainName}</span>
                <span className="shrink-0 text-xs text-ink-500">
                  {j.fromStation} → {j.toStation} · {formatDate(j.journeyDate)}
                </span>
              </li>
            ))}
            {pendingJourneys.length > 4 && (
              <li className="pt-0.5 text-xs font-semibold text-rose-600">
                + {pendingJourneys.length - 4} more journey{pendingJourneys.length - 4 === 1 ? '' : 's'}
              </li>
            )}
          </ul>
        )}
      </ConfirmDialog>
    </div>
  );
}
