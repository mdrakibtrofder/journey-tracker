'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ParsedTicket, BulkParseResult, DuplicateEntry, Journey } from '@/lib/api';
import {
  Card, Button, Input, Select, Label, PageHeader, Badge, Modal, cn,
} from '@/components/ui';
import { JourneyPreviewModal } from '@/components/JourneyPreview';
import {
  IconUpload, IconFile, IconCheck, IconX, IconSparkles, IconAlert,
  IconTrain, IconRoute, IconCalendar, IconWallet, IconTicket, IconSearch, IconTrash,
  IconEye,
} from '@/components/icons';

const CHAIR_TYPES = ['AC_B', 'AC_S', 'SNIGDHA', 'F_BERTH', 'F_SEAT', 'SHOVAN', 'SHOVAN_CHAIR', 'LUXURY', 'OTHER'];

type Status = 'parsing' | 'ready' | 'error';

interface QueueItem {
  id: string;
  fileName: string;
  status: Status;
  error?: string;
  parsed?: ParsedTicket;
  expanded: boolean;
}

let seq = 0;
const nextId = () => `t${Date.now()}-${seq++}`;

/**
 * Files are parsed in small batches rather than one giant request: a single
 * 50+ file upload is slow, gives no progress, and one hiccup loses the whole
 * batch. Batching keeps each request small and lets the rest succeed.
 */
const BATCH_SIZE = 10;

/** Required fields for a journey to be savable. */
function missingFields(p?: ParsedTicket): string[] {
  const missing: string[] = [];
  if (!p?.trainName) missing.push('train name');
  if (!p?.fromStation) missing.push('from station');
  if (!p?.toStation) missing.push('to station');
  if (!p?.journeyDate) missing.push('journey date');
  if (!p?.departureTime) missing.push('departure time');
  return missing;
}

const isPdf = (f: File) => f.type.includes('pdf') || /\.pdf$/i.test(f.name);

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [duplicates, setDuplicates] = useState<DuplicateEntry[]>([]);
  const [saveFailures, setSaveFailures] = useState<{ index: number; message: string }[]>([]);
  const [preview, setPreview] = useState<Journey | null>(null);

  const valid = items.filter((i) => i.status === 'ready' && missingFields(i.parsed).length === 0);
  const invalid = items.filter((i) => i.status === 'error' || (i.status === 'ready' && missingFields(i.parsed).length > 0));

  const addFiles = async (files: File[]) => {
    setError('');
    setNotice('');
    if (!files.length) return;
    if (parsing) {
      setNotice('Still reading the previous files — add more once that finishes.');
      return;
    }

    const pdfs = files.filter(isPdf);
    const rejected = files.length - pdfs.length;
    const notesByReason: string[] = [];
    if (rejected > 0) notesByReason.push(`${rejected} non-PDF file${rejected === 1 ? ' was' : 's were'} skipped.`);
    if (!pdfs.length) {
      setError('Please choose PDF files only.');
      return;
    }

    // A 50-ticket batch would mount hundreds of inputs at once; keep the queue
    // compact and let each card be opened on demand instead.
    const autoExpand = pdfs.length <= 3;
    const queued: QueueItem[] = pdfs.map((f) => ({
      id: nextId(),
      fileName: f.name,
      status: 'parsing',
      expanded: autoExpand,
    }));
    setItems((prev) => [...prev, ...queued]);
    setParsing(true);
    setProgress({ done: 0, total: pdfs.length });

    const batchErrors: string[] = [];

    try {
      for (let start = 0; start < pdfs.length; start += BATCH_SIZE) {
        const batch = pdfs.slice(start, start + BATCH_SIZE);
        const batchQueued = queued.slice(start, start + batch.length);

        let results: BulkParseResult[] = [];
        try {
          results = await api.uploadTickets(batch);
        } catch (e: any) {
          // One failed batch must not discard the others.
          const message = e?.message || 'Upload failed.';
          if (!batchErrors.includes(message)) batchErrors.push(message);
          const failedIds = new Set(batchQueued.map((q) => q.id));
          setItems((prev) =>
            prev.map((i) => (failedIds.has(i.id) ? { ...i, status: 'error' as Status, error: message } : i)),
          );
          setProgress((p) => (p ? { ...p, done: p.done + batch.length } : p));
          continue;
        }

        setItems((prev) =>
          prev.map((item) => {
            const idx = batchQueued.findIndex((q) => q.id === item.id);
            if (idx < 0) return item;
            const res = results[idx];
            if (res?.error || !res?.parsed) {
              return { ...item, status: 'error' as Status, error: res?.error || 'Could not read this ticket.' };
            }
            return { ...item, status: 'ready' as Status, parsed: res.parsed };
          }),
        );
        setProgress((p) => (p ? { ...p, done: p.done + batch.length } : p));
      }
    } finally {
      setParsing(false);
      setProgress(null);
    }

    if (batchErrors.length) {
      setError(
        `${batchErrors.length === 1 ? 'A batch failed' : `${batchErrors.length} batches failed`} — ${batchErrors.join(' · ')}`,
      );
    }
    if (notesByReason.length) setNotice(notesByReason.join(' '));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const setField = (id: string, key: keyof ParsedTicket, value: any) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, parsed: { ...i.parsed!, [key]: value } } : i)),
    );

  const toggleItem = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, expanded: !i.expanded } : i)));

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const reset = () => {
    setItems([]);
    setError('');
    setNotice('');
    closeSaveModal();
  };

  const closeSaveModal = () => {
    setDuplicates([]);
    setSaveFailures([]);
  };

  const saveAll = async () => {
    if (!valid.length) return;
    setSaving(true);
    setError('');
    setNotice('');
    closeSaveModal();
    try {
      const result = await api.confirmTickets(valid.map((i) => i.parsed!));
      const dupes = result.duplicates ?? [];
      const fails = result.failed ?? [];

      const dupByIndex = new Map(dupes.map((d) => [d.index, d]));
      const failedByIndex = new Map(fails.map((f) => [f.index, f]));
      const savedIds = new Set(
        valid.filter((_, i) => !dupByIndex.has(i) && !failedByIndex.has(i)).map((i) => i.id),
      );

      // Keep only the still-unsaved cards, flagged with why they were skipped.
      setItems((prev) =>
        prev
          .filter((i) => !savedIds.has(i.id))
          .map((i) => {
            const idx = valid.findIndex((v) => v.id === i.id);
            if (idx < 0) return i;
            const dup = dupByIndex.get(idx);
            if (dup) {
              return { ...i, status: 'error' as Status, error: `Ticket ${dup.ticketNo} already exists — skipped.` };
            }
            const f = failedByIndex.get(idx);
            if (f) return { ...i, status: 'error' as Status, error: f.message };
            return i;
          }),
      );

      // Only leave the page when every ready ticket was actually created.
      // Anything else opens the result modal so nothing fails silently.
      if (result.createdCount === valid.length) {
        router.push('/journeys');
        return;
      }
      setDuplicates(dupes);
      setSaveFailures(fails);
    } catch (e: any) {
      setError(e?.message || 'Failed to save journeys.');
    } finally {
      setSaving(false);
    }
  };

  const hasItems = items.length > 0;

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        eyebrow="Manage"
        title="Upload Tickets"
        subtitle="Drop as many Bangladesh Railway e-ticket PDFs as you like — we'll extract every journey at once."
        actions={
          hasItems ? (
            <Button variant="secondary" onClick={reset} disabled={saving}>
              <IconX /> Start over
            </Button>
          ) : undefined
        }
      />

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !parsing && inputRef.current?.click()}
        className={cn(
          'group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed text-center transition-all duration-300 animate-fade-up',
          hasItems ? 'p-6 sm:p-8' : 'p-10 sm:p-16',
          dragging
            ? 'border-brand-400 bg-brand-50/70 shadow-glow'
            : 'border-ink-200 bg-white/70 hover:border-brand-300 hover:bg-white hover:shadow-card',
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(50%_60%_at_50%_100%,rgba(99,102,241,0.14),transparent)]" />
        <div className={cn('relative mx-auto grid place-items-center rounded-3xl bg-gradient-brand text-white shadow-glow', hasItems ? 'h-12 w-12' : 'h-20 w-20')}>
          {parsing ? (
            <span className={cn('animate-spin rounded-full border-[3px] border-white/40 border-t-white', hasItems ? 'h-5 w-5' : 'h-7 w-7')} />
          ) : (
            <IconUpload className={cn('transition-transform duration-300 group-hover:-translate-y-0.5', hasItems ? 'text-[22px]' : 'text-[34px]')} />
          )}
        </div>
        <h3 className={cn('relative mt-4 font-bold text-ink-900', hasItems ? 'text-base' : 'mt-5 text-lg')}>
          {parsing ? 'Reading your tickets…' : dragging ? 'Drop them here' : hasItems ? 'Add more ticket PDFs' : 'Drag & drop your ticket PDFs'}
        </h3>
        <p className="relative mt-1.5 text-sm text-ink-500">
          {parsing
            ? `Extracting journey details${progress ? ` · ${progress.done} of ${progress.total}` : ''}`
            : 'Select several PDFs at once — or click anywhere to browse'}
        </p>
        {parsing && progress && (
          <div className="relative mx-auto mt-4 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-gradient-brand transition-all duration-300"
              style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
            />
          </div>
        )}
        {!hasItems && (
          <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
            <Badge tone="brand"><IconFile className="text-[12px]" /> PDF only</Badge>
            <Badge tone="slate">Up to 10 MB each</Badge>
            <Badge tone="emerald"><IconSparkles className="text-[12px]" /> 50+ tickets at once</Badge>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={onPick}
        />
      </div>

      {notice && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-800 animate-scale-in">
          <IconAlert className="mt-0.5 shrink-0 text-[18px]" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-700 animate-scale-in">
          <IconX className="mt-0.5 shrink-0 text-[18px]" />
          <span>{error}</span>
        </div>
      )}

      {/* Tips when empty */}
      {!hasItems && !parsing && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: <IconUpload />, title: 'Drop many PDFs', desc: 'Drag in 50+ tickets in one go — they upload in small batches.' },
            { icon: <IconSearch />, title: 'We extract the data', desc: 'Train, route, class, coach, fare, passenger and PNR.' },
            { icon: <IconCheck />, title: 'Review & save all', desc: 'Fix anything inline, then save every journey at once.' },
          ].map((s) => (
            <Card key={s.title} className="p-5 animate-fade-up">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand-soft text-brand-600 text-[19px] ring-1 ring-inset ring-brand-100">
                {s.icon}
              </span>
              <p className="mt-3 text-sm font-semibold text-ink-900">{s.title}</p>
              <p className="mt-1 text-sm text-ink-500">{s.desc}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Review queue */}
      {hasItems && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">Review queue</h2>
            <Badge tone="slate">{items.length} file{items.length === 1 ? '' : 's'}</Badge>
            {valid.length > 0 && <Badge tone="emerald"><IconCheck className="text-[12px]" /> {valid.length} ready</Badge>}
            {invalid.length > 0 && <Badge tone="rose"><IconAlert className="text-[12px]" /> {invalid.length} need attention</Badge>}
          </div>

          {items.map((item, idx) => {
            const missing = missingFields(item.parsed);
            const ready = item.status === 'ready' && missing.length === 0;
            return (
              <Card key={item.id} className="animate-scale-in overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 bg-ink-50/50 px-4 py-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-xs font-bold text-ink-500 ring-1 ring-inset ring-ink-200">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {item.parsed?.trainName || item.fileName}
                    </p>
                    <p className="truncate text-xs text-ink-400">{item.fileName}</p>
                  </div>
                  {item.status === 'parsing' && <Badge tone="slate">Parsing…</Badge>}
                  {item.status === 'error' && <Badge tone="rose"><IconAlert className="text-[12px]" /> Unreadable</Badge>}
                  {item.status === 'ready' && (ready
                    ? <Badge tone="emerald"><IconCheck className="text-[12px]" /> Ready</Badge>
                    : <Badge tone="amber"><IconAlert className="text-[12px]" /> Missing {missing.join(', ')}</Badge>)}
                  <div className="flex items-center gap-1">
                    {item.status !== 'parsing' && (
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
                      >
                        {item.expanded ? 'Hide' : 'Edit'}
                      </button>
                    )}
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={saving}
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-white hover:text-rose-600 disabled:pointer-events-none"
                      title="Remove"
                    >
                      <IconTrash className="text-[16px]" />
                    </button>
                  </div>
                </div>

                {item.status === 'parsing' && (
                  <div className="space-y-2 p-5">
                    <div className="shimmer-bar h-4 w-2/3 rounded" />
                    <div className="shimmer-bar h-4 w-1/2 rounded" />
                  </div>
                )}

                {item.status === 'error' && (
                  <p className="px-5 py-4 text-sm text-rose-600">{item.error}</p>
                )}

                {item.status === 'ready' && item.expanded && (
                  <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <Label>Train name *</Label>
                      <div className="relative">
                        <IconTrain className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                        <Input className="pl-10" value={item.parsed?.trainName || ''} onChange={(e) => setField(item.id, 'trainName', e.target.value)} placeholder="e.g. EKOTA EXPRESS" />
                      </div>
                    </div>
                    <div><Label>Train number</Label><Input value={item.parsed?.trainNumber || ''} onChange={(e) => setField(item.id, 'trainNumber', e.target.value)} placeholder="705" /></div>

                    <div>
                      <Label>From station *</Label>
                      <div className="relative">
                        <IconRoute className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                        <Input className="pl-10" value={item.parsed?.fromStation || ''} onChange={(e) => setField(item.id, 'fromStation', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label>To station *</Label>
                      <div className="relative">
                        <IconRoute className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                        <Input className="pl-10" value={item.parsed?.toStation || ''} onChange={(e) => setField(item.id, 'toStation', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label>Journey date *</Label>
                      <div className="relative">
                        <IconCalendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                        <Input className="pl-10" type="date" value={item.parsed?.journeyDate || ''} onChange={(e) => setField(item.id, 'journeyDate', e.target.value)} />
                      </div>
                    </div>

                    <div>
                      <Label>Chair class</Label>
                      <Select value={item.parsed?.chairType || 'OTHER'} onChange={(e) => setField(item.id, 'chairType', e.target.value)}>
                        {CHAIR_TYPES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                      </Select>
                    </div>
                    <div><Label>Departure time *</Label><Input type="time" value={item.parsed?.departureTime || ''} onChange={(e) => setField(item.id, 'departureTime', e.target.value)} /></div>
                    <div><Label>Arrival time</Label><Input type="time" value={item.parsed?.arrivalTime || ''} onChange={(e) => setField(item.id, 'arrivalTime', e.target.value)} /></div>

                    <div><Label>Coach / seat</Label><Input value={item.parsed?.coachNo || ''} onChange={(e) => setField(item.id, 'coachNo', e.target.value)} placeholder="JA-52" /></div>
                    <div>
                      <Label>Fare (BDT)</Label>
                      <div className="relative">
                        <IconWallet className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                        <Input className="pl-10" type="number" value={item.parsed?.fare ?? 0} onChange={(e) => setField(item.id, 'fare', parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                    <div>
                      <Label>PNR / ticket no</Label>
                      <div className="relative">
                        <IconTicket className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                        <Input className="pl-10" value={item.parsed?.ticketNo || ''} onChange={(e) => setField(item.id, 'ticketNo', e.target.value)} />
                      </div>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3"><Label>Passenger name</Label><Input value={item.parsed?.passengerName || ''} onChange={(e) => setField(item.id, 'passengerName', e.target.value)} /></div>
                  </div>
                )}

                {item.status === 'ready' && !item.expanded && (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-5 py-3.5 text-sm text-ink-600">
                    <span className="font-medium">
                      {item.parsed?.fromStation || '—'} <span className="text-ink-300">→</span> {item.parsed?.toStation || '—'}
                    </span>
                    <span className="text-ink-400">{item.parsed?.journeyDate || 'no date'} · {item.parsed?.departureTime || '--:--'}</span>
                    <span className="text-ink-400">{(item.parsed?.chairType || 'OTHER').replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-ink-800">৳ {Number(item.parsed?.fare || 0).toLocaleString('en-IN')}</span>
                    {item.parsed?.passengerName && <span className="text-ink-400">{item.parsed.passengerName}</span>}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Sticky action bar */}
      {hasItems && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200/70 bg-white/85 backdrop-blur px-4 py-3.5 shadow-card-hover sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-ink-600">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand-soft text-brand-600 ring-1 ring-inset ring-brand-100">
                <IconTicket />
              </span>
              <span>
                <strong className="text-ink-900">{valid.length}</strong> journey{valid.length === 1 ? '' : 's'} ready to save
                {invalid.length > 0 && <> · <span className="text-amber-600">{invalid.length} skipped (incomplete)</span></>}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Button variant="ghost" onClick={reset} disabled={saving}>Cancel</Button>
              <Button size="lg" onClick={saveAll} disabled={saving || parsing || valid.length === 0}>
                <IconCheck /> {saving ? 'Saving…' : `Save ${valid.length} journey${valid.length === 1 ? '' : 's'}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save outcome — duplicates and any failures, always surfaced here */}
      <Modal
        open={duplicates.length > 0 || saveFailures.length > 0}
        onClose={closeSaveModal}
        size="md"
        header={
          <div className="flex shrink-0 items-start gap-4 p-6 pr-14">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-[22px] text-white shadow-glow">
              <IconAlert />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-bold leading-tight text-ink-900">
                {duplicates.length > 0 && saveFailures.length > 0
                  ? `${duplicates.length} already saved · ${saveFailures.length} failed`
                  : duplicates.length > 0
                    ? duplicates.length === 1
                      ? 'This ticket already exists'
                      : `${duplicates.length} tickets already exist`
                    : `${saveFailures.length} journey${saveFailures.length === 1 ? '' : 's'} couldn't be saved`}
              </h3>
              <p className="mt-1.5 text-sm text-ink-500">
                {duplicates.length > 0
                  ? 'Tickets already in your list were skipped — open one to preview the saved journey.'
                  : 'Something went wrong while saving these tickets.'}
              </p>
            </div>
          </div>
        }
        footer={
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={closeSaveModal}>Close</Button>
            <Button onClick={() => router.push('/journeys')}>Go to journeys</Button>
          </div>
        }
      >
        {duplicates.length > 0 && (
          <>
            <p className="px-6 pb-2 pt-5 text-xs font-semibold uppercase tracking-wide text-ink-400">
              Already saved
            </p>
            <ul className="space-y-2 px-6 pb-5">
              {duplicates.map((d) => (
                <li
                  key={d.index}
                  className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900">Ticket {d.ticketNo}</p>
                    <p className="truncate text-xs text-ink-500">
                      {d.existing
                        ? `${d.existing.trainName} · ${d.existing.fromStation} → ${d.existing.toStation}`
                        : 'Already saved as a journey.'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => d.existing && setPreview(d.existing)}
                    disabled={!d.existing}
                  >
                    <IconEye /> Preview
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}

        {saveFailures.length > 0 && (
          <>
            <p className="px-6 pb-2 pt-5 text-xs font-semibold uppercase tracking-wide text-ink-400">
              Couldn't be saved
            </p>
            <ul className="space-y-2 px-6 pb-5">
              {saveFailures.map((f) => (
                <li key={f.index} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {f.message}
                </li>
              ))}
            </ul>
          </>
        )}

        {duplicates.length === 0 && saveFailures.length === 0 && (
          <p className="px-6 py-5 text-sm text-ink-500">
            Some journeys weren't saved. Please try again.
          </p>
        )}
      </Modal>

      <JourneyPreviewModal journey={preview} open={!!preview} onClose={() => setPreview(null)} />
    </div>
  );
}
