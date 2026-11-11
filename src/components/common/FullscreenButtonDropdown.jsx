import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, Minimize2, Columns2, Columns3, Clock, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FullscreenButtonDropdown = ({
  activeTab = 'GSL',
  isMaximized = false,
  fullscreenMode = 'with_left',
  toggleMaximize,
  setFullscreenMode,
  style = {}
}) => {
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef(null);

  const isDebate = activeTab === 'DEBATE';

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  const handleSelectMode = (mode) => {
    setDropdownOpen(false);
    if (isMaximized) {
      if (typeof setFullscreenMode === 'function') {
        setFullscreenMode(mode);
      } else if (typeof toggleMaximize === 'function') {
        toggleMaximize(mode);
      } else {
        window.dispatchEvent(new CustomEvent('openmun_toggle_fullscreen', { detail: { mode } }));
      }
    } else {
      if (typeof toggleMaximize === 'function') {
        toggleMaximize(mode);
      } else {
        window.dispatchEvent(new CustomEvent('openmun_toggle_fullscreen', { detail: { mode } }));
      }
    }
  };

  const handleExit = () => {
    if (typeof toggleMaximize === 'function') {
      toggleMaximize('exit');
    } else {
      window.dispatchEvent(new CustomEvent('openmun_toggle_fullscreen', { detail: { mode: 'exit' } }));
    }
  };

  const getModeLabel = () => {
    if (fullscreenMode === 'timer_only') return t('header.fsTimerOnlyShort', 'Solo reloj');
    if (fullscreenMode === 'with_adder' || fullscreenMode === 'all') return t('header.fsWithAdderShort', 'Completo');
    return isDebate ? t('header.fsWithMotionsShort', 'Con pizarra') : t('header.fsWithSpeakersShort', 'Con oradores');
  };

  const getModeIcon = () => {
    if (fullscreenMode === 'timer_only') return <Clock size={13} style={{ color: 'var(--accent-color)' }} />;
    if (fullscreenMode === 'with_adder' || fullscreenMode === 'all') return <Columns3 size={13} style={{ color: 'var(--accent-color)' }} />;
    return <Columns2 size={13} style={{ color: 'var(--accent-color)' }} />;
  };

  const renderDropdownOptions = () => (
    <div
      role="menu"
      aria-label={t('header.fsLayoutOptions', 'Modos de Pantalla Completa')}
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        right: 0,
        zIndex: 9999,
        minWidth: '280px',
        backgroundColor: 'var(--panel-color)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius, 6px)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
        padding: '0.35rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px'
      }}
    >
      <div
        style={{
          padding: '0.3rem 0.55rem 0.25rem',
          fontSize: '0.66rem',
          fontWeight: '750',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--muted-text)',
          borderBottom: '1px solid var(--subborder-color)',
          marginBottom: '3px'
        }}
      >
        {t('header.fsLayoutOptions', 'Modos de Pantalla Completa')}
      </div>

      {/* Option 1: WITH left part (cron + speakers/motions, no adder) */}
      <button
        type="button"
        role="menuitem"
        onClick={() => handleSelectMode('with_left')}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.65rem',
          padding: '0.45rem 0.55rem',
          borderRadius: '5px',
          border: 'none',
          backgroundColor: isMaximized && fullscreenMode === 'with_left' ? 'var(--accent-soft)' : 'transparent',
          color: isMaximized && fullscreenMode === 'with_left' ? 'var(--accent-color)' : 'var(--text-color)',
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'background-color 0.12s ease'
        }}
        onMouseEnter={(e) => { if (!(isMaximized && fullscreenMode === 'with_left')) e.currentTarget.style.backgroundColor = 'var(--accent-soft)'; }}
        onMouseLeave={(e) => { if (!(isMaximized && fullscreenMode === 'with_left')) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <div
          style={{
            marginTop: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: '4px',
            backgroundColor: 'var(--accent-soft)',
            color: 'var(--accent-color)',
            flexShrink: 0
          }}
        >
          <Columns2 size={15} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '700', lineHeight: 1.25, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{isDebate ? t('header.fsWithMotions', 'Con pizarra y oradores') : t('header.fsWithSpeakers', 'Con lista de oradores')}</span>
            {isMaximized && fullscreenMode === 'with_left' && <Check size={12} style={{ marginLeft: 'auto' }} />}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted-text)', marginTop: '2px', lineHeight: 1.2 }}>
            {isDebate
              ? t('header.fsWithMotionsDesc', 'Cronómetro, mociones y oradores (sin añadir países)')
              : t('header.fsWithSpeakersDesc', 'Cronómetro y oradores en cola (sin añadir países)')}
          </div>
        </div>
      </button>

      {/* Option 2: WITHOUT left part (timer only) */}
      <button
        type="button"
        role="menuitem"
        onClick={() => handleSelectMode('timer_only')}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.65rem',
          padding: '0.45rem 0.55rem',
          borderRadius: '5px',
          border: 'none',
          backgroundColor: isMaximized && fullscreenMode === 'timer_only' ? 'var(--accent-soft)' : 'transparent',
          color: isMaximized && fullscreenMode === 'timer_only' ? 'var(--accent-color)' : 'var(--text-color)',
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'background-color 0.12s ease'
        }}
        onMouseEnter={(e) => { if (!(isMaximized && fullscreenMode === 'timer_only')) e.currentTarget.style.backgroundColor = 'var(--accent-soft)'; }}
        onMouseLeave={(e) => { if (!(isMaximized && fullscreenMode === 'timer_only')) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <div
          style={{
            marginTop: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: '4px',
            backgroundColor: 'var(--accent-soft)',
            color: 'var(--accent-color)',
            flexShrink: 0
          }}
        >
          <Clock size={15} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '700', lineHeight: 1.25, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{t('header.fsTimerOnly', 'Solo cronómetro')}</span>
            {isMaximized && fullscreenMode === 'timer_only' && <Check size={12} style={{ marginLeft: 'auto' }} />}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted-text)', marginTop: '2px', lineHeight: 1.2 }}>
            {t('header.fsTimerOnlyDesc', 'Vista limpia únicamente con el reloj a pantalla completa')}
          </div>
        </div>
      </button>

      {/* Option 3: WITH country adder (all 3 panels) */}
      <button
        type="button"
        role="menuitem"
        onClick={() => handleSelectMode('with_adder')}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.65rem',
          padding: '0.45rem 0.55rem',
          borderRadius: '5px',
          border: 'none',
          backgroundColor: isMaximized && (fullscreenMode === 'with_adder' || fullscreenMode === 'all') ? 'var(--accent-soft)' : 'transparent',
          color: isMaximized && (fullscreenMode === 'with_adder' || fullscreenMode === 'all') ? 'var(--accent-color)' : 'var(--text-color)',
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'background-color 0.12s ease'
        }}
        onMouseEnter={(e) => { if (!(isMaximized && (fullscreenMode === 'with_adder' || fullscreenMode === 'all'))) e.currentTarget.style.backgroundColor = 'var(--accent-soft)'; }}
        onMouseLeave={(e) => { if (!(isMaximized && (fullscreenMode === 'with_adder' || fullscreenMode === 'all'))) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <div
          style={{
            marginTop: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: '4px',
            backgroundColor: 'var(--accent-soft)',
            color: 'var(--accent-color)',
            flexShrink: 0
          }}
        >
          <Columns3 size={15} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '700', lineHeight: 1.25, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{t('header.fsWithAdder', 'Completo (con añadir países)')}</span>
            {isMaximized && (fullscreenMode === 'with_adder' || fullscreenMode === 'all') && <Check size={12} style={{ marginLeft: 'auto' }} />}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted-text)', marginTop: '2px', lineHeight: 1.2 }}>
            {isDebate
              ? t('header.fsWithAdderDebateDesc', 'Pizarra de mociones, cronómetro y buscador de delegaciones')
              : t('header.fsWithAdderGSLDesc', 'Lista de oradores, cronómetro y buscador de delegaciones')}
          </div>
        </div>
      </button>
    </div>
  );

  // When already in fullscreen, provide quick mode switcher dropdown and exit button
  if (isMaximized) {
    return (
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          ...style
        }}
      >
        {/* Dropdown to switch between the 3 fullscreen modes */}
        <button
          type="button"
          onClick={() => setDropdownOpen(prev => !prev)}
          aria-haspopup="true"
          aria-expanded={dropdownOpen}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.28rem 0.6rem',
            fontSize: '0.74rem',
            fontWeight: '650',
            borderRadius: 'var(--border-radius, 6px)',
            border: `1px solid ${dropdownOpen ? 'var(--accent-color)' : 'var(--border-color)'}`,
            backgroundColor: dropdownOpen ? 'var(--accent-soft)' : 'var(--panel-color)',
            color: dropdownOpen ? 'var(--accent-color)' : 'var(--text-color)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title={t('header.fsLayoutOptions', 'Cambiar modo de pantalla completa')}
        >
          {getModeIcon()}
          <span>{getModeLabel()}</span>
          <ChevronDown
            size={11}
            style={{
              transform: dropdownOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease'
            }}
          />
        </button>

        {dropdownOpen && renderDropdownOptions()}

        {/* Exit fullscreen button */}
        <button
          type="button"
          onClick={handleExit}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.28rem 0.6rem',
            fontSize: '0.74rem',
            fontWeight: '650',
            borderRadius: 'var(--border-radius, 6px)',
            border: '1px solid var(--accent-color)',
            backgroundColor: 'var(--accent-soft)',
            color: 'var(--accent-color)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title={t('header.exitFullscreen', 'Salir de Pantalla Completa')}
        >
          <Minimize2 size={13} />
          <span>{t('common.exit', 'Salir')}</span>
        </button>
      </div>
    );
  }

  // Not in fullscreen: Button with dropdown displaying the 3 options
  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        ...style
      }}
    >
      <button
        type="button"
        onClick={() => setDropdownOpen(prev => !prev)}
        aria-haspopup="true"
        aria-expanded={dropdownOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.28rem 0.6rem',
          fontSize: '0.74rem',
          fontWeight: '600',
          borderRadius: 'var(--border-radius, 6px)',
          border: `1px solid ${dropdownOpen ? 'var(--accent-color)' : 'var(--border-color)'}`,
          backgroundColor: dropdownOpen ? 'var(--accent-soft)' : 'transparent',
          color: dropdownOpen ? 'var(--accent-color)' : 'var(--text-color)',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        title={t('header.fullscreenPresentation', 'Opciones de pantalla completa')}
      >
        <Maximize2 size={13} />
        <span>{t('header.fullscreenShort', 'Pantalla completa')}</span>
        <ChevronDown
          size={12}
          style={{
            transform: dropdownOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease'
          }}
        />
      </button>

      {dropdownOpen && renderDropdownOptions()}
    </div>
  );
};

export default FullscreenButtonDropdown;
