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
  Sparkles, 
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

// Categorías de Crisis y sus colores
const CATEGORIAS = {
  CRITICA: {
    nombre: 'Última Hora',
    badge: '🔴 ÚLTIMA HORA',
    color: '#ef4444',
    bg: '#dc2626',
    border: '#f87171',
    icon: Flame
  },
  MILITAR: {
    nombre: 'Alerta Militar',
    badge: '⚔️ ALERTA MILITAR',
    color: '#f97316',
    bg: '#ea580c',
    border: '#fb923c',
    icon: ShieldAlert
  },
  DIPLOMATICA: {
    nombre: 'Comunicado',
    badge: '🌐 COMUNICADO DIPLOMÁTICO',
    color: '#3b82f6',
    bg: '#2563eb',
    border: '#60a5fa',
    icon: Megaphone
  },
  ECONOMICA: {
    nombre: 'Crisis Financiera',
    badge: '💵 IMPACTO ECONÓMICO',
    color: '#a855f7',
    bg: '#9333ea',
    border: '#c084fc',
    icon: TrendingUp
  },
  CIBERNETICA: {
    nombre: 'Ciberataque',
    badge: '⚡ FILTRACIÓN / CIBER',
    color: '#10b981',
    bg: '#059669',
    border: '#34d399',
    icon: Zap
  }
};

const ESTILOS_MARCO = [
  { id: 'modern_studio', label: 'Estudio de Noticias HD' },
  { id: 'tactical_hud', label: 'Radar Táctico Militar' },
  { id: 'retro_crt', label: 'Transmisión Analógica CRT' },
  { id: 'minimal', label: 'Minimalista Cinema' }
];

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
      estiloMarco: 'modern_studio', // 'modern_studio' | 'retro_crt' | 'tactical_hud' | 'minimal'
      canal: 'UN-TV WORLD NEWS',
      velocidadTicker: 'normal', // 'lento' | 'normal' | 'rapido' | 'pausado'
      mostrarReloj: true,
      mostrarBanderas: true,
      mostrarFuente: true,
      efectoScanlines: false,
      efectoGlow: true,
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
  const [isTvOn, setIsTvOn] = useState(true);
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

    // Escuchar eventos locales y storage
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
    if (configTV.tickerPersonalizado.trim()) {
      return configTV.tickerPersonalizado;
    }
    if (!todosLosEventos || todosLosEventos.length === 0) {
      return 'OPENMUN TRANSMISIÓN EN DIRECTO · SALA DE CRISIS ACTIVA · ESPERANDO NUEVAS DIRECTIVAS DE LA MESA';
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

  const formatoHora = `Día ${relojSimulacion.dia || 1} · ${String(relojSimulacion.horas || 8).padStart(2, '0')}:${String(relojSimulacion.minutos || 0).padStart(2, '0')} hrs`;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: isLight ? 'var(--panel-color)' : '#07090e',
      color: '#ffffff',
      boxSizing: 'border-box',
      overflow: 'hidden',
      position: 'relative',
      userSelect: 'none',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* ─── MARCO EXTERIOR DE LA TELEVISIÓN ─────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: configTV.estiloMarco === 'minimal' ? 'transparent' : (isLight ? '#f1f5f9' : '#141721'),
        border: configTV.estiloMarco === 'minimal' 
          ? 'none' 
          : configTV.estiloMarco === 'tactical_hud' 
            ? '3px solid #0ea5e9' 
            : configTV.estiloMarco === 'retro_crt' 
              ? (isLight ? '8px solid #94a3b8' : '8px solid #27272a') 
              : (isLight ? '4px solid #cbd5e1' : '5px solid #1e2433'),
        borderRadius: configTV.estiloMarco === 'retro_crt' ? '20px' : configTV.estiloMarco === 'minimal' ? '0px' : '12px',
        boxShadow: configTV.efectoGlow 
          ? `0 0 25px ${catMeta.color}33, inset 0 0 15px rgba(0,0,0,0.8)` 
          : (isLight ? '0 4px 16px rgba(0,0,0,0.1)' : '0 8px 24px rgba(0,0,0,0.6)'),
        margin: configTV.estiloMarco === 'minimal' ? '0' : '4px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Antena y Bisel Retro (solo en modo Retro CRT) */}
        {configTV.estiloMarco === 'retro_crt' && (
          <div style={{
            position: 'absolute',
            top: '4px',
            right: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 30,
            opacity: 0.7
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isTvOn ? '#22c55e' : '#ef4444', boxShadow: '0 0 6px #22c55e' }} />
            <span style={{ fontSize: '0.6rem', fontWeight: '800', color: '#94a3b8' }}>CRT-400</span>
          </div>
        )}

        {/* ─── PANTALLA DE EMISIÓN DE LA TV ────────────────────────────────── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#000000',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Efecto Scanlines CRT opcional */}
          {configTV.efectoScanlines && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.25), rgba(0,0,0,0.25) 1px, transparent 1px, transparent 2px)',
              pointerEvents: 'none',
              zIndex: 25,
              opacity: 0.65
            }} />
          )}

          {/* Reflejo de cristal de la pantalla */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, height: '40%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 100%)',
            pointerEvents: 'none',
            zIndex: 20
          }} />

          {/* ── BARRA SUPERIOR DE TRANSMISIÓN TV (CHYRON BAR) ──────────────── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            backgroundColor: '#090b10',
            borderBottom: `2px solid ${catMeta.color}`,
            zIndex: 10,
            gap: '8px'
          }}>
            {/* Logotipo del Canal de TV */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '0.68rem',
                fontWeight: '900',
                letterSpacing: '0.5px'
              }}>
                {configTV.canal}
              </div>

              {/* Indicador EN VIVO */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '0.62rem',
                fontWeight: '900',
                letterSpacing: '0.5px'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  display: 'inline-block',
                  animation: 'pulse 1s infinite'
                }} />
                <span>{t('crisis.live', 'EN VIVO')}</span>
              </div>
            </div>

            {/* Reloj de Simulación y Botones de Control de la TV */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {configTV.mostrarReloj && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  color: '#e2e8f0'
                }}>
                  <Clock size={11} color="#60a5fa" />
                  <span>{formatoHora}</span>
                </div>
              )}

              {/* Botón Ajustes de TV */}
              <button
                onClick={() => setPanelAjustesAbierto(true)}
                title={t('crisis.tvSettings', 'Configuración de la Televisión')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                <Settings size={14} />
              </button>
            </div>
          </div>

          {/* ── CUERPO PRINCIPAL DE LA PANTALLA (NOTICIA O STANDBY) ───────── */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: fullScreenMode ? '24px 20px' : '12px 16px',
            position: 'relative',
            background: 'radial-gradient(ellipse at center, #111522 0%, #05070c 100%)',
            overflow: 'hidden'
          }}>
            {!eventoProyectado ? (
              /* ESTADO STANDBY CUANDO NO HAY NOTICIA PROYECTADA */
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: '10px',
                padding: '20px',
                zIndex: 5
              }}>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                  <Radio size={28} color="#60a5fa" style={{ animation: 'pulse 2s infinite' }} />
                </div>
                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px' }}>
                  {t('crisis.standbyTitle', 'SEÑAL DE CRISIS EN ESPERA')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', maxWidth: '320px', lineHeight: '1.4' }}>
                  {t('crisis.standbyDesc', 'Esperando que la Mesa de Presidencia o el Gabinete de Crisis emita una alerta o proyecte un suceso.')}
                </div>
              </div>
            ) : (
              /* ESTADO EMISIÓN ACTIVA: TITULAR Y DETALLES TELEVISIVOS */
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                zIndex: 5,
                animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                height: '100%',
                justifyContent: 'center'
              }}>
                {/* Cinta de Categoría de Impacto */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: catMeta.color,
                    color: '#ffffff',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: '900',
                    letterSpacing: '0.8px',
                    boxShadow: `0 2px 8px ${catMeta.color}66`
                  }}>
                    <CategoryIcon size={12} />
                    <span>{catMeta.badge}</span>
                  </div>

                  {configTV.mostrarFuente && eventoProyectado.fuente && (
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600' }}>
                      {t('crisis.source', 'FUENTE')}: {eventoProyectado.fuente}
                    </span>
                  )}
                </div>

                {/* Contenedor Principal: Texto + Imagen de Transmisión */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: eventoProyectado.imagen ? '1.2fr 1fr' : '1fr',
                  gap: '12px',
                  alignItems: 'center'
                }}>
                  {/* Columna de Texto: Titular, Descripción y Delegaciones */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Titular Principal de Impacto */}
                    <div style={{
                      fontSize: fullScreenMode ? '1.6rem' : eventoProyectado.imagen ? '1.15rem' : '1.25rem',
                      fontWeight: '900',
                      color: '#ffffff',
                      lineHeight: '1.2',
                      letterSpacing: '-0.3px',
                      textShadow: '0 2px 10px rgba(0,0,0,0.8)'
                    }}>
                      {eventoProyectado.titulo}
                    </div>

                    {/* Descripción / Comunicado */}
                    <div style={{
                      fontSize: fullScreenMode ? '0.98rem' : '0.82rem',
                      color: '#cbd5e1',
                      lineHeight: '1.42',
                      backgroundColor: 'rgba(0,0,0,0.45)',
                      padding: '8px 10px',
                      borderRadius: '6px',
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
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: '700' }}>
                          {t('crisis.involvedDelegations', 'DELEGACIONES AFECTADAS:')}
                        </span>
                        {eventoProyectado.paisesInvolucrados.map(nombrePais => {
                          const p = paises.find(item => item.nombre === nombrePais);
                          return (
                            <span key={nombrePais} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: 'rgba(255,255,255,0.08)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              color: '#ffffff'
                            }}>
                              <CountryFlag bandera={p?.bandera} nombre={nombrePais} size="sm" />
                              {nombrePais}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Columna de Imagen: Frame de Retransmisión de TV */}
                  {eventoProyectado.imagen && (
                    <div style={{
                      position: 'relative',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: `1px solid ${catMeta.border}`,
                      boxShadow: `0 4px 15px ${catMeta.color}33`,
                      aspectRatio: '16/9',
                      backgroundColor: '#000000'
                    }}>
                      <img
                        src={eventoProyectado.imagen}
                        alt="Evidencia Crisis"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />

                      {/* Badge Superior de la Imagen */}
                      <div style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '0.62rem',
                        fontWeight: '900',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        letterSpacing: '0.5px'
                      }}>
                        <span style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          backgroundColor: '#ef4444',
                          animation: 'pulse 1s infinite'
                        }} />
                        <span>{t('crisis.exclusiveBroadcast', 'RETRANSMISIÓN EXCLUSIVA')}</span>
                      </div>

                      {/* Marca de agua / Timestamp en la esquina inferior */}
                      <div style={{
                        position: 'absolute',
                        bottom: '4px',
                        right: '6px',
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        padding: '1px 5px',
                        borderRadius: '2px',
                        fontSize: '0.58rem',
                        color: '#cbd5e1',
                        fontFamily: 'monospace'
                      }}>
                        LIVE FEED · CAM-01
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── TICKER INFERIOR CONTINUO (L-BAR CHYRON) ───────────────────── */}
          <div style={{
            backgroundColor: '#090b10',
            borderTop: '1px solid #1e2433',
            display: 'flex',
            alignItems: 'center',
            height: '28px',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 10
          }}>
            {/* Etiqueta Ticker */}
            <div style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
              padding: '0 10px',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.65rem',
              fontWeight: '900',
              letterSpacing: '0.8px',
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
                fontSize: '0.72rem',
                fontWeight: '700',
                color: '#f8fafc',
                letterSpacing: '0.3px'
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
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '440px',
            backgroundColor: 'var(--panel-color)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            boxShadow: isLight ? '0 12px 36px rgba(0,0,0,0.15)' : '0 12px 36px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            maxHeight: '90%'
          }}>
            {/* Header del Modal */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: 'var(--card-header-bg)',
              borderBottom: '1px solid var(--border-color)',
              fontWeight: '700',
              fontSize: '0.85rem',
              color: 'var(--text-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tv size={16} color="#60a5fa" />
                <span>{t('crisis.tvSettingsTitle', 'Ajustes de la Pantalla de Televisión')}</span>
              </div>
              <button
                onClick={() => setPanelAjustesAbierto(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted-text)',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  fontWeight: '700'
                }}
              >
                ✕
              </button>
            </div>

            {/* Opciones de Ajuste */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {/* Estilo del Marco TV */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', marginBottom: '4px' }}>
                  {t('crisis.tvStyle', 'ESTILO DE TELEVISIÓN')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {[
                    { id: 'modern_studio', label: 'Estudio 4K Moderno' },
                    { id: 'retro_crt', label: 'Monitor CRT Retro' },
                    { id: 'tactical_hud', label: 'Sala de Situación HUD' },
                    { id: 'minimal', label: 'Sin Marco (Puro)' }
                  ].map(est => (
                    <button
                      key={est.id}
                      onClick={() => setConfigTV(prev => ({ ...prev, estiloMarco: est.id }))}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${configTV.estiloMarco === est.id ? '#3b82f6' : 'var(--border-color)'}`,
                        backgroundColor: configTV.estiloMarco === est.id 
                          ? (isLight ? '#eff6ff' : 'rgba(59, 130, 246, 0.2)') 
                          : (isLight ? 'var(--card-header-bg)' : '#181d2a'),
                        color: configTV.estiloMarco === est.id ? (isLight ? '#1d4ed8' : '#60a5fa') : 'var(--text-color)',
                        fontSize: '0.72rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {est.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Canal / Logotipo */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', marginBottom: '4px' }}>
                  {t('crisis.channelIdentifier', 'CANAL / IDENTIFICADOR DE MEDIO')}
                </label>
                <select
                  value={configTV.canal}
                  onChange={(e) => setConfigTV(prev => ({ ...prev, canal: e.target.value }))}
                  style={{
                    width: '100%',
                    backgroundColor: isLight ? '#ffffff' : '#181d2a',
                    color: 'var(--text-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    fontSize: '0.75rem',
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
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', marginBottom: '4px' }}>
                  {t('crisis.tickerSpeed', 'VELOCIDAD DEL TICKER INFERIOR')}
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['lento', 'normal', 'rapido', 'pausado'].map(vel => (
                    <button
                      key={vel}
                      onClick={() => setConfigTV(prev => ({ ...prev, velocidadTicker: vel }))}
                      style={{
                        flex: 1,
                        padding: '5px',
                        borderRadius: '5px',
                        border: `1px solid ${configTV.velocidadTicker === vel ? '#3b82f6' : 'var(--border-color)'}`,
                        backgroundColor: configTV.velocidadTicker === vel 
                          ? (isLight ? '#eff6ff' : 'rgba(59, 130, 246, 0.2)') 
                          : (isLight ? 'var(--card-header-bg)' : '#181d2a'),
                        color: configTV.velocidadTicker === vel ? (isLight ? '#1d4ed8' : '#60a5fa') : 'var(--text-color)',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        textTransform: 'capitalize',
                        cursor: 'pointer'
                      }}
                    >
                      {vel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ticker Personalizado */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', marginBottom: '4px' }}>
                  {t('crisis.customTickerLabel', 'TEXTO PERSONALIZADO PARA EL TICKER (OPCIONAL)')}
                </label>
                <input
                  type="text"
                  placeholder={t('crisis.customTickerPlaceholder', 'Dejar en blanco para usar los titulares de crisis automáticos...')}
                  value={configTV.tickerPersonalizado}
                  onChange={(e) => setConfigTV(prev => ({ ...prev, tickerPersonalizado: e.target.value }))}
                  style={{
                    width: '100%',
                    backgroundColor: isLight ? '#ffffff' : '#181d2a',
                    color: 'var(--text-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    fontSize: '0.75rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Interruptores de Efectos Visuales y Sonido */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: isLight ? 'var(--card-header-bg)' : '#181d2a', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-color)', cursor: 'pointer' }}>
                  <span>{t('crisis.scanlinesEffect', 'Efecto Scanlines (Líneas CRT)')}</span>
                  <input
                    type="checkbox"
                    checked={configTV.efectoScanlines}
                    onChange={(e) => setConfigTV(prev => ({ ...prev, efectoScanlines: e.target.checked }))}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-color)', cursor: 'pointer' }}>
                  <span>{t('crisis.glowEffect', 'Resplandor LED / Glow')}</span>
                  <input
                    type="checkbox"
                    checked={configTV.efectoGlow}
                    onChange={(e) => setConfigTV(prev => ({ ...prev, efectoGlow: e.target.checked }))}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-color)', cursor: 'pointer' }}>
                  <span>{t('crisis.audioAlertToggle', 'Alarma auditiva al cambiar noticia')}</span>
                  <input
                    type="checkbox"
                    checked={configTV.sonidoAlerta}
                    onChange={(e) => setConfigTV(prev => ({ ...prev, sonidoAlerta: e.target.checked }))}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-color)', cursor: 'pointer' }}>
                  <span>{t('crisis.showSimClock', 'Mostrar Reloj de Simulación')}</span>
                  <input
                    type="checkbox"
                    checked={configTV.mostrarReloj}
                    onChange={(e) => setConfigTV(prev => ({ ...prev, mostrarReloj: e.target.checked }))}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-color)', cursor: 'pointer' }}>
                  <span>{t('crisis.showFlags', 'Mostrar Banderas de Países')}</span>
                  <input
                    type="checkbox"
                    checked={configTV.mostrarBanderas}
                    onChange={(e) => setConfigTV(prev => ({ ...prev, mostrarBanderas: e.target.checked }))}
                  />
                </label>
              </div>

              {/* Botón Listo */}
              <button
                onClick={() => setPanelAjustesAbierto(false)}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  marginTop: '4px'
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
