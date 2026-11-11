import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '@/src/shared/query/queryKeys';
import { getAdminAlertSettings, saveAdminAlertEmails, sendTestAdminAlert } from '../api/adminAlertSettingsApi';

/** The alert email settings, saving the list, and sending a test email. */
export function useAdminAlertSettings() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: adminKeys.alertSettings(), queryFn: getAdminAlertSettings, staleTime: 30_000 });
  const save = useMutation({
    mutationFn: (emails: string[]) => saveAdminAlertEmails(emails),
    onSuccess: (data) => qc.setQueryData(adminKeys.alertSettings(), data),
  });
  const test = useMutation({ mutationFn: () => sendTestAdminAlert() });
  return { settings, save, test };
}
