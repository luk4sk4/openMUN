import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  ClipboardPaste,
  Crown,
  Trash2,
  Check,
  Search,
  Globe2,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import CountryFlag from '../common/CountryFlag';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../../context/AccessibilityContext';
import {
  procesarImagenBandera,
  normalizarBandera,
  DICCIONARIO_PAISES_ISO
} from '../../utils/flags';

const PAISES_POPULARES_ISO = [
  { nombre: 'Naciones Unidas (ONU)', iso: 'un' },
  { nombre: 'Estados Unidos', iso: 'us' },
  { nombre: 'Reino Unido', iso: 'gb' },
  { nombre: 'Francia', iso: 'fr' },
  { nombre: 'Rusia', iso: 'ru' },
  { nombre: 'China', iso: 'cn' },
  { nombre: 'Alemania', iso: 'de' },
  { nombre: 'Japón', iso: 'jp' },
  { nombre: 'Brasil', iso: 'br' },
  { nombre: 'India', iso: 'in' },
  { nombre: 'España', iso: 'es' },
  { nombre: 'México', iso: 'mx' },
  { nombre: 'Argentina', iso: 'ar' },
  { nombre: 'Colombia', iso: 'co' },
  { nombre: 'Chile', iso: 'cl' },
  { nombre: 'Perú', iso: 'pe' },
  { nombre: 'Italia', iso: 'it' },
  { nombre: 'Canadá', iso: 'ca' },
  { nombre: 'Australia', iso: 'au' },
  { nombre: 'Sudáfrica', iso: 'za' }
];

const EditarPaisModal = ({ isOpen, onClose, pais, onGuardar, onEliminar }) => {
  const { t } = useTranslation();
  const { isLight } = useAccessibility();
  const [nombre, setNombre] = useState('');
  const [bandera, setBandera] = useState('');
  const [veto, setVeto] = useState(false);
  const [estatus, setEstatus] = useState('Presente');
  const [urlInput, setUrlInput] = useState('');
  const [busquedaBandera, setBusquedaBandera] = useState('');
  const [filtroIso, setFiltroIso] = useState('');
  const [mostrarBuscadorIso, setMostrarBuscadorIso] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mensajeFeedback, setMensajeFeedback] = useState('');

  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

  // Cargar datos del país seleccionado al abrir
  useEffect(() => {
    if (pais) {
      setNombre(pais.nombre || '');
      setBandera(pais.bandera || 'un');
      setVeto(pais.veto || false);
      setEstatus(pais.estatus || 'Presente');
      setUrlInput('');
      setBusquedaBandera('');
      setFiltroIso('');
      setMostrarBuscadorIso(false);
      setMensajeFeedback('');
    }
  }, [pais, isOpen]);

  // Listener para Ctrl+V (pegar imagen directa)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            try {
              const base64 = await procesarImagenBandera(file);
              setBandera(base64);
              setMensajeFeedback('¡Imagen pegada del portapapeles con éxito!');
              setTimeout(() => setMensajeFeedback(''), 3000);
            } catch (err) {
              console.error('Error al procesar imagen del portapapeles:', err);
              setMensajeFeedback('Error al procesar imagen');
            }
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen || !pais) return null;

  const handleSubirArchivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await procesarImagenBandera(file);
      setBandera(base64);
      setMensajeFeedback('Imagen cargada correctamente');
      setTimeout(() => setMensajeFeedback(''), 3000);
    } catch (err) {
      console.error('Error al subir imagen:', err);
      alert('No se pudo procesar la imagen seleccionada.');
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const base64 = await procesarImagenBandera(file);
        setBandera(base64);
        setMensajeFeedback('Imagen arrastrada y procesada');
        setTimeout(() => setMensajeFeedback(''), 3000);
      } catch (err) {
        console.error('Error al procesar drop:', err);
      }
    }
  };

  const handleAplicarUrl = () => {
    if (urlInput.trim()) {
      setBandera(urlInput.trim());
      setMensajeFeedback('URL de imagen aplicada');
      setTimeout(() => setMensajeFeedback(''), 3000);
    }
  };

  const handleAutoDetectar = () => {
    const autoIso = normalizarBandera('', nombre);
    setBandera(autoIso || 'un');
    setMensajeFeedback('Bandera autodetectada');
    setTimeout(() => setMensajeFeedback(''), 3000);
  };

  const handleGuardar = (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('El nombre de la delegación no puede estar vacío');
      return;
    }

    onGuardar(pais.id, {
      nombre: nombre.trim(),
      bandera: bandera || 'un',
      veto
    });
    onClose();
  };

  const listaIsoFiltrada = PAISES_POPULARES_ISO.filter(p =>
    p.nombre.toLowerCase().includes(filtroIso.toLowerCase()) ||
    p.iso.toLowerCase().includes(filtroIso.toLowerCase())
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div
        ref={modalRef}
        style={{
          backgroundColor: 'var(--panel-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: isLight 
            ? '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
            : '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.2rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--card-header-bg)' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Crown size={16} color="#3b82f6" />
            {t('editCountry.title', 'Editar Delegación')}
          </h3>
          <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted-text)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleGuardar} style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Nombre de la delegación */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: 'var(--muted-text)', marginBottom: '0.35rem' }}>
                {t('editCountry.name', 'Nombre del País')}
              </label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Francia, Cruz Roja, República de..."
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.75rem',
                    backgroundColor: isLight ? '#ffffff' : 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-color)',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}
                />
                <button
                  type="button"
                  onClick={handleAutoDetectar}
                  title="Autodetectar bandera según nombre"
                  style={{
                    padding: '0.55rem 0.75rem',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-color)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Sparkles size={14} color="#eab308" />
                  Auto
                </button>
              </div>
            </div>

            {/* Sección de Bandera e Imagen */}
            <div style={{
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ImageIcon size={14} color="#3b82f6" />
                  {t('editCountry.flag', 'Bandera')}
                </label>
                {mensajeFeedback && (
                  <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle2 size={13} />
                    {mensajeFeedback}
                  </span>
                )}
              </div>

              {/* Vista previa y zona interactiva Drop / Paste */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.75rem',
                  backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.12)' : (isLight ? '#ffffff' : 'rgba(0,0,0,0.2)'),
                  border: isDragging ? '2px dashed #3b82f6' : '1px dashed var(--border-color)',
                  borderRadius: '6px',
                  marginBottom: '0.75rem'
                }}
              >
                <CountryFlag bandera={bandera} nombre={nombre} size="xl" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} />
                
                <div style={{ flex: 1, fontSize: '0.74rem', color: 'var(--muted-text)' }}>
                  <div style={{ fontWeight: '600', color: 'var(--text-color)', marginBottom: '0.2rem' }}>
                    {t('editCountry.uploadOrPaste', 'Sube un archivo o haz')} <strong style={{ color: '#3b82f6' }}>Ctrl + V</strong>
                  </div>
                  <div>{t('editCountry.dragDropHint', 'Arrastra cualquier imagen PNG, JPG o SVG aquí, o copia y pega directamente de internet.')}</div>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '0.45rem 0.7rem',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Upload size={13} />
                  {t('common.search', 'Examinar')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSubirArchivo}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Opciones adicionales: Pegar URL o buscar predefinida */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {/* Pegar URL */}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={t('editCountry.urlPlaceholder', 'O pega una URL de imagen (https://...)')}
                    style={{
                      flex: 1,
                      padding: '0.4rem 0.6rem',
                      backgroundColor: isLight ? '#ffffff' : 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '5px',
                      color: 'var(--text-color)',
                      fontSize: '0.76rem'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAplicarUrl}
                    style={{
                      padding: '0.4rem 0.65rem',
                      backgroundColor: isLight ? '#e2e8f0' : 'var(--border-color)',
                      color: 'var(--text-color)',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '0.74rem',
                      fontWeight: '600'
                    }}
                  >
                    {t('common.apply', 'Aplicar')}
                  </button>
                </div>

                {/* Botones de acción secundaria */}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <button
                    type="button"
                    onClick={() => setMostrarBuscadorIso(!mostrarBuscadorIso)}
                    style={{
                      flex: 1,
                      padding: '0.35rem 0.5rem',
                      backgroundColor: mostrarBuscadorIso ? (isLight ? '#ede9fe' : 'rgba(168, 85, 247, 0.15)') : 'transparent',
                      border: `1px solid ${mostrarBuscadorIso ? '#8b5cf6' : 'var(--border-color)'}`,
                      borderRadius: '5px',
                      color: mostrarBuscadorIso ? '#7c3aed' : 'var(--muted-text)',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Globe2 size={13} />
                    {mostrarBuscadorIso ? t('editCountry.hideCatalog', 'Ocultar catálogo oficial') : t('editCountry.showCatalog', 'Elegir del catálogo oficial')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBandera('un'); setUrlInput(''); }}
                    title="Restablecer a bandera de ONU"
                    style={{
                      padding: '0.35rem 0.5rem',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-color)',
                      borderRadius: '5px',
                      color: 'var(--muted-text)',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <RotateCcw size={12} />
                    ONU
                  </button>
                </div>

                {/* Buscador y Catálogo de Banderas Oficiales ISO */}
                {mostrarBuscadorIso && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.6rem',
                    backgroundColor: isLight ? '#f8fafc' : 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem'
                  }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-text)' }} />
                      <input
                        type="text"
                        placeholder="Filtrar por país..."
                        value={filtroIso}
                        onChange={(e) => setFiltroIso(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.3rem 0.5rem 0.3rem 1.6rem',
                          fontSize: '0.72rem',
                          backgroundColor: isLight ? '#ffffff' : 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          color: 'var(--text-color)',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{
                      maxHeight: '130px',
                      overflowY: 'auto',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                      gap: '0.3rem'
                    }}>
                      {listaIsoFiltrada.map(p => (
                        <button
                          key={p.iso}
                          type="button"
                          onClick={() => {
                            setBandera(p.iso);
                            setMensajeFeedback(`Bandera seleccionada: ${p.nombre}`);
                            setTimeout(() => setMensajeFeedback(''), 2500);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.3rem 0.4rem',
                            borderRadius: '4px',
                            border: bandera === p.iso ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                            backgroundColor: bandera === p.iso 
                              ? (isLight ? '#eff6ff' : 'rgba(59, 130, 246, 0.15)') 
                              : (isLight ? '#ffffff' : 'rgba(255,255,255,0.03)'),
                            color: 'var(--text-color)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '0.68rem',
                            fontWeight: bandera === p.iso ? '700' : '400'
                          }}
                        >
                          <CountryFlag bandera={p.iso} size="xs" />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Checkbox de Derecho a Veto */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem',
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Crown size={16} color={veto ? '#eab308' : '#71717a'} />
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-color)' }}>
                    {t('editCountry.vetoPower', 'Derecho a Veto (P5 / Permanente)')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
                    {t('editCountry.vetoPowerDesc', 'Habilita el poder de veto en votaciones sustantivas')}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={veto}
                onChange={(e) => setVeto(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#eab308'
                }}
              />
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              {onEliminar ? (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(t('editCountry.confirmDelete', `¿Eliminar definitivamente la delegación de "${nombre}" del comité?`))) {
                      onEliminar(pais.id);
                      onClose();
                    }
                  }}
                  style={{
                    padding: '0.5rem 0.8rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Trash2 size={14} />
                  {t('common.delete', 'Eliminar')}
                </button>
              ) : <div />}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.5rem 0.9rem',
                    backgroundColor: 'transparent',
                    color: 'var(--text-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: '600'
                  }}
                >
                  {t('common.cancel', 'Cancelar')}
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1.1rem',
                    backgroundColor: '#22c55e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 4px rgba(34, 197, 94, 0.25)'
                  }}
                >
                  <Check size={15} />
                  {t('common.save', 'Guardar')}
                </button>
              </div>
            </div>

        </form>
      </div>
    </div>
  );
};

export default EditarPaisModal;
