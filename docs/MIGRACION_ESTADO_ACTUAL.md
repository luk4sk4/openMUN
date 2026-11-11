# Migración integral: estado de trabajo, 10 de noviembre de 2026

No se ha hecho el corte público. La inspección SSH de este trabajo confirmó Nginx hacia `localhost:3000`, `comites-app` activo y el backend nuevo en `/home/ubuntu/openMUN/releases/hardened.CaDlqLDy`, ligado a `127.0.0.1:3005`.

## Cambios locales

- Esquema 4: estado privado por comité, verificadores de credenciales de participantes y correlación de reintentos de mensajes.
- Registro, edición de conferencias, creación/edición/borrado de comités y avisos con sesión y ámbito comprobados en servidor.
- Sesiones de secretariat, staff, backroom y delegate; configuración de verificadores desde Mesa u organización.
- Transporte `luax-join`, `luax-command`, `luax-snapshot`, con escritor único, selección de país comprobada, identidad derivada de sesión, notas persistidas y moderación por ID de base.
- Adaptador de cliente activado exclusivamente con `VITE_LUAX_API_URL`; los builds normales conservan el transporte anterior.
- Importador ampliado para cargar estado privado y una proyección pública sin PIN, notas ni datos personales de delegaciones; conserva el JSON original en el esquema restringido. Los destinos simbólicos de avisos se separan de las FK de comité.
- Pruebas de aislamiento de notas, sesiones, escritor único, identidad de voto, desconexión durante acceso y destinatarios de avisos.

## Trabajo obligatorio antes del corte

Actualización del ensayo: esquema 4 probado en PostgreSQL 16 real, incluido el rol de aplicación sin DDL y el manifiesto `src/db/app-grants.sql`. Importación real repetible: 8 conferencias, 10 comités, 1 tarea, 0 avisos; último ensayo en `/home/ubuntu/openmun-test.3TPS91sw`. Edición REST ahora actualiza la proyección pública y se bloquea mientras Mesa emite; autoguardado privado separado. Avisos internos persistidos e historial al entrar añadidos. Checklist de staff restringido a su comité. Notas esperan confirmación del servidor antes de mostrar éxito. Estos cambios todavía no se han desplegado.

1. Ensayar esquema 4, permisos SQL e importación contra PostgreSQL 16 real. El rol de aplicación necesita los nuevos permisos de columnas; el README todavía describe los permisos del despliegue anterior.
2. Resolver edición REST de estado frente a snapshots: actualmente PATCH combina el respaldo privado, mientras la lectura superpone el snapshot público previo. Probar importación/edición de roster y el autoguardado concurrente sin perder cambios.
3. Completar avisos internos `BROADCAST_ANNOUNCEMENT` / `DELETE_ANNOUNCEMENT`, checklist para staff y pantallas locales de staff cuando se usa el transporte nuevo. Probar todos los comandos y sus payloads reales.
4. Completar recuperación de mensajes, identidad persistente y extracción de notas anidadas del respaldo legado. Ahora las notas antiguas se conservan en el estado privado; aún no se normalizan en el historial de mensajería.
5. Revisar reintento de snapshots tras reconexión, cambios de credenciales y límites de comandos; comprobar que no se muestran confirmaciones de entrega antes del ack durable.
6. Recorrer el frontend real con Mesa, secretariat, staff, delegado y backroom, incluyendo votación, mociones, crisis, resoluciones, exportación e importación. El build compila, pero no sustituye ese ensayo.
7. Respaldar SQLite y PostgreSQL, congelar escritores, comparar cambios desde la importación anterior, importar y reconciliar la copia final. El importador exige destino vacío: no ejecutar contra la base poblada esperando que haga una actualización.
8. Publicar juntos frontend compatible y backend, validar Nginx y cambiar upstream solo después de pasar el ensayo. Conservar el legado y sus respaldos para recuperación. Actualizar AGENTS.md con el resultado real.

La retención solicitada sigue siendo un año natural de inactividad por conferencia y un mes natural desde el envío por mensaje. No se han borrado ni reemplazado bases remotas durante este trabajo.
