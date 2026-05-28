import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  recomputeAgentScores,
  recomputeAgencyScores,
  recomputeAllScores,
  type RecomputeResult,
  type RecomputeAllResult,
} from '../api/scoreManagementApi';

type ActionResult =
  | { kind: 'agents'; data: RecomputeResult }
  | { kind: 'agencies'; data: RecomputeResult }
  | { kind: 'all'; data: RecomputeAllResult };

interface UseScoreManagementReturn {
  recomputeAgents: () => void;
  recomputeAgencies: () => void;
  recomputeAll: () => void;
  isRunning: boolean;
  lastResult: ActionResult | null;
  error: string | null;
  clearResult: () => void;
}

const LEADERBOARD_KEYS = [['topAgentsWeek'], ['topAgenciesMonth']];

export function useScoreManagement(): UseScoreManagementReturn {
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<ActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalidateLeaderboards = useCallback(() => {
    LEADERBOARD_KEYS.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
  }, [queryClient]);

  const clearResult = useCallback(() => {
    setLastResult(null);
    setError(null);
  }, []);

  const agentsMutation = useMutation({
    mutationFn: recomputeAgentScores,
    onSuccess: data => {
      setLastResult({ kind: 'agents', data });
      setError(null);
      invalidateLeaderboards();
    },
    onError: (err: Error) => setError(err.message),
  });

  const agenciesMutation = useMutation({
    mutationFn: recomputeAgencyScores,
    onSuccess: data => {
      setLastResult({ kind: 'agencies', data });
      setError(null);
      invalidateLeaderboards();
    },
    onError: (err: Error) => setError(err.message),
  });

  const allMutation = useMutation({
    mutationFn: recomputeAllScores,
    onSuccess: data => {
      setLastResult({ kind: 'all', data });
      setError(data.errors.length > 0 ? data.errors.join('; ') : null);
      invalidateLeaderboards();
    },
    onError: (err: Error) => setError(err.message),
  });

  const isRunning =
    agentsMutation.isPending || agenciesMutation.isPending || allMutation.isPending;

  return {
    recomputeAgents: () => { clearResult(); agentsMutation.mutate(); },
    recomputeAgencies: () => { clearResult(); agenciesMutation.mutate(); },
    recomputeAll: () => { clearResult(); allMutation.mutate(); },
    isRunning,
    lastResult,
    error,
    clearResult,
  };
}
