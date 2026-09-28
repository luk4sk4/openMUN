import React from 'react';
import {
  Inbox,
  X,
  Check,
  FilePlus,
  FileMinus,
  Edit3,
  Quote
} from 'lucide-react';
import CountryFlag from '../../common/CountryFlag';

/**
 * Modal para el buzón telemático de propuestas de enmienda recibidas vía P2P
 * desde las pantallas de los delegados en sala.
 */
const BuzonPropuestasModal = ({
  isOpen,
  onClose,
  propuestas = [],
  paises = [],
  onAprobarPropuesta,
  onRechazarPropuesta
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(5px)',
      zIndex: 140,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--panel-color)',
        border: '1px solid var(--subborder-color)',
        borderRadius: '12px',
        padding: '1.25rem',
        width: '100%',
        maxWidth: '540px',
        maxHeight: '90%',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        boxShadow: '0 20px 48px rgba(0,0,0,0.65)'
      }}>
        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--subborder-color)', paddingBottom: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', fontWeight: '800' }}>
            <Inbox size={18} color="#a855f7" />
            <span>Buzón de Propuestas Telemáticas de Delegados ({propuestas.length})</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer', padding: '0.2rem' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Lista de propuestas */}
        {propuestas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--muted-text)', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <Inbox size={32} style={{ opacity: 0.4 }} />
            <div>No hay propuestas pendientes de delegados en este momento.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {propuestas.map(prop => {
              const pObj = (paises || []).find(
                p => p.nombre?.toLowerCase() === prop.paisProponente?.toLowerCase()
              );
              const esAdicion = prop.tipo === 'adicion';
              const esSupresion = prop.tipo === 'supresion';

              return (
                <div
                  key={prop.id}
                  style={{
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CountryFlag country={pObj} bandera={pObj?.bandera} nombre={prop.paisProponente} size="xs" />
                      <span style={{ fontSize: '0.8rem', fontWeight: '800' }}>{prop.paisProponente || 'Delegación'}</span>
                      <span style={{
                        fontSize: '0.64rem',
                        fontWeight: '800',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        backgroundColor: esAdicion ? 'rgba(34, 197, 94, 0.2)' : esSupresion ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        color: esAdicion ? '#22c55e' : esSupresion ? '#ef4444' : '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}>
                        {esAdicion && <FilePlus size={11} />}
                        {esSupresion && <FileMinus size={11} />}
                        {!esAdicion && !esSupresion && <Edit3 size={11} />}
                        <span>{prop.tipo?.toUpperCase()}</span>
                      </span>
                    </div>

                    {prop.articuloNumero && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)', fontWeight: '700' }}>
                        {prop.articuloNumero}
                      </span>
                    )}
                  </div>

                  {prop.textoOriginal && (
                    <div style={{
                      fontSize: '0.72rem',
                      color: '#ef4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      padding: '0.3rem 0.5rem',
                      borderRadius: '4px',
                      textDecoration: 'line-through'
                    }}>
                      {prop.textoOriginal}
                    </div>
                  )}

                  {prop.textoPropuesto && (
                    <div style={{
                      fontSize: '0.74rem',
                      color: '#22c55e',
                      backgroundColor: 'rgba(34, 197, 94, 0.08)',
                      padding: '0.3rem 0.5rem',
                      borderRadius: '4px',
                      fontWeight: '600'
                    }}>
                      + {prop.textoPropuesto}
                    </div>
                  )}

                  {prop.justificacion && (
                    <div style={{
                      fontSize: '0.68rem',
                      color: 'var(--muted-text)',
                      fontStyle: 'italic',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <Quote size={10} style={{ opacity: 0.6 }} />
                      <span>{prop.justificacion}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                    <button
                      onClick={() => onRechazarPropuesta && onRechazarPropuesta(prop.id)}
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        borderRadius: '4px',
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Descartar
                    </button>

                    <button
                      onClick={() => onAprobarPropuesta && onAprobarPropuesta(prop)}
                      style={{
                        backgroundColor: '#16a34a',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '4px',
                        padding: '0.25rem 0.7rem',
                        fontSize: '0.7rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Check size={12} />
                      <span>Aprobar e Incorporar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuzonPropuestasModal;
