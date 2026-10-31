import { useTranslation } from 'react-i18next';
import { Car, DoorClosed, DoorOpen, Package, type LucideIcon } from 'lucide-react';
import type { EntranceKind } from '../../types';

/** One look per kind of entrance, the same on the dashboard and for buyers. */
export const ENTRANCE_KIND_STYLE: Record<EntranceKind, { icon: LucideIcon; tone: string; solid: string }> = {
  main: { icon: DoorOpen, tone: 'bg-teal-50 text-teal-800 ring-teal-200', solid: 'bg-teal-700 text-white' },
  side: { icon: DoorClosed, tone: 'bg-sky-50 text-sky-800 ring-sky-200', solid: 'bg-sky-700 text-white' },
  garage: { icon: Car, tone: 'bg-slate-100 text-slate-800 ring-slate-300', solid: 'bg-slate-700 text-white' },
  service: { icon: Package, tone: 'bg-amber-50 text-amber-900 ring-amber-200', solid: 'bg-amber-700 text-white' },
};

const KIND_DEFAULTS: Record<EntranceKind, string> = {
  main: 'Main entrance',
  side: 'Side entrance',
  garage: 'Car park entrance',
  service: 'Service entrance',
};

/** "Main entrance", "Car park entrance", … in the reader's language. */
export function useEntranceKindLabel() {
  const { t } = useTranslation('developments');
  return (kind: EntranceKind | undefined): string => t(`entrance.kind.${kind ?? 'main'}`, KIND_DEFAULTS[kind ?? 'main']);
}
