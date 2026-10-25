import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import type { DevelopmentStatus } from '../../../types';
import { useResidenceBilling } from '../../../hooks/useResidenceBilling';
import { planBanner } from '../../../utils/residencePlanView';
import { BuyResidenceDialog } from './BuyResidenceDialog';

interface PlanBannerProps {
  developmentId: string;
  status: DevelopmentStatus;
  canBuy: boolean;
}

/** Top-of-page notice in the last trial days, and while a published residence is offline. */
export const PlanBanner: React.FC<PlanBannerProps> = ({ developmentId, status, canBuy }) => {
  const { t } = useTranslation('developments');
  const { billing } = useResidenceBilling(developmentId);
  const [buying, setBuying] = useState(false);
  const kind = billing ? planBanner(billing, status) : null;
  if (!billing || !kind) return null;
  const offline = kind === 'offline';

  return (
    <div
      role={offline ? 'alert' : 'status'}
      className={`mb-4 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm ${offline ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}
    >
      {offline ? <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" /> : <Clock className="h-5 w-5 shrink-0" aria-hidden="true" />}
      <p className="min-w-0 flex-1">
        {offline
          ? t('billing.banner.offline', 'This residence is offline: its free trial ended. Buyers can’t see it until you buy a Residence Pass.')
          : t('billing.banner.endingSoon', { count: billing.daysLeft ?? 0, defaultValue: 'The free trial ends in {{count}} days. Buy a Residence Pass to keep this residence online.' })}
      </p>
      {canBuy && (
        <Button className="min-h-[44px]" onClick={() => setBuying(true)}>
          {t('billing.buyPass', 'Buy Residence Pass')}
        </Button>
      )}
      {buying && <BuyResidenceDialog developmentId={developmentId} kind="pass" billing={billing} onClose={() => setBuying(false)} />}
    </div>
  );
};
