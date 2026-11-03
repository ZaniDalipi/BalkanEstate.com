import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { Toast } from '../../hooks/useShareAndCopy';

/** A frosted confirmation pill above the bottom bar ("Link copied"). */
export const DetailToast: React.FC<{ toast: Toast }> = ({ toast }) => {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4 lg:bottom-8" role="status" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.p
            key={toast.text}
            className="flex items-center gap-2 rounded-full bg-neutral-900/85 px-5 py-3 text-sm font-medium text-white shadow-xl backdrop-blur-md"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {toast.tone === 'ok'
              ? <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              : <XCircle className="h-5 w-5 text-rose-400" aria-hidden="true" />}
            {toast.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};
