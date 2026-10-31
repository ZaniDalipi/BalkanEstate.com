import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/src/tests/test-utils';
import { initialFilters } from '@/types';

vi.mock('../api/featureMatchesApi', () => ({ fetchFeatureMatches: vi.fn() }));

import * as api from '../api/featureMatchesApi';
import { useFeatureMatches } from './useFeatureMatches';

const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: createTestQueryClient() }, children);

describe('useFeatureMatches', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(api.fetchFeatureMatches).mockResolvedValue(['a', 'b']);
    });

    it('asks the server for the requested features and returns the matching ids', async () => {
        const filters = { ...initialFilters, amenities: ['floor heating|ngrohje në dysheme'], hasElevator: true };
        const { result } = renderHook(() => useFeatureMatches(filters), { wrapper });
        await waitFor(() => expect(result.current).toEqual(new Set(['a', 'b'])));
        expect(api.fetchFeatureMatches).toHaveBeenCalledWith({
            features: ['floor heating|ngrohje në dysheme'], flags: ['hasElevator'], listingType: 'sale',
        });
    });

    it('does not call the server when no feature is asked for', () => {
        const { result } = renderHook(() => useFeatureMatches(initialFilters), { wrapper });
        expect(result.current).toBeUndefined();
        expect(api.fetchFeatureMatches).not.toHaveBeenCalled();
    });
});
