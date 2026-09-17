import { useState, useRef, useEffect, useCallback } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';
import { useTranslation } from 'react-i18next';

/**
 * Hook para detectar overflow en barras superiores (nav o header) y compactar
 * elementos progresivamente, reduciendo el logo a sólo icono (sin texto) y
 * adaptando botones secundarios si el espacio es limitado.
 *
 * Utiliza ResizeObserver y medición con histéresis para evitar parpadeos (flickering).
 */
export function useTopBarOverflow(extraDeps = [], options = {}) {
  const { densityMode, config } = useAccessibility();
  const { i18n } = useTranslation();
  const containerRef = useRef(null);

  const [isLogoCompact, setIsLogoCompact] = useState(false);
  const [isExtraCompact, setIsExtraCompact] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  // Registro del ancho necesario cuando el logo estaba expandido
  const fullWidthNeededRef = useRef(0);
  const isLogoCompactRef = useRef(false);
  isLogoCompactRef.current = isLogoCompact;

  const isExtraCompactRef = useRef(false);
  isExtraCompactRef.current = isExtraCompact;

  const check = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const clientW = el.clientWidth;
    const scrollW = el.scrollWidth;

    // Detectar si hay overflow real en el contenedor
    const isOverflowing = scrollW > clientW + 1;
    setHasOverflow(isOverflowing);

    // Margen de seguridad para restaurar el logo sin volver a provocar overflow
    const LOGO_TEXT_WIDTH_ESTIMATE = 180;
    const HYSTERESIS_BUFFER = 24;

    if (!isLogoCompactRef.current) {
      if (isOverflowing) {
        // Hay overflow con el logo completo: guardamos el ancho necesario y compactamos
        fullWidthNeededRef.current = Math.max(fullWidthNeededRef.current, scrollW);
        setIsLogoCompact(true);
      }
    } else {
      // El logo está compacto (solo icono).
      // Solo restauramos si el ancho visible es mayor que el necesario con margen de seguridad
      const neededWidth = fullWidthNeededRef.current > 0
        ? fullWidthNeededRef.current
        : scrollW + LOGO_TEXT_WIDTH_ESTIMATE;

      if (clientW >= neededWidth + HYSTERESIS_BUFFER) {
        setIsLogoCompact(false);
        setIsExtraCompact(false);
      } else if (isOverflowing) {
        // Incluso con logo compacto sigue habiendo desborde
        setIsExtraCompact(true);
      }
    }
  }, []);

  // Reiniciar mediciones cuando cambie el modo de densidad, escala de fuentes o idioma
  useEffect(() => {
    fullWidthNeededRef.current = 0;
    // Comprobamos tras el repintado con un frame para que las clases CSS de densidad se apliquen
    const rafId = requestAnimationFrame(() => {
      check();
    });
    return () => cancelAnimationFrame(rafId);
  }, [densityMode, config?.accessibility?.fontSizeScale, i18n.language, ...extraDeps, check]);

  // Observador de cambio de tamaño (ResizeObserver) en el contenedor
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        check();
      });
      resizeObserver.observe(el);
    }

    const handleWindowResize = () => {
      check();
    };

    window.addEventListener('resize', handleWindowResize);
    // Chequeo inicial
    check();

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [check]);

  return {
    containerRef,
    isLogoCompact,
    isExtraCompact,
    hasOverflow,
    checkOverflow: check
  };
}

export default useTopBarOverflow;
