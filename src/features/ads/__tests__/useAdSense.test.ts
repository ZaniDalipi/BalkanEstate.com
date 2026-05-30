import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock useCurrentUser so we can control subscription state
vi.mock('@/features/auth/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}));

import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useAdSense } from '../hooks/useAdSense';

const mockUseCurrentUser = useCurrentUser as ReturnType<typeof vi.fn>;

describe('useAdSense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows ads for unauthenticated visitors', () => {
    mockUseCurrentUser.mockReturnValue({ user: null, isLoading: false });
    const { result } = renderHook(() => useAdSense());
    expect(result.current.shouldShowAds).toBe(true);
  });

  it('shows ads for free-tier users', () => {
    mockUseCurrentUser.mockReturnValue({
      user: { subscription: { tier: 'free', status: 'active' } },
      isLoading: false,
    });
    const { result } = renderHook(() => useAdSense());
    expect(result.current.shouldShowAds).toBe(true);
  });

  it('hides ads for buyer-tier subscribers', () => {
    mockUseCurrentUser.mockReturnValue({
      user: { subscription: { tier: 'buyer', status: 'active' } },
      isLoading: false,
    });
    const { result } = renderHook(() => useAdSense());
    expect(result.current.shouldShowAds).toBe(false);
  });

  it('hides ads for pro-tier users', () => {
    mockUseCurrentUser.mockReturnValue({
      user: { subscription: { tier: 'pro', status: 'active' } },
      isLoading: false,
    });
    const { result } = renderHook(() => useAdSense());
    expect(result.current.shouldShowAds).toBe(false);
  });

  it('hides ads for agency owners', () => {
    mockUseCurrentUser.mockReturnValue({
      user: { subscription: { tier: 'agency_owner', status: 'active' } },
      isLoading: false,
    });
    const { result } = renderHook(() => useAdSense());
    expect(result.current.shouldShowAds).toBe(false);
  });

  it('hides ads while user auth state is loading', () => {
    mockUseCurrentUser.mockReturnValue({ user: null, isLoading: true });
    const { result } = renderHook(() => useAdSense());
    expect(result.current.shouldShowAds).toBe(false);
  });
});
