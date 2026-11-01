import { useEffect, useRef } from 'react';

export const elapsedTicks = (previous, now, intervalMs = 1000) => Math.max(0, Math.floor((now - previous) / intervalMs));

// Browser timers only wake the display; elapsed time remains the clock source.
export function useElapsedInterval(running, onElapsed, intervalMs = 1000) {
  const callback = useRef(onElapsed);
  callback.current = onElapsed;
  useEffect(() => {
    if (!running) return;
    let previous = Date.now();
    const tick = () => {
      const ticks = elapsedTicks(previous, Date.now(), intervalMs);
      if (!ticks) return;
      previous += ticks * intervalMs;
      callback.current(ticks);
    };
    const timer = setInterval(tick, Math.min(1000, intervalMs));
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [running, intervalMs]);
}
