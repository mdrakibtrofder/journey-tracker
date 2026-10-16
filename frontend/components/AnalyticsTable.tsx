'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { AnalyticsFilters, AnalyticsTable as TablePayload, JourneyRow } from '@/lib/api';
import { Badge, Button, Card, CardHeader, Input, Skeleton } from '@/components/ui';
import { IconChevronDown, IconDownload, IconFilter, IconOpen, IconSearch, IconTicket } from '@/components/icons';
import { chairClassLabel, dayNightTone, formatDate, formatFare } from '@/lib/utils';

type SortKey = 'date' | 'fare';

const toCsv = (rows: JourneyRow[]) => {
  const head = ['Date', 'Train', 'Train No', 'From', 'To', 'Journey Time', 'Class', 'Coach', 'PNR', 'Passenger', 'Fare', 'Day/Night', 'Issued At', 'Source'];
  const body = rows.map((r) =>
    [
      r.journeyDate,
      r.trainName,
      r.trainNumber || '',
      r.fromStation,
      r.toStation,
      r.departureTime,
      r.chairType,
      r.coachNo || '',
      r.ticketNo || '',
      r.passengerName || '',
      r.fare,
      r.dayNight,
      r.issuedAt || '',
      r.source,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );
  return [head.join(','), ...body].join('\n');
};

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function SortButton({
  label,
  activeSort,
  sortKey,
  order,
  onSort,
}: {
  label: string;
  activeSort: SortKey;
  sortKey: SortKey;
  order: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
}) {
  const isActive = activeSort === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={
        'inline-flex items-center gap-1 font-semibold transition ' +
        (isActive ? 'text-brand-700' : 'text-ink-500 hover:text-ink-800')
      }
    >
      {label}
      <IconChevronDown
        className={
          'text-[13px] transition-transform ' + (isActive ? (order === 'asc' ? 'rotate-180' : '') : 'opacity-30')
        }
      />
    </button>
  );
}

export default function AnalyticsTable({ filters }: { filters: AnalyticsFilters }) {
  const [data, setData] = useState<TablePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sort, setSort] = useState<SortKey>('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [minFare, setMinFare] = useState('');
  const [maxFare, setMaxFare] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 320);
    return () => clearTimeout(t);
  }, [search]);

  const query = useMemo(
    () => ({
      ...filters,
      search: debounced || undefined,
      minFare: minFare || undefined,
      maxFare: maxFare || undefined,
      sort,
      order,
      page,
      pageSize,
    }),
    [filters, debounced, minFare, maxFare, sort, order, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [debounced, minFare, maxFare, pageSize, filters]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.analytics
      .journeys(query)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const onSort = useCallback(
    (key: SortKey) => {
      if (key === sort) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
      else {
        setSort(key);
        setOrder('desc');
      }
    },
    [sort],
  );

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all: JourneyRow[] = [];
      let p = 1;
      let totalPages = 1;
      do {
        const res = await api.analytics.journeys({ ...query, page: p, pageSize: 200 });
        all.push(...res.items);
        totalPages = res.totalPages;
        p += 1;
      } while (p <= totalPages && p <= 20);
      download(`journeys-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(all));
    } finally {
      setExporting(false);
    }
  };

  const items = data?.items || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div id="journeys-table">
      <Card className="animate-fade-up">
      <CardHeader
        title="All Journeys"
        subtitle={`${data?.total ?? 0} matching journeys · sortable, filterable, exportable`}
        icon={<IconTicket />}
        action={
          <Button size="sm" variant="secondary" onClick={exportCsv} disabled={exporting}>
            <IconDownload className="text-[15px]" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 border-b border-ink-100 p-4 lg:grid-cols-4">
        <div className="col-span-2 relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400">
            <IconSearch />
          </span>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search train, route, station, PNR…"
            className="pl-10"
          />
        </div>
        <Input type="number" min={0} value={minFare} onChange={(e) => setMinFare(e.target.value)} placeholder="Min fare" />
        <Input type="number" min={0} value={maxFare} onChange={(e) => setMaxFare(e.target.value)} placeholder="Max fare" />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-5 py-2.5 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink-500">
          <IconFilter className="text-[14px]" /> Sort
        </span>
        <SortButton label="Date" activeSort={sort} sortKey="date" order={order} onSort={onSort} />
        <SortButton label="Fare" activeSort={sort} sortKey="fare" order={order} onSort={onSort} />
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="ml-auto rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs font-medium text-ink-600"
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-9 rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ink-400">No journeys match these filters.</p>
        ) : (
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-ink-50/70 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-2.5">Date</th>
                <th className="px-3 py-2.5">Train</th>
                <th className="px-3 py-2.5">Route</th>
                <th className="px-3 py-2.5">Journey time</th>
                <th className="px-3 py-2.5">Class</th>
                <th className="px-3 py-2.5 text-right">Fare</th>
                <th className="px-3 py-2.5">Day/Night</th>
                <th className="px-3 py-2.5">PNR</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {items.map((r) => (
                <tr key={r.id} className="transition hover:bg-brand-50/40">
                  <td className="whitespace-nowrap px-5 py-2.5 text-ink-600">{formatDate(r.journeyDate)}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-ink-800">{r.trainName}</div>
                    {r.trainNumber && <div className="text-[11px] text-ink-400">#{r.trainNumber}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-ink-600">
                    {r.fromStation} <span className="text-ink-300">→</span> {r.toStation}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-ink-600">{r.departureTime}</td>
                  <td className="px-3 py-2.5 text-ink-600">
                    {chairClassLabel(r.chairType)}
                    {r.coachNo && <span className="ml-1 text-[11px] text-ink-400">· {r.coachNo}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-ink-800">{formatFare(r.fare)}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={dayNightTone(r.dayNight)}>{r.dayNight}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-ink-400">{r.ticketNo || '—'}</td>
                  <td className="px-5 py-2.5 text-right">
                    <Link
                      href={`/journeys/${r.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                      Open <IconOpen className="text-[13px]" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-5 py-3 text-xs text-ink-500">
          <span>
            Page {data?.page ?? 1} of {totalPages} · {data?.total ?? 0} journeys
          </span>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => setPage(1)} disabled={(data?.page ?? 1) <= 1}>
              First
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={(data?.page ?? 1) <= 1}>
              Prev
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={(data?.page ?? 1) >= totalPages}
            >
              Next
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setPage(totalPages)} disabled={(data?.page ?? 1) >= totalPages}>
              Last
            </Button>
          </div>
        </div>
      )}
      </Card>
    </div>
  );
}
