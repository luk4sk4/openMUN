import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import CronometroEnmiendas from './CronometroEnmiendas';
import MiniVotacion from './MiniVotacion';

/**
 * Panel Unificado de Enmiendas:
 * Combina el cronómetro de orador para debate de enmiendas y la votación (mano alzada / roll call)
 * componiendo CronometroEnmiendas y MiniVotacion.
 */
const PanelEnmiendasVotacion = () => {
  const { t } = useTranslation();
  const { paises: rawPaises = [], votacionSesion } = useSession();
  const [vistaPanel, setVistaPanel] = useState('unificada'); // 'unificada' | 'cronometro' | 'votacion'

  const paises = Array.isArray(rawPaises) ? rawPaises : [];
  const rawAsunto = votacionSesion?.asunto;
  const asunto = typeof rawAsunto === 'string' ? rawAsunto : '';
  const tipoVotacion = votacionSesion?.tipoVotacion || 'procedural';

  const proponenteDetectado = useMemo(() => {
    const match = asunto.match(/\(([^)]+)\)$/);
    if (match && match[1]) {
      const nombrePosible = match[1].trim();
      const paisObj = paises.find(p => p && p.nombre?.toLowerCase() === nombrePosible.toLowerCase());
      return { nombre: nombrePosible, paisObj };
    }
    return null;
  }, [asunto, paises]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--panel-color)',
      color: 'var(--text-color)',
      borderRadius: 'var(--border-radius, 6px)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* ── CABECERA PRINCIPAL UNIFICADA ── */}
      <div style={{
        padding: '0.65rem 0.95rem',
        borderBottom: '1px solid var(--subborder-color)',
        backgroundColor: 'var(--card-header-bg)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.6rem',
        flexShrink: 0
      }}>
        <div style={{ minWidth: 0, flex: '1 1 10rem' }}>
          <div style={{
            fontSize: '0.88rem',
            fontWeight: '800',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {asunto || t('ui.amendmentDebateAndVoting')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '2px' }}>
            <span>{tipoVotacion === 'substantive' ? t('voting.substantiveShort') : t('voting.proceduralShort')}</span>
            {proponenteDetectado && (
              <>
                <span>·</span>
                <CountryFlag country={proponenteDetectado.paisObj} size="xs" />
                <span style={{ fontWeight: '650', color: 'var(--text-color)' }}>{proponenteDetectado.nombre}</span>
              </>
            )}
          </div>
        </div>

        {/* Selector de Vista: Unificada / Solo Cronómetro / Solo Votación */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '3px',
          backgroundColor: 'var(--input-bg)',
          padding: '3px',
          borderRadius: 'var(--border-radius, 6px)',
          border: '1px solid var(--border-color)'
        }}>
          {[
            { id: 'unificada', label: t('ui.full'), title: t('ui.fullViewTimerVoting') },
            { id: 'cronometro', label: t('timers.title'), title: t('ui.speakerTimerOnly') },
            { id: 'votacion', label: t('tabs.voting'), title: t('ui.votingOnly') }
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setVistaPanel(opt.id)}
              title={opt.title}
              aria-pressed={vistaPanel === opt.id}
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: vistaPanel === opt.id ? '750' : '600',
                borderRadius: '4px',
                border: 'none',
                background: vistaPanel === opt.id ? 'var(--btn-bg)' : 'transparent',
                color: vistaPanel === opt.id ? 'var(--btn-text)' : 'var(--text-color)',
                cursor: 'pointer',
                transition: 'all 0.12s ease'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CUERPO PRINCIPAL ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {(vistaPanel === 'unificada' || vistaPanel === 'cronometro') && (
          <div style={{ flex: vistaPanel === 'cronometro' ? 1 : '0 0 auto' }}>
            <CronometroEnmiendas compact={vistaPanel === 'unificada'} />
          </div>
        )}
        {(vistaPanel === 'unificada' || vistaPanel === 'votacion') && (
          <div style={{ flex: 1, minHeight: 0 }}>
            <MiniVotacion hideHeader />
          </div>
        )}
      </div>
    </div>
  );
};

export default PanelEnmiendasVotacion;
