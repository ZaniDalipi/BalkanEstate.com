import React, { useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { useBusinessListings } from '@/src/features/business-directory/hooks/useBusinessListings';
import FeaturedProfessionalsRail from '@/src/features/business-directory/components/FeaturedProfessionalsRail';
import { MAX_LANYARDS } from '@/src/features/business-directory/utils/lanyardMembers';

/**
 * Featured professionals on the home page, right after the business
 * directory row: the same lanyard badge rail as the directory. Hidden when
 * there are none or they can't be loaded (the businesses row above already
 * offers the way into the directory).
 */
const HomeProfessionalsSection: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { listings, isLoading, error } = useBusinessListings({ listingType: 'individual', limit: MAX_LANYARDS });

  const listYourself = useCallback(() => {
    if (!state.currentUser) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
      return;
    }
    navigate(paths.businessListingNew());
  }, [state.currentUser, dispatch]);

  if (isLoading) return <div className="mx-auto mb-12 h-[26rem] max-w-6xl animate-pulse rounded-[28px] bg-slate-100 px-4" aria-busy="true" />;
  if (error || listings.length === 0) return null;

  return (
    <section className="bg-slate-50 px-4 pb-12">
      <FeaturedProfessionalsRail listings={listings} onListYourself={listYourself} className="mx-auto max-w-6xl" />
    </section>
  );
};

export default HomeProfessionalsSection;
