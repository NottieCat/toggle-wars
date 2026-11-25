/// <reference types="vite/client" />
import cssText from './toggledock.css?raw';

const STYLE_ELEMENT_ID = 'toggledock-styles';

/**
 * Injects the scoped ToggleDock stylesheet into `document.head` once.
 * Safe to invoke during SSR (no-op when `document` is unavailable).
 */
export function injectStyles(): void {
  if (typeof document === 'undefined' || !document.head) {
    return;
  }

  const existing = document.getElementById(STYLE_ELEMENT_ID);
  if (existing) {
    if (existing.textContent !== cssText && typeof cssText === 'string' && cssText.length > 0) {
      existing.textContent = cssText;
    }
    return;
  }

  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ELEMENT_ID;
  styleEl.setAttribute('data-toggledock', 'true');
  styleEl.textContent = typeof cssText === 'string' ? cssText : '';
  document.head.appendChild(styleEl);
}
