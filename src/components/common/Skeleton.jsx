import React from 'react';
import { useAccessibility } from '../../context/AccessibilityContext';

/**
 * Componente base de Skeleton con efecto shimmer / pulse adaptado al tema claro / oscuro.
 */
export const Skeleton = ({
  variant = 'rect', // 'rect' | 'circle' | 'text' | 'button' | 'badge'
  width,
  height,
  borderRadius,
  animation = 'shimmer', // 'shimmer' | 'pulse' | 'none'
  isLight: propIsLight,
  className = '',
  style = {},
  ...props
}) => {
  let isLight = propIsLight;
  try {
    const access = useAccessibility();
    if (isLight === undefined && access) {
      isLight = access.isLight;
    }
  } catch (e) {
    // Si se usa fuera del contexto de accesibilidad
  }

  // Dimensiones por defecto según la variante
  let defaultHeight = '1rem';
  let defaultWidth = '100%';
  let defaultRadius = 'var(--border-radius, 6px)';

  if (variant === 'circle') {
    defaultWidth = width || '2.5rem';
    defaultHeight = height || defaultWidth;
    defaultRadius = '50%';
  } else if (variant === 'text') {
    defaultHeight = height || '0.875rem';
    defaultRadius = '4px';
  } else if (variant === 'button') {
    defaultHeight = height || '2.25rem';
    defaultWidth = width || '6rem';
    defaultRadius = 'var(--border-radius, 6px)';
  } else if (variant === 'badge') {
    defaultHeight = height || '1.25rem';
    defaultWidth = width || '4rem';
    defaultRadius = '9999px';
  }

  const baseBg = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)';
  const borderColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';

  const animClass = animation === 'shimmer' 
    ? `skeleton-shimmer ${isLight ? 'light-mode' : ''}` 
    : animation === 'pulse' 
      ? 'skeleton-pulse' 
      : '';

  const combinedStyle = {
    display: 'inline-block',
    width: width || defaultWidth,
    height: height || defaultHeight,
    borderRadius: borderRadius || defaultRadius,
    backgroundColor: baseBg,
    border: `1px solid ${borderColor}`,
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
    ...style
  };

  return (
    <div
      className={`skeleton-base ${animClass} ${className}`}
      style={combinedStyle}
      aria-hidden="true"
      {...props}
    />
  );
};

/**
 * Helper para renderizar múltiples líneas de texto esqueleto
 */
export const SkeletonText = ({
  lines = 3,
  lineHeight = '0.85rem',
  gap = '0.5rem',
  lastLineWidth = '60%',
  isLight,
  style = {},
  className = ''
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
        width: '100%',
        ...style
      }}
      className={className}
    >
      {Array.from({ length: lines }).map((_, index) => {
        const isLast = index === lines - 1;
        const width = isLast ? lastLineWidth : `${90 + ((index * 7) % 10)}%`;
        return (
          <Skeleton
            key={index}
            variant="text"
            width={width}
            height={lineHeight}
            isLight={isLight}
          />
        );
      })}
    </div>
  );
};

/**
 * Skeleton para tarjetas contenedoras
 */
export const SkeletonCard = ({
  children,
  isLight,
  style = {},
  className = '',
  ...props
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--panel-color)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius, 8px)',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        ...style
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
};

export default Skeleton;
