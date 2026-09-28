import React, { useState, useEffect } from 'react';
import {
  X,
  FilePlus,
  FileMinus,
  Edit3,
  Sparkles,
  Info,
  Check
} from 'lucide-react';
import CountryFlag from '../../common/CountryFlag';

/**
 * Modal interactivo para registrar nuevas mociones de enmienda.
 * Incluye selección visual de la naturaleza (adición, supresión, modificación),
 * delegación proponente con bandera y previsualización diff en tiempo real.
 */
const ProponerEnmiendaModal = ({
  isOpen,
  onClose,
  onSubmit,
  articulos = [],
  paisesAsistentes = [],
  paises = [],
  initialArticuloId = null,
  initialTextoOriginal = '',
  isLight = false
}) => {
  const [tipoEnmienda, setTipoEnmienda] = useState('modificacion');
  const [selectedArticuloId, setSelectedArticuloId] = useState(initialArticuloId || null);
  const [paisProponente, setPaisProponente] = useState('');
  const [textoOriginal, setTextoOriginal] = useState(initialTextoOriginal || '');
  const [textoPropuesto, setTextoPropuesto] = useState('');
  const [justificacion, setJustificacion] = useState('');

  // Sincronizar estado inicial al abrir
  useEffect(() => {
    if (isOpen) {
      setSelectedArticuloId(initialArticuloId || null);
      if (initialTextoOriginal) {
        setTextoOriginal(initialTextoOriginal);
        setTipoEnmienda('modificacion');
      } else if (initialArticuloId) {
        const art = articulos.find(a => a.id === initialArticuloId);
        setTextoOriginal(art ? art.texto : '');
      } else {
        setTextoOriginal('');
      }
      setTextoPropuesto('');
      setJustificacion('');

      if (paisesAsistentes.length > 0 && !paisProponente) {
        setPaisProponente(paisesAsistentes[0].nombre);
      }
    }
  }, [isOpen, initialArticuloId, initialTextoOriginal, articulos, paisesAsistentes]);

  if (!isOpen) return null;

  const inputBgColor = isLight ? '#ffffff' : '#1e293b';
  const inputBorderColor = isLight ? 'var(--subborder-color)' : '#334155';
  const optionBgColor = isLight ? '#ffffff' : '#1e293b';
  const optionTextColor = isLight ? '#0f172a' : '#f8fafc';

  const paisObj = (paises || []).find(p => p.nombre?.toLowerCase() === paisProponente?.toLowerCase());
  const artTarget = articulos.find(a => a.id === selectedArticuloId);

  const handleCambiarTipo = (nuevoTipo) => {
    setTipoEnmienda(nuevoTipo);
    if (nuevoTipo !== 'adicion' && selectedArticuloId && !textoOriginal) {
      const art = articulos.find(a => a.id === selectedArticuloId);
      if (art) {
        setTextoOriginal(art.texto);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tipoEnmienda !== 'supresion' && !textoPropuesto.trim()) {
      alert('Por favor escribe el texto propuesto para la enmienda.');
      return;
    }
    if (tipoEnmienda === 'supresion' && !textoOriginal.trim() && !artTarget) {
      alert('Debes indicar qué texto o cláusula se propone suprimir.');
      return;
    }

    const num = artTarget ? artTarget.numero : (articulos.filter(a => !a.esPreambulo).length + 1);

    onSubmit({
      tipo: tipoEnmienda,
      articuloId: selectedArticuloId || null,
      articuloNumero: artTarget ? (artTarget.prefijo || `Artículo ${artTarget.numero}`) : `Nuevo Artículo ${num}`,
      paisProponente: paisProponente.trim() || 'Delegación',
      textoOriginal: textoOriginal.trim(),
      textoPropuesto: textoPropuesto.trim(),
      justificacion: justificacion.trim()
    });

    onClose();
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
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
        maxWidth: '680px',
        maxHeight: '94%',
        overflowY: 'auto',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        boxShadow: '0 20px 48px rgba(0,0,0,0.65)'
      }}>
        {/* Cabecera del modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', fontWeight: '800' }}>
            <FilePlus size={18} color="#3b82f6" />
            <span>Proponer Enmienda a la Resolución</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-text)',
              cursor: 'pointer',
              padding: '0.2rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Selector de Naturaleza de la Enmienda */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.35rem' }}>
              Naturaleza de la Moción:
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.4rem'
            }}>
              <button
                type="button"
                onClick={() => handleCambiarTipo('adicion')}
                style={{
                  padding: '0.45rem 0.3rem',
                  borderRadius: '6px',
                  border: `1px solid ${tipoEnmienda === 'adicion' ? '#22c55e' : 'var(--subborder-color)'}`,
                  backgroundColor: tipoEnmienda === 'adicion' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                  color: tipoEnmienda === 'adicion' ? '#22c55e' : 'var(--text-color)',
                  fontWeight: '700',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem'
                }}
              >
                <FilePlus size={13} />
                <span>Adición</span>
              </button>

              <button
                type="button"
                onClick={() => handleCambiarTipo('supresion')}
                style={{
                  padding: '0.45rem 0.3rem',
                  borderRadius: '6px',
                  border: `1px solid ${tipoEnmienda === 'supresion' ? '#ef4444' : 'var(--subborder-color)'}`,
                  backgroundColor: tipoEnmienda === 'supresion' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                  color: tipoEnmienda === 'supresion' ? '#ef4444' : 'var(--text-color)',
                  fontWeight: '700',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem'
                }}
              >
                <FileMinus size={13} />
                <span>Supresión</span>
              </button>

              <button
                type="button"
                onClick={() => handleCambiarTipo('modificacion')}
                style={{
                  padding: '0.45rem 0.3rem',
                  borderRadius: '6px',
                  border: `1px solid ${tipoEnmienda === 'modificacion' ? '#3b82f6' : 'var(--subborder-color)'}`,
                  backgroundColor: tipoEnmienda === 'modificacion' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: tipoEnmienda === 'modificacion' ? '#3b82f6' : 'var(--text-color)',
                  fontWeight: '700',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem'
                }}
              >
                <Edit3 size={13} />
                <span>Modificación</span>
              </button>
            </div>
          </div>

          {/* Selector de Apartado Objetivo */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.25rem' }}>
              Cláusula / Apartado Objetivo:
            </label>
            <select
              value={selectedArticuloId || ''}
              onChange={e => {
                const val = e.target.value || null;
                setSelectedArticuloId(val);
                const art = articulos.find(a => a.id === val);
                if (art && tipoEnmienda !== 'adicion') {
                  setTextoOriginal(art.texto);
                } else if (!val && tipoEnmienda !== 'adicion') {
                  setTextoOriginal('');
                }
              }}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                backgroundColor: inputBgColor,
                border: `1px solid ${inputBorderColor}`,
                borderRadius: '6px',
                color: 'var(--text-color)',
                fontSize: '0.78rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="" style={{ backgroundColor: optionBgColor, color: optionTextColor }}>
                -- Cláusula General / Añadir al Final de la Resolución --
              </option>
              {articulos.map(art => (
                <option key={art.id} value={art.id} style={{ backgroundColor: optionBgColor, color: optionTextColor }}>
                  {art.prefijo || `Artículo ${art.numero}`} - {art.texto.substring(0, 90)}{art.texto.length > 90 ? '...' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Delegación Proponente con Bandera */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.25rem' }}>
              Delegación Proponente:
            </label>
            {paisesAsistentes.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CountryFlag country={paisObj} bandera={paisObj?.bandera} nombre={paisProponente} size="sm" />
                <select
                  value={paisProponente}
                  onChange={e => setPaisProponente(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.65rem',
                    backgroundColor: inputBgColor,
                    border: `1px solid ${inputBorderColor}`,
                    borderRadius: '6px',
                    color: 'var(--text-color)',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {paisesAsistentes.map(p => (
                    <option key={p.id} value={p.nombre} style={{ backgroundColor: optionBgColor, color: optionTextColor }}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <input
                type="text"
                value={paisProponente}
                onChange={e => setPaisProponente(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  backgroundColor: inputBgColor,
                  border: `1px solid ${inputBorderColor}`,
                  borderRadius: '6px',
                  color: 'var(--text-color)',
                  fontSize: '0.78rem',
                  outline: 'none'
                }}
                placeholder="Nombre de la delegación (ej. Francia)"
              />
            )}
          </div>

          {/* Campo Texto Original (para Supresión o Modificación) */}
          {(tipoEnmienda === 'supresion' || tipoEnmienda === 'modificacion') && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#ef4444' }}>
                  {tipoEnmienda === 'supresion' ? 'Texto o cláusula a suprimir:' : 'Texto original a reemplazar:'}
                </label>
                {artTarget && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)', fontStyle: 'italic' }}>
                    {artTarget.prefijo || `Artículo ${artTarget.numero}`}
                  </span>
                )}
              </div>
              <textarea
                value={textoOriginal}
                onChange={e => setTextoOriginal(e.target.value)}
                rows={6}
                style={{
                  width: '100%',
                  minHeight: '130px',
                  maxHeight: '280px',
                  padding: '0.6rem 0.75rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: 'var(--text-color)',
                  fontSize: '0.82rem',
                  lineHeight: '1.45',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
                placeholder="Pega o escribe el fragmento a eliminar/modificar..."
              />
            </div>
          )}

          {/* Campo Texto Propuesto (para Adición o Modificación) */}
          {(tipoEnmienda === 'adicion' || tipoEnmienda === 'modificacion') && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#22c55e' }}>
                  {tipoEnmienda === 'adicion' ? 'Texto nuevo a añadir:' : 'Nueva redacción propuesta:'}
                </label>
                {tipoEnmienda === 'modificacion' && textoOriginal && (
                  <button
                    type="button"
                    onClick={() => setTextoPropuesto(textoOriginal)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#3b82f6',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      padding: '0.1rem 0.2rem',
                      textDecoration: 'underline'
                    }}
                    title="Copiar el texto original para editarlo directamente"
                  >
                    Copiar original a propuesta
                  </button>
                )}
              </div>
              <textarea
                value={textoPropuesto}
                onChange={e => setTextoPropuesto(e.target.value)}
                rows={6}
                required
                style={{
                  width: '100%',
                  minHeight: '130px',
                  maxHeight: '280px',
                  padding: '0.6rem 0.75rem',
                  backgroundColor: 'rgba(34, 197, 94, 0.05)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '6px',
                  color: 'var(--text-color)',
                  fontSize: '0.82rem',
                  lineHeight: '1.45',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
                placeholder="Escribe aquí la redacción propuesta..."
              />
            </div>
          )}

          {/* Motivación / Justificación */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.2rem' }}>
              Justificación / Motivación (Opcional):
            </label>
            <input
              type="text"
              value={justificacion}
              onChange={e => setJustificacion(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.6rem',
                backgroundColor: inputBgColor,
                border: `1px solid ${inputBorderColor}`,
                borderRadius: '6px',
                color: 'var(--text-color)',
                fontSize: '0.76rem',
                outline: 'none'
              }}
              placeholder="Ej. Armonización jurídica con las resoluciones de la AG"
            />
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: 'transparent',
                border: '1px solid var(--subborder-color)',
                borderRadius: '6px',
                color: 'var(--text-color)',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: 'var(--btn-bg)',
                border: 'none',
                borderRadius: '6px',
                color: 'var(--btn-text)',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem'
              }}
            >
              <Check size={13} />
              <span>Registrar Moción</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProponerEnmiendaModal;
