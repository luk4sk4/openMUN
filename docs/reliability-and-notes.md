# Correcciones de fiabilidad y moderación de notas

## Cómo activar la revisión de staff

1. La mesa inicia la sala en vivo.
2. Abre **Sesión en vivo → Ajustes → Permisos y capacidades de delegados**.
3. Activa **Requerir aprobación de staff para las notas de delegados**. Por defecto está desactivada.
4. Staff se conecta a esa sala con su contraseña de rol, o abre la pantalla local de staff desde la mesa.
5. En **Mensajería Comité**, cada nota pendiente muestra **Aprobar y entregar** y **Rechazar**.

Con la opción activa, todas las notas nuevas de delegados requieren revisión, incluidas las dirigidas a mesa, backroom o toda la sala. Los permisos que desactivan ciertos destinos se siguen aplicando antes de encolar la nota. Si no hay staff conectado, las notas esperan: no se aprueban automáticamente.

El delegado emisor ve la nota pendiente. El destinatario no recibe su contenido hasta la aprobación. Una nota rechazada solo queda en el historial del emisor, staff y la supervisión de mesa/secretaría; no aparece al destinatario al reconectar. Desactivar la opción afecta a las notas nuevas y no libera notas pendientes. Las notas que ya se habían entregado no se retiran.

La mesa y secretaría conservan supervisión del historial del comité. Las pantallas locales de staff son ventanas de confianza del navegador de la mesa; su revisión se transmite al servidor a través de la mesa. Los clientes remotos no pueden atribuirse esa condición.

## Qué cambió y cómo

| Problema | Corrección |
| --- | --- |
| API sin controles de acceso | `backend/security.js` valida el recurso, conferencia, comité y rol antes de las operaciones. Los PIN se verifican en el servidor y se guardan como hashes scrypt con sal. Las sesiones firmadas caducan en 12 horas; cambiar los PIN invalida las sesiones afectadas. |
| Suplantación por `senderMeta` o `senderSocketId` | `backend/realtime.js` autentica la entrada a sala y construye la identidad desde la conexión. Rechaza acciones no permitidas para el rol y envíos desde sockets que no pertenecen a la sala. Las contraseñas no se retransmiten a participantes. |
| Notas privadas difundidas a todos | Los mensajes privados y respuestas dirigidas salen únicamente hacia sus destinatarios autorizados. El canal común y los resúmenes públicos no incluyen notas ni PIN. |
| Nueva moderación | El servidor conserva el estado pendiente y solo acepta revisiones remotas de staff autenticado. Se actualiza la misma nota por ID; una revisión repetida no la vuelve a entregar. El buzón y la recuperación respetan el estado. |
| Borrado tras fallar el correo | La limpieza conserva conferencias sin SMTP/destinatario o si falla el envío. Incluso después de un envío correcto, no borra una conferencia reactivada durante el respaldo. |
| Arrays desincronizados | Al cambiar la longitud se transmite el array completo. Se evitan desplazamientos de índices y se bloquean rutas de propiedades peligrosas al aplicar diferencias. |
| Dictamen antes de terminar de votar | La votación sigue en proceso mientras queden votos pendientes, incluido un veto aún provisional. |
| Importación que corrompía el almacenamiento | Los campos serializados se decodifican y validan antes de escribir. El respaldo no puede cambiar credenciales ni la dirección de API. Las imágenes de banderas se conservan hasta el límite validado de 1 MiB por campo. Un dato local ilegible no bloquea el arranque y se conserva una copia de recuperación cuando el almacenamiento lo permite. |
| Respaldos incompletos | `createSessionSnapshot` genera los datos usados por exportación, SQLite, Drive y Supabase: incluye notas con su revisión, crisis, reloj, avisos, configuración y datos del debate. Una mesa sin copia local puede recuperar su estado privado autorizado del servidor. |
| Bucle de Drive | El estado visual de sincronización deja de ser una dependencia que dispare otra subida. Se mantiene la pausa por conflicto. |
| Deriva de cronómetros | Los relojes calculan cuántas unidades de tiempo han transcurrido desde una marca temporal; el intervalo solo despierta la pantalla. También se aplica al reloj de simulación de crisis. |
| Cruces de pestañas | Los datos se guardan por sala. La identidad activa pertenece a cada pestaña; las notas tienen además un espacio por rol y delegación. Los mensajes de sincronización local identifican la sala. Se conserva una referencia a la última sala abierta para volver a cargarla. Al cambiar de comité o pasar a un rol de cliente se detiene el respaldo automático vinculado al anterior; se debe vincular el destino del nuevo comité. Iniciar una sala en vivo para el mismo contenido conserva la vinculación. |
| Almacenamiento lleno | La sesión continúa en memoria y aparece una alerta persistente con descarga de respaldo. Es necesario descargarla antes de cerrar o recargar si el navegador sigue sin poder escribir. |
| Descarga inicial de motores de documentos | Se elimina el grupo manual que forzaba su precarga. PDF, Word y exportación vuelven a cargarse bajo demanda. |
| Backend incompleto | Se añaden esquema SQLite, índices, dependencias y lockfile. Se utiliza el SQLite integrado de Node, sin un módulo nativo adicional. |

Los PIN existentes siguen siendo válidos tras migrar su almacenamiento. El editor conserva un PIN oculto si se deja el campo vacío; para eliminarlo se debe seleccionar explícitamente **Quitar el PIN actual**. Los respaldos de estado almacenados en SQLite ya no duplican las credenciales de configuración en texto plano.

La autoridad de salas en vivo es un único proceso de backend. No se ha añadido infraestructura para ejecutar varias réplicas a la vez.

## Arranque y despliegue

El backend requiere **Node.js 22.13 o posterior**. Node puede mostrar que su API SQLite es experimental; se utiliza la API nativa documentada en [Node SQLite](https://nodejs.org/api/sqlite.html).

```powershell
npm ci
npm ci --prefix backend
npm test
npm run build
npm start --prefix backend
```

Configura estas variables en el entorno del backend o en `backend/.env`:

- `DATABASE_PATH`: ruta al SQLite existente. Si no se indica, se crea o abre `backend/openmun.sqlite`. En un servidor con datos hay que apuntar al archivo real y hacer una copia antes del primer arranque actualizado. La migración es aditiva para el esquema y transforma los PIN existentes a hashes.
- `SESSION_SECRET`: secreto aleatorio estable. Puede generarse con el comando de `backend/.env.example`. Si se deja vacío, se genera uno temporal y las sesiones firmadas caducan al reiniciar.
- `ALLOWED_ORIGINS`: orígenes permitidos separados por comas; incluir el dominio real del frontend. Si se utiliza el panel opcional de Socket.IO, incluir su origen y configurar sus credenciales.
- `VITE_API_BASE_URL` y `VITE_SOCKET_SERVER_URL`, al compilar el frontend, si el backend no usa `https://api.openmun.app`. En ese caso, incluir también su origen HTTP/WebSocket en `connect-src` de `public/_headers`.
- Las variables SMTP existentes para poder archivar por correo. Sin un respaldo confirmado, los datos se conservan.

Actualiza **backend y frontend conjuntamente** y recarga las pantallas que tuvieran la versión anterior. El nuevo cliente requiere confirmaciones de autenticación y no vuelve al protocolo antiguo sin permisos. No se ha desplegado ni migrado una base de producción desde este trabajo.

## Comprobaciones

`npm test` incluye regresiones sobre arrays, votos pendientes, importación, banderas, respaldos completos, almacenamiento por sala/rol, almacenamiento lleno y Drive. Las pruebas de seguridad arrancan HTTP y WebSocket reales con **SQLite en memoria**, sin usar el archivo de datos, correo ni proyecto Supabase del usuario.

Las pruebas de red ejercitan el código real de `peerService.js` con mesa, staff y delegados separados: suplantación, entrada no autorizada, notas pendientes, aprobación, rechazo, revisión desde staff local, opción desactivada y recuperación al reconectar. La batería también ejecuta las pruebas de agenda y otras funciones presentes en el repositorio.

Las confirmaciones de mensajes usan los mecanismos documentados de [Socket.IO](https://socket.io/docs/v4/emitting-events/#acknowledgements), con un límite de espera. Las colas de envío conservan el orden de compresión y descartan envíos de una conexión anterior al cambiar de sala.

No se han comprobado SMTP real, las políticas RLS de Supabase, OAuth de Drive ni carga masiva en producción.
