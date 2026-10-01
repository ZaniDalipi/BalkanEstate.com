import React from 'react';
import AgencyCreationModal from './shared/AgencyCreationModal';
import { useAppContext } from '../context/AppContext';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';

interface EnterpriseCreationFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const EnterpriseCreationForm: React.FC<EnterpriseCreationFormProps> = ({ isOpen, onClose }) => {
  const { dispatch } = useAppContext();

  const handleAgencyCreated = (agencyId: string) => {
    onClose();
    dispatch({
      type: 'SHOW_ALERT',
      payload: {
        type: 'success',
        title: 'Congratulations!',
        message: 'Your agency has been created successfully. You now have a dedicated agency page.',
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
