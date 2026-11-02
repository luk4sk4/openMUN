import i18n from '../../languages/index.js';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Tv, 
  Radio, 
  Settings, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Flame, 
  ShieldAlert, 
  Megaphone, 
  TrendingUp, 
  Zap, 
  Clock, 
  Sliders, 
  X, 
  Check, 
  RotateCcw,
  Globe,
  Film
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../../context/AccessibilityContext';
import CountryFlag from '../common/CountryFlag';
import { playBreakingNewsAlert, playEmergencyPulse } from '../../utils/audioAlerts';

// Categorías de Crisis y tokens semánticos (OpenMUN Design System)
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

const CANALES_PRESET = [
  'UN-TV WORLD NEWS',
  'CRISIS NEWS 24/7',
  'REUTERS DISPATCH',
  'CNN INTERNATIONAL',
  'BBC WORLD BREAKING',
  'SITUATION ROOM LIVE',
  'AL JAZEERA CRISIS'
];

const TeleNoticiasCrisis = () => {
  const { t } = useTranslation();
  const { isLight } = useAccessibility();
  const { paises } = useSession();

  // Estados persistentes de configuración de la TV
  const [configTV, setConfigTV] = useState(() => {
    const saved = localStorage.getItem('openmun_tv_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      canal: 'UN-TV WORLD NEWS',
      velocidadTicker: 'normal', // 'lento' | 'normal' | 'rapido' | 'pausado'
      mostrarReloj: true,
      mostrarBanderas: true,
      mostrarFuente: true,
      sonidoAlerta: true,
      tipoSonido: 'breaking', // 'breaking' | 'siren'
      volumen: 0.4,
      tickerPersonalizado: ''
    };
  });

  // Estado del evento actualmente proyectado
  const [eventoProyectado, setEventoProyectado] = useState(null);
  const [todosLosEventos, setTodosLosEventos] = useState([]);
  const [relojSimulacion, setRelojSimulacion] = useState({ dia: 1, horas: 8, minutos: 30 });
  const [panelAjustesAbierto, setPanelAjustesAbierto] = useState(false);
  const [fullScreenMode, setFullScreenMode] = useState(false);

  const prevBannerIdRef = useRef(null);

  // Guardar configuración en localStorage
  useEffect(() => {
    localStorage.setItem('openmun_tv_config', JSON.stringify(configTV));
  }, [configTV]);

  const lastEventosRawRef = useRef(null);
  const lastRelojRawRef = useRef(null);

  // Cargar y sincronizar eventos de crisis en tiempo real
  const recargarEventosCrisis = () => {
    try {
      const savedEventos = localStorage.getItem('openmun_crisis_eventos');
      if (savedEventos !== lastEventosRawRef.current) {
        lastEventosRawRef.current = savedEventos;
        if (savedEventos) {
          const parsed = JSON.parse(savedEventos);
          setTodosLosEventos(parsed);
          const fijado = parsed.find(e => e.fijadoComoBanner) || parsed[0] || null;
          setEventoProyectado(fijado);

          // Si cambió el evento activo y el sonido está activado, emitir alerta
          if (fijado && fijado.id !== prevBannerIdRef.current) {
            if (prevBannerIdRef.current !== null && configTV.sonidoAlerta) {
              if (configTV.tipoSonido === 'siren') {
                playEmergencyPulse(configTV.volumen);
              } else {
                playBreakingNewsAlert(configTV.volumen);
              }
            }
            prevBannerIdRef.current = fijado.id;
          }
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
      console.debug('Error sincronizando TV de crisis:', e);
    }
  };

  useEffect(() => {
    recargarEventosCrisis();

    const handleCustomUpdate = () => recargarEventosCrisis();
    window.addEventListener('openmun_crisis_update', handleCustomUpdate);
    window.addEventListener('storage', handleCustomUpdate);

    const interval = setInterval(recargarEventosCrisis, 4000);

    return () => {
      window.removeEventListener('openmun_crisis_update', handleCustomUpdate);
      window.removeEventListener('storage', handleCustomUpdate);
      clearInterval(interval);
    };
  }, [configTV.sonidoAlerta, configTV.tipoSonido, configTV.volumen]);

  // Texto continuo del ticker
  const tickerText = useMemo(() => {
    if (configTV.tickerPersonalizado && configTV.tickerPersonalizado.trim()) {
      return configTV.tickerPersonalizado;
    }
    if (!todosLosEventos || todosLosEventos.length === 0) {
      return i18n.t('ui.openmunLiveBroadcastCrisisRoomActiveAwaitingNewChairDirectives', 'GABINETE DE CRISIS OPENMUN · CANAL ACTIVO · ESPERANDO DIRECTIVAS DE LA MESA DE PRESIDENCIA');
    }
    return todosLosEventos
      .map(e => `[${e.categoria}] ${e.titulo.toUpperCase()} (${e.horaSimulada})`)
      .join('  +++  ');
  }, [todosLosEventos, configTV.tickerPersonalizado]);

  // Duración de animación del ticker según velocidad
  const tickerDuration = useMemo(() => {
    if (configTV.velocidadTicker === 'lento') return '45s';
    if (configTV.velocidadTicker === 'rapido') return '15s';
    return '26s';
  }, [configTV.velocidadTicker]);

  const catMeta = eventoProyectado 
    ? (CATEGORIAS[eventoProyectado.categoria] || CATEGORIAS.CRITICA) 
    : CATEGORIAS.CRITICA;
  const CategoryIcon = catMeta.icon || Flame;

  const formatoHora = t('ui.dayHrs', {
    v0: relojSimulacion.dia || 1,
    v1: String(relojSimulacion.horas || 8).padStart(2, '0'),
    v2: String(relojSimulacion.minutos || 0).padStart(2, '0')
  });

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'transparent',
      color: 'var(--text-color)',
      boxSizing: 'border-box',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: 'var(--font-family)'
    }}>
      {/* ─── MARCO EXTERIOR DEL WIDGET (OPENMUN DESIGN SYSTEM) ─────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--panel-color)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius, 6px)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* ─── PANTALLA DE EMISIÓN DE LA TV ────────────────────────────────── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: isLight ? 'var(--input-bg)' : 'rgba(0, 0, 0, 0.15)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* ── BARRA SUPERIOR DE TRANSMISIÓN TV (CHYRON BAR) ──────────────── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 12px',
            backgroundColor: 'var(--card-header-bg)',
            borderBottom: '1px solid var(--subborder-color)',
            zIndex: 10,
            gap: '8px'
          }}>
            {/* Logotipo del Canal de TV y badge EN VIVO */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-color)',
                border: '1px solid var(--border-color)',
                padding: '2px 8px',
                borderRadius: 'var(--border-radius, 4px)',
                fontSize: '0.72rem',
                fontWeight: '750',
                letterSpacing: '0.04em'
              }}>
                {configTV.canal}
              </div>

              {/* Indicador EN VIVO con semántica clara */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: 'var(--danger-soft)',
                color: 'var(--danger-color)',
                border: '1px solid var(--danger-color)',
                padding: '2px 7px',
                borderRadius: 'var(--border-radius, 4px)',
                fontSize: '0.68rem',
                fontWeight: '700',
                letterSpacing: '0.03em'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--danger-color)',
                  display: 'inline-block'
                }} />
                <span>{t('crisis.live', 'EN VIVO')}</span>
              </div>
            </div>

            {/* Reloj de Simulación y Botones de Control de la TV */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {configTV.mostrarReloj && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  padding: '2px 7px',
                  borderRadius: 'var(--border-radius, 4px)',
                  fontSize: '0.7rem',
                  fontWeight: '650',
                  color: 'var(--muted-text)',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  <Clock size={12} style={{ color: 'var(--accent-color)' }} />
                  <span>{formatoHora}</span>
                </div>
              )}

              {/* Botón Ajustes de TV */}
              <button
                type="button"
                onClick={() => setPanelAjustesAbierto(true)}
                title={t('crisis.tvSettings', 'Configuración de la Televisión')}
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  color: 'var(--text-color)',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <Settings size={13} />
              </button>
            </div>
          </div>

          {/* ── CUERPO PRINCIPAL DE LA PANTALLA (NOTICIA O STANDBY) ───────── */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: fullScreenMode ? '24px 20px' : '14px 16px',
            position: 'relative',
            backgroundColor: 'transparent',
            overflow: 'hidden'
          }}>
            {!eventoProyectado ? (
              /* ESTADO STANDBY CUANDO NO HAY NOTICIA PROYECTADA (EMPTY STATE SOBRIO) */
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: '10px',
                padding: '24px 16px',
                zIndex: 5
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-soft)',
                  border: '1px solid var(--accent-color)'
                }}>
                  <Radio size={24} style={{ color: 'var(--accent-color)' }} />
                </div>
                <div>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: '650',
                    color: 'var(--text-color)',
                    letterSpacing: '-0.01em',
                    marginBottom: '4px'
                  }}>
                    {t('crisis.standbyTitle', 'Señal de Crisis en Espera')}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--muted-text)',
                    maxWidth: '340px',
                    lineHeight: '1.45',
                    margin: '0 auto'
                  }}>
                    {t('crisis.standbyDesc', 'Esperando que la Mesa de Presidencia o el Gabinete de Crisis emita una alerta o proyecte un suceso.')}
                  </div>
                </div>
              </div>
            ) : (
              /* ESTADO EMISIÓN ACTIVA: TITULAR Y DETALLES TELEVISIVOS */
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: 5,
                animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                height: '100%',
                justifyContent: 'center'
              }}>
                {/* Cinta de Categoría de Impacto */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: catMeta.bg,
                    color: catMeta.color,
                    border: `1px solid ${catMeta.border}`,
                    padding: '3px 8px',
                    borderRadius: 'var(--border-radius, 4px)',
                    fontSize: '0.72rem',
                    fontWeight: '700'
                  }}>
                    <CategoryIcon size={13} />
                    <span>{catMeta.badge}</span>
                  </div>

                  {configTV.mostrarFuente && eventoProyectado.fuente && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)', fontWeight: '600' }}>
                      {t('crisis.source', 'Fuente')}: {eventoProyectado.fuente}
                    </span>
                  )}
                </div>

                {/* Contenedor Principal: Texto + Imagen de Transmisión */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: eventoProyectado.imagen ? '1.2fr 1fr' : '1fr',
                  gap: '14px',
                  alignItems: 'center'
                }}>
                  {/* Columna de Texto: Titular, Descripción y Delegaciones */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Titular Principal de Impacto */}
                    <div style={{
                      fontSize: fullScreenMode ? '1.4rem' : eventoProyectado.imagen ? '1.1rem' : '1.2rem',
                      fontWeight: '700',
                      color: 'var(--text-color)',
                      lineHeight: '1.3',
                      letterSpacing: '-0.02em'
                    }}>
                      {eventoProyectado.titulo}
                    </div>

                    {/* Descripción / Comunicado */}
                    <div style={{
                      fontSize: fullScreenMode ? '0.92rem' : '0.82rem',
                      color: 'var(--text-color)',
                      lineHeight: '1.45',
                      backgroundColor: 'var(--panel-color)',
                      padding: '8px 12px',
                      borderRadius: 'var(--border-radius, 6px)',
                      border: '1px solid var(--border-color)',
                      borderLeft: `3px solid ${catMeta.color}`,
                      maxHeight: eventoProyectado.imagen ? '90px' : 'none',
                      overflowY: eventoProyectado.imagen ? 'auto' : 'visible'
                    }}>
                      {eventoProyectado.descripcion}
                    </div>

                    {/* Países Involucrados */}
                    {configTV.mostrarBanderas && eventoProyectado.paisesInvolucrados && eventoProyectado.paisesInvolucrados.length > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexWrap: 'wrap',
                        marginTop: '2px'
                      }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)', fontWeight: '700' }}>
                          {t('crisis.involvedDelegations', 'Delegaciones afectadas:')}
                        </span>
                        {eventoProyectado.paisesInvolucrados.map(nombrePais => {
                          const p = paises?.find(item => item.nombre === nombrePais);
                          return (
                            <span key={nombrePais} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: 'var(--input-bg)',
                              border: '1px solid var(--border-color)',
                              padding: '2px 7px',
                              borderRadius: 'var(--border-radius, 4px)',
                              fontSize: '0.72rem',
                              fontWeight: '650',
                              color: 'var(--text-color)'
                            }}>
                              <CountryFlag bandera={p?.bandera} nombre={nombrePais} size="sm" />
                              {nombrePais}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Columna de Imagen: Frame de Retransmisión */}
                  {eventoProyectado.imagen && (
                    <div style={{
                      position: 'relative',
                      borderRadius: 'var(--border-radius, 6px)',
                      overflow: 'hidden',
                      border: '1px solid var(--border-color)',
                      aspectRatio: '16/9',
                      backgroundColor: 'var(--panel-color)'
                    }}>
                      <img
                        src={eventoProyectado.imagen}
                        alt={t('ui.crisisEvidence', 'Evidencia gráfica')}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                      />

                      {/* Badge Superior de la Imagen */}
                      <div style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        backgroundColor: 'rgba(0, 0, 0, 0.72)',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '0.62rem',
                        fontWeight: '700',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span>{t('crisis.exclusiveBroadcast', 'RETRANSMISIÓN')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── TICKER INFERIOR CONTINUO (L-BAR CHYRON) ───────────────────── */}
          <div style={{
            backgroundColor: 'var(--card-header-bg)',
            borderTop: '1px solid var(--subborder-color)',
            display: 'flex',
            alignItems: 'center',
            height: '28px',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 10
          }}>
            {/* Etiqueta Ticker */}
            <div style={{
              backgroundColor: 'var(--btn-bg)',
              color: 'var(--btn-text)',
              padding: '0 10px',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.68rem',
              fontWeight: '750',
              letterSpacing: '0.04em',
              flexShrink: 0,
              zIndex: 2
            }}>
              {t('crisis.news', 'NOTICIAS')}
            </div>

            {/* Texto animado en marquesina horizontal */}
            <div style={{
              flex: 1,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{
                display: 'inline-block',
                paddingLeft: '100%',
                animation: configTV.velocidadTicker === 'pausado' ? 'none' : `marquee ${tickerDuration} linear infinite`,
                fontSize: '0.74rem',
                fontWeight: '600',
                color: 'var(--text-color)',
                letterSpacing: '0.01em'
              }}>
                {tickerText}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL DE AJUSTES Y PERSONALIZACIÓN DE LA TELEVISIÓN ─────────── */}
      {panelAjustesAbierto && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'color-mix(in srgb, var(--bg-color) 80%, transparent)',
          backdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '420px',
            backgroundColor: 'var(--panel-color)',
            borderRadius: 'var(--border-radius, 6px)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            maxHeight: '90vh'
          }}>
            {/* Header del Modal */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'var(--card-header-bg)',
              borderBottom: '1px solid var(--subborder-color)',
              fontWeight: '650',
              fontSize: '0.9rem',
              color: 'var(--text-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tv size={16} style={{ color: 'var(--accent-color)' }} />
                <span>{t('crisis.tvSettingsTitle', 'Ajustes del Visor de Noticias')}</span>
              </div>
              <button
                type="button"
                onClick={() => setPanelAjustesAbierto(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted-text)',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Opciones de Ajuste */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {/* Canal / Logotipo */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: 'var(--muted-text)', marginBottom: '5px' }}>
                  {t('crisis.channelIdentifier', 'CANAL / IDENTIFICADOR DE MEDIO')}
                </label>
                <select
                  value={configTV.canal}
                  onChange={(e) => setConfigTV(prev => ({ ...prev, canal: e.target.value }))}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius, 6px)',
                    padding: '7px 10px',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                >
                  {CANALES_PRESET.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Velocidad del Ticker */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: 'var(--muted-text)', marginBottom: '5px' }}>
                  {t('crisis.tickerSpeed', 'VELOCIDAD DEL TICKER INFERIOR')}
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['lento', 'normal', 'rapido', 'pausado'].map(vel => (
                    <button
                      key={vel}
                      type="button"
                      onClick={() => setConfigTV(prev => ({ ...prev, velocidadTicker: vel }))}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        borderRadius: 'var(--border-radius, 6px)',
                        border: `1px solid ${configTV.velocidadTicker === vel ? 'var(--accent-color)' : 'var(--border-color)'}`,
                        backgroundColor: configTV.velocidadTicker === vel 
                          ? 'var(--accent-soft)' 
                          : 'var(--input-bg)',
                        color: configTV.velocidadTicker === vel ? 'var(--accent-color)' : 'var(--text-color)',
                        fontSize: '0.72rem',
                        fontWeight: '650',
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {vel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ticker Personalizado */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: 'var(--muted-text)', marginBottom: '5px' }}>
                  {t('crisis.customTickerLabel', 'TEXTO PERSONALIZADO PARA EL TICKER (OPCIONAL)')}
                </label>
                <input
                  type="text"
                  placeholder={t('crisis.customTickerPlaceholder', 'Dejar en blanco para usar los titulares de crisis automáticos...')}
                  value={configTV.tickerPersonalizado}
                  onChange={(e) => setConfigTV(prev => ({ ...prev, tickerPersonalizado: e.target.value }))}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius, 6px)',
                    padding: '7px 10px',
                    fontSize: '0.8rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Interruptores de Opciones */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                backgroundColor: 'var(--card-header-bg)',
                padding: '10px 12px',
                borderRadius: 'var(--border-radius, 6px)',
                border: '1px solid var(--subborder-color)'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-color)', cursor: 'pointer' }}>
                  <span>{t('crisis.audioAlertToggle', 'Alarma auditiva al cambiar noticia')}</span>
                  <input
                    type="checkbox"
                    checked={configTV.sonidoAlerta}
                    onChange={(e) => setConfigTV(prev => ({ ...prev, sonidoAlerta: e.target.checked }))}
                    style={{ accentColor: 'var(--btn-bg)' }}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-color)', cursor: 'pointer' }}>
                  <span>{t('crisis.showSimClock', 'Mostrar reloj de simulación')}</span>
                  <input
                    type="checkbox"
                    checked={configTV.mostrarReloj}
                    onChange={(e) => setConfigTV(prev => ({ ...prev, mostrarReloj: e.target.checked }))}
                    style={{ accentColor: 'var(--btn-bg)' }}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-color)', cursor: 'pointer' }}>
                  <span>{t('crisis.showFlags', 'Mostrar banderas de países')}</span>
                  <input
                    type="checkbox"
                    checked={configTV.mostrarBanderas}
                    onChange={(e) => setConfigTV(prev => ({ ...prev, mostrarBanderas: e.target.checked }))}
                    style={{ accentColor: 'var(--btn-bg)' }}
                  />
                </label>
              </div>

              {/* Botón Guardar y Cerrar */}
              <button
                type="button"
                onClick={() => setPanelAjustesAbierto(false)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: 'var(--btn-bg)',
                  color: 'var(--btn-text)',
                  border: 'none',
                  borderRadius: 'var(--border-radius, 6px)',
                  fontSize: '0.82rem',
                  fontWeight: '650',
                  cursor: 'pointer',
                  marginTop: '4px',
                  transition: 'opacity 0.15s ease'
                }}
              >
                {t('common.saveAndClose', 'Guardar y Cerrar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CSS PARA ANIMACIÓN DE MARQUESINA ────────────────────────────── */}
      <style>{`
        @keyframes marquee {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-100%, 0); }
        }
      `}</style>
    </div>
  );
};

export default TeleNoticiasCrisis;