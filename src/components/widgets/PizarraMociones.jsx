import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Check, X, Clock, MessageSquare, Users, Mic, RotateCcw, AlertCircle, ArrowUpDown, GripVertical, Hourglass, BarChart2, Timer, ChevronDown, Search, Trash2, StopCircle } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import EmptyState from '../common/EmptyState';
import { useTranslation } from 'react-i18next';

const PizarraMociones = () => {
  const { t } = useTranslation();
  const {
    paises,
    mociones,
    agregarMocion,
    votarMocion,
    eliminarMocion,
    reordenarMociones,
    ordenarMocionesDisruptividad,
    caucusActivo,
    setCaucusActivo,
    oradoresCaucus,
    agregarOradorCaucus,
    removerOradorCaucus,
    vaciarOradoresDebate,
    ordenarOradoresDebateAlfabetico,
    reordenarOradoresDebate
  } = useSession();

  // Vista activa: 'mociones' o 'oradores'
  const [vistaActiva, setVistaActiva] = useState(caucusActivo?.activo ? 'oradores' : 'mociones');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Estados del Formulario de Moción
  const [proponente, setProponente] = useState('');
  const [posicionProponente, setPosicionProponente] = useState('Primero');
  const [tipo, setTipo] = useState('Caucus Moderado');
  const [varianteConsulta, setVarianteConsulta] = useState('Cadena / Ping-Pong');
  const [tema, setTema] = useState('');
  const [tiempoTotalMin, setTiempoTotalMin] = useState(10);
  const [tiempoOradorSeg, setTiempoOradorSeg] = useState(45);
  const [mostrarDropdownPais, setMostrarDropdownPais] = useState(false);
  const [busquedaPais, setBusquedaPais] = useState('');
  const dropdownPaisRef = useRef(null);

  // Estado para buscador rápido de oradores en debate
  const [busquedaOrador, setBusquedaOrador] = useState('');
  const [mostrarDropdownOrador, setMostrarDropdownOrador] = useState(false);
  const dropdownOradorRef = useRef(null);

  // Rastrear activación de caucus para conmutar automáticamente a la lista de oradores
  const prevCaucusActivoRef = useRef(caucusActivo?.activo);
  const prevTimestampRef = useRef(caucusActivo?.timestampActivacion);

  useEffect(() => {
    if (caucusActivo?.activo && (!prevCaucusActivoRef.current || prevTimestampRef.current !== caucusActivo?.timestampActivacion)) {
      setVistaActiva('oradores');
    }
    prevCaucusActivoRef.current = caucusActivo?.activo;
    prevTimestampRef.current = caucusActivo?.timestampActivacion;
  }, [caucusActivo?.activo, caucusActivo?.timestampActivacion]);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownPaisRef.current && !dropdownPaisRef.current.contains(event.target)) {
        setMostrarDropdownPais(false);
      }
      if (dropdownOradorRef.current && !dropdownOradorRef.current.contains(event.target)) {
        setMostrarDropdownOrador(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quórum y Cálculo de Mayorías
  const presentes = useMemo(() => paises.filter(p => p.estatus === 'Presente').length, [paises]);
  const presentesYVotando = useMemo(() => paises.filter(p => p.estatus === 'Presente y Votando').length, [paises]);
  const totalAsistentes = presentes + presentesYVotando;
  const mayoriaSimple = totalAsistentes > 0 ? Math.floor(totalAsistentes / 2) + 1 : 0;
  const mayoriaCualificada = totalAsistentes > 0 ? Math.ceil((totalAsistentes * 2) / 3) : 0;

  const paisSeleccionado = useMemo(() => {
    return paises.find(p => p.nombre === proponente);
  }, [paises, proponente]);

  const paisesFiltrados = useMemo(() => {
    const q = busquedaPais.toLowerCase().trim();
    if (!q) return paises;
    return paises.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      (p.estatus && p.estatus.toLowerCase().includes(q))
    );
  }, [paises, busquedaPais]);

  const paisesDisponiblesOrador = useMemo(() => {
    const q = busquedaOrador.toLowerCase().trim();
    return paises.filter(p =>
      !oradoresCaucus.some(o => o.nombre === p.nombre) &&
      (!q || p.nombre.toLowerCase().includes(q))
    );
  }, [paises, oradoresCaucus, busquedaOrador]);

  const handleSubmitMocion = (e) => {
    e.preventDefault();
    if (!proponente || !tema.trim()) return;

    let totalSeg = Number(tiempoTotalMin) * 60;
    let oradorSeg = Number(tiempoOradorSeg);

    if (tipo === 'Caucus No Moderado' || tipo === 'Consulta General') {
      oradorSeg = 0;
    } else if (tipo === 'Tour de Table') {
      totalSeg = 0;
    }

    const paisObj = paises.find(p => p.nombre === proponente);

    agregarMocion({
      proponente,
      bandera: paisObj ? paisObj.bandera : '',
      posicionProponente,
      tipo: tipo === 'Consulta General' ? `Consulta General (${varianteConsulta})` : tipo,
      varianteConsulta: tipo === 'Consulta General' ? varianteConsulta : '',
      tema: tema.trim(),
      tiempoTotal: totalSeg,
      tiempoOrador: oradorSeg
    });

    setTema('');
    setProponente('');
    setBusquedaPais('');
    setMostrarForm(false);
  };

  const handleAprobarMocion = (mocionId) => {
    votarMocion(mocionId, 'Aprobada');
    setVistaActiva('oradores');
  };

  const handleFinalizarDebate = () => {
    setCaucusActivo({ ...caucusActivo, activo: false });
    setVistaActiva('mociones');
  };

  const formatMinutos = (segundos) => {
    if (!segundos || segundos === 0) return 'N/A';
    const mins = Math.floor(segundos / 60);
    return `${mins} min`;
  };

  const esModerado = tipo === 'Caucus Moderado';
  const esConsulta = tipo === 'Consulta General';
  const esNoModerado = tipo === 'Caucus No Moderado';
  const esTour = tipo === 'Tour de Table';

  const intervencionesEstimadas = useMemo(() => {
    if (!esModerado || !tiempoOradorSeg || tiempoOradorSeg <= 0) return 0;
    return Math.floor((Number(tiempoTotalMin) * 60) / Number(tiempoOradorSeg));
  }, [esModerado, tiempoTotalMin, tiempoOradorSeg]);

  // Configuración de modalidades conforme al sistema de diseño
  const tiposMocionConfig = [
    {
      id: 'Caucus Moderado',
      nombre: 'Caucus Moderado',
      subtitulo: t('ui.timedSpeakingTurns'),
      icon: Mic
    },
    {
      id: 'Caucus No Moderado',
      nombre: 'Caucus No Moderado',
      subtitulo: t('ui.freeNegotiationAndDrafting'),
      icon: Users
    },
    {
      id: 'Consulta General',
      nombre: 'Consulta General',
      subtitulo: t('ui.openThematicDialogueOrModeratedByCountry'),
      icon: MessageSquare
    },
    {
      id: 'Tour de Table',
      nombre: 'Tour de Table',
      subtitulo: t('ui.contributionsFromAllDelegations'),
      icon: RotateCcw
    }
  ];

  const presetsTotalMin = [5, 10, 12, 15, 20];
  const presetsOradorSeg = [30, 45, 60, 90, 120];

  return (
    <div style={{
      padding: '0.85rem',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      backgroundColor: 'var(--panel-color)',
      color: 'var(--text-color)',
      gap: '0.6rem',
      overflowY: 'auto'
    }}>
      {/* ── Conmutador / Toggle Superior entre Pizarra de Mociones y Oradores Debate ── */}
      <div
        role="tablist"
        aria-label={t('motions.toggleView', 'Alternar entre Pizarra de Mociones y Oradores de Debate')}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          backgroundColor: 'var(--panel-color)',
          border: '1px solid var(--subborder-color)',
          borderRadius: 'var(--border-radius, 6px)',
          padding: '3px',
          gap: '3px',
          flexShrink: 0
        }}
      >
        <button
          type="button"
          role="tab"
          id="tab-mociones"
          aria-selected={vistaActiva === 'mociones'}
          aria-controls="panel-mociones"
          tabIndex={vistaActiva === 'mociones' ? 0 : -1}
          onClick={() => setVistaActiva('mociones')}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              setVistaActiva('oradores');
            }
          }}
          style={{
            position: 'relative',
            padding: '0.42rem 0.65rem',
            fontSize: '0.78rem',
            fontWeight: vistaActiva === 'mociones' ? '650' : '500',
            borderRadius: '4px',
            border: `1px solid ${vistaActiva === 'mociones' ? 'var(--border-color)' : 'transparent'}`,
            borderBottom: `2px solid ${vistaActiva === 'mociones' ? 'var(--accent-color)' : 'transparent'}`,
            backgroundColor: vistaActiva === 'mociones' ? 'var(--panel-color)' : 'transparent',
            color: vistaActiva === 'mociones' ? 'var(--text-color)' : 'var(--muted-text)',
            boxShadow: vistaActiva === 'mociones' ? '0 1px 2px rgba(0,0,0,0.12)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease'
          }}
        >
          <MessageSquare size={13} style={{ color: vistaActiva === 'mociones' ? 'var(--accent-color)' : 'inherit', flexShrink: 0 }} />
          <span>{t('motions.board', 'Pizarra de Mociones')}</span>
          {mociones.length > 0 && (
            <span style={{
              fontSize: '0.65rem',
              padding: '1px 6px',
              borderRadius: '10px',
              fontVariantNumeric: 'tabular-nums',
              backgroundColor: vistaActiva === 'mociones' ? 'var(--accent-soft)' : 'rgba(128, 128, 128, 0.12)',
              color: vistaActiva === 'mociones' ? 'var(--accent-color)' : 'var(--muted-text)',
              border: `1px solid ${vistaActiva === 'mociones' ? 'rgba(239, 163, 127, 0.3)' : 'transparent'}`,
              fontWeight: '700'
            }}>
              {mociones.length}
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          id="tab-oradores"
          aria-selected={vistaActiva === 'oradores'}
          aria-controls="panel-oradores"
          tabIndex={vistaActiva === 'oradores' ? 0 : -1}
          onClick={() => setVistaActiva('oradores')}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              setVistaActiva('mociones');
            }
          }}
          style={{
            position: 'relative',
            padding: '0.42rem 0.65rem',
            fontSize: '0.78rem',
            fontWeight: vistaActiva === 'oradores' ? '650' : '500',
            borderRadius: '4px',
            border: `1px solid ${vistaActiva === 'oradores' ? 'var(--border-color)' : 'transparent'}`,
            borderBottom: `2px solid ${vistaActiva === 'oradores' ? 'var(--accent-color)' : 'transparent'}`,
            backgroundColor: vistaActiva === 'oradores' ? 'var(--panel-color)' : 'transparent',
            color: vistaActiva === 'oradores' ? 'var(--text-color)' : 'var(--muted-text)',
            boxShadow: vistaActiva === 'oradores' ? '0 1px 2px rgba(0,0,0,0.12)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease'
          }}
        >
          <Mic size={13} style={{ color: vistaActiva === 'oradores' ? 'var(--accent-color)' : 'inherit', flexShrink: 0 }} />
          <span>{t('timers.debateSpeakers', 'Oradores Debate')}</span>
          {oradoresCaucus.length > 0 && (
            <span style={{
              fontSize: '0.65rem',
              padding: '1px 6px',
              borderRadius: '10px',
              fontVariantNumeric: 'tabular-nums',
              backgroundColor: vistaActiva === 'oradores' ? 'var(--accent-soft)' : 'rgba(128, 128, 128, 0.12)',
              color: vistaActiva === 'oradores' ? 'var(--accent-color)' : 'var(--muted-text)',
              border: `1px solid ${vistaActiva === 'oradores' ? 'rgba(239, 163, 127, 0.3)' : 'transparent'}`,
              fontWeight: '700'
            }}>
              {oradoresCaucus.length}
            </span>
          )}
          {caucusActivo?.activo && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.62rem',
                fontWeight: '700',
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor: 'var(--success-soft)',
                color: 'var(--success-color)',
                border: '1px solid var(--success-color)',
                lineHeight: 1.2
              }}
              title={t('timers.inProgress', 'Debate en curso')}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
              <span>{t('timers.inProgress', 'En curso')}</span>
            </span>
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* VISTA 1: PIZARRA DE MOCIONES                            */}
      {/* ══════════════════════════════════════════════════════════ */}
      {vistaActiva === 'mociones' && (
        <div
          role="tabpanel"
          id="panel-mociones"
          aria-labelledby="tab-mociones"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            flex: 1,
            minHeight: 0,
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Header y Acciones de la Pizarra */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--muted-text)', fontWeight: '500' }}>
                {mociones.length} {mociones.length === 1 ? t('ui.motionRecorded') : t('ui.motionsRecorded')}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={ordenarMocionesDisruptividad}
                disabled={mociones.length <= 1}
                style={{
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.74rem',
                  fontWeight: '600',
                  backgroundColor: 'transparent',
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  cursor: mociones.length <= 1 ? 'not-allowed' : 'pointer',
                  opacity: mociones.length <= 1 ? 0.45 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'background-color 0.15s ease'
                }}
                title={t('ui.sortMotionsByDisruptionPriorityUnmoderatedConsultationRoundRobinModerated')}
              >
                <ArrowUpDown size={12} />
                <span>{t('motions.disruptivenessOrder', 'Disruptividad')}</span>
              </button>

              <button
                type="button"
                onClick={() => setMostrarForm(!mostrarForm)}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.76rem',
                  fontWeight: '700',
                  backgroundColor: mostrarForm ? 'var(--card-header-bg)' : 'var(--btn-bg)',
                  color: mostrarForm ? 'var(--text-color)' : 'var(--btn-text)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                {mostrarForm ? (
                  <>
                    <X size={13} /> {t('common.close', 'Cerrar')}
                  </>
                ) : (
                  <>
                    <Plus size={13} /> {t('motions.newMotion', 'Nueva Moción')}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Barra Informativa de Quórum y Mayorías */}
          <div style={{
            backgroundColor: 'var(--card-header-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius, 6px)',
            padding: '0.45rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.45rem',
            fontSize: '0.74rem',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Users size={14} style={{ color: 'var(--accent-color)' }} />
              <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>
                {t('voting.quorum', 'Quórum Actual')}: <strong>{totalAsistentes}</strong>
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
                ({presentes} {t('ui.p')} {presentesYVotando} {t('ui.pV')}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-color)' }}>
                {t('ui.simple')} <strong style={{ fontWeight: '700' }}>{mayoriaSimple}</strong>
              </span>
              <span style={{ color: 'var(--subborder-color)' }}>•</span>
              <span style={{ color: 'var(--text-color)' }}>
                {t('ui.qualified')} <strong style={{ color: 'var(--accent-color)', fontWeight: '700' }}>{mayoriaCualificada}</strong>
              </span>
            </div>
          </div>

          {/* Formulario de Añadir Moción con Guía de Estilo OpenMUN */}
          {mostrarForm && (
            <form
              onSubmit={handleSubmitMocion}
              style={{
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius, 6px)',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                flexShrink: 0
              }}
            >
              {/* Cabecera del Formulario */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--subborder-color)', paddingBottom: '0.45rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Plus size={14} style={{ color: 'var(--accent-color)' }} />
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-color)' }}>
                    {t('motions.newMotion', 'Nueva Moción')}
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarForm(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--muted-text)',
                    borderRadius: '4px',
                    padding: '0.2rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={t('ui.closeForm')}
                >
                  <X size={14} />
                </button>
              </div>

              {/* 1. Modalidad de Debate */}
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted-text)', display: 'block', marginBottom: '0.35rem' }}>
                  {t('motions.motionType', '1. Modalidad de Debate')}
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.4rem'
                }}>
                  {tiposMocionConfig.map(tItem => {
                    const IconComponent = tItem.icon;
                    const isSelected = tipo === tItem.id;
                    return (
                      <button
                        key={tItem.id}
                        type="button"
                        onClick={() => {
                          setTipo(tItem.id);
                          if (tItem.id === 'Caucus Moderado') {
                            setTiempoTotalMin(10);
                            setTiempoOradorSeg(60);
                          } else if (tItem.id === 'Caucus No Moderado') {
                            setTiempoTotalMin(15);
                          } else if (tItem.id === 'Consulta General') {
                            setTiempoTotalMin(10);
                            setVarianteConsulta('Cadena / Ping-Pong');
                          } else if (tItem.id === 'Tour de Table') {
                            setTiempoOradorSeg(45);
                          }
                        }}
                        style={{
                          padding: '0.5rem 0.6rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--card-header-bg)',
                          border: isSelected ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                          borderRadius: 'var(--border-radius, 6px)',
                          color: isSelected ? 'var(--accent-color)' : 'var(--text-color)',
                          transition: 'border-color 0.15s ease, background-color 0.15s ease',
                          outline: 'none'
                        }}
                      >
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          backgroundColor: isSelected ? 'var(--accent-color)' : 'var(--subborder-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isSelected ? '#ffffff' : 'var(--muted-text)',
                          flexShrink: 0
                        }}>
                          <IconComponent size={13} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            fontSize: '0.78rem',
                            fontWeight: isSelected ? '700' : '600',
                            color: isSelected ? 'var(--accent-color)' : 'var(--text-color)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {t(`sessionValues.${tItem.id}`, tItem.nombre)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. País Proponente y Tema / Propósito */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* País Proponente */}
                <div style={{ position: 'relative' }} ref={dropdownPaisRef}>
                  <label style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted-text)', display: 'block', marginBottom: '0.25rem' }}>
                    {t('motions.proponent', '2. País Proponente *')}
                  </label>
                  {paises.length === 0 ? (
                    <div style={{ padding: '0.45rem 0.6rem', backgroundColor: 'var(--danger-soft)', border: '1px solid var(--danger-color)', borderRadius: 'var(--border-radius, 6px)', fontSize: '0.73rem', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertCircle size={13} /> {t('ui.noDelegationsInTheSession')}
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setMostrarDropdownPais(!mostrarDropdownPais);
                          setBusquedaPais('');
                        }}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.65rem',
                          backgroundColor: 'var(--input-bg)',
                          border: mostrarDropdownPais ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                          color: 'var(--text-color)',
                          borderRadius: 'var(--border-radius, 6px)',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          outline: 'none',
                          boxSizing: 'border-box',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                          {paisSeleccionado ? (
                            <>
                              <CountryFlag bandera={paisSeleccionado.bandera} nombre={paisSeleccionado.nombre} size="xs" />
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '700', color: 'var(--text-color)' }}>
                                {paisSeleccionado.nombre}
                              </span>
                              {paisSeleccionado.estatus && (
                                <span style={{
                                  fontSize: '0.65rem',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: paisSeleccionado.estatus.includes('Presente') ? 'var(--success-soft)' : 'var(--danger-soft)',
                                  color: paisSeleccionado.estatus.includes('Presente') ? 'var(--success-color)' : 'var(--danger-color)',
                                  fontWeight: '600',
                                  marginLeft: 'auto'
                                }}>
                                  {t(`sessionValues.${paisSeleccionado.estatus}`, paisSeleccionado.estatus)}
                                </span>
                              )}
                            </>
                          ) : (
                            <span style={{ color: 'var(--muted-text)', fontWeight: '500' }}>
                              {t('motions.selectProponent', 'Selecciona el país proponente...')}
                            </span>
                          )}
                        </div>
                        <ChevronDown size={14} style={{ opacity: 0.6, transform: mostrarDropdownPais ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
                      </button>

                      {mostrarDropdownPais && (
                        <div style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          right: 0,
                          backgroundColor: 'var(--panel-color)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--border-radius, 6px)',
                          zIndex: 100,
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          <div style={{
                            padding: '0.4rem 0.5rem',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            backgroundColor: 'var(--card-header-bg)'
                          }}>
                            <Search size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
                            <input
                              type="text"
                              autoFocus
                              placeholder={t('motions.searchCountryPlaceholder', 'Buscar país...')}
                              value={busquedaPais}
                              onChange={(e) => setBusquedaPais(e.target.value)}
                              style={{
                                width: '100%',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-color)',
                                fontSize: '0.78rem',
                                outline: 'none'
                              }}
                            />
                            {busquedaPais && (
                              <button
                                type="button"
                                onClick={() => setBusquedaPais('')}
                                style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer', padding: 0 }}
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>

                          <div style={{ maxHeight: '180px', overflowY: 'auto', padding: '0.2rem 0' }}>
                            {paisesFiltrados.length === 0 ? (
                              <div style={{ padding: '0.6rem', textAlign: 'center', fontSize: '0.74rem', color: 'var(--muted-text)' }}>
                                {t('countries.noCountriesFound', 'No se encontraron países')}
                              </div>
                            ) : (
                              paisesFiltrados.map((p) => {
                                const isSelected = proponente === p.nombre;
                                return (
                                  <div
                                    key={p.id || p.nombre}
                                    onClick={() => {
                                      setProponente(p.nombre);
                                      setMostrarDropdownPais(false);
                                    }}
                                    style={{
                                      padding: '0.4rem 0.65rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      cursor: 'pointer',
                                      backgroundColor: isSelected ? 'var(--accent-soft)' : 'transparent',
                                      transition: 'background-color 0.1s ease'
                                    }}
                                  >
                                    <CountryFlag bandera={p.bandera} nombre={p.nombre} size="xs" />
                                    <span style={{
                                      fontSize: '0.78rem',
                                      fontWeight: isSelected ? '700' : '500',
                                      color: isSelected ? 'var(--accent-color)' : 'var(--text-color)',
                                      flex: 1,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>
                                      {p.nombre}
                                    </span>
                                    {isSelected && <Check size={13} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Tema / Propósito */}
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted-text)', display: 'block', marginBottom: '0.25rem' }}>
                    {t('motions.topic', '3. Tema / Propósito del Debate *')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('motions.topicPlaceholder', 'Ej. Estrategias de cooperación económica...')}
                    value={tema}
                    onChange={e => setTema(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-color)',
                      borderRadius: 'var(--border-radius, 6px)',
                      fontSize: '0.8rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Turno del Proponente en Caucus Moderado */}
              {esModerado && (
                <div style={{
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '0.45rem 0.65rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--muted-text)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Mic size={12} style={{ color: 'var(--accent-color)' }} />
                    <span>{t('motions.speakerTurn', 'Turno de la delegación')} ({proponente || t('ui.proponent3')}):</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => setPosicionProponente('Primero')}
                      style={{
                        flex: 1,
                        padding: '0.35rem 0.5rem',
                        backgroundColor: posicionProponente === 'Primero' ? 'var(--btn-bg)' : 'var(--input-bg)',
                        color: posicionProponente === 'Primero' ? 'var(--btn-text)' : 'var(--text-color)',
                        border: posicionProponente === 'Primero' ? '1px solid var(--btn-bg)' : '1px solid var(--border-color)',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Mic size={12} />
                      <span>{t('motions.speakFirst', 'Hablar Primero')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosicionProponente('Ultimo')}
                      style={{
                        flex: 1,
                        padding: '0.35rem 0.5rem',
                        backgroundColor: posicionProponente === 'Ultimo' ? 'var(--btn-bg)' : 'var(--input-bg)',
                        color: posicionProponente === 'Ultimo' ? 'var(--btn-text)' : 'var(--text-color)',
                        border: posicionProponente === 'Ultimo' ? '1px solid var(--btn-bg)' : '1px solid var(--border-color)',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Hourglass size={12} />
                      <span>{t('motions.speakLast', 'Hablar Al Final')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Modalidad de Consulta General (Sin 'Estándar', solo Ping-Pong o Moderada por País) */}
              {esConsulta && (
                <div style={{
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '0.45rem 0.65rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--muted-text)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MessageSquare size={12} style={{ color: 'var(--accent-color)' }} />
                    <span>{t('motions.consultationMode', 'Modalidad de Consulta:')}</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.35rem' }}>
                    {[
                      { id: 'Cadena / Ping-Pong', label: t('ui.pingPongOpen') },
                      { id: 'Moderada por el Proponente', label: t('ui.moderatedByCountry') }
                    ].map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVarianteConsulta(v.id)}
                        style={{
                          padding: '0.35rem 0.4rem',
                          backgroundColor: varianteConsulta === v.id ? 'var(--accent-soft)' : 'var(--input-bg)',
                          color: varianteConsulta === v.id ? 'var(--accent-color)' : 'var(--text-color)',
                          border: varianteConsulta === v.id ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Configuración de Tiempos y Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: (!esTour && esModerado) ? '1fr 1fr' : '1fr', gap: '0.45rem' }}>
                {/* Tiempo Total (excepto Tour de Table) */}
                {tipo !== 'Tour de Table' && (
                  <div style={{
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius, 6px)',
                    padding: '0.45rem 0.6rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--muted-text)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} style={{ color: 'var(--accent-color)' }} /> {t('motions.totalDuration', 'Tiempo Total')}
                      </label>
                      <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-color)', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
                        {tiempoTotalMin}m
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <button
                        type="button"
                        onClick={() => setTiempoTotalMin(prev => Math.max(1, Number(prev) - 1))}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--input-bg)',
                          color: 'var(--text-color)',
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        -
                      </button>

                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={tiempoTotalMin}
                        onChange={e => setTiempoTotalMin(Math.max(1, Number(e.target.value)))}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          textAlign: 'center',
                          padding: '0.25rem 0.2rem',
                          backgroundColor: 'var(--input-bg)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-color)',
                          borderRadius: '4px',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          fontVariantNumeric: 'tabular-nums',
                          fontFamily: 'monospace'
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => setTiempoTotalMin(prev => Math.min(90, Number(prev) + 1))}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--input-bg)',
                          color: 'var(--text-color)',
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        +
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'space-between' }}>
                      {presetsTotalMin.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setTiempoTotalMin(p)}
                          style={{
                            flex: 1,
                            padding: '0.15rem 0',
                            fontSize: '0.67rem',
                            borderRadius: '3px',
                            border: Number(tiempoTotalMin) === p ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                            backgroundColor: Number(tiempoTotalMin) === p ? 'var(--accent-soft)' : 'var(--input-bg)',
                            color: Number(tiempoTotalMin) === p ? 'var(--accent-color)' : 'var(--muted-text)',
                            cursor: 'pointer',
                            fontWeight: '600',
                            textAlign: 'center'
                          }}
                        >
                          {p}m
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tiempo por Orador */}
                {(esModerado || esTour) && (
                  <div style={{
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius, 6px)',
                    padding: '0.45rem 0.6rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--muted-text)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Mic size={12} style={{ color: 'var(--accent-color)' }} /> {t('motions.speakerDuration', 'Por Orador')}
                      </label>
                      <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--accent-color)', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
                        {tiempoOradorSeg}s
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <button
                        type="button"
                        onClick={() => setTiempoOradorSeg(prev => Math.max(10, Number(prev) - 5))}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--input-bg)',
                          color: 'var(--text-color)',
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        -
                      </button>

                      <input
                        type="number"
                        min="10"
                        max="300"
                        step="5"
                        value={tiempoOradorSeg}
                        onChange={e => setTiempoOradorSeg(Math.max(10, Number(e.target.value)))}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          textAlign: 'center',
                          padding: '0.25rem 0.2rem',
                          backgroundColor: 'var(--input-bg)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-color)',
                          borderRadius: '4px',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          fontVariantNumeric: 'tabular-nums',
                          fontFamily: 'monospace'
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => setTiempoOradorSeg(prev => Math.min(300, Number(prev) + 5))}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--input-bg)',
                          color: 'var(--text-color)',
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        +
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'space-between' }}>
                      {presetsOradorSeg.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setTiempoOradorSeg(p)}
                          style={{
                            flex: 1,
                            padding: '0.15rem 0',
                            fontSize: '0.67rem',
                            borderRadius: '3px',
                            border: Number(tiempoOradorSeg) === p ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                            backgroundColor: Number(tiempoOradorSeg) === p ? 'var(--accent-soft)' : 'var(--input-bg)',
                            color: Number(tiempoOradorSeg) === p ? 'var(--accent-color)' : 'var(--muted-text)',
                            cursor: 'pointer',
                            fontWeight: '600',
                            textAlign: 'center'
                          }}
                        >
                          {p}s
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Capacidad estimada para Caucus Moderado */}
              {esModerado && intervencionesEstimadas > 0 && (
                <div style={{
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '0.35rem 0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem',
                  color: 'var(--muted-text)'
                }}>
                  <span><BarChart2 size={13} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: '-1px' }} />{t('ui.estimatedCapacity')}</span>
                  <strong style={{ fontSize: '0.76rem', color: 'var(--text-color)' }}>
                    ~{intervencionesEstimadas} {t('motions.estimatedInterventions', 'intervenciones')}
                  </strong>
                </div>
              )}

              {/* Botones de Envío / Cancelar */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                <button
                  type="button"
                  onClick={() => setMostrarForm(false)}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.75rem',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-color)',
                    borderRadius: 'var(--border-radius, 6px)',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {t('common.cancel', 'Cancelar')}
                </button>

                <button
                  type="submit"
                  disabled={!proponente || !tema.trim()}
                  style={{
                    flex: 2,
                    padding: '0.45rem 0.85rem',
                    backgroundColor: 'var(--btn-bg)',
                    color: 'var(--btn-text)',
                    border: 'none',
                    borderRadius: 'var(--border-radius, 6px)',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: (!proponente || !tema.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (!proponente || !tema.trim()) ? 0.45 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Plus size={14} /> {t('motions.addMotion', 'Guardar Moción')}
                </button>
              </div>
            </form>
          )}

          {/* Lista de Tarjetas de Mociones */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '2px' }}>
            {mociones.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title={t('motions.noMotionsTitle', 'Pizarra sin mociones')}
                description={t('motions.noMotionsDesc', 'Registra mociones de caucus moderado, no moderado o consultas de debate.')}
                actionLabel={!mostrarForm ? t('motions.createFirst', '+ Añadir Primera Moción') : undefined}
                onAction={() => setMostrarForm(true)}
                compact={true}
              />
            ) : (
              mociones.map((m, idx) => {
                const esAprobada = m.estado === 'Aprobada';
                const esFallida = m.estado === 'Fallida';
                const isDragging = draggedIndex === idx;
                const isDragOver = dragOverIndex === idx;

                const getTipoBadgeStyle = (tipoMocion = '') => {
                  if (tipoMocion.startsWith(t('motions.modCaucus'))) {
                    return { bg: 'var(--accent-soft)', border: 'var(--accent-color)', text: 'var(--accent-color)' };
                  }
                  if (tipoMocion.startsWith(t('motions.unmodCaucus'))) {
                    return { bg: 'var(--card-header-bg)', border: 'var(--border-color)', text: 'var(--text-color)' };
                  }
                  if (tipoMocion.startsWith(t('motions.generalConsultation'))) {
                    return { bg: 'var(--card-header-bg)', border: 'var(--border-color)', text: 'var(--accent-color)' };
                  }
                  if (tipoMocion.startsWith(t('motions.roundRobin'))) {
                    return { bg: 'var(--warning-soft)', border: 'var(--warning-color)', text: 'var(--warning-color)' };
                  }
                  return { bg: 'var(--card-header-bg)', border: 'var(--border-color)', text: 'var(--text-color)' };
                };

                const tipoBadge = getTipoBadgeStyle(m.tipo);

                return (
                  <div
                    key={m.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', idx.toString());
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggedIndex(idx);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      if (draggedIndex !== idx) setDragOverIndex(idx);
                    }}
                    onDragLeave={() => {
                      if (dragOverIndex === idx) setDragOverIndex(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIndexStr = e.dataTransfer.getData('text/plain');
                      const fromIndex = parseInt(fromIndexStr, 10);
                      if (!isNaN(fromIndex) && fromIndex !== idx) {
                        reordenarMociones(fromIndex, idx);
                      }
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    style={{
                      backgroundColor: isDragging
                        ? 'var(--accent-soft)'
                        : (esAprobada ? 'var(--success-soft)' : (esFallida ? 'var(--danger-soft)' : 'var(--card-header-bg)')),
                      border: isDragOver
                        ? '2px dashed var(--accent-color)'
                        : `1px solid ${isDragging ? 'var(--accent-color)' : (esAprobada ? 'var(--success-color)' : (esFallida ? 'var(--danger-color)' : 'var(--border-color)'))}`,
                      borderRadius: 'var(--border-radius, 6px)',
                      padding: '0.65rem 0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem',
                      opacity: isDragging ? 0.45 : 1,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Header de la tarjeta */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.4rem',
                      flexWrap: 'nowrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
                        <div
                          style={{ cursor: 'grab', display: 'flex', alignItems: 'center', opacity: 0.5, flexShrink: 0 }}
                          title={t('motions.dragToReorder', 'Arrastrar para reordenar')}
                        >
                          <GripVertical size={14} />
                        </div>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          opacity: 0.6,
                          fontFamily: 'monospace',
                          flexShrink: 0
                        }}>
                          #{idx + 1}
                        </span>
                        <CountryFlag
                          bandera={m.bandera || paises.find(p => p.nombre === m.proponente)?.bandera}
                          nombre={m.proponente}
                          size="xs"
                        />
                        <span style={{
                          fontWeight: '700',
                          fontSize: '0.86rem',
                          color: 'var(--text-color)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          minWidth: 0
                        }}>
                          {m.proponente}
                        </span>
                        {m.posicionProponente === 'Ultimo' && (
                          <span style={{
                            fontSize: '0.62rem',
                            backgroundColor: 'var(--accent-soft)',
                            border: '1px solid var(--accent-color)',
                            color: 'var(--accent-color)',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontWeight: '700',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}>
                            {t('motions.speaksLastBadge', 'Habla al final')}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: '700',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: tipoBadge.bg,
                          border: `1px solid ${tipoBadge.border}`,
                          color: tipoBadge.text,
                          letterSpacing: '0.02em',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap'
                        }}>
                          {t(`sessionValues.${m.tipo}`, m.tipo)}
                        </span>

                        {eliminarMocion && (
                          <button
                            type="button"
                            onClick={() => eliminarMocion(m.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--muted-text)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0.6
                            }}
                            title={t('common.delete', 'Eliminar')}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tema / Propósito */}
                    <div style={{
                      fontSize: '0.84rem',
                      fontWeight: '600',
                      color: 'var(--text-color)',
                      lineHeight: 1.35,
                      wordBreak: 'break-word',
                      padding: '0.1rem 0'
                    }}>
                      {m.tema}
                    </div>

                    {/* Métricas y Botonera */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                      paddingTop: '0.3rem',
                      borderTop: '1px solid var(--subborder-color)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        flexWrap: 'wrap',
                        fontSize: '0.7rem',
                        color: 'var(--muted-text)'
                      }}>
                        {m.tiempoTotal > 0 && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            backgroundColor: 'var(--input-bg)',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            whiteSpace: 'nowrap'
                          }}>
                            <Timer size={11} style={{ color: 'var(--accent-color)' }} />
                            <span>{t('ui.total2')}</span>
                            <strong style={{ color: 'var(--text-color)', fontFamily: 'monospace' }}>{formatMinutos(m.tiempoTotal)}</strong>
                          </span>
                        )}
                        {m.tiempoOrador > 0 && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            backgroundColor: 'var(--input-bg)',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            whiteSpace: 'nowrap'
                          }}>
                            <Mic size={11} style={{ color: 'var(--accent-color)' }} />
                            <span>{t('ui.speaker')}</span>
                            <strong style={{ color: 'var(--text-color)', fontFamily: 'monospace' }}>{m.tiempoOrador}s</strong>
                          </span>
                        )}
                        {m.tiempoTotal > 0 && m.tiempoOrador > 0 && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            fontSize: '0.67rem',
                            whiteSpace: 'nowrap'
                          }}>
                            <BarChart2 size={11} />
                            <span>~{Math.floor(m.tiempoTotal / m.tiempoOrador)} {t('ui.turns')}</span>
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: 'auto' }}>
                        <button
                          type="button"
                          onClick={() => handleAprobarMocion(m.id)}
                          style={{
                            backgroundColor: esAprobada ? 'var(--success-solid)' : 'var(--success-soft)',
                            border: '1px solid var(--success-color)',
                            color: esAprobada ? '#ffffff' : 'var(--success-color)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            padding: '0.3rem 0.55rem',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            whiteSpace: 'nowrap'
                          }}
                          title={t('motions.approve', 'Aprobar Moción')}
                        >
                          <Check size={12} />
                          <span>{t('motions.approve', 'Aprobar')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => votarMocion(m.id, 'Fallida')}
                          style={{
                            backgroundColor: esFallida ? 'var(--danger-solid)' : 'var(--danger-soft)',
                            border: '1px solid var(--danger-color)',
                            color: esFallida ? '#ffffff' : 'var(--danger-color)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            padding: '0.3rem 0.55rem',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            whiteSpace: 'nowrap'
                          }}
                          title={t('motions.reject', 'Reprobar / Fallida')}
                        >
                          <X size={12} />
                          <span>{t('motions.reject', 'Reprobar')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* VISTA 2: LISTA DE ORADORES ACTIVOS DE DEBATE              */}
      {/* ══════════════════════════════════════════════════════════ */}
      {vistaActiva === 'oradores' && (
        <div
          role="tabpanel"
          id="panel-oradores"
          aria-labelledby="tab-oradores"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            minHeight: 0,
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Header y Acciones de Oradores */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--muted-text)', fontWeight: '500' }}>
                {oradoresCaucus.length} {oradoresCaucus.length === 1 ? t('ui.speakerOnList') : t('ui.speakersOnList')}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <button
                type="button"
                onClick={ordenarOradoresDebateAlfabetico}
                disabled={oradoresCaucus.length <= 1}
                title={t('ui.sortDebateAlphabeticallyAZ')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.35rem 0.55rem',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  borderRadius: 'var(--border-radius, 6px)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-color)',
                  cursor: oradoresCaucus.length <= 1 ? 'not-allowed' : 'pointer',
                  opacity: oradoresCaucus.length <= 1 ? 0.45 : 1
                }}
              >
                <ArrowUpDown size={11} />
                <span>A-Z</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (oradoresCaucus.length > 0) {
                    vaciarOradoresDebate();
                  }
                }}
                disabled={oradoresCaucus.length === 0}
                title={t('ui.removeAllDebateSpeakers')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.35rem 0.55rem',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  borderRadius: 'var(--border-radius, 6px)',
                  border: '1px solid var(--danger-color)',
                  backgroundColor: 'var(--danger-soft)',
                  color: 'var(--danger-color)',
                  cursor: oradoresCaucus.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: oradoresCaucus.length === 0 ? 0.45 : 1
                }}
              >
                <Trash2 size={11} />
                <span>{t('common.clearAll', 'Vaciar')}</span>
              </button>

              {caucusActivo?.activo && (
                <button
                  type="button"
                  onClick={handleFinalizarDebate}
                  title={t('ui.concludeCurrentDebateAndReturnToTheMotionsBoard')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    borderRadius: 'var(--border-radius, 6px)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--card-header-bg)',
                    color: 'var(--text-color)',
                    cursor: 'pointer'
                  }}
                >
                  <StopCircle size={12} style={{ color: 'var(--warning-color)' }} />
                  <span>{t('timers.endDebate', 'Finalizar')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Tarjeta de Resumen del Caucus Activo */}
          {caucusActivo?.activo && (
            <div style={{
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius, 6px)',
              padding: '0.45rem 0.65rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              fontSize: '0.75rem',
              flexShrink: 0
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--accent-color)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {t(`sessionValues.${caucusActivo.tipo}`, caucusActivo.tipo)}
                </div>
                <div style={{ fontWeight: '700', color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {caucusActivo.tema || t('ui.noTopicAssigned')}
                </div>
              </div>
              {caucusActivo.proponente && (
                <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', flexShrink: 0 }}>
                  {t('ui.prop')} <strong style={{ color: 'var(--text-color)' }}>{caucusActivo.proponente}</strong>
                </div>
              )}
            </div>
          )}

          {/* Buscador Rápido de Delegación para Añadir al Debate */}
          <div style={{ position: 'relative', flexShrink: 0 }} ref={dropdownOradorRef}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius, 6px)',
              padding: '0.35rem 0.6rem',
              gap: '0.4rem'
            }}>
              <Search size={13} style={{ color: 'var(--muted-text)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder={t('timers.addDelegatePlaceholder', 'Añadir delegado al caucus...')}
                value={busquedaOrador}
                onChange={e => {
                  setBusquedaOrador(e.target.value);
                  setMostrarDropdownOrador(true);
                }}
                onFocus={() => setMostrarDropdownOrador(true)}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-color)',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              />
              {busquedaOrador && (
                <button
                  type="button"
                  onClick={() => setBusquedaOrador('')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer', padding: 0 }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Dropdown flotante con delegaciones disponibles */}
            {mostrarDropdownOrador && busquedaOrador.trim().length > 0 && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius, 6px)',
                maxHeight: '160px',
                overflowY: 'auto',
                zIndex: 100,
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
              }}>
                {paisesDisponiblesOrador.length === 0 ? (
                  <div style={{ padding: '0.55rem', textAlign: 'center', fontSize: '0.74rem', color: 'var(--muted-text)' }}>
                    {t('ui.noDelegationsAvailable')}
                  </div>
                ) : (
                  paisesDisponiblesOrador.map(p => (
                    <div
                      key={p.id || p.nombre}
                      onClick={() => {
                        agregarOradorCaucus(p);
                        setBusquedaOrador('');
                        setMostrarDropdownOrador(false);
                      }}
                      style={{
                        padding: '0.4rem 0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        color: 'var(--text-color)',
                        transition: 'background-color 0.1s ease'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--card-header-bg)'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <CountryFlag bandera={p.bandera} nombre={p.nombre} size="xs" />
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</span>
                      <Plus size={13} style={{ color: 'var(--accent-color)' }} />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Lista de Oradores (Drag & Drop) */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            border: '1px solid var(--subborder-color)',
            borderRadius: 'var(--border-radius, 6px)',
            padding: '0.45rem',
            backgroundColor: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}>
            {oradoresCaucus.length === 0 ? (
              <EmptyState
                icon={Mic}
                title={t('timers.noSpeakersTitle', 'Sin oradores en debate')}
                description={
                  mociones.length > 0 && !caucusActivo?.activo
                    ? t('timers.noSpeakersDescWithMotions', { count: mociones.length })
                    : t('timers.noSpeakersDesc', 'Añade delegaciones usando el buscador superior o haciendo clic en el panel derecho.')
                }
                actionLabel={mociones.length > 0 && !caucusActivo?.activo ? t('motions.goToBoard', 'Ir a Pizarra de Mociones') : undefined}
                onAction={mociones.length > 0 && !caucusActivo?.activo ? () => setVistaActiva('mociones') : undefined}
                compact={true}
              />
            ) : (
              oradoresCaucus.map((o, idx) => {
                const isDragging = draggedIndex === idx;
                const isDragOver = dragOverIndex === idx;

                return (
                  <div
                    key={o.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', idx.toString());
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggedIndex(idx);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      if (draggedIndex !== idx) setDragOverIndex(idx);
                    }}
                    onDragLeave={() => {
                      if (dragOverIndex === idx) setDragOverIndex(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIndexStr = e.dataTransfer.getData('text/plain');
                      const fromIndex = parseInt(fromIndexStr, 10);
                      if (!isNaN(fromIndex) && fromIndex !== idx) {
                        reordenarOradoresDebate(fromIndex, idx);
                      }
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.65rem',
                      fontSize: '0.88rem',
                      backgroundColor: isDragging
                        ? 'var(--accent-soft)'
                        : (idx === 0 ? 'var(--success-soft)' : (idx === 1 ? 'var(--accent-soft)' : 'var(--panel-color)')),
                      border: isDragOver
                        ? '2px dashed var(--accent-color)'
                        : `1px solid ${isDragging ? 'var(--accent-color)' : (idx === 0 ? 'var(--success-color)' : (idx === 1 ? 'var(--accent-color)' : 'var(--subborder-color)'))}`,
                      borderRadius: '4px',
                      opacity: isDragging ? 0.5 : 1,
                      cursor: 'grab',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <GripVertical size={13} style={{ color: 'var(--muted-text)', cursor: 'grab', flexShrink: 0 }} title={t('motions.dragToReorder')} />
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        color: idx === 0 ? 'var(--success-color)' : (idx === 1 ? 'var(--accent-color)' : 'var(--muted-text)'),
                        width: '20px',
                        fontFamily: 'monospace'
                      }}>
                        #{idx + 1}
                      </span>
                      <CountryFlag bandera={o.bandera} nombre={o.nombre} size="xs" />
                      <span style={{ fontWeight: idx === 0 ? '800' : '600', color: 'var(--text-color)', fontSize: '0.88rem' }}>
                        {o.nombre}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {idx === 0 && (
                        <span style={{ backgroundColor: 'var(--success-solid)', color: '#ffffff', fontWeight: '800', fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                          {t('timers.speaking')}
                        </span>
                      )}
                      {idx === 1 && (
                        <span style={{ backgroundColor: 'var(--accent-color)', color: '#ffffff', fontWeight: '700', fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                          {t('timers.next')}
                        </span>
                      )}
                      {o.esProponenteUltimo && (
                        <span style={{ backgroundColor: 'var(--subborder-color)', color: 'var(--text-color)', fontWeight: '700', fontSize: '0.62rem', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>
                          {t('ui.proponent2')}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removerOradorCaucus(o.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--danger-color)',
                          opacity: 0.75,
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '3px'
                        }}
                        title={t('ui.removeSpeakerFromDebate')}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PizarraMociones;
