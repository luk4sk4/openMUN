import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Trash2,
  Search,
  Globe2,
  RotateCcw,
  CheckCircle2,
  Users,
} from 'lucide-react';
import CountryFlag from '../common/CountryFlag';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';
import {
  procesarImagenBandera,
  normalizarBandera
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
  const confirm = useConfirm();
  const [nombre, setNombre] = useState('');
  const [equipo, setEquipo] = useState('');
  const [bandera, setBandera] = useState('');
  const [veto, setVeto] = useState(false);
  const [urlInput, setUrlInput] = useState('');
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
      setEquipo(pais.equipo || '');
      setBandera(pais.bandera || 'un');
      setVeto(pais.veto || false);
      setUrlInput('');
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
              setMensajeFeedback(t('ui.imagePastedFromClipboardSuccessfully'));
              setTimeout(() => setMensajeFeedback(''), 3000);
            } catch (err) {
              console.error('Error al procesar imagen del portapapeles:', err);
              setMensajeFeedback(t('ui.errorProcessingImage'));
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
      setMensajeFeedback(t('ui.imageLoadedSuccessfully'));
      setTimeout(() => setMensajeFeedback(''), 3000);
    } catch (err) {
      console.error('Error al subir imagen:', err);
      alert(t('ui.couldNotProcessTheSelectedImage'));
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
        setMensajeFeedback(t('ui.droppedImageProcessed'));
        setTimeout(() => setMensajeFeedback(''), 3000);
      } catch (err) {
        console.error('Error al procesar drop:', err);
      }
    }
  };

  const handleAplicarUrl = () => {
    if (urlInput.trim()) {
      setBandera(urlInput.trim());
      setMensajeFeedback(t('ui.imageUrlApplied'));
      setTimeout(() => setMensajeFeedback(''), 3000);
    }
  };

  const handleAutoDetectar = () => {
    const autoIso = normalizarBandera('', nombre);
    setBandera(autoIso || 'un');
    setMensajeFeedback(t('ui.flagDetectedAutomatically'));
    setTimeout(() => setMensajeFeedback(''), 3000);
  };

  const handleGuardar = (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert(t('ui.delegationNameCannotBeEmpty'));
      return;
    }

    onGuardar(pais.id, {
      nombre: nombre.trim(),
      bandera: bandera || 'un',
      veto,
      equipo: equipo.trim()
    });
    onClose();
  };

  const listaIsoFiltrada = PAISES_POPULARES_ISO.filter(p => {
    const nombreTraducido = t(`editCountry.popularCountries.${p.iso}`, p.nombre);
    const q = filtroIso.toLowerCase();
    return p.nombre.toLowerCase().includes(q) ||
      nombreTraducido.toLowerCase().includes(q) ||
      p.iso.toLowerCase().includes(q);
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-country-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--panel-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius, 6px)',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          color: 'var(--text-color)',
          fontFamily: 'var(--font-family)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Cabecera */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.15rem',
            borderBottom: '1px solid var(--subborder-color)',
            backgroundColor: 'var(--card-header-bg)'
          }}
        >
          <h3
            id="edit-country-title"
            style={{
              margin: 0,
              fontSize: '0.95rem',
              fontWeight: '650',
              color: 'var(--text-color)'
            }}
          >
            {t('editCountry.title', 'Editar Delegación')}
          </h3>
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--border-radius, 6px)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleGuardar} style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Nombre de la delegación */}
          <div>
            <label
              htmlFor="edit-country-name-input"
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: '600',
                color: 'var(--muted-text)',
                marginBottom: '0.35rem'
              }}
            >
              {t('editCountry.name', 'Nombre del País')}
            </label>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                id="edit-country-name-input"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder={t('ui.eGFranceRedCrossRepublicOf')}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  color: 'var(--text-color)',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={handleAutoDetectar}
                title={t('ui.detectFlagAutomaticallyFromName')}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  color: 'var(--text-color)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Search size={14} style={{ color: 'var(--muted-text)' }} />
                Auto
              </button>
            </div>
          </div>
          {/* Equipo / Colegio / Institución */}
          <div>
            <label
              htmlFor="edit-country-team-input"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.78rem',
                fontWeight: '650',
                color: 'var(--muted-text)',
                marginBottom: '0.35rem'
              }}
            >
              <Users size={13} style={{ color: 'var(--accent-color)' }} />
              {t('editCountry.team', 'Equipo / Colegio / Institución')}
            </label>
            <input
              id="edit-country-team-input"
              type="text"
              value={equipo}
              onChange={(e) => setEquipo(e.target.value)}
              placeholder="Ej. Colegio San Ignacio, Equipo A, Instituto..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.5rem 0.75rem',
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius, 6px)',
                color: 'var(--text-color)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)', display: 'block', marginTop: '0.25rem' }}>
              {t('ui.teamFieldDescription', 'Asigna esta delegación a un colegio o equipo para agruparla en la pestaña de rendimiento de equipos.')}
            </span>
          </div>

          {/* Sección de Bandera e Imagen */}
          <div style={{
            backgroundColor: 'var(--card-header-bg)',
            border: '1px solid var(--subborder-color)',
            borderRadius: 'var(--border-radius, 6px)',
            padding: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--muted-text)' }}>
                {t('editCountry.flag', 'Bandera')}
              </label>
              {mensajeFeedback && (
                <span style={{ fontSize: '0.72rem', color: 'var(--success-color)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
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
                backgroundColor: isDragging ? 'var(--accent-soft)' : 'var(--input-bg)',
                border: isDragging ? '1px dashed var(--accent-color)' : '1px dashed var(--subborder-color)',
                borderRadius: 'var(--border-radius, 6px)',
                marginBottom: '0.75rem',
                transition: 'all 0.15s ease'
              }}
            >
              <CountryFlag bandera={bandera} nombre={nombre} size="xl" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.2)', borderRadius: '3px' }} />
              
              <div style={{ flex: 1, fontSize: '0.74rem', color: 'var(--muted-text)' }}>
                <div style={{ fontWeight: '600', color: 'var(--text-color)', marginBottom: '0.2rem' }}>
                  {t('editCountry.uploadOrPaste', 'Sube un archivo o haz')} <strong style={{ color: 'var(--accent-color)' }}>Ctrl + V</strong>
                </div>
                <div style={{ lineHeight: 1.4 }}>{t('editCountry.dragDropHint', 'Arrastra cualquier imagen PNG, JPG o SVG aquí, o copia y pega directamente de internet.')}</div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '0.45rem 0.75rem',
                  backgroundColor: 'transparent',
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <Upload size={13} style={{ color: 'var(--muted-text)' }} />
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
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius, 6px)',
                    color: 'var(--text-color)',
                    fontSize: '0.76rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={handleAplicarUrl}
                  style={{
                    padding: '0.4rem 0.65rem',
                    backgroundColor: 'transparent',
                    color: 'var(--text-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius, 6px)',
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
                    padding: '0.4rem 0.5rem',
                    backgroundColor: mostrarBuscadorIso ? 'var(--accent-soft)' : 'transparent',
                    border: `1px solid ${mostrarBuscadorIso ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--border-radius, 6px)',
                    color: mostrarBuscadorIso ? 'var(--accent-color)' : 'var(--muted-text)',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Globe2 size={13} />
                  {mostrarBuscadorIso ? t('editCountry.hideCatalog', 'Ocultar catálogo oficial') : t('editCountry.showCatalog', 'Elegir del catálogo oficial')}
                </button>
                <button
                  type="button"
                  onClick={() => { setBandera('un'); setUrlInput(''); }}
                  title={t('editCountry.resetUnFlag', 'Restablecer a bandera de ONU')}
                  style={{
                    padding: '0.4rem 0.55rem',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius, 6px)',
                    color: 'var(--muted-text)',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <RotateCcw size={12} />
                  {t('editCountry.unFlag', 'ONU')}
                </button>
              </div>

              {/* Buscador y Catálogo de Banderas Oficiales ISO */}
              {mostrarBuscadorIso && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.6rem',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem'
                }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-text)' }} />
                    <input
                      type="text"
                      placeholder={t('editCountry.filterCountry', 'Filtrar por país...')}
                      value={filtroIso}
                      onChange={(e) => setFiltroIso(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.35rem 0.5rem 0.35rem 1.6rem',
                        fontSize: '0.72rem',
                        backgroundColor: 'var(--panel-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius, 6px)',
                        color: 'var(--text-color)',
                        outline: 'none',
                        boxSizing: 'border-box'
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
                    {listaIsoFiltrada.map(p => {
                      const nombreTraducido = t(`editCountry.popularCountries.${p.iso}`, p.nombre);
                      return (
                        <button
                          key={p.iso}
                          type="button"
                          onClick={() => {
                            setBandera(p.iso);
                            setMensajeFeedback(t('editCountry.flagSelected', { country: nombreTraducido, defaultValue: `Bandera seleccionada: ${nombreTraducido}` }));
                            setTimeout(() => setMensajeFeedback(''), 2500);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.3rem 0.4rem',
                            borderRadius: 'var(--border-radius, 6px)',
                            border: bandera === p.iso ? '1px solid var(--accent-color)' : '1px solid var(--subborder-color)',
                            backgroundColor: bandera === p.iso ? 'var(--accent-soft)' : 'transparent',
                            color: 'var(--text-color)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '0.68rem',
                            fontWeight: bandera === p.iso ? '700' : '400'
                          }}
                        >
                          <CountryFlag bandera={p.iso} size="xs" />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombreTraducido}</span>
                        </button>
                      );
                    })}
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
            padding: '0.75rem 0.85rem',
            backgroundColor: 'var(--card-header-bg)',
            border: '1px solid var(--subborder-color)',
            borderRadius: 'var(--border-radius, 6px)'
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: '650', color: 'var(--text-color)' }}>
                {t('editCountry.vetoPower', 'Derecho a Veto (P5 / Permanente)')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '0.15rem' }}>
                {t('editCountry.vetoPowerDesc', 'Habilita el poder de veto en votaciones sustantivas')}
              </div>
            </div>
            <input
              type="checkbox"
              checked={veto}
              onChange={(e) => setVeto(e.target.checked)}
              aria-label={t('editCountry.vetoPower', 'Derecho a Veto (P5 / Permanente)')}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
                accentColor: 'var(--btn-bg)'
              }}
            />
          </div>

          {/* Botones de acción */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '0.5rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--subborder-color)'
          }}>
            {onEliminar ? (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: t('editCountry.deleteTitle', 'Eliminar delegación'),
                    message: t('editCountry.confirmDelete', { name: nombre, defaultValue: `¿Eliminar definitivamente la delegación de "${nombre}" del comité?` }),
                    confirmText: t('common.delete', 'Eliminar'),
                    cancelText: t('common.cancel', 'Cancelar'),
                    type: 'danger'
                  });
                  if (ok) {
                    onEliminar(pais.id);
                    onClose();
                  }
                }}
                style={{
                  padding: '0.5rem 0.85rem',
                  backgroundColor: 'var(--danger-soft)',
                  color: 'var(--danger-color)',
                  border: '1px solid var(--danger-color)',
                  borderRadius: 'var(--border-radius, 6px)',
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
                  padding: '0.5rem 0.95rem',
                  backgroundColor: 'transparent',
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: '500'
                }}
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                type="submit"
                style={{
                  padding: '0.5rem 1.15rem',
                  backgroundColor: 'var(--btn-bg)',
                  color: 'var(--btn-text)',
                  border: 'none',
                  borderRadius: 'var(--border-radius, 6px)',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
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
