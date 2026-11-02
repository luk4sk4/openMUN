import React, { useState, useEffect } from 'react';
import { X, Download, FileJson } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../context/SessionContext';

const ExportSessionModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { descargarSesionJSON, nombreComite } = useSession();
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    if (isOpen) {
      const comiteClean = (nombreComite || 'openMUN').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const fecha = new Date().toISOString().slice(0, 10);
      setFileName(`sesion_${comiteClean}_${fecha}.json`);
    }
  }, [isOpen, nombreComite]);

  if (!isOpen) return null;

  const handleExport = (e) => {
    e.preventDefault();
    if (!fileName.trim()) return;
    descargarSesionJSON(fileName.trim());
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        style={{
          backgroundColor: 'var(--panel-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius, 6px)',
          width: '100%',
          maxWidth: '460px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          color: 'var(--text-color)',
          fontFamily: 'var(--font-family)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: '0.85rem 1.15rem',
            borderBottom: '1px solid var(--subborder-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card-header-bg)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileJson size={17} style={{ color: 'var(--accent-color)' }} />
            <h3
              id="export-modal-title"
              style={{
                margin: 0,
                fontSize: '0.95rem',
                fontWeight: '650',
                color: 'var(--text-color)'
              }}
            >
              {t('ui.exportSessionToJson')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('ui.closeDialog')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-text)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--border-radius, 6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--card-hover)';
              e.currentTarget.style.color = 'var(--text-color)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--muted-text)';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleExport} style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted-text)', marginBottom: '0.4rem', fontWeight: '500' }}>
              {t('ui.fileNameToExport')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder={t('ui.activeSessionJson')}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  color: 'var(--text-color)',
                  padding: '7px 10px',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-color)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                autoFocus
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '0.4rem', lineHeight: '1.4' }}>
              {t('ui.thisFileContainsACompleteCopyOfDelegationsSpeakersAgenda')}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.2rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius, 6px)',
                color: 'var(--text-color)',
                padding: '6px 14px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--card-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {t('toast.cancelBtn')}
            </button>
            <button
              type="submit"
              disabled={!fileName.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'var(--btn-bg)',
                color: 'var(--btn-text)',
                border: 'none',
                borderRadius: 'var(--border-radius, 6px)',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: fileName.trim() ? 'pointer' : 'not-allowed',
                opacity: fileName.trim() ? 1 : 0.45,
                transition: 'opacity 0.15s ease'
              }}
            >
              <Download size={14} />
              <span>{t('ui.downloadFile')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExportSessionModal;
