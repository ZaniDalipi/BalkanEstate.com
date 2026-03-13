/**
 * RoleSelector Component Test Suite
 * Tests the subscription display logic in the RoleSelector component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoleSelector from '../features/seller/components/RoleSelector';
import { User, UserRole } from '@/types';

// Mock AppContext so RoleSelector can access dispatch without a full AppProvider
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({
    dispatch: vi.fn(),
    state: {},
  }),
}));

// Override the global i18n mock with translations that support interpolation
// so tests can assert on English text rather than raw translation keys
vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    'seller:roleSelector.title': 'Post Listing As',
    'seller:roleSelector.description': 'Choose which role to use when creating this listing. Each role has separate listing limits and subscriptions.',
    'seller:roleSelector.agent': 'Agent',
    'seller:roleSelector.privateSeller': 'Private Seller',
    'seller:roleSelector.badges.trial': 'Trial',
    'seller:roleSelector.badges.pro': 'Pro',
    'seller:roleSelector.badges.enterprise': 'Enterprise',
    'seller:roleSelector.badges.agencyOwner': 'Agency Owner',
    'seller:roleSelector.badges.agencyAgent': 'Agency Agent',
    'seller:roleSelector.badges.buyer': 'Buyer',
    'seller:roleSelector.badges.free': 'Free',
    'seller:roleSelector.badges.proRequired': 'Pro Required',
    'seller:roleSelector.listings': 'Listings',
    'seller:roleSelector.sharedLimit': 'Shared Limit: {{used}}/{{limit}} total listings',
    'seller:roleSelector.asRole': '({{count}} as {{role}})',
    'seller:roleSelector.limitReachedShared': 'Shared limit reached across both roles.',
    'seller:roleSelector.limitReachedUpgrade': 'Listing limit reached. Upgrade to Pro for 30 listings!',
    'seller:roleSelector.remainingListings': '{{count}} listing(s) remaining',
    'seller:roleSelector.availableListings': '{{count}} listing(s) available',
    'seller:roleSelector.shared': '(shared)',
    'seller:roleSelector.noSubscriptionData': 'No subscription data',
    'seller:roleSelector.proRequired.title': 'Pro Subscription Required',
    'seller:roleSelector.proRequired.description': 'To post listings as an agent, you need to subscribe to the Pro plan.',
    'seller:roleSelector.proRequired.button': 'Subscribe to Pro',
    'seller:roleSelector.becomeAgent.title': 'Want to post as an agent?',
    'seller:roleSelector.becomeAgent.description': 'Register as an agent from your Profile Settings.',
  };

  return {
    useTranslation: () => ({
      t: (key: string, optionsOrDefault?: string | Record<string, unknown>) => {
        let text = translations[key];
        if (!text) {
          // Key not found: use default value if string, otherwise return key
          if (typeof optionsOrDefault === 'string') return optionsOrDefault;
          return key;
        }
        // Handle interpolation: replace {{var}} with values from options
        if (optionsOrDefault && typeof optionsOrDefault === 'object') {
          Object.entries(optionsOrDefault).forEach(([k, v]) => {
            text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
          });
        }
        return text;
      },
      i18n: {
        language: 'en',
        changeLanguage: vi.fn(),
      },
    }),
    Trans: ({ children }: { children: React.ReactNode }) => children,
    initReactI18next: {
      type: '3rdParty',
      init: vi.fn(),
    },
  };
});

// Mock console.log to avoid cluttering test output
vi.spyOn(console, 'log').mockImplementation(() => {});

describe('RoleSelector Component', () => {
  const mockOnRoleSelect = vi.fn();

  describe('Subscription Display - New System', () => {
    it('should display Pro subscription with correct limits from new subscription object', () => {
      const user: User = {
        id: 'test-123',
        email: 'pro@test.com',
        name: 'Pro User',
        role: 'private_seller',
        availableRoles: ['private_seller', 'agent'],
        subscription: {
          tier: 'pro',
          status: 'active',
          listingsLimit: 20,
          activeListingsCount: 2,
          privateSellerCount: 1,
          agentCount: 1,
          promotionCoupons: {
            monthly: 3,
            available: 3,
            used: 0,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: 10,
          totalPaid: 0,
        }
      } as User;

      render(
        <RoleSelector
          currentUser={user}
          selectedRole={UserRole.PRIVATE_SELLER}
          onRoleSelect={mockOnRoleSelect}
        />
      );

      // Should show Pro badge (both role cards display it)
      const proBadges = screen.getAllByText('Pro');
      expect(proBadges.length).toBeGreaterThanOrEqual(1);

      // Should show shared limit with correct values: 2/20
      const sharedLimitElements = screen.getAllByText(/2\/20/);
      expect(sharedLimitElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should display Free subscription with 3 listings limit', () => {
      const user: User = {
        id: 'test-456',
        email: 'free@test.com',
        name: 'Free User',
        role: 'private_seller',
        availableRoles: ['private_seller'],
        subscription: {
          tier: 'free',
          status: 'active',
          listingsLimit: 3,
          activeListingsCount: 1,
          privateSellerCount: 1,
          agentCount: 0,
          promotionCoupons: {
            monthly: 0,
            available: 0,
            used: 0,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: 1,
          totalPaid: 0,
        }
      } as User;

      render(
        <RoleSelector
          currentUser={user}
          selectedRole={UserRole.PRIVATE_SELLER}
          onRoleSelect={mockOnRoleSelect}
        />
      );

      // Should show Free badge
      expect(screen.getByText('Free')).toBeInTheDocument();

      // Should show 1 / 3 listings (non-Pro path renders used / limit)
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('should show correct role-specific counts', () => {
      const user: User = {
        id: 'test-789',
        email: 'multi@test.com',
        name: 'Multi Role User',
        role: 'agent',
        availableRoles: ['private_seller', 'agent'],
        subscription: {
          tier: 'pro',
          status: 'active',
          listingsLimit: 20,
          activeListingsCount: 5,
          privateSellerCount: 2,
          agentCount: 3,
          promotionCoupons: {
            monthly: 3,
            available: 3,
            used: 0,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: 10,
          totalPaid: 0,
        }
      } as User;

      const { rerender } = render(
        <RoleSelector
          currentUser={user}
          selectedRole={UserRole.PRIVATE_SELLER}
          onRoleSelect={mockOnRoleSelect}
        />
      );

      // Private seller card should show role-specific count: (2 as private seller)
      const privateSellerCard = screen.getByText('Private Seller').closest('button');
      expect(privateSellerCard).toHaveTextContent('(2 as private seller)');

      // Re-render with agent selected
      rerender(
        <RoleSelector
          currentUser={user}
          selectedRole={UserRole.AGENT}
          onRoleSelect={mockOnRoleSelect}
        />
      );

      // Agent card should show role-specific count: (3 as agent)
      const agentCard = screen.getByText('Agent').closest('button');
      expect(agentCard).toHaveTextContent('(3 as agent)');
    });
  });

  describe('Subscription Display - Legacy Fallback', () => {
    it('should fall back to proSubscription when subscription object not present', () => {
      const user: User = {
        id: 'test-legacy',
        email: 'legacy@test.com',
        name: 'Legacy User',
        role: 'private_seller',
        availableRoles: ['private_seller'],
        proSubscription: {
          isActive: true,
          totalListingsLimit: 20,
          activeListingsCount: 3,
          privateSellerCount: 2,
          agentCount: 1,
          plan: 'pro_monthly',
          promotionCoupons: {
            monthly: 3,
            available: 3,
            used: 0,
          }
        }
      } as unknown as User;

      render(
        <RoleSelector
          currentUser={user}
          selectedRole={UserRole.PRIVATE_SELLER}
          onRoleSelect={mockOnRoleSelect}
        />
      );

      // Should show Pro subscription from legacy field
      // Legacy pro: isPro=true, shared limit shows 3/20
      expect(screen.getByText(/3\/20/)).toBeInTheDocument();
    });

    it('should fall back to free subscription when no subscription data', () => {
      const user: User = {
        id: 'test-free-fallback',
        email: 'freefallback@test.com',
        name: 'Free Fallback User',
        role: 'private_seller',
        availableRoles: ['private_seller'],
        freeSubscription: {
          listingsLimit: 3,
          activeListingsCount: 2,
        }
      } as User;

      render(
        <RoleSelector
          currentUser={user}
          selectedRole={UserRole.PRIVATE_SELLER}
          onRoleSelect={mockOnRoleSelect}
        />
      );

      // Should show free tier badge and limits
      expect(screen.getByText('Free')).toBeInTheDocument();
      // Non-Pro path renders used / limit directly
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });
  });

  describe('Listing Limit Warning', () => {
    it('should show warning when limit reached', () => {
      const user: User = {
        id: 'test-limit',
        email: 'limit@test.com',
        name: 'Limit User',
        role: 'private_seller',
        availableRoles: ['private_seller'],
        subscription: {
          tier: 'free',
          status: 'active',
          listingsLimit: 3,
          activeListingsCount: 3, // At limit
          privateSellerCount: 3,
          agentCount: 0,
          promotionCoupons: {
            monthly: 0,
            available: 0,
            used: 0,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: 1,
          totalPaid: 0,
        }
      } as User;

      render(
        <RoleSelector
          currentUser={user}
          selectedRole={UserRole.PRIVATE_SELLER}
          onRoleSelect={mockOnRoleSelect}
        />
      );

      // Should show "Listing limit reached" warning with upgrade message
      // The full text is: "Listing limit reached. Upgrade to Pro for 30 listings!"
      expect(screen.getByText(/listing limit reached/i, { selector: 'p' })).toBeInTheDocument();
      expect(screen.getByText(/upgrade to pro/i, { selector: 'p' })).toBeInTheDocument();
    });

    it('should show available listings count', () => {
      const user: User = {
        id: 'test-available',
        email: 'available@test.com',
        name: 'Available User',
        role: 'private_seller',
        availableRoles: ['private_seller'],
        subscription: {
          tier: 'free',
          status: 'active',
          listingsLimit: 3,
          activeListingsCount: 1,
          privateSellerCount: 1,
          agentCount: 0,
          promotionCoupons: {
            monthly: 0,
            available: 0,
            used: 0,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: 1,
          totalPaid: 0,
        }
      } as User;

      render(
        <RoleSelector
          currentUser={user}
          selectedRole={UserRole.PRIVATE_SELLER}
          onRoleSelect={mockOnRoleSelect}
        />
      );

      // 3 - 1 = 2 remaining (remaining <= 2 triggers the warning path)
      expect(screen.getByText(/2 listing\(s\) remaining/, { selector: 'p' })).toBeInTheDocument();
    });
  });

  describe('Agency Tiers', () => {
    it('should display Agency Owner badge', () => {
      const user: User = {
        id: 'test-agency-owner',
        email: 'owner@agency.com',
        name: 'Agency Owner',
        role: 'agent',
        availableRoles: ['agent'],
        subscription: {
          tier: 'agency_owner',
          status: 'active',
          listingsLimit: 0,
          activeListingsCount: 0,
          privateSellerCount: 0,
          agentCount: 0,
          promotionCoupons: {
            monthly: 10,
            available: 10,
            used: 0,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: 100,
          totalPaid: 0,
        },
        agencyName: 'Test Agency'
      } as User;

      render(
        <RoleSelector
          currentUser={user}
          selectedRole={UserRole.AGENT}
          onRoleSelect={mockOnRoleSelect}
        />
      );

      // Both cards render (agency_owner != agency_agent so hasPrivateSeller=true)
      // Both show Agency Owner badge
      const badges = screen.getAllByText('Agency Owner');
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });

    it('should display Agency Agent badge', () => {
      const user: User = {
        id: 'test-agency-agent',
        email: 'agent@agency.com',
        name: 'Agency Agent',
        role: 'agent',
        availableRoles: ['agent'],
        subscription: {
          tier: 'agency_agent',
          status: 'active',
          listingsLimit: 20,
          activeListingsCount: 5,
          privateSellerCount: 0,
          agentCount: 5,
          promotionCoupons: {
            monthly: 3,
            available: 3,
            used: 0,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: 10,
          totalPaid: 0,
        },
        agencyName: 'Test Agency'
      } as User;

      render(
        <RoleSelector
          currentUser={user}
          selectedRole={UserRole.AGENT}
          onRoleSelect={mockOnRoleSelect}
        />
      );

      // agency_agent tier hides private seller card, only agent card renders
      expect(screen.getByText('Agency Agent')).toBeInTheDocument();
    });
  });
});
