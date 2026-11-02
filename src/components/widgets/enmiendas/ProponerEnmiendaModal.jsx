import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import {
  X,
  FilePlus,
  FileMinus,
  Edit3,

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
  const { t } = useTranslation();
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
      alert(t('ui.pleaseWriteTheProposedAmendmentText'));
      return;
    }
    if (tipoEnmienda === 'supresion' && !textoOriginal.trim() && !artTarget) {
      alert(t('ui.specifyTheTextOrClauseProposedForDeletion'));
      return;
    }

    const num = artTarget ? artTarget.numero : (articulos.filter(a => !a.esPreambulo).length + 1);

    onSubmit({
      tipo: tipoEnmienda,
      articuloId: selectedArticuloId || null,
      articuloNumero: artTarget ? (artTarget.prefijo || t('ui.article3', { v0: artTarget.numero })) : t('ui.newArticle', { v0: num }),
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
            <FilePlus size={18} style={{ color: 'var(--accent-color)' }} />
            <span>{t('ui.proposeAmendmentToResolution')}</span>
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
              {t('ui.natureOfMotion')}
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
                <span>{t('ui.addition2')}</span>
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
                <span>{t('ui.deletion2')}</span>
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
                <span>{t('ui.modification2')}</span>
              </button>
            </div>
          </div>

          {/* Selector de Apartado Objetivo */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.25rem' }}>
              {t('ui.targetClauseSection')}
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
                {t('ui.generalClauseAddAtEndOfResolution')}
              </option>
              {articulos.map(art => (
                <option key={art.id} value={art.id} style={{ backgroundColor: optionBgColor, color: optionTextColor }}>
                  {art.prefijo || t('ui.article3', { v0: art.numero })} - {art.texto.substring(0, 90)}{art.texto.length > 90 ? '...' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Delegación Proponente con Bandera */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.25rem' }}>
              {t('ui.proposingDelegation')}
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
                placeholder={t('ui.delegationNameEGFrance')}
              />
            )}
          </div>

          {/* Campo Texto Original (para Supresión o Modificación) */}
          {(tipoEnmienda === 'supresion' || tipoEnmienda === 'modificacion') && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#ef4444' }}>
                  {tipoEnmienda === 'supresion' ? t('ui.textOrClauseToDelete') : t('ui.originalTextToReplace')}
                </label>
                {artTarget && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)', fontStyle: 'italic' }}>
                    {artTarget.prefijo || t('ui.article3', { v0: artTarget.numero })}
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
                placeholder={t('ui.pasteOrTypeTheExcerptToDeleteModify')}
              />
            </div>
          )}

          {/* Campo Texto Propuesto (para Adición o Modificación) */}
          {(tipoEnmienda === 'adicion' || tipoEnmienda === 'modificacion') && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#22c55e' }}>
                  {tipoEnmienda === 'adicion' ? t('ui.newTextToAdd') : t('ui.proposedNewWording')}
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
                    title={t('ui.copyOriginalTextToEditItDirectly')}
                  >
                    {t('ui.copyOriginalToProposal')}
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
                placeholder={t('ui.writeTheProposedWordingHere')}
              />
            </div>
          )}

          {/* Motivación / Justificación */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)', display: 'block', marginBottom: '0.2rem' }}>
              {t('ui.justificationMotivationOptional')}
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
              placeholder={t('ui.eGLegalHarmonizationWithGaResolutions')}
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
              {t('toast.cancelBtn')}
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
              <span>{t('motions.addMotion')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProponerEnmiendaModal;
