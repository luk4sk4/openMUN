# Integración del backend nuevo y migración de SQLite a PostgreSQL

Runbook de OpenMUN para LUAX. El 10 de noviembre de 2026 se importó una copia verificada de SQLite a PostgreSQL y se activó el backend nuevo en loopback. El corte público sigue pendiente.

El [backend versionable](../backend/luax/README.md) incorpora los controles de acceso, la migración de verificadores y la persistencia ordenada del debate. Las diferencias de contrato de esta guía parten de la versión anterior a ese despliegue. Antes del corte quedan la integración del cliente y la conciliación de las escrituras que el legado recibe después de la copia.

La importación registró 8 conferencias, 10 comités, 1 tarea y 0 avisos. El [importador](../backend/luax/src/db/import-sqlite.js) preservó los 10 documentos de estado originales en `legacy_import.committee_state`, sin acceso para el rol de aplicación. No proyectó esos documentos al formato de snapshot público nuevo. Los respaldos verificados permanecen en el directorio privado `/home/ubuntu/openmun-backups/migration.Vpg9GCKB`. El importador acepta repetir el mismo respaldo como operación idempotente. Una copia posterior requiere reconciliación, porque el destino ya contiene datos.

La retención usa UTC y plazos de calendario. Las conferencias caducan un año después del último cambio registrado. Los avisos y mensajes caducan un mes después de su creación. PostgreSQL comprueba ambos plazos al arrancar y cada hora. El legado comprueba conferencias diariamente y avisos cada hora. Un aviso desactivado deja de mostrarse de inmediato y conserva su plazo de borrado automático.

## 1. Estado inicial y estrategia

| Componente | Estado verificado |
| --- | --- |
| Entrada pública | `api.openmun.app` → Nginx → puerto `3000` |
| Backend legado | PM2 `comites-app`, `/home/ubuntu/comites/server.js` |
| Origen de datos | `/home/ubuntu/comites/data/openmun.db`, SQLite en modo WAL |
| Backend nuevo | PM2 `openmun-backend`, release bajo `/home/ubuntu/openMUN/releases/`, `127.0.0.1:3005` |
| Destino | PostgreSQL 16, base `openmun`, contenedor `openmun-postgres`, puerto de host `127.0.0.1:5433` |

El contenedor `app-db` del puerto `5432` queda fuera de esta migración. El legado también tiene una tarea de keepalive de Supabase. Antes del corte, confirmar con el responsable de la aplicación qué clientes o automatizaciones la consumen y quién la mantendrá. Revisar por separado los datos que solo existan en el navegador o en almacenamiento externo. El respaldo SQLite solo cubre lo que se escribió en SQLite.

El plan propuesto usa una ventana de mantenimiento con un único escritor. Primero se ensaya sobre copias aisladas. En producción se detienen las escrituras al legado, se toma el respaldo final, se importa y se valida antes de abrir el backend nuevo a usuarios. Mantener REST y Socket.IO en el mismo backend para cada conferencia durante toda la transición.

La persona que dirige el corte registra la versión desplegada de cada backend y frontend, hora de congelación, respaldo utilizado, resultados de conciliación y decisión de apertura. Una segunda persona valida desde los roles de organización, mesa, staff y delegado.

## 2. Contrato que debe quedar cubierto antes del corte

El acceso REST de ensayo se activa con `VITE_LUAX_API_URL` en el build de frontend. Usa un origen HTTPS o un HTTP de loopback y configura el origen del frontend en `ALLOWED_ORIGINS` del backend de ensayo. Sin esa variable se conserva el flujo legado. Con ella, REST y la dirección de Socket.IO apuntan al entorno de ensayo en vez de mezclarlo con la API pública.

Para publicar la versión nueva en paralelo al legado:

| Entorno | Frontend | API | Datos |
| --- | --- | --- | --- |
| Legado | `openmun.app` | `api.openmun.app` → LUAX :3000 | SQLite |
| Pruebas | `pruebas.openmun.app` | `pruebasapi.openmun.app` → LUAX :3006 | PostgreSQL de pruebas con datos ficticios |

1. En Cloudflare, crear el registro DNS proxied de `pruebasapi` con el mismo origen LUAX que `api`. Mantener TLS en modo Full (strict).
2. Preparar la release de pruebas en el puerto 3006 y migrar solo su base PostgreSQL. Usar credenciales de pruebas y configurar `ALLOWED_ORIGINS=https://pruebas.openmun.app`.
3. Añadir un bloque Nginx independiente a partir de [pruebasapi.nginx.conf](../backend/luax/deploy/pruebasapi.nginx.conf). Validar con `sudo nginx -t` antes de recargar y comprobar `https://pruebasapi.openmun.app/readyz`.
4. Compilar con `VITE_LUAX_API_URL=https://pruebasapi.openmun.app` y publicar los archivos en el sitio de pruebas existente. Antes de sustituir su build, conservar una copia para poder revertir. Comprobar REST, Socket.IO y una exportación e importación del historial con datos ficticios.

La vista de conferencia ya puede abrir una sesión de observador, leer el resumen, validar el PIN de organización o de Mesa y leer el comité con el alcance correspondiente. Una sesión de organización puede emitir la sesión de Mesa para un comité sin PIN. Los tokens de esta integración viven en memoria y recargar la aplicación requiere volver a autenticarse. La validación de acceso se prueba contra Express con una base simulada.

El modo de ensayo cubre acceso, lectura y el checklist para sesiones de organización. Las tareas se leen de PostgreSQL y la vista refresca la lista tras guardar un cambio. Los filtros permiten operar sobre toda la conferencia, sus tareas globales o un comité concreto. Para actualizar una instalación existente, aplicar los permisos de checklist indicados en el README del backend antes de iniciar esta versión.

Quedan por portar los eventos y snapshots de debate, la edición de conferencias y comités, los avisos y el acceso del resto de roles antes de habilitar el modo para tráfico público.

El frontend legado configura HTTP con `VITE_API_BASE_URL` y sockets con `VITE_SOCKET_SERVER_URL`. Ambos pueden acabar en `https://api.openmun.app` por defecto. Comprobar también el build que usa la PWA y el comportamiento de las pestañas que conservan una versión anterior.

| Flujo | Legado y consumidores | Trabajo para el backend nuevo |
| --- | --- | --- |
| Alta, acceso y resumen de conferencia | `POST /api/conferencias`, `POST /:id/acceso`, `GET /:id/resumen` bajo `/api/conferencias` | Existen rutas equivalentes. Comparar respuesta, errores, permisos, PIN de administración frente a PIN de acceso y visibilidad del correo. |
| Administración de conferencia | `PATCH /api/conferencias/:id` | Añadir el flujo con autorización de organización o retirar su uso del cliente mediante un cambio funcional aprobado. |
| Alta y lectura de comité | `POST /api/conferencias/:id/comites`, `GET /api/comites/:id`, `POST /api/comites/:id/acceso`. El cliente usa `datos_json`. | El nuevo usa `estado_debate` y `config_ui`. Adaptar entrada y salida para los clientes soportados. En actualizaciones parciales, conservar campos omitidos. La implementación actual puede sustituirlos por `{}`. Verificar también que el comité pertenece a la conferencia de la URL. |
| Edición y eliminación de comité | `PATCH /api/comites/:id`, `PATCH /api/comites/:id/estado` y dos rutas DELETE en el legado | Implementar y probar los flujos usados, incluidos tópico, tipo de sesión, bajas, cascadas y aislamiento entre conferencias. |
| Avisos | Alta y listado bajo `/api/conferencias/:id/avisos`, más desactivación y borrado. El cliente escucha `nuevo-aviso` y `aviso-desactivado`. | El nuevo tiene `enviar-aviso-conferencia` y `nuevo-aviso-conferencia`. Completar historial, filtros, alcance por comité, tipos, estado activo y entrega autorizada. Inventariar y probar el correo de avisos del legado si sigue siendo necesario. |
| Checklist | Listado, creación, toggle, borrado individual y borrado de completados | El modo de ensayo conecta las cinco operaciones con PostgreSQL. Solo una sesión de organización del ámbito indicado puede usar estas rutas. El acceso de staff sigue pendiente. |
| Notas y mensajes | El cliente envía mensajes tipados por el relay, incluidos solicitud y revisión de notas. | `/api/notas` cubre creación y lectura de notas de intervención. Acordar la equivalencia con notas privadas y moderadas. Los mensajes directos y pendientes del socket nuevo actualmente se emiten sin insertarse en PostgreSQL. Diseñar entrega durable, historial, reintentos y resolución de moderación por ID persistido. |
| Debate en tiempo real | `unirse-comite` acepta usos con cadena y objeto `{ sala, isHost }` en el cliente. `enviar-datos` usa `{ sala, json }`, y el cliente escucha `nuevos-datos` y `cargar-estado-inicial`. La unión a conferencia usa el ID. | El nuevo espera `{ comiteId, role, userId }` o `{ confId, role, userId }`, con eventos `enviar-datos-debate` y `nuevos-datos-debate`. Probar handshake y ack, snapshot inicial, reconexión, deltas, gzip si se conserva, desconexión y flujos tipados de votos, turnos, enmiendas y anuncios. |

La ruta de menor coordinación es mantener temporalmente una capa de compatibilidad REST y Socket.IO en el backend nuevo, con PostgreSQL como única fuente una vez hecho el corte. Hacer que formatos viejos y nuevos entren al mismo servicio autorizado y tengan el mismo efecto persistente. Otra opción dentro del mismo plan es exigir una actualización del cliente durante mantenimiento y rechazar explícitamente la versión antigua. Elegir y ensayar una de estas políticas antes de desplegar. Para cada evento, documentar nombre, payload, roles permitidos, confirmación, error, sala, destinatarios y efecto en la base.

### Seguridad y durabilidad

- Retirar los PIN de las respuestas de comité y listados de conferencia. El controlador nuevo expone `pin_mesa`, y la lectura de comité serializa toda la fila. Sustituir PIN en claro por verificadores, emitir una identidad de sesión validada y limitar intentos. Coordinar la rotación de PIN expuestos y de las credenciales de base presentes en el código y Compose. Separar el rol de la app del rol de migraciones.
- Validar sesión, conferencia, comité y rol en el servidor en cada acción HTTP y socket. Derivar `userId`, rol y pertenencia de la sesión. Para moderar, recuperar el mensaje pendiente por ID, comprobar ámbito y transición, guardar el resultado y emitir solo a sus destinatarios. El cliente puede enviar un ID y una decisión, no el mensaje a aprobar.
- Limitar CORS a los orígenes del despliegue, validar payloads y usar errores públicos sin detalles SQL. Confirmar que el puerto `3005` queda accesible solo desde Nginx o por el acceso privado de ensayo. La escucha observada es en `0.0.0.0`; verificar reglas de red en vez de inferir exposición pública.
- Hacer que la inicialización de base falle de forma visible. Hoy `src/db/init.js` captura errores y el proceso puede abrir HTTP igualmente. Aplicar cambios de esquema versionados y comprobar conexión y versión de esquema con un endpoint de disponibilidad para operación.
- Corregir el guardado de debate antes de abrir escrituras. `programarGuardadoDebate` reemplaza la entrada del búfer antes de mirar si tiene temporizador, de modo que una ráfaga puede programar varios. Además, la limpieza tras un `await` puede eliminar un estado más reciente. Mantener un temporizador y un orden de escritura por comité, asociar la confirmación durable al estado persistido y drenar la cola al cerrar. Separar snapshots persistibles de deltas y mensajes de control. Derivar `conferencia_id` del comité guardado y evitar inferirlo del ID.

## 3. Mapa de datos

| Origen SQLite | Destino PostgreSQL | Regla de transformación |
| --- | --- | --- |
| `conferencias` | `conferencias` | Preservar ID, nombre, correo y fechas. Migrar cada PIN al esquema de credenciales aprobado, conservando su función y los ceros iniciales durante la conversión. Mantener `NULL` cuando no hay PIN opcional. |
| `comites` | `comites` | Preservar ID, FK, nombre, tipo, tópico y fecha. Parsear `datos_json` una vez. Conservar en el respaldo el JSON original y transformar su estructura mediante un contrato versionado. Inicializar `config_ui` con `{}` cuando no existe una configuración utilizable. Aplicar la política de credenciales a `pin_mesa`. |
| `avisos` | Tabla de avisos compatible por añadir, o modelo de mensajes ampliado | Conservar ID, conferencia, comité opcional, emisor, tipo, cuerpo, activo y fecha. La tabla `mensajes` actual carece de campos equivalentes para tipo y activo. Probar fixtures de avisos activos, desactivados y dirigidos a comité aunque el origen observado esté vacío. |
| `checklist_staff` | `checklist_staff` | Preservar ID, ambas referencias, título, asignación y fecha. Convertir `0/1` a booleano y tratar `NULL` explícitamente. Reajustar la secuencia cuando se carguen IDs explícitos. |
| Objetos anidados del estado legado | `estado_debate`, `config_ui`, `resoluciones`, `notas_intervenciones` o `mensajes`, según contrato | Clasificar con fixtures de cada versión. Extraer solo estructuras cuya semántica y propietario se conozcan. Mantener los datos privados con control de acceso y una copia de origen protegida. |

El inventario exacto observado fue **8 conferencias, 10 comités, 0 avisos y 1 tarea** en SQLite, con cero errores en `PRAGMA foreign_key_check`. PostgreSQL tenía cero filas en sus seis tablas. Los identificadores revisados ya eran canónicos y los textos comprobados cabían en los límites del esquema nuevo. Todas las fechas observadas carecían de offset. Dos comités tenían `notes` como listas vacías y `config` como `null`. Usar estos resultados como referencia del ensayo y volver a medir al congelar escrituras.

### Reglas del importador

1. Inspeccionar tablas y versiones del JSON desde el respaldo. Rechazar filas huérfanas, IDs duplicados tras normalización, claves cruzadas entre conferencias, fechas inválidas, números fuera de rango, textos demasiado largos y JSON que PostgreSQL no pueda representar. Comparar `conferencia_id` explícito en ambos lados de cada referencia.
2. Confirmar que las fechas sin offset representan UTC antes de convertirlas a `TIMESTAMPTZ`. El esquema legado usa `CURRENT_TIMESTAMP`; revisar otros escritores y fixtures. Aplicar la zona de origen explícitamente y mantener el instante. Comprobar lecturas con clientes en zonas diferentes.
3. Separar con una lista permitida el estado público de notas, configuración, mensajes y campos privados. Evitar un volcado íntegro de `datos_json` en `estado_debate`, porque el socket nuevo envía esa columna al entrar. Conservar las claves desconocidas en el respaldo restringido, con un reporte que indique si requieren mapeo. Si se normalizan elementos anidados, generar una identidad determinista o registrar la relación origen-destino para impedir duplicados.
4. Ejecutar `plan` sobre el respaldo sin escribir. Debe producir versión del mapeo, huella del respaldo, cantidades por tabla y destino, errores y exclusiones justificadas. Emitir solo agregados o identificadores internos sin valores de PIN, correos ni texto privado. Un error de mapeo bloquea `apply`.
5. Ejecutar `apply` con consultas parametrizadas y columnas explícitas, dentro de una transacción. Importar conferencias, comités y luego dependientes. Registrar un lote único por huella y versión en la misma transacción. Ante un lote ya confirmado, comprobar la conciliación y salir sin duplicar. Ante colisión con filas ajenas o divergentes, abortar y revisar. Exigir un destino vacío para el corte inicial salvo que exista un plan de reconciliación ensayado.
6. Ajustar secuencias durante la ventana sin escritores y comprobar que el siguiente ID supera el máximo existente. Los efectos de `setval` no se revierten con una transacción PostgreSQL, así que incluir este paso explícito y repetible en el procedimiento de recuperación. Para una tabla recién cargada con IDs positivos, la comprobación y el ajuste se pueden preparar así. [Documentación de secuencias de PostgreSQL](https://www.postgresql.org/docs/16/functions-sequence.html)

```sql
SELECT setval(
  pg_get_serial_sequence('public.checklist_staff', 'id'),
  COALESCE(MAX(id), 1),
  COUNT(*) > 0
)
FROM public.checklist_staff;
```

Aplicar el patrón solo a secuencias de tablas a las que se asignaron IDs explícitos. Verificar que el rol operador puede escribir la secuencia y que el valor inicial del esquema coincide con el caso vacío.

## 4. Respaldo y ensayo en entorno aislado

Trabajar desde una sesión Linux en LUAX con la identidad configurada en `../LUAX.bat`. Los siguientes comandos crean respaldos privados. Verificar capacidad, retención y acceso antes de ejecutarlos. El código de aplicación, archivos de configuración y copias que contengan credenciales requieren el mismo control de acceso. Mantener las copias fuera del repositorio y del directorio público.

```bash
set -euo pipefail
umask 077
backup_dir="$(mktemp -d "$HOME/openmun-migration.XXXXXXXX")"
printf 'Backup directory: %s\n' "$backup_dir"

python3 - "$backup_dir/legacy.sqlite" <<'PY'
import sqlite3
import sys
from contextlib import closing

with closing(sqlite3.connect(
    "file:/home/ubuntu/comites/data/openmun.db?mode=ro", uri=True
)) as source, closing(sqlite3.connect(sys.argv[1])) as backup:
    source.backup(backup)
    if backup.execute("PRAGMA integrity_check").fetchall() != [("ok",)]:
        raise SystemExit("SQLite integrity check failed")
    if backup.execute("PRAGMA foreign_key_check").fetchone() is not None:
        raise SystemExit("SQLite foreign key check failed")
PY

docker exec -u postgres openmun-postgres pg_dump \
  -U openmun_admin -d openmun -Fc > "$backup_dir/postgres-before.dump"
docker exec -i -u postgres openmun-postgres pg_restore --list \
  < "$backup_dir/postgres-before.dump" > "$backup_dir/postgres-before.toc"
(
  cd "$backup_dir"
  sha256sum legacy.sqlite postgres-before.dump > SHA256SUMS
  sha256sum -c SHA256SUMS
)
```

La API de backup de SQLite obtiene una copia coherente incluyendo transacciones confirmadas presentes en el WAL. Copiar solo `openmun.db` mientras hay actividad puede omitirlas. `pg_dump -Fc` toma un respaldo lógico consistente y `pg_restore --list` comprueba que se lee el catálogo del archivo. La prueba de recuperación requiere restaurarlo en una base vacía y comprobarla. Registrar también roles y permisos mediante la configuración de despliegue, ya que el dump de una base no contiene todos los objetos globales del clúster. [SQLite backup en Python](https://docs.python.org/3/library/sqlite3.html#sqlite3.Connection.backup) · [pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html) · [pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html)

Para el ensayo, crear dos bases desechables en una instancia PostgreSQL 16 privada. En la primera, probar la restauración con `pg_restore --exit-on-error --single-transaction --no-owner --no-privileges --dbname=<base_de_restauracion> postgres-before.dump`. En la segunda, aplicar las migraciones versionadas y ejecutar el importador desde `legacy.sqlite`. Si se necesita reproducir permisos, aplicar también el manifiesto de roles del entorno. Nunca apuntar la prueba al nombre `openmun` de producción. Arrancar la misma versión de backend que se planea desplegar, con su base de ensayo y sin correo ni avisos a usuarios reales.

### Evidencia que debe producir el ensayo

- Restauración funcional de ambos respaldos, con huellas verificadas. Medir cuánto tardan el respaldo, la importación, la conciliación y la restauración. Usar esos tiempos para fijar la ventana y el punto de aborto.
- Igualdad del conjunto de IDs y FKs, recuento por conferencia, igualdad de fechas y booleanos normalizados, conciliación de JSON por versión y trazabilidad de cada elemento extraído. El conteo total solo sirve como control inicial.
- Segunda ejecución sobre el mismo respaldo sin duplicados, y una ejecución con fallo inyectado a mitad que deje cero cambios de datos confirmados. Incluir fixtures con conflictos, avisos, notas privadas, JSON inválido y fechas con offset.
- Recorrido de organización, mesa, staff y delegado. Incluir alta, acceso, reconexión, actualización del debate, voto, enmienda, nota privada, rechazo de moderación, aviso, checklist y recuperación tras reiniciar el backend. Probar límites entre dos conferencias y entre dos usuarios del mismo comité.
- Probar que un delegado no puede atribuirse el rol staff, leer otro buzón, resolver moderación ni escribir en otro comité. Verificar en red que el estado inicial no incluye secretos ni datos privados.
- Ejecutar una ráfaga de estados con versión y comprobar que sobrevive el último confirmado. Probar reconexión tras reinicio, errores de base, cambio de proxy, transporte polling y upgrade a WebSocket. El script `stress_test_sockets.js` del servidor solo debe ejecutarse contra el entorno de ensayo.
- Probar los builds de frontend soportados, tanto recién cargados como servidos desde una caché previa. Revisar [conferenceService.js](../src/services/conferenceService.js), [peerService.js](../src/services/peerService.js) y los consumidores de esos servicios.

## 5. Corte en producción

### Procedimiento preparado (10 de noviembre de 2026)

La release `final.20261110` ya está instalada en LUAX con el código de esta rama. [cutover.sh](../backend/luax/deploy/cutover.sh) se ensayó completo en modo `rehearsal` con una copia del SQLite real. Pasaron la importación doble sin duplicados (8 conferencias, 10 comités, 1 tarea y esquema 4), `/readyz`, el acceso de observador, el rechazo de un PIN erróneo, Socket.IO y CORS. La base del ensayo se eliminó después. El legado no registra escrituras desde el 3 de noviembre.

Como el frontend actual y el backend nuevo no son compatibles entre sí, el corte en producción sigue estos pasos:

1. **Publicar el frontend:** compilar y desplegar con `VITE_LUAX_API_URL=https://api.openmun.app` (la CSP ya autoriza `https://api.openmun.app` y `wss://api.openmun.app`).
2. **Ejecutar el corte en LUAX:**
   ```bash
   MODE=production RELEASE=final.20261110 bash ~/openmun-cutover.sh
   ```
   El script:
   - Detiene `comites-app` (puerto 3000).
   - Toma respaldos atómicos y verificados de SQLite y PostgreSQL en `/home/ubuntu/openmun-backups/cutover-production.<id>`.
   - Renombra la base PostgreSQL `openmun` a `openmun_pre_cutover_<ts>`.
   - Crea la base `openmun` limpia, ejecuta `migrate.js` (esquema 4), aplica `app-grants.sql` e importa los datos dos veces comprobando la idempotencia.
   - Inicia `openmun-backend` en `127.0.0.1:3005` mediante PM2 (`openmun-backend`).
   - Actualiza Nginx (`/etc/nginx/sites-enabled/default`) configurando Real-IP de Cloudflare (`CF-Connecting-IP` verificado) y cambiando el `proxy_pass` hacia `http://127.0.0.1:3005;`.
3. **Rollback temprano (si fuera necesario antes de que haya escrituras reales):**
   ```bash
   BACKUP=<directorio_impreso_en_paso_2> bash ~/openmun-rollback.sh
   ```
   Restaura la configuración anterior de Nginx, reinicia `comites-app` y detiene `openmun-backend`.

### Plan de ejecución detallado
1. Confirmar que los bloqueos de contrato, autorización y durabilidad están cerrados, que el ensayo y el rollback pasaron, y que el responsable de producto acepta el alcance de datos externos. Etiquetar el código desplegado de los dos backends y del frontend. Guardar de forma privada la configuración efectiva de Nginx, PM2 y variables de entorno.
2. Activar mantenimiento y congelar escrituras de ambos lados. Drenar las sesiones y los sockets existentes, incluidos clientes que puedan llegar directamente a un puerto. Pausar automatizaciones que escriban. Detener el proceso legado con el usuario que administra su PM2 y verificar que `3000` ya no acepta conexiones de aplicación. Dejar el nuevo disponible solo de forma privada para comprobaciones o detenerlo durante la carga.
3. Tomar los respaldos finales y registrar el inventario bajo congelación. Si apareció actividad en PostgreSQL desde el ensayo, aplicar el plan de reconciliación aprobado o abortar. Ejecutar el plan del importador, aplicar la versión ensayada y conciliar antes de arrancar los escritores.
4. Arrancar el nuevo backend en privado. Comprobar disponibilidad de base y esquema, lectura de conferencias y comités migrados, y negociación de Socket.IO. Reservar los ensayos de escritura a un fixture aislado o mantener un registro explícito de esos cambios para el rollback.
5. Cambiar juntos los upstreams HTTP y Socket.IO de `api.openmun.app` a `127.0.0.1:3005`. Revisar la configuración efectiva y conservar TLS y el path que usa el cliente, por defecto `/socket.io/`. Mantener el soporte de upgrade, `proxy_http_version 1.1` y un timeout superior al intervalo de ping más su timeout. Ejecutar `sudo nginx -t` antes de `sudo systemctl reload nginx`. Validar desde fuera del host, incluida reconexión de una pestaña abierta. [WebSocket en Nginx](https://nginx.org/en/docs/http/websocket.html) · [Socket.IO tras un proxy](https://socket.io/docs/v4/reverse-proxy/)
6. Publicar o habilitar el frontend compatible conforme a la política ensayada. Quitar mantenimiento cuando los checks públicos hayan pasado y registrar la hora de la primera escritura real. Observar respuestas 4xx/5xx, desconexiones, reinicios PM2, errores PostgreSQL, retraso de persistencia y errores de conciliación. Definir umbrales antes del corte a partir del ensayo y del tráfico normal.

| Condición | Decisión |
| --- | --- |
| Falta un contrato necesario, falla un permiso, aparece una diferencia de datos sin explicar o el respaldo no restaura | Mantener mantenimiento y abortar antes de abrir escrituras. |
| Fallo de proxy, reconexión o disponibilidad antes de la primera escritura real | Aplicar rollback temprano y verificar el legado. |
| Fallo después de que usuarios escriban en PostgreSQL | Congelar ambos lados y aplicar el procedimiento de recuperación con reconciliación. |

## 6. Rollback y cierre

**Antes de escrituras reales en PostgreSQL:** mantener mantenimiento, cerrar el acceso al nuevo, reactivar `comites-app` con la base SQLite congelada y restaurar la configuración de Nginx hacia `3000`. Validar configuración y recargar. Si el SQLite original se dañó, restaurar la copia verificada con el legado detenido y manejar sus archivos WAL/SHM como parte de la recuperación. Recuperar el build frontend compatible y probar un acceso y una reconexión antes de reabrir.

**Después de escrituras reales en PostgreSQL:** cerrar el tráfico de ambos, tomar un dump del estado posterior al corte y medir los cambios desde la frontera registrada. Volver a SQLite requiere un camino inverso ensayado o una reconciliación autorizada, incluyendo eliminaciones, cambios de rol, notas y mensajes que el esquema antiguo quizá no representa. Si el regreso sin pérdida no se ha demostrado, restaurar el servicio sobre PostgreSQL mediante una corrección controlada y conservar el legado congelado. Cambiar solo Nginx dejaría fuera las escrituras nuevas.

**Cierre:** cuando transcurra el periodo de observación acordado, verificar que no quedan clientes, automatizaciones ni enlaces que dependan del legado. Registrar el resultado, guardar respaldos conforme a la política de retención y retirar el proceso y los contratos temporales en un cambio posterior. Actualizar [AGENTS.md](../AGENTS.md) cuando el proxy cambie de destino.

## Referencias del proyecto

- [Informe Graphify del backend nuevo](../graphify-out/luax/GRAPH_REPORT.md)
- [Contrato de notas documentado en el checkout](note-approval.md)
- `/home/ubuntu/comites/db.js` y `server.js` para esquema, rutas y eventos de origen.
- `/home/ubuntu/openMUN/src/db/schema.sql`, `src/routes/`, `src/controllers/` y `src/sockets/` para el destino.
