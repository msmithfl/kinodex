import { useEffect, useRef, useState } from "react";

interface StoredStateOptions<T> {
  // Turns the saved text back into a value; return undefined to use the fallback (e.g. an old or
  // unknown value). Defaults to JSON.
  parse?: (saved: string) => T | undefined;
  // Turns the value into text to save. Defaults to JSON.
  serialize?: (value: T) => string;
}

// useState that's remembered in this browser (localStorage) under `key`. Storage can be
// unavailable (private windows, blocked site data), in which case it just isn't remembered.
export function useStoredState<T>(key: string, fallback: T, options: StoredStateOptions<T> = {}) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === null) return fallback;
      const parsed = (options.parse ?? JSON.parse)(saved);
      return parsed === undefined ? fallback : parsed;
    } catch {
      return fallback;
    }
  });

  // Callers usually pass serialize inline; a ref keeps the effect from re-running every render
  const serialize = useRef(options.serialize ?? JSON.stringify);
  useEffect(() => {
    try {
      localStorage.setItem(key, serialize.current(value));
    } catch {
      // Storage unavailable; the choice just isn't remembered
    }
  }, [key, value]);

  return [value, setValue] as const;
}

// One of a fixed set of choices (a view mode, a tab, a sort), saved as plain text. A saved value
// that isn't one of the choices any more falls back.
export function useStoredChoice<T extends string>(key: string, choices: readonly T[], fallback: T) {
  return useStoredState<T>(key, fallback, {
    parse: (saved) => (choices.includes(saved as T) ? (saved as T) : undefined),
    serialize: (value) => value,
  });
}
