import React, { useState } from 'react';
import { Search, Trash2, Plus, ArrowUpDown, GripVertical, Users, Mic } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import EmptyState from '../common/EmptyState';
import { useTranslation } from 'react-i18next';

const ListaOradores = () => {
  const { t } = useTranslation();
  const {
    paises,
    oradoresCola,
    agregarOrador,
    removerOrador,
    vaciarOradoresGSL,
    ordenarOradoresGSLAlfabetico,
    reordenarOradoresGSL
  } = useSession();

  const [busqueda, setBusqueda] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Filtrar lista de países disponibles que no estén en la cola
  const paisesDisponibles = paises.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
    !oradoresCola.some(o => o.nombre === p.nombre)
  );

  const handleSeleccionarPaisAñadir = (paisObj) => {
    agregarOrador(paisObj);
    setBusqueda('');
  };

  const handleVaciarLista = () => {
    if (oradoresCola.length === 0) return;
    vaciarOradoresGSL();
  };

  return (
    <div style={{
      position: 'relative',
      padding: '1rem',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      backgroundColor: 'var(--panel-color)',
      color: 'var(--text-color)',
      gap: '0.8rem'
    }}>
      {/* Header y Acción Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Users size={16} />
          <span>{t('timers.gslSpeakersList', 'Lista de Oradores GSL')} ({oradoresCola.length})</span>
        </h3>
        
        {/* Botones de acción masiva */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            type="button"
            onClick={ordenarOradoresGSLAlfabetico}
            disabled={oradoresCola.length <= 1}
            title="Ordenar lista alfabéticamente (A-Z)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.25rem 0.55rem',
              fontSize: '0.72rem',
              fontWeight: '600',
              borderRadius: '5px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-color)',
              cursor: oradoresCola.length <= 1 ? 'not-allowed' : 'pointer',
              opacity: oradoresCola.length <= 1 ? 0.4 : 1,
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowUpDown size={12} />
            <span>A-Z</span>
          </button>

          <button
            type="button"
            onClick={handleVaciarLista}
            disabled={oradoresCola.length === 0}
            title="Eliminar todos los oradores de la lista GSL"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.25rem 0.55rem',
              fontSize: '0.72rem',
              fontWeight: '600',
              borderRadius: '5px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#f87171',
              cursor: oradoresCola.length === 0 ? 'not-allowed' : 'pointer',
              opacity: oradoresCola.length === 0 ? 0.4 : 1,
              transition: 'all 0.15s ease'
            }}
          >
            <Trash2 size={12} />
            <span>{t('common.clearAll', 'Eliminar todos')}</span>
          </button>
        </div>
      </div>

      {/* Buscador / Añadir País */}
      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--card-header-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '0.35rem 0.6rem',
          gap: '0.4rem'
        }}>
          <Search size={15} style={{ opacity: 0.5 }} />
          <input
            type="text"
            placeholder={t('timers.addCountryQueuePlaceholder', 'Añadir país a la cola...')}
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-color)',
              outline: 'none',
              fontSize: '0.85rem',
              width: '100%'
            }}
          />
        </div>

        {/* Dropdown de sugerencias de búsqueda */}
        {busqueda.trim().length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            marginTop: '4px',
            maxHeight: '160px',
            overflowY: 'auto',
            zIndex: 10,
            boxShadow: '0 8px 20px rgba(0,0,0,0.35)'
          }}>
            {paisesDisponibles.length === 0 ? (
              <div style={{ padding: '0.5rem', fontSize: '0.8rem', opacity: 0.5, textAlign: 'center' }}>
                {t('countries.noMatchingResults', 'Sin resultados coincidentes')}
              </div>
            ) : (
              paisesDisponibles.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleSeleccionarPaisAñadir(p)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--subborder-color)',
                    color: 'var(--text-color)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--card-header-bg)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CountryFlag bandera={p.bandera} nombre={p.nombre} size="sm" />
                    <span>{p.nombre}</span>
                  </span>
                  <Plus size={14} style={{ opacity: 0.7 }} />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Lista Vertical de Oradores */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingRight: '2px' }}>
        {oradoresCola.length === 0 ? (
          <EmptyState
            icon={Mic}
            title={t('timers.emptyGslTitle', 'Sin oradores en lista')}
            description={t('timers.emptyGslQueue', 'La lista de oradores está vacía. Añade delegados desde el panel lateral o usa el buscador rápido.')}
            compact={true}
          />
        ) : (
          oradoresCola.map((orador, index) => {
            const esActual = index === 0;
            const esSiguiente = index === 1;
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;

            return (
              <div
                key={orador.id}
                className={esActual ? 'anim-speaker-turn' : ''}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', index.toString());
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggedIndex(index);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  if (draggedIndex !== index) {
                    setDragOverIndex(index);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverIndex === index) {
                    setDragOverIndex(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromIndexStr = e.dataTransfer.getData('text/plain');
                  const fromIndex = parseInt(fromIndexStr, 10);
                  if (!isNaN(fromIndex) && fromIndex !== index) {
                    reordenarOradoresGSL(fromIndex, index);
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
                  padding: '0.55rem 0.75rem',
                  backgroundColor: isDragging 
                    ? 'rgba(168, 85, 247, 0.15)' 
                    : (esActual ? 'rgba(34, 197, 94, 0.12)' : (esSiguiente ? 'rgba(59, 130, 246, 0.07)' : 'var(--card-header-bg)')),
                  border: isDragOver
                    ? '2px dashed #a855f7'
                    : `1px solid ${isDragging ? '#a855f7' : (esActual ? '#166534' : (esSiguiente ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-color)'))}`,
                  borderRadius: '6px',
                  opacity: isDragging ? 0.5 : 1,
                  cursor: 'grab',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <GripVertical size={14} style={{ color: '#71717a', cursor: 'grab', flexShrink: 0 }} title="Arrastrar para reordenar" />
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    color: esActual ? '#4ade80' : (esSiguiente ? '#60a5fa' : 'var(--muted-text)'),
                    width: '20px'
                  }}>
                    #{index + 1}
                  </span>
                  <CountryFlag bandera={orador.bandera} nombre={orador.nombre} size="md" />
                  <span style={{
                    fontWeight: esActual ? '800' : '600',
                    fontSize: esActual ? '0.95rem' : '0.85rem',
                    color: 'var(--text-color)'
                  }}>
                    {orador.nombre}
                  </span>
                  {esActual && (
                    <span style={{
                      fontSize: '0.65rem',
                      backgroundColor: '#15803d',
                      color: '#ffffff',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '3px',
                      fontWeight: '800'
                    }}>
                      {t('timers.speaking', 'HABLANDO')}
                    </span>
                  )}
                  {esSiguiente && (
                    <span style={{
                      fontSize: '0.65rem',
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      color: '#93c5fd',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '3px',
                      fontWeight: '700'
                    }}>
                      {t('timers.next', 'SIGUIENTE')}
                    </span>
                  )}
                </div>

                {/* Botón de acción: Quitar de la lista */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
                  <button
                    onClick={() => removerOrador(orador.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      opacity: 0.7,
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '4px'
                    }}
                    title="Quitar de la lista"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default ListaOradores;

