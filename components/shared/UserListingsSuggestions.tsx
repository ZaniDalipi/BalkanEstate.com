import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import { UserRole } from '../../types';

interface UserListingsSuggestionsProps {
  userId: string;
  userName: string;
  userRole: UserRole;
  agencyId?: string;
  agencyName?: string;
}

const UserListingsSuggestions: React.FC<UserListingsSuggestionsProps> = ({
  userId,
  userName,
  userRole,
  agencyId,
  agencyName,
}) => {
  const { t } = useTranslation(['property', 'account']);
  const { state } = useAppContext();

  // Get user's listings or agency listings
  const userListings = useMemo(() => {
    if (!state.properties?.length) return [];

    try {
      let filtered = state.properties.filter(p => {
        if (!p?.id) return false;
        if (p.status !== 'active') return false;

        // If agent with agency, show agency listings
        if (userRole === UserRole.AGENT && agencyId && p.seller?.agencyId === agencyId) {
          return true;
        }

        // If agent with agency (by name), show agency listings
        if (userRole === UserRole.AGENT && agencyName && p.seller?.agencyName === agencyName) {
          return true;
        }

        // Otherwise show only user's own listings
        if (p.seller?.id === userId || p.sellerId === userId) {
          return true;
        }

        return false;
      });

      return filtered.slice(0, 4); // Show up to 4 listings
    } catch (error) {
      console.error('UserListingsSuggestions: Error filtering listings', error);
      return [];
    }
  }, [state.properties, userId, userRole, agencyId, agencyName]);

  if (userListings.length === 0) {
    return (
      <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/30 text-center">
        <p className="text-neutral-600 text-sm">
          {userRole === UserRole.AGENT && agencyId
            ? t('account:suggestions.noAgencyListings', 'No active listings from your agency yet')
            : t('account:suggestions.noListings', 'No active listings yet. Start listing properties to see them here.')}
        </p>
      </div>
    );
  }

  const title =
    userRole === UserRole.AGENT && agencyId
      ? t('account:suggestions.agencyListings', 'Agency Listings')
      : t('account:suggestions.yourListings', 'Your Listings');

  return (
    <div>
      <h4 className="text-lg font-semibold text-neutral-700 mb-4">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {userListings.map(property => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </div>
  );
};

export default UserListingsSuggestions;
