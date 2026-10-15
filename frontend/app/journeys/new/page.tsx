'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardHeader, Button, Input, Select, Field, PageHeader } from '@/components/ui';
import {
  IconTrain, IconRoute, IconCalendar, IconClock, IconWallet,
  IconTicket, IconCheck, IconX, IconPencil,
} from '@/components/icons';

const CHAIR_TYPES = ['AC_B', 'AC_S', 'SNIGDHA', 'F_BERTH', 'F_SEAT', 'SHOVAN', 'SHOVAN_CHAIR', 'LUXURY', 'OTHER'];

export default function NewJourneyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    trainName: '', trainNumber: '', fromStation: '', toStation: '',
    journeyDate: '', departureTime: '', arrivalTime: '', chairType: 'SHOVAN_CHAIR',
    coachNo: '', fare: 0, passengerName: '', ticketNo: '', notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const j = await api.createJourney({ ...form, source: 'MANUAL' } as any);
      router.push(`/journeys/${j.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Add Journey"
        subtitle="Enter a journey manually if you don't have the ticket PDF handy."
        actions={
          <Button variant="ghost" onClick={() => router.back()}>
            <IconX /> Cancel
          </Button>
        }
      />

      <form onSubmit={submit} className="space-y-6">
        <Card className="animate-fade-up">
          <CardHeader title="Journey details" subtitle="Where and when you travelled" icon={<IconTrain />} />
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <Field label="Train name *">
              <div className="relative">
                <IconTrain className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                <Input required className="pl-10" value={form.trainName} onChange={(e) => set('trainName', e.target.value)} placeholder="e.g. EKOTA EXPRESS" />
              </div>
            </Field>
            <Field label="Train number">
              <Input value={form.trainNumber} onChange={(e) => set('trainNumber', e.target.value)} placeholder="705" />
            </Field>

            <Field label="From station *">
              <div className="relative">
                <IconRoute className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                <Input required className="pl-10" value={form.fromStation} onChange={(e) => set('fromStation', e.target.value)} placeholder="e.g. Dhaka" />
              </div>
            </Field>
            <Field label="To station *">
              <div className="relative">
                <IconRoute className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                <Input required className="pl-10" value={form.toStation} onChange={(e) => set('toStation', e.target.value)} placeholder="e.g. Natore" />
              </div>
            </Field>

            <Field label="Journey date *">
              <div className="relative">
                <IconCalendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                <Input required className="pl-10" type="date" value={form.journeyDate} onChange={(e) => set('journeyDate', e.target.value)} />
              </div>
            </Field>
            <Field label="Chair class">
              <Select value={form.chairType} onChange={(e) => set('chairType', e.target.value)}>
                {CHAIR_TYPES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </Select>
            </Field>

            <Field label="Departure time *">
              <div className="relative">
                <IconClock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                <Input required className="pl-10" type="time" value={form.departureTime} onChange={(e) => set('departureTime', e.target.value)} />
              </div>
            </Field>
            <Field label="Arrival time">
              <div className="relative">
                <IconClock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                <Input className="pl-10" type="time" value={form.arrivalTime} onChange={(e) => set('arrivalTime', e.target.value)} />
              </div>
            </Field>
          </div>
        </Card>

        <Card className="animate-fade-up" >
          <CardHeader title="Ticket & passenger" subtitle="Booking details and cost" icon={<IconTicket />} />
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <Field label="Coach / seat">
              <Input value={form.coachNo} onChange={(e) => set('coachNo', e.target.value)} placeholder="JA-52" />
            </Field>
            <Field label="Fare (BDT)">
              <div className="relative">
                <IconWallet className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                <Input className="pl-10" type="number" value={form.fare} onChange={(e) => set('fare', parseFloat(e.target.value) || 0)} />
              </div>
            </Field>
            <Field label="Passenger name">
              <Input value={form.passengerName} onChange={(e) => set('passengerName', e.target.value)} />
            </Field>
            <Field label="Ticket / PNR no">
              <Input value={form.ticketNo} onChange={(e) => set('ticketNo', e.target.value)} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anything worth remembering about this trip" />
            </Field>
          </div>
        </Card>

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-700">
            <IconX className="shrink-0 text-[18px]" /> {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={saving}>
            <IconCheck /> {saving ? 'Saving…' : 'Save journey'}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
