import React, { useState, useRef, memo } from 'react';
import {
  Edit3,
  Trash2,
  Plus,
  Check,
  ChevronDown,
  ChevronRight,
  FilePlus,
  Sparkles,
  Scissors
} from 'lucide-react';
import EnmiendaCard from './EnmiendaCard';

/**
 * Componente interactivo para cada cláusula/artículo de la resolución.
 * Permite edición rápida inline, selección contextual de fragmentos de texto
 * para proponer enmiendas específicas y visualización colapsable de enmiendas vinculadas.
 */
const ArticuloItem = memo(({
  art,
  enmiendas = [],
  paises = [],
  onProponerEnmienda,
  onEditarArticulo,
  onEliminarArticulo,
  onVotarEnmienda,
  onResolverEnmienda,
  onEliminarEnmienda,
  isLight = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrefijo, setEditPrefijo] = useState(art.prefijo || '');
  const [editTexto, setEditTexto] = useState(art.texto || '');
  const [expandidoEnmiendas, setExpandidoEnmiendas] = useState(true);
  const [textoSeleccionadoLocal, setTextoSeleccionadoLocal] = useState('');
  const textContainerRef = useRef(null);

  // Capturar selección del ratón dentro del artículo
  const handleMouseUp = () => {
    if (typeof window === 'undefined') return;
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selStr = selection.toString().trim();
      // Asegurarnos que la selección pertenece a este artículo
      if (textContainerRef.current && textContainerRef.current.contains(selection.anchorNode)) {
        setTextoSeleccionadoLocal(selStr);
        return;
      }
    }
    setTextoSeleccionadoLocal('');
  };

  const handleStartEdit = () => {
    setEditPrefijo(art.prefijo || (art.esPreambulo ? 'Preámbulo' : `Artículo ${art.numero}.`));
    setEditTexto(art.texto || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (onEditarArticulo) {
      onEditarArticulo(art.id, editPrefijo, editTexto);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTexto(art.texto || '');
  };

  const inputBgColor = isLight ? '#ffffff' : '#1e293b';
  const inputBorderColor = isLight ? 'var(--subborder-color)' : '#334155';

  const enmiendasPendientes = enmiendas.filter(e => e.estado === 'pendiente').length;

  return (
    <div
      style={{
        backgroundColor: 'var(--card-header-bg)',
        border: `1px solid ${
          art.modificado
            ? 'rgba(34, 197, 94, 0.4)'
            : art.suprimido
              ? 'rgba(239, 68, 68, 0.4)'
              : 'var(--subborder-color)'
        }`,
        borderRadius: '8px',
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}
    >
      {/* ── BARRA SUPERIOR DEL ARTÍCULO ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {/* Badge del tipo de cláusula */}
          <span style={{
            fontSize: '0.74rem',
            fontWeight: '800',
            backgroundColor: art.esPreambulo ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
            color: art.esPreambulo ? '#c084fc' : '#60a5fa',
            padding: '0.15rem 0.5rem',
            borderRadius: '4px',
            border: `1px solid ${art.esPreambulo ? 'rgba(168, 85, 247, 0.35)' : 'rgba(59, 130, 246, 0.35)'}`
          }}>
            {art.prefijo || (art.esPreambulo ? 'Preámbulo' : `Artículo ${art.numero}`)}
          </span>

          {art.modificado && (
            <span style={{
              fontSize: '0.62rem',
              fontWeight: '800',
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              color: '#22c55e',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              padding: '0.1rem 0.4rem',
              borderRadius: '3px'
            }}>
              Modificado
            </span>
          )}

          {art.suprimido && (
            <span style={{
              fontSize: '0.62rem',
              fontWeight: '800',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '0.1rem 0.4rem',
              borderRadius: '3px'
            }}>
              Suprimido
            </span>
          )}

          {enmiendasPendientes > 0 && (
            <span style={{
              fontSize: '0.62rem',
              fontWeight: '800',
              backgroundColor: 'rgba(234, 179, 8, 0.15)',
              color: '#eab308',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              padding: '0.1rem 0.4rem',
              borderRadius: '3px'
            }}>
              {enmiendasPendientes} pendiente{enmiendasPendientes > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Acciones principales */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {!isEditing && (
            <>
              <button
                type="button"
                onClick={handleStartEdit}
                title="Editar directamente la redacción de este apartado"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--subborder-color)',
                  color: 'var(--text-color)',
                  padding: '0.25rem 0.45rem',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}
              >
                <Edit3 size={11} />
                <span>Editar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Seguro que deseas eliminar esta cláusula de la resolución?')) {
                    onEliminarArticulo && onEliminarArticulo(art.id);
                  }
                }}
                title="Eliminar este apartado"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--subborder-color)',
                  color: '#ef4444',
                  padding: '0.25rem 0.45rem',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Trash2 size={11} />
              </button>
            </>
          )}

          <button
            onClick={() => onProponerEnmienda && onProponerEnmienda(art.id, textoSeleccionadoLocal)}
            style={{
              backgroundColor: textoSeleccionadoLocal ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.15)',
              border: `1px solid ${textoSeleccionadoLocal ? '#10b981' : 'rgba(59, 130, 246, 0.35)'}`,
              color: textoSeleccionadoLocal ? '#10b981' : '#3b82f6',
              padding: '0.25rem 0.55rem',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={12} />
            <span>{textoSeleccionadoLocal ? 'Enmendar Selección' : 'Proponer Enmienda'}</span>
          </button>
        </div>
      </div>

      {/* ── CUERPO DE TEXTO O EDITOR INLINE ── */}
      {isEditing ? (
        <div style={{
          backgroundColor: 'var(--panel-bg)',
          padding: '0.65rem 0.75rem',
          borderRadius: '6px',
          border: '1px solid #3b82f6',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--muted-text)', minWidth: '85px' }}>
              Prefijo / Título:
            </label>
            <input
              type="text"
              value={editPrefijo}
              onChange={e => setEditPrefijo(e.target.value)}
              style={{
                flex: 1,
                padding: '0.25rem 0.5rem',
                backgroundColor: inputBgColor,
                border: `1px solid ${inputBorderColor}`,
                borderRadius: '4px',
                color: 'var(--text-color)',
                fontSize: '0.74rem'
              }}
              placeholder="Ej. Artículo 1. o Preámbulo"
            />
          </div>
          <textarea
            value={editTexto}
            onChange={e => setEditTexto(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: inputBgColor,
              border: `1px solid ${inputBorderColor}`,
              borderRadius: '4px',
              color: 'var(--text-color)',
              fontSize: '0.78rem',
              lineHeight: 1.45,
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={handleCancelEdit}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--subborder-color)',
                color: 'var(--muted-text)',
                padding: '0.25rem 0.55rem',
                borderRadius: '4px',
                fontSize: '0.7rem',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              style={{
                backgroundColor: '#16a34a',
                border: 'none',
                color: '#ffffff',
                padding: '0.25rem 0.65rem',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}
            >
              <Check size={12} /> Guardar Cambios
            </button>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div
            ref={textContainerRef}
            onMouseUp={handleMouseUp}
            style={{
              fontSize: '0.8rem',
              lineHeight: 1.55,
              color: 'var(--text-color)',
              backgroundColor: 'var(--panel-bg)',
              padding: '0.65rem 0.8rem',
              borderRadius: '6px',
              border: '1px solid var(--subborder-color)',
              whiteSpace: 'pre-wrap',
              userSelect: 'text',
              cursor: 'text'
            }}
          >
            {art.texto}
          </div>

          {/* Tooltip contextual si hay texto seleccionado con el ratón */}
          {textoSeleccionadoLocal && (
            <div style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              padding: '0.25rem 0.55rem',
              borderRadius: '4px',
              fontSize: '0.68rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              animation: 'fadeIn 0.2s ease'
            }}
            onClick={() => onProponerEnmienda && onProponerEnmienda(art.id, textoSeleccionadoLocal)}
            >
              <Scissors size={11} />
              <span>Enmendar "{textoSeleccionadoLocal.length > 25 ? textoSeleccionadoLocal.substring(0, 22) + '...' : textoSeleccionadoLocal}"</span>
            </div>
          )}
        </div>
      )}

      {/* ── SECCIÓN DE ENMIENDAS ASOCIADAS ── */}
      {enmiendas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.2rem' }}>
          <div
            onClick={() => setExpandidoEnmiendas(e => !e)}
            style={{
              fontSize: '0.68rem',
              fontWeight: '800',
              color: 'var(--muted-text)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            {expandidoEnmiendas ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <span>Mociones de Enmienda ({enmiendas.length})</span>
          </div>

          {expandidoEnmiendas && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingLeft: '0.25rem' }}>
              {enmiendas.map(enm => (
                <EnmiendaCard
                  key={enm.id}
                  enm={enm}
                  paises={paises}
                  articuloTexto={art.texto}
                  onVotar={onVotarEnmienda}
                  onResolver={onResolverEnmienda}
                  onEliminar={onEliminarEnmienda}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default ArticuloItem;
