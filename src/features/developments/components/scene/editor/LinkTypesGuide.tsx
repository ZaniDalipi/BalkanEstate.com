import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, DoorOpen, Home, Info, Layers, Tag } from 'lucide-react';
import type { HotspotLinkType } from '../../../types';
import { linkTypeHelp } from './linkTypeHelp';

const ITEMS: Array<{ type: HotspotLinkType; Icon: React.ComponentType<{ className?: string }> }> = [
  { type: 'building', Icon: Building2 },
  { type: 'floor', Icon: Layers },
  { type: 'unit', Icon: Home },
  { type: 'listing', Icon: Tag },
  { type: 'entrance', Icon: DoorOpen },
];

/**
 * "How the explorer fits together": residence picture → buildings → apartments,
 * and what each region link type does. Collapsed by default; owners open it
 * once to understand units vs. listings.
 */
export const LinkTypesGuide: React.FC = () => {
  const { t } = useTranslation('developments');
  return (
    <details className="group mb-4 rounded-2xl border border-teal-200 bg-teal-50/60 p-4 open:bg-teal-50">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 text-sm font-semibold text-teal-900">
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t('editor.guide.title', 'How it works: residence picture, buildings, units and listings')}
        <span className="ml-auto text-xs font-medium text-teal-700 group-open:hidden">{t('editor.guide.show', 'Show')}</span>
      </summary>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
        <li>{t('editor.guide.step1', 'Pick “Site plan (aerial)”, upload one picture of the whole residence and draw a region around each building → Links to: Building.')}</li>
        <li>{t('editor.guide.step2', 'Pick a building, add one or more pictures of it (front, back…) and draw a region over each apartment → Links to: Unit.')}</li>
        <li>{t('editor.guide.step3', 'Units are the apartments in your Inventory tab (number, floor, m², price, status). If an apartment is also advertised, attach its listing to the unit in Linked listings.')}</li>
        <li>{t('editor.guide.step4', 'Save draft, then Publish. Buyers hover a region to see its card and click to open it.')}</li>
      </ol>
      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        {ITEMS.map(({ type, Icon }) => (
          <div key={type} className="rounded-xl bg-white p-3 ring-1 ring-teal-100">
            <dt className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Icon className="h-4 w-4 text-teal-700" aria-hidden="true" />
              {t(`scene.linkTypes.${type}`, type)}
            </dt>
            <dd className="mt-1 text-xs leading-relaxed text-slate-600">{linkTypeHelp(t, type)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-slate-600">
        {t('editor.guide.demo', 'Want an example? Run “npm run seed:developments” in the backend: it creates “East Gate Living (Demo)” with every kind of region.')}
      </p>
    </details>
  );
};
