import { useEffect, useState } from 'react';

/**
 * Debounce a fast-changing value (typically a search input) so filter-driven
 * data loads fire once the user stops typing instead of once per keystroke.
 */
export default function useDebouncedValue(value, delayMs = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delayMs);

    return () => clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}
