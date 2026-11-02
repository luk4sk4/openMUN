# Guía de diseño de OpenMUN

Referencia: pestaña **Comienzo** de la versión local actual, revisada el 2 de noviembre de 2026 en `http://localhost:5173/`, junto con sus componentes y estilos. Esta guía extrae su lenguaje visual para aplicarlo al conjunto de la plataforma.

La inspección visual se realizó en modo oscuro, en una ventana de 545 × 812 px. Los valores de escritorio y del tema claro proceden del código. Las recomendaciones de extensión se indican expresamente; no implican que todas las vistas ya las cumplan.

## 1. Dirección visual

**Una herramienta de trabajo sobria, cálida y legible, con la información como protagonista.**

- Superficies continuas y planas, con fondos neutros cálidos.
- Jerarquía construida con tamaño, peso tipográfico, alineación y espacio.
- Terracota para la acción principal y la ubicación actual.
- Color semántico puntual para distinguir estados.
- Bordes finos en controles y separadores; poca elevación.
- Iconos pequeños que ayudan a reconocer acciones.

Aplicar estos principios a Mesa, Delegados, Secretaría, Backroom, Conferencias y sus diálogos. La densidad y el tamaño pueden adaptarse a cada tarea, conservando el significado de colores, acciones y estados.

## 2. Colores y tokens

Usar las variables existentes. Los valores siguientes corresponden a los temas predeterminados de `AccessibilityContext`; las preferencias del usuario pueden cambiarlos.

| Función | Variable | Oscuro | Claro |
| --- | --- | --- | --- |
| Fondo de trabajo | `--bg-color` | `#2c2c2c` | `#f7f2eb` |
| Superficie de panel o diálogo | `--panel-color` / `--panel-bg` | `#363636` | `#fffefd` |
| Cabecera global | `--header-bg` | `#2c2c2c` | `#f7f2eb` |
| Cabecera de tarjeta | `--card-header-bg` | `#303030` | `#f3f3f1` |
| Texto principal | `--text-color` | `#f7f2eb` | `#242424` |
| Texto secundario | `--muted-text` | `#b9b9b9` | `#626262` |
| Borde de control | `--border-color` | `#4b4b4b` | `#dedcd8` |
| Separador discreto | `--subborder-color` | `#414141` | `#e9e7e3` |
| Acción principal, fondo | `--btn-bg` | `#b45432` | `#b45432` |
| Acción principal, texto | `--btn-text` | `#ffffff` | `#ffffff` |
| Acento de texto y selección | `--accent-color` | `#efa37f` | `#ac482a` |
| Selección suave | `--accent-soft` | `rgba(239,163,127,.08)` | `rgba(180,84,50,.06)` |
| Campo de entrada | `--input-bg` | `rgba(255,255,255,.05)` | `#ffffff` |

El acento de texto y el fondo de botón son tokens distintos: usar cada uno en su función. Los widgets actuales redefinen localmente las superficies de panel y cabecera para que compartan el fondo del espacio de trabajo.

### Estados

| Significado | Variable | Oscuro | Claro | Ejemplo |
| --- | --- | --- | --- | --- |
| Correcto o aprobado | `--success-color` | `#a4d4b3` | `#386447` | Presente, aprobado |
| Información | `--info-color` | `#a6b8c9` | `#50677f` | Presente y votando |
| Error o rechazo | `--danger-color` | `#edaaa1` | `#974b43` | Ausente, rechazado |
| Atención | `--warning-color` | `#cbb58d` | `#80673b` | Mayoría requerida |

Para fondos y botones de estado existen las variantes `--*-soft` y `--*-solid`. Acompañar siempre el color con una etiqueta, una cifra o un icono comprensible. En resúmenes, preferir un punto de color junto a la etiqueta y mantener la cifra en el color principal.

## 3. Tipografía

La familia actual es `var(--font-family)`, cuyo valor predeterminado es `Inter, system-ui, -apple-system, sans-serif`. La disponibilidad de Inter depende del entorno; mantener los sustitutos del sistema.

| Uso | Referencia actual | Regla para extender |
| --- | --- | --- |
| Título de widget | `.95rem`, peso `650` | Breve, sin adornos, alineado con su contenido |
| Texto de trabajo | Aproximadamente `.8–.85rem` | Tamaño base coherente dentro de cada vista |
| Navegación | `.78rem`; activo `650` | Mantener el texto reconocible y una selección explícita |
| Contexto del comité | `.75rem` | Subordinado a la navegación y al contenido |
| Etiqueta de sección de agenda | `.7rem`, `750`, mayúsculas, espaciado `.07em` | Reservar las mayúsculas para etiquetas cortas |
| Reloj de agenda | `1.3rem`, `700`, cifras tabulares | Aumentar la escala cuando el tiempo sea el dato central |

**Recomendaciones:** usar interlineado de `1.4–1.5` en textos de ayuda; evitar reducir la tipografía para hacer caber controles; usar `font-variant-numeric: tabular-nums` en relojes y cifras que cambian. En vistas de lectura, aumentar el tamaño respecto al tablero compacto.

Respetar el modo de dislexia, la escala tipográfica y las preferencias existentes. No fijar familias o alturas que anulen esos ajustes.

## 4. Composición y espaciado

### Estructura observada

1. Cabecera global con marca, pestañas de trabajo y control de modulación.
2. Franja de contexto con comité, agenda y estado de sesión.
3. Contenido organizado por tarea: asistencia y quórum; comité y agenda.
4. Herramientas auxiliares en una barra lateral desplegable.

La cabecera de escritorio tiene `64px` y la franja de contexto `44px`. La vista fija usa doce columnas; en Comienzo, la matriz ocupa siete y la agenda cinco. El ancho máximo es `1920px`, con margen exterior `clamp(12px, 2vh, 28px)` y separación `clamp(8px, 1.5vh, 16px)`.

### Regla general recomendada

- Usar `4, 8, 12, 16, 24, 32px` como escala preferida de espaciado en nuevas vistas.
- Mantener cerca la etiqueta, el valor y la acción que lo modifica.
- Separar tareas con espacio y divisores discretos.
- Alinear búsquedas, filtros y acciones de una misma lista.
- Hacer que el contenido principal tenga más presencia que las herramientas auxiliares.
- Conservar las medidas locales existentes cuando ya resuelvan bien el componente; la escala es una orientación, no una migración obligatoria.

## 5. Superficies, bordes y elevación

- **Widgets:** transparentes sobre el fondo común, sin sombra permanente. En modo fijo, contorno exterior rectangular; el contenido organiza la separación.
- **Controles:** borde de `1px`, radio habitual de `5–6px`; el token general `--border-radius` vale `6px`.
- **Bloques internos:** usar una superficie distinta solo cuando agrupe una subtarea, como un debate de agenda.
- **Diálogos:** superficie `--panel-color`, borde visible y fondo atenuado para separar la tarea del tablero. El importador actual usa radio de `10px`.
- **Hover:** cambio sutil de superficie o borde, sin desplazar la composición.

**Recomendación de extensión:** reservar sombras para elementos superpuestos que necesiten expresar profundidad. Evitar añadir degradados, brillos o contenedores anidados a las vistas operativas.

## 6. Componentes y comportamiento

### Botones

- **Principal:** fondo `--btn-bg`, texto `--btn-text`, verbo concreto. Ejemplo actual: «Paso nominal».
- **Secundario:** fondo transparente o de campo, borde fino y texto principal. Ejemplo: «Añadir países».
- **Utilidad:** icono y texto cuando hay espacio; icono solo con nombre accesible.
- **Destructivo:** significado explícito, tratamiento de peligro y confirmación cuando la pérdida de datos lo requiera.
- **Deshabilitado:** conservar la etiqueta; la agenda actual usa opacidad `.45`. Explicar el requisito si no resulta evidente.

**Recomendación:** establecer una acción dominante por grupo de tarea y mantener visibles las acciones necesarias para teclado y tacto.

### Campos y filtros

Usar etiqueta visible, fondo `--input-bg`, borde `--border-color` y foco reconocible. El placeholder ayuda a introducir el dato, pero no sustituye a la etiqueta. Agrupar búsqueda y filtro encima de los resultados. La agenda actual usa relleno de `7px 8px` y radio de `5px` en controles.

### Listas, tablas y métricas

Filas planas con separador inferior tenue y hover discreto. Nombres alineados a la izquierda; estados consistentes entre filas. Las métricas usan una etiqueta secundaria y una cifra dominante. Mostrar unidades, totales y proporciones como contexto de la cifra.

Para nombres largos, permitir ajuste de línea o truncado con una forma de consultar el nombre completo. No sacrificar el acceso a acciones para conservar una sola línea.

### Navegación y selección

La pestaña actual se reconoce por texto en acento, peso mayor y subrayado de `2px`. Las selecciones de estado usan borde de acento y fondo suave. Mantener la distinción semántica existente: `aria-current` para la página, `aria-pressed` para botones de selección y `aria-checked` en el interruptor de modulación.

### Vacío, carga y error

Reutilizar `EmptyState`, los esqueletos, `ToastNotification` y los límites de error existentes. Dentro del tablero, el estado vacío actual elimina la decoración y el contenedor adicional.

**Recomendación:** cada estado vacío debe decir qué falta y ofrecer la acción para resolverlo cuando corresponda. Los errores deben explicar qué ocurrió y permitir recuperar o reintentar sin perder el trabajo introducido.

### Iconografía

Usar `lucide-react`, ya instalado. La navegación y las utilidades actuales emplean iconos de `16px`; la escala observada en controles es aproximadamente `13–20px`. Mantener un tamaño coherente dentro de cada grupo y reservar las banderas para identificar delegaciones.

## 7. Adaptación y accesibilidad

La cuadrícula fija se apila en una columna a `640px` o menos, con separación y margen exterior de `8px`. La agenda apila sus dos lados a `600px` o menos. Son umbrales de componentes distintos y deben respetarse al reutilizarlos.

**Criterios recomendados para toda la plataforma:**

- Conservar un orden de lectura útil al apilar columnas.
- Permitir acceso a todas las pestañas cuando haya desplazamiento horizontal.
- Dar a las herramientas laterales una entrada visible y operable con teclado y tacto.
- Evitar que alturas fijas corten formularios, listas o acciones; permitir desplazamiento en el contenedor adecuado.
- Mostrar foco visible. La navegación y la agenda actuales usan contorno de `2px` en acento, separado `2–3px` del control.
- Conservar el significado de los estados sin depender del color.
- Etiquetar campos, botones de icono y controles de selección.
- Mantener las preferencias de densidad, proyección y dislexia.
- Comprobar el contraste y la legibilidad en ambos temas antes de extender un patrón.
- Respetar la reducción de movimiento en nuevas animaciones. Actualmente está contemplada en la transición de la barra lateral, pero no se ha comprobado para todas las animaciones.

## 8. Movimiento

Las transiciones actuales de controles y barra lateral están alrededor de `150–200ms`. El tablero fijo evita animar su disposición; la modulación conserva el feedback de arrastre y redimensionado.

**Recomendación:** animar para comunicar cambio de estado, apertura o interacción. Reservar alertas insistentes para eventos que requieran atención y mantener el dato o mensaje legible durante la animación.

## 9. Cómo aplicar la guía al resto de OpenMUN

| Vista | Qué conservar del patrón | Adaptación de tarea recomendada |
| --- | --- | --- |
| Mesa | Navegación, contexto, superficies planas y controles compactos | Priorizar el estado de sesión y las acciones de moderación |
| Delegados | Paleta, tipografía y significado de estados | Una tarea principal por bloque; controles cómodos en móvil |
| Secretaría / proyección | Colores semánticos y jerarquía | Cifras y nombres mayores, con menos controles visibles |
| Backroom / Conferencias | Campos, filtros, listas y acciones | Más espacio para lectura y gestión de mensajes |
| Diálogos | Tokens de superficie, botones y foco | Título claro, cierre accesible y acciones finales reconocibles |
| Inicio público | Identidad cálida y terracota | Escala de presentación mayor y más espacio entre secciones |

## 10. Diferencias actuales y límites

La plataforma aún mezcla estilos. `HomePage.jsx` conserva acentos azules, fondo Kinetic y tratamientos más decorativos. `EmptyState.jsx` conserva decoración azul fuera de los widgets. Otros estilos globales de sliders y alertas de reloj también contienen valores azules o saturados independientes del tema.

Estos tratamientos no se consideran el patrón general extraído de Comienzo. Su unificación sería un trabajo posterior; esta guía no modifica la interfaz ni las preferencias del usuario.

En la ventana inspeccionada, el contenido se apila y el área visible de la lista de delegaciones es reducida; la navegación superior también queda ajustada. Debe verificarse el desplazamiento y el acceso a sus acciones antes de tomar ese comportamiento como referencia móvil definitiva.

## 11. Revisión de una nueva pantalla

- ¿Reutiliza tokens y componentes existentes?
- ¿Se entiende primero la información o acción principal?
- ¿Usa el acento y los colores de estado con el mismo significado?
- ¿Conserva una jerarquía clara sin exceso de contenedores?
- ¿Permite leer nombres largos y alcanzar todas las acciones?
- ¿Incluye estados vacío, carga, error y deshabilitado cuando sean necesarios?
- ¿Funciona con teclado, en móvil y con los ajustes de accesibilidad?
- ¿Se ha revisado en claro y oscuro?

## Fuentes de implementación

- [Temas, tokens y preferencias](../src/context/AccessibilityContext.jsx)
- [Estilos globales, navegación, cuadrícula y superficies de widgets](../src/index.css)
- [Cabecera y herramientas](../src/components/dashboard/DashboardNavbar.jsx)
- [Contenedor de widgets](../src/components/dashboard/WidgetCard.jsx)
- [Distribuciones fijas](../src/utils/fixedLayouts.js)
- [Matriz de delegaciones](../src/components/widgets/MatrizPaises.jsx)
- [Estilos de comité y agenda](../src/components/widgets/EstablecerAgenda.css)
- [Estados vacíos](../src/components/common/EmptyState.jsx)
- [Inicio público y sus diferencias visuales](../src/components/pages/HomePage.jsx)
