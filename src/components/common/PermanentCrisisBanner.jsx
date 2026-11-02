import i18n from '../../languages/index.js';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Flame, 
  ShieldAlert, 
  Megaphone, 
  TrendingUp, 
  Zap, 
  Radio, 
  Clock, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Sliders, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff,
  Globe,

} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useTranslation } from 'react-i18next';
import CountryFlag from './CountryFlag';

const CATEGORIAS = {
  CRITICA: {
    get nombre() { return i18n.t('ui.breakingNews'); },
    get badge() { return i18n.t('ui.breakingNews2'); },
    color: 'var(--danger-color)',
    bg: 'var(--danger-soft)',
    border: 'var(--danger-color)',
    icon: Flame
  },
  MILITAR: {
    get nombre() { return i18n.t('ui.militaryAlert'); },
    get badge() { return i18n.t('ui.militaryAlert2'); },
    color: 'var(--warning-color)',
    bg: 'var(--warning-soft)',
    border: 'var(--warning-color)',
    icon: ShieldAlert
  },
  DIPLOMATICA: {
    get nombre() { return i18n.t('ui.announcement2'); },
    get badge() { return i18n.t('ui.diplomaticAnnouncement'); },
    color: 'var(--info-color)',
    bg: 'var(--info-soft)',
    border: 'var(--info-color)',
    icon: Megaphone
  },
  ECONOMICA: {
    get nombre() { return i18n.t('ui.financialCrisis'); },
    get badge() { return i18n.t('ui.economicImpact'); },
    color: 'var(--accent-color)',
    bg: 'var(--accent-soft)',
    border: 'var(--accent-color)',
    icon: TrendingUp
  },
  CIBERNETICA: {
    get nombre() { return i18n.t('ui.cyberattack'); },
    get badge() { return i18n.t('ui.leakCyber'); },
    color: 'var(--success-color)',
    bg: 'var(--success-soft)',
    border: 'var(--success-color)',
    icon: Zap
  }
};

const PermanentCrisisBanner = ({ isLight }) => {
  const { t } = useTranslation();
  const { paises } = useSession();

  // Estado del ajuste de activación del banner permanente
  const [bannerActivo, setBannerActivo] = useState(() => {
    const saved = localStorage.getItem('openmun_permanent_banner_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [modoExpandido, setModoExpandido] = useState(() => {
    const saved = localStorage.getItem('openmun_permanent_banner_expanded');
    return saved !== null ? saved === 'true' : false;
  });

  const [eventoCrisis, setEventoCrisis] = useState(null);
  const [relojSimulacion, setRelojSimulacion] = useState({ dia: 1, horas: 8, minutos: 30 });
  const [mostrarOpciones, setMostrarOpciones] = useState(false);

  // Sincronizar ajuste en localStorage
  useEffect(() => {
    localStorage.setItem('openmun_permanent_banner_enabled', String(bannerActivo));
  }, [bannerActivo]);

  useEffect(() => {
    localStorage.setItem('openmun_permanent_banner_expanded', String(modoExpandido));
  }, [modoExpandido]);

  const lastEventosRawRef = useRef(null);
  const lastRelojRawRef = useRef(null);

  // Recargar evento proyectado
  const recargarEvento = () => {
    try {
      const savedEventos = localStorage.getItem('openmun_crisis_eventos');
      if (savedEventos !== lastEventosRawRef.current) {
        lastEventosRawRef.current = savedEventos;
        if (savedEventos) {
          const parsed = JSON.parse(savedEventos);
          const fijado = parsed.find(e => e.fijadoComoBanner) || parsed[0] || null;
          setEventoCrisis(fijado);
        } else {
          setEventoCrisis(null);
        }
      }

      const savedReloj = localStorage.getItem('openmun_crisis_reloj');
      if (savedReloj !== lastRelojRawRef.current) {
        lastRelojRawRef.current = savedReloj;
        if (savedReloj) {
          setRelojSimulacion(JSON.parse(savedReloj));
        }
      }
    } catch (e) {
      console.debug('Error recargando banner permanente de crisis:', e);
    }
  };

  useEffect(() => {
    recargarEvento();

    const handleUpdate = () => recargarEvento();
    window.addEventListener('openmun_crisis_update', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    const interval = setInterval(recargarEvento, 4000);

    return () => {
      window.removeEventListener('openmun_crisis_update', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  // Si no está habilitado o no hay evento, no renderizar nada
  if (!bannerActivo || !eventoCrisis) {
    return null;
  }

  const catMeta = CATEGORIAS[eventoCrisis.categoria] || CATEGORIAS.CRITICA;
  const CategoryIcon = catMeta.icon || Flame;
  const formatoHora = `${t('timers.day', 'Día')} ${relojSimulacion.dia || 1} · ${String(relojSimulacion.horas || 8).padStart(2, '0')}:${String(relojSimulacion.minutos || 0).padStart(2, '0')} hrs`;

  return (
    <div style={{
      width: '100%',
      backgroundColor: 'var(--card-header-bg)',
      borderBottom: '1px solid var(--border-color)',
      borderLeft: `4px solid ${catMeta.color}`,
      boxShadow: 'none',
      color: 'var(--text-color)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      zIndex: 900,
      userSelect: 'none',
      animation: 'slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* ─── FILA PRINCIPAL DEL BANNER PERMANENTE ───────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 16px',
        gap: '10px',
        minHeight: '36px'
      }}>
        {/* Lado Izquierdo: Badge de Última Hora */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: catMeta.bg,
            color: catMeta.color,
            border: `1px solid ${catMeta.border}`,
            padding: '2px 8px',
            borderRadius: 'var(--border-radius, 6px)',
            fontSize: '0.68rem',
            fontWeight: '750',
            letterSpacing: '0.04em'
          }}>
            <Radio size={11} style={{ animation: 'pulse 1.2s infinite' }} />
            <span>{catMeta.badge}</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            padding: '2px 6px',
            borderRadius: 'var(--border-radius, 6px)',
            fontSize: '0.68rem',
            color: 'var(--text-color)',
            fontWeight: '600',
            fontVariantNumeric: 'tabular-nums'
          }}>
            <Clock size={11} style={{ color: 'var(--accent-color)' }} />
            <span>{formatoHora}</span>
          </div>
        </div>

        {/* Centro: Titular de la Noticia de Crisis */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        }}>
          <span style={{
            fontSize: '0.84rem',
            fontWeight: '800',
            color: 'var(--text-color)',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {eventoCrisis.titulo}
          </span>

          {eventoCrisis.fuente && (
            <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)', flexShrink: 0 }}>
              ({t('crisis.source', 'Fuente')}: {eventoCrisis.fuente})
            </span>
          )}
        </div>

        {/* Lado Derecho: Países Implicados y Acciones del Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Banderas de Países Implicados */}
          {eventoCrisis.paisesInvolucrados && eventoCrisis.paisesInvolucrados.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {eventoCrisis.paisesInvolucrados.slice(0, 3).map(nP => {
                const pObj = paises.find(p => p.nombre === nP) || { nombre: nP, bandera: '🌐' };
                return (
                  <div
                    key={nP}
                    title={nP}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      backgroundColor: 'var(--input-bg)',
                      padding: '2px 6px',
                      borderRadius: 'var(--border-radius, 6px)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.68rem',
                      fontWeight: '600',
                      color: 'var(--text-color)'
                    }}
                  >
                    <CountryFlag bandera={pObj.bandera} nombre={pObj.nombre} size="xs" />
                    <span>{pObj.nombre}</span>
                  </div>
                );
              })}
              {eventoCrisis.paisesInvolucrados.length > 3 && (
                <span style={{ fontSize: '0.65rem', color: 'var(--muted-text)' }}>
                  +{eventoCrisis.paisesInvolucrados.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Botón Expandir / Contraer Detalles */}
          <button
            onClick={() => setModoExpandido(!modoExpandido)}
            title={modoExpandido ? t('ui.collapseDetails') : t('ui.viewFullDetails')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius, 6px)',
              color: 'var(--text-color)',
              padding: '3px 8px',
              fontSize: '0.7rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {modoExpandido ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <span>{modoExpandido ? t('crisis.less', 'Menos') : t('crisis.details', 'Detalles')}</span>
          </button>

          {/* Botón Ocultar / Desactivar Banner Permanente */}
          <button
            onClick={() => setBannerActivo(false)}
            title={t('ui.hidePermanentBannerYouCanEnableItAgainInSettings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-text)',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '4px'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ─── DETALLES EXPANDIDOS (MODO EXPANDIDO) ────────────────────────── */}
      {modoExpandido && (
        <div style={{
          padding: '10px 16px',
          backgroundColor: 'var(--panel-color)',
          borderTop: '1px solid var(--subborder-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            {eventoCrisis.imagen && (
              <div style={{
                width: '100px',
                height: '60px',
                borderRadius: '4px',
                overflow: 'hidden',
                border: `1px solid ${catMeta.color}`,
                flexShrink: 0,
                backgroundColor: '#000'
              }}>
                <img
                  src={eventoCrisis.imagen}
                  alt={t('ui.broadcast')}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}
            <div style={{
              flex: 1,
              fontSize: '0.82rem',
              color: 'var(--text-color)',
              lineHeight: '1.45',
              backgroundColor: 'var(--card-header-bg)',
              padding: '8px 12px',
              borderRadius: 'var(--border-radius, 6px)',
              border: '1px solid var(--border-color)',
              borderLeft: `3px solid ${catMeta.color}`
            }}>
              {eventoCrisis.descripcion}
            </div>
          </div>

          {eventoCrisis.paisesInvolucrados && eventoCrisis.paisesInvolucrados.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--muted-text)' }}>
                {t('crisis.involvedDelegationsUpper', 'TODAS LAS DELEGACIONES IMPLICADAS')}:
              </span>
              {eventoCrisis.paisesInvolucrados.map(nP => {
                const pObj = paises.find(p => p.nombre === nP) || { nombre: nP, bandera: '🌐' };
                return (
                  <div
                    key={nP}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: 'var(--input-bg)',
                      padding: '2px 6px',
                      borderRadius: 'var(--border-radius, 6px)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      color: 'var(--text-color)'
                    }}
                  >
                    <CountryFlag bandera={pObj.bandera} nombre={pObj.nombre} size="xs" />
                    <span>{pObj.nombre}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PermanentCrisisBanner;
