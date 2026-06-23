import type { LeadFilters } from '../types';

export const crmKeys = {
  all: ['crm'] as const,

  leads: () => [...crmKeys.all, 'leads'] as const,
  leadList: (filters?: LeadFilters) => [...crmKeys.leads(), 'list', filters] as const,
  lead: (leadId: string) => [...crmKeys.leads(), leadId] as const,
  pipeline: () => [...crmKeys.leads(), 'pipeline'] as const,
};
