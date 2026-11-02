import i18n from '../../../languages/index.js';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Wand2,
  ArrowUp,
  ArrowDown,
  Scissors,
  Link2,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { reconstruirTextoResolucion } from '../../../utils/resolutionUtils';

/**
 * Configurador y segmentador manual de apartados de la resolución.
 * Permite reclasificar qué apartados son preámbulo o cláusulas operativas,
 * reordenar párrafos, dividir o fusionar cláusulas y añadir nuevos apartados.
 */
const ConfiguradorApartadosModal = ({
  isOpen,
  onClose,
  articulos = [],
  tituloResolucion = '',
  onGuardar,
  isLight = false
}) => {
  const { t } = useTranslation();
  const [apartados, setApartados] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setApartados((articulos || []).map((art, idx) => ({
        ...art,
        id: art.id || `manual_apartado_${Date.now()}_${idx}`
      })));
    }
  }, [isOpen, articulos]);

  if (!isOpen) return null;

  const inputBgColor = isLight ? '#ffffff' : '#1e293b';
  const inputBorderColor = isLight ? 'var(--subborder-color)' : '#334155';

  const handleToggleTipo = (id) => {
    setApartados(prev => prev.map(ap => {
      if (ap.id !== id) return ap;
      const nuevoEsPreambulo = !ap.esPreambulo;
      return {
        ...ap,
        esPreambulo: nuevoEsPreambulo,
        prefijo: nuevoEsPreambulo ? i18n.t('ui.preambleBackground') : t('ui.article2', { v0: ap.numero || 1 })
      };
    }));
  };

  const handleUpdate = (id, campo, valor) => {
    setApartados(prev => prev.map(ap => (ap.id === id ? { ...ap, [campo]: valor } : ap)));
  };

  const handleDividir = (id) => {
    setApartados(prev => {
      const idx = prev.findIndex(a => a.id === id);
      if (idx === -1) return prev;
      const actual = prev[idx];
      const lineas = (actual.texto || '').split(/\n/);
      const mitad = Math.max(1, Math.floor(lineas.length / 2));
      const parte1 = lineas.slice(0, mitad).join('\n').trim();
      const parte2 = lineas.slice(mitad).join('\n').trim() || i18n.t('ui.newClause');

      const ap1 = { ...actual, texto: parte1 };
      const ap2 = {
        id: `manual_apartado_${Date.now()}_split`,
        esPreambulo: actual.esPreambulo,
        numero: (actual.numero || 1) + 1,
        prefijo: actual.esPreambulo ? i18n.t('ui.preambleBackground') : t('ui.article2', { v0: (actual.numero || 1) + 1 }),
        texto: parte2
      };

      const copia = [...prev];
      copia.splice(idx, 1, ap1, ap2);
      return copia;
    });
  };

  const handleUnir = (index) => {
    setApartados(prev => {
      if (index >= prev.length - 1) return prev;
      const act = prev[index];
      const sig = prev[index + 1];
      const fusionado = {
        ...act,
        texto: `${(act.texto || '').trim()}\n\n${(sig.texto || '').trim()}`
      };
      const copia = [...prev];
      copia.splice(index, 2, fusionado);
      return copia;
    });
  };

  const handleMover = (index, direccion) => {
    setApartados(prev => {
      const target = index + direccion;
      if (target < 0 || target >= prev.length) return prev;
      const copia = [...prev];
      const [item] = copia.splice(index, 1);
      copia.splice(target, 0, item);
      return copia;
    });
  };

  const handleEliminar = (id) => {
    setApartados(prev => prev.filter(a => a.id !== id));
  };

  const handleAnadir = () => {
    const num = apartados.filter(a => !a.esPreambulo).length + 1;
    const nuevo = {
      id: `manual_apartado_${Date.now()}_nuevo`,
      esPreambulo: false,
      numero: num,
      prefijo: t('ui.article2', { v0: num }),
      texto: ''
    };
    setApartados(prev => [...prev, nuevo]);
  };

  const handleGuardarDefinitivo = () => {
    if (apartados.length === 0) {
      alert(t('ui.defineAtLeastOneSectionToSaveTheResolution'));
      return;
    }

    let contadorOperativo = 1;
    const apartadosNormalizados = apartados.map(ap => {
      if (ap.esPreambulo) {
        return { ...ap, numero: 0, prefijo: i18n.t('ui.preambleBackground') };
      }
      const num = contadorOperativo++;
      return {
        ...ap,
        numero: num,
        prefijo: ap.prefijo?.trim() || t('ui.article2', { v0: num })
      };
    });

    const textoReconstruido = reconstruirTextoResolucion(apartadosNormalizados);
    if (onGuardar) {
      onGuardar(apartadosNormalizados, textoReconstruido);
    }
    onClose();
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(5px)',
      zIndex: 150,
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
        maxHeight: '92%',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        boxShadow: '0 20px 48px rgba(0,0,0,0.7)'
      }}>
        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--subborder-color)', paddingBottom: '0.6rem' }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={18} style={{ color: 'var(--accent-color)' }} />
              <span>{t('ui.sectionConfigurationAndOrdering')}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '0.15rem' }}>
              {t('ui.reclassifyPreambleAndArticlesSplitOrMergeClausesWithFull')}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer', padding: '0.2rem' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Acciones de la barra */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted-text)' }}>
            {t('ui.totalSections')} {apartados.length} ({apartados.filter(a => a.esPreambulo).length} {t('ui.preambulatory')} {apartados.filter(a => !a.esPreambulo).length} {t('ui.operative')}
          </div>
          <button
            type="button"
            onClick={handleAnadir}
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              color: '#3b82f6',
              padding: '0.3rem 0.65rem',
              borderRadius: '5px',
              fontSize: '0.72rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <Plus size={13} /> {t('ui.addSection')}
          </button>
        </div>

        {/* Lista de tarjetas de apartados editables */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {apartados.map((ap, idx) => {
            const esPreambulo = ap.esPreambulo;
            return (
              <div
                key={ap.id}
                style={{
                  backgroundColor: 'var(--card-header-bg)',
                  border: `1px solid ${esPreambulo ? 'rgba(168, 85, 247, 0.35)' : 'rgba(59, 130, 246, 0.35)'}`,
                  borderLeft: `4px solid ${esPreambulo ? '#a855f7' : '#3b82f6'}`,
                  borderRadius: '8px',
                  padding: '0.65rem 0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleTipo(ap.id)}
                      title={t('ui.switchBetweenPreambleAndOperativeArticle')}
                      style={{
                        backgroundColor: esPreambulo ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        border: `1px solid ${esPreambulo ? '#a855f7' : '#3b82f6'}`,
                        color: esPreambulo ? '#c084fc' : '#60a5fa',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Wand2 size={11} /> {esPreambulo ? t('ui.preamble2') : t('ui.operativeArticle')} ⇄
                    </button>

                    <input
                      type="text"
                      value={ap.prefijo || ''}
                      onChange={e => handleUpdate(ap.id, 'prefijo', e.target.value)}
                      placeholder={esPreambulo ? t('ui.preamble2') : t('ui.article2', { v0: idx + 1 })}
                      style={{
                        padding: '0.2rem 0.45rem',
                        backgroundColor: inputBgColor,
                        border: `1px solid ${inputBorderColor}`,
                        borderRadius: '4px',
                        color: 'var(--text-color)',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        width: '150px'
                      }}
                    />
                  </div>

                  {/* Acciones de reordenación, división y borrado */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => handleMover(idx, -1)}
                      disabled={idx === 0}
                      title={t('agenda.moveUp')}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid var(--subborder-color)',
                        color: idx === 0 ? 'var(--muted-text)' : 'var(--text-color)',
                        padding: '0.2rem 0.35rem',
                        borderRadius: '3px',
                        cursor: idx === 0 ? 'default' : 'pointer'
                      }}
                    >
                      <ArrowUp size={12} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMover(idx, 1)}
                      disabled={idx === apartados.length - 1}
                      title={t('agenda.moveDown')}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid var(--subborder-color)',
                        color: idx === apartados.length - 1 ? 'var(--muted-text)' : 'var(--text-color)',
                        padding: '0.2rem 0.35rem',
                        borderRadius: '3px',
                        cursor: idx === apartados.length - 1 ? 'default' : 'pointer'
                      }}
                    >
                      <ArrowDown size={12} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDividir(ap.id)}
                      title={t('ui.splitThisParagraphInTwo')}
                      style={{
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        color: '#3b82f6',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '3px',
                        fontSize: '0.66rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}
                    >
                      <Scissors size={11} /> {t('ui.split')}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUnir(idx)}
                      disabled={idx === apartados.length - 1}
                      title={t('ui.mergeWithNext')}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid var(--subborder-color)',
                        color: idx === apartados.length - 1 ? 'var(--muted-text)' : 'var(--text-color)',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '3px',
                        fontSize: '0.66rem',
                        fontWeight: '600',
                        cursor: idx === apartados.length - 1 ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}
                    >
                      <Link2 size={11} /> {t('ui.merge')}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEliminar(ap.id)}
                      title={t('ui.deleteSection')}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        padding: '0.2rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <textarea
                  value={ap.texto}
                  onChange={e => handleUpdate(ap.id, 'texto', e.target.value)}
                  rows={Math.min(6, Math.max(2, (ap.texto || '').split('\n').length))}
                  style={{
                    width: '100%',
                    padding: '0.45rem',
                    backgroundColor: inputBgColor,
                    border: `1px solid ${inputBorderColor}`,
                    borderRadius: '5px',
                    color: 'var(--text-color)',
                    fontSize: '0.76rem',
                    lineHeight: 1.4,
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                  placeholder={esPreambulo ? t('ui.preambulatoryClauseText') : t('ui.operativeClauseText2')}
                />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--subborder-color)', paddingTop: '0.6rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.45rem 0.85rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--subborder-color)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              fontSize: '0.74rem',
              cursor: 'pointer'
            }}
          >
            {t('toast.cancelBtn')}
          </button>
          <button
            type="button"
            onClick={handleGuardarDefinitivo}
            style={{
              padding: '0.45rem 1rem',
              backgroundColor: '#16a34a',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '0.74rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
            }}
          >
            <Check size={14} /> {t('ui.saveAndApplyResolution')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfiguradorApartadosModal;
