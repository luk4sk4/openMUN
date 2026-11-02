import React, { useState, useMemo } from 'react';
import {
  Vote,
  Crown,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowUpDown,
  Search,
  Play,
  ShieldAlert,
  Check,
  X,
  Info,

  HelpCircle,
  Users,
  Scale,
  Target
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import CountryFlag from '../common/CountryFlag';
import { useTranslation } from 'react-i18next';

const VotacionOficial = () => {
  const { t } = useTranslation();
  const { isLight } = useAccessibility();
  const vetoOrange = isLight ? '#ea580c' : '#f97316';
  const vetoOrangeBg = isLight ? 'rgba(234, 88, 12, 0.1)' : 'rgba(249, 115, 22, 0.15)';
  const vetoOrangeBorder = isLight ? 'rgba(234, 88, 12, 0.35)' : 'rgba(249, 115, 22, 0.4)';
  const {
    paises,
    votacionSesion,
    registrarVotoPais,
    configurarVotacion,
    resetearVotacion
  } = useSession();

  const [busqueda, setBusqueda] = useState('');
  const [criterioOrden, setCriterioOrden] = useState('alphabetical_asc'); // 'alphabetical_asc' | 'alphabetical_desc' | 'vote_status' | 'p5_veto' | 'roll_call'

  // Estado para Roll Call Nominal de 2 Rondas
  const [modoRollCall, setModoRollCall] = useState(false);
  const [rondaRollCall, setRondaRollCall] = useState(1); // 1 = Primera Ronda, 2 = Segunda Ronda (Pasados)
  const [indiceRollCall, setIndiceRollCall] = useState(0);
  const [paisesPasados, setPaisesPasados] = useState([]); // IDs de países que seleccionaron 'Pasar' en Ronda 1

  const { asunto = 'Proyecto de Resolución / Moción', tipoVotacion = 'procedural', tipoMayoria = 'simple', aplicarVeto = true, votos = {} } = votacionSesion || {};

  // Conteo de Quórum y Asistencia
  const totalPaises = paises.length;
  const presentes = useMemo(() => paises.filter(p => p.estatus === 'Presente').length, [paises]);
  const presentesYVotando = useMemo(() => paises.filter(p => p.estatus === 'Presente y Votando').length, [paises]);
  const ausentes = useMemo(() => paises.filter(p => p.estatus === 'Ausente').length, [paises]);

  // Filtrado de países asistentes (excluyendo ausentes)
  const paisesAsistentes = useMemo(() => {
    return paises.filter(p => p.estatus === 'Presente' || p.estatus === 'Presente y Votando');
  }, [paises]);

  const totalAsistentes = paisesAsistentes.length;

  // Umbrales de Mayorías calculados con el número de gente presente/votando en ese momento
  const reqSimpleQuorum = totalAsistentes > 0 ? Math.floor(totalAsistentes / 2) + 1 : 0;
  const reqDosTerciosQuorum = totalAsistentes > 0 ? Math.ceil((totalAsistentes * 2) / 3) : 0;
  const reqAbsolutaTotal = totalPaises > 0 ? Math.floor(totalPaises / 2) + 1 : 0;

  // Conteo de Votos
  const { favor, contra, abstencion, vetoEjercido, paisesConVetoEfectuado } = useMemo(() => {
    let f = 0, c = 0, a = 0;
    const vetoPaises = [];

    paisesAsistentes.forEach(p => {
      const v = votos[p.id];
      if (v === 'favor') f++;
      else if (v === 'contra') {
        c++;
        if (aplicarVeto && p.veto) {
          vetoPaises.push(p);
        }
      }
      else if (v === 'abstencion') a++;
    });

    return {
      favor: f,
      contra: c,
      abstencion: a,
      vetoEjercido: vetoPaises.length > 0,
      paisesConVetoEfectuado: vetoPaises
    };
  }, [paisesAsistentes, votos, aplicarVeto]);

  const votosEmitidos = favor + contra + abstencion;
  const votosPendientes = totalAsistentes - votosEmitidos;

  // Cálculo de Umbral según Tipo de Mayoría y MUN Rules
  const votosValidosSinAbstencion = favor + contra;

  let requeridos = 0;
  let pasaSuperaMayoria = false;
  let textoRequerido = '';

  if (tipoMayoria === 'simple') {
    if (tipoVotacion === 'substantive' && votosEmitidos > 0 && votosValidosSinAbstencion > 0) {
      requeridos = Math.floor(votosValidosSinAbstencion / 2) + 1;
      pasaSuperaMayoria = favor > contra && favor >= requeridos;
      textoRequerido = `${requeridos} ${t('voting.vote', 'voto')}(s) ${t('voting.inFavor', 'A Favor')} (50%+1 ${t('common.of', 'de')} ${votosValidosSinAbstencion} ${t('voting.validVotes', 'votos válidos emitidos')} | Base quórum: ${reqSimpleQuorum})`;
    } else {
      requeridos = reqSimpleQuorum;
      pasaSuperaMayoria = favor > contra && favor >= requeridos;
      textoRequerido = `${requeridos} ${t('voting.vote', 'voto')}(s) ${t('voting.inFavor', 'A Favor')} (50% + 1 ${t('common.of', 'de')} ${totalAsistentes} ${t('voting.delegationsInRoom', 'delegaciones en sala')})`;
    }
  } else if (tipoMayoria === '2/3') {
    if (tipoVotacion === 'substantive' && votosEmitidos > 0 && votosValidosSinAbstencion > 0) {
      requeridos = Math.ceil((votosValidosSinAbstencion * 2) / 3);
      pasaSuperaMayoria = favor >= requeridos && favor > 0;
      textoRequerido = `${requeridos} ${t('voting.vote', 'voto')}(s) ${t('voting.inFavor', 'A Favor')} (2/3 ${t('common.of', 'de')} ${votosValidosSinAbstencion} ${t('voting.validVotes', 'votos válidos emitidos')} | Base quórum: ${reqDosTerciosQuorum})`;
    } else {
      requeridos = reqDosTerciosQuorum;
      pasaSuperaMayoria = favor >= requeridos && favor > 0;
      textoRequerido = `${requeridos} ${t('voting.vote', 'voto')}(s) ${t('voting.inFavor', 'A Favor')} (2/3 ${t('common.of', 'de')} ${totalAsistentes} ${t('voting.delegationsInRoom', 'delegaciones en sala')})`;
    }
  } else if (tipoMayoria === 'consensus') {
    requeridos = 0;
    pasaSuperaMayoria = contra === 0 && favor > 0 && votosPendientes === 0;
    textoRequerido = `0 ${t('voting.votes', 'votos')} ${t('voting.against', 'En Contra')} (100% ${t('voting.consensus', 'Consenso')} ${t('common.of', 'de')} ${totalAsistentes} ${t('voting.delegationsInRoom', 'delegaciones en sala')})`;
  }

  let estadoVotacion = 'SIN_VOTOS';
  let mensajeDictamen = t('voting.noVotesYet', 'Sin votaciones registradas aún.');

  if (votosEmitidos === 0 && totalAsistentes === 0) {
    estadoVotacion = 'SIN_VOTOS';
    mensajeDictamen = t('voting.noDelegationsYet', 'Sin delegaciones registradas ni votaciones aún.');
  } else if (votosEmitidos === 0) {
    estadoVotacion = 'SIN_VOTOS';
    mensajeDictamen = `${t('voting.noVotesRegistered', 'No se han registrado votos todavía.')} ${t('voting.requires', 'Requiere')} ${requeridos} ${t('voting.vote', 'voto')}(s) ${t('voting.toApprove', 'para aprobar.')} ${t('voting.startRollCall', 'Inicia el Roll Call o vota manualmente.')}`;
  } else if (vetoEjercido) {
    estadoVotacion = 'VETADA';
    const nombresVeto = paisesConVetoEfectuado.map(p => p.nombre).join(', ');
    mensajeDictamen = `${t('voting.vetoedBy', 'REPROBADA POR VETO (Veto ejercido por:')} ${nombresVeto})`;
  } else if (votosPendientes === 0 || (favor >= requeridos && tipoMayoria !== 'consensus')) {
    if (pasaSuperaMayoria) {
      estadoVotacion = 'APROBADA';
      mensajeDictamen = `${t('voting.passedExclamation', '¡APROBADA!')} (${favor} ${t('voting.inFavor', 'A Favor')} vs ${contra} ${t('voting.against', 'En Contra')}${tipoVotacion === 'substantive' ? `, ${abstencion} ${t('voting.abstentions', 'Abstenciones')}` : ''})`;
    } else {
      estadoVotacion = 'REPROBADA';
      mensajeDictamen = `${t('voting.rejectedLabel', 'REPROBADA')} (${favor} ${t('voting.inFavor', 'A Favor')} vs ${contra} ${t('voting.against', 'En Contra')} — ${t('voting.requires', 'Requiere')}: ${textoRequerido})`;
    }
  } else {
    estadoVotacion = 'EN_PROCESO';
    const votosFaltantes = Math.max(0, requeridos - favor);
    mensajeDictamen = `${t('voting.inProgress', 'Votación en proceso...')} (${favor}/${requeridos} ${t('voting.needed', 'necesarios')}, ${t('voting.missing', 'faltan')} ${votosFaltantes} ${t('voting.inFavor', 'a favor')})`;
  }

  // Lista de Países para la Ronda de Roll Call Actual
  const listaPaisesRondaRollCall = useMemo(() => {
    const todosOrdenados = [...paisesAsistentes].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    if (rondaRollCall === 1) {
      return todosOrdenados;
    } else {
      // Ronda 2: Únicamente países que pasaron en Ronda 1 (lista estable)
      return todosOrdenados.filter(p => paisesPasados.includes(p.id));
    }
  }, [paisesAsistentes, rondaRollCall, paisesPasados]);

  const paisActualRollCall = listaPaisesRondaRollCall[indiceRollCall] || null;

  // Iniciar / Resetear Modo Roll Call
  const toggleModoRollCall = () => {
    if (!modoRollCall) {
      setModoRollCall(true);
      setRondaRollCall(1);
      setIndiceRollCall(0);
      setPaisesPasados([]);
    } else {
      setModoRollCall(false);
    }
  };

  // Voto en Roll Call Nominal con avance de ronda
  const registrarYAvanzarRollCall = (voto) => {
    if (!paisActualRollCall) return;

    let nuevosPasados = paisesPasados;
    if (voto === 'pasar') {
      if (!paisesPasados.includes(paisActualRollCall.id)) {
        nuevosPasados = [...paisesPasados, paisActualRollCall.id];
        setPaisesPasados(nuevosPasados);
      }
    } else {
      registrarVotoPais(paisActualRollCall.id, voto);
    }

    // Avanzar dentro de la lista actual
    if (indiceRollCall < listaPaisesRondaRollCall.length - 1) {
      setIndiceRollCall(prev => prev + 1);
    } else {
      // Final de la ronda actual
      if (rondaRollCall === 1) {
        if (nuevosPasados.length > 0) {
          setRondaRollCall(2);
          setIndiceRollCall(0);
        } else {
          setModoRollCall(false);
        }
      } else {
        // Final de la Ronda 2
        setModoRollCall(false);
      }
    }
  };

  // Lista de Países procesada para vista principal
  const listaPaisesProcesada = useMemo(() => {
    let result = [...paises];

    if (busqueda.trim()) {
      result = result.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
    }

    result.sort((a, b) => {
      if (criterioOrden === 'alphabetical_asc') return a.nombre.localeCompare(b.nombre, 'es');
      if (criterioOrden === 'alphabetical_desc') return b.nombre.localeCompare(a.nombre, 'es');
      if (criterioOrden === 'vote_status') {
        const orderMap = { favor: 1, contra: 2, abstencion: 3, undefined: 4 };
        return (orderMap[votos[a.id]] || 4) - (orderMap[votos[b.id]] || 4);
      }
      if (criterioOrden === 'p5_veto') {
        if (a.veto === b.veto) return a.nombre.localeCompare(b.nombre, 'es');
        return a.veto ? -1 : 1;
      }
      if (criterioOrden === 'roll_call') {
        const statusMap = { 'Presente y Votando': 1, 'Presente': 2, 'Ausente': 3 };
        return (statusMap[a.estatus] || 4) - (statusMap[b.estatus] || 4);
      }
      return 0;
    });

    return result;
  }, [paises, busqueda, criterioOrden, votos]);

  return (
    <div style={{
      padding: '0.65rem 0.75rem',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      backgroundColor: 'var(--panel-color)',
      color: 'var(--text-color)',
      fontFamily: 'var(--font-family)',
      borderRadius: 'var(--border-radius)',
      border: '1px solid var(--border-color)',
      gap: '0.4rem',
      fontSize: '0.85rem'
    }}>
      {/* ── Header: Asunto y Selectores de Configuración (Consolidados en 2 Filas) ── */}
      <div style={{
        backgroundColor: 'var(--card-header-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius)',
        padding: '0.45rem 0.65rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem'
      }}>
        {/* Fila 1: Asunto del Proyecto/Moción + Toggle Veto P5 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
            <Vote size={15} style={{ color: 'var(--accent-color)', opacity: 0.85, flexShrink: 0 }} />
            <input
              type="text"
              value={asunto}
              onChange={e => configurarVotacion({ asunto: e.target.value })}
              placeholder={t('voting.subjectPlaceholder', 'Asunto o Título del Proyecto de Resolución / Moción...')}
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: '1px dashed var(--border-color)',
                color: 'var(--text-color)',
                fontFamily: 'var(--font-family)',
                fontWeight: '700',
                fontSize: '0.85rem',
                outline: 'none',
                padding: '0.1rem 0'
              }}
            />
          </div>

          {/* Toggle Veto P5 (Naranja) */}
          <button
            type="button"
            aria-pressed={aplicarVeto}
            onClick={() => configurarVotacion({ aplicarVeto: !aplicarVeto })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.22rem 0.55rem',
              borderRadius: 'var(--border-radius)',
              border: `1px solid ${aplicarVeto ? vetoOrangeBorder : 'var(--border-color)'}`,
              backgroundColor: aplicarVeto ? vetoOrangeBg : 'var(--input-bg, var(--panel-color))',
              color: aplicarVeto ? vetoOrange : 'var(--muted-text)',
              fontSize: '0.72rem',
              fontWeight: '700',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            title="Activar/desactivar evaluación de Veto P5"
          >
            <Crown size={13} color={aplicarVeto ? vetoOrange : 'var(--muted-text)'} fill={aplicarVeto ? vetoOrange : 'none'} />
            <span>{t('voting.vetoP5', 'Veto P5')}: {aplicarVeto ? t('common.activeOn', 'ON') : t('common.inactiveOff', 'OFF')}</span>
          </button>
        </div>

        {/* Fila 2: Tipo de Votación + Selector de Mayoría Compacto */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
          {/* Votación Procedimental vs Sustantiva */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'var(--input-bg, var(--panel-color))',
            padding: '2px',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--subborder-color)'
          }}>
            <button
              type="button"
              aria-pressed={tipoVotacion === 'procedural'}
              onClick={() => configurarVotacion({ tipoVotacion: 'procedural' })}
              style={{
                padding: '0.2rem 0.5rem',
                fontSize: '0.72rem',
                fontWeight: tipoVotacion === 'procedural' ? '700' : '600',
                borderRadius: 'calc(var(--border-radius) - 2px)',
                border: `1px solid ${tipoVotacion === 'procedural' ? 'var(--accent-color)' : 'transparent'}`,
                backgroundColor: tipoVotacion === 'procedural' ? 'var(--accent-soft)' : 'transparent',
                color: tipoVotacion === 'procedural' ? 'var(--accent-color)' : 'var(--muted-text)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Votación Procedimental: PROHIBIDA LA ABSTENCIÓN"
            >
              {t('voting.proceduralShort', 'Procedimental')}
            </button>
            <button
              type="button"
              aria-pressed={tipoVotacion === 'substantive'}
              onClick={() => configurarVotacion({ tipoVotacion: 'substantive' })}
              style={{
                padding: '0.2rem 0.5rem',
                fontSize: '0.72rem',
                fontWeight: tipoVotacion === 'substantive' ? '700' : '600',
                borderRadius: 'calc(var(--border-radius) - 2px)',
                border: `1px solid ${tipoVotacion === 'substantive' ? 'var(--accent-color)' : 'transparent'}`,
                backgroundColor: tipoVotacion === 'substantive' ? 'var(--accent-soft)' : 'transparent',
                color: tipoVotacion === 'substantive' ? 'var(--accent-color)' : 'var(--muted-text)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Votación Sustantiva: PERMITIDA LA ABSTENCIÓN"
            >
              {t('voting.substantiveShort', 'Sustantiva')}
            </button>
          </div>

          {/* Selector de Mayoría en Pastillas Compactas */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'var(--input-bg, var(--panel-color))',
            padding: '2px',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--subborder-color)'
          }}>
            <button
              type="button"
              aria-pressed={tipoMayoria === 'simple'}
              onClick={() => configurarVotacion({ tipoMayoria: 'simple' })}
              style={{
                padding: '0.2rem 0.5rem',
                borderRadius: 'calc(var(--border-radius) - 2px)',
                border: `1px solid ${tipoMayoria === 'simple' ? 'var(--accent-color)' : 'transparent'}`,
                backgroundColor: tipoMayoria === 'simple' ? 'var(--accent-soft)' : 'transparent',
                color: tipoMayoria === 'simple' ? 'var(--accent-color)' : 'var(--muted-text)',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: tipoMayoria === 'simple' ? '700' : '600',
                transition: 'all 0.15s ease'
              }}
              title={`Mayoría Simple (50%+1): Requiere ${reqSimpleQuorum} votos`}
            >
              {t('voting.simpleShort', 'Simple')} ({reqSimpleQuorum})
            </button>
            <button
              type="button"
              aria-pressed={tipoMayoria === '2/3'}
              onClick={() => configurarVotacion({ tipoMayoria: '2/3' })}
              style={{
                padding: '0.2rem 0.5rem',
                borderRadius: 'calc(var(--border-radius) - 2px)',
                border: `1px solid ${tipoMayoria === '2/3' ? 'var(--accent-color)' : 'transparent'}`,
                backgroundColor: tipoMayoria === '2/3' ? 'var(--accent-soft)' : 'transparent',
                color: tipoMayoria === '2/3' ? 'var(--accent-color)' : 'var(--muted-text)',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: tipoMayoria === '2/3' ? '700' : '600',
                transition: 'all 0.15s ease'
              }}
              title={`Mayoría Cualificada (2/3): Requiere ${reqDosTerciosQuorum} votos`}
            >
              {t('voting.twoThirdsShort', '2/3')} ({reqDosTerciosQuorum})
            </button>
            <button
              type="button"
              aria-pressed={tipoMayoria === 'consensus'}
              onClick={() => configurarVotacion({ tipoMayoria: 'consensus' })}
              style={{
                padding: '0.2rem 0.5rem',
                borderRadius: 'calc(var(--border-radius) - 2px)',
                border: `1px solid ${tipoMayoria === 'consensus' ? 'var(--accent-color)' : 'transparent'}`,
                backgroundColor: tipoMayoria === 'consensus' ? 'var(--accent-soft)' : 'transparent',
                color: tipoMayoria === 'consensus' ? 'var(--accent-color)' : 'var(--muted-text)',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: tipoMayoria === 'consensus' ? '700' : '600',
                transition: 'all 0.15s ease'
              }}
              title="Consenso (100%): Requiere 0 votos en contra"
            >
              {t('voting.consensusShort', 'Consenso')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Banner de Estado del Dictamen (Compacto) ── */}
      <div style={{
        padding: '0.4rem 0.65rem',
        borderRadius: 'var(--border-radius)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: estadoVotacion === 'APROBADA' ? 'var(--success-soft)' :
          (estadoVotacion === 'VETADA' || estadoVotacion === 'REPROBADA') ? 'var(--danger-soft)' :
            estadoVotacion === 'EN_PROCESO' ? 'var(--info-soft)' : 'var(--card-header-bg)',
        border: `1px solid ${estadoVotacion === 'APROBADA' ? 'var(--success-color)' :
          (estadoVotacion === 'VETADA' || estadoVotacion === 'REPROBADA') ? 'var(--danger-color)' :
            estadoVotacion === 'EN_PROCESO' ? 'var(--info-color)' : 'var(--border-color)'
        }`,
        gap: '0.5rem',
        transition: 'all 0.2s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0, flex: 1 }}>
          {estadoVotacion === 'APROBADA' && <CheckCircle2 size={16} color="var(--success-color)" style={{ flexShrink: 0 }} />}
          {estadoVotacion === 'VETADA' && <ShieldAlert size={16} color="var(--danger-color)" style={{ flexShrink: 0 }} />}
          {estadoVotacion === 'REPROBADA' && <XCircle size={16} color="var(--danger-color)" style={{ flexShrink: 0 }} />}
          {estadoVotacion === 'EN_PROCESO' && <Info size={16} color="var(--info-color)" style={{ flexShrink: 0 }} />}
          {estadoVotacion === 'SIN_VOTOS' && <HelpCircle size={16} style={{ color: 'var(--muted-text)', opacity: 0.8, flexShrink: 0 }} />}

          <div style={{ minWidth: 0 }}>
            <div style={{
              fontWeight: '750',
              fontSize: '0.82rem',
              color: estadoVotacion === 'APROBADA' ? 'var(--success-color)' :
                (estadoVotacion === 'VETADA' || estadoVotacion === 'REPROBADA') ? 'var(--danger-color)' :
                  estadoVotacion === 'EN_PROCESO' ? 'var(--info-color)' : 'var(--text-color)',
              lineHeight: 1.2
            }}>
              {mensajeDictamen}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', marginTop: '1px' }}>
              {t('voting.target', 'Meta')}: <strong style={{ color: 'var(--text-color)' }}>{textoRequerido}</strong> | {t('voting.castVotes', 'Emitidos')}: <strong style={{ color: 'var(--text-color)' }}>{votosEmitidos}/{totalAsistentes}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
          <button
            type="button"
            aria-pressed={modoRollCall}
            onClick={toggleModoRollCall}
            style={{
              padding: '0.28rem 0.55rem',
              backgroundColor: modoRollCall ? 'var(--accent-soft)' : 'var(--btn-bg)',
              border: `1px solid ${modoRollCall ? 'var(--accent-color)' : 'var(--btn-bg)'}`,
              color: modoRollCall ? 'var(--accent-color)' : 'var(--btn-text)',
              borderRadius: 'var(--border-radius)',
              fontWeight: '700',
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Play size={11} fill={modoRollCall ? 'var(--accent-color)' : 'var(--btn-text)'} />
            <span>{modoRollCall ? t('voting.exitRollCall', 'Salir Roll Call') : t('voting.startRollCall', 'Modo Roll Call')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              resetearVotacion();
              setModoRollCall(false);
            }}
            style={{
              padding: '0.28rem 0.45rem',
              backgroundColor: 'var(--input-bg, var(--panel-color))',
              border: '1px solid var(--border-color)',
              color: 'var(--text-color)',
              borderRadius: 'var(--border-radius)',
              fontSize: '0.72rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'all 0.15s ease'
            }}
            title="Reiniciar todos los votos"
          >
            <RotateCcw size={11} />
            <span>{t('common.reset', 'Reiniciar')}</span>
          </button>
        </div>
      </div>

      {/* ── Asistente Roll Call Nominal Interactivo (2 Rondas Oficiales) ── */}
      {modoRollCall && (
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: `1px solid ${rondaRollCall === 2 ? vetoOrange : 'var(--accent-color)'}`,
          borderRadius: 'var(--border-radius)',
          padding: '0.6rem 0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {/* Banner de Ronda */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--subborder-color)', paddingBottom: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Vote size={14} color={rondaRollCall === 2 ? vetoOrange : 'var(--accent-color)'} />
              <span style={{ fontWeight: '750', fontSize: '0.8rem', color: rondaRollCall === 2 ? vetoOrange : 'var(--accent-color)' }}>
                {rondaRollCall === 1 ? t('voting.rollCallRound1', 'PRIMERA RONDA - VOTACIÓN NOMINAL') : t('voting.rollCallRound2', 'SEGUNDA RONDA - DELEGACIONES QUE PASARON')}
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
              {paisActualRollCall ? `${t('voting.turn', 'Turno')} ${indiceRollCall + 1} ${t('common.of', 'de')} ${listaPaisesRondaRollCall.length}` : t('voting.roundCompleted', 'Ronda Completada')}
            </span>
          </div>

          {paisActualRollCall ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <CountryFlag bandera={paisActualRollCall.bandera} nombre={paisActualRollCall.nombre} size="lg" />
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {paisActualRollCall.estatus}
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-color)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>{paisActualRollCall.nombre}</span>
                    {paisActualRollCall.veto && <Crown size={15} color={vetoOrange} fill={vetoOrange} title="Veto P5" />}
                  </div>
                </div>
              </div>

              {/* Botones de Voto Roll Call */}
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => registrarYAvanzarRollCall('favor')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    backgroundColor: 'var(--success-solid, #4f795d)',
                    color: '#ffffff',
                    fontWeight: '750',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Check size={13} />
                  <span>{t('voting.inFavor', 'A Favor')}</span>
                </button>

                {/* Abstención solo en Sustantiva y si NO es Presente y Votando y NO en Ronda 2 */}
                {tipoVotacion === 'substantive' && (
                  <button
                    type="button"
                    onClick={() => registrarYAvanzarRollCall('abstencion')}
                    disabled={paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2}
                    style={{
                      padding: '0.35rem 0.75rem',
                      backgroundColor: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 'transparent' : 'var(--warning-solid, #80673b)',
                      color: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 'var(--muted-text)' : '#ffffff',
                      border: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? '1px solid var(--border-color)' : 'none',
                      opacity: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 0.45 : 1,
                      fontWeight: '750',
                      borderRadius: 'var(--border-radius)',
                      cursor: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 'not-allowed' : 'pointer',
                      fontSize: '0.75rem'
                    }}
                    title={
                      rondaRollCall === 2
                        ? 'En segunda ronda no se puede abstener'
                        : (paisActualRollCall.estatus === 'Presente y Votando' ? 'P. y Votando no puede abstenerse' : 'Abstención')
                    }
                  >
                    {t('voting.abstention', 'Abstención')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => registrarYAvanzarRollCall('contra')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    backgroundColor: 'var(--danger-solid, #a95449)',
                    color: '#ffffff',
                    fontWeight: '750',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <X size={13} />
                  <span>{t('voting.against', 'En Contra')}</span>
                </button>

                {/* Botón Pasar / Omitir (Solo disponible en Ronda 1) */}
                {rondaRollCall === 1 && (
                  <button
                    type="button"
                    onClick={() => registrarYAvanzarRollCall('pasar')}
                    style={{
                      padding: '0.35rem 0.65rem',
                      backgroundColor: 'var(--input-bg, var(--panel-color))',
                      color: 'var(--text-color)',
                      fontWeight: '600',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                    title="Pasar / Omitir para votar en Segunda Ronda"
                  >
                    {t('voting.pass', 'Pasar')}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--muted-text)', padding: '0.35rem', fontSize: '0.75rem' }}>
              {t('voting.rollCallFinishedAllRegistered', '¡Votación Nominal Roll Call finalizada! Todos los votos han sido registrados.')}
            </div>
          )}
        </div>
      )}

      {/* ── Contadores Compactos (Una Sola Fila Esbelta) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.35rem',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '0.25rem 0.35rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--muted-text)', fontWeight: '750' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success-color)' }} />
            <span>{t('voting.inFavor', 'A FAVOR')}</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
            {favor} <span style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--muted-text)' }}>({totalAsistentes > 0 ? Math.round((favor / totalAsistentes) * 100) : 0}%)</span>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '0.25rem 0.35rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--muted-text)', fontWeight: '750' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--danger-color)' }} />
            <span>{t('voting.against', 'EN CONTRA')}</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
            {contra} <span style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--muted-text)' }}>({totalAsistentes > 0 ? Math.round((contra / totalAsistentes) * 100) : 0}%)</span>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '0.25rem 0.35rem',
          opacity: tipoVotacion === 'procedural' ? 0.45 : 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--muted-text)', fontWeight: '750' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--warning-color)' }} />
            <span>{t('voting.abstention', 'ABSTENCIÓN')}</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
            {tipoVotacion === 'procedural' ? '—' : abstencion} <span style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--muted-text)' }}>{tipoVotacion === 'procedural' ? t('voting.forbidden', '(N/A)') : `(${totalAsistentes > 0 ? Math.round((abstencion / totalAsistentes) * 100) : 0}%)`}</span>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '0.25rem 0.35rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--muted-text)', fontWeight: '750' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--info-color)' }} />
            <span>{t('voting.pending', 'PENDIENTES')}</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
            {votosPendientes} <span style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--muted-text)' }}>{t('voting.uncast', '(Sin emitir)')}</span>
          </div>
        </div>
      </div>

      {/* Barra visual de progreso fina */}
      <div style={{
        height: '4px',
        width: '100%',
        backgroundColor: 'var(--subborder-color)',
        borderRadius: '9999px',
        overflow: 'hidden',
        display: 'flex'
      }}>
        {totalAsistentes > 0 && (
          <>
            <div style={{ width: `${(favor / totalAsistentes) * 100}%`, backgroundColor: 'var(--success-color)', transition: 'width 0.3s ease' }} title={`A Favor: ${favor}`} />
            <div style={{ width: `${(contra / totalAsistentes) * 100}%`, backgroundColor: 'var(--danger-color)', transition: 'width 0.3s ease' }} title={`En Contra: ${contra}`} />
            {tipoVotacion === 'substantive' && (
              <div style={{ width: `${(abstencion / totalAsistentes) * 100}%`, backgroundColor: 'var(--warning-color)', transition: 'width 0.3s ease' }} title={`Abstención: ${abstencion}`} />
            )}
          </>
        )}
      </div>

      {/* ── Buscador y Ordenamiento ── */}
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--input-bg, var(--panel-color))',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '0.2rem 0.45rem',
          gap: '0.35rem'
        }}>
          <Search size={13} style={{ color: 'var(--muted-text)', opacity: 0.7 }} />
          <input
            type="text"
            placeholder={t('countries.searchPlaceholder', 'Buscar delegación por nombre...')}
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-color)',
              fontFamily: 'var(--font-family)',
              outline: 'none',
              fontSize: '0.78rem',
              width: '100%'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <ArrowUpDown size={13} style={{ color: 'var(--muted-text)', opacity: 0.8 }} />
          <select
            value={criterioOrden}
            onChange={e => setCriterioOrden(e.target.value)}
            style={{
              padding: '0.25rem 0.4rem',
              backgroundColor: 'var(--input-bg, var(--panel-color))',
              border: '1px solid var(--border-color)',
              color: 'var(--text-color)',
              fontFamily: 'var(--font-family)',
              borderRadius: 'var(--border-radius)',
              fontSize: '0.74rem',
              outline: 'none'
            }}
          >
            <option value="alphabetical_asc">{t('common.sortAZ', 'Orden A - Z')}</option>
            <option value="alphabetical_desc">{t('common.sortZA', 'Orden Z - A')}</option>
            <option value="vote_status">{t('voting.sortByVote', 'Por Estado de Voto')}</option>
            <option value="p5_veto">{t('voting.sortP5First', 'Veto P5 Primero')}</option>
            <option value="roll_call">{t('voting.sortByStatus', 'Por Estatus de Asistencia')}</option>
          </select>
        </div>
      </div>

      {/* ── Lista de Países con VOTOS CLAROS Y DESTACADOS ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        paddingRight: '2px'
      }}>
        {listaPaisesProcesada.map(p => {
          const votoActual = votos[p.id];
          const esAusente = p.estatus === 'Ausente';
          const esPresenteYVotando = p.estatus === 'Presente y Votando';
          const deshabilitarAbstencion = tipoVotacion === 'procedural' || esPresenteYVotando;

          return (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.35rem 0.6rem',
                backgroundColor: esAusente ? 'transparent' : (
                  votoActual === 'favor' ? 'var(--success-soft)' :
                    votoActual === 'contra' ? 'var(--danger-soft)' :
                      votoActual === 'abstencion' ? 'var(--warning-soft)' : 'var(--input-bg, var(--panel-color))'
                ),
                border: `1px solid ${
                  votoActual === 'favor' ? 'var(--success-color)' :
                    votoActual === 'contra' ? 'var(--danger-color)' :
                      votoActual === 'abstencion' ? 'var(--warning-color)' : 'var(--subborder-color)'
                }`,
                borderRadius: 'var(--border-radius)',
                opacity: esAusente ? 0.35 : 1,
                transition: 'all 0.15s ease',
                gap: '0.5rem'
              }}
            >
              {/* Información de la Delegación */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                <CountryFlag bandera={p.bandera} nombre={p.nombre} size="md" />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-color)' }}>
                    {p.nombre}
                  </span>
                  {p.veto && (
                    <Crown size={14} color={vetoOrange} fill={vetoOrange} title="Miembro Permanente con Derecho a Veto (P5)" />
                  )}
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: '600',
                    color: esAusente ? 'var(--danger-color)' : (esPresenteYVotando ? 'var(--info-color)' : 'var(--success-color)'),
                    backgroundColor: esAusente ? 'var(--danger-soft)' : (esPresenteYVotando ? 'var(--info-soft)' : 'var(--success-soft)'),
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px'
                  }}>
                    {p.estatus}
                  </span>
                </div>
              </div>

              {/* Indicador de Voto Actual y Botones */}
              {esAusente ? (
                <span style={{ fontSize: '0.72rem', color: 'var(--danger-color)', fontStyle: 'italic' }}>{t('countries.absent', 'Ausente')}</span>
              ) : (
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
                  {/* Badge Prominente de Estado de Voto */}
                  {votoActual === 'favor' && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: '750',
                      backgroundColor: 'var(--success-soft)',
                      color: 'var(--success-color)',
                      border: '1px solid var(--success-color)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <Check size={12} /> {t('voting.inFavor', 'A FAVOR')}
                    </span>
                  )}
                  {votoActual === 'contra' && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: '750',
                      backgroundColor: 'var(--danger-soft)',
                      color: 'var(--danger-color)',
                      border: '1px solid var(--danger-color)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <X size={12} /> {t('voting.against', 'EN CONTRA')}
                    </span>
                  )}
                  {votoActual === 'abstencion' && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: '750',
                      backgroundColor: 'var(--warning-soft)',
                      color: 'var(--warning-color)',
                      border: '1px solid var(--warning-color)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <RotateCcw size={11} /> {t('voting.abstention', 'ABSTENCIÓN')}
                    </span>
                  )}
                  {!votoActual && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)', fontWeight: '600', padding: '0.15rem 0.35rem' }}>
                      {t('voting.notVoted', 'Sin votar')}
                    </span>
                  )}

                  {/* Botón A FAVOR */}
                  <button
                    type="button"
                    onClick={() => registrarVotoPais(p.id, votoActual === 'favor' ? null : 'favor')}
                    style={{
                      padding: '0.22rem 0.5rem',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      borderRadius: '4px',
                      border: `1px solid ${votoActual === 'favor' ? 'var(--success-color)' : 'var(--border-color)'}`,
                      backgroundColor: votoActual === 'favor' ? 'var(--success-color)' : 'var(--input-bg, var(--panel-color))',
                      color: votoActual === 'favor' ? '#ffffff' : 'var(--success-color)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title="Votar A Favor"
                  >
                    {t('voting.inFavor', 'Favor')}
                  </button>

                  {/* Botón ABSTENCIÓN (Solo en Sustantiva para Presentes) */}
                  {tipoVotacion === 'substantive' && (
                    <button
                      type="button"
                      onClick={() => !deshabilitarAbstencion && registrarVotoPais(p.id, votoActual === 'abstencion' ? null : 'abstencion')}
                      disabled={deshabilitarAbstencion}
                      style={{
                        padding: '0.22rem 0.5rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        borderRadius: '4px',
                        border: `1px solid ${deshabilitarAbstencion ? 'var(--border-color)' : (votoActual === 'abstencion' ? 'var(--warning-color)' : 'var(--border-color)')}`,
                        backgroundColor: votoActual === 'abstencion' ? 'var(--warning-color)' : 'var(--input-bg, var(--panel-color))',
                        color: deshabilitarAbstencion ? 'var(--muted-text)' : (votoActual === 'abstencion' ? '#ffffff' : 'var(--warning-color)'),
                        cursor: deshabilitarAbstencion ? 'not-allowed' : 'pointer',
                        opacity: deshabilitarAbstencion ? 0.35 : 1,
                        transition: 'all 0.15s ease'
                      }}
                      title={esPresenteYVotando ? 'Presente y Votando no puede abstenerse' : 'Abstención'}
                    >
                      {t('voting.abstention', 'Abs.')}
                    </button>
                  )}

                  {/* Botón EN CONTRA */}
                  <button
                    type="button"
                    onClick={() => registrarVotoPais(p.id, votoActual === 'contra' ? null : 'contra')}
                    style={{
                      padding: '0.22rem 0.5rem',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      borderRadius: '4px',
                      border: `1px solid ${votoActual === 'contra' ? 'var(--danger-color)' : 'var(--border-color)'}`,
                      backgroundColor: votoActual === 'contra' ? 'var(--danger-color)' : 'var(--input-bg, var(--panel-color))',
                      color: votoActual === 'contra' ? '#ffffff' : 'var(--danger-color)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title="Votar En Contra"
                  >
                    {t('voting.against', 'Contra')}
                  </button>

                  {/* Limpiar voto */}
                  {votoActual && (
                    <button
                      type="button"
                      onClick={() => registrarVotoPais(p.id, null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--muted-text)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex'
                      }}
                      title="Limpiar voto"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VotacionOficial;
