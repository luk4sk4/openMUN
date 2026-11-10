# Graph Report - luax-openmun  (2026-11-10)

## Corpus Check
- LUAX source snapshot from /home/ubuntu/openMUN. Graphify detected 16 code and configuration files. The snapshot excluded .env, dependencies, database data, and the package lock. Password literals were redacted before extraction.
- Graphify did not parse src/db/schema.sql because the SQL parser was unavailable. It identified ecosystem.config.js and src/sockets/index.js as files without extracted symbols. The deployment map below comes from direct inspection.

## Summary
- 85 nodes · 98 edges · 9 communities (6 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Dependencias Node.js
- Arranque HTTP y base
- PostgreSQL en Docker
- API de notas
- Sockets y persistencia
- API de comites
- API de conferencias
- Prueba de carga Socket.IO

## God Nodes (most connected - your core abstractions)
1. `postgres` - 7 edges
2. `express` - 6 edges
3. `environment` - 4 edges
4. `initDB()` - 3 edges
5. `cors` - 3 edges
6. `pg` - 3 edges
7. `socket.io` - 3 edges
8. `socket.io-client` - 3 edges
9. `startServer()` - 2 edges
10. `cors@^2.8.6` - 2 edges

## Surprising Connections (you probably didn't know these)
- `startServer()` --calls--> `initDB()`  [EXTRACTED]
  server.js → src/db/init.js

## Import Cycles
- None detected.

## Communities (9 total, 3 thin omitted)

### Dependencias Node.js
Cohesion: 0.12
Nodes (20): author, dependencies, cors@^2.8.6, dotenv@^18.0.9, nodemailer@^10.3.1, pg@^8.23.1, socket.io@^4.8.4, description (+12 more)

### Arranque HTTP y base
Cohesion: 0.15
Nodes (10): app, cors, express, http, io, { Server }, startServer(), fs (+2 more)

### PostgreSQL en Docker
Cohesion: 0.14
Nodes (13): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, container_name, environment, image, ports, restart (+5 more)

### API de notas
Cohesion: 0.25
Nodes (4): express@^5.3.0, express, express, router

### Sockets y persistencia
Cohesion: 0.25
Nodes (3): { Pool }, crypto, debounceBuffers

### Prueba de carga Socket.IO
Cohesion: 0.50
Nodes (3): socket.io-client@^4.8.4, socket.io-client, { io }

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `API de notas` to `Dependencias Node.js`, `Arranque HTTP y base`, `API de comites`, `API de conferencias`?**
  _High betweenness centrality (0.204) - this node is a cross-community bridge._
- **Should `Dependencias Node.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11904761904761904 - nodes in this community are weakly interconnected._
- **Why does `pg` connect `Dependencias Node.js` to `Sockets y persistencia`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Should `PostgreSQL en Docker` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Dependencias Node.js` to `API de notas`, `Prueba de carga Socket.IO`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
## Verified deployment map

- Nginx sends api.openmun.app to localhost:3000. PM2 runs the legacy comites-app from /home/ubuntu/comites on that port.
- The new PM2 process openmun-backend runs /home/ubuntu/openMUN/server.js on port 3005. Its PostgreSQL connection targets 127.0.0.1:5433, published by the openmun-postgres container.
- src/db/init.js loads src/db/schema.sql at startup. The schema declares conferencias, comites, resoluciones, notas_intervenciones, mensajes, and checklist_staff.
- src/sockets/index.js registers the committee handlers in src/sockets/comites.socket.js.

## Source review findings

- `src/sockets/comites.socket.js:35` and `:66` accept role and identity fields from the joining client. The moderation handler at `:153` does not check a server-verified staff role. A client that reaches the new Socket.IO listener could claim a staff role or send moderation events.
- `src/db/init.js:6` catches schema initialization errors without propagating them. PM2 can report the HTTP process online even if database initialization failed.
- Database password literals are present in the deployed source and Compose configuration. They were removed from the analysis copy before extraction.
