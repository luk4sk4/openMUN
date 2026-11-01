import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../context/SessionContext';
import { useElapsedInterval } from './useElapsedInterval';

// All timer entry points (buttons, hotkeys and PiP) share the same session check.
export function useDebateRunning() {
  const { iniciarActividadDebate, registrarActividadDebate } = useSession();
  const [running, setRunning] = useState(false);
  const requested = useRef(false);
  const revision = useRef(0);
  const setDebateRunning = useCallback(value => {
    const wasRunning = requested.current;
    const next = typeof value === 'function' ? value(requested.current) : value;
    requested.current = next;
    const current = ++revision.current;
    if (!next) {
      setRunning(false);
      if (wasRunning) registrarActividadDebate();
      return;
    }
    iniciarActividadDebate().then(() => {
      if (current === revision.current) setRunning(true);
    });
  }, [iniciarActividadDebate, registrarActividadDebate]);
  useElapsedInterval(running, registrarActividadDebate, 60000);
  useEffect(() => () => {
    revision.current++;
    if (requested.current) registrarActividadDebate();
  }, [registrarActividadDebate]);
  return [running, setDebateRunning];
}
