import React, { useState, useEffect } from 'react';
import { X, Download, FileJson, Check } from 'lucide-react';
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
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
        style={{
          backgroundColor: 'var(--card-bg, #1a1e29)',
          border: '1px solid var(--subborder-color, rgba(255, 255, 255, 0.12))',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '460px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)',
          color: 'var(--text-color, #ffffff)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: '0.9rem 1.1rem',
            borderBottom: '1px solid var(--subborder-color, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card-header-bg, rgba(255, 255, 255, 0.02))'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileJson size={18} style={{ color: '#3b82f6' }} />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>
              Exportar Sesión a JSON
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-text, #94a3b8)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleExport} style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted-text)', marginBottom: '0.4rem' }}>
              Nombre del archivo a exportar:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="sesion_activa.json"
                style={{
                  width: '100%',
                  background: 'var(--input-bg, rgba(0,0,0,0.3))',
                  border: '1px solid var(--subborder-color, rgba(255,255,255,0.15))',
                  borderRadius: '6px',
                  color: 'var(--text-color)',
                  padding: '8px 12px',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted-text)', marginTop: '0.4rem' }}>
              Este archivo contiene la copia completa de delegaciones, oradores, agenda, mociones y configuraciones.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.4rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--subborder-color)',
                borderRadius: '6px',
                color: 'var(--muted-text)',
                padding: '6px 12px',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!fileName.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Download size={13} />
              <span>Descargar Archivo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExportSessionModal;
