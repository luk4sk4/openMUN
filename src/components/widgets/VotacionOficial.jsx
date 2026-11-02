import i18n from '../../languages/index.js';
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
  Square,
  ShieldAlert,
  Check,
  X,
  Minus,
  Info,
  HelpCircle,
  Users,
  Scale,
  Target
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { ListaDerechos } from './VotosConDerechos';
import CountryFlag from '../common/CountryFlag';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';

const VotacionOficial = () => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { isLight } = useAccessibility();
  const vetoColor = 'var(--timer-orange-color, var(--warning-color))';
  const vetoBg = 'var(--timer-orange-bg, var(--warning-soft))';
  const vetoBorder = 'var(--timer-orange-border, var(--warning-color))';
  const {
    paises = [],
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

  const {
    asunto = i18n.t('ui.draftResolutionMotion'),
    tipoVotacion = 'procedural',
    tipoMayoria = 'simple',
    aplicarVeto = true,
    votos: rawVotos = {}
  } = votacionSesion || {};

  const votos = useMemo(() => {
    return (rawVotos && typeof rawVotos === 'object') ? rawVotos : {};
  }, [rawVotos]);

  // Conteo de Quórum y Asistencia
  const listaPaises = useMemo(() => (Array.isArray(paises) ? paises : []), [paises]);
  const totalPaises = listaPaises.length;
  const presentes = useMemo(() => listaPaises.filter(p => p && p.estatus === 'Presente').length, [listaPaises]);
  const presentesYVotando = useMemo(() => listaPaises.filter(p => p && p.estatus === 'Presente y Votando').length, [listaPaises]);
  const ausentes = useMemo(() => listaPaises.filter(p => p && p.estatus === 'Ausente').length, [listaPaises]);

  // Filtrado de países asistentes (excluyendo ausentes)
  const paisesAsistentes = useMemo(() => {
    return listaPaises.filter(p => p && (p.estatus === 'Presente' || p.estatus === 'Presente y Votando'));
  }, [listaPaises]);

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
  const votosPendientes = Math.max(0, totalAsistentes - votosEmitidos);
  const finalizada = votosPendientes === 0 && totalAsistentes > 0;

  // Cálculo de Umbral según Tipo de Mayoría y MUN Rules
  const votosValidosSinAbstencion = favor + contra;

  let requeridos = 0;
  let pasaSuperaMayoria = false;
  let textoRequerido = '';

  if (tipoMayoria === 'simple') {
    if (tipoVotacion === 'substantive') {
      const baseCalculo = finalizada ? votosValidosSinAbstencion : Math.max(0, totalAsistentes - abstencion);
      requeridos = baseCalculo > 0 ? Math.floor(baseCalculo / 2) + 1 : reqSimpleQuorum;
      pasaSuperaMayoria = finalizada && favor > contra && favor >= requeridos;
      textoRequerido = finalizada
        ? t('ui.s501QuorumBase', { v0: requeridos, v1: t('voting.vote', 'voto'), v2: t('voting.inFavor', 'A Favor'), v3: t('common.of', 'de'), v4: votosValidosSinAbstencion, v5: t('voting.validVotes', 'votos válidos emitidos'), v6: reqSimpleQuorum })
        : `${requeridos} ${t('voting.vote', 'voto')}(s) ${t('voting.inFavor', 'A Favor')} (50% + 1 ${t('common.of', 'de')} ${totalAsistentes} ${t('voting.delegationsInRoom', 'delegaciones en sala')})`;
    } else {
      requeridos = reqSimpleQuorum;
      pasaSuperaMayoria = finalizada && favor > contra && favor >= reqSimpleQuorum;
      textoRequerido = `${requeridos} ${t('voting.vote', 'voto')}(s) ${t('voting.inFavor', 'A Favor')} (50% + 1 ${t('common.of', 'de')} ${totalAsistentes} ${t('voting.delegationsInRoom', 'delegaciones en sala')})`;
    }
  } else if (tipoMayoria === '2/3') {
    if (tipoVotacion === 'substantive') {
      const baseCalculo = finalizada ? votosValidosSinAbstencion : Math.max(0, totalAsistentes - abstencion);
      requeridos = baseCalculo > 0 ? Math.ceil((baseCalculo * 2) / 3) : reqDosTerciosQuorum;
      pasaSuperaMayoria = finalizada && favor >= requeridos && favor > 0;
      textoRequerido = finalizada
        ? t('ui.s23QuorumBase', { v0: requeridos, v1: t('voting.vote', 'voto'), v2: t('voting.inFavor', 'A Favor'), v3: t('common.of', 'de'), v4: votosValidosSinAbstencion, v5: t('voting.validVotes', 'votos válidos emitidos'), v6: reqDosTerciosQuorum })
        : `${requeridos} ${t('voting.vote', 'voto')}(s) ${t('voting.inFavor', 'A Favor')} (2/3 ${t('common.of', 'de')} ${totalAsistentes} ${t('voting.delegationsInRoom', 'delegaciones en sala')})`;
    } else {
      requeridos = reqDosTerciosQuorum;
      pasaSuperaMayoria = finalizada && favor >= reqDosTerciosQuorum && favor > 0;
      textoRequerido = `${requeridos} ${t('voting.vote', 'voto')}(s) ${t('voting.inFavor', 'A Favor')} (2/3 ${t('common.of', 'de')} ${totalAsistentes} ${t('voting.delegationsInRoom', 'delegaciones en sala')})`;
    }
  } else if (tipoMayoria === 'consensus') {
    requeridos = 0;
    pasaSuperaMayoria = finalizada && contra === 0 && favor > 0;
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
  } else if (finalizada) {
    if (pasaSuperaMayoria) {
      estadoVotacion = 'APROBADA';
      mensajeDictamen = `${t('voting.passedExclamation', '¡APROBADA!')} (${favor} ${t('voting.inFavor', 'A Favor')} vs ${contra} ${t('voting.against', 'En Contra')}${abstencion > 0 ? `, ${abstencion} ${t('voting.abstentions', 'Abstenciones')}` : ''})`;
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
      border: 'none',
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
        gap: '0.4rem'
      }}>
        {/* Fila 1: Asunto del Proyecto/Moción + Toggle Veto P5 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
            <input
              type="text"
              value={asunto}
              onChange={e => configurarVotacion({ asunto: e.target.value })}
              placeholder={t('voting.subjectPlaceholder', 'Asunto o Título del Proyecto de Resolución / Moción...')}
              style={{
                width: '100%',
                backgroundColor: 'var(--input-bg, transparent)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                color: 'var(--text-color)',
                fontFamily: 'var(--font-family)',
                fontWeight: '700',
                fontSize: '0.82rem',
                outline: 'none',
                padding: '0.22rem 0.5rem',
                transition: 'border-color 0.15s ease'
              }}
            />
          </div>

          {/* Toggle Veto P5 */}
          <button
            type="button"
            aria-pressed={aplicarVeto}
            onClick={() => configurarVotacion({ aplicarVeto: !aplicarVeto })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.6rem',
              borderRadius: 'var(--border-radius)',
              border: `1px solid ${aplicarVeto ? vetoBorder : 'var(--border-color)'}`,
              backgroundColor: aplicarVeto ? vetoBg : 'var(--input-bg, var(--panel-color))',
              color: aplicarVeto ? vetoColor : 'var(--muted-text)',
              fontSize: '0.73rem',
              fontWeight: '700',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            title={t('ui.enableDisableP5VetoEvaluation')}
          >
            <Crown size={12} color={aplicarVeto ? vetoColor : 'currentColor'} />
            <span>{t('voting.vetoP5', 'Veto P5')}: {aplicarVeto ? t('common.activeOn', 'ON') : t('common.inactiveOff', 'OFF')}</span>
          </button>
        </div>

        {/* Fila 2: Tipo de Votación + Selector de Mayoría Compacto */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.73rem' }}>
          {/* Votación Procedimental vs Sustantiva */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'var(--input-bg, var(--panel-color))',
            padding: '2px',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--border-color)'
          }}>
            <button
              type="button"
              aria-pressed={tipoVotacion === 'procedural'}
              onClick={() => configurarVotacion({ tipoVotacion: 'procedural' })}
              style={{
                padding: '0.22rem 0.55rem',
                fontSize: '0.72rem',
                fontWeight: tipoVotacion === 'procedural' ? '750' : '600',
                borderRadius: 'calc(var(--border-radius) - 2px)',
                border: `1px solid ${tipoVotacion === 'procedural' ? 'var(--accent-color)' : 'transparent'}`,
                backgroundColor: tipoVotacion === 'procedural' ? 'var(--accent-soft)' : 'transparent',
                color: tipoVotacion === 'procedural' ? 'var(--accent-color)' : 'var(--muted-text)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={t('ui.proceduralVoteAbstentionProhibited')}
            >
              {t('voting.proceduralShort', 'Procedimental')}
            </button>
            <button
              type="button"
              aria-pressed={tipoVotacion === 'substantive'}
              onClick={() => configurarVotacion({ tipoVotacion: 'substantive' })}
              style={{
                padding: '0.22rem 0.55rem',
                fontSize: '0.72rem',
                fontWeight: tipoVotacion === 'substantive' ? '750' : '600',
                borderRadius: 'calc(var(--border-radius) - 2px)',
                border: `1px solid ${tipoVotacion === 'substantive' ? 'var(--accent-color)' : 'transparent'}`,
                backgroundColor: tipoVotacion === 'substantive' ? 'var(--accent-soft)' : 'transparent',
                color: tipoVotacion === 'substantive' ? 'var(--accent-color)' : 'var(--muted-text)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={t('ui.substantiveVoteAbstentionAllowed')}
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
            border: '1px solid var(--border-color)'
          }}>
            <button
              type="button"
              aria-pressed={tipoMayoria === 'simple'}
              onClick={() => configurarVotacion({ tipoMayoria: 'simple' })}
              style={{
                padding: '0.22rem 0.55rem',
                borderRadius: 'calc(var(--border-radius) - 2px)',
                border: `1px solid ${tipoMayoria === 'simple' ? 'var(--accent-color)' : 'transparent'}`,
                backgroundColor: tipoMayoria === 'simple' ? 'var(--accent-soft)' : 'transparent',
                color: tipoMayoria === 'simple' ? 'var(--accent-color)' : 'var(--muted-text)',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: tipoMayoria === 'simple' ? '750' : '600',
                transition: 'all 0.15s ease'
              }}
              title={t('ui.simpleMajority501RequiresVotes', { v0: reqSimpleQuorum })}
            >
              {t('voting.simpleShort', 'Simple')} ({reqSimpleQuorum})
            </button>
            <button
              type="button"
              aria-pressed={tipoMayoria === '2/3'}
              onClick={() => configurarVotacion({ tipoMayoria: '2/3' })}
              style={{
                padding: '0.22rem 0.55rem',
                borderRadius: 'calc(var(--border-radius) - 2px)',
                border: `1px solid ${tipoMayoria === '2/3' ? 'var(--accent-color)' : 'transparent'}`,
                backgroundColor: tipoMayoria === '2/3' ? 'var(--accent-soft)' : 'transparent',
                color: tipoMayoria === '2/3' ? 'var(--accent-color)' : 'var(--muted-text)',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: tipoMayoria === '2/3' ? '750' : '600',
                transition: 'all 0.15s ease'
              }}
              title={t('ui.qualifiedMajority23RequiresVotes', { v0: reqDosTerciosQuorum })}
            >
              {t('voting.twoThirdsShort', '2/3')} ({reqDosTerciosQuorum})
            </button>
            <button
              type="button"
              aria-pressed={tipoMayoria === 'consensus'}
              onClick={() => configurarVotacion({ tipoMayoria: 'consensus' })}
              style={{
                padding: '0.22rem 0.55rem',
                borderRadius: 'calc(var(--border-radius) - 2px)',
                border: `1px solid ${tipoMayoria === 'consensus' ? 'var(--accent-color)' : 'transparent'}`,
                backgroundColor: tipoMayoria === 'consensus' ? 'var(--accent-soft)' : 'transparent',
                color: tipoMayoria === 'consensus' ? 'var(--accent-color)' : 'var(--muted-text)',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: tipoMayoria === 'consensus' ? '750' : '600',
                transition: 'all 0.15s ease'
              }}
              title={t('ui.consensus100Requires0VotesAgainst')}
            >
              {t('voting.consensusShort', 'Consenso')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Banner de Estado del Dictamen & Acciones de Votación ── */}
      <div style={{
        padding: '0.45rem 0.7rem',
        borderRadius: 'var(--border-radius)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '180px', flex: '1 1 auto' }}>
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
              lineHeight: 1.25
            }}>
              {mensajeDictamen}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', marginTop: '2px' }}>
              {t('voting.target', 'Meta')}: <strong style={{ color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums' }}>{textoRequerido}</strong> | {t('voting.castVotes', 'Emitidos')}: <strong style={{ color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums' }}>{votosEmitidos}/{totalAsistentes}</strong>
            </div>
          </div>
        </div>

        {/* Acciones principales de votación */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <button
            type="button"
            aria-pressed={modoRollCall}
            onClick={toggleModoRollCall}
            style={{
              padding: '0.35rem 0.75rem',
              backgroundColor: modoRollCall ? 'var(--accent-soft)' : 'var(--btn-bg)',
              border: `1px solid ${modoRollCall ? 'var(--accent-color)' : 'var(--btn-bg)'}`,
              color: modoRollCall ? 'var(--accent-color)' : 'var(--btn-text)',
              borderRadius: 'var(--border-radius)',
              fontWeight: '750',
              fontSize: '0.74rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
          >
            {modoRollCall ? <Square size={11} fill="var(--accent-color)" /> : <Play size={11} fill="var(--btn-text)" color="var(--btn-text)" />}
            <span>{modoRollCall ? t('voting.exitRollCall', 'Salir Roll Call') : t('voting.startRollCall', 'Modo Roll Call')}</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              if (votosEmitidos > 0) {
                const confirmed = await confirm({
                  title: t('voting.confirmResetTitle', 'Reiniciar votación'),
                  message: t('voting.confirmResetVoting', '¿Deseas reiniciar y limpiar todos los votos registrados?'),
                  confirmText: t('voting.reset', 'Reiniciar'),
                  cancelText: t('common.cancel', 'Cancelar'),
                  type: 'danger'
                });
                if (confirmed) {
                  resetearVotacion();
                  setModoRollCall(false);
                }
              } else {
                resetearVotacion();
                setModoRollCall(false);
              }
            }}
            style={{
              padding: '0.35rem 0.65rem',
              backgroundColor: 'var(--input-bg, var(--panel-color))',
              border: '1px solid var(--border-color)',
              color: 'var(--text-color)',
              borderRadius: 'var(--border-radius)',
              fontSize: '0.74rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              transition: 'all 0.15s ease'
            }}
            title={t('voting.resetVotingTitle')}
          >
            <RotateCcw size={12} />
            <span>{t('common.reset', 'Reiniciar')}</span>
          </button>
        </div>
      </div>

      {/* ── Asistente Roll Call Nominal Interactivo (2 Rondas Oficiales) ── */}
      {modoRollCall && (
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: `1px solid ${rondaRollCall === 2 ? vetoColor : 'var(--accent-color)'}`,
          borderRadius: 'var(--border-radius)',
          padding: '0.6rem 0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {/* Banner de Ronda */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--subborder-color)', paddingBottom: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontWeight: '750', fontSize: '0.8rem', color: rondaRollCall === 2 ? vetoColor : 'var(--accent-color)' }}>
                {rondaRollCall === 1 ? t('voting.rollCallRound1', 'PRIMERA RONDA - VOTACIÓN NOMINAL') : t('voting.rollCallRound2', 'SEGUNDA RONDA - DELEGACIONES QUE PASARON')}
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)', fontVariantNumeric: 'tabular-nums' }}>
              {paisActualRollCall ? `${t('voting.turn', 'Turno')} ${indiceRollCall + 1} ${t('common.of', 'de')} ${listaPaisesRondaRollCall.length}` : t('voting.roundCompleted', 'Ronda Completada')}
            </span>
          </div>

          {paisActualRollCall ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <CountryFlag bandera={paisActualRollCall.bandera} nombre={paisActualRollCall.nombre} size="lg" />
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700' }}>
                    {t(`sessionValues.${paisActualRollCall.estatus}`, paisActualRollCall.estatus)}
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-color)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>{paisActualRollCall.nombre}</span>
                    {paisActualRollCall.veto && <Crown size={15} color={vetoColor} fill={vetoColor} title={t('voting.vetoP5')} />}
                  </div>
                </div>
              </div>

              {/* Botones de Voto Roll Call */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                {/* 1. A Favor */}
                <button
                  type="button"
                  onClick={() => registrarYAvanzarRollCall('favor')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    backgroundColor: 'var(--success-solid)',
                    color: 'var(--btn-text)',
                    fontWeight: '750',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'opacity 0.15s ease'
                  }}
                >
                  <Check size={13} />
                  <span>{t('voting.inFavor', 'A Favor')}</span>
                </button>

                {/* 2. A Favor con Derechos */}
                <button
                  type="button"
                  onClick={() => registrarYAvanzarRollCall('favor_derechos')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    backgroundColor: 'var(--success-soft)',
                    color: 'var(--success-color)',
                    fontWeight: '750',
                    border: '1px solid var(--success-color)',
                    borderRadius: 'var(--border-radius)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.15s ease'
                  }}
                  title={t('voting.inFavorWithRights', 'A favor con derechos')}
                >
                  <Scale size={12} />
                  <span>{t('voting.inFavorWithRights', 'A favor con derechos')}</span>
                </button>

                {/* 3. Abstención (si no es Presente y Votando y no en Ronda 2) */}
                <button
                  type="button"
                  onClick={() => registrarYAvanzarRollCall('abstencion')}
                  disabled={paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2}
                  style={{
                    padding: '0.35rem 0.75rem',
                    backgroundColor: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 'transparent' : 'var(--warning-solid)',
                    color: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 'var(--muted-text)' : 'var(--btn-text)',
                    border: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? '1px solid var(--border-color)' : 'none',
                    opacity: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 0.45 : 1,
                    fontWeight: '750',
                    borderRadius: 'var(--border-radius)',
                    cursor: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 'not-allowed' : 'pointer',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'opacity 0.15s ease'
                  }}
                  title={
                    rondaRollCall === 2
                      ? t('ui.abstentionIsNotAllowedInTheSecondRound')
                      : (paisActualRollCall.estatus === 'Presente y Votando' ? t('ui.presentAndVotingCannotAbstain') : t('voting.abstention'))
                  }
                >
                  <RotateCcw size={11} />
                  <span>{t('voting.abstention', 'Abstención')}</span>
                </button>

                {/* 4. En Contra con Derechos */}
                <button
                  type="button"
                  onClick={() => registrarYAvanzarRollCall('contra_derechos')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    backgroundColor: 'var(--danger-soft)',
                    color: 'var(--danger-color)',
                    fontWeight: '750',
                    border: '1px solid var(--danger-color)',
                    borderRadius: 'var(--border-radius)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.15s ease'
                  }}
                  title={t('voting.againstWithRights', 'En contra con derechos')}
                >
                  <Scale size={12} />
                  <span>{t('voting.againstWithRights', 'En contra con derechos')}</span>
                </button>

                {/* 5. En Contra */}
                <button
                  type="button"
                  onClick={() => registrarYAvanzarRollCall('contra')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    backgroundColor: 'var(--danger-solid)',
                    color: 'var(--btn-text)',
                    fontWeight: '750',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'opacity 0.15s ease'
                  }}
                >
                  <X size={13} />
                  <span>{t('voting.against', 'En Contra')}</span>
                </button>

                {/* 6. Botón Pasar / Omitir (Solo disponible en Ronda 1) */}
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
                      fontSize: '0.75rem',
                      transition: 'all 0.15s ease'
                    }}
                    title={t('ui.passSkipToVoteInTheSecondRound')}
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

      <ListaDerechos
        paises={paises}
        sesion={votacionSesion}
        votacionTerminada={finalizada && !modoRollCall}
      />

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
            {abstencion} <span style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--muted-text)' }}>({totalAsistentes > 0 ? Math.round((abstencion / totalAsistentes) * 100) : 0}%)</span>
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
            {abstencion > 0 && (
              <div style={{ width: `${(abstencion / totalAsistentes) * 100}%`, backgroundColor: 'var(--warning-color)', transition: 'width 0.3s ease' }} title={t('ui.abstention', { v0: abstencion })} />
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
          const tieneDerechos = Boolean(votacionSesion?.derechos?.[p.id]);
          const esFavorPuro = votoActual === 'favor' && !tieneDerechos;
          const esFavorDerechos = votoActual === 'favor' && tieneDerechos;
          const esAbstencion = votoActual === 'abstencion';
          const esContraDerechos = votoActual === 'contra' && tieneDerechos;
          const esContraPuro = votoActual === 'contra' && !tieneDerechos;
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
                    <Crown size={14} color={vetoColor} fill={vetoColor} title={t('ui.permanentMemberWithVetoPowerP5')} />
                  )}
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: '600',
                    color: esAusente ? 'var(--danger-color)' : (esPresenteYVotando ? 'var(--info-color)' : 'var(--success-color)'),
                    backgroundColor: esAusente ? 'var(--danger-soft)' : (esPresenteYVotando ? 'var(--info-soft)' : 'var(--success-soft)'),
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px'
                  }}>
                    {t(`sessionValues.${p.estatus}`, p.estatus)}
                  </span>
                  {tieneDerechos && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: '700',
                      color: 'var(--accent-color)',
                      backgroundColor: 'var(--accent-soft)',
                      border: '1px solid var(--accent-color)',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }} title={t('voting.rightsExplanation')}>
                      <Scale size={10} />
                      {t('voting.withRights', 'c/ Derechos')}
                    </span>
                  )}
                </div>
              </div>

              {/* Indicador de Voto Actual y Grupo Unificado de Botones */}
              {esAusente ? (
                <span style={{ fontSize: '0.72rem', color: 'var(--danger-color)', fontStyle: 'italic', fontWeight: '600' }}>{t('countries.absent', 'Ausente')}</span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
                  {/* Control Segmentado de Voto Directo: A FAVOR / A FAVOR CON DERECHOS / ABSTENCIÓN / EN CONTRA CON DERECHOS / EN CONTRA */}
                  <div
                    role="group"
                    aria-label={`Voto de ${p.nombre}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: 'var(--input-bg, var(--panel-color))',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      padding: '2px',
                      gap: '2px',
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* 1. Botón A FAVOR */}
                    <button
                      type="button"
                      aria-pressed={esFavorPuro}
                      onClick={() => registrarVotoPais(p.id, esFavorPuro ? null : 'favor')}
                      style={{
                        padding: '0.22rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: esFavorPuro ? '750' : '600',
                        borderRadius: 'calc(var(--border-radius) - 2px)',
                        border: `1px solid ${esFavorPuro ? 'var(--success-color)' : 'transparent'}`,
                        backgroundColor: esFavorPuro ? 'var(--success-soft)' : 'transparent',
                        color: esFavorPuro ? 'var(--success-color)' : 'var(--text-color)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.15s ease'
                      }}
                      title={t('ui.voteInFavorClickAgainToDeselect')}
                    >
                      <Check size={12} />
                      <span>{t('voting.inFavor', 'A Favor')}</span>
                    </button>

                    {/* 2. Botón A FAVOR CON DERECHOS */}
                    <button
                      type="button"
                      aria-pressed={esFavorDerechos}
                      onClick={() => registrarVotoPais(p.id, esFavorDerechos ? null : 'favor_derechos')}
                      style={{
                        padding: '0.22rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: esFavorDerechos ? '750' : '600',
                        borderRadius: 'calc(var(--border-radius) - 2px)',
                        border: `1px solid ${esFavorDerechos ? 'var(--success-color)' : 'transparent'}`,
                        backgroundColor: esFavorDerechos ? 'var(--success-soft)' : 'transparent',
                        color: esFavorDerechos ? 'var(--success-color)' : 'var(--text-color)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.15s ease'
                      }}
                      title={t('voting.inFavorWithRights', 'A favor con derechos')}
                    >
                      <Scale size={11} />
                      <span>{t('voting.inFavorWithRightsShort', 'A Favor c/ Der.')}</span>
                    </button>

                    {/* 3. Botón ABSTENCIÓN */}
                    <button
                      type="button"
                      aria-pressed={esAbstencion}
                      disabled={deshabilitarAbstencion}
                      onClick={() => !deshabilitarAbstencion && registrarVotoPais(p.id, esAbstencion ? null : 'abstencion')}
                      style={{
                        padding: '0.22rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: esAbstencion ? '750' : '600',
                        borderRadius: 'calc(var(--border-radius) - 2px)',
                        border: `1px solid ${esAbstencion ? 'var(--warning-color)' : 'transparent'}`,
                        backgroundColor: esAbstencion ? 'var(--warning-soft)' : 'transparent',
                        color: deshabilitarAbstencion ? 'var(--muted-text)' : (esAbstencion ? 'var(--warning-color)' : 'var(--text-color)'),
                        cursor: deshabilitarAbstencion ? 'not-allowed' : 'pointer',
                        opacity: deshabilitarAbstencion ? 0.35 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.15s ease'
                      }}
                      title={esPresenteYVotando ? t('ui.presentAndVotingCannotAbstain2') : t('voting.abstention')}
                    >
                      <Minus size={11} />
                      <span>{t('voting.abstentionShort', 'Abst.')}</span>
                    </button>

                    {/* 4. Botón EN CONTRA CON DERECHOS */}
                    <button
                      type="button"
                      aria-pressed={esContraDerechos}
                      onClick={() => registrarVotoPais(p.id, esContraDerechos ? null : 'contra_derechos')}
                      style={{
                        padding: '0.22rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: esContraDerechos ? '750' : '600',
                        borderRadius: 'calc(var(--border-radius) - 2px)',
                        border: `1px solid ${esContraDerechos ? 'var(--danger-color)' : 'transparent'}`,
                        backgroundColor: esContraDerechos ? 'var(--danger-soft)' : 'transparent',
                        color: esContraDerechos ? 'var(--danger-color)' : 'var(--text-color)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.15s ease'
                      }}
                      title={t('voting.againstWithRights', 'En contra con derechos')}
                    >
                      <Scale size={11} />
                      <span>{t('voting.againstWithRightsShort', 'En Contra c/ Der.')}</span>
                    </button>

                    {/* 5. Botón EN CONTRA */}
                    <button
                      type="button"
                      aria-pressed={esContraPuro}
                      onClick={() => registrarVotoPais(p.id, esContraPuro ? null : 'contra')}
                      style={{
                        padding: '0.22rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: esContraPuro ? '750' : '600',
                        borderRadius: 'calc(var(--border-radius) - 2px)',
                        border: `1px solid ${esContraPuro ? 'var(--danger-color)' : 'transparent'}`,
                        backgroundColor: esContraPuro ? 'var(--danger-soft)' : 'transparent',
                        color: esContraPuro ? 'var(--danger-color)' : 'var(--text-color)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.15s ease'
                      }}
                      title={t('ui.voteAgainstClickAgainToDeselect')}
                    >
                      <X size={12} />
                      <span>{t('voting.against', 'En Contra')}</span>
                    </button>
                  </div>

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
                        padding: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        opacity: 0.7,
                        transition: 'opacity 0.15s ease'
                      }}
                      title={t('ui.clearVote')}
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
