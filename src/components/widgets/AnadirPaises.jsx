import React, { useState, useMemo } from 'react';
import { Search, Users, Timer, Check, Plus, X, Crown, Sparkles, UserPlus, Trash2, ArrowUpDown, GripVertical, Globe } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import { useTranslation } from 'react-i18next';

// Normalizar texto para búsqueda sin distinguir tildes ni mayúsculas
function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const PRESETS_RAPIDOS = [
  {
    nombre: 'Consejo de Seguridad (UNSC)',
    paises: [
      { id: 'p_1', nombre: 'China', bandera: '🇨🇳', veto: true, estatus: 'Presente' },
      { id: 'p_2', nombre: 'Estados Unidos', bandera: '🇺🇸', veto: true, estatus: 'Presente' },
      { id: 'p_3', nombre: 'Francia', bandera: '🇫🇷', veto: true, estatus: 'Presente' },
      { id: 'p_4', nombre: 'Reino Unido', bandera: '🇬🇧', veto: true, estatus: 'Presente' },
      { id: 'p_5', nombre: 'Rusia', bandera: '🇷🇺', veto: true, estatus: 'Presente' },
      { id: 'p_6', nombre: 'Argelia', bandera: '🇩🇿', veto: false, estatus: 'Presente' },
      { id: 'p_7', nombre: 'Dinamarca', bandera: '🇩🇰', veto: false, estatus: 'Presente' },
      { id: 'p_8', nombre: 'Grecia', bandera: '🇬🇷', veto: false, estatus: 'Presente' },
      { id: 'p_9', nombre: 'Guyana', bandera: '🇬🇾', veto: false, estatus: 'Presente' },
      { id: 'p_10', nombre: 'Pakistán', bandera: '🇵🇰', veto: false, estatus: 'Presente' },
      { id: 'p_11', nombre: 'Panamá', bandera: '🇵🇦', veto: false, estatus: 'Presente' },
      { id: 'p_12', nombre: 'Corea del Sur', bandera: '🇰🇷', veto: false, estatus: 'Presente' },
      { id: 'p_13', nombre: 'Sierra Leona', bandera: '🇸🇱', veto: false, estatus: 'Presente' },
      { id: 'p_14', nombre: 'Eslovenia', bandera: '🇸🇮', veto: false, estatus: 'Presente' },
      { id: 'p_15', nombre: 'Somalia', bandera: '🇸🇴', veto: false, estatus: 'Presente' }
    ]
  }
];

const AnadirPaises = () => {
  const { t } = useTranslation();
  const {
    paises,
    setPaises,
    oradoresCola,
    agregarOrador,
    removerOrador,
    vaciarOradoresGSL,
    ordenarOradoresGSLAlfabetico,
    reordenarOradoresGSL,
    oradoresCaucus,
    agregarOradorCaucus,
    removerOradorCaucus,
    vaciarOradoresDebate,
    ordenarOradoresDebateAlfabetico,
    reordenarOradoresDebate,
    ordenarPaisesAlfabetico,
    reordenarPaises
  } = useSession();

  // Switch de destino: 'GSL' (Lista General) o 'DEBATE' (Debate / Caucus)
  const [destino, setDestino] = useState('GSL');
  const [busqueda, setBusqueda] = useState('');
  const [filtroVista, setFiltroVista] = useState('TODOS'); // 'TODOS' | 'DISPONIBLES' | 'EN_LISTA'
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const esGSL = destino === 'GSL';
  const listaActiva = esGSL ? oradoresCola : oradoresCaucus;

  // Mapa de oradores en la lista activa para búsqueda instantánea
  const mapaEnLista = useMemo(() => {
    const map = new Map();
    listaActiva.forEach((orador, index) => {
      map.set(orador.nombre, { id: orador.id, index: index + 1 });
    });
    return map;
  }, [listaActiva]);

  // Filtrado por búsqueda y vista sobre la lista de países
  const paisesFiltrados = useMemo(() => {
    const q = normalizar(busqueda);
    return paises.filter(p => {
      const coincideNombre = normalizar(p.nombre).includes(q);
      if (!coincideNombre) return false;

      const estaEnLista = mapaEnLista.has(p.nombre);
      if (filtroVista === 'DISPONIBLES') return !estaEnLista;
      if (filtroVista === 'EN_LISTA') return estaEnLista;
      return true;
    });
  }, [paises, busqueda, filtroVista, mapaEnLista]);

  // Alternar inclusión de país (Añadir si no está, Retirar si ya está)
  const handleTogglePais = (pais) => {
    const infoEnLista = mapaEnLista.get(pais.nombre);
    if (infoEnLista) {
      // Ya está en lista -> se retira para volver a estar disponible
      if (esGSL) {
        removerOrador(infoEnLista.id);
      } else {
        removerOradorCaucus(infoEnLista.id);
      }
    } else {
      // No está en lista -> se añade
      if (esGSL) {
        agregarOrador(pais);
      } else {
        agregarOradorCaucus(pais);
      }
    }
  };

  // Manejar submit con Enter en búsqueda
  const handleKeyDownBusqueda = (e) => {
    if (e.key === 'Enter' && paisesFiltrados.length > 0) {
      e.preventDefault();
      // Si el primer resultado no está en lista, lo añade. Si ya está, lo retira.
      handleTogglePais(paisesFiltrados[0]);
    }
  };

  const cantDisponibles = paises.length - mapaEnLista.size;
  const cantEnLista = mapaEnLista.size;

  return (
    <div style={{
      position: 'relative',
      padding: '0.9rem',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      backgroundColor: 'var(--panel-color)',
      color: 'var(--text-color)',
      gap: '0.65rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* ── HEADER Y SWITCH SELECTOR ────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        paddingBottom: '0.4rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: esGSL ? 'rgba(168, 85, 247, 0.18)' : 'rgba(249, 115, 22, 0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: esGSL ? '#c084fc' : '#fb923c',
            transition: 'all 0.25s ease'
          }}>
            <UserPlus size={16} />
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '0.92rem',
              fontWeight: '700',
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              Añadir Países
            </h3>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {/* Botones de orden alfabético y vaciar */}
          <button
            type="button"
            onClick={ordenarPaisesAlfabetico}
            title="Ordenar países alfabéticamente (A-Z)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.25rem 0.55rem',
              fontSize: '0.72rem',
              fontWeight: '600',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-color)',
              cursor: 'pointer'
            }}
          >
            <ArrowUpDown size={12} />
            <span>A-Z</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (listaActiva.length > 0) {
                if (esGSL) vaciarOradoresGSL();
                else vaciarOradoresDebate();
              }
            }}
            disabled={listaActiva.length === 0}
            title={`Eliminar todos los oradores de ${esGSL ? 'GSL' : 'Debate'}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.25rem 0.55rem',
              fontSize: '0.72rem',
              fontWeight: '600',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#f87171',
              cursor: listaActiva.length === 0 ? 'not-allowed' : 'pointer',
              opacity: listaActiva.length === 0 ? 0.4 : 1
            }}
          >
            <Trash2 size={12} />
            <span>{t('common.clearAll', 'Eliminar todos')}</span>
          </button>

          {/* Switch Destino: Lista General vs Debate */}
          <div style={{
            display: 'flex',
            backgroundColor: '#09090b',
            borderRadius: '7px',
            padding: '3px',
            border: '1px solid #27272a',
            gap: '2px'
          }}>
            <button
              type="button"
              onClick={() => setDestino('GSL')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.65rem',
                fontSize: '0.74rem',
                fontWeight: esGSL ? '700' : '500',
                borderRadius: '5px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                backgroundColor: esGSL ? '#a855f7' : 'transparent',
                color: esGSL ? '#ffffff' : '#a1a1aa',
                boxShadow: esGSL ? '0 2px 8px rgba(168, 85, 247, 0.4)' : 'none'
              }}
            >
              <Users size={13} />
              <span>{t('timers.generalList', 'Lista General')}</span>
              <span style={{
                fontSize: '0.68rem',
                backgroundColor: esGSL ? 'rgba(255, 255, 255, 0.25)' : '#1f1f23',
                color: esGSL ? '#ffffff' : '#71717a',
                padding: '0.05rem 0.35rem',
                borderRadius: '9999px',
                fontWeight: '700'
              }}>
                {oradoresCola.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDestino('DEBATE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.65rem',
                fontSize: '0.74rem',
                fontWeight: !esGSL ? '700' : '500',
                borderRadius: '5px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                backgroundColor: !esGSL ? '#f97316' : 'transparent',
                color: !esGSL ? '#ffffff' : '#a1a1aa',
                boxShadow: !esGSL ? '0 2px 8px rgba(249, 115, 22, 0.4)' : 'none'
              }}
            >
              <Timer size={13} />
              <span>{t('timers.debate', 'Debate')}</span>
              <span style={{
                fontSize: '0.68rem',
                backgroundColor: !esGSL ? 'rgba(255, 255, 255, 0.25)' : '#1f1f23',
                color: !esGSL ? '#ffffff' : '#71717a',
                padding: '0.05rem 0.35rem',
                borderRadius: '9999px',
                fontWeight: '700'
              }}>
                {oradoresCaucus.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y FILTROS RÁPIDOS ─────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {/* Input Buscador */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '0.35rem 0.65rem',
          gap: '0.45rem'
        }}>
          <Search size={14} style={{ color: 'var(--muted-text)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder={esGSL ? t('timers.searchCountryGSLPlaceholder', 'Buscar país para añadir a GSL...') : t('timers.searchCountryDebatePlaceholder', 'Buscar país para añadir a Debate...')}
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={handleKeyDownBusqueda}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-color)',
              outline: 'none',
              fontSize: '0.82rem',
              width: '100%'
            }}
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted-text)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filtros rápidos de estado (Pills) */}
        {paises.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button
                type="button"
                onClick={() => setFiltroVista('TODOS')}
                style={{
                  padding: '0.15rem 0.5rem',
                  fontSize: '0.7rem',
                  borderRadius: '4px',
                  border: filtroVista === 'TODOS' ? '1px solid var(--border-color)' : '1px solid transparent',
                  backgroundColor: filtroVista === 'TODOS' ? 'var(--card-header-bg)' : 'transparent',
                  color: filtroVista === 'TODOS' ? 'var(--text-color)' : 'var(--muted-text)',
                  cursor: 'pointer',
                  fontWeight: filtroVista === 'TODOS' ? '700' : '500'
                }}
              >
                {t('common.all', 'Todos')} ({paises.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroVista('DISPONIBLES')}
                style={{
                  padding: '0.15rem 0.5rem',
                  fontSize: '0.7rem',
                  borderRadius: '4px',
                  border: filtroVista === 'DISPONIBLES' ? '1px solid #22c55e44' : '1px solid transparent',
                  backgroundColor: filtroVista === 'DISPONIBLES' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                  color: filtroVista === 'DISPONIBLES' ? '#22c55e' : 'var(--muted-text)',
                  cursor: 'pointer',
                  fontWeight: filtroVista === 'DISPONIBLES' ? '700' : '500'
                }}
              >
                {t('common.available', 'Disponibles')} ({cantDisponibles})
              </button>
              <button
                type="button"
                onClick={() => setFiltroVista('EN_LISTA')}
                style={{
                  padding: '0.15rem 0.5rem',
                  fontSize: '0.7rem',
                  borderRadius: '4px',
                  border: filtroVista === 'EN_LISTA' ? '1px solid var(--border-color)' : '1px solid transparent',
                  backgroundColor: filtroVista === 'EN_LISTA' ? 'var(--card-header-bg)' : 'transparent',
                  color: filtroVista === 'EN_LISTA' ? 'var(--text-color)' : 'var(--muted-text)',
                  cursor: 'pointer',
                  fontWeight: filtroVista === 'EN_LISTA' ? '700' : '500'
                }}
              >
                {t('timers.inList', 'En Lista')} ({cantEnLista})
              </button>
            </div>

            <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
              {esGSL ? t('timers.clickToAddGSL', 'Clic para añadir a GSL') : t('timers.clickToAddDebate', 'Clic para añadir a Debate')}
            </span>
          </div>
        )}
      </div>

      {/* ── GRID / LISTA DE PAÍSES ─────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingRight: '2px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}>
        {paises.length === 0 ? (
          /* Estado vacío si no hay delegaciones en la sesión */
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            padding: '1.5rem 1rem',
            backgroundColor: 'var(--card-header-bg)',
            border: '1px dashed var(--border-color)',
            borderRadius: '8px',
            maxWidth: '340px'
          }}>
            <Sparkles size={24} color="#a855f7" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.86rem', fontWeight: '700', color: 'var(--text-color)', marginBottom: '0.3rem' }}>
              {t('countries.noDelegationsLoaded', 'No hay delegaciones cargadas')}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)', marginBottom: '1rem', lineHeight: '1.35' }}>
              {t('countries.noDelegationsLoadedDesc', "Importa países desde el widget 'Importar Países' o carga una plantilla rápida:")}
            </div>
            <button
              type="button"
              onClick={() => setPaises(PRESETS_RAPIDOS[0].paises)}
              style={{
                backgroundColor: 'var(--btn-bg)',
                border: 'none',
                color: 'var(--btn-text)',
                fontSize: '0.76rem',
                fontWeight: '700',
                padding: '0.45rem 0.8rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Globe size={14} />
              <span>{t('countries.loadUNSC', 'Cargar Consejo de Seguridad (15)')}</span>
            </button>
          </div>
        ) : paisesFiltrados.length === 0 ? (
          /* Sin resultados de búsqueda */
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            padding: '2rem',
            color: 'var(--muted-text)',
            fontSize: '0.8rem'
          }}>
            No se encontraron países con "{busqueda}".
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '0.45rem',
            alignContent: 'start'
          }}>
            {paisesFiltrados.map((pais, idx) => {
              const infoEnLista = mapaEnLista.get(pais.nombre);
              const estaEnLista = !!infoEnLista;
              const posEnLista = infoEnLista?.index;
              const isDragging = draggedIndex === idx;
              const isDragOver = dragOverIndex === idx;

              return (
                <div
                  key={pais.id || pais.nombre}
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
                    const fromFilteredIndexStr = e.dataTransfer.getData('text/plain');
                    const fromFilteredIndex = parseInt(fromFilteredIndexStr, 10);
                    if (!isNaN(fromFilteredIndex) && fromFilteredIndex !== idx) {
                      const sourcePais = paisesFiltrados[fromFilteredIndex];
                      const targetPais = paisesFiltrados[idx];
                      if (sourcePais && targetPais) {
                        const fromMasterIndex = paises.findIndex(p => p.nombre === sourcePais.nombre);
                        const toMasterIndex = paises.findIndex(p => p.nombre === targetPais.nombre);
                        if (fromMasterIndex !== -1 && toMasterIndex !== -1) {
                          reordenarPaises(fromMasterIndex, toMasterIndex);
                        }
                      }
                    }
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onClick={() => handleTogglePais(pais)}
                  title={estaEnLista ? `${pais.nombre} (En lista #${posEnLista}) - Clic para retirar` : `${pais.nombre} - Clic para añadir a ${esGSL ? 'Lista General' : 'Debate'} (Arrastra para reordenar)`}
                  style={{
                    position: 'relative',
                    padding: '0.5rem 0.6rem',
                    borderRadius: '7px',
                    cursor: 'grab',
                    userSelect: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.4rem',
                    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: isDragging
                      ? (esGSL ? 'rgba(168, 85, 247, 0.2)' : 'rgba(249, 115, 22, 0.2)')
                      : (estaEnLista ? 'var(--card-header-bg)' : 'var(--panel-color)'),
                    border: isDragOver
                      ? `2px dashed ${esGSL ? '#a855f7' : '#f97316'}`
                      : (estaEnLista ? '1px solid var(--subborder-color)' : '1px solid var(--border-color)'),
                    opacity: isDragging ? 0.4 : (estaEnLista ? 0.55 : 1),
                    filter: estaEnLista ? 'grayscale(70%)' : 'none',
                    transform: 'translateZ(0)'
                  }}
                  onMouseEnter={e => {
                    if (!estaEnLista) {
                      e.currentTarget.style.borderColor = esGSL ? '#a855f7' : '#f97316';
                      e.currentTarget.style.backgroundColor = esGSL ? 'rgba(168, 85, 247, 0.12)' : 'rgba(249, 115, 22, 0.12)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    } else {
                      e.currentTarget.style.opacity = '0.85';
                      e.currentTarget.style.borderColor = '#ef444466';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!estaEnLista) {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.backgroundColor = 'var(--panel-color)';
                      e.currentTarget.style.transform = 'translateY(0px)';
                    } else {
                      e.currentTarget.style.opacity = '0.55';
                      e.currentTarget.style.borderColor = 'var(--subborder-color)';
                    }
                  }}
                >
                  {/* Bandera y Nombre */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0, flex: 1 }}>
                    <CountryFlag bandera={pais.bandera} nombre={pais.nombre} size="sm" />
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: estaEnLista ? '500' : '700',
                      color: estaEnLista ? 'var(--muted-text)' : 'var(--text-color)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {pais.nombre}
                    </span>
                    {pais.veto && (
                      <Crown size={11} color="#eab308" style={{ flexShrink: 0 }} title="Miembro Permanente (P5)" />
                    )}
                  </div>

                  {/* Badge de Estado: Posición / Check si está en cola, Plus si disponible */}
                  <div style={{ flexShrink: 0 }}>
                    {estaEnLista ? (
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: '800',
                        backgroundColor: '#27272a',
                        color: '#a1a1aa',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        #{posEnLista}
                      </span>
                    ) : (
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#71717a'
                      }}>
                        <Plus size={11} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FOOTER RESUMEN ──────────────────────────────────────────────────── */}
      {paises.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '0.4rem',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.72rem',
          color: '#71717a'
        }}>
          <span>
            Destino: <strong style={{ color: esGSL ? '#c084fc' : '#fb923c' }}>{esGSL ? 'Lista General' : 'Debate'}</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: cantEnLista > 0 ? '#22c55e' : '#52525b'
            }} />
            {cantEnLista} en cola activa
          </span>
        </div>
      )}
    </div>
  );
};

export default AnadirPaises;
