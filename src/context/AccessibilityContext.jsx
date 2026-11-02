import i18n from '../languages/index.js';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import configMaster from '../config/config_master.json';

const AccessibilityContext = createContext(null);

export const defaultDark = {
  paletteVersion: 6,
  backgroundColor: "#2c2c2c",
  panelColor: "#363636",
  headerColor: "#2c2c2c",
  subnavColor: "#2c2c2c",
  cardHeaderColor: "#303030",
  textColor: "#f7f2eb",
  primaryColor: "#b45432",
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  borderRadius: "6px"
};

export const defaultLight = {
  paletteVersion: 6,
  backgroundColor: "#ffffff",
  panelColor: "#ffffff",
  headerColor: "#ffffff",
  subnavColor: "#f5f4f0",
  cardHeaderColor: "#f5f4f0",
  textColor: "#202020",
  primaryColor: "#b85434",
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  borderRadius: "6px"
};

export const getThemeCssVars = (theme, accessibility) => {
  const isLight = accessibility?.themeMode === 'light';
  const t = theme || (isLight ? defaultLight : defaultDark);

  return {
    '--bg-color': t.backgroundColor || (isLight ? '#ffffff' : '#2c2c2c'),
    '--panel-color': t.panelColor || (isLight ? '#ffffff' : '#363636'),
    '--panel-bg': t.panelColor || (isLight ? '#ffffff' : '#363636'),
    '--card-header-bg': t.cardHeaderColor || (isLight ? '#f5f4f0' : '#303030'),
    '--card-hover': isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.04)',
    '--input-bg': isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
    '--header-bg': t.headerColor || (isLight ? '#ffffff' : '#2c2c2c'),
    '--subnav-bg': t.subnavColor || (isLight ? '#f5f4f0' : '#2c2c2c'),
    '--text-color': t.textColor || (isLight ? '#202020' : '#f7f2eb'),
    '--muted-text': isLight ? '#66625d' : '#b9b9b9',
    '--border-color': isLight ? '#dcd8d1' : '#4b4b4b',
    '--subborder-color': isLight ? '#e6e3dc' : '#414141',
    '--btn-bg': t.primaryColor || (isLight ? '#b85434' : '#b45432'),
    '--btn-text': '#ffffff',
    '--accent-color': isLight ? '#a84728' : '#efa37f',
    '--accent-soft': isLight ? 'rgba(184,84,52,0.07)' : 'rgba(239,163,127,0.08)',
    '--success-color': isLight ? '#245e39' : '#a4d4b3',
    '--success-solid': '#34724b',
    '--success-soft': isLight ? 'rgba(36,94,57,0.09)' : 'rgba(116,183,138,0.20)',
    '--danger-color': isLight ? '#a33d34' : '#edaaa1',
    '--danger-solid': '#a95449',
    '--danger-soft': isLight ? 'rgba(163,61,52,0.09)' : 'rgba(220,130,117,0.18)',
    '--info-color': isLight ? '#335f85' : '#a6b8c9',
    '--info-solid': '#335f85',
    '--info-soft': isLight ? 'rgba(51,95,133,0.08)' : 'rgba(166,184,201,0.10)',
    '--warning-color': isLight ? '#7a591e' : '#cbb58d',
    '--warning-solid': '#7a591e',
    '--warning-soft': isLight ? 'rgba(122,89,30,0.08)' : 'rgba(203,181,141,0.10)',
    '--grid-line': isLight ? '#dedad3' : '#414141',
    '--timer-display-bg': 'transparent',
    '--timer-display-border': 'transparent',
    '--timer-display-shadow': 'none',
    '--timer-digits-shadow': isLight ? 'none' : '0 4px 20px rgba(0,0,0,0.7)',
    '--timer-orange-bg': isLight ? '#fff7ed' : '#431407',
    '--timer-orange-color': isLight ? '#ea580c' : '#f97316',
    '--timer-orange-border': '#f97316',
    '--timer-negative-bg': isLight ? '#fef2f2' : '#3f0c0c',
    '--timer-negative-color': isLight ? '#dc2626' : '#ef4444',
    '--timer-negative-border': '#ef4444',
    '--border-radius': t.borderRadius || '6px',
    '--scrollbar-thumb': isLight ? 'rgba(120, 115, 110, 0.28)' : 'rgba(148, 163, 184, 0.25)',
    '--scrollbar-thumb-hover': isLight ? 'rgba(120, 115, 110, 0.50)' : 'rgba(148, 163, 184, 0.55)',
    '--slider-track-bg': isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)',
    '--slider-track-hover': isLight ? 'rgba(0, 0, 0, 0.10)' : 'rgba(255, 255, 255, 0.15)',
    '--font-family': accessibility?.dyslexiaMode 
      ? "'OpenDyslexic', 'Atkinson Hyperlegible', 'Lexend', 'Comic Sans MS', sans-serif"
      : (t.fontFamily || 'Inter, system-ui, -apple-system, sans-serif')
  };
};

export const sanitizeConfig = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return configMaster;

  const validLayouts = (raw.layouts && typeof raw.layouts === 'object' && !Array.isArray(raw.layouts))
    ? { ...configMaster.layouts, ...raw.layouts }
    : configMaster.layouts;

  if (validLayouts.LAB !== undefined && validLayouts.LIBRE === undefined) {
    delete validLayouts.LAB;
    validLayouts.LIBRE = [];
  }


  const baseTheme = raw.accessibility?.themeMode === 'light' ? defaultLight : defaultDark;
  const savedTheme = raw.theme?.paletteVersion === 6 ? raw.theme : {
    ...baseTheme,
    fontFamily: raw.theme?.fontFamily || baseTheme.fontFamily,
    borderRadius: raw.theme?.borderRadius || baseTheme.borderRadius
  };

  return {
    theme: (savedTheme && typeof savedTheme === 'object' && !Array.isArray(savedTheme))
      ? { ...baseTheme, ...savedTheme }
      : configMaster.theme,
    accessibility: (raw.accessibility && typeof raw.accessibility === 'object' && !Array.isArray(raw.accessibility)) 
      ? { ...configMaster.accessibility, ...raw.accessibility } 
      : configMaster.accessibility,
    layouts: validLayouts
  };
};

export const AccessibilityProvider = ({ children }) => {
  // Cargar configuración desde localStorage si existe, o usar configMaster por defecto
  const [config, setConfigState] = useState(() => {
    try {
      const saved = localStorage.getItem('openmun_config');
      if (saved) {
        return sanitizeConfig(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Error al leer config de localStorage:', err);
    }
    return configMaster;
  });

  const setConfig = useCallback((updater) => {
    setConfigState(prev => {
      const nextVal = typeof updater === 'function' ? updater(prev) : updater;
      return sanitizeConfig(nextVal);
    });
  }, []);

  const [isAccessOpen, setIsAccessOpen] = useState(false);

  const acc = config.accessibility || { dyslexiaMode: false, fontSizeScale: 1, colorblindMode: 'none', themeMode: 'dark', densityMode: 'standard' };
  const isLight = acc.themeMode === 'light';
  const densityMode = acc.densityMode || 'standard';

  // Alternar entre modo claro y oscuro
  const toggleThemeMode = useCallback(() => {
    const nextMode = isLight ? 'dark' : 'light';
    const newTheme = nextMode === 'light' ? { ...defaultLight } : { ...defaultDark };

    setConfig(prev => ({
      ...prev,
      theme: newTheme,
      accessibility: {
        ...prev.accessibility,
        themeMode: nextMode
      }
    }));
  }, [isLight, setConfig]);

  // Cambiar modo de densidad ('compact' | 'standard' | 'projector')
  const setDensityMode = useCallback((mode) => {
    const validMode = ['compact', 'standard', 'projector'].includes(mode) ? mode : 'standard';
    setConfig(prev => ({
      ...prev,
      accessibility: {
        ...prev.accessibility,
        densityMode: validMode
      }
    }));
  }, [setConfig]);

  // Ciclar entre densidades (Compacta -> Estándar -> Proyección -> Compacta)
  const cycleDensityMode = useCallback(() => {
    const modes = ['compact', 'standard', 'projector'];
    const currentIndex = modes.indexOf(densityMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setDensityMode(modes[nextIndex]);
  }, [densityMode, setDensityMode]);

  // Aplicar variables CSS, filtro de daltonismo, modo dislexia, densidad y tamaño de fuente al elemento raíz
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const body = document.body;
    const currentAcc = config?.accessibility || { dyslexiaMode: false, fontSizeScale: 1, colorblindMode: 'none', themeMode: 'dark', densityMode: 'standard' };
    const currentTheme = config?.theme;
    const currentDensity = currentAcc.densityMode || 'standard';

    // 1. Establecer variables CSS del tema en :root
    const vars = getThemeCssVars(currentTheme, currentAcc);
    Object.entries(vars).forEach(([key, val]) => {
      root.style.setProperty(key, val);
    });

    // 2. Escalado proporcional de tamaño de letra en :root (html) considerando modo de densidad
    const densityFactor = currentDensity === 'compact' ? 0.88 : (currentDensity === 'projector' ? 1.20 : 1.0);
    const scale = (currentAcc.fontSizeScale || 1) * densityFactor;
    root.style.fontSize = `${scale * 100}%`;

    // 3. Modo Dislexia
    const isDyslexia = !!currentAcc.dyslexiaMode;
    body.classList.toggle('dyslexia-mode', isDyslexia);
    root.classList.toggle('dyslexia-mode', isDyslexia);

    // 4. Modo de Densidad (compact, standard, projector)
    ['density-compact', 'density-standard', 'density-projector'].forEach(cls => {
      root.classList.remove(cls);
      body.classList.remove(cls);
    });
    root.classList.add(`density-${currentDensity}`);
    body.classList.add(`density-${currentDensity}`);

    // 5. Clase y atributo de tema claro/oscuro
    root.classList.toggle('light-theme', isLight);
    body.classList.toggle('light-theme', isLight);
    root.setAttribute('data-theme', isLight ? 'light' : 'dark');

    // 6. Filtro de Daltonismo
    let filterString = 'none';
    if (currentAcc.colorblindMode === 'protanopia') filterString = 'contrast(90%) hue-rotate(15deg)';
    if (currentAcc.colorblindMode === 'deuteranopia') filterString = 'contrast(90%) hue-rotate(-15deg)';
    if (currentAcc.colorblindMode === 'tritanopia') filterString = 'sepia(50%) hue-rotate(180deg)';
    if (currentAcc.colorblindMode === 'achromatopsia') filterString = 'grayscale(100%)';
    root.style.filter = filterString;
  }, [config]);

  // Guardar en localStorage con debounce ligero (200ms) para no bloquear el hilo principal durante drags/resizes
  const saveTimeoutRef = useRef(null);
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem('openmun_config', JSON.stringify(config));
      } catch (err) {
        console.error('Error guardando config en localStorage:', err);
      }
    }, 200);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [config]);

  // Escuchar cambios de almacenamiento para sincronizar entre pestañas/ventanas abiertas
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'openmun_config' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed) {
            setConfig(parsed);
          }
        } catch (err) {
          console.error('Error parseando config de storage:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [setConfig]);

  const openAccessibilityModal = useCallback(() => setIsAccessOpen(true), []);
  const closeAccessibilityModal = useCallback(() => setIsAccessOpen(false), []);

  const contextValue = useMemo(() => ({
    config,
    setConfig,
    accessibility: acc,
    theme: config.theme || (isLight ? defaultLight : defaultDark),
    isLight,
    toggleThemeMode,
    densityMode,
    setDensityMode,
    cycleDensityMode,
    isAccessOpen,
    setIsAccessOpen,
    openAccessibilityModal,
    closeAccessibilityModal
  }), [
    config,
    setConfig,
    acc,
    isLight,
    toggleThemeMode,
    densityMode,
    setDensityMode,
    cycleDensityMode,
    isAccessOpen,
    openAccessibilityModal,
    closeAccessibilityModal
  ]);

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(i18n.t('ui.useaccessibilityMustBeUsedWithinAnAccessibilityprovider'));
  }
  return context;
};
