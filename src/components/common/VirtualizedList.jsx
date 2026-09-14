import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

/**
 * Componente de virtualización de listas de alto rendimiento (Windowing).
 * Renderiza exclusivamente los elementos visibles en el viewport + un margen de sobreescaneo.
 * 
 * @param {Array} items - Colección completa de datos
 * @param {number} itemHeight - Altura estimada / fija en píxeles de cada fila (ej. 42px)
 * @param {number} overscan - Cantidad de filas adicionales a renderizar fuera del viewport (ej. 4)
 * @param {Function} renderItem - Función de render: (item, index) => ReactNode
 * @param {string} className - Clases CSS opcionales
 * @param {Object} style - Estilos en línea del contenedor
 */
const VirtualizedList = ({
  items = [],
  itemHeight = 42,
  overscan = 5,
  renderItem,
  className = '',
  style = {},
  emptyPlaceholder = null
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  // Escuchar redimensionamiento dinámico del contenedor
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateHeight = () => {
      if (el.clientHeight > 0) {
        setContainerHeight(el.clientHeight);
      }
    };

    updateHeight();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateHeight);
      observer.observe(el);
      return () => observer.disconnect();
    } else {
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }
  }, []);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalItems = items.length;
  const totalHeight = totalItems * itemHeight;

  // Cálculo optimizado de la ventana visible
  const { startIndex, endIndex, offsetY } = useMemo(() => {
    if (totalItems === 0) {
      return { startIndex: 0, endIndex: 0, offsetY: 0 };
    }

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
    const end = Math.min(totalItems, start + visibleCount);
    const offset = start * itemHeight;

    return {
      startIndex: start,
      endIndex: end,
      offsetY: offset
    };
  }, [scrollTop, containerHeight, itemHeight, overscan, totalItems]);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  if (totalItems === 0) {
    return emptyPlaceholder || null;
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={className}
      style={{
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        height: '100%',
        width: '100%',
        willChange: 'transform',
        ...style
      }}
    >
      {/* Contenedor fantasma que mantiene la altura del scrollbar natural */}
      <div style={{ height: `${totalHeight}px`, width: '100%', position: 'relative' }}>
        {/* Contenedor posicionado con los elementos actualmente renderizados */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${offsetY}px)`,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem'
          }}
        >
          {visibleItems.map((item, localIdx) => {
            const actualIndex = startIndex + localIdx;
            return renderItem(item, actualIndex);
          })}
        </div>
      </div>
    </div>
  );
};

export default VirtualizedList;
