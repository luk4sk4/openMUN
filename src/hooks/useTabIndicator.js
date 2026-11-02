import { useState, useEffect, useRef } from 'react';

/**
 * Hook para gestionar el indicador animado de la barra de pestañas.
 * Sincroniza la posición (left, width, opacity) con el botón activo marcado con aria-current="page".
 */
export function useTabIndicator(activeTab, tabs) {
  const tabsNavRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    if (!tabsNavRef.current) return;

    const updateIndicator = () => {
      const navEl = tabsNavRef.current;
      if (!navEl) return;
      const activeButton = navEl.querySelector('button[aria-current="page"]');
      if (activeButton) {
        setIndicatorStyle({
          left: activeButton.offsetLeft,
          width: activeButton.offsetWidth,
          opacity: 1
        });
      } else {
        setIndicatorStyle(prev => (prev.opacity === 0 ? prev : { ...prev, opacity: 0 }));
      }
    };

    updateIndicator();

    let observer;
    if (typeof ResizeObserver !== 'undefined' && tabsNavRef.current) {
      observer = new ResizeObserver(() => {
        updateIndicator();
      });
      observer.observe(tabsNavRef.current);
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, [activeTab, tabs]);

  return { tabsNavRef, indicatorStyle };
}

export default useTabIndicator;
