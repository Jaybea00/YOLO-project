import { useEffect, useCallback } from "react";

export interface ShortcutAction {
  key: string;
  label: string;
  description: string;
  action: () => void;
}

/**
 * Register a set of keyboard shortcuts.
 * Ignores events when focus is inside an <input>, <textarea>, or <select>.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutAction[]) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      const key = e.key.toLowerCase();

      for (const s of shortcuts) {
        if (s.key.toLowerCase() === key) {
          e.preventDefault();
          s.action();
          return;
        }
      }
    },
    [shortcuts],
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}
