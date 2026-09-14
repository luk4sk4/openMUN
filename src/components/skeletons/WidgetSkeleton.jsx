import React from 'react';
import { Skeleton, SkeletonText } from '../common/Skeleton';

/**
 * Skeleton especializado para los distintos tipos de Widgets del Dashboard.
 */
export const WidgetSkeleton = ({ widgetId = '', meta = {}, isLight }) => {
  const id = widgetId.toLowerCase();

  // 1. Cronómetros y Temporizadores
  if (id.includes('cronometro') || id.includes('timer')) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '1.25rem',
        gap: '1rem',
        boxSizing: 'border-box'
      }}>
        {/* Título y badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Skeleton variant="text" width="40%" height="1.1rem" isLight={isLight} />
          <Skeleton variant="badge" width="3.5rem" height="1.1rem" isLight={isLight} />
        </div>

        {/* Display grande del temporizador */}
        <div style={{
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.25)',
          borderRadius: 'var(--border-radius, 8px)',
          border: '1px solid var(--border-color)',
          padding: '1rem',
          gap: '0.75rem',
          minHeight: '100px'
        }}>
          <Skeleton width="65%" height="3.5rem" borderRadius="8px" isLight={isLight} />
          <Skeleton variant="text" width="30%" height="0.8rem" isLight={isLight} />
        </div>

        {/* Botones de acción inferiores */}
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
          <Skeleton variant="button" width="30%" height="2.2rem" isLight={isLight} />
          <Skeleton variant="button" width="30%" height="2.2rem" isLight={isLight} />
          <Skeleton variant="button" width="30%" height="2.2rem" isLight={isLight} />
        </div>
      </div>
    );
  }

  // 2. Listas de Oradores / Mociones / Países
  if (id.includes('lista') || id.includes('orador') || id.includes('mocion') || id.includes('paises') || id.includes('historico')) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '1rem',
        gap: '0.75rem',
        boxSizing: 'border-box'
      }}>
        {/* Cabecera / Buscador o Input */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Skeleton width="100%" height="2.2rem" borderRadius="6px" isLight={isLight} />
          <Skeleton variant="button" width="3.5rem" height="2.2rem" isLight={isLight} />
        </div>

        {/* Lista de elementos / oradores */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          flex: 1,
          overflow: 'hidden'
        }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
                <Skeleton variant="circle" width="1.6rem" height="1.6rem" isLight={isLight} />
                <Skeleton variant="text" width={`${45 + (index % 3) * 15}%`} height="0.9rem" isLight={isLight} />
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <Skeleton variant="badge" width="2.5rem" height="1.2rem" isLight={isLight} />
                <Skeleton variant="circle" width="1.4rem" height="1.4rem" isLight={isLight} />
              </div>
            </div>
          ))}
        </div>

        {/* Barra inferior */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton variant="text" width="25%" height="0.75rem" isLight={isLight} />
          <Skeleton variant="button" width="4.5rem" height="1.8rem" isLight={isLight} />
        </div>
      </div>
    );
  }

  // 3. Votaciones y Mapas
  if (id.includes('votacion') || id.includes('mapa') || id.includes('matriz') || id.includes('selector')) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '1rem',
        gap: '0.75rem',
        boxSizing: 'border-box'
      }}>
        {/* Tarjetas de recuento métrico */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '0.5rem',
                backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                gap: '0.25rem'
              }}
            >
              <Skeleton variant="text" width="60%" height="0.7rem" isLight={isLight} />
              <Skeleton variant="text" width="40%" height="1.4rem" isLight={isLight} />
            </div>
          ))}
        </div>

        {/* Barra de progreso / Votos */}
        <Skeleton width="100%" height="0.75rem" borderRadius="9999px" isLight={isLight} />

        {/* Grid de países o mapa */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.4rem',
          flex: 1,
          overflow: 'hidden'
        }}>
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.4rem',
                backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                gap: '0.3rem'
              }}
            >
              <Skeleton variant="circle" width="1.2rem" height="1.2rem" isLight={isLight} />
              <Skeleton variant="text" width="70%" height="0.6rem" isLight={isLight} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. Crisis / Noticias / Pizarra / Editor / Enmiendas
  if (id.includes('crisis') || id.includes('noticias') || id.includes('pizarra') || id.includes('enmienda') || id.includes('agenda')) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '1rem',
        gap: '0.75rem',
        boxSizing: 'border-box'
      }}>
        {/* Barra de herramientas / Título */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton variant="text" width="45%" height="1rem" isLight={isLight} />
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <Skeleton variant="button" width="3rem" height="1.8rem" isLight={isLight} />
            <Skeleton variant="button" width="3rem" height="1.8rem" isLight={isLight} />
          </div>
        </div>

        {/* Cuerpo principal */}
        <div style={{
          flex: 1,
          backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem'
        }}>
          <Skeleton variant="badge" width="5rem" height="1.2rem" isLight={isLight} />
          <SkeletonText lines={3} lineHeight="0.85rem" isLight={isLight} />
          <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
            <Skeleton variant="button" width="45%" height="2rem" isLight={isLight} />
            <Skeleton variant="button" width="45%" height="2rem" isLight={isLight} />
          </div>
        </div>
      </div>
    );
  }

  // 5. Widget Genérico por defecto
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '1rem',
      gap: '0.75rem',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton variant="text" width="50%" height="1rem" isLight={isLight} />
        <Skeleton variant="badge" width="3rem" height="1rem" isLight={isLight} />
      </div>

      <div style={{
        flex: 1,
        backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        justifyContent: 'center'
      }}>
        <SkeletonText lines={3} lineHeight="0.85rem" isLight={isLight} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <Skeleton variant="button" width="5rem" height="2rem" isLight={isLight} />
      </div>
    </div>
  );
};

export default WidgetSkeleton;
