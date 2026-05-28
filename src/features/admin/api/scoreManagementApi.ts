import { apiRequest } from '@/src/shared/api';

export interface RecomputeResult {
  message: string;
  updated: number;
}

export interface RecomputeAllResult {
  agents: RecomputeResult;
  agencies: RecomputeResult;
  totalUpdated: number;
  errors: string[];
}

export const recomputeAgentScores = async (): Promise<RecomputeResult> => {
  const res = await apiRequest<{ message: string }>('/agents/admin/recompute-scores', {
    method: 'POST',
    requiresAuth: true,
  });
  const match = res.message?.match(/(\d+)/);
  return { message: res.message, updated: match ? parseInt(match[1], 10) : 0 };
};

export const recomputeAgencyScores = async (): Promise<RecomputeResult> => {
  const res = await apiRequest<{ message: string }>('/agencies/admin/recompute-scores', {
    method: 'POST',
    requiresAuth: true,
  });
  const match = res.message?.match(/(\d+)/);
  return { message: res.message, updated: match ? parseInt(match[1], 10) : 0 };
};

export const recomputeAllScores = async (): Promise<RecomputeAllResult> => {
  const errors: string[] = [];

  const [agentRes, agencyRes] = await Promise.allSettled([
    recomputeAgentScores(),
    recomputeAgencyScores(),
  ]);

  const agents = agentRes.status === 'fulfilled'
    ? agentRes.value
    : (() => { errors.push(agentRes.reason?.message ?? 'Agent recompute failed'); return { message: '', updated: 0 }; })();

  const agencies = agencyRes.status === 'fulfilled'
    ? agencyRes.value
    : (() => { errors.push(agencyRes.reason?.message ?? 'Agency recompute failed'); return { message: '', updated: 0 }; })();

  return {
    agents,
    agencies,
    totalUpdated: agents.updated + agencies.updated,
    errors,
  };
};
