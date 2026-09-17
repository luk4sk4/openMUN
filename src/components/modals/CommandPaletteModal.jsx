import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Command,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Plus,
  Minus,
  Home,
  Settings,
  Mic,
  Timer,
  Vote,
  FileSignature,
  BarChart2,
  LayoutGrid,
  Moon,
  Sun,
  Eye,
  Radio,
  Download,
  Shuffle,
  Users,
  X,
  Keyboard,
  PictureInPicture2,
  FileSpreadsheet,
  FileText,
  Megaphone
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useSession } from '../../context/SessionContext';

const CommandPaletteModal = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  openLiveModal,
  openExportModal,
  openAccessModal,
  openQuickAddCountry,
  openAvisosModal
}) => {
  const { t } = useTranslation();
  const { isLight, toggleThemeMode } = useAccessibility();
  const { oradoresCola, oradoresCaucus, avanzarOradorCaucus, removerOrador, paises } = useSession();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Enfocar input al abrir
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Lista de todos los comandos posibles
  const allCommands = useMemo(() => {
    return [
      // ── ACCIONES DE DEBATE Y CRONÓMETROS ──
      {
        id: 'announcements-center',
        category: 'Conferencia',
        title: 'Centro de Avisos & Comunicados',
        desc: 'Emitir y revisar avisos oficiales entre Mesas, Staff y Organización',
        icon: Megaphone,
        shortcut: 'V',
        action: () => {
          openAvisosModal?.();
        }
      },
      {
        id: 'country-quick-add',
        category: 'Debate',
        title: t('palette.quickAddCountry', 'Añadir País al Debate Activo'),
        desc: t('palette.quickAddCountryDesc', 'Busca y agrega una delegación directamente a la lista de oradores o caucus'),
        icon: Users,
        shortcut: 'A',
        action: () => {
          openQuickAddCountry?.();
        }
      },
      {
        id: 'timer-toggle',
        category: 'Debate',
        title: t('palette.toggleTimer', 'Pausar / Reanudar Cronómetro'),
        desc: t('palette.toggleTimerDesc', 'Alterna el estado del cronómetro activo en GSL o Debate'),
        icon: Play,
        shortcut: 'Espacio',
        action: () => {
          window.dispatchEvent(new CustomEvent('openmun_hotkey_toggle_timer'));
        }
      },
      {
        id: 'timer-next',
        category: 'Debate',
        title: t('palette.nextSpeaker', 'Siguiente Orador'),
        desc: t('palette.nextSpeakerDesc', 'Pasa el turno a la siguiente delegación en cola'),
        icon: SkipForward,
        shortcut: 'N',
        action: () => {
          window.dispatchEvent(new CustomEvent('openmun_hotkey_next_speaker'));
        }
      },
      {
        id: 'timer-reset',
        category: 'Debate',
        title: t('palette.resetTimer', 'Reiniciar Tiempo de Cronómetro'),
        desc: t('palette.resetTimerDesc', 'Restablece el tiempo del orador o caucus'),
        icon: RotateCcw,
        shortcut: 'R',
        action: () => {
          window.dispatchEvent(new CustomEvent('openmun_hotkey_reset_timer'));
        }
      },
      {
        id: 'timer-add-15',
        category: 'Debate',
        title: t('palette.add15Sec', 'Añadir +15 Segundos'),
        desc: t('palette.add15SecDesc', 'Suma 15 segundos al cronómetro activo'),
        icon: Plus,
        shortcut: '+15s',
        action: () => {
          window.dispatchEvent(new CustomEvent('openmun_hotkey_adjust_time', { detail: { delta: 15 } }));
        }
      },
      {
        id: 'timer-sub-15',
        category: 'Debate',
        title: t('palette.sub15Sec', 'Restar -15 Segundos'),
        desc: t('palette.sub15SecDesc', 'Resta 15 segundos al cronómetro activo'),
        icon: Minus,
        shortcut: '-15s',
        action: () => {
          window.dispatchEvent(new CustomEvent('openmun_hotkey_adjust_time', { detail: { delta: -15 } }));
        }
      },
      {
        id: 'analytics-view',
        category: 'Analíticas',
        title: 'Ver Analíticas y Gráficos de Participación',
        desc: 'Visualiza el podio de oradores, balance GSL/Caucus y delegaciones silenciosas',
        icon: BarChart2,
        shortcut: 'Alt + 7',
        action: () => setActiveTab('INFO')
      },

      // ── NAVEGACIÓN DE PESTAÑAS ──
      {
        id: 'tab-home',
        category: 'Navegación',
        title: t('tabs.home', 'Ir a Inicio'),
        desc: t('palette.tabHomeDesc', 'Vista principal y bienvenida'),
        icon: Home,
        shortcut: 'Alt + 1',
        action: () => setActiveTab('HOME')
      },
      {
        id: 'tab-setup',
        category: 'Navegación',
        title: t('tabs.setup', 'Ir a Comienzo y Agenda'),
        desc: t('palette.tabSetupDesc', 'Matriz de asistencia, agenda e importación'),
        icon: Settings,
        shortcut: 'Alt + 2',
        action: () => setActiveTab('COMIENZO')
      },
      {
        id: 'tab-gsl',
        category: 'Navegación',
        title: t('tabs.gsl', 'Ir a Lista General de Oradores (GSL)'),
        desc: t('palette.tabGslDesc', 'Cronómetro principal y cola de discursos'),
        icon: Mic,
        shortcut: 'Alt + 3',
        action: () => setActiveTab('GSL')
      },
      {
        id: 'tab-debate',
        category: 'Navegación',
        title: t('tabs.debate', 'Ir a Debate y Mociones'),
        desc: t('palette.tabDebateDesc', 'Pizarra de mociones y cronómetro de caucus'),
        icon: Timer,
        shortcut: 'Alt + 4 / M',
        action: () => setActiveTab('DEBATE')
      },
      {
        id: 'tab-voting',
        category: 'Navegación',
        title: t('tabs.voting', 'Ir a Votación Oficial'),
        desc: t('palette.tabVotingDesc', 'Votación nominal, mapa de votos y quórum'),
        icon: Vote,
        shortcut: 'Alt + 5 / V',
        action: () => setActiveTab('VOTING')
      },
      {
        id: 'tab-amendments',
        category: 'Navegación',
        title: t('tabs.amendments', 'Ir a Enmiendas y Resolución'),
        desc: t('palette.tabAmendmentsDesc', 'Controlador de enmiendas y proyecto de resolución'),
        icon: FileSignature,
        shortcut: 'Alt + 6',
        action: () => setActiveTab('ENMIENDAS')
      },
      {
        id: 'tab-info',
        category: 'Navegación',
        title: t('tabs.info', 'Ir a Información y Quórum'),
        desc: t('palette.tabInfoDesc', 'Histórico de oradores y matriz de países'),
        icon: BarChart2,
        shortcut: 'Alt + 7',
        action: () => setActiveTab('INFO')
      },
      {
        id: 'tab-custom',
        category: 'Navegación',
        title: t('tabs.custom', 'Ir a Panel Libre'),
        desc: t('palette.tabCustomDesc', 'Tablero personalizado de widgets'),
        icon: LayoutGrid,
        shortcut: 'Alt + 8',
        action: () => setActiveTab('LIBRE')
      },

      // ── AJUSTES Y PREFERENCIAS ──
      {
        id: 'pref-theme',
        category: 'Preferencias',
        title: isLight ? t('palette.themeDark', 'Cambiar a Modo Oscuro') : t('palette.themeLight', 'Cambiar a Modo Claro'),
        desc: t('palette.themeDesc', 'Alterna el contraste de color de la interfaz'),
        icon: isLight ? Moon : Sun,
        shortcut: '',
        action: () => toggleThemeMode()
      },
      {
        id: 'pref-access',
        category: 'Preferencias',
        title: t('accessibility.title', 'Abrir Accesibilidad y Tema'),
        desc: t('palette.accessDesc', 'Modo dislexia, daltonismo, tamaño de letra y colores'),
        icon: Eye,
        shortcut: '',
        action: () => openAccessModal?.()
      },
      {
        id: 'session-live',
        category: 'Sesión',
        title: t('header.liveSession', 'Sesión en Vivo / Conectar Sala'),
        desc: t('palette.liveDesc', 'Sincronizar con delegados y pantalla de proyección P2P'),
        icon: Radio,
        shortcut: '',
        action: () => openLiveModal?.()
      },
      {
        id: 'session-export',
        category: 'Sesión',
        title: t('header.exportSession', 'Exportar / Guardar Sesión'),
        desc: t('palette.exportDesc', 'Descargar respaldo en JSON o sincronizar con Drive'),
        icon: Download,
        shortcut: '',
        action: () => openExportModal?.()
      }
    ];
  }, [t, setActiveTab, toggleThemeMode, isLight, openAccessModal, openLiveModal, openExportModal]);

  // Filtrar comandos según texto de búsqueda
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase().trim();
    return allCommands.filter(cmd =>
      cmd.title.toLowerCase().includes(q) ||
      cmd.desc.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      (cmd.shortcut && cmd.shortcut.toLowerCase().includes(q))
    );
  }, [allCommands, query]);

  // Manejar navegación con flechas y enter
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const executeCommand = (cmd) => {
    onClose();
    setTimeout(() => {
      cmd.action();
    }, 50);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        paddingLeft: '1rem',
        paddingRight: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="anim-fade-scale"
        style={{
          width: '100%',
          maxWidth: '620px',
          backgroundColor: 'var(--panel-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh'
        }}
      >
        {/* Barra de Búsqueda Superior */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.85rem 1.1rem',
            borderBottom: '1px solid var(--subborder-color)',
            gap: '0.75rem',
            backgroundColor: 'var(--card-header-bg)'
          }}
        >
          <Search size={18} style={{ color: 'var(--muted-text)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('palette.searchPlaceholder', 'Escribe un comando o busca una acción... (ej. "orador", "debate", "tema")')}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-color)',
              fontSize: '0.95rem',
              fontFamily: 'inherit'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span
              style={{
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--muted-text)',
                fontWeight: '600'
              }}
            >
              ESC
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted-text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Lista de Resultados de Comandos */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.5rem'
          }}
        >
          {filteredCommands.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2.5rem 1rem',
                color: 'var(--muted-text)',
                fontSize: '0.85rem'
              }}
            >
              {t('palette.noResults', 'No se encontraron acciones que coincidan con')} "{query}"
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = selectedIndex === idx;
              const Icon = cmd.icon;

              return (
                <div
                  key={cmd.id}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    border: isSelected ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                    marginBottom: '2px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: isSelected ? 'var(--btn-bg)' : 'var(--card-header-bg)',
                        color: isSelected ? '#ffffff' : 'var(--text-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'background-color 0.1s ease'
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: isSelected ? '700' : '600',
                          color: isSelected ? '#ffffff' : 'var(--text-color)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {cmd.title}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--muted-text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {cmd.desc}
                      </span>
                    </div>
                  </div>

                  {/* Lado derecho: Categoría o Atajo de Teclado */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        color: 'var(--muted-text)',
                        opacity: 0.7,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid var(--border-color)',
                          color: isSelected ? '#93c5fd' : 'var(--text-color)',
                          fontWeight: '700',
                          fontFamily: 'inherit'
                        }}
                      >
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer con Ayuda de Teclado */}
        <div
          style={{
            padding: '0.6rem 1rem',
            borderTop: '1px solid var(--subborder-color)',
            backgroundColor: 'var(--card-header-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: 'var(--muted-text)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', border: '1px solid var(--border-color)' }}>↑↓</kbd> Navegar</span>
            <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', border: '1px solid var(--border-color)' }}>↵</kbd> Ejecutar</span>
            <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', border: '1px solid var(--border-color)' }}>esc</kbd> Cerrar</span>
          </div>
          <span style={{ opacity: 0.6 }}>OpenMUN Command Center</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPaletteModal;
