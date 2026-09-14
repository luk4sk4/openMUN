import React, { useState, useMemo } from 'react';
import {
  Vote,
  Settings,
  Maximize2,
  Minimize2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ListFilter,
  Check,
  X,
  Minus,
  Sparkles,
  Users,
  Award,
  FileCheck2,
  FileX2,
  Trophy,
  PartyPopper
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import CountryFlag from '../common/CountryFlag';
import { useTranslation } from 'react-i18next';

const MiniVotacion = () => {
  const { t } = useTranslation();
  const { isLight } = useAccessibility();
  const {
    paises,
    votacionSesion,
    registrarVotoPais,
    configurarVotacion,
    resetearVotacion,
    enmiendasSesion,
    resolverEnmiendaResolucion
  } = useSession();

  const [modoVista, setModoVista] = useState('rollcall'); // 'rollcall' | 'lista'
  const [showSettings, setShowSettings] = useState(false);
  const [showExpandedModal, setShowExpandedModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  // Estados de Roll Call
  const [indiceRollCall, setIndiceRollCall] = useState(0);
  const [rondaRollCall, setRondaRollCall] = useState(1); // 1 = Primera Ronda, 2 = Segunda Ronda (Pasados)
  const [paisesPasados, setPaisesPasados] = useState([]); // IDs de países que pasaron en Ronda 1

  // Configuración de la votación actual
  const { asunto = 'Votación de Enmienda', tipoVotacion = 'procedural', tipoMayoria = 'simple', aplicarVeto = true, votos = {} } = votacionSesion || {};

  // Formulario local de ajustes
  const [tempAsunto, setTempAsunto] = useState(asunto);
  const [tempTipoVotacion, setTempTipoVotacion] = useState(tipoVotacion);
  const [tempTipoMayoria, setTempTipoMayoria] = useState(tipoMayoria);
  const [tempAplicarVeto, setTempAplicarVeto] = useState(aplicarVeto);

  // Intentar extraer el país proponente del asunto (ej. "Enmienda de Adición - Artículo 2 (Francia)")
  const proponenteDetectado = useMemo(() => {
    const match = asunto.match(/\(([^)]+)\)$/);
    if (match && match[1]) {
      const nombrePosible = match[1].trim();
      const paisObj = (paises || []).find(p => p.nombre?.toLowerCase() === nombrePosible.toLowerCase());
      return { nombre: nombrePosible, paisObj };
    }
    return null;
  }, [asunto, paises]);

  // Delegaciones presentes (excluyendo ausentes)
  const paisesAsistentes = useMemo(() => {
    return (paises || []).filter(p => p.estatus === 'Presente' || p.estatus === 'Presente y Votando');
  }, [paises]);

  const totalAsistentes = paisesAsistentes.length;

  // Lista de países para la ronda activa de Roll Call
  const listaRollCall = useMemo(() => {
    if (rondaRollCall === 1) {
      return [...paisesAsistentes].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));
    } else {
      return paisesAsistentes
        .filter(p => paisesPasados.includes(p.id))
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));
    }
  }, [paisesAsistentes, rondaRollCall, paisesPasados]);

  // Asegurar que el índice esté dentro del rango
  const paisActual = listaRollCall[indiceRollCall] || listaRollCall[0] || null;

  // Conteo de Votos
  const { favor, contra, abstencion, vetoEjercido, paisesConVeto } = useMemo(() => {
    let f = 0, c = 0, a = 0;
    const vetoP = [];

    paisesAsistentes.forEach(p => {
      const v = votos[p.id];
      if (v === 'favor') f++;
      else if (v === 'contra') {
        c++;
        if (aplicarVeto && p.veto) vetoP.push(p);
      } else if (v === 'abstencion') {
        a++;
      }
    });

    return {
      favor: f,
      contra: c,
      abstencion: a,
      vetoEjercido: vetoP.length > 0,
      paisesConVeto: vetoP
    };
  }, [paisesAsistentes, votos, aplicarVeto]);

  const votosEmitidos = favor + contra + abstencion;
  const votosPendientes = Math.max(0, totalAsistentes - votosEmitidos);
  const votosValidos = favor + contra;

  // Cálculo de Requisitos MUN
  const reqSimple = totalAsistentes > 0 ? Math.floor(totalAsistentes / 2) + 1 : 0;
  const reqDosTercios = totalAsistentes > 0 ? Math.ceil((totalAsistentes * 2) / 3) : 0;

  let requeridos = 0;
  let superada = false;

  if (tipoMayoria === 'simple') {
    requeridos = tipoVotacion === 'substantive' && votosValidos > 0 ? Math.floor(votosValidos / 2) + 1 : reqSimple;
    superada = favor > contra && favor >= requeridos;
  } else if (tipoMayoria === '2/3') {
    requeridos = tipoVotacion === 'substantive' && votosValidos > 0 ? Math.ceil((votosValidos * 2) / 3) : reqDosTercios;
    superada = favor >= requeridos && favor > 0;
  } else if (tipoMayoria === 'consensus') {
    requeridos = totalAsistentes;
    superada = contra === 0 && favor > 0;
  }

  const estadoVotacion = vetoEjercido
    ? 'VETO EJERCIDO'
    : (votosEmitidos > 0 && superada)
      ? 'APROBADA'
      : (votosEmitidos > 0 && contra >= requeridos)
        ? 'RECHAZADA'
        : 'EN CURSO';

  const votacionTerminada = totalAsistentes > 0 && (votosPendientes === 0 || estadoVotacion === 'VETO EJERCIDO');

  // Enmienda asociada si existe en el controlador de enmiendas
  const enmiendaAsociada = useMemo(() => {
    const list = enmiendasSesion?.enmiendas || [];
    if (proponenteDetectado?.nombre) {
      return list.find(e => e.paisProponente?.toLowerCase() === proponenteDetectado.nombre.toLowerCase() && e.estado === 'pendiente') || null;
    }
    return list.find(e => e.estado === 'pendiente') || null;
  }, [enmiendasSesion, proponenteDetectado]);

  // Manejo de voto en Roll Call
  const handleVotarRollCall = (tipoVoto) => {
    if (!paisActual) return;

    if (tipoVoto === 'pasar') {
      if (!paisesPasados.includes(paisActual.id)) {
        setPaisesPasados(prev => [...prev, paisActual.id]);
      }
    } else {
      registrarVotoPais(paisActual.id, tipoVoto);
      if (paisesPasados.includes(paisActual.id)) {
        setPaisesPasados(prev => prev.filter(id => id !== paisActual.id));
      }
    }

    // Avanzar al siguiente país
    if (indiceRollCall < listaRollCall.length - 1) {
      setIndiceRollCall(prev => prev + 1);
    } else if (rondaRollCall === 1 && paisesPasados.length > (tipoVoto === 'pasar' ? 0 : 1)) {
      // Pasar a ronda 2 si hay países pasados
      setRondaRollCall(2);
      setIndiceRollCall(0);
    } else {
      // Si concluyó la lista, abrir modal de resultado
      setShowResultModal(true);
    }
  };

  const handleReset = () => {
    resetearVotacion();
    setIndiceRollCall(0);
    setRondaRollCall(1);
    setPaisesPasados([]);
    setShowResultModal(false);
  };

  const handleGuardarAjustes = (e) => {
    e.preventDefault();
    configurarVotacion({
      asunto: tempAsunto,
      tipoVotacion: tempTipoVotacion,
      tipoMayoria: tempTipoMayoria,
      aplicarVeto: tempAplicarVeto
    });
    setShowSettings(false);
  };

  const handleAplicarDecisionEnmienda = (decision) => {
    if (enmiendaAsociada && resolverEnmiendaResolucion) {
      resolverEnmiendaResolucion(enmiendaAsociada.id, decision);
    }
    setShowResultModal(false);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--panel-bg)',
      color: 'var(--text-color)',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* ── HEADER MINI VOTACIÓN (Compacto) ── */}
      <div style={{
        padding: '0.5rem 0.75rem',
        paddingRight: '60px', // Espacio para controles superiores
        borderBottom: '1px solid var(--subborder-color)',
        backgroundColor: 'var(--card-header-bg)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        flexShrink: 0
      }}>
        <div style={{
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          padding: '0.25rem',
          borderRadius: '5px',
          color: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Vote size={15} />
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: '0.78rem',
            fontWeight: '800',
            color: 'var(--text-color)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {asunto || 'Votación Nominal'}
          </div>

          <div style={{
            fontSize: '0.64rem',
            color: 'var(--muted-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            flexWrap: 'nowrap',
            overflow: 'hidden'
          }}>
            <span style={{
              backgroundColor: tipoVotacion === 'substantive' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              color: tipoVotacion === 'substantive' ? '#a855f7' : '#3b82f6',
              padding: '0.05rem 0.3rem',
              borderRadius: '3px',
              fontWeight: '800',
              fontSize: '0.58rem'
            }}>
              {tipoVotacion === 'substantive' ? 'Sustantiva' : 'Procedimental'}
            </span>

            {proponenteDetectado && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                backgroundColor: 'rgba(255,255,255,0.06)',
                padding: '0.05rem 0.3rem',
                borderRadius: '3px',
                color: 'var(--text-color)',
                fontWeight: '700',
                fontSize: '0.6rem'
              }}>
                <CountryFlag country={proponenteDetectado.paisObj} bandera={proponenteDetectado.paisObj?.bandera} nombre={proponenteDetectado.nombre} size="xs" />
                <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {proponenteDetectado.nombre}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── BARRA DE HERRAMIENTAS Y VISTAS (Compacta) ── */}
      <div style={{
        padding: '0.3rem 0.6rem',
        borderBottom: '1px solid var(--subborder-color)',
        backgroundColor: 'var(--panel-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.25rem',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button
            onClick={() => setModoVista(m => m === 'rollcall' ? 'lista' : 'rollcall')}
            title={modoVista === 'rollcall' ? 'Ver Tabla Rápida' : 'Ver Modo Roll Call'}
            style={{
              background: 'var(--card-hover, rgba(255,255,255,0.05))',
              border: '1px solid var(--subborder-color)',
              borderRadius: '4px',
              padding: '0.2rem 0.45rem',
              color: 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.68rem',
              fontWeight: '600'
            }}
          >
            <ListFilter size={11} />
            <span>{modoVista === 'rollcall' ? 'Modo Lista' : 'Modo Roll Call'}</span>
          </button>

          <button
            onClick={() => {
              setTempAsunto(asunto);
              setTempTipoVotacion(tipoVotacion);
              setTempTipoMayoria(tipoMayoria);
              setTempAplicarVeto(aplicarVeto);
              setShowSettings(true);
            }}
            title="Ajustes de Votación"
            style={{
              background: 'var(--card-hover, rgba(255,255,255,0.05))',
              border: '1px solid var(--subborder-color)',
              borderRadius: '4px',
              padding: '0.2rem 0.45rem',
              color: 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              fontSize: '0.68rem',
              fontWeight: '600'
            }}
          >
            <Settings size={11} />
            <span>Ajustes</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {votosEmitidos > 0 && (
            <button
              onClick={() => setShowResultModal(true)}
              title="Ver Dictamen y Resultado en Grande"
              style={{
                background: estadoVotacion === 'APROBADA'
                  ? 'rgba(34, 197, 94, 0.2)'
                  : estadoVotacion === 'RECHAZADA'
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(59, 130, 246, 0.2)',
                border: '1px solid var(--subborder-color)',
                borderRadius: '4px',
                padding: '0.2rem 0.45rem',
                color: estadoVotacion === 'APROBADA' ? '#22c55e' : estadoVotacion === 'RECHAZADA' ? '#ef4444' : '#3b82f6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                fontSize: '0.68rem',
                fontWeight: '800'
              }}
            >
              <Award size={11} />
              <span>Veredicto</span>
            </button>
          )}

          <button
            onClick={() => setShowExpandedModal(true)}
            title="Expandir Votación Completa"
            style={{
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '4px',
              padding: '0.2rem 0.45rem',
              color: '#3b82f6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              fontSize: '0.68rem',
              fontWeight: '700'
            }}
          >
            <Maximize2 size={11} />
            <span>Expandir</span>
          </button>
        </div>
      </div>

      {/* ── CUERPO PRINCIPAL (Ultra Compacto y estilizado) ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {totalAsistentes === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            textAlign: 'center',
            padding: '0.75rem',
            color: 'var(--muted-text)',
            gap: '0.3rem'
          }}>
            <Users size={22} style={{ opacity: 0.4 }} />
            <div style={{ fontSize: '0.74rem', fontWeight: '700' }}>Sin delegaciones en sala</div>
            <div style={{ fontSize: '0.64rem', opacity: 0.8 }}>
              Pasa lista en la pestaña de Comienzo o Info para registrar asistencia.
            </div>
          </div>
        ) : modoVista === 'rollcall' ? (
          /* ── MODO ROLL CALL ULTRA COMPACTO ── */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.35rem' }}>
            {/* Navegación y Ronda */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--card-hover, rgba(255,255,255,0.03))',
              padding: '0.2rem 0.45rem',
              borderRadius: '4px',
              border: '1px solid var(--subborder-color)',
              fontSize: '0.68rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{
                  backgroundColor: rondaRollCall === 1 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                  color: rondaRollCall === 1 ? '#3b82f6' : '#eab308',
                  padding: '0.04rem 0.3rem',
                  borderRadius: '3px',
                  fontWeight: '800',
                  fontSize: '0.6rem'
                }}>
                  {rondaRollCall === 1 ? 'Ronda 1' : 'Ronda 2'}
                </span>
                <span style={{ color: 'var(--muted-text)', fontWeight: '700' }}>
                  {indiceRollCall + 1} / {listaRollCall.length}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                <button
                  onClick={() => setIndiceRollCall(prev => Math.max(0, prev - 1))}
                  disabled={indiceRollCall === 0}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-color)',
                    opacity: indiceRollCall === 0 ? 0.3 : 1,
                    cursor: indiceRollCall === 0 ? 'not-allowed' : 'pointer',
                    padding: '2px'
                  }}
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={() => setIndiceRollCall(prev => Math.min(listaRollCall.length - 1, prev + 1))}
                  disabled={indiceRollCall >= listaRollCall.length - 1}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-color)',
                    opacity: indiceRollCall >= listaRollCall.length - 1 ? 0.3 : 1,
                    cursor: indiceRollCall >= listaRollCall.length - 1 ? 'not-allowed' : 'pointer',
                    padding: '2px'
                  }}
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {/* Tarjeta de Delegación Activa Horizontal y Ultra Compacta */}
            {paisActual && (
              <div style={{
                backgroundColor: 'var(--card-header-bg)',
                border: '1px solid var(--subborder-color)',
                borderRadius: '6px',
                padding: '0.45rem 0.6rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
                    <CountryFlag
                      country={paisActual}
                      bandera={paisActual.bandera}
                      nombre={paisActual.nombre}
                      size="sm"
                      style={{ borderRadius: '3px' }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-color)', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {paisActual.nombre}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '1px' }}>
                        <span style={{
                          fontSize: '0.55rem',
                          fontWeight: '700',
                          padding: '0.02rem 0.25rem',
                          borderRadius: '2px',
                          backgroundColor: paisActual.estatus === 'Presente y Votando' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                          color: paisActual.estatus === 'Presente y Votando' ? '#eab308' : '#22c55e'
                        }}>
                          {paisActual.estatus}
                        </span>
                        {paisActual.veto && (
                          <span style={{
                            fontSize: '0.55rem',
                            fontWeight: '800',
                            padding: '0.02rem 0.2rem',
                            borderRadius: '2px',
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444'
                          }}>
                            Veto P5
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Voto Actual Emitido Badge */}
                  {votos[paisActual.id] ? (
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: '800',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '3px',
                      backgroundColor: votos[paisActual.id] === 'favor'
                        ? 'rgba(34, 197, 94, 0.2)'
                        : votos[paisActual.id] === 'contra'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'rgba(234, 179, 8, 0.2)',
                      color: votos[paisActual.id] === 'favor' ? '#22c55e' : votos[paisActual.id] === 'contra' ? '#ef4444' : '#eab308'
                    }}>
                      {votos[paisActual.id].toUpperCase()}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.6rem', color: 'var(--muted-text)', fontWeight: '600' }}>
                      Pendiente
                    </span>
                  )}
                </div>

                {/* Fila de 4 Botones Rápidos (Favor, Contra, Abs, Pasar) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.25rem',
                  width: '100%',
                  marginTop: '0.15rem'
                }}>
                  <button
                    onClick={() => handleVotarRollCall('favor')}
                    style={{
                      backgroundColor: votos[paisActual.id] === 'favor' ? '#16a34a' : 'rgba(34, 197, 94, 0.15)',
                      border: `1px solid ${votos[paisActual.id] === 'favor' ? '#22c55e' : 'rgba(34, 197, 94, 0.35)'}`,
                      color: votos[paisActual.id] === 'favor' ? '#ffffff' : '#22c55e',
                      fontWeight: '800',
                      padding: '0.35rem 0.2rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.15rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Check size={12} /> Favor
                  </button>

                  <button
                    onClick={() => handleVotarRollCall('contra')}
                    style={{
                      backgroundColor: votos[paisActual.id] === 'contra' ? '#dc2626' : 'rgba(239, 68, 68, 0.15)',
                      border: `1px solid ${votos[paisActual.id] === 'contra' ? '#ef4444' : 'rgba(239, 68, 68, 0.35)'}`,
                      color: votos[paisActual.id] === 'contra' ? '#ffffff' : '#ef4444',
                      fontWeight: '800',
                      padding: '0.35rem 0.2rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.15rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <X size={12} /> Contra
                  </button>

                  <button
                    onClick={() => handleVotarRollCall('abstencion')}
                    disabled={paisActual.estatus === 'Presente y Votando'}
                    title={paisActual.estatus === 'Presente y Votando' ? 'No puede abstenerse (Presente y Votando)' : 'Abstención'}
                    style={{
                      backgroundColor: votos[paisActual.id] === 'abstencion' ? '#ca8a04' : 'rgba(234, 179, 8, 0.15)',
                      border: `1px solid ${votos[paisActual.id] === 'abstencion' ? '#eab308' : 'rgba(234, 179, 8, 0.35)'}`,
                      color: votos[paisActual.id] === 'abstencion' ? '#ffffff' : '#eab308',
                      fontWeight: '700',
                      padding: '0.35rem 0.2rem',
                      borderRadius: '4px',
                      cursor: paisActual.estatus === 'Presente y Votando' ? 'not-allowed' : 'pointer',
                      opacity: paisActual.estatus === 'Presente y Votando' ? 0.35 : 1,
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.15rem'
                    }}
                  >
                    <Minus size={12} /> Abs
                  </button>

                  <button
                    onClick={() => handleVotarRollCall('pasar')}
                    disabled={rondaRollCall === 2}
                    title={rondaRollCall === 2 ? 'No se puede pasar en segunda ronda' : 'Pasar a segunda ronda'}
                    style={{
                      backgroundColor: 'rgba(168, 85, 247, 0.12)',
                      border: '1px solid rgba(168, 85, 247, 0.35)',
                      color: '#c084fc',
                      fontWeight: '700',
                      padding: '0.35rem 0.2rem',
                      borderRadius: '4px',
                      cursor: rondaRollCall === 2 ? 'not-allowed' : 'pointer',
                      opacity: rondaRollCall === 2 ? 0.35 : 1,
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.15rem'
                    }}
                  >
                    <RotateCcw size={11} /> Pasar
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── MODO LISTA COMPACTA CON BANDERAS ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {paisesAsistentes.map(p => {
              const votoActual = votos[p.id];
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.25rem 0.45rem',
                    backgroundColor: 'var(--card-hover, rgba(255,255,255,0.03))',
                    borderRadius: '4px',
                    border: `1px solid ${votoActual ? 'rgba(59, 130, 246, 0.4)' : 'var(--subborder-color)'}`,
                    gap: '0.3rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: 0, flex: 1 }}>
                    <CountryFlag country={p} bandera={p.bandera} nombre={p.nombre} size="xs" />
                    <span style={{ fontSize: '0.7rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.nombre}
                    </span>
                    {p.veto && <span style={{ fontSize: '0.55rem', color: '#ef4444', fontWeight: '800' }}>[P5]</span>}
                  </div>

                  <div style={{ display: 'flex', gap: '0.12rem' }}>
                    <button
                      onClick={() => registrarVotoPais(p.id, votoActual === 'favor' ? null : 'favor')}
                      style={{
                        padding: '0.12rem 0.3rem',
                        borderRadius: '3px',
                        border: 'none',
                        backgroundColor: votoActual === 'favor' ? '#22c55e' : 'rgba(34, 197, 94, 0.15)',
                        color: votoActual === 'favor' ? '#fff' : '#22c55e',
                        cursor: 'pointer',
                        fontSize: '0.62rem',
                        fontWeight: '700'
                      }}
                    >
                      Sí
                    </button>
                    <button
                      onClick={() => registrarVotoPais(p.id, votoActual === 'contra' ? null : 'contra')}
                      style={{
                        padding: '0.12rem 0.3rem',
                        borderRadius: '3px',
                        border: 'none',
                        backgroundColor: votoActual === 'contra' ? '#ef4444' : 'rgba(239, 68, 68, 0.15)',
                        color: votoActual === 'contra' ? '#fff' : '#ef4444',
                        cursor: 'pointer',
                        fontSize: '0.62rem',
                        fontWeight: '700'
                      }}
                    >
                      No
                    </button>
                    <button
                      onClick={() => registrarVotoPais(p.id, votoActual === 'abstencion' ? null : 'abstencion')}
                      disabled={p.estatus === 'Presente y Votando'}
                      style={{
                        padding: '0.12rem 0.3rem',
                        borderRadius: '3px',
                        border: 'none',
                        backgroundColor: votoActual === 'abstencion' ? '#eab308' : 'rgba(234, 179, 8, 0.15)',
                        color: votoActual === 'abstencion' ? '#fff' : '#eab308',
                        cursor: p.estatus === 'Presente y Votando' ? 'not-allowed' : 'pointer',
                        opacity: p.estatus === 'Presente y Votando' ? 0.3 : 1,
                        fontSize: '0.62rem',
                        fontWeight: '700'
                      }}
                    >
                      Abs
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FOOTER RESULTADOS EN VIVO (Ultra Compacto) ── */}
      <div style={{
        padding: '0.35rem 0.55rem',
        borderTop: '1px solid var(--subborder-color)',
        backgroundColor: 'var(--card-header-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.3rem',
        flexShrink: 0
      }}>
        {/* Conteo y Estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.66rem', fontWeight: '700' }}>
          <span style={{ color: '#22c55e' }}>F: {favor}</span>
          <span style={{ color: '#ef4444' }}>C: {contra}</span>
          <span style={{ color: '#eab308' }}>A: {abstencion}</span>
          <span style={{ color: '#60a5fa' }}>Req: {requeridos}</span>
        </div>

        {/* Estado / Dictamen Interactivo y Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <div
            onClick={() => votosEmitidos > 0 && setShowResultModal(true)}
            style={{
              fontSize: '0.64rem',
              fontWeight: '800',
              padding: '0.12rem 0.35rem',
              borderRadius: '3px',
              backgroundColor: estadoVotacion === 'APROBADA'
                ? 'rgba(34, 197, 94, 0.2)'
                : estadoVotacion === 'RECHAZADA' || estadoVotacion === 'VETO EJERCIDO'
                  ? 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(59, 130, 246, 0.15)',
              color: estadoVotacion === 'APROBADA'
                ? '#22c55e'
                : estadoVotacion === 'RECHAZADA' || estadoVotacion === 'VETO EJERCIDO'
                  ? '#ef4444'
                  : '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              cursor: votosEmitidos > 0 ? 'pointer' : 'default'
            }}
          >
            {estadoVotacion === 'APROBADA' && <CheckCircle2 size={11} />}
            {estadoVotacion === 'RECHAZADA' && <XCircle size={11} />}
            {estadoVotacion === 'VETO EJERCIDO' && <ShieldAlert size={11} />}
            <span>{estadoVotacion}</span>
          </div>

          <button
            onClick={handleReset}
            title="Reiniciar Votación"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.1rem',
              fontSize: '0.62rem',
              fontWeight: '600'
            }}
          >
            <RotateCcw size={10} />
          </button>
        </div>
      </div>

      {/* ── MODAL DE RESULTADO FINAL EN GRANDE (WOW Effect) ── */}
      {showResultModal && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.75rem'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-bg)',
            border: `2px solid ${
              estadoVotacion === 'APROBADA'
                ? '#22c55e'
                : estadoVotacion === 'RECHAZADA' || estadoVotacion === 'VETO EJERCIDO'
                  ? '#ef4444'
                  : '#3b82f6'
            }`,
            borderRadius: '10px',
            padding: '1.25rem',
            width: '100%',
            maxWidth: '360px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '0.75rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
            animation: 'scaleUp 0.2s ease'
          }}>
            {/* Gran Icono de Estado */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: estadoVotacion === 'APROBADA'
                ? 'rgba(34, 197, 94, 0.2)'
                : estadoVotacion === 'RECHAZADA' || estadoVotacion === 'VETO EJERCIDO'
                  ? 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: estadoVotacion === 'APROBADA' ? '#22c55e' : estadoVotacion === 'RECHAZADA' || estadoVotacion === 'VETO EJERCIDO' ? '#ef4444' : '#3b82f6'
            }}>
              {estadoVotacion === 'APROBADA' && <CheckCircle2 size={36} />}
              {estadoVotacion === 'RECHAZADA' && <XCircle size={36} />}
              {estadoVotacion === 'VETO EJERCIDO' && <ShieldAlert size={36} />}
              {estadoVotacion === 'EN CURSO' && <Vote size={32} />}
            </div>

            <div>
              <div style={{
                fontSize: '1.2rem',
                fontWeight: '900',
                letterSpacing: '0.02em',
                color: estadoVotacion === 'APROBADA' ? '#22c55e' : estadoVotacion === 'RECHAZADA' || estadoVotacion === 'VETO EJERCIDO' ? '#ef4444' : '#3b82f6'
              }}>
                {estadoVotacion === 'APROBADA' ? '¡ENMIENDA APROBADA!' : estadoVotacion === 'RECHAZADA' ? 'ENMIENDA RECHAZADA' : estadoVotacion === 'VETO EJERCIDO' ? 'VETO EJERCIDO' : 'RESULTADO PARCIAL'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-color)', marginTop: '2px', fontWeight: '700' }}>
                {asunto}
              </div>
            </div>

            {/* Marcador de Votos */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '0.4rem',
              width: '100%',
              backgroundColor: 'var(--card-header-bg)',
              padding: '0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--subborder-color)'
            }}>
              <div>
                <div style={{ fontSize: '0.62rem', color: '#22c55e', fontWeight: '700' }}>A FAVOR</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#22c55e' }}>{favor}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.62rem', color: '#ef4444', fontWeight: '700' }}>EN CONTRA</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#ef4444' }}>{contra}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.62rem', color: '#eab308', fontWeight: '700' }}>ABSTENCIÓN</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#eab308' }}>{abstencion}</div>
              </div>
            </div>

            <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
              Umbral requerido: {requeridos} votos ({tipoMayoria === 'simple' ? 'Mayoría Simple' : tipoMayoria === '2/3' ? '2/3' : 'Consenso'})
            </div>

            {/* Acciones directas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%', marginTop: '0.2rem' }}>
              {enmiendaAsociada && (
                <button
                  onClick={() => handleAplicarDecisionEnmienda(estadoVotacion === 'APROBADA' ? 'aceptada' : 'rechazada')}
                  style={{
                    backgroundColor: estadoVotacion === 'APROBADA' ? '#16a34a' : '#dc2626',
                    border: 'none',
                    color: '#ffffff',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Sparkles size={13} /> {estadoVotacion === 'APROBADA' ? 'Aplicar Aceptación a Resolución' : 'Registrar como Rechazada'}
                </button>
              )}

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  onClick={handleReset}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: '1px solid var(--subborder-color)',
                    color: 'var(--text-color)',
                    padding: '0.45rem',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Nueva Votación
                </button>
                <button
                  onClick={() => setShowResultModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--btn-bg)',
                    border: 'none',
                    color: 'var(--btn-text)',
                    padding: '0.45rem',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE AJUSTES ── */}
      {showSettings && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.75rem'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--subborder-color)',
            borderRadius: '8px',
            padding: '0.9rem',
            width: '100%',
            maxWidth: '300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            boxShadow: isLight ? '0 12px 30px rgba(0,0,0,0.15)' : '0 12px 30px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '800' }}>Configuración de Votación</div>
              <button
                onClick={() => setShowSettings(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleGuardarAjustes} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.15rem' }}>
                  Asunto / Moción / Enmienda:
                </label>
                <input
                  type="text"
                  value={tempAsunto}
                  onChange={e => setTempAsunto(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.5rem',
                    backgroundColor: isLight ? '#ffffff' : 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '4px',
                    color: 'var(--text-color)',
                    fontSize: '0.74rem'
                  }}
                  placeholder="Ej. Enmienda de Adición - Art. 2"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.15rem' }}>
                  Naturaleza del Voto:
                </label>
                <select
                  value={tempTipoVotacion}
                  onChange={e => setTempTipoVotacion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.5rem',
                    backgroundColor: isLight ? '#ffffff' : 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '4px',
                    color: 'var(--text-color)',
                    fontSize: '0.74rem'
                  }}
                >
                  <option value="procedural">Procedimental (Sin Abstenciones)</option>
                  <option value="substantive">Sustantiva (Permite Abstenciones)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.15rem' }}>
                  Umbral de Mayoría:
                </label>
                <select
                  value={tempTipoMayoria}
                  onChange={e => setTempTipoMayoria(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.5rem',
                    backgroundColor: isLight ? '#ffffff' : 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '4px',
                    color: 'var(--text-color)',
                    fontSize: '0.74rem'
                  }}
                >
                  <option value="simple">Mayoría Simple (50% + 1)</option>
                  <option value="2/3">Dos Tercios (2/3)</option>
                  <option value="consensus">Consenso</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
                <input
                  type="checkbox"
                  id="chkMiniVeto"
                  checked={tempAplicarVeto}
                  onChange={e => setTempAplicarVeto(e.target.checked)}
                />
                <label htmlFor="chkMiniVeto" style={{ fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer' }}>
                  Habilitar poder de Veto (P5)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem' }}>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  style={{
                    flex: 1,
                    padding: '0.35rem',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '4px',
                    color: 'var(--text-color)',
                    fontSize: '0.72rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.35rem',
                    backgroundColor: 'var(--btn-bg)',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'var(--btn-text)',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DE VOTACIÓN EXPANDIDA PANORÁMICA ── */}
      {showExpandedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--subborder-color)',
            borderRadius: '10px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
          }}>
            {/* Header del Modal Expandido */}
            <div style={{
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid var(--subborder-color)',
              backgroundColor: 'var(--card-header-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Vote size={20} color="#3b82f6" />
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: '800' }}>{asunto}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)' }}>
                    {totalAsistentes} Delegaciones · Mayoría {tipoMayoria} · {tipoVotacion === 'substantive' ? 'Sustantiva' : 'Procedimental'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowExpandedModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: '5px',
                  padding: '0.35rem 0.55rem',
                  color: 'var(--text-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  fontWeight: '700'
                }}
              >
                <Minimize2 size={14} /> Cerrar Vista
              </button>
            </div>

            {/* Contenido del Modal Expandido */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Resumen de Resultados */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.6rem'
              }}>
                <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#22c55e' }}>A FAVOR</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#22c55e' }}>{favor}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#ef4444' }}>EN CONTRA</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#ef4444' }}>{contra}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '6px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#eab308' }}>ABSTENCIONES</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#eab308' }}>{abstencion}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#3b82f6' }}>REQUERIDOS</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#3b82f6' }}>{requeridos}</div>
                </div>
              </div>

              {/* Matriz Completa de Votos */}
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                  Desglose de Votos por Delegación
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '0.4rem'
                }}>
                  {paisesAsistentes.map(p => {
                    const voto = votos[p.id];
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.4rem 0.6rem',
                          backgroundColor: 'var(--card-hover, rgba(255,255,255,0.03))',
                          borderRadius: '5px',
                          border: `1px solid ${
                            voto === 'favor'
                              ? 'rgba(34, 197, 94, 0.5)'
                              : voto === 'contra'
                                ? 'rgba(239, 68, 68, 0.5)'
                                : voto === 'abstencion'
                                  ? 'rgba(234, 179, 8, 0.5)'
                                  : 'var(--subborder-color)'
                          }`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <CountryFlag country={p} bandera={p.bandera} nombre={p.nombre} size="xs" />
                          <span style={{ fontSize: '0.78rem', fontWeight: '700' }}>{p.nombre}</span>
                        </div>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          color: voto === 'favor' ? '#22c55e' : voto === 'contra' ? '#ef4444' : voto === 'abstencion' ? '#eab308' : 'var(--muted-text)'
                        }}>
                          {voto ? voto.toUpperCase() : 'PENDIENTE'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniVotacion;
