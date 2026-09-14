import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Check, X, Clock, MessageSquare, Users, Mic, Sparkles, RotateCcw, AlertCircle, ArrowUpDown, GripVertical, Pin, Hourglass, BarChart2, Timer, ChevronDown, Search, Globe, Trash2 } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import EmptyState from '../common/EmptyState';
import { useTranslation } from 'react-i18next';

const PizarraMociones = () => {
  const { t } = useTranslation();
  const { paises, mociones, agregarMocion, votarMocion, eliminarMocion, reordenarMociones, ordenarMocionesDisruptividad } = useSession();

  const [mostrarForm, setMostrarForm] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [proponente, setProponente] = useState('');
  const [posicionProponente, setPosicionProponente] = useState('Primero');
  const [tipo, setTipo] = useState('Caucus Moderado');
  const [varianteConsulta, setVarianteConsulta] = useState('Estándar');
  const [tema, setTema] = useState('');
  const [tiempoTotalMin, setTiempoTotalMin] = useState(10);
  const [tiempoOradorSeg, setTiempoOradorSeg] = useState(45);
  const [mostrarDropdownPais, setMostrarDropdownPais] = useState(false);
  const [busquedaPais, setBusquedaPais] = useState('');
  const dropdownPaisRef = useRef(null);

  // Cerrar dropdown de país al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownPaisRef.current && !dropdownPaisRef.current.contains(event.target)) {
        setMostrarDropdownPais(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quórum y Cálculo de Mayorías en tiempo real
  const totalPaises = paises.length;
  const presentes = useMemo(() => paises.filter(p => p.estatus === 'Presente').length, [paises]);
  const presentesYVotando = useMemo(() => paises.filter(p => p.estatus === 'Presente y Votando').length, [paises]);
  const totalAsistentes = presentes + presentesYVotando;

  const mayoriaSimple = totalAsistentes > 0 ? Math.floor(totalAsistentes / 2) + 1 : 0;
  const mayoriaCualificada = totalAsistentes > 0 ? Math.ceil((totalAsistentes * 2) / 3) : 0;
  const mayoriaDosTercios = mayoriaCualificada;

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

  const formatMinutos = (segundos) => {
    if (!segundos || segundos === 0) return 'N/A';
    const mins = Math.floor(segundos / 60);
    return `${mins} min`;
  };

  const esModerado = tipo === 'Caucus Moderado';
  const esConsulta = tipo === 'Consulta General';
  const esNoModerado = tipo === 'Caucus No Moderado';
  const esTour = tipo === 'Tour de Table';

  // Estimación de intervenciones posibles
  const intervencionesEstimadas = useMemo(() => {
    if (!esModerado || !tiempoOradorSeg || tiempoOradorSeg <= 0) return 0;
    return Math.floor((Number(tiempoTotalMin) * 60) / Number(tiempoOradorSeg));
  }, [esModerado, tiempoTotalMin, tiempoOradorSeg]);

  // ── Tipos de mociones con metadata visual ──
  const tiposMocionConfig = [
    {
      id: 'Caucus Moderado',
      nombre: 'Caucus Moderado',
      subtitulo: 'Oradores cronometrados por turnos',
      icon: Mic,
      color: '#3b82f6',
      activeBg: 'rgba(59, 130, 246, 0.15)',
      activeBorder: '#3b82f6',
      textColor: '#93c5fd'
    },
    {
      id: 'Caucus No Moderado',
      nombre: 'Caucus No Moderado',
      subtitulo: 'Negociación y redacción libre',
      icon: Users,
      color: '#a855f7',
      activeBg: 'rgba(168, 85, 247, 0.15)',
      activeBorder: '#a855f7',
      textColor: '#d8b4fe'
    },
    {
      id: 'Consulta General',
      nombre: 'Consulta General',
      subtitulo: 'Diálogo abierto o ping-pong temático',
      icon: MessageSquare,
      color: '#10b981',
      activeBg: 'rgba(16, 185, 129, 0.15)',
      activeBorder: '#10b981',
      textColor: '#6ee7b7'
    },
    {
      id: 'Tour de Table',
      nombre: 'Tour de Table',
      subtitulo: 'Intervención de todas las delegaciones',
      icon: RotateCcw,
      color: '#f59e0b',
      activeBg: 'rgba(245, 158, 11, 0.15)',
      activeBorder: '#f59e0b',
      textColor: '#fcd34d'
    }
  ];

  // Presets de tiempo rápido
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
      gap: '0.65rem',
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Pin size={18} color="var(--btn-bg)" />
          <div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', letterSpacing: '-0.01em' }}>
              Pizarra de Mociones
            </h3>
            <span style={{ fontSize: '0.7rem', opacity: 0.55, fontWeight: '500' }}>
              {mociones.length} {mociones.length === 1 ? 'moción registrada' : 'mociones registradas'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            type="button"
            onClick={ordenarMocionesDisruptividad}
            disabled={mociones.length <= 1}
            style={{
              padding: '0.45rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '7px',
              cursor: mociones.length <= 1 ? 'not-allowed' : 'pointer',
              opacity: mociones.length <= 1 ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              transition: 'all 0.15s ease'
            }}
            title="Ordenar mociones por prioridad de disruptividad (No Moderado > Consulta > Tour > Moderado)"
          >
            <ArrowUpDown size={12} />
            <span>{t('motions.disruptivenessOrder', 'Disruptividad')}</span>
          </button>

          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            style={{
              padding: '0.45rem 0.8rem',
              fontSize: '0.78rem',
              fontWeight: '700',
              backgroundColor: mostrarForm ? 'rgba(239, 68, 68, 0.15)' : 'var(--btn-bg, #3b82f6)',
              color: mostrarForm ? '#f87171' : 'var(--btn-text, #ffffff)',
              border: mostrarForm ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '7px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: mostrarForm ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.25)'
            }}
          >
            {mostrarForm ? (
              <>
                <X size={14} /> {t('common.close', 'Cerrar')}
              </>
            ) : (
              <>
                <Plus size={14} /> {t('motions.newMotion', 'Añadir Moción')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Barra Informativa de Quórum y Mayorías ── */}
      <div style={{
        backgroundColor: 'var(--card-header-bg, rgba(255, 255, 255, 0.03))',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
        borderRadius: '7px',
        padding: '0.45rem 0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.45rem',
        fontSize: '0.74rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Users size={14} style={{ color: '#38bdf8' }} />
          <span style={{ fontWeight: '600', opacity: 0.9 }}>
            {t('voting.quorum', 'Quórum')}: <strong>{totalAsistentes}</strong>
          </span>
          <span style={{ fontSize: '0.68rem', opacity: 0.5 }}>
            ({presentes} P + {presentesYVotando} PyV)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ opacity: 0.8 }}>
            Simple: <strong style={{ color: '#38bdf8', fontWeight: '800' }}>{mayoriaSimple}</strong>
          </span>
          <span style={{ opacity: 0.3 }}>•</span>
          <span style={{ opacity: 0.8 }}>
            Cualificada: <strong style={{ color: '#c084fc', fontWeight: '800' }}>{mayoriaCualificada}</strong>
          </span>
        </div>
      </div>

      {/* ── Formulario Rehaul y Estilizado de Añadir Moción (Compacto y Optimizado) ── */}
      {mostrarForm && (
        <form
          onSubmit={handleSubmitMocion}
          style={{
            background: 'var(--panel-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '0.85rem 0.95rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            position: 'relative'
          }}
        >
          {/* Cabecera del Formulario */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={15} style={{ color: '#38bdf8' }} />
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', letterSpacing: '0.01em' }}>
                {t('motions.newMotion', 'Nueva Moción')}
              </h4>
            </div>

            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              style={{
                background: 'var(--card-header-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-color)',
                borderRadius: '5px',
                padding: '0.25rem',
                cursor: 'pointer',
                opacity: 0.8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 0.15s ease'
              }}
              title="Cerrar formulario"
            >
              <X size={15} />
            </button>
          </div>

          {/* 1. Selector Visual de Tipo de Moción (Grid 2x2 compacto) */}
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, display: 'block', marginBottom: '0.35rem' }}>
              {t('motions.motionType', '1. Modalidad de Debate')}
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.45rem'
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
                        setVarianteConsulta('No Moderada');
                      } else if (tItem.id === 'Tour de Table') {
                        setTiempoOradorSeg(45);
                      }
                    }}
                    style={{
                      padding: '0.55rem 0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      backgroundColor: isSelected ? tItem.activeBg : 'var(--card-header-bg, rgba(255, 255, 255, 0.03))',
                      border: isSelected ? `1.5px solid ${tItem.activeBorder}` : '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                      borderRadius: '8px',
                      color: isSelected ? tItem.textColor : 'var(--text-color)',
                      boxShadow: isSelected ? `0 0 12px ${tItem.color}30` : 'none',
                      transition: 'all 0.15s ease',
                      outline: 'none'
                    }}
                  >
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      backgroundColor: isSelected ? tItem.color : 'rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSelected ? '#ffffff' : 'var(--muted-text, #94a3b8)',
                      flexShrink: 0
                    }}>
                      <IconComponent size={14} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? '800' : '600',
                        color: isSelected ? tItem.textColor : 'var(--text-color)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {tItem.nombre}
                      </div>
                    </div>
                    {isSelected && (
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: tItem.color, flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. País Proponente y Tema / Propósito */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {/* País Proponente */}
            <div style={{ position: 'relative' }} ref={dropdownPaisRef}>
              <label style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                <span>{t('motions.proponent', '2. País Proponente *')}</span>
              </label>
              {paises.length === 0 ? (
                <div style={{ padding: '0.45rem 0.6rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', fontSize: '0.73rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertCircle size={13} /> Sin delegaciones en la sesión.
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
                      padding: '0.48rem 0.65rem',
                      backgroundColor: 'var(--card-header-bg, rgba(255, 255, 255, 0.04))',
                      border: mostrarDropdownPais ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                      color: 'var(--text-color)',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
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
                              backgroundColor: paisSeleccionado.estatus.includes('Presente') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: paisSeleccionado.estatus.includes('Presente') ? '#4ade80' : '#f87171',
                              fontWeight: '600',
                              marginLeft: 'auto'
                            }}>
                              {paisSeleccionado.estatus}
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--muted-text, #94a3b8)', fontWeight: '500' }}>
                          {t('motions.selectProponent', 'Selecciona el país proponente...')}
                        </span>
                      )}
                    </div>
                    <ChevronDown size={14} style={{ opacity: 0.6, transform: mostrarDropdownPais ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
                  </button>

                  {/* Dropdown flotante */}
                  {mostrarDropdownPais && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      backgroundColor: 'var(--panel-color, #1e293b)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
                      zIndex: 100,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {/* Barra de Búsqueda */}
                      <div style={{
                        padding: '0.4rem 0.5rem',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        backgroundColor: 'var(--card-header-bg, rgba(255, 255, 255, 0.03))'
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
                            style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer', padding: 0, display: 'flex' }}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* Lista de países */}
                      <div style={{
                        maxHeight: '180px',
                        overflowY: 'auto',
                        padding: '0.25rem 0'
                      }}>
                        {paisesFiltrados.length === 0 ? (
                          <div style={{ padding: '0.6rem', textAlign: 'center', fontSize: '0.74rem', opacity: 0.5 }}>
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
                                  padding: '0.45rem 0.65rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  cursor: 'pointer',
                                  backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                  transition: 'background 0.1s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--card-header-bg, rgba(255, 255, 255, 0.06))';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                <CountryFlag bandera={p.bandera} nombre={p.nombre} size="xs" />
                                <span style={{
                                  fontSize: '0.8rem',
                                  fontWeight: isSelected ? '700' : '500',
                                  color: isSelected ? '#38bdf8' : 'var(--text-color)',
                                  flex: 1,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {p.nombre}
                                </span>
                                {p.estatus && (
                                  <span style={{
                                    fontSize: '0.65rem',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    backgroundColor: p.estatus.includes('Presente') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: p.estatus.includes('Presente') ? '#4ade80' : '#f87171',
                                    opacity: 0.8
                                  }}>
                                    {p.estatus}
                                  </span>
                                )}
                                {isSelected && <Check size={13} style={{ color: '#38bdf8', flexShrink: 0 }} />}
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
              <label style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, display: 'block', marginBottom: '0.25rem' }}>
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
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Opciones Específicas: Turno del Proponente en Caucus Moderado */}
          {esModerado && (
            <div style={{
              backgroundColor: 'rgba(59, 130, 246, 0.06)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '7px',
              padding: '0.5rem 0.65rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Mic size={12} /> {t('motions.speakerTurn', 'Turno de la delegación')} ({proponente || 'Proponente'}):
              </label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setPosicionProponente('Primero')}
                  style={{
                    flex: 1,
                    padding: '0.35rem 0.5rem',
                    backgroundColor: posicionProponente === 'Primero' ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
                    color: posicionProponente === 'Primero' ? '#ffffff' : 'var(--text-color)',
                    border: posicionProponente === 'Primero' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '5px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Mic size={13} />
                  <span>{t('motions.speakFirst', 'Hablar Primero')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPosicionProponente('Ultimo')}
                  style={{
                    flex: 1,
                    padding: '0.35rem 0.5rem',
                    backgroundColor: posicionProponente === 'Ultimo' ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
                    color: posicionProponente === 'Ultimo' ? '#ffffff' : 'var(--text-color)',
                    border: posicionProponente === 'Ultimo' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '5px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Hourglass size={13} />
                  <span>{t('motions.speakLast', 'Hablar Al Final')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Opciones Específicas: Modalidad de Consulta General */}
          {esConsulta && (
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '7px',
              padding: '0.5rem 0.65rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <MessageSquare size={12} /> {t('motions.consultationMode', 'Modalidad de Consulta:')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                {[
                  { id: 'Estándar', label: 'Estándar' },
                  { id: 'Cadena / Ping-Pong', label: 'Ping-Pong' },
                  { id: 'Moderada por el Proponente', label: 'Mod. País' }
                ].map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVarianteConsulta(v.id)}
                    style={{
                      padding: '0.35rem 0.4rem',
                      backgroundColor: varianteConsulta === v.id ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                      color: varianteConsulta === v.id ? '#000000' : 'var(--text-color)',
                      border: varianteConsulta === v.id ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '5px',
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

          {/* 4. Configuración de Tiempos y Presets (Compacto y Elegante) */}
          <div style={{ display: 'grid', gridTemplateColumns: (!esTour && esModerado) ? '1fr 1fr' : '1fr', gap: '0.5rem' }}>
            {/* Tiempo Total (excepto Tour de Table) */}
            {tipo !== 'Tour de Table' && (
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '7px',
                padding: '0.5rem 0.65rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '700', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} style={{ color: '#38bdf8' }} /> {t('motions.totalDuration', 'Total')}
                  </label>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#38bdf8', fontFamily: 'monospace' }}>
                    {tiempoTotalMin}m
                  </span>
                </div>

                {/* Controles de Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <button
                    type="button"
                    onClick={() => setTiempoTotalMin(prev => Math.max(1, Number(prev) - 1))}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '5px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'var(--text-color)',
                      borderRadius: '5px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      fontFamily: 'monospace'
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setTiempoTotalMin(prev => Math.min(90, Number(prev) + 1))}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '5px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
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

                {/* Presets Rápidos */}
                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'space-between' }}>
                  {presetsTotalMin.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTiempoTotalMin(p)}
                      style={{
                        flex: 1,
                        padding: '0.15rem 0',
                        fontSize: '0.67rem',
                        borderRadius: '4px',
                        border: Number(tiempoTotalMin) === p ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                        backgroundColor: Number(tiempoTotalMin) === p ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: Number(tiempoTotalMin) === p ? '#38bdf8' : 'inherit',
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

            {/* Tiempo por Orador (para Caucus Moderado o Tour de Table) */}
            {(esModerado || esTour) && (
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '7px',
                padding: '0.5rem 0.65rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '700', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Mic size={12} style={{ color: '#a855f7' }} /> {t('motions.speakerDuration', 'Orador')}
                  </label>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#c084fc', fontFamily: 'monospace' }}>
                    {tiempoOradorSeg}s
                  </span>
                </div>

                {/* Controles de Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <button
                    type="button"
                    onClick={() => setTiempoOradorSeg(prev => Math.max(10, Number(prev) - 5))}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '5px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'var(--text-color)',
                      borderRadius: '5px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      fontFamily: 'monospace'
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setTiempoOradorSeg(prev => Math.min(300, Number(prev) + 5))}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '5px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
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

                {/* Presets Rápidos */}
                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'space-between' }}>
                  {presetsOradorSeg.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTiempoOradorSeg(p)}
                      style={{
                        flex: 1,
                        padding: '0.15rem 0',
                        fontSize: '0.67rem',
                        borderRadius: '4px',
                        border: Number(tiempoOradorSeg) === p ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.08)',
                        backgroundColor: Number(tiempoOradorSeg) === p ? 'rgba(192, 132, 252, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: Number(tiempoOradorSeg) === p ? '#c084fc' : 'inherit',
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

          {/* Banner de cálculo inteligente para Caucus Moderado */}
          {esModerado && intervencionesEstimadas > 0 && (
            <div style={{
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              border: '1px dashed rgba(56, 189, 248, 0.3)',
              borderRadius: '6px',
              padding: '0.35rem 0.65rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              color: '#bae6fd'
            }}>
              <span><BarChart2 size={13} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: '-1px' }} />Capacidad estimada:</span>
              <strong style={{ fontSize: '0.76rem', color: '#38bdf8' }}>
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
                padding: '0.5rem 0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'var(--text-color)',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
            >
              {t('common.cancel', 'Cancelar')}
            </button>

            <button
              type="submit"
              disabled={!proponente || !tema.trim()}
              style={{
                flex: 2,
                padding: '0.5rem 0.85rem',
                background: (!proponente || !tema.trim())
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '800',
                letterSpacing: '0.02em',
                cursor: (!proponente || !tema.trim()) ? 'not-allowed' : 'pointer',
                opacity: (!proponente || !tema.trim()) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                boxShadow: (!proponente || !tema.trim()) ? 'none' : '0 3px 10px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus size={14} /> {t('motions.addMotion', 'Guardar Moción')}
            </button>
          </div>
        </form>
      )}

      {/* Lista / Tarjetas de Mociones con Drag & Drop y Adaptabilidad Total */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.55rem', paddingRight: '2px' }}>
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
              if (tipoMocion.startsWith('Caucus Moderado')) {
                return { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.4)', text: '#60a5fa' };
              }
              if (tipoMocion.startsWith('Caucus No Moderado')) {
                return { bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.4)', text: '#c084fc' };
              }
              if (tipoMocion.startsWith('Consulta General')) {
                return { bg: 'rgba(20, 184, 166, 0.12)', border: 'rgba(20, 184, 166, 0.4)', text: '#2dd4bf' };
              }
              if (tipoMocion.startsWith('Tour de Table')) {
                return { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24' };
              }
              return { bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.4)', text: '#a5b4fc' };
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
                    ? 'rgba(59, 130, 246, 0.15)'
                    : (esAprobada ? 'rgba(34, 197, 94, 0.08)' : (esFallida ? 'rgba(239, 68, 68, 0.08)' : 'var(--card-header-bg, rgba(255, 255, 255, 0.03))')),
                  border: isDragOver
                    ? `2px dashed ${tipoBadge.border || '#3b82f6'}`
                    : `1px solid ${isDragging ? '#3b82f6' : (esAprobada ? '#166534' : (esFallida ? '#991b1b' : 'var(--border-color, rgba(255, 255, 255, 0.08))'))}`,
                  borderRadius: '9px',
                  padding: '0.65rem 0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                  opacity: isDragging ? 0.45 : 1,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.08)'
                }}
              >
                {/* 1. Header: Tirador + Índice + País + Tipo de Moción + Eliminar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.4rem',
                  flexWrap: 'nowrap'
                }}>
                  {/* Izquierda: Grip, Orden, Bandera y País Proponente */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
                    <div
                      style={{ cursor: 'grab', display: 'flex', alignItems: 'center', opacity: 0.5, flexShrink: 0 }}
                      title={t('motions.dragToReorder', 'Arrastrar para reordenar')}
                    >
                      <GripVertical size={15} />
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
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        color: '#93c5fd',
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

                  {/* Derecha: Badge de Modalidad y Botón Eliminar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: tipoBadge.bg,
                      border: `1px solid ${tipoBadge.border}`,
                      color: tipoBadge.text,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap'
                    }}>
                      {m.tipo}
                    </span>

                    {eliminarMocion && (
                      <button
                        type="button"
                        onClick={() => eliminarMocion(m.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--muted-text, #94a3b8)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.6,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.opacity = '1';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = 'var(--muted-text, #94a3b8)';
                          e.currentTarget.style.opacity = '0.6';
                        }}
                        title={t('common.delete', 'Eliminar')}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Cuerpo: Tema / Propósito */}
                <div style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: 'var(--text-color)',
                  lineHeight: 1.35,
                  wordBreak: 'break-word',
                  padding: '0.15rem 0'
                }}>
                  {m.tema}
                </div>

                {/* 3. Footer: Métricas de Tiempo a la Izquierda y Botonera a la Derecha */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  paddingTop: '0.3rem',
                  borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.05))'
                }}>
                  {/* Chips de Tiempo */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    flexWrap: 'wrap',
                    fontSize: '0.7rem',
                    color: 'var(--muted-text, #94a3b8)'
                  }}>
                    {m.tiempoTotal > 0 && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        padding: '2px 5px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))',
                        whiteSpace: 'nowrap'
                      }}>
                        <Timer size={11} style={{ color: '#38bdf8' }} />
                        <span>Total:</span>
                        <strong style={{ color: 'var(--text-color)', fontFamily: 'monospace' }}>{formatMinutos(m.tiempoTotal)}</strong>
                      </span>
                    )}
                    {m.tiempoOrador > 0 && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        padding: '2px 5px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))',
                        whiteSpace: 'nowrap'
                      }}>
                        <Mic size={11} style={{ color: '#c084fc' }} />
                        <span>Orador:</span>
                        <strong style={{ color: 'var(--text-color)', fontFamily: 'monospace' }}>{m.tiempoOrador}s</strong>
                      </span>
                    )}
                    {m.tiempoTotal > 0 && m.tiempoOrador > 0 && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        opacity: 0.8,
                        fontSize: '0.67rem',
                        whiteSpace: 'nowrap'
                      }}>
                        <BarChart2 size={11} />
                        <span>~{Math.floor(m.tiempoTotal / m.tiempoOrador)} turnos</span>
                      </span>
                    )}
                  </div>

                  {/* Botones de Votación */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => votarMocion(m.id, 'Aprobada')}
                      style={{
                        background: esAprobada ? '#16a34a' : 'rgba(34, 197, 94, 0.12)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: esAprobada ? '#ffffff' : '#4ade80',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        padding: '0.3rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
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
                        background: esFallida ? '#dc2626' : 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: esFallida ? '#ffffff' : '#f87171',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        padding: '0.3rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
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
  );
};

export default PizarraMociones;
