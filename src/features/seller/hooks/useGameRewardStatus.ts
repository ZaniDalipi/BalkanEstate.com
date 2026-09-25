import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/src/shared/api/httpClient';
import { gameRewardKeys } from '@/src/shared/query/queryKeys';

export interface GameRewardCode {
  type: 'discount';
  code: string;
  discountPercent: number;
  validUntil: string;
}

export interface GameRewardStatus {
  isSubscriber: boolean;
  /** False while the once-a-day cooldown is running */
  canPlay: boolean;
  nextAvailableAt: string | null;
  /** Unused code from an earlier game (users without a subscription only) */
  activeCode: GameRewardCode | null;
}

/** Whether the user can win a discount-game reward right now, checked before they play. */
export const useGameRewardStatus = (enabled: boolean) =>
  useQuery({
    queryKey: gameRewardKeys.status(),
    queryFn: () => apiRequest<GameRewardStatus>('/game-rewards/status', { requiresAuth: true }),
    enabled,
    staleTime: 0,
    retry: false,
  });
