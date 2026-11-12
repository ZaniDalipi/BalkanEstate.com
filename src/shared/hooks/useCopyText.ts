import { useEffect, useRef, useState } from 'react';

/** Copy text to the clipboard; `copied` names what was copied last, for a moment. */
export function useCopyText(resetMs = 1800) {
  const [copied, setCopied] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFailed(false);
      setCopied(key);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(null), resetMs);
    } catch {
      // No clipboard (an old browser, a denied permission): the code stays on screen to select by hand.
      setFailed(true);
    }
  };
  return { copied, failed, copy };
}
