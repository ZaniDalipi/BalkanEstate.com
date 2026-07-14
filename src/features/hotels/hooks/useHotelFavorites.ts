import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHotelFavorites, toggleHotelFavorite } from '../api';
import type { Hotel } from '@/src/shared/types/hotel.types';

const HOTEL_FAVORITES_KEY = ['hotel-favorites'] as const;

export function useHotelFavorites(enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: HOTEL_FAVORITES_KEY,
    queryFn: getHotelFavorites,
    enabled,
    staleTime: 60 * 1000,
  });

  const hotels = data?.hotels || [];
  const favoritedIds = useMemo(() => new Set(hotels.map((h) => h.id)), [hotels]);

  return { hotels, favoritedIds, isLoading, error, refetch };
}

export function useToggleHotelFavorite() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (hotel: Hotel) => toggleHotelFavorite(hotel.id),
    // Optimistic update so the heart responds instantly.
    onMutate: async (hotel: Hotel) => {
      await queryClient.cancelQueries({ queryKey: HOTEL_FAVORITES_KEY });
      const previous = queryClient.getQueryData<{ hotels: Hotel[] }>(HOTEL_FAVORITES_KEY);
      const currentlySaved = previous?.hotels.some((h) => h.id === hotel.id) ?? false;

      queryClient.setQueryData<{ hotels: Hotel[] }>(HOTEL_FAVORITES_KEY, (old) => {
        const list = old?.hotels || [];
        return {
          hotels: currentlySaved
            ? list.filter((h) => h.id !== hotel.id)
            : [hotel, ...list],
        };
      });

      return { previous };
    },
    onError: (_err, _hotel, context) => {
      if (context?.previous) queryClient.setQueryData(HOTEL_FAVORITES_KEY, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: HOTEL_FAVORITES_KEY });
    },
  });

  return { toggle: mutation.mutate, isLoading: mutation.isPending };
}
