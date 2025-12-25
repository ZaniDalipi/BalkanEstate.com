import React from 'react';
import AgencyCreationModal from './shared/AgencyCreationModal';
import { useAppContext } from '../context/AppContext';

interface EnterpriseCreationFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const EnterpriseCreationForm: React.FC<EnterpriseCreationFormProps> = ({ isOpen, onClose }) => {
  const { dispatch } = useAppContext();

  const handleAgencyCreated = (agencyId: string) => {
    onClose();
    alert('Congratulations! Your agency has been created successfully. You now have a dedicated agency page.');
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });
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
