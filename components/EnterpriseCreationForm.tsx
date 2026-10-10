import React from 'react';
import AgencyCreationModal from './shared/AgencyCreationModal';
import { useAppContext } from '../context/AppContext';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';

import { useTranslation } from 'react-i18next';
interface EnterpriseCreationFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const EnterpriseCreationForm: React.FC<EnterpriseCreationFormProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { dispatch } = useAppContext();

  const handleAgencyCreated = (agencyId: string) => {
    onClose();
    dispatch({
      type: 'SHOW_ALERT',
      payload: {
        type: 'success',
        title: 'Congratulations!',
        message: t('agencies:ui.enterpriseCreationForm.yourAgencyHasBeenCreated', 'Your agency has been created successfully. You now have a dedicated agency page.'),
      },
    });
    navigate(paths.agencies());
  };


  return (
    <AgencyCreationModal
      isOpen={isOpen}
      onClose={onClose}
      onAgencyCreated={handleAgencyCreated}
    />
  );
};

export default EnterpriseCreationForm;
