import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para gestionar el modo pantalla completa (F11 y estado de maximización)
 */
export function useFullscreen() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState('with_left'); // 'with_left' | 'timer_only'

  const toggleMaximize = useCallback((targetMode = null) => {
    setIsMaximized(prev => {
      if (targetMode === 'exit') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => { });
        }
        return false;
      }

      if (targetMode === 'with_left' || targetMode === 'timer_only' || targetMode === 'with_adder' || targetMode === 'all') {
        const normalizedMode = targetMode === 'all' ? 'with_adder' : targetMode;
        setFullscreenMode(normalizedMode);
        if (prev) {
          // If already maximized in a different mode, switch without exiting
          return true;
        }
      }

      const next = !prev;
      if (next) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => { });
        }
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => { });
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleMaximize();
      }
    };

    const handleFullscreenChange = () => {
      setIsMaximized(Boolean(document.fullscreenElement));
    };

    const handleCustomToggle = (e) => {
      const mode = e?.detail?.mode;
      toggleMaximize(mode);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('openmun_toggle_fullscreen', handleCustomToggle);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('openmun_toggle_fullscreen', handleCustomToggle);
    };
  }, [toggleMaximize]);

  return {
    isMaximized,
    setIsMaximized,
    fullscreenMode,
    setFullscreenMode,
    toggleMaximize
  };
}

export default useFullscreen;
