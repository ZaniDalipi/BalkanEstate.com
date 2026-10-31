import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Building2, Clock, Gift, PauseCircle, Sparkles } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { cn } from '@/src/lib/utils';
import type { ResidenceAccessState, ResidenceBilling } from '../../../types';
import { formatCharge } from '../../../utils/format';
import { BuyResidenceDialog } from './BuyResidenceDialog';
import { useBillingText } from './useBillingText';

interface ResidencePlanCardProps {
  developmentId: string;
  billing: ResidenceBilling;
  /** Only the owner pays; others see the plan and who to ask. */
  canBuy: boolean;
}

const STATE_STYLE: Record<ResidenceAccessState, { icon: React.ElementType; className: string }> = {
  none: { icon: Sparkles, className: 'bg-slate-100 text-slate-700' },
  trial: { icon: Clock, className: 'bg-amber-50 text-amber-800' },
  active: { icon: BadgeCheck, className: 'bg-emerald-50 text-emerald-800' },
  included: { icon: Gift, className: 'bg-sky-50 text-sky-800' },
  agency: { icon: Building2, className: 'bg-teal-50 text-teal-800' },
  expired: { icon: PauseCircle, className: 'bg-red-50 text-red-800' },
};

/** The residence's plan on the overview: state, countdown, buildings used and "Buy Residence Pass". */
export const ResidencePlanCard: React.FC<ResidencePlanCardProps> = ({ developmentId, billing, canBuy }) => {
  const { t } = useTranslation('developments');
  const { stateLabel, stateHint } = useBillingText();
  const [buying, setBuying] = useState(false);
  const { icon: Icon, className } = STATE_STYLE[billing.state];
  const { used, limit } = billing.buildings;
  const renew = billing.state === 'active';

  return (
    <section aria-labelledby="plan-heading" className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="plan-heading" className="text-base font-semibold text-slate-900">
            {t('billing.heading', 'Plan')}
          </h2>
          <p className={cn('mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium', className)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
            {stateLabel(billing)}
          </p>
          <p className="mt-2 text-sm text-slate-600">{stateHint(billing)}</p>
        </div>
        {canBuy && billing.state !== 'included' && billing.state !== 'agency' && (
          <Button className="min-h-[44px]" onClick={() => setBuying(true)} variant={billing.state === 'expired' ? 'default' : 'outline'}>
            {renew ? t('billing.renew', 'Renew pass') : t('billing.buyPass', 'Buy Residence Pass')}
            <span className="ml-1.5 text-xs opacity-80">{formatCharge(billing.prices.pass.unitPrice)}</span>
          </Button>
        )}
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">{t('billing.buildingsUsed', 'Buildings')}</span>
          <span className="font-medium text-slate-900">{t('billing.usedOf', { used, limit, defaultValue: '{{used}} of {{limit}}' })}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" role="presentation">
          <div className={cn('h-full rounded-full', used >= limit ? 'bg-amber-500' : 'bg-primary')} style={{ width: `${Math.min(100, (used / Math.max(1, limit)) * 100)}%` }} />
        </div>
      </div>
      {!canBuy && billing.state !== 'included' && billing.state !== 'active' && billing.state !== 'agency' && (
        <p className="mt-3 text-sm text-slate-500">{t('billing.askOwner', 'Only the residence owner can buy a pass.')}</p>
      )}
      {buying && <BuyResidenceDialog developmentId={developmentId} kind="pass" billing={billing} onClose={() => setBuying(false)} />}
    </section>
  );
};
