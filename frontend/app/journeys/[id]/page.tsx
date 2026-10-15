'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, Journey } from '@/lib/api';
import { chairClassLabel, toDateTimeLocal } from '@/lib/utils';
import {
  Card, CardHeader, Button, Input, Select, Field, Badge, PageHeader, Skeleton, ConfirmDialog,
} from '@/components/ui';
import { JourneyDetailGrid, JourneyPreviewModal } from '@/components/JourneyPreview';
import {
  IconTrain, IconArrowRight, IconCheck, IconTrash, IconPencil, IconSun, IconMoon,
  IconX, IconEye,
} from '@/components/icons';

const CHAIR_TYPES = ['AC_B', 'AC_S', 'SNIGDHA', 'F_BERTH', 'F_SEAT', 'SHOVAN', 'SHOVAN_CHAIR', 'LUXURY', 'OTHER'];

export default function JourneyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [journey, setJourney] = useState<Journey | null>(null);
  const [form, setForm] = useState<any>({});
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.getJourney(id).then((j) => { setJourney(j); setForm(j); }).catch(() => {});
  }, [id]);

  // Opened from the list's edit action: /journeys/:id?edit=1
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('edit') === '1') setMode('edit');
  }, []);

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  const startEdit = () => { setForm(journey); setError(''); setMode('edit'); };

  const cancelEdit = () => { setForm(journey); setError(''); setMode('view'); };

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      const updated = await api.updateJourney(id, form as any);
      setJourney(updated);
      setForm(updated);
      setMode('view');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    setDeleting(true);
    try {
      await api.deleteJourney(id);
      router.push('/journeys');
    } finally {
      setDeleting(false);
    }
  };

  if (!journey) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const editing = mode === 'edit';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={editing ? 'Journey · Editing' : 'Journey'}
        title={journey.trainName}
        subtitle={`${journey.fromStation} → ${journey.toStation}`}
        actions={
          <>
            {saved && <Badge tone="emerald"><IconCheck className="text-[12px]" /> Saved</Badge>}
            <Button variant="secondary" onClick={() => router.push('/journeys')}>Back to list</Button>
            {editing ? (
              <Button variant="secondary" onClick={cancelEdit}><IconX /> Cancel edit</Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setPreviewOpen(true)}><IconEye /> Preview</Button>
                <Button onClick={startEdit}><IconPencil /> Edit</Button>
                <Button variant="danger" onClick={() => setConfirmOpen(true)}><IconTrash /> Delete</Button>
              </>
            )}
          </>
        }
      />

      {/* Ticket */}
      <div className="overflow-hidden rounded-3xl border border-ink-200/70 bg-white shadow-card animate-fade-up">
        <div className="relative overflow-hidden bg-gradient-brand p-6 sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-white/20 blur-3xl" />
          <IconTrain className="pointer-events-none absolute -bottom-8 right-4 text-[120px] text-white/10" />
          <div className="relative flex flex-wrap items-center gap-2">
            <Badge className="bg-white/20 text-white ring-white/25" tone="brand">{journey.source}</Badge>
            <Badge className="bg-white/20 text-white ring-white/25" tone="brand">
              {journey.dayNight === 'DAY' ? <IconSun className="text-[12px]" /> : <IconMoon className="text-[12px]" />}
              {journey.dayNight}
            </Badge>
            {journey.trainNumber && <Badge className="bg-white/20 text-white ring-white/25" tone="brand">#{journey.trainNumber}</Badge>}
            <span className="ml-auto hidden text-xs font-medium text-white/70 sm:block">
              {editing ? 'Editing' : 'View only'}
            </span>
          </div>

          <div className="relative mt-5 flex items-center gap-4 text-white">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-white/70">From</p>
              <p className="truncate text-xl font-bold sm:text-2xl">{journey.fromStation}</p>
            </div>
            <div className="flex flex-1 items-center gap-2 px-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
              <span className="h-px flex-1 bg-white/40" />
              <IconArrowRight className="text-[20px] text-white/90" />
              <span className="h-px flex-1 bg-white/40" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
            </div>
            <div className="min-w-0 text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-white/70">To</p>
              <p className="truncate text-xl font-bold sm:text-2xl">{journey.toStation}</p>
            </div>
          </div>
        </div>

        <JourneyDetailGrid journey={journey} />

        {!editing && (
          <div className="flex flex-wrap items-center gap-3 border-t border-ink-100 px-5 py-4">
            <Button onClick={startEdit}><IconPencil /> Edit journey</Button>
            <Button variant="secondary" onClick={() => setPreviewOpen(true)}><IconEye /> Preview</Button>
          </div>
        )}
      </div>

      {/* Edit form — only in edit mode */}
      {editing && (
        <Card className="animate-fade-up">
          <CardHeader
            title="Edit journey"
            subtitle="Update any detail and save your changes"
            icon={<IconPencil />}
            action={<Badge tone="brand">Editing</Badge>}
          />
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Train name"><Input value={form.trainName || ''} onChange={(e) => set('trainName', e.target.value)} /></Field>
            <Field label="Train number"><Input value={form.trainNumber || ''} onChange={(e) => set('trainNumber', e.target.value)} /></Field>
            <Field label="Chair class">
              <Select value={form.chairType || ''} onChange={(e) => set('chairType', e.target.value)}>
                {CHAIR_TYPES.map((c) => <option key={c} value={c}>{chairClassLabel(c)}</option>)}
              </Select>
            </Field>
            <Field label="From station"><Input value={form.fromStation || ''} onChange={(e) => set('fromStation', e.target.value)} /></Field>
            <Field label="To station"><Input value={form.toStation || ''} onChange={(e) => set('toStation', e.target.value)} /></Field>
            <Field label="Journey date"><Input type="date" value={(form.journeyDate || '').slice(0, 10)} onChange={(e) => set('journeyDate', e.target.value)} /></Field>
            <Field label="Journey time"><Input type="time" value={form.departureTime || ''} onChange={(e) => set('departureTime', e.target.value)} /></Field>
            <Field label="Issue date & time"><Input type="datetime-local" value={toDateTimeLocal(form.issuedAt)} onChange={(e) => set('issuedAt', e.target.value)} /></Field>
            <Field label="Coach / seat"><Input value={form.coachNo || ''} onChange={(e) => set('coachNo', e.target.value)} /></Field>
            <Field label="Fare (BDT)"><Input type="number" value={form.fare ?? 0} onChange={(e) => set('fare', parseFloat(e.target.value) || 0)} /></Field>
            <Field label="Passenger"><Input value={form.passengerName || ''} onChange={(e) => set('passengerName', e.target.value)} /></Field>
            <Field label="PNR / ticket"><Input value={form.ticketNo || ''} onChange={(e) => set('ticketNo', e.target.value)} /></Field>
            <Field label="Boarding point"><Input value={form.boardingPoint || ''} onChange={(e) => set('boardingPoint', e.target.value)} /></Field>
            <Field label="Notes" className="sm:col-span-2 lg:col-span-2"><Input value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></Field>
          </div>
          {error && (
            <div className="mx-5 mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <IconX className="text-[16px]" /> {error}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-ink-100 px-5 py-4">
            <Button onClick={save} disabled={saving}><IconCheck /> {saving ? 'Saving…' : 'Save changes'}</Button>
            <Button variant="ghost" onClick={cancelEdit} disabled={saving}>Cancel</Button>
            <Button variant="ghost" onClick={() => setForm(journey)} disabled={saving}>Reset</Button>
          </div>
        </Card>
      )}

      <JourneyPreviewModal
        journey={journey}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onViewFull={() => setMode('view')}
        onEdit={startEdit}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this journey?"
        description="This journey will be permanently removed from your history. This action cannot be undone."
        confirmLabel="Delete journey"
        loading={deleting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={del}
      >
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-3 text-sm">
          <span className="min-w-0 truncate font-semibold text-ink-800">{journey.trainName}</span>
          <span className="shrink-0 text-xs text-ink-500">{journey.fromStation} → {journey.toStation}</span>
        </div>
      </ConfirmDialog>
    </div>
  );
}
