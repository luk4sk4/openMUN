# React Architecture Audit: Modularity and Component-Reuse

## High Impact (High Reward, Moderate Effort)

### 1. Unify Modals and Overlay Wrappers

**Issue (UI & Logic Duplication):**
Several modal components (`AccessibilityModal`, `CloudSessionsModal`, `CommandPaletteModal`, `ConfirmModal`, `CreateConferenceModal`, `DriveSessionsModal`, `EditarPaisModal`, `ExportSessionModal`, `LiveSessionModal`, and `QuickAddCountryModal`) duplicate the exact same background overlay markup, `isOpen` guard logic (`if (!isOpen) return null;`), CSS styling for fixed positioning, blur backdrops, and z-index management.

**Recommended File Paths:**
- Create: `src/components/common/ModalOverlay.jsx`
- Modify: `src/components/modals/*.jsx`

**JavaScript Prop Definitions:**
```jsx
// src/components/common/ModalOverlay.jsx
import React from 'react';
import PropTypes from 'prop-types';

const ModalOverlay = ({
  isOpen,
  onClose,
  children,
  closeOnBackdropClick = true,
  zIndex = 9999,
  overlayColor = 'rgba(0, 0, 0, 0.75)',
  blur = '4px',
}) => { ... };

ModalOverlay.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  closeOnBackdropClick: PropTypes.bool,
  zIndex: PropTypes.number,
  overlayColor: PropTypes.string,
  blur: PropTypes.string,
};
export default ModalOverlay;
```

**Migration Steps:**
1. Create `src/components/common/ModalOverlay.jsx` containing the shared background container and backdrop click listener to close the modal.
2. For each file in `src/components/modals/`, replace the `if (!isOpen) return null;` and the outer `<div style={{ position: 'fixed', ... }}>` container with the new `<ModalOverlay isOpen={isOpen} onClose={onClose}>` component.
3. Move the internal modal content (the white box container) inside the `ModalOverlay` as `children`.
4. Test keyboard events (e.g. `Esc` key to close) centrally within the `ModalOverlay`.

### 2. Consolidate Timer Logic (Custom Hook)

**Issue (Logic Duplication):**
Timer and countdown logic is highly duplicated across multiple widget components. Components such as `CronometroDual`, `CronometroEnmiendas`, `CronometroOnlyTime`, `CronometroPrincipal`, `GestorCrisis`, and `TeleNoticiasCrisis` all manage their own `setInterval`, clear interval timeouts, state for `corriendo` (running), and logic to increment/decrement seconds.

**Recommended File Paths:**
- Create: `src/hooks/useTimer.js`
- Modify: `src/components/widgets/Cronometro*.jsx`, `src/components/widgets/GestorCrisis.jsx`, `src/components/widgets/TeleNoticiasCrisis.jsx`

**JavaScript Prop Definitions (Hook API):**
```javascript
// src/hooks/useTimer.js
/**
 * @param {number} initialTime - The starting time in seconds.
 * @param {Object} options
 * @param {boolean} options.countdown - If true, counts down to 0. If false, counts up.
 * @param {Function} options.onComplete - Callback when countdown reaches 0.
 */
export function useTimer(initialTime = 60, options = { countdown: true }) {
  // Returns:
  // {
  //   time: number,
  //   isRunning: boolean,
  //   start: () => void,
  //   pause: () => void,
  //   reset: () => void,
  //   setTime: (time: number) => void,
  //   addTime: (seconds: number) => void
  // }
}
```

**Migration Steps:**
1. Create the `useTimer` hook in `src/hooks/useTimer.js` wrapping `useEffect`, `setInterval`, and internal state management.
2. In `CronometroPrincipal.jsx`, replace the localized `segundosRestantes` state, `corriendo` state, and the `setInterval` effect with `const { time, isRunning, start, pause, reset, addTime } = useTimer(60, { countdown: true });`.
3. Repeat the replacement process for `CronometroDual`, `CronometroEnmiendas`, and other files using manual `setInterval` loops.

## Medium Impact (Medium Reward, Low Effort)

### 3. Consolidate Basic Form Elements (Inputs and Buttons)

**Issue (Inconsistent Variants & UI Duplication):**
There are over 760 `<button>` tags and nearly 140 `<input>` tags spread across the application (e.g., `DashboardNavbar`, `ConfirmModal`, `SessionMenuDropdown`). Many of these implement their own raw inline styles (e.g., `style={{ background: 'transparent', border: 'none', ... }}`) and lack centralized theming or interaction states (hover, focus, disabled).

**Recommended File Paths:**
- Create: `src/components/common/Button.jsx`
- Create: `src/components/common/Input.jsx`
- Modify: `src/components/**/*.jsx` (Incremental replacement)

**JavaScript Prop Definitions:**
```jsx
// src/components/common/Button.jsx
import React from 'react';
import PropTypes from 'prop-types';

const Button = ({
  variant = 'primary', // 'primary', 'secondary', 'danger', 'ghost'
  size = 'md', // 'sm', 'md', 'lg'
  icon: Icon,
  children,
  isLoading,
  ...props
}) => { ... };

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  icon: PropTypes.elementType,
  isLoading: PropTypes.bool,
};
export default Button;

// src/components/common/Input.jsx
const Input = ({
  type = 'text',
  label,
  error,
  fullWidth = true,
  ...props
}) => { ... };
```

**Migration Steps:**
1. Implement the `Button` and `Input` components in `src/components/common/`, ensuring they handle CSS variables for theming correctly (e.g., `var(--btn-bg)`, `var(--text-color)`).
2. Begin incrementally swapping out inline-styled HTML buttons. A good starting point is highly visible UI components like `src/components/dashboard/DashboardNavbar.jsx` or basic forms in modals like `src/components/modals/ConfirmModal.jsx`.
3. Standardize hover and focus states within the new components to eliminate visual inconsistencies.
