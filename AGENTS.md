# OpenMUN Agent Guidelines & Constraints

## Backend on LUAX

- Connect via SSH using the host and identity configured in the sibling `../LUAX.bat`. Use explicit paths for remote inspection.
- **New backend:** PM2 runs `openmun-backend` from a release under `/home/ubuntu/openMUN/releases/`, bound to `127.0.0.1:3005`. The deployment on 2026-11-10 imported a SQLite snapshot into PostgreSQL. Inspect PM2 for the active release before editing deployed code.
- **Legacy backend:** `/home/ubuntu/comites`. PM2 runs `comites-app` from its own `server.js` on port `3000`. As verified on 2026-11-10, Nginx routes `api.openmun.app` to this legacy listener. Check the live proxy configuration before assuming public traffic reaches the new backend.
- In the active release, `server.js` starts Express and Socket.IO. HTTP routes are in `src/routes/index.js`. Follow `src/sockets/index.js` to `src/sockets/comites.socket.js` for realtime rooms, debate state, messages, and moderation.
- PostgreSQL access lives in `src/config/db.js`. Run versioned schema updates with `src/db/migrate.js`; startup checks the schema through `src/db/init.js`. The new database is `openmun` on `127.0.0.1:5433`, published by the `openmun-postgres` container. Keep `.env`, keys, and database contents out of analysis snapshots.
- Both backends expire conferences one calendar year after the last recorded change and notices or messages one calendar month after creation. PostgreSQL cleanup lives in `src/db/cleanup.js`. The legacy SQLite cleanup lives in `/home/ubuntu/comites/server.js`.
- For the frontend compatibility matrix, the SQLite-to-PostgreSQL data map, and the cutover and recovery procedure, see the [LUAX migration runbook](docs/MIGRACION_LUAX.md).
- The [versionable LUAX backend](backend/luax/README.md) is separate from the legacy local `backend/server.js`. Review the new backend's session and deployment contract before publishing it to LUAX.

## Graphify

For the original LUAX backend structure, read [the graph report](graphify-out/luax/GRAPH_REPORT.md) or run `graphify query "<question>" --graph graphify-out/luax/graph.json`. That graph predates the hardened release. Use `backend/luax/` and the active PM2 release for the current contract.

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
