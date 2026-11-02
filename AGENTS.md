# OpenMUN Agent Guidelines & Constraints

## Mandatory Design Check Before Any UI / Frontend Changes

Before proposing, modifying, or creating any components, styles, layouts, or UI features in this repository, you **MUST** consult and adhere to the **OpenMUN Design System**:

1. **Skill**: [openmun-design](.agents/skills/openmun-design/SKILL.md)
2. **Reference Document**: [GUIA_DISENO.md](docs/GUIA_DISENO.md)

### Key Rules to Enforce:
- **Tokens First**: Never hardcode colors (hex, rgb). Use established CSS variables from `AccessibilityContext.jsx` (`--bg-color`, `--panel-color`, `--btn-bg`, `--accent-color`, `--border-color`, etc.).
- **Accent vs. Button Distinction**: `--btn-bg` is strictly for primary action buttons; `--accent-color` is strictly for text accent and selection highlights.
- **State Colors**: Semantic states (`--success-color`, `--danger-color`, etc.) must always be accompanied by labels, counts, or accessible icons—never color alone.
- **Surfaces & Borders**: Keep surfaces flat and continuous with `1px` subtle borders (`--border-radius: 6px`). Avoid gratuitous shadows, gradients, or deeply nested containers.
- **Accessibility & Themes**: Preserve user accessibility settings (dyslexia font, typography scaling). Check both Dark and Light themes. Ensure visible focus rings and responsive scaling down to mobile viewports.
