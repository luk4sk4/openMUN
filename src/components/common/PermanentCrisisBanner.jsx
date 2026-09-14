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
  Sparkles
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useTranslation } from 'react-i18next';
import CountryFlag from './CountryFlag';

const CATEGORIAS = {
  CRITICA: {
    nombre: 'Última Hora',
    badge: '🔴 ÚLTIMA HORA',
    color: '#ef4444',
    bg: '#b91c1c',
    icon: Flame
  },
  MILITAR: {
    nombre: 'Alerta Militar',
    badge: '⚔️ ALERTA MILITAR',
    color: '#f97316',
    bg: '#c2410c',
    icon: ShieldAlert
  },
  DIPLOMATICA: {
    nombre: 'Comunicado',
    badge: '🌐 COMUNICADO DIPLOMÁTICO',
    color: '#3b82f6',
    bg: '#1d4ed8',
    icon: Megaphone
  },
  ECONOMICA: {
    nombre: 'Crisis Financiera',
    badge: '💵 IMPACTO ECONÓMICO',
    color: '#a855f7',
    bg: '#7e22ce',
    icon: TrendingUp
  },
  CIBERNETICA: {
    nombre: 'Ciberataque',
    badge: '⚡ FILTRACIÓN / CIBER',
    color: '#10b981',
    bg: '#047857',
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
      backgroundColor: '#0a0d14',
      borderBottom: `2px solid ${catMeta.color}`,
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      color: '#ffffff',
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
            backgroundColor: catMeta.color,
            color: '#ffffff',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.68rem',
            fontWeight: '900',
            letterSpacing: '0.6px',
            boxShadow: `0 0 10px ${catMeta.color}88`
          }}>
            <Radio size={11} style={{ animation: 'pulse 1.2s infinite' }} />
            <span>{catMeta.badge}</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.66rem',
            color: '#cbd5e1',
            fontWeight: '700'
          }}>
            <Clock size={10} color="#60a5fa" />
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
            color: '#ffffff',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {eventoCrisis.titulo}
          </span>

          {eventoCrisis.fuente && (
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', opacity: 0.8, flexShrink: 0 }}>
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
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      padding: '2px 5px',
                      borderRadius: '3px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      fontSize: '0.68rem',
                      fontWeight: '600'
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
            title={modoExpandido ? "Contraer detalles" : "Ver detalles completos"}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '4px',
              color: '#e2e8f0',
              padding: '2px 6px',
              fontSize: '0.68rem',
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
            title="Ocultar banner permanente (puedes reactivarlo en ajustes)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
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
          padding: '8px 16px 10px',
          backgroundColor: '#07090f',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
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
                  alt="Transmisión"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}
            <div style={{
              flex: 1,
              fontSize: '0.82rem',
              color: '#e2e8f0',
              lineHeight: '1.45',
              backgroundColor: 'rgba(255,255,255,0.03)',
              padding: '6px 10px',
              borderRadius: '6px',
              borderLeft: `3px solid ${catMeta.color}`
            }}>
              {eventoCrisis.descripcion}
            </div>
          </div>

          {eventoCrisis.paisesInvolucrados && eventoCrisis.paisesInvolucrados.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#94a3b8' }}>
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
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      fontSize: '0.7rem',
                      fontWeight: '600'
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
