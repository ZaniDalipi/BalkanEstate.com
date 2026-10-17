import { useEffect, useState } from 'react';

/**
 * The value, but only after it has stopped changing for `delayMs`. Used to
 * keep keystroke-driven queries (listing search) and slider-driven filters
 * from firing on every input event.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}
