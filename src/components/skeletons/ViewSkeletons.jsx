import React from 'react';
import { Skeleton, SkeletonText } from '../common/Skeleton';

/**
 * 1. Skeleton de la Vista Principal (Dashboard de Mesa / Presidencia)
 */
export const DashboardSkeleton = ({ isLight }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-color)',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden'
    }}>
      {/* Navbar Superior Skeleton */}
      <header style={{
        height: '3.75rem',
        backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Skeleton variant="circle" width="2rem" height="2rem" isLight={isLight} />
          <Skeleton variant="text" width="6rem" height="1.2rem" isLight={isLight} />
        </div>

        {/* Tabs centrales */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="button" width="5.5rem" height="2rem" borderRadius="6px" isLight={isLight} />
          ))}
        </div>

        {/* Botones de acción derecha */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Skeleton variant="badge" width="4.5rem" height="1.8rem" isLight={isLight} />
          <Skeleton variant="circle" width="2rem" height="2rem" isLight={isLight} />
          <Skeleton variant="circle" width="2rem" height="2rem" isLight={isLight} />
        </div>
      </header>

      {/* Subheader Skeleton */}
      <div style={{
        height: '3rem',
        backgroundColor: 'var(--subnav-bg)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Skeleton variant="text" width="12rem" height="1.1rem" isLight={isLight} />
          <Skeleton variant="badge" width="6rem" height="1.4rem" isLight={isLight} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Skeleton variant="button" width="7rem" height="1.8rem" isLight={isLight} />
        </div>
      </div>

      {/* Cuadrícula de Tarjetas de Widgets Skeleton */}
      <main style={{ flex: 1, padding: '1rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
          width: '100%'
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '280px',
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius, 8px)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Skeleton variant="text" width="40%" height="1.1rem" isLight={isLight} />
                <Skeleton variant="badge" width="3rem" height="1.1rem" isLight={isLight} />
              </div>
              <div style={{ flex: 1, backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '0.75rem' }}>
                <SkeletonText lines={4} lineHeight="0.85rem" isLight={isLight} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <Skeleton variant="button" width="4rem" height="1.8rem" isLight={isLight} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

/**
 * 2. Skeleton de la Vista de Delegado
 */
export const DelegateSkeleton = ({ isLight }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-color)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Cabecera del Delegado */}
      <header style={{
        backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.75rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Skeleton variant="circle" width="2.5rem" height="2.5rem" isLight={isLight} />
          <div>
            <Skeleton variant="text" width="8rem" height="1.1rem" isLight={isLight} />
            <Skeleton variant="text" width="5rem" height="0.75rem" style={{ marginTop: '4px' }} isLight={isLight} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Skeleton variant="badge" width="5.5rem" height="1.8rem" isLight={isLight} />
          <Skeleton variant="circle" width="2rem" height="2rem" isLight={isLight} />
          <Skeleton variant="button" width="5rem" height="2rem" isLight={isLight} />
        </div>
      </header>

      {/* Barra de Pestañas del Delegado */}
      <div style={{
        backgroundColor: 'var(--subnav-bg)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.5rem 1.25rem',
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto'
      }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="button" width="6.5rem" height="2.1rem" borderRadius="6px" isLight={isLight} />
        ))}
      </div>

      {/* Contenido Principal de Delegado */}
      <main style={{
        flex: 1,
        padding: '1.25rem',
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
        gap: '1.25rem'
      }}>
        {/* Panel Izquierdo: Oradores o Resolución */}
        <div style={{
          backgroundColor: 'var(--panel-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius, 8px)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton variant="text" width="35%" height="1.2rem" isLight={isLight} />
            <Skeleton variant="badge" width="4.5rem" height="1.4rem" isLight={isLight} />
          </div>
          <Skeleton width="100%" height="3.5rem" borderRadius="6px" isLight={isLight} />
          <SkeletonText lines={6} lineHeight="0.9rem" gap="0.75rem" isLight={isLight} />
        </div>

        {/* Panel Derecho: Solicitudes y Acciones */}
        <div style={{
          backgroundColor: 'var(--panel-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius, 8px)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <Skeleton variant="text" width="60%" height="1.1rem" isLight={isLight} />
          <Skeleton variant="button" width="100%" height="3rem" borderRadius="8px" isLight={isLight} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                <Skeleton variant="text" width="40%" height="0.8rem" isLight={isLight} />
                <Skeleton variant="badge" width="3rem" height="1rem" isLight={isLight} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

/**
 * 3. Skeleton de la Vista de Secretaría
 */
export const SecretariatSkeleton = ({ isLight }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-color)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Topbar Secretaría */}
      <header style={{
        backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.75rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Skeleton variant="circle" width="2.2rem" height="2.2rem" isLight={isLight} />
          <div>
            <Skeleton variant="text" width="9rem" height="1.1rem" isLight={isLight} />
            <Skeleton variant="text" width="6rem" height="0.75rem" style={{ marginTop: '4px' }} isLight={isLight} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Skeleton variant="badge" width="6rem" height="2rem" isLight={isLight} />
          <Skeleton variant="button" width="5rem" height="2rem" isLight={isLight} />
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, padding: '1.5rem', maxWidth: '1400px', width: '100%', margin: '0 auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Metricas rápidas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ backgroundColor: 'var(--panel-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Skeleton variant="text" width="50%" height="0.8rem" isLight={isLight} />
              <Skeleton variant="text" width="30%" height="1.6rem" isLight={isLight} />
            </div>
          ))}
        </div>

        {/* Panel de Comités / Matriz */}
        <div style={{ backgroundColor: 'var(--panel-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton variant="text" width="25%" height="1.2rem" isLight={isLight} />
            <Skeleton variant="button" width="6rem" height="2rem" isLight={isLight} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                <Skeleton variant="text" width="30%" height="1rem" isLight={isLight} />
                <Skeleton variant="badge" width="4rem" height="1.2rem" isLight={isLight} />
                <Skeleton variant="button" width="5rem" height="1.8rem" isLight={isLight} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

/**
 * 4. Skeleton de la Vista de Staff
 */
export const StaffSkeleton = ({ isLight }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-color)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <header style={{
        backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.75rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Skeleton variant="circle" width="2.2rem" height="2.2rem" isLight={isLight} />
          <Skeleton variant="text" width="8rem" height="1.1rem" isLight={isLight} />
        </div>
        <Skeleton variant="button" width="5rem" height="2rem" isLight={isLight} />
      </header>

      <main style={{ flex: 1, padding: '1.25rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.25rem' }}>
        <div style={{ backgroundColor: 'var(--panel-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Skeleton variant="text" width="40%" height="1.1rem" isLight={isLight} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <Skeleton variant="text" width="60%" height="0.9rem" isLight={isLight} />
              <Skeleton variant="text" width="80%" height="0.75rem" isLight={isLight} />
            </div>
          ))}
        </div>
        <div style={{ backgroundColor: 'var(--panel-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Skeleton variant="text" width="40%" height="1.1rem" isLight={isLight} />
          <Skeleton variant="button" width="100%" height="2.8rem" isLight={isLight} />
          <SkeletonText lines={4} lineHeight="0.85rem" isLight={isLight} />
        </div>
      </main>
    </div>
  );
};

/**
 * 5. Skeleton de la Vista de Backroom / Sala de Crisis
 */
export const BackroomSkeleton = ({ isLight }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-color)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <header style={{
        backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.75rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Skeleton variant="circle" width="2.2rem" height="2.2rem" isLight={isLight} />
          <div>
            <Skeleton variant="text" width="9rem" height="1.1rem" isLight={isLight} />
            <Skeleton variant="text" width="5rem" height="0.75rem" style={{ marginTop: '4px' }} isLight={isLight} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Skeleton variant="badge" width="5rem" height="1.8rem" isLight={isLight} />
          <Skeleton variant="button" width="5rem" height="1.8rem" isLight={isLight} />
        </div>
      </header>

      <main style={{ flex: 1, padding: '1.25rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '1.25rem' }}>
        <div style={{ backgroundColor: 'var(--panel-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Skeleton variant="text" width="40%" height="1.1rem" isLight={isLight} />
          <Skeleton width="100%" height="140px" borderRadius="6px" isLight={isLight} />
          <SkeletonText lines={4} lineHeight="0.85rem" isLight={isLight} />
        </div>
        <div style={{ backgroundColor: 'var(--panel-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Skeleton variant="text" width="50%" height="1.1rem" isLight={isLight} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                <Skeleton variant="text" width="70%" height="0.8rem" isLight={isLight} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

/**
 * 6. Skeleton de la Vista de Conferencia (Explorador y Gestión)
 */
export const ConferenceSkeleton = ({ isLight }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-color)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <header style={{
        backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Skeleton variant="circle" width="2.2rem" height="2.2rem" isLight={isLight} />
          <Skeleton variant="text" width="8rem" height="1.2rem" isLight={isLight} />
        </div>
        <Skeleton variant="button" width="5rem" height="2rem" isLight={isLight} />
      </header>

      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', width: '100%', margin: '0 auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Banner Hero */}
        <div style={{
          backgroundColor: 'var(--panel-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <Skeleton variant="text" width="40%" height="2rem" isLight={isLight} />
          <Skeleton variant="text" width="60%" height="1rem" isLight={isLight} />
          <Skeleton width="100%" maxWidth="450px" height="2.8rem" borderRadius="8px" isLight={isLight} />
        </div>

        {/* Grid de Comités / Conferencias */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ backgroundColor: 'var(--panel-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Skeleton variant="badge" width="4rem" height="1.2rem" isLight={isLight} />
              <Skeleton variant="text" width="70%" height="1.2rem" isLight={isLight} />
              <SkeletonText lines={2} lineHeight="0.8rem" isLight={isLight} />
              <Skeleton variant="button" width="100%" height="2.2rem" style={{ marginTop: '0.5rem' }} isLight={isLight} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

/**
 * 7. Skeleton de la Vista Unirse a Sala (JoinSessionView)
 */
export const JoinSessionSkeleton = ({ isLight }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-color)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: 'var(--panel-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
        boxSizing: 'border-box'
      }}>
        <Skeleton variant="circle" width="3.5rem" height="3.5rem" isLight={isLight} />
        <Skeleton variant="text" width="55%" height="1.4rem" isLight={isLight} />
        <Skeleton variant="text" width="75%" height="0.85rem" isLight={isLight} />

        {/* Roles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', width: '100%' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height="2.5rem" borderRadius="6px" isLight={isLight} />
          ))}
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          <Skeleton height="2.8rem" borderRadius="8px" isLight={isLight} />
          <Skeleton height="2.8rem" borderRadius="8px" isLight={isLight} />
        </div>

        {/* Botón de Enviar */}
        <Skeleton variant="button" width="100%" height="3rem" borderRadius="8px" isLight={isLight} />
      </div>
    </div>
  );
};

/**
 * 8. Skeleton para Páginas de Documento (Privacidad, Términos y Condiciones)
 */
export const PageSkeleton = ({ isLight }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-color)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <header style={{
        backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--border-color)',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Skeleton variant="circle" width="2rem" height="2rem" isLight={isLight} />
          <Skeleton variant="text" width="7rem" height="1.1rem" isLight={isLight} />
        </div>
        <Skeleton variant="button" width="5rem" height="2rem" isLight={isLight} />
      </header>

      <main style={{
        flex: 1,
        maxWidth: '850px',
        width: '100%',
        margin: '0 auto',
        padding: '2.5rem 1.5rem',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        <Skeleton variant="badge" width="6rem" height="1.4rem" isLight={isLight} />
        <Skeleton variant="text" width="60%" height="2rem" isLight={isLight} />
        <Skeleton variant="text" width="30%" height="0.9rem" isLight={isLight} />

        <div style={{
          backgroundColor: 'var(--panel-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <Skeleton variant="text" width="40%" height="1.3rem" isLight={isLight} />
          <SkeletonText lines={5} lineHeight="0.9rem" isLight={isLight} />
          <div style={{ height: '1rem' }} />
          <Skeleton variant="text" width="45%" height="1.3rem" isLight={isLight} />
          <SkeletonText lines={4} lineHeight="0.9rem" isLight={isLight} />
        </div>
      </main>
    </div>
  );
};
