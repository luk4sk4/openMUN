import i18n from '../languages/index.js';
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook para gestionar el modo Picture-in-Picture interactivo del cronómetro.
 * Utiliza la API nativa Document Picture-in-Picture cuando está disponible,
 * o una ventana emergente compacta como fallback.
 */
export function usePictureInPictureTimer() {
  const [isPipActive, setIsPipActive] = useState(false);
  const [pipContainer, setPipContainer] = useState(null);
  const pipWindowRef = useRef(null);
  const observerRef = useRef(null);

  const isSupported = typeof window !== 'undefined' && ('documentPictureInPicture' in window || typeof window.open === 'function');

  // Sincronizar clases, variables de tema y atributos del documento principal a la ventana PiP
  const syncThemeToTarget = useCallback((targetDoc) => {
    if (!targetDoc || !targetDoc.documentElement) return;
    try {
      if (typeof window !== 'undefined' && document.documentElement) {
        targetDoc.documentElement.style.cssText = document.documentElement.style.cssText;
        targetDoc.documentElement.className = document.documentElement.className;
        const themeAttr = document.documentElement.getAttribute('data-theme');
        if (themeAttr) {
          targetDoc.documentElement.setAttribute('data-theme', themeAttr);
        } else {
          targetDoc.documentElement.removeAttribute('data-theme');
        }
      }
      if (targetDoc.body && document.body) {
        targetDoc.body.className = document.body.className;
        targetDoc.body.style.margin = '0';
        targetDoc.body.style.padding = '0';
        targetDoc.body.style.overflow = 'hidden';
        targetDoc.body.style.backgroundColor = 'var(--panel-color, #363636)';
        targetDoc.body.style.color = 'var(--text-color, #f7f2eb)';
        targetDoc.body.style.fontFamily = 'var(--font-family, Inter, system-ui, sans-serif)';
      }
    } catch (err) {
      console.warn('Error al sincronizar tema al PiP:', err);
    }
  }, []);

  // Copiar hojas de estilo del documento principal a la ventana PiP
  const copyStyles = useCallback((targetDoc) => {
    try {
      // 1. Copiar elementos <style> y <link rel="stylesheet">
      document.querySelectorAll('link[rel="stylesheet"], style').forEach(el => {
        targetDoc.head.appendChild(el.cloneNode(true));
      });

      // 2. Establecer variables CSS básicas y fondo desde el documento principal
      syncThemeToTarget(targetDoc);
    } catch (err) {
      console.warn('Error al transferir estilos al PiP:', err);
    }
  }, [syncThemeToTarget]);

  const closePip = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (pipWindowRef.current) {
      try {
        pipWindowRef.current.close();
      } catch (e) {}
      pipWindowRef.current = null;
    }
    setPipContainer(null);
    setIsPipActive(false);
  }, []);

  const openPip = useCallback(async () => {
    if (isPipActive) {
      closePip();
      return;
    }

    try {
      if ('documentPictureInPicture' in window) {
        // Modo 1: Document Picture-in-Picture API (Chrome/Edge/Opera/Brave)
        const pipWin = await window.documentPictureInPicture.requestWindow({
          width: 360,
          height: 220
        });

        pipWindowRef.current = pipWin;
        copyStyles(pipWin.document);

        // Observer para cambios de tema en vivo
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
        const observer = new MutationObserver(() => {
          if (pipWindowRef.current && pipWindowRef.current.document) {
            syncThemeToTarget(pipWindowRef.current.document);
          }
        });
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['style', 'class', 'data-theme']
        });
        observerRef.current = observer;

        const container = pipWin.document.createElement('div');
        container.id = 'openmun-pip-root';
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.boxSizing = 'border-box';
        pipWin.document.body.appendChild(container);

        setPipContainer(container);
        setIsPipActive(true);

        pipWin.addEventListener('pagehide', () => {
          if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
          }
          setPipContainer(null);
          setIsPipActive(false);
          pipWindowRef.current = null;
        });
      } else {
        // Modo 2: Fallback con ventana emergente flotante compacta (Firefox, etc.)
        const left = window.screen.width - 380;
        const top = 100;
        const fallbackWin = window.open(
          '',
          'openmun_pip_timer',
          `width=360,height=220,left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
        );

        if (fallbackWin) {
          pipWindowRef.current = fallbackWin;
          fallbackWin.document.title = i18n.t('pageTitles.timer');
          copyStyles(fallbackWin.document);

          // Observer para cambios de tema en vivo
          if (observerRef.current) {
            observerRef.current.disconnect();
          }
          const observer = new MutationObserver(() => {
            if (pipWindowRef.current && pipWindowRef.current.document) {
              syncThemeToTarget(pipWindowRef.current.document);
            }
          });
          observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['style', 'class', 'data-theme']
          });
          observerRef.current = observer;

          const container = fallbackWin.document.createElement('div');
          container.id = 'openmun-pip-root';
          container.style.width = '100vw';
          container.style.height = '100vh';
          container.style.boxSizing = 'border-box';
          fallbackWin.document.body.appendChild(container);

          setPipContainer(container);
          setIsPipActive(true);

          fallbackWin.addEventListener('beforeunload', () => {
            if (observerRef.current) {
              observerRef.current.disconnect();
              observerRef.current = null;
            }
            setPipContainer(null);
            setIsPipActive(false);
            pipWindowRef.current = null;
          });
        }
      }
    } catch (err) {
      console.error('No se pudo inicializar la ventana Picture-in-Picture:', err);
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      setIsPipActive(false);
      setPipContainer(null);
    }
  }, [isPipActive, closePip, copyStyles, syncThemeToTarget]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (pipWindowRef.current) {
        try {
          pipWindowRef.current.close();
        } catch (e) {}
      }
    };
  }, []);

  return {
    isPipActive,
    isSupported,
    pipContainer,
    openPip,
    closePip,
    togglePip: openPip
  };
}
