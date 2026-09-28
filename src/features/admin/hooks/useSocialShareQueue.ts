import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { socialPostKeys } from '@/src/shared/query/queryKeys';
import {
  approveSocialPost,
  getSocialConfig,
  getSocialPosts,
  markSocialPostGroupShared,
  queuePropertyForSocial,
  rejectSocialPost,
  restoreSocialPost,
  type SocialChannel,
  type SocialPostStatus,
} from '../api/adminApi';

/** Server state for the admin social share queue: config, one status tab, and its actions. */
export const useSocialShareQueue = (status: SocialPostStatus) => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: socialPostKeys.all });

  const config = useQuery({
    queryKey: socialPostKeys.config(),
    queryFn: getSocialConfig,
    staleTime: 5 * 60 * 1000,
  });

  const posts = useQuery({
    queryKey: socialPostKeys.list(status),
    queryFn: () => getSocialPosts(status),
  });

  const approve = useMutation({
    mutationFn: (vars: { id: string; caption?: string; channels: SocialChannel[] }) =>
      approveSocialPost(vars.id, { caption: vars.caption, channels: vars.channels }),
    onSuccess: invalidate,
  });

  const reject = useMutation({ mutationFn: rejectSocialPost, onSuccess: invalidate });
  const restore = useMutation({ mutationFn: restoreSocialPost, onSuccess: invalidate });
  const queue = useMutation({ mutationFn: queuePropertyForSocial, onSuccess: invalidate });

  const groupShared = useMutation({
    mutationFn: (vars: { id: string; shared: boolean }) => markSocialPostGroupShared(vars.id, vars.shared),
    onSuccess: invalidate,
  });

  return { config, posts, approve, reject, restore, queue, groupShared };
};

export type SocialShareQueueState = ReturnType<typeof useSocialShareQueue>;
