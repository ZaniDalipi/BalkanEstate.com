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

  if (userListings.length === 0) return null;

  const hasAgency = userRole === UserRole.AGENT && (agencyId || agencyName);

  const title = hasAgency
    ? t('account:suggestions.agencyListings', 'More from {{agency}}', { agency: agencyName || 'this agency' })
    : t('account:suggestions.sellerListings', 'More from {{name}}', { name: userName || 'this seller' });

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 mb-3 sm:mb-4">{title}</h2>
      <p className="text-sm text-neutral-500 mb-4">
        {hasAgency
          ? t('account:suggestions.agencySubtitle', 'Other active listings from {{agency}}', { agency: agencyName || 'this agency' })
          : t('account:suggestions.sellerSubtitle', 'Other active listings from this seller')}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {userListings.map(property => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </div>
  );
};

export default UserListingsSuggestions;
