import React from 'react';
import { Landmark, Scroll } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DashboardSubheader = ({
  nombreComite,
  agendaSesion,
  tipoSesion = 'formal',
  cambiarTipoSesion,
  isLight = false
}) => {
  const { t } = useTranslation();

  return (
    <div style={{
      position: 'relative',
      zIndex: 900,
      backgroundColor: 'var(--card-header-bg)',
      borderBottom: '1px solid var(--subborder-color)',
      padding: '0.4rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '0.8rem',
      color: 'var(--text-color)',
      gap: '0.75rem',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1, overflow: 'hidden' }}>
        {/* Badge Comité */}
        {nombreComite ? (
          <span style={{
            fontSize: '0.7rem',
            fontWeight: '700',
            color: 'var(--btn-text)',
            backgroundColor: 'var(--btn-bg)',
            padding: '0.2rem 0.55rem',
            borderRadius: '6px',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}>
            <Landmark size={12} /> {nombreComite}
          </span>
        ) : (
          <span style={{
            fontSize: '0.7rem',
            fontWeight: '600',
            color: 'var(--muted-text)',
            backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
            border: '1px dashed var(--border-color)',
            padding: '0.2rem 0.55rem',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <Landmark size={12} /> {t('header.noCommittee', 'Sin comité')}
          </span>
        )}

        {/* Separador */}
        <span style={{ opacity: 0.25, flexShrink: 0 }}>·</span>

        {/* Tema de Agenda */}
        {agendaSesion?.temaActual ? (
          <>
            <Scroll size={13} style={{ opacity: 0.7, flexShrink: 0 }} />
            <span style={{ fontWeight: '600', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {agendaSesion.temaActual}
            </span>
          </>
        ) : (
          <span style={{ fontWeight: '500', opacity: 0.4, fontStyle: 'italic', fontSize: '0.78rem' }}>
            {t('header.noAgenda', 'Agenda no establecida')}
          </span>
        )}
      </div>

      {/* Selector Rápido de Estado de Sesión (Mesa Directiva) */}
      {cambiarTipoSesion && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
          borderRadius: '8px',
          padding: '2px',
          gap: '2px'
        }}>
          {[
            { id: 'formal', label: 'Formal', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.18)' },
            { id: 'informal', label: 'Informal', color: '#eab308', bg: 'rgba(234, 179, 8, 0.18)' },
            { id: 'receso', label: 'Receso', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.18)' },
            { id: 'votacion', label: 'Votando', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.18)' }
          ].map(s => {
            const isActivo = (tipoSesion || 'formal') === s.id;
            return (
              <button
                key={s.id}
                onClick={() => cambiarTipoSesion(s.id)}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  border: isActivo ? `1px solid ${s.color}` : '1px solid transparent',
                  backgroundColor: isActivo ? (isLight ? '#ffffff' : s.bg) : 'transparent',
                  color: isActivo ? s.color : 'var(--muted-text)',
                  fontWeight: isActivo ? '800' : '600',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: isActivo ? `0 0 8px ${s.color}33` : 'none',
                  transition: 'all 0.15s ease'
                }}
                title={`Cambiar estado de sesión a ${s.label}`}
              >
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: s.color,
                  boxShadow: isActivo ? `0 0 6px ${s.color}` : 'none'
                }} />
                {s.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardSubheader;
