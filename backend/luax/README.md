# Backend nuevo de OpenMUN para LUAX

Copia versionable del backend nuevo. El proceso de LUAX y el frontend legado se gestionan por separado. El contrato de sesión y los snapshots de este backend requieren integrar y probar el cliente antes del corte. Véase el [runbook](../../docs/MIGRACION_LUAX.md).

## Preparación y roles

1. En ensayo, preparar un PostgreSQL 16 aislado. En LUAX, tomar los respaldos del runbook, congelar el backend durante la migración y usar su base dedicada en el puerto 5433.
2. Mantener `MIGRATION_DB_USER` y `MIGRATION_DB_PASSWORD` en la sesión privada de operación. El rol existente `openmun_admin` puede ejecutar la migración inicial y administrar el esquema. La aplicación debe usar un rol de login dedicado sin propiedad de los objetos. Generar contraseñas distintas y dos secretos aleatorios independientes de al menos 32 bytes para `PIN_PEPPER` y `BOOTSTRAP_TOKEN`. Evitar pasarlos por argumentos de comandos.
3. Ejecutar `npm ci` y `npm run migrate` desde este directorio. La migración adopta el esquema previo, amplía los campos de credenciales, convierte cualquier PIN en claro en un verificador y registra la versión de forma transaccional. Usar el mismo pepper en la migración y la aplicación.
4. Como operador de PostgreSQL, conceder al rol de la aplicación únicamente los permisos que usa este backend. Ejemplo desde `psql` sobre `openmun`, para un rol nuevo. Si ya existe, revisar privilegios y propiedad antes de reutilizarlo.

```sql
CREATE ROLE openmun_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
\password openmun_app
GRANT CONNECT ON DATABASE openmun TO openmun_app;
GRANT USAGE ON SCHEMA public TO openmun_app;
GRANT SELECT ON openmun_schema_versions TO openmun_app;
GRANT SELECT, INSERT ON conferencias, comites TO openmun_app;
GRANT UPDATE (ultimo_cambio) ON conferencias TO openmun_app;
GRANT UPDATE (estado_debate, debate_revision, actualizado_en) ON comites TO openmun_app;
GRANT SELECT, INSERT ON notas_intervenciones, mensajes TO openmun_app;
GRANT UPDATE (estado, motivo_moderacion) ON mensajes TO openmun_app;
GRANT USAGE ON SEQUENCE notas_intervenciones_id_seq, mensajes_id_seq TO openmun_app;
GRANT DELETE ON conferencias, mensajes TO openmun_app;
GRANT SELECT, INSERT, DELETE ON checklist_staff TO openmun_app;
GRANT UPDATE (completado) ON checklist_staff TO openmun_app;
GRANT USAGE ON SEQUENCE checklist_staff_id_seq TO openmun_app;
```

5. Configurar el entorno de ejecución a partir de `.env.example` con las credenciales de `openmun_app` y sin las del operador. Configurar `ALLOWED_ORIGINS` con orígenes exactos, separados por comas. Activar `TRUST_LOCAL_PROXY` solo si Nginx es el único punto de acceso y añade la dirección real a la cadena de proxy. PM2 fija `HOST=127.0.0.1`. Verificar localmente `curl -fsS http://127.0.0.1:3005/readyz` y que `ss -ltnp` muestra loopback. Repetir la comprobación externa desde una red independiente.
6. Para rotar PIN, detener el proceso nuevo y preparar en el gestor de secretos una lista JSON con entradas `{ "target": "admin|access|chair", "id": "id-de-recurso", "pin": "nuevo-pin" }`. Usar un valor real para `target`; `null` retira solo un PIN opcional. Cargarla por entrada estándar con `node src/db/rotate-pins.js` bajo las credenciales de operación. Entregar las credenciales nuevas por el canal autorizado. Si cambia el pepper, la lista debe cubrir todos los PIN activos; los verificadores previos no se pueden recalcular sin sus PIN. Reiniciar revoca las sesiones en memoria.
7. Rotar las contraseñas PostgreSQL expuestas en el servidor mediante `\password` en `psql` y actualizar los secretos de Compose, de la app y del operador según corresponda. Cambiar la variable de Compose por sí solo no cambia la contraseña de un volumen ya inicializado. Verificar conexiones del operador y de la app y que esta última carece de privilegios DDL.

## Contrato de acceso

- El alta de conferencia requiere `Authorization: Bearer <BOOTSTRAP_TOKEN>` y es una operación de administración de despliegue. Mantener el secreto fuera del frontend.
- `POST /api/conferencias/:id/acceso` admite `role: "org"` con el PIN de organización, o `role: "observer"` con el PIN de acceso si existe. El observador solo accede al resumen y avisos generales.
- `POST /api/comites/:id/acceso` requiere un PIN de mesa configurado. Organización puede emitir credenciales de mesa, staff, delegados y backroom mediante `POST /api/conferencias/:id/sesiones` con `comiteId`, `role` y `userId`. Entregar cada credencial por un canal privado al usuario asignado.
- Enviar el token en el encabezado Bearer para HTTP y mediante `auth.token` en Socket.IO. La sesión dura hasta ocho horas y se invalida al reiniciar PM2. La implementación usa un único proceso PM2. No habilitar clúster ni múltiples réplicas con este almacenamiento de sesiones.
- Unirse al comité con `{ comiteId }` y a la conferencia con `{ confId }`. El rol y la identidad vienen de la sesión. El cliente no debe confiar en PIN devueltos por la API.
- Enviar un snapshot público completo con `enviar-datos-debate` y `{ comiteId, revision, snapshot }`. El snapshot admite `topic`, `timer: { remainingSeconds, running }`, `speakers` como lista de textos y `motion` opcional. Ampliar el contrato explícitamente al integrar otros campos del debate. Mantener una secuencia de revisiones creciente por comité, a partir de la revisión recibida al entrar. Deltas y mensajes de control quedan fuera de esta ruta. Ignorar eventos de revisión anterior a la última aplicada. `persisted` confirma la revisión guardada y `superseded` indica que se sustituyó antes de escribir.
- Para mensajes, enviar `{ comiteId, content, target: { type, role, id } }`, con `id` obligatorio para destino directo. El servidor decide si requiere moderación. Staff resuelve por `{ comiteId, mensajeId, accion, motivo? }`. `mensajeId` es la cadena decimal devuelta por PostgreSQL. Un segundo intento de resolución recibe un conflicto y no reemite el mensaje.
- El checklist usa `GET/POST /api/conferencias/:id/checklist`, `PATCH/DELETE /api/conferencias/:id/checklist/:taskId` y `DELETE /api/conferencias/:id/checklist/completados`. Requiere una sesión de organización de esa conferencia. El listado y la limpieza de completadas admiten `comite_id=GLOBAL` o un ID de comité. Si se omite el filtro, abarcan la conferencia. En una instalación existente, aplicar los tres permisos de checklist anteriores al rol de la aplicación.
- Antes de pasar a producción, integrar los flujos del frontend actual, definir el acceso individual y ensayar la recuperación de mensajes y estados después de reiniciar. Las entregas en tiempo real son para conexiones activas; la base conserva los mensajes, pero esta versión no expone un endpoint de historial.

## Verificación

Ejecutar `npm test` con permiso de abrir y conectar a un puerto loopback efímero. Las pruebas incluyen el contrato HTTP/Socket.IO con una base simulada. El ensayo de migración, permisos y rollback debe ejecutarse también contra PostgreSQL 16 real antes de desplegar.

La prueba en un PostgreSQL 16 desechable comprobó la actualización desde el esquema previo, la repetición de la migración, la rotación y su rollback ante un objetivo inválido, el rechazo de DDL con el rol de aplicación y la persistencia de la última revisión. Para el corte todavía se necesita un ensayo con una copia privada del legado y el frontend integrado.

[Scrypt en Node.js](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback) · [Autenticación de Socket.IO](https://socket.io/docs/v4/middlewares/) · [CORS y WebSocket en Socket.IO](https://socket.io/docs/v4/handling-cors/)
