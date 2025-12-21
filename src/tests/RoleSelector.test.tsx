/**
 * RoleSelector Component Test Suite
 * Tests the subscription display logic in the RoleSelector component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoleSelector from '../components/SellerFlow/RoleSelector';
import { User, UserRole } from '../types';

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

      // Should show Pro badge
      expect(screen.getByText('Pro')).toBeInTheDocument();

      // Should show correct limits (20 for pro)
      expect(screen.getByText(/20/)).toBeInTheDocument();

      // Should show correct usage count
      expect(screen.getByText(/2/)).toBeInTheDocument();
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

      // Should show 3 listings limit
      expect(screen.getByText(/3/)).toBeInTheDocument();

      // Should show 1 listing used
      expect(screen.getByText(/1/)).toBeInTheDocument();
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
          activeListingsCount: 5, // Total across both roles
          privateSellerCount: 2, // As private seller
          agentCount: 3, // As agent
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

      // Private seller should show 2 used (privateSellerCount)
      const privateSellerCard = screen.getByText('Private Seller').closest('button');
      expect(privateSellerCard).toHaveTextContent('2');

      // Re-render with agent selected
      rerender(
        <RoleSelector
          currentUser={user}
          selectedRole={UserRole.AGENT}
          onRoleSelect={mockOnRoleSelect}
        />
      );

      // Agent should show 3 used (agentCount)
      const agentCard = screen.getByText(/Agent|Independent Agent/).closest('button');
      expect(agentCard).toHaveTextContent('3');
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
      } as User;

      render(
        <RoleSelector
          currentUser={user}
          selectedRole={UserRole.PRIVATE_SELLER}
          onRoleSelect={mockOnRoleSelect}
        />
      );

      // Should still show Pro subscription from legacy field
      expect(screen.getByText(/20/)).toBeInTheDocument();
      expect(screen.getByText(/3/)).toBeInTheDocument();
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

      // Should show free tier limits
      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.getByText(/3/)).toBeInTheDocument();
      expect(screen.getByText(/2/)).toBeInTheDocument();
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

      // Should show "Listing limit reached" message
      expect(screen.getByText(/listing limit reached/i)).toBeInTheDocument();

      // Should show upgrade message
      expect(screen.getByText(/upgrade to pro/i)).toBeInTheDocument();
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

      // Should show "2 listings available" or similar
      expect(screen.getByText(/2.*available/i)).toBeInTheDocument();
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
          listingsLimit: 0, // Agency owners don't get direct listings
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

      expect(screen.getByText('Agency Owner')).toBeInTheDocument();
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

      expect(screen.getByText('Agency Agent')).toBeInTheDocument();
    });
  });
});
