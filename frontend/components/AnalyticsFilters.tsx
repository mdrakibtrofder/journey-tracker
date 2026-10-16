'use client';

import type { ReactNode } from 'react';
import type { AnalyticsFacets, AnalyticsFilters } from '@/lib/api';
import { Button, Card, Combobox, Field, Input } from '@/components/ui';
import { IconCalendar, IconFilter, IconRoute, IconTrain, IconWallet, IconX } from '@/components/icons';
import { chairClassLabel } from '@/lib/utils';

export type RangePreset = '7d' | '30d' | '90d' | 'year' | 'all' | 'custom';

const isoDay = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function presetRange(preset: RangePreset): { from?: string; to?: string } {
  const today = new Date();
  if (preset === 'all') return {};
  if (preset === 'year') return { from: `${today.getFullYear()}-01-01`, to: isoDay(today) };
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  return { from: isoDay(from), to: isoDay(today) };
}

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
];

export function AnalyticsFilterBar({
  value,
  onChange,
  facets,
  preset,
  onPreset,
  showBudget = false,
  budget = '',
  onBudget,
  extra,
}: {
  value: AnalyticsFilters;
  onChange: (patch: Partial<AnalyticsFilters>) => void;
  facets: AnalyticsFacets | null;
  preset: RangePreset;
  onPreset: (p: RangePreset) => void;
  showBudget?: boolean;
  budget?: string;
  onBudget?: (v: string) => void;
  extra?: ReactNode;
}) {
  const active = Object.entries(value).filter(([k, v]) => v !== undefined && v !== null && v !== '' && k !== 'budget').length;

  const toOptions = (xs: string[] = [], label?: (v: string) => string) =>
    xs.map((v) => ({ value: v, label: label ? label(v) : v }));

  return (
    <Card className="animate-fade-up">
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 px-5 py-3.5">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700">
          <IconFilter className="text-brand-500" /> Filters
        </span>
        <div className="ml-1 flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onPreset(p.value)}
              className={
                'rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition ' +
                (preset === p.value
                  ? 'bg-gradient-brand text-white ring-transparent shadow-glow'
                  : 'bg-white text-ink-600 ring-ink-200 hover:border-brand-200 hover:text-brand-700')
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {extra}
          {active > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChange({ trainName: '', chairType: '', fromStation: '', toStation: '', dayNight: '' })}
            >
              <IconX className="text-[14px]" /> Clear
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="From date">
          <Input
            type="date"
            value={String(value.from || '')}
            onChange={(e) => {
              onPreset('custom');
              onChange({ from: e.target.value });
            }}
          />
        </Field>
        <Field label="To date">
          <Input
            type="date"
            value={String(value.to || '')}
            onChange={(e) => {
              onPreset('custom');
              onChange({ to: e.target.value });
            }}
          />
        </Field>
        <Field label="Train">
          <Combobox
            value={String(value.trainName || '')}
            onChange={(v) => onChange({ trainName: v })}
            options={toOptions(facets?.trainNames, (v) => v)}
            placeholder="All trains"
            emptyOption="All trains"
            icon={<IconTrain />}
          />
        </Field>
        <Field label="Chair class">
          <Combobox
            value={String(value.chairType || '')}
            onChange={(v) => onChange({ chairType: v })}
            options={toOptions(facets?.chairTypes, chairClassLabel)}
            placeholder="All classes"
            emptyOption="All classes"
            icon={<IconFilter />}
          />
        </Field>
        <Field label="Origin station">
          <Combobox
            value={String(value.fromStation || '')}
            onChange={(v) => onChange({ fromStation: v })}
            options={toOptions(facets?.fromStations)}
            placeholder="Any origin"
            emptyOption="Any origin"
            icon={<IconRoute />}
          />
        </Field>
        <Field label="Destination station">
          <Combobox
            value={String(value.toStation || '')}
            onChange={(v) => onChange({ toStation: v })}
            options={toOptions(facets?.toStations)}
            placeholder="Any destination"
            emptyOption="Any destination"
            icon={<IconRoute />}
          />
        </Field>
        <Field label="Day / Night">
          <div className="flex gap-2">
            {['', 'DAY', 'NIGHT'].map((v) => (
              <button
                key={v || 'all'}
                type="button"
                onClick={() => onChange({ dayNight: v })}
                className={
                  'flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold ring-1 ring-inset transition ' +
                  ((value.dayNight || '') === v
                    ? 'bg-gradient-brand text-white ring-transparent shadow-glow'
                    : 'bg-white text-ink-600 ring-ink-200 hover:text-brand-700')
                }
              >
                {v === '' ? 'All' : v === 'DAY' ? 'Day' : 'Night'}
              </button>
            ))}
          </div>
        </Field>
        {showBudget && (
          <Field label="Monthly budget (৳)">
            <Input
              type="number"
              min={0}
              placeholder="e.g. 5000"
              value={budget}
              onChange={(e) => onBudget?.(e.target.value)}
              className="pl-9"
            />
          </Field>
        )}
      </div>

      {facets?.dateRange && (
        <p className="border-t border-ink-100 px-5 py-2.5 text-xs text-ink-400">
          <IconCalendar className="mr-1 inline text-[13px]" />
          Available data: {facets.dateRange.min} → {facets.dateRange.max}
          {showBudget && <IconWallet className="ml-4 mr-1 inline text-[13px]" />}
          {showBudget && <span>Budget applies to the current month</span>}
        </p>
      )}
    </Card>
  );
}
