import React, { useState, useEffect } from 'react';
import { X, Type, Eye, Sun, Moon, Flame, Globe, Minimize2, LayoutGrid, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAccessibility, defaultDark, defaultLight } from '../../context/AccessibilityContext';
import LanguageSelector from '../common/LanguageSelector';

const ToggleSwitch = ({ checked, onChange, ariaLabel, activeColor = 'var(--accent-color)' }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '42px',
        height: '24px',
        borderRadius: '9999px',
        padding: '2px',
        backgroundColor: checked ? activeColor : 'var(--bg-color)',
        border: `1px solid ${checked ? activeColor : 'var(--border-color)'}`,
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        outline: 'none',
        flexShrink: 0
      }}
    >
      <span
        style={{
          display: 'block',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
          transform: checked ? 'translateX(18px)' : 'translateX(0px)',
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      />
    </button>
  );
};

const AccessibilityModal = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  config: propConfig,
  setConfig: propSetConfig
}) => {
  const { t } = useTranslation();
  const context = useAccessibility();
  const isOpen = propIsOpen !== undefined ? propIsOpen : context?.isAccessOpen;
  const onClose = propOnClose || context?.closeAccessibilityModal;
  const config = propConfig || context?.config;
  const setConfig = propSetConfig || context?.setConfig;

  const [bannerCrisisHabilitado, setBannerCrisisHabilitado] = useState(() => {
    const saved = localStorage.getItem('openmun_permanent_banner_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  // Cerrar con la tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !config) return null;

  const handleToggleBannerCrisis = () => {
    const nuevoValor = !bannerCrisisHabilitado;
    setBannerCrisisHabilitado(nuevoValor);
    localStorage.setItem('openmun_permanent_banner_enabled', String(nuevoValor));
    window.dispatchEvent(new CustomEvent('openmun_crisis_update'));
  };

  const accConfig = config.accessibility || { dyslexiaMode: false, fontSizeScale: 1, colorblindMode: "none", themeMode: "dark", densityMode: "standard" };
  const isLight = accConfig.themeMode === 'light';
  const densityMode = accConfig.densityMode || 'standard';

  const handleDensityModeChange = (mode) => {
    setConfig(prev => ({
      ...prev,
      accessibility: {
        ...prev.accessibility,
        densityMode: mode
      }
    }));
  };

  const handleToggleDyslexia = () => {
    setConfig(prev => ({
      ...prev,
      accessibility: {
        ...prev.accessibility,
        dyslexiaMode: !prev.accessibility?.dyslexiaMode
      }
    }));
  };

  const handleFontSizeChange = (e) => {
    setConfig(prev => ({
      ...prev,
      accessibility: {
        ...prev.accessibility,
        fontSizeScale: parseFloat(e.target.value)
      }
    }));
  };

  const handleColorblindChange = (e) => {
    setConfig(prev => ({
      ...prev,
      accessibility: {
        ...prev.accessibility,
        colorblindMode: e.target.value
      }
    }));
  };

  const handleThemeModeChange = (mode) => {
    const isNowLight = mode === 'light';
    const newTheme = isNowLight ? { ...defaultLight } : { ...defaultDark };

    setConfig(prev => ({
      ...prev,
      theme: newTheme,
      accessibility: {
        ...prev.accessibility,
        themeMode: mode
      }
    }));
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="accessibility-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--panel-color)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-color)',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '760px',
          maxHeight: 'min(92vh, 720px)',
          boxShadow: '0 16px 36px rgba(0,0,0,0.45)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-family)',
          margin: 'auto',
          overflow: 'hidden'
        }}
      >
        {/* Encabezado fijo */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.9rem 1.25rem',
          borderBottom: '1px solid var(--subborder-color)',
          flexShrink: 0
        }}>
          <h2
            id="accessibility-modal-title"
            style={{
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              fontSize: '1.05rem',
              fontWeight: '650',
              color: 'var(--text-color)'
            }}
          >
            <Eye size={19} style={{ color: 'var(--accent-color)' }} />
            {t('accessibility.title', 'Accesibilidad y Tema')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', 'Cerrar')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-text)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: 'var(--border-radius, 6px)',
              transition: 'background-color 0.15s ease, color 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-soft)';
              e.currentTarget.style.color = 'var(--text-color)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--muted-text)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del modal (2 columnas en pantallas normales para evitar scroll) */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '1rem 1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '0.85rem',
          alignItems: 'start'
        }}>

          {/* Columna 1: Interfaz, Tema y Densidad */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Idioma de la Aplicación */}
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--subborder-color)',
              borderRadius: 'var(--border-radius, 6px)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-color)' }}>
                  <Globe size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                  <span>{t('accessibility.languageSelect', 'Idioma de la Aplicación')}</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--muted-text)', marginTop: '0.2rem', lineHeight: '1.3' }}>
                  {t('accessibility.languageSelectDesc', 'Selecciona el idioma principal de la interfaz')}
                </div>
              </div>
              <LanguageSelector showIcon={false} />
            </div>

            {/* Tema Visual (Claro / Oscuro) */}
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--subborder-color)',
              borderRadius: 'var(--border-radius, 6px)'
            }}>
              <div style={{ marginBottom: '0.55rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-color)' }}>
                  {isLight ? <Sun size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} /> : <Moon size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />}
                  <span>{t('accessibility.themeMode', 'Tema Visual (Claro / Oscuro)')}</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--muted-text)', marginTop: '0.2rem', lineHeight: '1.3' }}>
                  {t('accessibility.themeModeDesc', 'Cambia el esquema de color general')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleThemeModeChange('dark')}
                  aria-pressed={!isLight}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    backgroundColor: !isLight ? 'var(--accent-soft)' : 'var(--bg-color)',
                    color: !isLight ? 'var(--accent-color)' : 'var(--text-color)',
                    border: `1px solid ${!isLight ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--border-radius, 6px)',
                    cursor: 'pointer',
                    fontWeight: !isLight ? '650' : '500',
                    fontSize: '0.84rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Moon size={15} /> {t('accessibility.dark', 'Oscuro')}
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeModeChange('light')}
                  aria-pressed={isLight}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    backgroundColor: isLight ? 'var(--accent-soft)' : 'var(--bg-color)',
                    color: isLight ? 'var(--accent-color)' : 'var(--text-color)',
                    border: `1px solid ${isLight ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--border-radius, 6px)',
                    cursor: 'pointer',
                    fontWeight: isLight ? '650' : '500',
                    fontSize: '0.84rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Sun size={15} /> {t('accessibility.light', 'Claro')}
                </button>
              </div>
            </div>

            {/* Densidad de Interfaz (Compacta / Estándar / Proyector) */}
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--subborder-color)',
              borderRadius: 'var(--border-radius, 6px)'
            }}>
              <div style={{ marginBottom: '0.55rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-color)' }}>
                  <LayoutGrid size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                  <span>{t('accessibility.densityMode', 'Densidad de Interfaz')}</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--muted-text)', marginTop: '0.2rem', lineHeight: '1.3' }}>
                  {t('accessibility.densityModeDesc', 'Ajusta el espaciado para laptops, monitores o proyectores')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.45rem' }}>
                {[
                  { id: 'compact', label: t('accessibility.densityCompact', 'Compacta'), icon: Minimize2, title: 'Menor espaciado para portátiles o pantallas pequeñas' },
                  { id: 'standard', label: t('accessibility.densityStandard', 'Estándar'), icon: LayoutGrid, title: 'Espaciado estándar equilibrado' },
                  { id: 'projector', label: t('accessibility.densityProjector', 'Proyector'), icon: Monitor, title: 'Textos y elementos destacados para proyector o pantalla grande' }
                ].map(({ id, label, icon: IconComponent, title }) => {
                  const isSelected = densityMode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleDensityModeChange(id)}
                      aria-pressed={isSelected}
                      title={title}
                      style={{
                        flex: 1,
                        padding: '0.45rem 0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--bg-color)',
                        color: isSelected ? 'var(--accent-color)' : 'var(--text-color)',
                        border: `1px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--border-radius, 6px)',
                        cursor: 'pointer',
                        fontWeight: isSelected ? '650' : '500',
                        fontSize: '0.8rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <IconComponent size={14} /> {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Columna 2: Accesibilidad Visual, Lectura y Opciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Modo Dislexia */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--subborder-color)',
              borderRadius: 'var(--border-radius, 6px)',
              gap: '0.75rem'
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-color)' }}>
                  <Type size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                  <span>{t('accessibility.dyslexiaMode', 'Modo Dislexia')}</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--muted-text)', marginTop: '0.2rem', lineHeight: '1.3' }}>
                  {t('accessibility.dyslexiaDesc', 'Fuente optimizada con mayor legibilidad')}
                </div>
              </div>
              <ToggleSwitch
                checked={!!accConfig.dyslexiaMode}
                onChange={handleToggleDyslexia}
                ariaLabel={t('accessibility.dyslexiaMode', 'Modo Dislexia')}
                activeColor="var(--btn-bg)"
              />
            </div>

            {/* Tamaño de Letra */}
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--subborder-color)',
              borderRadius: 'var(--border-radius, 6px)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-color)' }}>
                  <Type size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                  <span>{t('accessibility.fontSize', 'Tamaño de Letra')}</span>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--accent-color)', fontVariantNumeric: 'tabular-nums' }}>
                  {(accConfig.fontSizeScale || 1).toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.5"
                step="0.05"
                value={accConfig.fontSizeScale || 1}
                onChange={handleFontSizeChange}
                style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--btn-bg)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--muted-text)', marginTop: '0.25rem', fontVariantNumeric: 'tabular-nums' }}>
                <span>{t('accessibility.fontSmall', 'Pequeña (0.8x)')}</span>
                <span>{t('accessibility.fontNormal', 'Normal (1.0x)')}</span>
                <span>{t('accessibility.fontLarge', 'Grande (1.5x)')}</span>
              </div>
            </div>

            {/* Filtro de Daltonismo */}
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--subborder-color)',
              borderRadius: 'var(--border-radius, 6px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-color)', marginBottom: '0.45rem' }}>
                <Eye size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                <span>{t('accessibility.colorblind', 'Filtro de Daltonismo')}</span>
              </div>
              <select
                value={accConfig.colorblindMode || 'none'}
                onChange={handleColorblindChange}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem',
                  backgroundColor: 'var(--bg-color)',
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  cursor: 'pointer',
                  fontSize: '0.84rem'
                }}
              >
                <option value="none">{t('accessibility.colorblindNone', 'Ninguno (Normal)')}</option>
                <option value="protanopia">{t('accessibility.colorblindProtanopia', 'Protanopía (Rojo-Verde)')}</option>
                <option value="deuteranopia">{t('accessibility.colorblindDeuteranopia', 'Deuteranopía (Verde-Rojo)')}</option>
                <option value="tritanopia">{t('accessibility.colorblindTritanopia', 'Tritanopía (Azul-Amarillo)')}</option>
                <option value="achromatopsia">{t('accessibility.colorblindAchromatopsia', 'Acromatopsia (Escala de grises)')}</option>
              </select>
            </div>

            {/* Banner Permanente de Alerta de Crisis */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--subborder-color)',
              borderRadius: 'var(--border-radius, 6px)',
              gap: '0.75rem'
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-color)' }}>
                  <Flame size={16} style={{ color: 'var(--danger-color)', flexShrink: 0 }} />
                  <span>{t('accessibility.crisisBanner', 'Banner Permanente de Crisis')}</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--muted-text)', marginTop: '0.2rem', lineHeight: '1.3' }}>
                  {t('accessibility.crisisBannerDesc', 'Muestra la alerta activa en la parte superior de todas las pantallas del Chair')}
                </div>
              </div>
              <ToggleSwitch
                checked={bannerCrisisHabilitado}
                onChange={handleToggleBannerCrisis}
                ariaLabel={t('accessibility.crisisBanner', 'Banner Permanente de Crisis')}
                activeColor="var(--danger-color)"
              />
            </div>
          </div>

        </div>

        {/* Pie de modal */}
        <div style={{
          padding: '0.85rem 1.25rem',
          borderTop: '1px solid var(--subborder-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: 'var(--panel-color)',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.45rem 1.2rem',
              backgroundColor: 'var(--btn-bg)',
              color: 'var(--btn-text)',
              border: 'none',
              borderRadius: 'var(--border-radius, 6px)',
              fontWeight: '600',
              fontSize: '0.84rem',
              cursor: 'pointer',
              transition: 'opacity 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {t('common.close', 'Cerrar')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AccessibilityModal;
