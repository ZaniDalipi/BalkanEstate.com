import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useBusinessListing } from '../hooks';
import { BusinessProfile } from './detail/BusinessProfile';
import { BusinessDetailSkeleton, BusinessNotFound } from './detail/BusinessDetailStates';

const EditBusinessListingForm = lazy(() => import('./EditBusinessListingForm'));

interface BusinessDetailPageProps {
  listingId: string;
  onBack: () => void;
}

/** A business's public profile — or, for its owner, the way into editing it. */
const BusinessDetailPage: React.FC<BusinessDetailPageProps> = ({ listingId, onBack }) => {
  const { listing, isLoading, error } = useBusinessListing(listingId);
  const { state } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const userId = state.currentUser?.id;
  const isOwner = !!(userId && listing?.owner?.id && userId === listing.owner.id);

  // Each profile opens at its top, whichever business was showing before.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    document.getElementById('main-content')?.scrollTo?.({ top: 0 });
  }, [listingId]);

  if (isLoading) return <BusinessDetailSkeleton />;
  if (error || !listing) return <BusinessNotFound onBack={onBack} />;

  if (isEditing && isOwner) {
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-neutral-400" aria-hidden="true" /></div>}>
        <EditBusinessListingForm
          listing={listing}
          onBack={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </Suspense>
    );
  }

  return <BusinessProfile listing={listing} isOwner={isOwner} onBack={onBack} onEdit={() => setIsEditing(true)} />;
};

export default BusinessDetailPage;
