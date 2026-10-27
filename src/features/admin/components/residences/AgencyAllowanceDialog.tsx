import React from 'react';
import Modal from '@/src/shared/components/ui/Modal';
import { useTranslation } from 'react-i18next';
import { AgencyAllowanceCard } from './AgencyAllowanceCard';

/** The agency's free residences, opened from a residence row. */
export const AgencyAllowanceDialog: React.FC<{ agencyId: string; agencyName: string; onClose: () => void }> = ({ agencyId, agencyName, onClose }) => {
  const { t } = useTranslation(['admin']);
  return (
    <Modal isOpen onClose={onClose} title={t('admin:residences.allowance.modalTitle', { name: agencyName, defaultValue: '{{name}} · free residences' })} size="md">
      <AgencyAllowanceCard agencyId={agencyId} />
    </Modal>
  );
};
