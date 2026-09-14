import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Check, Globe, X, UserPlus, Flame, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';

// Normalizar texto para búsqueda sin tildes ni mayúsculas
function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Modal rápido para buscar y añadir una delegación directamente al debate/cola activa.
 * Se invoca mediante el atajo Ctrl+A / Cmd+A.
 */
const QuickAddCountryModal = ({ isOpen, onClose, activeTab }) => {
  const { t } = useTranslation();
  const {
    paises,
    oradoresCola,
    oradoresCaucus,
    caucusActivo,
    agregarOrador,
    removerOrador,
    agregarOradorCaucus,
    removerOradorCaucus
  } = useSession();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Determinar el contexto de debate activo:
  // Si estamos en la pestaña GSL -> Añade a GSL
  // Si hay caucus activo o estamos en DEBATE -> Añade a Debate/Caucus
  // En cualquier otro caso -> Por defecto añade a Debate si hay caucus activo, o si no a GSL / Debate
  const isDebateContext = activeTab === 'DEBATE' || (caucusActivo?.activo && activeTab !== 'GSL');

  // Mapa de delegaciones en lista para comprobación O(1)
  const mapaEnLista = useMemo(() => {
    const map = new Map();
    if (isDebateContext) {
      oradoresCaucus.forEach((orador, idx) => {
        map.set(orador.nombre.toLowerCase(), { id: orador.id, index: idx + 1 });
      });
    } else {
      oradoresCola.forEach((orador, idx) => {
        map.set(orador.nombre.toLowerCase(), { id: orador.id, index: idx + 1 });
      });
    }
    return map;
  }, [isDebateContext, oradoresCaucus, oradoresCola]);

  // Filtrar países según consulta
  const paisesFiltrados = useMemo(() => {
    const q = normalizar(query);
    if (!q) {
      return paises;
    }
    return paises.filter(p => normalizar(p.nombre).includes(q));
  }, [paises, query]);

  // Enfocar input al abrir
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Mantener scroll visible en la lista al navegar con flechas
  useEffect(() => {
    if (listRef.current && listRef.current.children[selectedIndex]) {
      listRef.current.children[selectedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  const handleToggleCountry = (pais) => {
    if (!pais) return;
    const countryNameKey = pais.nombre.toLowerCase();
    const infoEnLista = mapaEnLista.get(countryNameKey);

    if (isDebateContext) {
      if (infoEnLista) {
        removerOradorCaucus(infoEnLista.id);
      } else {
        agregarOradorCaucus(pais);
      }
    } else {
      if (infoEnLista) {
        removerOrador(infoEnLista.id);
      } else {
        agregarOrador(pais);
      }
    }

    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < paisesFiltrados.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : Math.max(0, paisesFiltrados.length - 1)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (paisesFiltrados[selectedIndex]) {
        handleToggleCountry(paisesFiltrados[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  const targetName = isDebateContext
    ? (caucusActivo?.activo ? `${caucusActivo.tipo || t('common.debate', 'Debate')}` : t('tabs.debate', 'Debate / Caucus'))
    : t('tabs.gsl', 'Lista General de Oradores (GSL)');

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        paddingLeft: '1rem',
        paddingRight: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="anim-fade-scale"
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--panel-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh'
        }}
      >
        {/* Cabecera / Buscador */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.85rem 1.1rem',
            borderBottom: '1px solid var(--subborder-color)',
            gap: '0.75rem',
            backgroundColor: 'var(--card-header-bg)'
          }}
        >
          <Search size={18} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('quickAddCountry.placeholder', 'Buscar país para añadir al debate...')}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-color)',
              fontSize: '0.95rem',
              fontFamily: 'inherit'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span
              style={{
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--muted-text)',
                border: '1px solid var(--subborder-color)',
                fontWeight: '600'
              }}
            >
              ESC
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted-text)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Indicador de Destino Activo */}
        <div
          style={{
            padding: '0.45rem 1.1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid var(--subborder-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--muted-text)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-color)' }}></span>
            <span>{t('quickAddCountry.target', 'Añadiendo a:')} <strong>{targetName}</strong></span>
          </div>
          <span>{paisesFiltrados.length} {t('common.countries', 'países')}</span>
        </div>

        {/* Lista de Resultados */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem'
          }}
        >
          {paisesFiltrados.length === 0 ? (
            <div
              style={{
                padding: '2.5rem 1rem',
                textAlign: 'center',
                color: 'var(--muted-text)',
                fontSize: '0.85rem'
              }}
            >
              <Globe size={32} style={{ margin: '0 auto 0.75rem auto', opacity: 0.3 }} />
              <div>{t('quickAddCountry.noResults', 'No se encontraron países')}</div>
              {query && <div style={{ fontSize: '0.78rem', marginTop: '0.3rem', opacity: 0.7 }}>"{query}"</div>}
            </div>
          ) : (
            paisesFiltrados.map((pais, index) => {
              const isSelected = index === selectedIndex;
              const enListaInfo = mapaEnLista.get(pais.nombre.toLowerCase());
              const estaEnLista = Boolean(enListaInfo);

              return (
                <div
                  key={pais.id || pais.nombre}
                  onClick={() => handleToggleCountry(pais)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.8rem',
                    borderRadius: '8px',
                    backgroundColor: isSelected
                      ? 'rgba(59, 130, 246, 0.12)'
                      : estaEnLista
                        ? 'rgba(255, 255, 255, 0.03)'
                        : 'transparent',
                    border: isSelected
                      ? '1px solid rgba(59, 130, 246, 0.3)'
                      : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <CountryFlag country={pais} size="sm" shape="rect" />
                    <span
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: estaEnLista ? '700' : '500',
                        color: estaEnLista ? 'var(--primary-color)' : 'var(--text-color)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {pais.nombre}
                    </span>
                    {pais.estatus && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: pais.estatus === 'Presente y Votando' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                          color: 'var(--muted-text)'
                        }}
                      >
                        {pais.estatus}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {estaEnLista ? (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(34, 197, 94, 0.15)',
                          color: '#22c55e',
                          fontWeight: '600'
                        }}
                      >
                        <Check size={12} />
                        #{enListaInfo.index}
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          color: isSelected ? 'var(--primary-color)' : 'var(--muted-text)',
                          fontWeight: '500'
                        }}
                      >
                        <Plus size={12} />
                        {t('common.add', 'Añadir')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer con Consejos y Teclas de Navegación */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.55rem 1rem',
            borderTop: '1px solid var(--subborder-color)',
            backgroundColor: 'var(--card-header-bg)',
            fontSize: '0.72rem',
            color: 'var(--muted-text)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)' }}>↑↓</kbd> Navegar</span>
            <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)' }}>↵</kbd> Añadir / Retirar</span>
          </div>
          <span>
            <kbd style={{ padding: '1px 5px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', fontWeight: '600' }}>A</kbd>
          </span>
        </div>
      </div>
    </div>
  );
};

export default QuickAddCountryModal;
