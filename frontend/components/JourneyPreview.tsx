'use client';

import { useRouter } from 'next/navigation';
import { Journey } from '@/lib/api';
import {
  formatDate, formatFare, formatDuration, chairClassLabel,
} from '@/lib/utils';
import { Badge, Button, Modal, cn } from '@/components/ui';
import {
  IconTrain, IconRoute, IconCalendar, IconClock, IconWallet, IconTicket,
  IconArrowRight, IconSun, IconMoon, IconPencil, IconEye,
} from '@/components/icons';

/** Read-only detail grid, shared by the journey page and the preview modal. */
export function JourneyDetailGrid({ journey, className = '' }: { journey: Journey; className?: string }) {
  const details = [
    { label: 'Journey date', value: formatDate(journey.journeyDate), icon: <IconCalendar /> },
    { label: 'Departure', value: journey.departureTime, icon: <IconClock /> },
    { label: 'Arrival', value: journey.arrivalTime || '—', icon: <IconClock /> },
    { label: 'Duration', value: formatDuration(journey.durationMins), icon: <IconClock /> },
    { label: 'Chair class', value: chairClassLabel(journey.chairType), icon: <IconTicket /> },
    { label: 'Coach / seat', value: journey.coachNo || '—', icon: <IconTicket /> },
    { label: 'Fare', value: formatFare(Number(journey.fare)), icon: <IconWallet /> },
    { label: 'Passenger', value: journey.passengerName || '—', icon: <IconTicket /> },
    { label: 'PNR / ticket', value: journey.ticketNo || '—', icon: <IconTicket /> },
  ];

  return (
    <div className={cn('grid grid-cols-2 gap-x-4 gap-y-5 p-6 sm:grid-cols-3', className)}>
      {details.map((d) => (
        <div key={d.label} className="flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-brand-soft text-brand-600 text-[16px] ring-1 ring-inset ring-brand-100">
            {d.icon}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{d.label}</p>
            <p className="truncate text-sm font-semibold text-ink-800">{d.value}</p>
          </div>
        </div>
      ))}

      {journey.boardingPoint && (
        <div className="col-span-2 flex items-start gap-3 sm:col-span-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-brand-soft text-brand-600 text-[16px] ring-1 ring-inset ring-brand-100">
            <IconRoute />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Boarding point</p>
            <p className="truncate text-sm font-semibold text-ink-800">{journey.boardingPoint}</p>
          </div>
        </div>
      )}

      {journey.notes && (
        <div className="col-span-2 flex items-start gap-3 sm:col-span-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-brand-soft text-brand-600 text-[16px] ring-1 ring-inset ring-brand-100">
            <IconPencil />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Notes</p>
            <p className="text-sm font-semibold text-ink-800">{journey.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Read-only preview of a journey inside a modal. "View full details" opens the
 * journey page in view mode (or switches to it when already there).
 */
export function JourneyPreviewModal({
  journey,
  open,
  onClose,
  onViewFull,
  onEdit,
}: {
  journey: Journey | null;
  open: boolean;
  onClose: () => void;
  onViewFull?: () => void;
  onEdit?: () => void;
}) {
  const router = useRouter();

  if (!journey) return null;

  const viewFull = () => {
    onClose();
    if (onViewFull) onViewFull();
    else router.push(`/journeys/${journey.id}`);
  };

  const edit = () => {
    onClose();
    if (onEdit) onEdit();
    else router.push(`/journeys/${journey.id}?edit=1`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      closeClassName="text-white/70 hover:bg-white/20 hover:text-white"
      header={
        <div className="relative shrink-0 overflow-hidden bg-gradient-brand px-6 py-5 pr-14">
          <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
          <IconTrain className="pointer-events-none absolute -bottom-8 right-4 text-[110px] text-white/10" />
          <div className="relative flex flex-wrap items-center gap-2">
            <Badge className="bg-white/20 text-white ring-white/25" tone="brand">{journey.source}</Badge>
            <Badge className="bg-white/20 text-white ring-white/25" tone="brand">
              {journey.dayNight === 'DAY' ? <IconSun className="text-[12px]" /> : <IconMoon className="text-[12px]" />}
              {journey.dayNight}
            </Badge>
            {journey.trainNumber && <Badge className="bg-white/20 text-white ring-white/25" tone="brand">#{journey.trainNumber}</Badge>}
          </div>
          <p className="relative mt-3 text-lg font-bold text-white">{journey.trainName}</p>
          <div className="relative mt-1 flex items-center gap-2 text-sm font-medium text-white/90">
            <span className="truncate">{journey.fromStation}</span>
            <IconArrowRight className="shrink-0 text-[14px] text-white/70" />
            <span className="truncate">{journey.toStation}</span>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
            <Button variant="secondary" onClick={edit}><IconPencil /> Edit</Button>
            <Button onClick={viewFull}>
              <IconEye /> View full details
            </Button>
          </div>
        </div>
      }
    >
      <JourneyDetailGrid journey={journey} className="p-5" />
      <p className="px-5 pb-5 -mt-1 text-xs text-ink-400">
        Preview only — open the full journey page to see everything in view mode.
      </p>
    </Modal>
  );
}
