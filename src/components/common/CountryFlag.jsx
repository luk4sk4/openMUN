import React, { useState } from 'react';
import { getFlagImageUrl, obtenerIniciales, generarColorAvatar } from '../../utils/flags';

const SIZES = {
  xs: { width: '22px', height: '16px', fontSize: '0.65rem' },
  sm: { width: '26px', height: '19px', fontSize: '0.72rem' },
  md: { width: '32px', height: '24px', fontSize: '0.85rem' },
  lg: { width: '44px', height: '33px', fontSize: '1.05rem' },
  xl: { width: '64px', height: '48px', fontSize: '1.4rem' },
  '2xl': { width: '88px', height: '66px', fontSize: '1.8rem' }
};

/**
 * Componente universal para renderizar banderas en imagen (SVG/PNG o Base64 personalizadas).
 * Soporta props tradicionales (bandera, nombre) y prop unificada (country={paisObj}).
 */
const CountryFlag = ({
  country,
  bandera: propBandera,
  nombre: propNombre = '',
  size = 'md',
  shape = 'rect', // 'rect' | 'circle' | 'square'
  style = {},
  className = '',
  title = '',
  width: customWidth,
  height: customHeight
}) => {
  const [hasError, setHasError] = useState(false);

  // Extraer bandera y nombre de forma resiliente tanto si se pasa country objeto como props separadas
  const bandera = propBandera || country?.bandera || country?.flag || (typeof country === 'string' ? country : '');
  const nombre = propNombre || country?.nombre || country?.name || (typeof country === 'string' ? country : '');

  const imageUrl = getFlagImageUrl(bandera, nombre);

  const dimension = SIZES[size] || (typeof size === 'number' ? { width: `${size}px`, height: `${Math.round(size * 0.75)}px`, fontSize: `${Math.round(size * 0.4)}px` } : SIZES.md);

  const borderRadius = shape === 'circle' ? '50%' : shape === 'square' ? '4px' : '3px';
  const width = customWidth || (shape === 'circle' || shape === 'square' ? dimension.height : dimension.width);
  const height = customHeight || dimension.height;

  // Fallback si la imagen no existe o falla su carga
  if (!imageUrl || hasError) {
    const iniciales = obtenerIniciales(nombre || bandera);
    const bgColor = generarColorAvatar(nombre || bandera || 'Delegación');

    return (
      <span
        title={title || nombre}
        className={`country-flag-badge ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: width,
          height: height,
          minWidth: width,
          borderRadius: borderRadius,
          backgroundColor: bgColor,
          color: '#ffffff',
          fontWeight: '700',
          fontSize: dimension.fontSize,
          letterSpacing: '-0.5px',
          userSelect: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.2)',
          flexShrink: 0,
          ...style
        }}
      >
        {iniciales}
      </span>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={nombre || 'Bandera'}
      title={title || nombre}
      onError={() => setHasError(true)}
      className={`country-flag-img ${className}`}
      style={{
        display: 'inline-block',
        width: width,
        height: height,
        minWidth: width,
        objectFit: 'cover',
        borderRadius: borderRadius,
        border: '1px solid rgba(255, 255, 255, 0.16)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style
      }}
    />
  );
};

export default React.memo(CountryFlag);
