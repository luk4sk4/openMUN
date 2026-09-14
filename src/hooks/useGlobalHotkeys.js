import { useEffect } from 'react';

/**
 * Hook para atajos globales de teclado en OpenMUN.
 * Protegido contra interferencias al escribir en inputs, selects o textareas.
 */
export function useGlobalHotkeys({
  onOpenCommandPalette,
  onOpenQuickAddCountry,
  onToggleTimer,
  onNextSpeaker,
  onResetTimer,
  onSwitchTab,
  onCycleDensity,
  activeTab
}) {
  useEffect(() => {
    const isInputElement = (el) => {
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        el.isContentEditable
      );
    };

    const handleKeyDown = (e) => {
      const isInput = isInputElement(document.activeElement || e.target);

      // 1. Abrir Command Palette (Ctrl+K o Cmd+K) - Funciona incluso dentro de inputs
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenCommandPalette?.();
        return;
      }

      // 2. Ciclar modo de densidad (Ctrl+Shift+D o Alt+D)
      if (((e.ctrlKey && e.shiftKey) || e.altKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        onCycleDensity?.();
        return;
      }

      // 3. Atajos con Alt + Número para cambiar de pestañas (Alt+1 .. Alt+8)
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key >= '1' && e.key <= '8') {
        const tabList = ['HOME', 'COMIENZO', 'GSL', 'DEBATE', 'VOTING', 'ENMIENDAS', 'INFO', 'LIBRE'];
        const targetTab = tabList[parseInt(e.key, 10) - 1];
        if (targetTab) {
          e.preventDefault();
          onSwitchTab?.(targetTab);
          return;
        }
      }

      // Si el usuario está escribiendo en un formulario, no ejecutar atajos de un solo caracter
      if (isInput) {
        return;
      }

      // 3.1 Tecla A -> Buscador rápido de país para añadir al debate activo
      if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onOpenQuickAddCountry?.();
        return;
      }

      // 4. Espacio -> Iniciar / Pausar Cronómetro Activo
      if (e.code === 'Space') {
        e.preventDefault();
        if (onToggleTimer) {
          onToggleTimer();
        } else {
          window.dispatchEvent(new CustomEvent('openmun_hotkey_toggle_timer'));
        }
        return;
      }

      // 5. N -> Siguiente Orador
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (onNextSpeaker) {
          onNextSpeaker();
        } else {
          window.dispatchEvent(new CustomEvent('openmun_hotkey_next_speaker'));
        }
        return;
      }

      // 6. R -> Reiniciar Cronómetro
      if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (onResetTimer) {
          onResetTimer();
        } else {
          window.dispatchEvent(new CustomEvent('openmun_hotkey_reset_timer'));
        }
        return;
      }

      // 7. M -> Ir a Pizarra de Mociones / Debate
      if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onSwitchTab?.('DEBATE');
        return;
      }

      // 8. Alt+V o V -> Ir a Votación
      if ((e.altKey && e.key.toLowerCase() === 'v') || (e.key.toLowerCase() === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        e.preventDefault();
        onSwitchTab?.('VOTING');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onOpenCommandPalette,
    onOpenQuickAddCountry,
    onToggleTimer,
    onNextSpeaker,
    onResetTimer,
    onSwitchTab,
    onCycleDensity,
    activeTab
  ]);
}
