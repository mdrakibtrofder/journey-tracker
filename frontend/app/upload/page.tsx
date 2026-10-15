'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ParsedTicket } from '@/lib/api';
import {
  Card, CardHeader, Button, Input, Select, Label, PageHeader, Badge, cn,
} from '@/components/ui';
import {
  IconUpload, IconFile, IconCheck, IconX, IconSparkles,
  IconTrain, IconRoute, IconCalendar, IconWallet, IconTicket, IconSearch,
} from '@/components/icons';

const CHAIR_TYPES = ['AC_B', 'AC_S', 'SNIGDHA', 'F_BERTH', 'F_SEAT', 'SHOVAN', 'SHOVAN_CHAIR', 'LUXURY', 'OTHER'];

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedTicket | null>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const handleFile = async (file: File) => {
    setError('');
    setParsed(null);
    if (!file.type.includes('pdf')) {
      setError('Please upload a PDF file.');
      return;
    }
    setFileName(file.name);
    setParsing(true);
    try {
      const res = await api.uploadTicket(file);
      setParsed(res.parsed);
    } catch (e: any) {
      setError(e.message || 'Failed to parse ticket.');
    } finally {
      setParsing(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const set = (k: keyof ParsedTicket, v: any) => setParsed({ ...parsed!, [k]: v });

  const confirm = async () => {
    setConfirming(true);
    setError('');
    try {
      const j = await api.confirmTicket(parsed!);
      router.push(`/journeys/${j.id}`);
    } catch (e: any) {
      setError(e.message || 'Failed to save journey.');
    } finally {
      setConfirming(false);
    }
  };

  const canConfirm = parsed && parsed.trainName && parsed.fromStation && parsed.toStation;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Upload Ticket"
        subtitle="Drop a Bangladesh Railway e-ticket PDF and we'll extract the journey details automatically."
        actions={parsed ? <Button variant="secondary" onClick={() => { setParsed(null); setFileName(''); }}><IconX /> Start over</Button> : undefined}
      />

      {/* Dropzone */}
      {!parsed && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !parsing && inputRef.current?.click()}
          className={cn(
            'group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-300 sm:p-16 animate-fade-up',
            dragging
              ? 'border-brand-400 bg-brand-50/70 shadow-glow'
              : 'border-ink-200 bg-white/70 hover:border-brand-300 hover:bg-white hover:shadow-card',
          )}
        >
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(50%_60%_at_50%_100%,rgba(99,102,241,0.14),transparent)]" />
          <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-brand text-white shadow-glow">
            {parsing ? (
              <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />
            ) : (
              <IconUpload className="text-[34px] transition-transform duration-300 group-hover:-translate-y-0.5" />
            )}
          </div>
          <h3 className="relative mt-5 text-lg font-bold text-ink-900">
            {parsing ? 'Reading your ticket…' : dragging ? 'Drop it here' : 'Drag & drop your ticket PDF'}
          </h3>
          <p className="relative mt-1.5 text-sm text-ink-500">
            {parsing ? fileName : 'or click anywhere to browse your files'}
          </p>
          <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
            <Badge tone="brand"><IconFile className="text-[12px]" /> PDF only</Badge>
            <Badge tone="slate">Up to 10 MB</Badge>
            <Badge tone="emerald"><IconSparkles className="text-[12px]" /> Auto-extracts 10+ fields</Badge>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-700 animate-scale-in">
          <IconX className="mt-0.5 shrink-0 text-[18px]" />
          <span>{error}</span>
        </div>
      )}

      {/* Tips when nothing parsed */}
      {!parsed && !parsing && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: <IconUpload />, title: 'Drop the PDF', desc: 'Any BD Railway e-ticket PDF from your email or downloads.' },
            { icon: <IconSearch />, title: 'We extract the data', desc: 'Train, route, class, coach, fare, passenger and PNR.' },
            { icon: <IconCheck />, title: 'Review & save', desc: 'Confirm the details — edit anything before it is stored.' },
          ].map((s, i) => (
            <Card key={s.title} className="p-5 animate-fade-up" >
              <div style={{ animationDelay: `${i * 70}ms` }}>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand-soft text-brand-600 text-[19px] ring-1 ring-inset ring-brand-100">
                  {s.icon}
                </span>
                <p className="mt-3 text-sm font-semibold text-ink-900">{s.title}</p>
                <p className="mt-1 text-sm text-ink-500">{s.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Preview */}
      {parsed && (
        <Card className="animate-scale-in">
          <CardHeader
            title="Review & confirm"
            subtitle="Verify the extracted details — edit any field before saving."
            icon={<IconFile />}
            action={
              <div className="hidden items-center gap-2 sm:flex">
                <Badge tone="emerald"><IconCheck className="text-[12px]" /> Parsed</Badge>
                {fileName && <span className="max-w-[180px] truncate text-xs text-ink-400">{fileName}</span>}
              </div>
            }
          />

          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Label>Train name *</Label>
              <div className="relative">
                <IconTrain className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                <Input className="pl-10" value={parsed.trainName || ''} onChange={(e) => set('trainName', e.target.value)} placeholder="e.g. EKOTA EXPRESS" />
              </div>
            </div>
            <div><Label>Train number</Label><Input value={parsed.trainNumber || ''} onChange={(e) => set('trainNumber', e.target.value)} placeholder="705" /></div>

            <div>
              <Label>From station *</Label>
              <div className="relative">
                <IconRoute className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                <Input className="pl-10" value={parsed.fromStation || ''} onChange={(e) => set('fromStation', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>To station *</Label>
              <div className="relative">
                <IconRoute className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                <Input className="pl-10" value={parsed.toStation || ''} onChange={(e) => set('toStation', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Journey date *</Label>
              <div className="relative">
                <IconCalendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                <Input className="pl-10" type="date" value={parsed.journeyDate || ''} onChange={(e) => set('journeyDate', e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Chair class</Label>
              <Select value={parsed.chairType || 'OTHER'} onChange={(e) => set('chairType', e.target.value)}>
                {CHAIR_TYPES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </Select>
            </div>
            <div><Label>Departure time *</Label><Input type="time" value={parsed.departureTime || ''} onChange={(e) => set('departureTime', e.target.value)} /></div>
            <div><Label>Arrival time</Label><Input type="time" value={parsed.arrivalTime || ''} onChange={(e) => set('arrivalTime', e.target.value)} /></div>

            <div><Label>Coach / seat</Label><Input value={parsed.coachNo || ''} onChange={(e) => set('coachNo', e.target.value)} placeholder="JA-52" /></div>
            <div>
              <Label>Fare (BDT)</Label>
              <div className="relative">
                <IconWallet className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                <Input className="pl-10" type="number" value={parsed.fare ?? 0} onChange={(e) => set('fare', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div>
              <Label>PNR / ticket no</Label>
              <div className="relative">
                <IconTicket className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-400" />
                <Input className="pl-10" value={parsed.ticketNo || ''} onChange={(e) => set('ticketNo', e.target.value)} />
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-3"><Label>Passenger name</Label><Input value={parsed.passengerName || ''} onChange={(e) => set('passengerName', e.target.value)} /></div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-ink-100 px-5 py-4">
            <Button onClick={confirm} disabled={confirming || !canConfirm} size="lg">
              <IconCheck /> {confirming ? 'Saving…' : 'Confirm & save journey'}
            </Button>
            <Button variant="ghost" onClick={() => { setParsed(null); setFileName(''); }}>Cancel</Button>
            {!canConfirm && <span className="text-xs text-ink-400">Train name and both stations are required.</span>}
          </div>
        </Card>
      )}
    </div>
  );
}
