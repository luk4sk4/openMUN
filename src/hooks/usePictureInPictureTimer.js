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

  const isSupported = typeof window !== 'undefined' && ('documentPictureInPicture' in window || typeof window.open === 'function');

  // Copiar hojas de estilo del documento principal a la ventana PiP
  const copyStyles = useCallback((targetDoc) => {
    try {
      // 1. Copiar elementos <style> y <link rel="stylesheet">
      document.querySelectorAll('link[rel="stylesheet"], style').forEach(el => {
        targetDoc.head.appendChild(el.cloneNode(true));
      });

      // 2. Establecer variables CSS básicas y fondo
      const rootStyle = getComputedStyle(document.documentElement);
      targetDoc.documentElement.style.backgroundColor = rootStyle.getPropertyValue('--panel-color') || '#161922';
      targetDoc.documentElement.style.color = rootStyle.getPropertyValue('--text-color') || '#f1f5f9';
      targetDoc.documentElement.style.fontFamily = rootStyle.getPropertyValue('--font-family') || 'Inter, system-ui, sans-serif';
      targetDoc.body.style.margin = '0';
      targetDoc.body.style.padding = '0';
      targetDoc.body.style.overflow = 'hidden';
      targetDoc.body.style.backgroundColor = 'transparent';
    } catch (err) {
      console.warn('Error al transferir estilos al PiP:', err);
    }
  }, []);

  const closePip = useCallback(() => {
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

        const container = pipWin.document.createElement('div');
        container.id = 'openmun-pip-root';
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.boxSizing = 'border-box';
        pipWin.document.body.appendChild(container);

        setPipContainer(container);
        setIsPipActive(true);

        pipWin.addEventListener('pagehide', () => {
          setPipContainer(null);
          setIsPipActive(false);
          pipWindowRef.current = null;
        });
      } else {
        // Modo 2: Fallback con ventana emergente flotante compacta
        const left = window.screen.width - 380;
        const top = 100;
        const fallbackWin = window.open(
          '',
          'openmun_pip_timer',
          `width=360,height=220,left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
        );

        if (fallbackWin) {
          pipWindowRef.current = fallbackWin;
          fallbackWin.document.title = 'OpenMUN - Cronómetro';
          copyStyles(fallbackWin.document);

          const container = fallbackWin.document.createElement('div');
          container.id = 'openmun-pip-root';
          container.style.width = '100vw';
          container.style.height = '100vh';
          container.style.boxSizing = 'border-box';
          fallbackWin.document.body.appendChild(container);

          setPipContainer(container);
          setIsPipActive(true);

          fallbackWin.addEventListener('beforeunload', () => {
            setPipContainer(null);
            setIsPipActive(false);
            pipWindowRef.current = null;
          });
        }
      }
    } catch (err) {
      console.error('No se pudo inicializar la ventana Picture-in-Picture:', err);
      setIsPipActive(false);
      setPipContainer(null);
    }
  }, [isPipActive, closePip, copyStyles]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
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
