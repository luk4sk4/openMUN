import React, { useState } from 'react';
import { X, Type, Eye, Palette, Sun, Moon, RotateCcw, Flame, Globe, Minimize2, LayoutGrid, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAccessibility, defaultDark, defaultLight } from '../../context/AccessibilityContext';
import LanguageSelector from '../common/LanguageSelector';

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
  const currentTheme = config.theme || (isLight ? defaultLight : defaultDark);

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

  const handleColorChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      theme: {
        ...(prev.theme || (isLight ? defaultLight : defaultDark)),
        [key]: value
      }
    }));
  };

  const handleResetColors = () => {
    const baseTheme = isLight ? { ...defaultLight } : { ...defaultDark };
    setConfig(prev => ({
      ...prev,
      theme: baseTheme
    }));
  };

  const colorItems = [
    { key: 'subnavColor', label: 'Menú de Pestañas', desc: 'Fondo de la barra de menú superior' },
    { key: 'headerColor', label: 'Barra Superior', desc: 'Fondo del encabezado superior' },
    { key: 'backgroundColor', label: 'Fondo Principal', desc: 'Fondo general de la app' },
    { key: 'panelColor', label: 'Paneles y Widgets', desc: 'Fondo de tarjetas y paneles' },
    { key: 'cardHeaderColor', label: 'Cabecera Widgets', desc: 'Fondo superior de las tarjetas' },
    { key: 'primaryColor', label: 'Color Primario', desc: 'Pestaña activa y botones' },
    { key: 'textColor', label: 'Color de Texto', desc: 'Texto principal' }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--panel-color)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-color)',
        padding: '1.75rem',
        borderRadius: 'var(--border-radius)',
        width: '480px',
        maxWidth: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: '700' }}>
            <Eye size={22} />
            {t('accessibility.title', 'Accesibilidad y Tema')}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              padding: '4px',
              borderRadius: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Language Selector */}
          <div style={{ padding: '0.9rem', backgroundColor: 'var(--card-header-bg)', border: '1px solid var(--subborder-color)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.92rem' }}>
                <Globe size={17} />
                {t('accessibility.languageSelect', 'Idioma de la Aplicación')}
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.6, marginTop: '0.2rem' }}>
                {t('accessibility.languageSelectDesc', 'Selecciona el idioma principal de la interfaz')}
              </div>
            </div>
            <LanguageSelector showIcon={false} />
          </div>

          {/* Theme Mode (Light / Dark) */}
          <div style={{ padding: '0.9rem', backgroundColor: 'var(--card-header-bg)', border: '1px solid var(--subborder-color)', borderRadius: '6px' }}>
            <div style={{ marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.92rem' }}>
                {isLight ? <Sun size={17} /> : <Moon size={17} />}
                {t('accessibility.themeMode', 'Tema Visual (Claro / Oscuro)')}
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.6, marginTop: '0.2rem' }}>
                {t('accessibility.themeModeDesc', 'Cambia el esquema de color general')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleThemeModeChange('dark')}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  backgroundColor: !isLight ? 'var(--btn-bg)' : 'transparent',
                  color: !isLight ? 'var(--btn-text)' : 'var(--text-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Moon size={15} /> {t('accessibility.dark', 'Oscuro')}
              </button>
              <button
                onClick={() => handleThemeModeChange('light')}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  backgroundColor: isLight ? 'var(--btn-bg)' : 'transparent',
                  color: isLight ? 'var(--btn-text)' : 'var(--text-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Sun size={15} /> {t('accessibility.light', 'Claro')}
              </button>
            </div>
          </div>

          {/* Density Mode (Compact / Standard / Projector) */}
          <div style={{ padding: '0.9rem', backgroundColor: 'var(--card-header-bg)', border: '1px solid var(--subborder-color)', borderRadius: '6px' }}>
            <div style={{ marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.92rem' }}>
                <LayoutGrid size={17} />
                {t('accessibility.densityMode', 'Densidad de Interfaz')}
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.6, marginTop: '0.2rem' }}>
                {t('accessibility.densityModeDesc', 'Ajusta el espaciado para laptops, monitores o proyectores')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                onClick={() => handleDensityModeChange('compact')}
                style={{
                  flex: 1,
                  padding: '0.45rem 0.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                  backgroundColor: densityMode === 'compact' ? 'var(--btn-bg)' : 'transparent',
                  color: densityMode === 'compact' ? 'var(--btn-text)' : 'var(--text-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.8rem',
                  transition: 'all 0.2s ease'
                }}
                title="Menor espaciado para ver más elementos en portátiles"
              >
                <Minimize2 size={13} /> {t('accessibility.densityCompact', 'Compacta')}
              </button>
              <button
                onClick={() => handleDensityModeChange('standard')}
                style={{
                  flex: 1,
                  padding: '0.45rem 0.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                  backgroundColor: densityMode === 'standard' ? 'var(--btn-bg)' : 'transparent',
                  color: densityMode === 'standard' ? 'var(--btn-text)' : 'var(--text-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.8rem',
                  transition: 'all 0.2s ease'
                }}
                title="Espaciado estándar equilibrado"
              >
                <LayoutGrid size={13} /> {t('accessibility.densityStandard', 'Estándar')}
              </button>
              <button
                onClick={() => handleDensityModeChange('projector')}
                style={{
                  flex: 1,
                  padding: '0.45rem 0.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                  backgroundColor: densityMode === 'projector' ? 'var(--btn-bg)' : 'transparent',
                  color: densityMode === 'projector' ? 'var(--btn-text)' : 'var(--text-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.8rem',
                  transition: 'all 0.2s ease'
                }}
                title="Textos y elementos destacados para proyectores y TV"
              >
                <Monitor size={13} /> {t('accessibility.densityProjector', 'Proyector')}
              </button>
            </div>
          </div>

          {/* Color Controls (Moved here from Settings) */}
          <div style={{ padding: '0.9rem', backgroundColor: 'var(--card-header-bg)', border: '1px solid var(--subborder-color)', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.92rem' }}>
                  <Palette size={17} />
                  {t('accessibility.colorControls', 'Controles de Color')}
                </div>
                <div style={{ fontSize: '0.78rem', opacity: 0.6, marginTop: '0.2rem' }}>
                  {t('accessibility.colorControlsDesc', 'Personaliza los tonos principales del tema')}
                </div>
              </div>
              <button
                onClick={handleResetColors}
                title="Restablecer a colores predeterminados"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--muted-text)',
                  cursor: 'pointer',
                  padding: '0.3rem 0.55rem',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                <RotateCcw size={12} /> {t('common.reset', 'Restablecer')}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.55rem' }}>
              {colorItems.map(({ key, label }) => {
                const colorValue = currentTheme[key] || (isLight ? defaultLight[key] : defaultDark[key]);
                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.65rem',
                      backgroundColor: 'var(--bg-color)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '5px'
                    }}
                  >
                    <div style={{ minWidth: 0, marginRight: '0.4rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: '0.72rem', opacity: 0.65, fontFamily: 'monospace' }}>
                        {colorValue}
                      </div>
                    </div>
                    <div style={{
                      position: 'relative',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid var(--border-color)',
                      flexShrink: 0,
                      cursor: 'pointer'
                    }}>
                      <input
                        type="color"
                        value={colorValue}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        style={{
                          position: 'absolute',
                          top: '-50%',
                          left: '-50%',
                          width: '200%',
                          height: '200%',
                          cursor: 'pointer',
                          border: 'none',
                          padding: 0
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dyslexia Mode */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem', backgroundColor: 'var(--card-header-bg)', border: '1px solid var(--subborder-color)', borderRadius: '6px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.92rem' }}>
                <Type size={17} />
                {t('accessibility.dyslexiaMode', 'Modo Dislexia')}
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.6, marginTop: '0.2rem' }}>
                {t('accessibility.dyslexiaDesc', 'Fuente optimizada con mayor legibilidad')}
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!accConfig.dyslexiaMode}
                onChange={handleToggleDyslexia}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--btn-bg)' }}
              />
            </label>
          </div>

          {/* Font Size */}
          <div style={{ padding: '0.9rem', backgroundColor: 'var(--card-header-bg)', border: '1px solid var(--subborder-color)', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.92rem', marginBottom: '0.65rem' }}>
              <Type size={17} />
              {t('accessibility.fontSize', 'Tamaño de Letra')} ({accConfig.fontSizeScale}x)
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', opacity: 0.6, marginTop: '0.3rem' }}>
              <span>{t('accessibility.fontSmall', 'Pequeña (0.8x)')}</span>
              <span>{t('accessibility.fontNormal', 'Normal (1.0x)')}</span>
              <span>{t('accessibility.fontLarge', 'Grande (1.5x)')}</span>
            </div>
          </div>

          {/* Colorblindness */}
          <div style={{ padding: '0.9rem', backgroundColor: 'var(--card-header-bg)', border: '1px solid var(--subborder-color)', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.92rem', marginBottom: '0.45rem' }}>
              <Palette size={17} />
              {t('accessibility.colorblind', 'Filtro de Daltonismo')}
            </div>
            <select
              value={accConfig.colorblindMode || 'none'}
              onChange={handleColorblindChange}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                backgroundColor: 'var(--bg-color)',
                color: 'var(--text-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85rem'
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem', backgroundColor: 'var(--card-header-bg)', border: '1px solid var(--subborder-color)', borderRadius: '6px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ fontWeight: '600', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flame size={17} color="#ef4444" />
                {t('accessibility.crisisBanner', 'Banner Permanente de Crisis')}
              </span>
              <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>
                {t('accessibility.crisisBannerDesc', 'Muestra la alerta activa en la parte superior de todas las pantallas del Chair')}
              </span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={bannerCrisisHabilitado}
                onChange={handleToggleBannerCrisis}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ef4444' }}
              />
            </label>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AccessibilityModal;
