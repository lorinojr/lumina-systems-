import { useEffect, useRef, useCallback } from 'react';

// USB barcode scanners fire chars < 50 ms apart; manual typing is typically > 150 ms/char.
const MAX_CHAR_INTERVAL_MS = 80;
const MIN_BARCODE_LENGTH   = 3;
const BUFFER_CLEAR_MS      = 400;

/**
 * Global barcode scanner hook.
 *
 * Works by capturing keyboard events at the window level (capture phase).
 * Chars that arrive faster than MAX_CHAR_INTERVAL_MS are accumulated in a buffer.
 * When the scanner sends the terminating Enter, the buffer is flushed to onScan.
 *
 * The hook ignores keystrokes that are already going to a focusable input
 * (unless that input has data-barcode="true").
 */
export function useBarcodeScanner(
  onScan: (barcode: string) => void,
  enabled = true,
) {
  const bufferRef    = useRef('');
  const lastTimeRef  = useRef(0);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    const barcode = bufferRef.current.trim();
    bufferRef.current  = '';
    lastTimeRef.current = 0;
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    if (barcode.length >= MIN_BARCODE_LENGTH) onScan(barcode);
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      // Respect existing focus in regular inputs
      if (
        (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') &&
        target.getAttribute('data-barcode') !== 'true'
      ) return;

      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= MIN_BARCODE_LENGTH) {
          e.preventDefault();
          flush();
        } else {
          bufferRef.current  = '';
          lastTimeRef.current = 0;
        }
        return;
      }

      if (e.key.length === 1) {
        const now = Date.now();
        if (lastTimeRef.current > 0 && (now - lastTimeRef.current) > MAX_CHAR_INTERVAL_MS) {
          bufferRef.current = ''; // too slow → not a scanner
        }
        bufferRef.current  += e.key;
        lastTimeRef.current = now;

        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        clearTimerRef.current = setTimeout(() => {
          bufferRef.current  = '';
          lastTimeRef.current = 0;
        }, BUFFER_CLEAR_MS);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [enabled, flush]);
}

/** Plays a crisp beep via Web Audio – no file loading, instantaneous. */
export function playBeep(type: 'ok' | 'error' = 'ok') {
  try {
    const ctx  = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'ok') {
      osc.frequency.value = 1046; // C6
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else {
      osc.frequency.value = 330;
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    /* AudioContext might be blocked on first user gesture — silently skip */
  }
}
