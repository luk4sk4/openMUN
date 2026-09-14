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
  Sparkles,
  HelpCircle,
  Users,
  Scale,
  Target
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import { useTranslation } from 'react-i18next';

const VotacionOficial = () => {
  const { t } = useTranslation();
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
      padding: '1rem',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      backgroundColor: 'var(--panel-color)',
      color: 'var(--text-color)',
      gap: '0.75rem',
      fontSize: '0.85rem'
    }}>
      {/* ── Header: Asunto y Selectores de Configuración (Compacto) ── */}
      <div style={{
        backgroundColor: 'var(--card-header-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '7px',
        padding: '0.5rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Vote size={16} style={{ opacity: 0.7 }} />
          <input
            type="text"
            value={asunto}
            onChange={e => configurarVotacion({ asunto: e.target.value })}
            placeholder={t('voting.subjectPlaceholder', 'Asunto o Título del Proyecto de Resolución / Moción...')}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: '1px dashed var(--border-color)',
              color: 'var(--text-color)',
              fontWeight: '700',
              fontSize: '0.9rem',
              outline: 'none',
              padding: '0.15rem 0'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
          {/* Votación Procedimental vs Sustantiva */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', backgroundColor: 'var(--panel-color)', padding: '3px', borderRadius: '6px', border: '1px solid var(--subborder-color)' }}>
            <button
              onClick={() => configurarVotacion({ tipoVotacion: 'procedural' })}
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: tipoVotacion === 'procedural' ? 'var(--btn-bg)' : 'transparent',
                color: tipoVotacion === 'procedural' ? 'var(--btn-text)' : 'var(--muted-text)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Votación Procedimental: PROHIBIDA LA ABSTENCIÓN"
            >
              {t('voting.procedural', 'Procedimental (Sin Abst.)')}
            </button>
            <button
              onClick={() => configurarVotacion({ tipoVotacion: 'substantive' })}
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: tipoVotacion === 'substantive' ? 'var(--btn-bg)' : 'transparent',
                color: tipoVotacion === 'substantive' ? 'var(--btn-text)' : 'var(--muted-text)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Votación Sustantiva: PERMITIDA LA ABSTENCIÓN"
            >
              {t('voting.substantive', 'Sustantiva (Con Abst.)')}
            </button>
          </div>

          {/* Toggle Veto P5 */}
          <button
            onClick={() => configurarVotacion({ aplicarVeto: !aplicarVeto })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              border: `1px solid ${aplicarVeto ? '#ca8a04' : 'var(--border-color)'}`,
              backgroundColor: aplicarVeto ? 'rgba(202, 138, 4, 0.15)' : 'transparent',
              color: aplicarVeto ? '#facc15' : 'var(--muted-text)',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Activar/desactivar evaluación de Veto P5"
          >
            <Crown size={14} color={aplicarVeto ? '#facc15' : '#888888'} />
            <span>{t('voting.vetoP5', 'Veto P5')}: {aplicarVeto ? t('common.activeOn', 'ON') : t('common.inactiveOff', 'OFF')}</span>
          </button>
        </div>

        {/* ── Selector de Mayoría: Botones Claros y de Buen Tamaño ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.45rem',
          marginTop: '0.1rem'
        }}>
          {/* Botón Mayoría Simple */}
          <button
            type="button"
            onClick={() => configurarVotacion({ tipoMayoria: 'simple' })}
            style={{
              padding: '0.45rem 0.6rem',
              borderRadius: '6px',
              border: `1.5px solid ${tipoMayoria === 'simple' ? '#3b82f6' : 'var(--subborder-color)'}`,
              backgroundColor: tipoMayoria === 'simple' ? 'rgba(59, 130, 246, 0.15)' : 'var(--panel-color)',
              color: tipoMayoria === 'simple' ? '#60a5fa' : 'var(--muted-text)',
              fontWeight: tipoMayoria === 'simple' ? '800' : '600',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: '800' }}>{t('voting.simpleMajority', 'Mayoría Simple (50%+1)')}</span>
            <span style={{ fontSize: '0.7rem', opacity: tipoMayoria === 'simple' ? 1 : 0.7, color: tipoMayoria === 'simple' ? '#93c5fd' : 'inherit' }}>
              {t('voting.requiresVotes', 'Requiere')} <strong>{reqSimpleQuorum}</strong> {reqSimpleQuorum === 1 ? t('voting.vote', 'voto') : t('voting.votes', 'votos')}
            </span>
          </button>

          {/* Botón Mayoría Cualificada 2/3 */}
          <button
            type="button"
            onClick={() => configurarVotacion({ tipoMayoria: '2/3' })}
            style={{
              padding: '0.45rem 0.6rem',
              borderRadius: '6px',
              border: `1.5px solid ${tipoMayoria === '2/3' ? '#a855f7' : 'var(--subborder-color)'}`,
              backgroundColor: tipoMayoria === '2/3' ? 'rgba(168, 85, 247, 0.15)' : 'var(--panel-color)',
              color: tipoMayoria === '2/3' ? '#c084fc' : 'var(--muted-text)',
              fontWeight: tipoMayoria === '2/3' ? '800' : '600',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: '800' }}>{t('voting.twoThirds', 'Cualificada (2/3)')}</span>
            <span style={{ fontSize: '0.7rem', opacity: tipoMayoria === '2/3' ? 1 : 0.7, color: tipoMayoria === '2/3' ? '#e9d5ff' : 'inherit' }}>
              {t('voting.requiresVotes', 'Requiere')} <strong>{reqDosTerciosQuorum}</strong> {reqDosTerciosQuorum === 1 ? t('voting.vote', 'voto') : t('voting.votes', 'votos')}
            </span>
          </button>

          {/* Botón Consenso */}
          <button
            type="button"
            onClick={() => configurarVotacion({ tipoMayoria: 'consensus' })}
            style={{
              padding: '0.45rem 0.6rem',
              borderRadius: '6px',
              border: `1.5px solid ${tipoMayoria === 'consensus' ? '#d97706' : 'var(--subborder-color)'}`,
              backgroundColor: tipoMayoria === 'consensus' ? 'rgba(217, 119, 6, 0.15)' : 'var(--panel-color)',
              color: tipoMayoria === 'consensus' ? '#fbbf24' : 'var(--muted-text)',
              fontWeight: tipoMayoria === 'consensus' ? '800' : '600',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: '800' }}>{t('voting.consensus', 'Consenso (100%)')}</span>
            <span style={{ fontSize: '0.7rem', opacity: tipoMayoria === 'consensus' ? 1 : 0.7, color: tipoMayoria === 'consensus' ? '#fde68a' : 'inherit' }}>
              {t('voting.requiresZeroAgainst', 'Requiere 0 En Contra')}
            </span>
          </button>
        </div>
      </div>

      {/* ── Banner de Estado del Dictamen ── */}
      <div style={{
        padding: '0.65rem 0.85rem',
        borderRadius: '7px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: estadoVotacion === 'APROBADA' ? 'rgba(34, 197, 94, 0.15)' :
          estadoVotacion === 'VETADA' ? 'rgba(239, 68, 68, 0.22)' :
            estadoVotacion === 'REPROBADA' ? 'rgba(239, 68, 68, 0.15)' :
              estadoVotacion === 'SIN_VOTOS' ? 'var(--card-header-bg)' : 'rgba(59, 130, 246, 0.1)',
        border: `1px solid ${estadoVotacion === 'APROBADA' ? '#22c55e' :
            estadoVotacion === 'VETADA' ? '#ef4444' :
              estadoVotacion === 'REPROBADA' ? '#ef4444' :
                estadoVotacion === 'SIN_VOTOS' ? 'var(--border-color)' : '#3b82f6'
          }`,
        transition: 'all 0.2s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {estadoVotacion === 'APROBADA' && <CheckCircle2 size={20} color="#22c55e" />}
          {estadoVotacion === 'VETADA' && <ShieldAlert size={20} color="#ef4444" />}
          {estadoVotacion === 'REPROBADA' && <XCircle size={20} color="#ef4444" />}
          {estadoVotacion === 'EN_PROCESO' && <Info size={20} color="#3b82f6" />}
          {estadoVotacion === 'SIN_VOTOS' && <HelpCircle size={20} style={{ opacity: 0.6 }} />}

          <div>
            <div style={{ fontWeight: '800', fontSize: '0.92rem' }}>
              {mensajeDictamen}
            </div>
            <div style={{ fontSize: '0.68rem', opacity: 0.7, marginTop: '1px' }}>
              {t('voting.target', 'Meta')}: <strong style={{ color: 'var(--text-color)' }}>{textoRequerido}</strong> |
              {t('voting.castVotes', 'Emitidos')}: <strong>{votosEmitidos}/{totalAsistentes}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button
            onClick={toggleModoRollCall}
            style={{
              padding: '0.35rem 0.65rem',
              backgroundColor: modoRollCall ? '#2563eb' : 'transparent',
              border: '1px solid #3b82f6',
              color: modoRollCall ? '#ffffff' : '#3b82f6',
              borderRadius: '5px',
              fontWeight: '700',
              fontSize: '0.73rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <Play size={12} /> {modoRollCall ? t('voting.exitRollCall', 'Salir Roll Call') : t('voting.startRollCall', 'Modo Roll Call')}
          </button>
          <button
            onClick={() => {
              resetearVotacion();
              setModoRollCall(false);
            }}
            style={{
              padding: '0.35rem 0.55rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-color)',
              borderRadius: '5px',
              fontSize: '0.73rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
            title="Reiniciar todos los votos"
          >
            <RotateCcw size={12} /> {t('common.reset', 'Reiniciar')}
          </button>
        </div>
      </div>

      {/* ── Asistente Roll Call Nominal Interactivo (2 Rondas Oficiales) ── */}
      {modoRollCall && (
        <div style={{
          backgroundColor: 'var(--card-header-bg)',
          border: `1px solid ${rondaRollCall === 2 ? '#d97706' : '#3b82f6'}`,
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          {/* Banner de Ronda */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--subborder-color)', paddingBottom: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={15} color={rondaRollCall === 2 ? '#f59e0b' : '#3b82f6'} />
              <span style={{ fontWeight: '800', fontSize: '0.82rem', color: rondaRollCall === 2 ? '#f59e0b' : '#60a5fa' }}>
                {rondaRollCall === 1 ? t('voting.rollCallRound1', 'PRIMERA RONDA - VOTACIÓN NOMINAL') : t('voting.rollCallRound2', 'SEGUNDA RONDA - DELEGACIONES QUE PASARON')}
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>
              {paisActualRollCall ? `${t('voting.turn', 'Turno')} ${indiceRollCall + 1} ${t('common.of', 'de')} ${listaPaisesRondaRollCall.length}` : t('voting.roundCompleted', 'Ronda Completada')}
            </span>
          </div>

          {paisActualRollCall ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CountryFlag bandera={paisActualRollCall.bandera} nombre={paisActualRollCall.nombre} size="xl" />
                <div>
                  <div style={{ fontSize: '0.68rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {paisActualRollCall.estatus}
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-color)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{paisActualRollCall.nombre}</span>
                    {paisActualRollCall.veto && <Crown size={16} color="#facc15" fill="#facc15" title="Veto P5" />}
                  </div>
                </div>
              </div>

              {/* Botones de Voto Roll Call */}
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  onClick={() => registrarYAvanzarRollCall('favor')}
                  style={{
                    padding: '0.5rem 0.85rem',
                    backgroundColor: '#22c55e',
                    color: '#000000',
                    fontWeight: '800',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '0.82rem'
                  }}
                >
                  {t('voting.inFavor', 'A Favor')}
                </button>

                {/* Abstención solo en Sustantiva y si NO es Presente y Votando y NO en Ronda 2 */}
                {tipoVotacion === 'substantive' && (
                  <button
                    onClick={() => registrarYAvanzarRollCall('abstencion')}
                    disabled={paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2}
                    style={{
                      padding: '0.5rem 0.85rem',
                      backgroundColor: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? '#27272a' : '#d97706',
                      color: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? '#71717a' : '#ffffff',
                      fontWeight: '800',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 'not-allowed' : 'pointer',
                      fontSize: '0.82rem'
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
                  onClick={() => registrarYAvanzarRollCall('contra')}
                  style={{
                    padding: '0.5rem 0.85rem',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontWeight: '800',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '0.82rem'
                  }}
                >
                  {t('voting.against', 'En Contra')}
                </button>

                {/* Botón Pasar / Omitir (Solo disponible en Ronda 1) */}
                {rondaRollCall === 1 && (
                  <button
                    onClick={() => registrarYAvanzarRollCall('pasar')}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#3f3f46',
                      color: '#ffffff',
                      fontWeight: '700',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '0.78rem'
                    }}
                    title="Pasar / Omitir para votar en Segunda Ronda"
                  >
                    {t('voting.pass', 'Pasar')}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', opacity: 0.7, padding: '0.4rem', fontSize: '0.8rem' }}>
              {t('voting.rollCallFinishedAllRegistered', '¡Votación Nominal Roll Call finalizada! Todos los votos han sido registrados.')}
            </div>
          )}
        </div>
      )}

      {/* ── Contadores y Barra de Distribución (VOTOS DE LA GENTE DESTACADOS) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.5rem',
        textAlign: 'center'
      }}>
        <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid #166534', borderRadius: '7px', padding: '0.5rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#4ade80', fontWeight: '800', letterSpacing: '0.04em' }}>{t('voting.inFavor', 'A FAVOR')}</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#22c55e', lineHeight: 1.1 }}>{favor}</div>
          <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>
            {totalAsistentes > 0 ? Math.round((favor / totalAsistentes) * 100) : 0}% {t('voting.room', 'sala')}
          </div>
        </div>

        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #991b1b', borderRadius: '7px', padding: '0.5rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#f87171', fontWeight: '800', letterSpacing: '0.04em' }}>{t('voting.against', 'EN CONTRA')}</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#ef4444', lineHeight: 1.1 }}>{contra}</div>
          <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>
            {totalAsistentes > 0 ? Math.round((contra / totalAsistentes) * 100) : 0}% {t('voting.room', 'sala')}
          </div>
        </div>

        <div style={{
          backgroundColor: tipoVotacion === 'procedural' ? 'var(--card-header-bg)' : 'rgba(217, 119, 6, 0.1)',
          border: `1px solid ${tipoVotacion === 'procedural' ? 'var(--border-color)' : '#92400e'}`,
          borderRadius: '7px',
          padding: '0.5rem',
          opacity: tipoVotacion === 'procedural' ? 0.35 : 1
        }}>
          <div style={{ fontSize: '0.68rem', color: tipoVotacion === 'procedural' ? 'var(--muted-text)' : '#f59e0b', fontWeight: '800', letterSpacing: '0.04em' }}>
            {t('voting.abstention', 'ABSTENCIÓN')} {tipoVotacion === 'procedural' && '(N/A)'}
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: tipoVotacion === 'procedural' ? 'var(--muted-text)' : '#f59e0b', lineHeight: 1.1 }}>
            {tipoVotacion === 'procedural' ? 0 : abstencion}
          </div>
          <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>
            {tipoVotacion === 'procedural' ? t('voting.forbidden', 'Prohibida') : `${totalAsistentes > 0 ? Math.round((abstencion / totalAsistentes) * 100) : 0}% ${t('voting.room', 'sala')}`}
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--card-header-bg)', border: '1px solid var(--border-color)', borderRadius: '7px', padding: '0.5rem' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', fontWeight: '800', letterSpacing: '0.04em' }}>{t('voting.pending', 'PENDIENTES')}</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--muted-text)', lineHeight: 1.1 }}>{votosPendientes}</div>
          <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>{t('voting.uncast', 'Sin emitir')}</div>
        </div>
      </div>

      {/* Barra visual de progreso */}
      <div style={{
        height: '8px',
        width: '100%',
        backgroundColor: 'var(--card-header-bg)',
        borderRadius: '9999px',
        overflow: 'hidden',
        display: 'flex',
        border: '1px solid var(--subborder-color)'
      }}>
        {totalAsistentes > 0 && (
          <>
            <div style={{ width: `${(favor / totalAsistentes) * 100}%`, backgroundColor: '#22c55e', transition: 'width 0.3s ease' }} title={`A Favor: ${favor}`} />
            <div style={{ width: `${(contra / totalAsistentes) * 100}%`, backgroundColor: '#ef4444', transition: 'width 0.3s ease' }} title={`En Contra: ${contra}`} />
            {tipoVotacion === 'substantive' && (
              <div style={{ width: `${(abstencion / totalAsistentes) * 100}%`, backgroundColor: '#d97706', transition: 'width 0.3s ease' }} title={`Abstención: ${abstencion}`} />
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
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '5px',
          padding: '0.25rem 0.5rem',
          gap: '0.35rem'
        }}>
          <Search size={13} style={{ opacity: 0.5 }} />
          <input
            type="text"
            placeholder={t('countries.searchPlaceholder', 'Buscar delegación por nombre...')}
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-color)',
              outline: 'none',
              fontSize: '0.78rem',
              width: '100%'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <ArrowUpDown size={13} style={{ opacity: 0.6 }} />
          <select
            value={criterioOrden}
            onChange={e => setCriterioOrden(e.target.value)}
            style={{
              padding: '0.3rem 0.45rem',
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-color)',
              borderRadius: '5px',
              fontSize: '0.75rem',
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
        gap: '0.3rem',
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
                padding: '0.45rem 0.75rem',
                backgroundColor: esAusente ? 'transparent' : (
                  votoActual === 'favor' ? 'rgba(34, 197, 94, 0.08)' :
                    votoActual === 'contra' ? 'rgba(239, 68, 68, 0.08)' :
                      votoActual === 'abstencion' ? 'rgba(217, 119, 6, 0.08)' : 'var(--card-header-bg)'
                ),
                border: `1px solid ${votoActual === 'favor' ? '#166534' :
                    votoActual === 'contra' ? '#991b1b' :
                      votoActual === 'abstencion' ? '#92400e' : 'var(--border-color)'
                  }`,
                borderRadius: '6px',
                opacity: esAusente ? 0.35 : 1,
                transition: 'all 0.15s ease',
                gap: '0.5rem'
              }}
            >
              {/* Información de la Delegación */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                <CountryFlag bandera={p.bandera} nombre={p.nombre} size="md" />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-color)' }}>
                    {p.nombre}
                  </span>
                  {p.veto && (
                    <Crown size={14} color="#facc15" fill="#facc15" title="Miembro Permanente con Derecho a Veto (P5)" />
                  )}
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: '600',
                    color: esAusente ? '#ef4444' : (esPresenteYVotando ? '#60a5fa' : '#4ade80'),
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    padding: '0.05rem 0.3rem',
                    borderRadius: '3px'
                  }}>
                    {p.estatus}
                  </span>
                </div>
              </div>

              {/* Indicador de Voto Actual y Botones */}
              {esAusente ? (
                <span style={{ fontSize: '0.72rem', color: '#ef4444', fontStyle: 'italic' }}>{t('countries.absent', 'Ausente')}</span>
              ) : (
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
                  {/* Badge Prominente de Estado de Voto */}
                  {votoActual === 'favor' && (
                    <span style={{ fontSize: '0.68rem', fontWeight: '800', backgroundColor: '#15803d', color: '#ffffff', padding: '0.15rem 0.45rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Check size={12} /> {t('voting.inFavor', 'A FAVOR')}
                    </span>
                  )}
                  {votoActual === 'contra' && (
                    <span style={{ fontSize: '0.68rem', fontWeight: '800', backgroundColor: '#b91c1c', color: '#ffffff', padding: '0.15rem 0.45rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <X size={12} /> {t('voting.against', 'EN CONTRA')}
                    </span>
                  )}
                  {votoActual === 'abstencion' && (
                    <span style={{ fontSize: '0.68rem', fontWeight: '800', backgroundColor: '#b45309', color: '#ffffff', padding: '0.15rem 0.45rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <RotateCcw size={11} /> {t('voting.abstention', 'ABSTENCIÓN')}
                    </span>
                  )}
                  {!votoActual && (
                    <span style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: '600', padding: '0.15rem 0.35rem' }}>
                      {t('voting.notVoted', 'Sin votar')}
                    </span>
                  )}

                  {/* Botón A FAVOR */}
                  <button
                    onClick={() => registrarVotoPais(p.id, votoActual === 'favor' ? null : 'favor')}
                    style={{
                      padding: '0.25rem 0.55rem',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      borderRadius: '4px',
                      border: '1px solid #22c55e',
                      backgroundColor: votoActual === 'favor' ? '#22c55e' : 'transparent',
                      color: votoActual === 'favor' ? '#000000' : '#4ade80',
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
                      onClick={() => !deshabilitarAbstencion && registrarVotoPais(p.id, votoActual === 'abstencion' ? null : 'abstencion')}
                      disabled={deshabilitarAbstencion}
                      style={{
                        padding: '0.25rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        borderRadius: '4px',
                        border: `1px solid ${deshabilitarAbstencion ? 'var(--border-color)' : '#d97706'}`,
                        backgroundColor: votoActual === 'abstencion' ? '#d97706' : 'transparent',
                        color: deshabilitarAbstencion ? 'var(--muted-text)' : (votoActual === 'abstencion' ? '#ffffff' : '#fbbf24'),
                        cursor: deshabilitarAbstencion ? 'not-allowed' : 'pointer',
                        opacity: deshabilitarAbstencion ? 0.3 : 1,
                        transition: 'all 0.15s ease'
                      }}
                      title={esPresenteYVotando ? 'Presente y Votando no puede abstenerse' : 'Abstención'}
                    >
                      {t('voting.abstention', 'Abs.')}
                    </button>
                  )}

                  {/* Botón EN CONTRA */}
                  <button
                    onClick={() => registrarVotoPais(p.id, votoActual === 'contra' ? null : 'contra')}
                    style={{
                      padding: '0.25rem 0.55rem',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      borderRadius: '4px',
                      border: '1px solid #ef4444',
                      backgroundColor: votoActual === 'contra' ? '#ef4444' : 'transparent',
                      color: votoActual === 'contra' ? '#ffffff' : '#f87171',
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
