import React, { useState, useMemo } from 'react';
import { Search, Users, Timer, Check, Plus, X, Crown, Trash2, ArrowUpDown, GripVertical, Globe } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import { useTranslation } from 'react-i18next';
import './AnadirPaises.css';

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

const AnadirPaises = ({ fixedDestino = null }) => {
  const { t } = useTranslation();
  const {
    paises,
    setPaises,
    oradoresCola,
    agregarOrador,
    removerOrador,
    vaciarOradoresGSL,
    oradoresCaucus,
    agregarOradorCaucus,
    removerOradorCaucus,
    vaciarOradoresDebate,
    ordenarPaisesAlfabetico,
    reordenarPaises
  } = useSession();

  // Switch de destino: 'GSL' (Lista General) o 'DEBATE' (Debate / Caucus)
  const [destinoState, setDestino] = useState(fixedDestino || 'GSL');
  const destino = fixedDestino || destinoState;
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
    <div className="anadir-paises-container">
      {/* ── HEADER Y SWITCH SELECTOR ────────────────────────────────────────── */}
      <div className="anadir-paises-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h3 className="anadir-paises-title">
            {fixedDestino === 'GSL'
              ? t('sidebar.widgets.anadir_paises_gsl.title')
              : fixedDestino === 'DEBATE'
                ? t('sidebar.widgets.anadir_paises_debate.title')
                : t('ui.addCountries')}
          </h3>
        </div>

        <div className="anadir-paises-actions">
          {/* Botones de orden alfabético y vaciar */}
          <button
            type="button"
            onClick={ordenarPaisesAlfabetico}
            title={t('ui.sortCountriesAlphabeticallyAZ')}
            className="anadir-paises-util-btn"
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
            title={t('ui.removeAllSpeakersFrom', { v0: esGSL ? t('tabs.gsl') : t('sidebar.widgets.pizarra_mociones.category') })}
            className="anadir-paises-clear-btn"
          >
            <Trash2 size={12} />
            <span>{t('common.clearAll', 'Eliminar todos')}</span>
          </button>

          {/* Switch Destino: Lista General vs Debate (Selector de Cola) */}
          {!fixedDestino && (
            <div
              className="anadir-paises-queue-selector"
              role="tablist"
              aria-label={t('timers.queueSelector', 'Selector de cola de oradores')}
            >
              <button
                type="button"
                role="tab"
                id="queue-tab-gsl"
                aria-selected={esGSL}
                aria-controls="anadir-paises-grid"
                onClick={() => setDestino('GSL')}
                className={`anadir-paises-queue-btn ${esGSL ? 'is-active' : ''}`}
              >
                <Users size={13} />
                <span>{t('timers.generalList', 'Lista General')}</span>
                <span className="anadir-paises-queue-badge">
                  {oradoresCola.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                id="queue-tab-debate"
                aria-selected={!esGSL}
                aria-controls="anadir-paises-grid"
                onClick={() => setDestino('DEBATE')}
                className={`anadir-paises-queue-btn ${!esGSL ? 'is-active' : ''}`}
              >
                <Timer size={13} />
                <span>{t('timers.debate', 'Debate')}</span>
                <span className="anadir-paises-queue-badge">
                  {oradoresCaucus.length}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y FILTROS RÁPIDOS ─────────────────────────────── */}
      <div className="anadir-paises-search-row">
        {/* Input Buscador */}
        <div className="anadir-paises-search-box">
          <Search size={14} style={{ color: 'var(--muted-text)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder={esGSL ? t('timers.searchCountryGSLPlaceholder', 'Buscar país para añadir a GSL...') : t('timers.searchCountryDebatePlaceholder', 'Buscar país para añadir a Debate...')}
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={handleKeyDownBusqueda}
            className="anadir-paises-search-input"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="anadir-paises-search-clear"
              title={t('common.clear', 'Limpiar')}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filtros rápidos de estado (Pills) */}
        {paises.length > 0 && (
          <div className="anadir-paises-filters-bar">
            <div className="anadir-paises-pills-group" role="group" aria-label={t('common.filters', 'Filtros')}>
              <button
                type="button"
                onClick={() => setFiltroVista('TODOS')}
                className={`anadir-paises-filter-pill ${filtroVista === 'TODOS' ? 'is-active' : ''}`}
                aria-pressed={filtroVista === 'TODOS'}
              >
                {t('common.all', 'Todos')} ({paises.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroVista('DISPONIBLES')}
                className={`anadir-paises-filter-pill ${filtroVista === 'DISPONIBLES' ? 'is-active is-success' : ''}`}
                aria-pressed={filtroVista === 'DISPONIBLES'}
              >
                {t('common.available', 'Disponibles')} ({cantDisponibles})
              </button>
              <button
                type="button"
                onClick={() => setFiltroVista('EN_LISTA')}
                className={`anadir-paises-filter-pill ${filtroVista === 'EN_LISTA' ? 'is-active' : ''}`}
                aria-pressed={filtroVista === 'EN_LISTA'}
              >
                {t('timers.inList', 'En Lista')} ({cantEnLista})
              </button>
            </div>

            <span className="anadir-paises-hint-text">
              {esGSL ? t('timers.clickToAddGSL', 'Clic para añadir a GSL') : t('timers.clickToAddDebate', 'Clic para añadir a Debate')}
            </span>
          </div>
        )}
      </div>

      {/* ── GRID / LISTA DE PAÍSES ─────────────────────────────────────────── */}
      <div id="anadir-paises-grid" className="anadir-paises-grid-scroll">
        {paises.length === 0 ? (
          /* Estado vacío si no hay delegaciones en la sesión */
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            padding: '1.5rem 1rem',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: 'var(--border-radius, 6px)',
            maxWidth: '340px'
          }}>
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
                borderRadius: 'var(--border-radius, 6px)',
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
            {t('ui.noCountriesFoundMatching')}{busqueda}".
          </div>
        ) : (
          <div className="anadir-paises-grid">
            {paisesFiltrados.map((pais, idx) => {
              const infoEnLista = mapaEnLista.get(pais.nombre);
              const estaEnLista = !!infoEnLista;
              const posEnLista = infoEnLista?.index;
              const isDragging = draggedIndex === idx;
              const isDragOver = dragOverIndex === idx;

              const cardClasses = [
                'anadir-paises-card',
                estaEnLista ? 'is-en-lista' : '',
                isDragging ? 'is-dragging' : '',
                isDragOver ? 'is-drag-over' : ''
              ].filter(Boolean).join(' ');

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
                  title={estaEnLista ? t('ui.onListClickToRemove', { v0: pais.nombre, v1: posEnLista }) : t('ui.clickToAddToDragToReorder', { v0: pais.nombre, v1: esGSL ? t('timers.generalList') : t('sidebar.widgets.pizarra_mociones.category') })}
                  className={cardClasses}
                >
                  {/* Bandera y Nombre */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0, flex: 1 }}>
                    <CountryFlag bandera={pais.bandera} nombre={pais.nombre} size="sm" />
                    <span className="anadir-paises-card-name">
                      {pais.nombre}
                    </span>
                    {pais.veto && (
                      <Crown size={12} color="var(--warning-color)" fill="var(--warning-color)" style={{ flexShrink: 0 }} title={t('ui.permanentMemberP5')} />
                    )}
                  </div>

                  {/* Badge de Estado: Posición si está en cola, Plus si disponible */}
                  <div style={{ flexShrink: 0 }}>
                    {estaEnLista ? (
                      <span className="anadir-paises-pos-badge">
                        #{posEnLista}
                      </span>
                    ) : (
                      <div className="anadir-paises-plus-circle">
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
        <div className="anadir-paises-footer">
          <span>
            {t('ui.destination')} <strong className="anadir-paises-footer-dest">{esGSL ? t('timers.generalList') : t('sidebar.widgets.pizarra_mociones.category')}</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className={`anadir-paises-status-indicator ${cantEnLista > 0 ? 'is-active' : ''}`} />
            <span>{cantEnLista} {t('ui.inActiveQueue')}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default AnadirPaises;
