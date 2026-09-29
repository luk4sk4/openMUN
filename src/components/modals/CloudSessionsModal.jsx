import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  FileText,
  LogOut,
  Calendar,
  Cloud,
  Database,
  Eye,
  EyeOff,
  AlertCircle,
  Save
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import ConfirmModal from './ConfirmModal';

const CloudSessionsModal = ({ isOpen, onClose }) => {
  const {
    isCloudLinked,
    cloudAccount,
    cloudComitesList,
    cloudActiveComiteName,
    conectarCloud,
    desconectarCloud,
    listarComitesCloud,
    guardarComiteCloud,
    cargarComiteCloud,
    eliminarComiteCloud,
    nombreComite
  } = useSession();

  const [loading, setLoading] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [mensajeFeedback, setFeedback] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Estados del formulario de autenticación
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [nombreConferencia, setNombreConferencia] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const sanitized = (nombreComite || 'Asamblea General').trim();
      const fecha = new Date().toISOString().slice(0, 10);
      setNuevoNombre(`${sanitized} - ${fecha}`);
      if (isCloudLinked) {
        listarComitesCloud();
      }
    }
  }, [isOpen, isCloudLinked, nombreComite]);

  if (!isOpen) return null;

  const showNotification = (msg, type = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), type === 'error' ? 7000 : 3500);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!nombreConferencia.trim()) {
      showNotification('Ingresa el nombre de la conferencia o cuenta.', 'error');
      return;
    }
    if (!password) {
      showNotification('Ingresa la contraseña.', 'error');
      return;
    }

    setLoading(true);
    try {
      const isRegister = authMode === 'register';
      await conectarCloud(nombreConferencia.trim(), password, isRegister);
      showNotification(
        isRegister
          ? `¡Cuenta "${nombreConferencia.trim()}" registrada y conectada!`
          : `Sesión iniciada como "${nombreConferencia.trim()}"`
      );
      setPassword('');
    } catch (err) {
      console.error('Error al autenticar en Supabase:', err);
      showNotification(err.message || 'Error al conectar con Supabase', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await listarComitesCloud();
    setLoading(false);
  };

  const handleCargarComite = (comite) => {
    setConfirmConfig({
      title: '¿Cargar Comité desde la Nube?',
      message: 'Esta acción descargará y aplicará todos los datos del comité seleccionado.',
      highlightText: comite.name,
      submessage: '⚠️ Los datos actuales del debate en este navegador se reemplazarán por los del comité guardado.',
      confirmText: 'Cargar Comité',
      cancelText: 'Cancelar',
      type: 'load',
      onConfirm: async () => {
        setConfirmConfig(null);
        setLoading(true);
        try {
          await cargarComiteCloud(comite.id, comite.name);
          showNotification(`Comité "${comite.name}" cargado con éxito`);
        } catch (err) {
          showNotification(err.message || 'Error al cargar el comité', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleGuardarNuevo = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    setLoading(true);
    try {
      const res = await guardarComiteCloud(nuevoNombre.trim());
      showNotification(`Comité "${res.name}" guardado exitosamente en la nube`);
      setMostrarCrear(false);
    } catch (err) {
      showNotification(err.message || 'Error al guardar el comité', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSobrescribir = (comite) => {
    setConfirmConfig({
      title: '¿Sobrescribir Comité en la Nube?',
      message: 'Esta acción reemplazará los datos guardados en la nube con la sesión que tienes actualmente en pantalla.',
      highlightText: comite.name,
      submessage: 'Los datos previos de este comité en la nube serán actualizados.',
      confirmText: 'Sobrescribir',
      cancelText: 'Cancelar',
      type: 'warning',
      onConfirm: async () => {
        setConfirmConfig(null);
        setLoading(true);
        try {
          await guardarComiteCloud(comite.name);
          showNotification(`Comité "${comite.name}" actualizado en la nube`);
        } catch (err) {
          showNotification(err.message || 'Error al actualizar comité', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleEliminar = (comite) => {
    setConfirmConfig({
      title: '¿Eliminar Comité de la Nube?',
      message: '¿Estás seguro de que deseas eliminar permanentemente este comité de tu conferencia en Supabase?',
      highlightText: comite.name,
      submessage: 'Esta acción no se puede deshacer.',
      confirmText: 'Eliminar Comité',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        setLoading(true);
        try {
          await eliminarComiteCloud(comite.id);
          showNotification(`Comité "${comite.name}" eliminado de la nube`);
        } catch (err) {
          showNotification(err.message || 'Error al eliminar comité', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Desconocida';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
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
          border: '1px solid rgba(62, 207, 142, 0.3)',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6), 0 0 20px rgba(62, 207, 142, 0.1)',
          color: 'var(--text-color, #ffffff)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: '1.1rem 1.3rem',
            borderBottom: '1px solid var(--subborder-color, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(62, 207, 142, 0.08) 0%, rgba(0, 0, 0, 0) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(62, 207, 142, 0.15)',
                border: '1px solid rgba(62, 207, 142, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3ecf8e'
              }}
            >
              <Database size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Respaldo en la Nube (Supabase)
                <span
                  style={{
                    fontSize: '0.65rem',
                    backgroundColor: 'rgba(62, 207, 142, 0.2)',
                    color: '#3ecf8e',
                    border: '1px solid rgba(62, 207, 142, 0.4)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: '600'
                  }}
                >
                  PostgreSQL
                </span>
              </h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted-text, #94a3b8)', marginTop: '2px' }}>
                {isCloudLinked && cloudAccount
                  ? `Conferencia activa: ${cloudAccount.name}`
                  : 'Sincroniza y guarda los comités de tu conferencia'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted-text, #94a3b8)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notificación Feedback */}
        {mensajeFeedback && (
          <div
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: mensajeFeedback.type === 'success' ? 'rgba(62, 207, 142, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              borderBottom: `1px solid ${mensajeFeedback.type === 'success' ? 'rgba(62, 207, 142, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: mensajeFeedback.type === 'success' ? '#3ecf8e' : '#f87171',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            {mensajeFeedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>{mensajeFeedback.msg}</span>
          </div>
        )}

        {/* Contenido Principal */}
        <div style={{ padding: '1.2rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isCloudLinked ? (
            /* Vista de Inicio de Sesión / Registro */
            <div style={{ maxWidth: '420px', width: '100%', margin: '0.5rem auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
                <Cloud size={40} style={{ color: '#3ecf8e', marginBottom: '0.6rem', opacity: 0.9 }} />
                <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.1rem', fontWeight: '700' }}>
                  {authMode === 'login' ? 'Conectar con tu Conferencia' : 'Crear Cuenta para la Conferencia'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-text)' }}>
                  {authMode === 'login'
                    ? 'Ingresa el nombre y contraseña de tu conferencia para acceder a todos los comités guardados.'
                    : 'Registra un nombre y contraseña para tu conferencia. Las contraseñas se hashean de forma segura.'}
                </p>
              </div>

              {/* Selector de Modo */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '3px',
                  marginBottom: '1rem',
                  border: '1px solid var(--subborder-color)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: authMode === 'login' ? '#3ecf8e' : 'transparent',
                    color: authMode === 'login' ? '#000000' : 'var(--muted-text)',
                    fontWeight: authMode === 'login' ? '700' : '500',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: authMode === 'register' ? '#3ecf8e' : 'transparent',
                    color: authMode === 'register' ? '#000000' : 'var(--muted-text)',
                    fontWeight: authMode === 'register' ? '700' : '500',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  Crear Cuenta
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                    Nombre de la Conferencia / Cuenta
                  </label>
                  <input
                    type="text"
                    value={nombreConferencia}
                    onChange={(e) => setNombreConferencia(e.target.value)}
                    placeholder="Ej: MUN Madrid 2026, URUMUN..."
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '7px',
                      border: '1px solid var(--subborder-color)',
                      backgroundColor: 'var(--input-bg, rgba(255,255,255,0.05))',
                      color: 'var(--text-color)',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                    Contraseña
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Contraseña de la conferencia"
                      required
                      style={{
                        width: '100%',
                        padding: '8px 36px 8px 12px',
                        borderRadius: '7px',
                        border: '1px solid var(--subborder-color)',
                        backgroundColor: 'var(--input-bg, rgba(255,255,255,0.05))',
                        color: 'var(--text-color)',
                        fontSize: '0.82rem',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--muted-text)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: '0.4rem',
                    padding: '9px 16px',
                    borderRadius: '7px',
                    backgroundColor: '#3ecf8e',
                    color: '#000000',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(62, 207, 142, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {loading && <RefreshCw size={15} className="spin-animation" />}
                  <span>
                    {loading
                      ? 'Conectando...'
                      : authMode === 'login'
                        ? 'Iniciar Sesión y Cargar Comités'
                        : 'Crear Conferencia y Vincular'}
                  </span>
                </button>
              </form>
            </div>
          ) : (
            /* Vista de Gestión de Comités (Autenticado) */
            <>
              {/* Tarjeta de Cuenta Activa */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '9px',
                  backgroundColor: 'rgba(62, 207, 142, 0.08)',
                  border: '1px solid rgba(62, 207, 142, 0.25)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#3ecf8e', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Conferencia Vinculada
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', marginTop: '1px' }}>
                    {cloudAccount?.name || 'Conferencia'}
                  </div>
                  {cloudActiveComiteName && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '2px' }}>
                      Comité en pantalla: <strong>{cloudActiveComiteName}</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    title="Actualizar lista de comités"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--subborder-color)',
                      color: 'var(--text-color)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <RefreshCw size={13} className={loading ? 'spin-animation' : ''} />
                    <span>Actualizar</span>
                  </button>

                  <button
                    onClick={desconectarCloud}
                    title="Cerrar sesión de la conferencia"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <LogOut size={13} />
                    <span>Desconectar</span>
                  </button>
                </div>
              </div>

              {/* Botón para Crear / Guardar Nuevo Comité */}
              {!mostrarCrear ? (
                <button
                  onClick={() => setMostrarCrear(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.7rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(62, 207, 142, 0.12)',
                    border: '1px dashed rgba(62, 207, 142, 0.4)',
                    color: '#3ecf8e',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(62, 207, 142, 0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(62, 207, 142, 0.12)'; }}
                >
                  <Plus size={16} />
                  <span>Guardar Sesión Actual como Nuevo Comité en la Nube</span>
                </button>
              ) : (
                <form
                  onSubmit={handleGuardarNuevo}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(62, 207, 142, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}
                >
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                    Nombre del Comité / Proyecto
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      placeholder="Ej: DISEC, Consejo de Seguridad, Crisis..."
                      required
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--subborder-color)',
                        backgroundColor: 'var(--input-bg, rgba(255,255,255,0.05))',
                        color: 'var(--text-color)',
                        fontSize: '0.82rem'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '6px',
                        backgroundColor: '#3ecf8e',
                        color: '#000',
                        border: 'none',
                        fontWeight: '700',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Save size={14} />
                      <span>Guardar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrarCrear(false)}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'transparent',
                        color: 'var(--muted-text)',
                        border: '1px solid var(--subborder-color)',
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Comités Guardados */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted-text)' }}>
                    Comités Guardados ({cloudComitesList.length})
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
                    Haz clic en "Cargar" para continuar el debate
                  </span>
                </div>

                {cloudComitesList.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '2.5rem 1rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px dashed var(--subborder-color)',
                      borderRadius: '8px'
                    }}
                  >
                    <FileText size={32} style={{ color: 'var(--muted-text)', opacity: 0.5, marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                      No hay comités guardados en esta conferencia
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)', marginTop: '0.2rem' }}>
                      Pulsa el botón de arriba para guardar la sesión actual en la nube.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '320px', overflowY: 'auto' }}>
                    {cloudComitesList.map((comite) => {
                      const isActive = cloudActiveComiteName === comite.name;
                      return (
                        <div
                          key={comite.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            backgroundColor: isActive ? 'rgba(62, 207, 142, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${isActive ? 'rgba(62, 207, 142, 0.35)' : 'var(--subborder-color)'}`,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
                            <div
                              style={{
                                color: isActive ? '#3ecf8e' : 'var(--muted-text)',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <FileText size={18} />
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div
                                style={{
                                  fontSize: '0.84rem',
                                  fontWeight: '700',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  color: isActive ? '#3ecf8e' : 'var(--text-color)'
                                }}
                              >
                                {comite.name}
                                {isActive && (
                                  <span
                                    style={{
                                      marginLeft: '0.5rem',
                                      fontSize: '0.65rem',
                                      backgroundColor: 'rgba(62, 207, 142, 0.2)',
                                      color: '#3ecf8e',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      fontWeight: '600'
                                    }}
                                  >
                                    Cargado
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                                <Calendar size={11} />
                                <span>{formatDate(comite.updated_at)}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            <button
                              onClick={() => handleCargarComite(comite)}
                              title="Cargar y aplicar datos de este comité"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                color: '#60a5fa',
                                border: '1px solid rgba(59, 130, 246, 0.35)',
                                borderRadius: '5px',
                                padding: '4px 8px',
                                fontSize: '0.74rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              <Download size={12} />
                              <span>Cargar</span>
                            </button>

                            <button
                              onClick={() => handleSobrescribir(comite)}
                              title="Actualizar este comité con los datos en pantalla"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-color)',
                                border: '1px solid var(--subborder-color)',
                                borderRadius: '5px',
                                padding: '4px 8px',
                                fontSize: '0.74rem',
                                fontWeight: '500',
                                cursor: 'pointer'
                              }}
                            >
                              <RefreshCw size={12} />
                              <span>Sobrescribir</span>
                            </button>

                            <button
                              onClick={() => handleEliminar(comite)}
                              title="Eliminar este comité de la nube"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                backgroundColor: 'transparent',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '5px',
                                padding: '4px 6px',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal de Confirmación Reutilizado */}
        {confirmConfig && (
          <ConfirmModal
            isOpen={Boolean(confirmConfig)}
            onClose={() => setConfirmConfig(null)}
            onConfirm={confirmConfig.onConfirm}
            title={confirmConfig.title}
            message={confirmConfig.message}
            highlightText={confirmConfig.highlightText}
            submessage={confirmConfig.submessage}
            confirmText={confirmConfig.confirmText}
            cancelText={confirmConfig.cancelText}
            type={confirmConfig.type}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};

export default CloudSessionsModal;
