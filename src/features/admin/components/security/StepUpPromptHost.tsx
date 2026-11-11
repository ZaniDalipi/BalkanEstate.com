import React, { useEffect, useRef, useState } from 'react';
import { setStepUpHandler, type StepUpRequest } from '@/src/shared/api/adminStepUp';
import { StepUpDialog } from './StepUpDialog';

interface Pending {
  id: number;
  request: StepUpRequest;
  resolve: (code: string | null) => void;
}

/**
 * Mounted once in the admin panel. When a risky request is refused for want
 * of an authenticator code, the HTTP client asks here; the dialog's answer
 * goes back and the request is repeated with the code.
 */
export const StepUpPromptHost: React.FC = () => {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const nextId = useRef(0);
  pendingRef.current = pending;

  useEffect(() => {
    const remove = setStepUpHandler(
      (request) =>
        new Promise<string | null>((resolve) => {
          // A newer request replaces one still open: the older one is cancelled.
          pendingRef.current?.resolve(null);
          nextId.current += 1;
          setPending({ id: nextId.current, request, resolve });
        })
    );
    return () => {
      remove();
      pendingRef.current?.resolve(null);
    };
  }, []);

  if (!pending) return null;
  const finish = (code: string | null) => {
    pending.resolve(code);
    setPending(null);
  };
  // Keyed by the request, so a retry after a wrong code starts with an empty field.
  return <StepUpDialog key={pending.id} request={pending.request} onSubmit={finish} onCancel={() => finish(null)} />;
};
