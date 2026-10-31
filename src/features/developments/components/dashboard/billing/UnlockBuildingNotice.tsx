import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import type { ResidenceBilling } from '../../../types';
import { formatCharge } from '../../../utils/format';
import { extrasNeedPass } from '../../../utils/residencePlanView';
import { BuyResidenceDialog } from './BuyResidenceDialog';

interface UnlockBuildingNoticeProps {
  developmentId: string;
  billing: ResidenceBilling;
  canBuy: boolean;
}

/**
 * Shown instead of "Add building" once the residence is at its limit: unlock
 * one more (on a pass or plan), or buy the pass first.
 */
export const UnlockBuildingNotice: React.FC<UnlockBuildingNoticeProps> = ({ developmentId, billing, canBuy }) => {
  const { t } = useTranslation('developments');
  const [buying, setBuying] = useState<'pass' | 'extra_building' | null>(null);
  const needPass = extrasNeedPass(billing);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        {needPass
          ? t('billing.limit.needPass', { limit: billing.buildings.limit, defaultValue: 'This residence has its {{limit}} buildings. More buildings are added to a Residence Pass.' })
          : t('billing.limit.reached', { limit: billing.buildings.limit, defaultValue: 'This residence has all {{limit}} of its buildings.' })}
      </p>
      {canBuy ? (
        <Button className="min-h-[44px]" onClick={() => setBuying(needPass ? 'pass' : 'extra_building')}>
          {needPass
            ? t('billing.buyPass', 'Buy Residence Pass')
            : t('billing.unlockOne', { price: formatCharge(billing.prices.extraBuilding.unitPrice), defaultValue: 'Unlock 1 more building · {{price}}' })}
        </Button>
      ) : (
        <span className="text-amber-800">{t('billing.askOwnerBuildings', 'Ask the residence owner to unlock more buildings.')}</span>
      )}
      {buying && <BuyResidenceDialog developmentId={developmentId} kind={buying} billing={billing} onClose={() => setBuying(null)} />}
    </div>
  );
};
