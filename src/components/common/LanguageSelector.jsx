import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { AVAILABLE_LANGUAGES, changeAppLanguage } from '../../languages';

/**
 * Selector de idioma modular y reutilizable.
 * Muestra automáticamente todos los idiomas registrados en `AVAILABLE_LANGUAGES`.
 */
export default function LanguageSelector({ showIcon = true, className = '', style = {} }) {
  const { i18n } = useTranslation();
  const { isLight } = useAccessibility();
  const currentLang = i18n.language || 'es';

  return (
    <div 
      className={`language-selector-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        ...style
      }}
    >
      {showIcon && <Globe size={16} style={{ opacity: 0.8, color: 'var(--text-color)' }} />}
      <select
        value={currentLang}
        onChange={(e) => changeAppLanguage(e.target.value)}
        aria-label="Seleccionar idioma / Select language"
        style={{
          backgroundColor: isLight ? '#ffffff' : 'var(--card-header-bg, #1e1e24)',
          color: 'var(--text-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '0.35rem 0.6rem',
          fontSize: '0.85rem',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.2s ease',
          fontWeight: '600',
          boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
        }}
      >
        {AVAILABLE_LANGUAGES.map((lang) => (
          <option 
            key={lang.code} 
            value={lang.code} 
            style={{ 
              backgroundColor: isLight ? '#ffffff' : '#18181b', 
              color: isLight ? '#0f172a' : '#ffffff' 
            }}
          >
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
