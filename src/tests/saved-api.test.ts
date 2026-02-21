/**
 * Saved API Module Tests
 * Tests: toggleAgencyFavorite, checkAgencyFavorite API functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toggleAgencyFavorite, checkAgencyFavorite } from '../features/saved/api/savedApi';

// Mock the shared API module
vi.mock('@/src/shared/api', () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from '@/src/shared/api';

const mockApiRequest = vi.mocked(apiRequest);

describe('Agency Favorites API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toggleAgencyFavorite', () => {
    it('should call toggle endpoint with agencyId', async () => {
      mockApiRequest.mockResolvedValueOnce({ isSaved: true });

      const result = await toggleAgencyFavorite('agency-123');

      expect(mockApiRequest).toHaveBeenCalledWith('/agency-favorites/toggle', {
        method: 'POST',
        body: { agencyId: 'agency-123' },
        requiresAuth: true,
      });
      expect(result).toEqual({ isSaved: true });
    });

    it('should return isSaved=false when removing', async () => {
      mockApiRequest.mockResolvedValueOnce({ isSaved: false });

      const result = await toggleAgencyFavorite('agency-123');
      expect(result.isSaved).toBe(false);
    });

    it('should propagate API errors', async () => {
      mockApiRequest.mockRejectedValueOnce(new Error('Network error'));

      await expect(toggleAgencyFavorite('agency-123')).rejects.toThrow('Network error');
    });
  });

  describe('checkAgencyFavorite', () => {
    it('should call check endpoint and return boolean', async () => {
      mockApiRequest.mockResolvedValueOnce({ isSaved: true });

      const result = await checkAgencyFavorite('agency-456');

      expect(mockApiRequest).toHaveBeenCalledWith('/agency-favorites/check/agency-456', {
        requiresAuth: true,
      });
      expect(result).toBe(true);
    });

    it('should return false when not favourited', async () => {
      mockApiRequest.mockResolvedValueOnce({ isSaved: false });

      const result = await checkAgencyFavorite('agency-456');
      expect(result).toBe(false);
    });

    it('should propagate API errors', async () => {
      mockApiRequest.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(checkAgencyFavorite('agency-456')).rejects.toThrow('Unauthorized');
    });
  });
});
