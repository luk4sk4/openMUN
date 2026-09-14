import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Plus,
  ArrowUp,
  ArrowDown,
  X,
  Check,
  Edit3,
  Sparkles,
  CheckCircle2,
  Clock,
  PauseCircle,
  Play,
  ChevronDown,
  Layers,
  Shield,
  Globe,
  HeartPulse,
  Scale,
  Flame,
  ChevronRight,
  RotateCcw,
  Briefcase,
  Landmark,
  BookOpen,
  Coins,
  ListOrdered
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../../context/AccessibilityContext';

const COMITES_PREDEFINIDOS = [
  { nombre: 'Consejo de Seguridad (UNSC / CSNU)', icon: Shield, color: '#3b82f6' },
  { nombre: 'Asamblea General (AG / UNGA)', icon: Globe, color: '#2563eb' },
  { nombre: 'AG1 - DISEC (Desarme y Seguridad)', icon: Shield, color: '#6366f1' },
  { nombre: 'AG2 - ECOFIN (Asuntos Económicos y Financieros)', icon: Coins, color: '#0ea5e9' },
  { nombre: 'Organización Mundial de la Salud (OMS / WHO)', icon: HeartPulse, color: '#14b8a6' },
  { nombre: 'UNESCO (Educación, Ciencia y Cultura)', icon: BookOpen, color: '#ec4899' },
  { nombre: 'UNODC (Drogas y Delito)', icon: Scale, color: '#f59e0b' },
  { nombre: 'Organización Internacional del Trabajo (OIT / ILO)', icon: Briefcase, color: '#10b981' },
  { nombre: 'ACNUR (Refugiados / UNHCR)', icon: Landmark, color: '#06b6d4' },
  { nombre: 'Consejo de Derechos Humanos (UNHRC)', icon: Scale, color: '#8b5cf6' },
  { nombre: 'Gabinete de Crisis Histórica / Futura', icon: Flame, color: '#ef4444' }
];

const ESTADOS_TEMA = [
  { id: 'En Discusión', key: 'agenda.discussion', defaultLabel: 'En Discusión', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', icon: Play },
  { id: 'Pendiente', key: 'agenda.pending', defaultLabel: 'Pendiente', color: '#a1a1aa', bg: 'rgba(161, 161, 170, 0.1)', border: '#3f3f46', icon: Clock },
  { id: 'Concluido', key: 'agenda.completed', defaultLabel: 'Concluido', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', border: '#22c55e', icon: CheckCircle2 },
  { id: 'Pausado', key: 'agenda.paused', defaultLabel: 'Pausado', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: '#f59e0b', icon: PauseCircle },
];

const EstablecerAgenda = () => {
  const { t } = useTranslation();
  const { isLight } = useAccessibility();
  const {
    nombreComite,
    setNombreComite,
    agendaSesion,
    establecerAgenda,
    cambiarTemaActual
  } = useSession();

  const [comite, setComite] = useState(nombreComite || '');
  const [nuevoTema, setNuevoTema] = useState('');
  const [mostrarPresets, setMostrarPresets] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [menuEstadoId, setMenuEstadoId] = useState(null);

  const presetsRef = useRef(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    setComite(nombreComite || '');
  }, [nombreComite]);

  // Click outside para cerrar dropdown de presets o menu de estados
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target)) {
        setMostrarPresets(false);
      }
      if (menuEstadoId && !e.target.closest('.estado-dropdown-container')) {
        setMenuEstadoId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuEstadoId]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleComiteBlur = () => {
    if (comite.trim() !== (nombreComite || '')) {
      setNombreComite(comite.trim());
    }
  };

  const handleComiteKeyDown = (e) => {
    if (e.key === 'Enter') {
      setNombreComite(comite.trim());
      e.target.blur();
    }
  };

  const handleSelectPreset = (nombre) => {
    setComite(nombre);
    setNombreComite(nombre);
    setMostrarPresets(false);
  };

  const temas = agendaSesion.temasPropuestos || [];
  const temaActual = agendaSesion.temaActual || (temas.find(t => t.estado === 'En Discusión')?.titulo || temas[0]?.titulo || '');

  // Conteo de métricas
  const totalTemas = temas.length;
  const concluidosCount = temas.filter(t => t.estado === 'Concluido').length;
  const activosCount = temas.filter(t => t.estado === 'En Discusión' || t.titulo === temaActual).length;

  const handleAgregarTema = (e) => {
    if (e) e.preventDefault();
    const txt = nuevoTema.trim();
    if (!txt) return;

    const item = {
      id: Date.now().toString(),
      titulo: txt,
      estado: temas.length === 0 ? 'En Discusión' : 'Pendiente'
    };
    const nuevaLista = [...temas, item];

    if (!agendaSesion.establecida || !agendaSesion.temaActual || temas.length === 0) {
      establecerAgenda(txt, nuevaLista);
    } else {
      establecerAgenda(agendaSesion.temaActual, nuevaLista);
    }
    setNuevoTema('');
  };

  const handleAplicarPlantilla = (tipo) => {
    let nuevaLista = [];
    if (tipo === 'ab') {
      nuevaLista = [
        { id: (Date.now()).toString(), titulo: 'Tópico A: Medidas de Emergencia y Cooperación Internacional', estado: 'En Discusión' },
        { id: (Date.now() + 1).toString(), titulo: 'Tópico B: Marco Regulatorio y Sostenibilidad a Largo Plazo', estado: 'Pendiente' }
      ];
    } else if (tipo === 'crisis') {
      nuevaLista = [
        { id: (Date.now()).toString(), titulo: 'Fase 1: Evaluación y Respuesta Inmediata a la Amenaza', estado: 'En Discusión' },
        { id: (Date.now() + 1).toString(), titulo: 'Fase 2: Coordinación Táctica y Directivas de Acción', estado: 'Pendiente' },
        { id: (Date.now() + 2).toString(), titulo: 'Fase 3: Negociación de Paz y Estabilización', estado: 'Pendiente' }
      ];
    } else if (tipo === 'general') {
      nuevaLista = [
        { id: (Date.now()).toString(), titulo: 'Debate General y Establecimiento del Orden del Día', estado: 'En Discusión' },
        { id: (Date.now() + 1).toString(), titulo: 'Tratamiento de Proyectos de Resolución y Enmiendas', estado: 'Pendiente' },
        { id: (Date.now() + 2).toString(), titulo: 'Votación Final Sustantiva', estado: 'Pendiente' }
      ];
    }

    if (nuevaLista.length > 0) {
      establecerAgenda(nuevaLista[0].titulo, nuevaLista);
    }
  };

  const handleEliminarTema = (id, e) => {
    if (e) e.stopPropagation();
    const nuevaLista = temas.filter(t => t.id !== id);
    const target = temas.find(t => t.id === id);
    if (target && target.titulo === temaActual) {
      const proximo = nuevaLista[0]?.titulo || '';
      establecerAgenda(
        proximo,
        nuevaLista.map((t, idx) => ({ ...t, estado: idx === 0 ? 'En Discusión' : t.estado }))
      );
    } else {
      establecerAgenda(temaActual, nuevaLista);
    }
  };

  const handleMoverTema = (index, dir, e) => {
    if (e) e.stopPropagation();
    const target = index + dir;
    if (target < 0 || target >= temas.length) return;
    const clone = [...temas];
    const [moved] = clone.splice(index, 1);
    clone.splice(target, 0, moved);
    establecerAgenda(temaActual, clone);
  };

  const handleActivarTema = (titulo) => {
    cambiarTemaActual(titulo);
  };

  const handleCambiarEstado = (id, nuevoEstado, e) => {
    if (e) e.stopPropagation();
    const nuevaLista = temas.map(t => {
      if (t.id === id) {
        return { ...t, estado: nuevoEstado };
      }
      // Si se marca uno como 'En Discusión', los demás pasan a Pendiente si estaban en discusión
      if (nuevoEstado === 'En Discusión' && t.estado === 'En Discusión') {
        return { ...t, estado: 'Pendiente' };
      }
      return t;
    });

    const temaSeleccionado = temas.find(t => t.id === id);
    const nuevoTemaActivo = nuevoEstado === 'En Discusión' ? temaSeleccionado?.titulo : (
      temaActual === temaSeleccionado?.titulo ? (nuevaLista.find(t => t.estado === 'En Discusión')?.titulo || nuevaLista[0]?.titulo || '') : temaActual
    );

    establecerAgenda(nuevoTemaActivo, nuevaLista);
    setMenuEstadoId(null);
  };

  const handleGuardarEdicion = (id) => {
    if (!editText.trim()) {
      setEditingId(null);
      return;
    }
    const nuevaLista = temas.map(t => {
      if (t.id === id) {
        return { ...t, titulo: editText.trim() };
      }
      return t;
    });
    const editado = temas.find(t => t.id === id);
    const nuevoActivo = editado?.titulo === temaActual ? editText.trim() : temaActual;
    establecerAgenda(nuevoActivo, nuevaLista);
    setEditingId(null);
    setEditText('');
  };

  const handleIniciarEdicion = (item, e) => {
    if (e) e.stopPropagation();
    setEditingId(item.id);
    setEditText(item.titulo);
  };

  // Avanzar rápidamente al siguiente tema pendiente
  const handleAvanzarSiguiente = () => {
    const currentIndex = temas.findIndex(t => t.titulo === temaActual);
    if (currentIndex === -1) return;

    const nuevaLista = temas.map((t, idx) => {
      if (idx === currentIndex) return { ...t, estado: 'Concluido' };
      if (idx === currentIndex + 1) return { ...t, estado: 'En Discusión' };
      return t;
    });

    const siguienteTema = temas[currentIndex + 1];
    if (siguienteTema) {
      establecerAgenda(siguienteTema.titulo, nuevaLista);
    } else {
      establecerAgenda(temaActual, nuevaLista);
    }
  };

  return (
    <div style={{
      padding: '0.65rem 0.75rem',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      backgroundColor: 'var(--panel-color)',
      color: 'var(--text-color)',
      gap: '0.5rem',
      fontSize: '0.8rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* ── Encabezado & Nombre del Comité ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '7px',
          padding: '0.35rem 0.6rem',
          position: 'relative',
          transition: 'border-color 0.2s'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '5px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: '#3b82f6',
            flexShrink: 0
          }}>
            <Building2 size={14} />
          </div>

          <input
            type="text"
            value={comite}
            onChange={e => setComite(e.target.value)}
            onBlur={handleComiteBlur}
            onKeyDown={handleComiteKeyDown}
            placeholder={t('agenda.committeePlaceholder', 'Nombre del comité (ej: Consejo de Seguridad)...')}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-color)',
              fontSize: '0.82rem',
              fontWeight: '600',
              outline: 'none',
              minWidth: 0
            }}
          />

          {/* Botón de Presets de Comité */}
          <div ref={presetsRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setMostrarPresets(!mostrarPresets)}
              title="Seleccionar plantilla de comité"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                padding: '0.2rem 0.45rem',
                backgroundColor: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: '5px',
                color: 'var(--text-color)',
                fontSize: '0.7rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = isLight ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)'}
            >
              <Sparkles size={11} color="#60a5fa" />
              <span style={{ fontSize: '0.68rem', fontWeight: '500' }}>Presets</span>
              <ChevronDown size={11} style={{ transform: mostrarPresets ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>

            {mostrarPresets && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '260px',
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                zIndex: 100,
                padding: '0.35rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem'
              }}>
                <div style={{
                  padding: '0.25rem 0.45rem',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  {t('agenda.munCommittees', 'Comités MUN Habituales')}
                </div>
                {COMITES_PREDEFINIDOS.map((p, idx) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(p.nombre)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.4rem 0.5rem',
                        backgroundColor: comite === p.nombre ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        border: 'none',
                        borderRadius: '5px',
                        color: 'var(--text-color)',
                        fontSize: '0.74rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = comite === p.nombre ? 'rgba(59, 130, 246, 0.15)' : 'transparent'}
                    >
                      <Icon size={13} color={p.color} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.nombre}
                      </span>
                      {comite === p.nombre && <Check size={12} color="#22c55e" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Barra de Métricas y Plantillas Rápidas ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.35rem',
          padding: '0.2rem 0.1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: '600',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <ListOrdered size={12} />
              {totalTemas} {totalTemas === 1 ? t('agenda.topicSingular', 'Punto') : t('agenda.topicPlural', 'Puntos')}
            </span>
            {concluidosCount > 0 && (
              <span style={{
                fontSize: '0.64rem',
                fontWeight: '600',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                color: '#22c55e',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                {concluidosCount} {concluidosCount > 1 ? t('agenda.completedPlural', 'Concluidos') : t('agenda.completedSingular', 'Concluido')}
              </span>
            )}
          </div>

          {/* Siguiente Tema Rápido si hay más de 1 tema */}
          {temas.length > 1 && (
            <button
              type="button"
              onClick={handleAvanzarSiguiente}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                padding: '0.15rem 0.45rem',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '4px',
                color: '#60a5fa',
                fontSize: '0.68rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
              title={t('agenda.markDoneAndPass', "Marcar actual como concluido y pasar al siguiente punto")}
            >
              <span>{t('common.next', 'Siguiente')}</span>
              <ChevronRight size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Añadir Punto a la Agenda ── */}
      <form onSubmit={handleAgregarTema} style={{ display: 'flex', gap: '0.35rem' }}>
        <input
          type="text"
          value={nuevoTema}
          onChange={e => setNuevoTema(e.target.value)}
          placeholder={t('agenda.newTopicPlaceholder', 'Escribir nuevo punto de agenda o tópico...')}
          style={{
            flex: 1,
            padding: '0.4rem 0.6rem',
            backgroundColor: isLight ? '#ffffff' : 'var(--card-header-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            color: 'var(--text-color)',
            fontSize: '0.78rem',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={e => e.target.style.borderColor = '#3b82f6'}
          onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
        />
        <button
          type="submit"
          disabled={!nuevoTema.trim()}
          style={{
            padding: '0.4rem 0.75rem',
            backgroundColor: nuevoTema.trim() ? '#3b82f6' : (isLight ? '#e2e8f0' : '#27272a'),
            color: nuevoTema.trim() ? '#ffffff' : (isLight ? '#94a3b8' : '#71717a'),
            border: 'none',
            borderRadius: '6px',
            cursor: nuevoTema.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.76rem',
            fontWeight: '600',
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
          onMouseEnter={e => {
            if (nuevoTema.trim()) e.currentTarget.style.backgroundColor = '#2563eb';
          }}
          onMouseLeave={e => {
            if (nuevoTema.trim()) e.currentTarget.style.backgroundColor = '#3b82f6';
          }}
        >
          <Plus size={13} /> {t('common.add', 'Añadir')}
        </button>
      </form>

      {/* ── Lista de Temas ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        paddingRight: '2px',
        minHeight: 0
      }}>
        {temas.length === 0 ? (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            padding: '1.2rem 0.8rem',
            backgroundColor: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-color)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6'
            }}>
              <Layers size={18} />
            </div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.8rem', color: 'var(--text-color)' }}>
                {t('agenda.noTopics', 'Sin puntos de agenda asignados')}
              </div>
              <div style={{ color: '#71717a', fontSize: '0.72rem', marginTop: '2px' }}>
                {t('agenda.addOrPreset', 'Añade tópicos o carga una plantilla rápida:')}
              </div>
            </div>

            {/* Botones de plantillas rápidas */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', justifyContent: 'center', marginTop: '0.2rem' }}>
              <button
                type="button"
                onClick={() => handleAplicarPlantilla('ab')}
                style={{
                  padding: '0.3rem 0.55rem',
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '5px',
                  color: 'var(--text-color)',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                📑 {t('agenda.templateAB', 'Tópico A / Tópico B')}
              </button>
              <button
                type="button"
                onClick={() => handleAplicarPlantilla('general')}
                style={{
                  padding: '0.3rem 0.55rem',
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '5px',
                  color: 'var(--text-color)',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                🏛️ {t('agenda.templateGA', 'Asamblea General')}
              </button>
              <button
                type="button"
                onClick={() => handleAplicarPlantilla('crisis')}
                style={{
                  padding: '0.3rem 0.55rem',
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '5px',
                  color: 'var(--text-color)',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                ⚡ {t('agenda.templateCrisis', 'Fases de Crisis')}
              </button>
            </div>
          </div>
        ) : (
          temas.map((item, index) => {
            const esActual = item.titulo === temaActual;
            const estadoCfg = ESTADOS_TEMA.find(e => e.id === item.estado) || (
              esActual ? ESTADOS_TEMA[0] : ESTADOS_TEMA[1]
            );
            const EstadoIcon = estadoCfg.icon;
            const isEditing = editingId === item.id;

            return (
              <div
                key={item.id || index}
                style={{
                  padding: '0.45rem 0.55rem',
                  backgroundColor: esActual
                    ? 'rgba(59, 130, 246, 0.1)'
                    : (item.estado === 'Concluido' ? 'rgba(34, 197, 94, 0.05)' : 'var(--card-header-bg)'),
                  border: `1px solid ${esActual ? '#3b82f6' : (item.estado === 'Concluido' ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-color)')}`,
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                {/* Índice */}
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  color: esActual ? '#60a5fa' : (item.estado === 'Concluido' ? '#22c55e' : '#71717a'),
                  width: '16px',
                  textAlign: 'center',
                  flexShrink: 0
                }}>
                  {index + 1}.
                </span>

                {/* Título o Input de Edición */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleGuardarEdicion(item.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        style={{
                          flex: 1,
                          padding: '0.2rem 0.4rem',
                          backgroundColor: isLight ? '#ffffff' : 'var(--panel-color)',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          color: 'var(--text-color)',
                          fontSize: '0.78rem',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleGuardarEdicion(item.id)}
                        style={{
                          padding: '0.2rem 0.4rem',
                          backgroundColor: '#22c55e',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title={t('common.SaveChanges', 'Guardar cambios')}
                      >
                        <Check size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        style={{
                          padding: '0.2rem 0.4rem',
                          backgroundColor: isLight ? '#e2e8f0' : '#3f3f46',
                          color: isLight ? '#334155' : '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Cancelar"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => handleActivarTema(item.titulo)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      title="Clic para establecer como tema activo en debate"
                    >
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: esActual ? '600' : '400',
                        color: esActual ? 'var(--text-color)' : (item.estado === 'Concluido' ? '#a1a1aa' : 'var(--text-color)'),
                        textDecoration: item.estado === 'Concluido' ? 'line-through' : 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1
                      }}>
                        {item.titulo}
                      </span>
                    </div>
                  )}
                </div>

                {/* Badge de Estado con Dropdown de Selección */}
                {!isEditing && (
                  <div className="estado-dropdown-container" style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuEstadoId(menuEstadoId === item.id ? null : item.id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.12rem 0.4rem',
                        borderRadius: '4px',
                        backgroundColor: estadoCfg.bg,
                        border: `1px solid ${estadoCfg.border}`,
                        color: estadoCfg.color,
                        fontSize: '0.64rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      title="Cambiar estado del tema"
                    >
                      <EstadoIcon size={10} />
                      <span>{t(estadoCfg.key, estadoCfg.defaultLabel)}</span>
                      <ChevronDown size={10} />
                    </button>

                    {menuEstadoId === item.id && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        right: 0,
                        backgroundColor: 'var(--panel-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                        zIndex: 50,
                        padding: '0.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.15rem',
                        minWidth: '120px'
                      }}>
                        {ESTADOS_TEMA.map(est => {
                          const Icono = est.icon;
                          const isSel = item.estado === est.id || (esActual && est.id === 'En Discusión');
                          return (
                            <button
                              key={est.id}
                              type="button"
                              onClick={(e) => handleCambiarEstado(item.id, est.id, e)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.4rem',
                                backgroundColor: isSel ? est.bg : 'transparent',
                                border: 'none',
                                borderRadius: '4px',
                                color: isSel ? est.color : 'var(--text-color)',
                                fontSize: '0.7rem',
                                fontWeight: isSel ? '600' : '400',
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = est.bg}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = isSel ? est.bg : 'transparent'}
                            >
                              <Icono size={11} color={est.color} />
                              <span>{t(est.key, est.defaultLabel)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Barra de Acciones (Editar, Subir, Bajar, Eliminar) */}
                {!isEditing && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem', flexShrink: 0 }}>
                    {/* Botón Editar Texto */}
                    <button
                      type="button"
                      onClick={(e) => handleIniciarEdicion(item, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-color)',
                        opacity: 0.6,
                        cursor: 'pointer',
                        padding: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '3px'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = '#3b82f6'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.color = 'var(--text-color)'; }}
                      title="Editar título"
                    >
                      <Edit3 size={12} />
                    </button>

                    {/* Subir */}
                    <button
                      type="button"
                      onClick={(e) => handleMoverTema(index, -1, e)}
                      disabled={index === 0}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-color)',
                        cursor: index === 0 ? 'default' : 'pointer',
                        opacity: index === 0 ? 0.15 : 0.6,
                        padding: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '3px'
                      }}
                      onMouseEnter={e => { if (index !== 0) e.currentTarget.style.opacity = 1; }}
                      onMouseLeave={e => { if (index !== 0) e.currentTarget.style.opacity = 0.6; }}
                      title="Mover arriba"
                    >
                      <ArrowUp size={12} />
                    </button>

                    {/* Bajar */}
                    <button
                      type="button"
                      onClick={(e) => handleMoverTema(index, 1, e)}
                      disabled={index === temas.length - 1}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-color)',
                        cursor: index === temas.length - 1 ? 'default' : 'pointer',
                        opacity: index === temas.length - 1 ? 0.15 : 0.6,
                        padding: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '3px'
                      }}
                      onMouseEnter={e => { if (index !== temas.length - 1) e.currentTarget.style.opacity = 1; }}
                      onMouseLeave={e => { if (index !== temas.length - 1) e.currentTarget.style.opacity = 0.6; }}
                      title="Mover abajo"
                    >
                      <ArrowDown size={12} />
                    </button>

                    {/* Eliminar */}
                    <button
                      type="button"
                      onClick={(e) => handleEliminarTema(item.id, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#71717a',
                        cursor: 'pointer',
                        padding: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '3px',
                        marginLeft: '1px'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#71717a'}
                      title="Eliminar punto"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export { EstablecerAgenda };
export default EstablecerAgenda;
