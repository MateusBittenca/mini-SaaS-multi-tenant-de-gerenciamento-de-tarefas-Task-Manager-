import { useEffect, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  handler: () => void;
  enabled?: boolean;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;
        if (e.key !== shortcut.key) continue;
        e.preventDefault();
        shortcut.handler();
        break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
