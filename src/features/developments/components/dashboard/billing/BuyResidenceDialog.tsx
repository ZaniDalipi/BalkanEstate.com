import React from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import Modal from '@/src/shared/components/ui/Modal';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/shared/components/ui/Input';
import { useNotification } from '@/src/shared/hooks/useNotification';
import type { ResidenceBilling, ResidencePurchaseKind } from '../../../types';
import { MAX_EXTRA_BUILDINGS } from '../../../validation/billingValidation';
import { PurchaseSummary } from './PurchaseSummary';
import { useCheckout } from './useCheckout';

interface BuyResidenceDialogProps {
  developmentId: string;
  kind: ResidencePurchaseKind;
  billing: ResidenceBilling;
  onClose: () => void;
}

/**
 * Buy a Residence Pass or extra buildings. While online payment is off, an
 * unlock code completes the purchase; the dialog says so plainly.
 */
export const BuyResidenceDialog: React.FC<BuyResidenceDialogProps> = ({ developmentId, kind, billing, onClose }) => {
  const { t } = useTranslation('developments');
  const notify = useNotification();
  const form = useCheckout(developmentId, kind, () => {
    void notify.success(
      kind === 'pass' ? t('billing.done.pass', 'Residence Pass active') : t('billing.done.extra', 'Buildings unlocked'),
      kind === 'pass'
        ? t('billing.done.passMessage', 'Your residence is public again.')
        : t('billing.done.extraMessage', 'You can add more buildings now.')
    );
    onClose();
  });
  const title = kind === 'pass' ? t('billing.buyPass', 'Buy Residence Pass') : t('billing.unlockBuildings', 'Unlock more buildings');

  return (
    <Modal isOpen onClose={onClose} title={title} size="md">
      <form onSubmit={form.submit} noValidate className="space-y-4">
        {kind === 'extra_building' && (
          <Input
            type="number"
            min={1}
            max={MAX_EXTRA_BUILDINGS}
            label={t('billing.quantity.label', 'Buildings to add')}
            value={String(form.quantity)}
            onChange={(e) => form.setQuantity(Math.floor(Number(e.target.value)) || 0)}
          />
        )}
        <PurchaseSummary kind={kind} quantity={form.quantity > 0 ? form.quantity : 1} billing={billing} />
        {!billing.paymentsEnabled && (
          <p className="flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t('billing.paymentsSoon', 'Online payment is coming soon. If you have an unlock code from us, enter it below.')}
          </p>
        )}
        <Input
          label={t('billing.code.label', 'Unlock code')}
          value={form.code}
          onChange={(e) => form.setCode(e.target.value)}
          error={form.codeError ?? undefined}
          autoComplete="off"
          autoCapitalize="characters"
        />
        {form.formError && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {form.formError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('wizard.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={form.isLoading}>
            {form.isLoading ? t('billing.working', 'Unlocking…') : t('billing.unlock', 'Unlock')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
