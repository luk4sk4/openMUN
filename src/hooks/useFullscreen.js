import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para gestionar el modo pantalla completa (F11 y estado de maximización)
 */
export function useFullscreen() {
  const [isMaximized, setIsMaximized] = useState(false);

  const toggleMaximize = useCallback(() => {
    setIsMaximized(prev => {
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
      if (!document.fullscreenElement) {
        setIsMaximized(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [toggleMaximize]);

  return {
    isMaximized,
    setIsMaximized,
    toggleMaximize
  };
}

export default useFullscreen;
