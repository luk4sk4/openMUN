import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Dices, 
  RotateCw, 
  Sparkles, 
  UserPlus, 
  Volume2, 
  VolumeX, 
  Users, 
  History, 
  CheckCircle2, 
  HelpCircle, 
  Shuffle, 
  Filter, 
  ChevronRight, 
  Trash2, 
  Layers,
  ArrowRight,
  TrendingDown,
  Clock,
  Play,
  RotateCcw
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import { useTranslation } from 'react-i18next';
import { playTickSound, playFanfareSound } from '../../utils/audioAlerts';

// Paleta de colores vibrantes para las porciones de la ruleta
const PALETA_COLORES = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', 
  '#eab308', '#10b981', '#06b6d4', '#6366f1',
  '#14b8a6', '#f43f5e', '#a855f7', '#0ea5e9'
];

const SelectorAleatorio = () => {
  const { t } = useTranslation();
  const { 
    paises, 
    oradoresCola, 
    agregarOrador, 
    registroIntervenciones, 
    registrarIntervencion 
  } = useSession();

  // Estados del Widget
  const [modoVista, setModoVista] = useState('ruleta'); // 'ruleta' | 'tarjeta'
  const [filtroSeleccion, setFiltroSeleccion] = useState('PRESENTES'); // 'TODOS' | 'PRESENTES' | 'MENOS_INTERVENCIONES'
  const [modoSinRepetir, setModoSinRepetir] = useState(true);
  const [paisesExcluidosRonda, setPaisesExcluidosRonda] = useState([]);
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true);

  // Estados de Animación y Selección
  const [girando, setGirando] = useState(false);
  const [paisSeleccionado, setPaisSeleccionado] = useState(null);
  const [paisTemporalVisual, setPaisTemporalVisual] = useState(null);
  const [historialSorteos, setHistorialSorteos] = useState([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [feedbackAccion, setFeedbackAccion] = useState(null);

  // Referencias para Canvas y Animación
  const canvasRef = useRef(null);
  const anguloActualRef = useRef(0);
  const animFrameRef = useRef(null);
  const ultimoTickRef = useRef(0);
  const timerSlotRef = useRef(null);

  // Mapa de intervenciones previas por país
  const mapaIntervenciones = useMemo(() => {
    const map = {};
    (registroIntervenciones || []).forEach(item => {
      const nombre = item.pais || item.delegacion || item.nombre;
      if (nombre) {
        map[nombre] = (map[nombre] || 0) + 1;
      }
    });
    return map;
  }, [registroIntervenciones]);

  // Lista de países elegibles según filtro
  const paisesElegibles = useMemo(() => {
    if (!paises || paises.length === 0) return [];

    let pool = [...paises];

    // Filtro de asistencia
    if (filtroSeleccion === 'PRESENTES') {
      pool = pool.filter(p => p.estatus !== 'Ausente');
    } else if (filtroSeleccion === 'MENOS_INTERVENCIONES') {
      pool = pool.filter(p => p.estatus !== 'Ausente');
      const minIntervenciones = pool.reduce((min, p) => {
        const count = mapaIntervenciones[p.nombre] || 0;
        return Math.min(min, count);
      }, Infinity);
      // Incluir los que tienen las menores intervenciones (hasta +1 del mínimo)
      pool = pool.filter(p => (mapaIntervenciones[p.nombre] || 0) <= (minIntervenciones === Infinity ? 0 : minIntervenciones + 1));
    }

    // Filtrar excluidos en esta ronda si el modo sin repetición está activo
    if (modoSinRepetir) {
      pool = pool.filter(p => !paisesExcluidosRonda.includes(p.nombre));
    }

    return pool;
  }, [paises, filtroSeleccion, modoSinRepetir, paisesExcluidosRonda, mapaIntervenciones]);

  // Total disponible antes de exclusión de ronda
  const totalBaseElegibles = useMemo(() => {
    if (!paises || paises.length === 0) return 0;
    if (filtroSeleccion === 'PRESENTES') {
      return paises.filter(p => p.estatus !== 'Ausente').length;
    }
    return paises.length;
  }, [paises, filtroSeleccion]);

  // Mostrar mensaje de feedback temporal
  const triggerFeedback = (msg) => {
    setFeedbackAccion(msg);
    setTimeout(() => setFeedbackAccion(null), 2500);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // DIBUJADO DE LA RULETA EN CANVAS 2D
  // ───────────────────────────────────────────────────────────────────────────
  const dibujarRuleta = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centroX = width / 2;
    const centroY = height / 2;
    const radio = Math.min(centroX, centroY) - 12;

    ctx.clearRect(0, 0, width, height);

    const items = paisesElegibles.length > 0 ? paisesElegibles : [{ nombre: 'Sin delegaciones', bandera: '🌐' }];
    const totalSectores = items.length;
    const arc = (2 * Math.PI) / totalSectores;

    ctx.save();
    ctx.translate(centroX, centroY);
    ctx.rotate(anguloActualRef.current);

    // Dibujar cada porción
    items.forEach((item, i) => {
      const anguloInicio = i * arc;
      const anguloFin = anguloInicio + arc;

      // Color de fondo del sector
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radio, anguloInicio, anguloFin);
      ctx.fillStyle = PALETA_COLORES[i % PALETA_COLORES.length];
      ctx.fill();

      // Borde del sector
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Texto de la delegación
      ctx.save();
      ctx.rotate(anguloInicio + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = totalSectores > 16 ? 'bold 10px Inter, sans-serif' : 'bold 12px Inter, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 3;

      // Truncar nombre si es muy largo
      let texto = item.nombre;
      if (texto.length > 14 && totalSectores > 10) {
        texto = texto.substring(0, 12) + '...';
      }
      ctx.fillText(texto, radio - 18, 4);
      ctx.restore();
    });

    // Borde exterior metálico brillante
    ctx.beginPath();
    ctx.arc(0, 0, radio, 0, 2 * Math.PI);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Centro de la ruleta (buje)
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Icono central
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚖️', 0, 1);

    ctx.restore();

    // Dibujar aguja indicadora en la parte superior (fija a las 12 en punto)
    ctx.save();
    ctx.translate(centroX, 10);
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 22);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }, [paisesElegibles]);

  // Redibujar al cambiar elegibles o tamaño
  useEffect(() => {
    if (modoVista === 'ruleta') {
      dibujarRuleta();
    }
  }, [modoVista, dibujarRuleta]);

  // ───────────────────────────────────────────────────────────────────────────
  // LOGICA DE GIRO DE RULETA (PHYSICS BASED EASING)
  // ───────────────────────────────────────────────────────────────────────────
  const girarRuleta = () => {
    if (girando || paisesElegibles.length === 0) return;

    setGirando(true);
    setPaisSeleccionado(null);

    const total = paisesElegibles.length;
    const indiceGanador = Math.floor(Math.random() * total);
    const ganador = paisesElegibles[indiceGanador];

    const arc = (2 * Math.PI) / total;
    // La aguja está en el ángulo -PI/2 (arriba a las 12h)
    const anguloDestinoSector = -(indiceGanador * arc + arc / 2) - Math.PI / 2;
    
    // Entre 5 y 8 vueltas completas para efecto de suspenso
    const vueltas = (5 + Math.floor(Math.random() * 4)) * (2 * Math.PI);
    const anguloInicial = anguloActualRef.current % (2 * Math.PI);
    const anguloFinal = anguloInicial + vueltas + (anguloDestinoSector - (anguloInicial % (2 * Math.PI)));

    const duracionMs = 4500;
    const inicioTiempo = performance.now();
    ultimoTickRef.current = 0;

    const animar = (ahora) => {
      const tiempoTranscurrido = ahora - inicioTiempo;
      const progreso = Math.min(1, tiempoTranscurrido / duracionMs);

      // Curva de desaceleración cúbica
      const easeOut = 1 - Math.pow(1 - progreso, 3.5);
      const anguloActual = anguloInicial + (anguloFinal - anguloInicial) * easeOut;
      anguloActualRef.current = anguloActual;

      // Sonido de clic/tick al pasar por cada sector
      const sectorActual = Math.floor((anguloActual / arc) % total);
      if (sectorActual !== ultimoTickRef.current) {
        ultimoTickRef.current = sectorActual;
        if (sonidoHabilitado) {
          playTickSound(0.2);
        }
      }

      dibujarRuleta();

      if (progreso < 1) {
        animFrameRef.current = requestAnimationFrame(animar);
      } else {
        anguloActualRef.current = anguloFinal;
        dibujarRuleta();
        finalizarSeleccion(ganador);
      }
    };

    animFrameRef.current = requestAnimationFrame(animar);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // LOGICA DE SORTEO DIGITAL (TARJETA / PLACARD INSTANTÁNEO)
  // ───────────────────────────────────────────────────────────────────────────
  const sortearDigital = () => {
    if (girando || paisesElegibles.length === 0) return;

    setGirando(true);
    setPaisSeleccionado(null);

    const total = paisesElegibles.length;
    const ganador = paisesElegibles[Math.floor(Math.random() * total)];

    let velocidad = 25; // Súper rápido de inicio
    let iteracion = 0;
    const maxIteraciones = 16; // Animación ágil de aprox 1 segundo

    const paso = () => {
      iteracion++;
      const randomItem = paisesElegibles[Math.floor(Math.random() * total)];
      setPaisTemporalVisual(randomItem);

      if (sonidoHabilitado) {
        playTickSound(0.25);
      }

      if (iteracion < maxIteraciones) {
        // Desaceleración suave solo en los últimos 4 pasos
        velocidad += iteracion > 11 ? Math.floor((iteracion - 11) * 22) : 5;
        timerSlotRef.current = setTimeout(paso, velocidad);
      } else {
        setPaisTemporalVisual(ganador);
        finalizarSeleccion(ganador);
      }
    };

    paso();
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FINALIZAR SELECCIÓN Y REGISTRO
  // ───────────────────────────────────────────────────────────────────────────
  const finalizarSeleccion = (ganador) => {
    setGirando(false);
    setPaisSeleccionado(ganador);

    if (sonidoHabilitado) {
      playFanfareSound(0.4);
    }

    // Registrar en historial
    const nuevoRegistro = {
      id: 'sel_' + Date.now(),
      pais: ganador,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      intervencionesAlMomento: mapaIntervenciones[ganador.nombre] || 0
    };
    setHistorialSorteos(prev => [nuevoRegistro, ...prev]);

    // Excluir de la ronda si el modo sin repetición está activo
    if (modoSinRepetir) {
      setPaisesExcluidosRonda(prev => [...prev, ganador.nombre]);
    }
  };

  // Limpiar temporizadores al desmontar
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerSlotRef.current) clearTimeout(timerSlotRef.current);
    };
  }, []);

  // Reiniciar la ronda de exclusión
  const reiniciarRonda = () => {
    setPaisesExcluidosRonda([]);
    triggerFeedback(t('random.roundReset', 'Ronda reiniciada: todas las delegaciones disponibles'));
  };

  // Añadir directamente a la cola GSL
  const handleAnadirAGSL = () => {
    if (!paisSeleccionado) return;
    agregarOrador(paisSeleccionado);
    triggerFeedback(`${paisSeleccionado.nombre} ${t('random.addedGSLFeedback', 'añadido a la Lista GSL')}`);
  };

  // Dar la palabra inmediatamente / Registrar intervención
  const handleDarPalabraAhora = () => {
    if (!paisSeleccionado) return;
    registrarIntervencion(paisSeleccionado.nombre, 60);
    triggerFeedback(`${t('random.interventionRegistered', 'Intervención registrada para')} ${paisSeleccionado.nombre}`);
  };

  const restantesEnRonda = paisesElegibles.length;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--panel-color)',
      color: 'var(--text-color)',
      boxSizing: 'border-box',
      overflow: 'hidden',
      userSelect: 'none',
      position: 'relative'
    }}>
      {/* ─── BARRA SUPERIOR DE HERRAMIENTAS Y MODOS ──────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: 'var(--card-header-bg)',
        borderBottom: '1px solid var(--border-color)',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        {/* Selector de modo Ruleta vs Tarjeta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--subnav-bg)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setModoVista('ruleta')}
            title="Modo Ruleta Visual"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: modoVista === 'ruleta' ? 'var(--btn-bg)' : 'transparent',
              color: modoVista === 'ruleta' ? '#ffffff' : 'var(--muted-text)',
              fontSize: '0.74rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <RotateCw size={12} />
            {t('random.roulette', 'Ruleta')}
          </button>
          <button
            onClick={() => setModoVista('tarjeta')}
            title="Modo Ranura Digital / Placard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: modoVista === 'tarjeta' ? 'var(--btn-bg)' : 'transparent',
              color: modoVista === 'tarjeta' ? '#ffffff' : 'var(--muted-text)',
              fontSize: '0.74rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Shuffle size={12} />
            {t('random.cards', 'Placard')}
          </button>
        </div>

        {/* Filtro de Países */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <select
            value={filtroSeleccion}
            onChange={(e) => setFiltroSeleccion(e.target.value)}
            disabled={girando}
            style={{
              backgroundColor: 'var(--subnav-bg)',
              color: 'var(--text-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '3px 6px',
              fontSize: '0.72rem',
              fontWeight: '500',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="PRESENTES">🟢 {t('random.onlyPresent', 'Solo Presentes')}</option>
            <option value="MENOS_INTERVENCIONES">📉 {t('random.leastInterventions', 'Menos Participación')}</option>
            <option value="TODOS">🌐 {t('random.allDelegations', 'Todas las Delegaciones')}</option>
          </select>
        </div>

        {/* Controles rápidos (Sonido, Sin Repetir, Historial) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Botón Sin Repetir */}
          <button
            onClick={() => setModoSinRepetir(!modoSinRepetir)}
            title={modoSinRepetir ? "Modo Sin Repetir Activado (Bolsa de Sorteo)" : "Modo Con Repetición"}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '4px 6px',
              borderRadius: '6px',
              border: `1px solid ${modoSinRepetir ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-color)'}`,
              backgroundColor: modoSinRepetir ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: modoSinRepetir ? '#60a5fa' : 'var(--muted-text)',
              fontSize: '0.7rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Layers size={12} />
            {modoSinRepetir ? `${restantesEnRonda}/${totalBaseElegibles}` : t('random.infinite', 'Infinito')}
          </button>

          {/* Sonido */}
          <button
            onClick={() => setSonidoHabilitado(!sonidoHabilitado)}
            title={sonidoHabilitado ? "Efectos de Sonido Activados" : "Sonido Silenciado"}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: sonidoHabilitado ? '#3b82f6' : 'var(--muted-text)',
              cursor: 'pointer'
            }}
          >
            {sonidoHabilitado ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>

          {/* Historial */}
          <button
            onClick={() => setMostrarHistorial(!mostrarHistorial)}
            title="Ver Historial de Sorteos"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '4px 6px',
              borderRadius: '6px',
              border: `1px solid ${mostrarHistorial ? 'var(--btn-bg)' : 'var(--border-color)'}`,
              backgroundColor: mostrarHistorial ? 'var(--btn-bg)' : 'transparent',
              color: mostrarHistorial ? '#ffffff' : 'var(--muted-text)',
              fontSize: '0.7rem',
              cursor: 'pointer'
            }}
          >
            <History size={12} />
            {historialSorteos.length > 0 && <span>{historialSorteos.length}</span>}
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedbackAccion && (
        <div style={{
          position: 'absolute',
          top: '46px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#10b981',
          color: '#ffffff',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '0.72rem',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 50,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <CheckCircle2 size={12} />
          {feedbackAccion}
        </div>
      )}

      {/* ─── CUERPO PRINCIPAL DEL WIDGET ─────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {paisesElegibles.length === 0 && !girando && !paisSeleccionado ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '8px',
            padding: '16px'
          }}>
            <HelpCircle size={32} color="var(--muted-text)" />
            <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-color)' }}>
              {paises.length === 0 ? 'No hay países cargados en la sesión' : 'Se han sorteado todos los países de la ronda'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', maxWidth: '280px' }}>
              {paises.length === 0 
                ? 'Importa países desde el widget de Configuración para comenzar.' 
                : 'Reinicia la bolsa para volver a sortear entre todas las delegaciones.'}
            </div>
            {paises.length > 0 && modoSinRepetir && paisesExcluidosRonda.length > 0 && (
              <button
                onClick={reiniciarRonda}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--btn-bg)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '0.76rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '6px'
                }}
              >
                <RotateCcw size={13} />
                Reiniciar Ronda ({paisesExcluidosRonda.length} sorteados)
              </button>
            )}
          </div>
        ) : (
          <>
            {/* VISTA A: RULETA CANVAS */}
            {modoVista === 'ruleta' && (
              <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '240px',
                aspectRatio: '1/1',
                maxHeight: '220px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: 'auto 0'
              }}>
                <canvas
                  ref={canvasRef}
                  width={240}
                  height={240}
                  style={{
                    width: '100%',
                    height: '100%',
                    filter: girando ? 'drop-shadow(0 0 10px rgba(59,130,246,0.3))' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))'
                  }}
                />
              </div>
            )}

            {/* VISTA B: PLACARD DIGITAL / SLOT RANDOMIZER GRANDE Y ÁGIL */}
            {modoVista === 'tarjeta' && (
              <div style={{
                width: '96%',
                maxWidth: '440px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px 16px',
                backgroundColor: 'var(--card-header-bg)',
                borderRadius: '14px',
                border: `2px solid ${girando ? '#3b82f6' : paisSeleccionado ? '#10b981' : 'var(--border-color)'}`,
                boxShadow: girando 
                  ? '0 0 25px rgba(59,130,246,0.4), inset 0 0 15px rgba(59,130,246,0.1)' 
                  : paisSeleccionado 
                    ? '0 0 20px rgba(16,185,129,0.3)' 
                    : '0 6px 16px rgba(0,0,0,0.25)',
                transition: 'all 0.2s ease',
                margin: 'auto 0',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Cabecera del Placard */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  color: girando ? '#60a5fa' : paisSeleccionado ? '#34d399' : 'var(--muted-text)',
                  fontWeight: '800',
                  marginBottom: '12px'
                }}>
                  {girando ? (
                    <>
                      <Sparkles size={13} style={{ animation: 'spin 1.5s linear infinite' }} />
                      <span>{t('random.spinning', 'Sorteando Delegación...')}</span>
                    </>
                  ) : paisSeleccionado ? (
                    <>
                      <CheckCircle2 size={13} />
                      <span>{t('random.placardGranted', 'Cartel / Placard Oficial Concedido')}</span>
                    </>
                  ) : (
                    <span>{t('random.delegationPlacard', 'Placard de Delegación')}</span>
                  )}
                </div>

                {/* Contenido Principal: Bandera Grande + Nombre Imponente */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  minHeight: '70px',
                  width: '100%',
                  textAlign: 'center'
                }}>
                  {girando ? (
                    paisTemporalVisual ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', animation: 'fadeIn 0.08s ease' }}>
                        <CountryFlag bandera={paisTemporalVisual.bandera} nombre={paisTemporalVisual.nombre} size="2xl" />
                        <span style={{
                          fontSize: '1.65rem',
                          fontWeight: '900',
                          color: '#60a5fa',
                          letterSpacing: '-0.5px',
                          textShadow: '0 2px 10px rgba(59,130,246,0.4)'
                        }}>
                          {paisTemporalVisual.nombre}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--muted-text)' }}>
                        {t('random.spinning', 'Girando...')}
                      </span>
                    )
                  ) : paisSeleccionado ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', animation: 'scaleUp 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                      <CountryFlag bandera={paisSeleccionado.bandera} nombre={paisSeleccionado.nombre} size="2xl" />
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{
                          fontSize: '1.75rem',
                          fontWeight: '900',
                          color: '#ffffff',
                          letterSpacing: '-0.5px',
                          lineHeight: '1.15',
                          textShadow: '0 2px 8px rgba(0,0,0,0.6)'
                        }}>
                          {paisSeleccionado.nombre}
                        </span>
                        <span style={{ fontSize: '0.76rem', color: '#34d399', fontWeight: '700', marginTop: '3px' }}>
                          ✨ {t('random.chosenDelegation', 'Delegación con el uso de la palabra')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--muted-text)' }}>
                      <Dices size={36} color="var(--muted-text)" />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-color)' }}>
                          {t('random.pressDraw', 'Presiona Sortear')}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)' }}>
                          {t('random.pressDrawSub', 'Elección aleatoria para abrir debate o ceder palabra')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── TARJETA DE RESULTADO Y ACCIONES INMEDIATAS ──────────────── */}
        {paisSeleccionado && !girando && (
          <div style={{
            width: '100%',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '8px',
            padding: '8px 10px',
            marginTop: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            animation: 'fadeIn 0.25s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <CountryFlag bandera={paisSeleccionado.bandera} nombre={paisSeleccionado.nombre} size="md" />
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#ffffff' }}>
                  {paisSeleccionado.nombre}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
                  {mapaIntervenciones[paisSeleccionado.nombre] || 0} {t('random.previousInterventions', 'intervenciones previas')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <button
                onClick={handleAnadirAGSL}
                title="Añadir orador a la Lista GSL"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  backgroundColor: 'var(--btn-bg)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <UserPlus size={11} />
                {t('random.addGSL', 'Añadir GSL')}
              </button>
              <button
                onClick={handleDarPalabraAhora}
                title="Registrar intervención directa"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '5px',
                  padding: '4px 7px',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <Clock size={11} />
                {t('random.yieldFloor', 'Palabra')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── BOTÓN PRINCIPAL DE DISPARO (SPIN) ────────────────────────────── */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--card-header-bg)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <button
          onClick={modoVista === 'ruleta' ? girarRuleta : sortearDigital}
          disabled={girando || paisesElegibles.length === 0}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: girando || paisesElegibles.length === 0 ? 'var(--subborder-color)' : 'var(--btn-bg)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 16px',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: girando || paisesElegibles.length === 0 ? 'not-allowed' : 'pointer',
            boxShadow: girando ? 'none' : '0 2px 8px rgba(59, 130, 246, 0.35)',
            transition: 'all 0.15s ease'
          }}
        >
          {girando ? (
            <>
              <RotateCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
              <span>{t('random.drawingDelegation', 'Sorteando Delegación...')}</span>
            </>
          ) : (
            <>
              <Dices size={16} />
              <span>{paisSeleccionado ? t('random.spinAgain', 'Girar de Nuevo') : t('random.drawDelegation', 'Sortear Delegación (Cold Call)')}</span>
            </>
          )}
        </button>

        {modoSinRepetir && paisesExcluidosRonda.length > 0 && (
          <button
            onClick={reiniciarRonda}
            title="Reiniciar bolsa de sorteo"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              color: 'var(--muted-text)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '9px 10px',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={15} />
          </button>
        )}
      </div>

      {/* ─── MODAL / PANEL LATERAL DE HISTORIAL ──────────────────────────── */}
      {mostrarHistorial && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--panel-color)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--card-header-bg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '700' }}>
              <History size={15} color="#3b82f6" />
              <span>{t('random.historyTitle', 'Historial de Delegaciones Sorteadas')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {historialSorteos.length > 0 && (
                <button
                  onClick={() => setHistorialSorteos([])}
                  title="Vaciar Historial"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => setMostrarHistorial(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-color)',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: '0 4px'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px'
          }}>
            {historialSorteos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted-text)', fontSize: '0.8rem' }}>
                {t('random.noHistoryYet', 'No hay sorteos realizados en esta sesión.')}
              </div>
            ) : (
              historialSorteos.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: idx === 0 ? 'rgba(59, 130, 246, 0.1)' : 'var(--card-header-bg)',
                    border: `1px solid ${idx === 0 ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-color)'}`,
                    marginBottom: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--muted-text)', width: '16px' }}>
                      #{historialSorteos.length - idx}
                    </span>
                    <CountryFlag bandera={item.pais.bandera} nombre={item.pais.nombre} size="sm" />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-color)' }}>
                        {item.pais.nombre}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
                        {t('random.drawnAt', 'Sorteado a las')} {item.hora}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      agregarOrador(item.pais);
                      triggerFeedback(`${item.pais.nombre} ${t('random.addedGSLFeedback', 'añadido a la Lista GSL')}`);
                    }}
                    title="Añadir a GSL"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      backgroundColor: 'var(--btn-bg)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '3px 6px',
                      fontSize: '0.68rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <UserPlus size={10} />
                    GSL
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectorAleatorio;
