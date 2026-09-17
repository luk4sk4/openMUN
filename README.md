# 🌐 openMUN

**The Modern, Modular & Real-Time Model United Nations Chairing Platform**

[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![PeerJS](https://img.shields.io/badge/P2P-PeerJS-crimson)](https://peerjs.com/)
[![i18next](https://img.shields.io/badge/i18n-react--i18next-26A69A?logo=i18next&logoColor=white)](https://react.i18next.com/)
[![License: GNU AGPLv3](https://img.shields.io/badge/License-AGPLv3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

*Una plataforma integral, modular y de latencia cero para mesas directivas (Chairs), delegaciones, secretarías y gabinetes de crisis en Modelos de Naciones Unidas.*

[Características](#-características-principales) •
[Vistas y Roles](#-vistas-y-roles-multidispositivo) •
[Módulos y Widgets](#-módulos-y-widgets-disponibles) •
[Sincronización P2P y Nube](#-sincronización-en-tiempo-real-y-nube) •
[Accesibilidad e Idiomas](#-accesibilidad-e-internacionalización) •
[Instalación](#-instalación-y-despliegue) •
[Estructura](#-estructura-del-proyecto) •
[Licencia](#-licencia)

---

## 📌 Descripción

**openMUN** es una suite moderna para la gestión y proyección en vivo de comités de Model United Nations (MUN). Diseñada para optimizar el flujo de trabajo parlamentario, openMUN combina un sistema de **widgets modulares y arrastrables**, sincronización inalámbrica **Peer-to-Peer (P2P)** para proyectores y dispositivos secundarios, integración con **Google Drive**, soporte para **múltiples idiomas**, simulación de **crisis en tiempo real** y herramientas avanzadas de votación, cronómetros y control de quórum.

---

## ✨ Características Principales

- ⏱️ **Cronómetros Dinámicos y Precisos**:
  - Cronómetro Principal con alertas sonoras y visuales.
  - Cronómetro Dual para debates moderados e inmoderados (tiempo total de debate + tiempo por orador).
  - Cronómetro Minimalista flotante / sólo tiempo.
- 📋 **Lista General de Oradores (GSL)**:
  - Cola dinámica de oradores con gestión de cesiones (*yields* a mesa, a otra delegación o a preguntas).
  - Búsqueda instantánea y adición de delegaciones.
- 🏛️ **Gestión de Quórum y Asistencia**:
  - Matriz de países con estados: *Presente*, *Presente y Votando* y *Ausente*.
  - Cálculo automático y en tiempo real de mayorías (Simple, 2/3, Mayoría Cualificada).
- 🗳️ **Sistema Oficial de Votaciones y Mapas**:
  - Modos de votación Procedimental y Sustantiva.
  - Opciones de *A favor*, *En contra*, *Abstención* y *Pase* con registro de segundas rondas.
  - Visualización gráfica de resultados y Mapa de Votación interactivo.
- 💡 **Pizarra de Mociones**:
  - Registro de mociones de debate moderado, inmoderado, suspensión de sesión, etc.
  - Ordenación automática por jerarquía parlamentaria y flujo de votación.
- 🚨 **Gabinete y Módulo de Crisis**:
  - Gestor de eventos de crisis con publicaciones programadas o inmediatas.
  - Widget de Telenoticias / Noticiero TV (*Breaking News*) y cintillo permanente de noticias.
- ☁️ **Sincronización Cloud y Respaldo Local**:
  - Integración nativa con **Google Drive** para guardar y restaurar sesiones de debate en la nube.
  - Exportación e importación completa en formato JSON y plantillas Excel (`.xlsx`).
- 🔄 **Sincronización P2P en Tiempo Real (PeerJS & WebRTC)**:
  - Conexión sin servidores intermediarios mediante código QR o ID de sala.
  - Canales locales ultra rápidos mediante `BroadcastChannel` para configuraciones multipantalla.
- 🌐 **Internacionalización (i18n)**:
  - Soporte completo para múltiples idiomas (Español e Inglés) con conmutación dinámica.
- ♿ **Accesibilidad Integral**:
  - Soporte para tipografía **OpenDyslexic**.
  - Modos de corrección cromática para daltonismo (Protanopia, Deuteranopia, Tritanopia).
  - Modos Claro y Oscuro de alto contraste optimizados para proyectores.

---

## 👥 Vistas y Roles Multidispositivo

openMUN se adapta a cada participante del debate:

| Rol / Vista | Descripción |
| :--- | :--- |
| **Mesa Directiva (Chair)** | Panel de control integral con sistema drag-and-drop para gestionar tiempos, listas, mociones y votaciones. |
| **Proyector / Secretaría** | Vista limpia y de alto impacto visual adaptada a proyectores de sala y seguimiento de secretaría. |
| **Delegación (Delegate View)** | Pantalla para delegados con información en vivo del orador actual, tiempos restantes, mociones activas y alertas. |
| **Gabinete de Crisis (Backroom)** | Entorno especializado para el equipo de crisis para redactar actualizaciones, enviar alertas y gestionar noticias. |

---

## 🧩 Módulos y Widgets Disponibles

El dashboard modular permite organizar el espacio de trabajo con una cuadrícula adaptable:

- **Establecer Agenda**: Configuración del comité, tema, orden del día e información general.
- **Importar Países**: Carga masiva mediante plantillas Excel (`.xlsx`) o configuración manual.
- **Lista de Oradores (GSL)**: Turnos de oradores, alertas de tiempo y cesiones.
- **Cronómetro Dual**: Control coordinado de debates moderados e inmoderados.
- **Cronómetro Principal & Minimalista**: Temporizadores versátiles para cualquier intervención o caucus.
- **Pizarra de Mociones**: Gestión, orden jerárquico y votación de mociones.
- **Votación Oficial & Mapa de Votos**: Votaciones nominales o a mano alzada con cálculo de mayorías y vista de mapa.
- **Matriz de Países**: Panel en vivo de asistencia, quórum y estados de voto.
- **Histórico de Delegaciones**: Estadísticas y registro de intervenciones por país.
- **Selector Aleatorio**: Ruleta / generador aleatorio para turnos de preguntas o intervenciones sorpresivas.
- **Gestor de Crisis & Noticiero TV**: Emisión de comunicados, alertas urgentes y cintillos estilo telediario.
- **Pizarra Interactiva**: Espacio de notas, acuerdos y lluvia de ideas en vivo.

---

## 📡 Sincronización en Tiempo Real y Nube

### 1. Sincronización P2P (WebRTC)
1. En la barra superior, haz clic en **Sesión P2P / Conectar**.
2. Selecciona si deseas transmitir como **Host (Mesa)** o unirte como **Delegado**, **Secretaría** o **Backroom**.
3. Escanea el código **QR** o comparte el **ID de Sala**.
4. Todos los cambios (oradores, cronómetros, votaciones, noticias) se replican instantáneamente.

### 2. Sincronización con Google Drive
- Guarda copias de seguridad de las sesiones activas en tu cuenta de Google Drive con un clic.
- Carga sesiones previas desde cualquier equipo sin perder configuraciones ni historiales de comités.

---

## 🎨 Accesibilidad e Internacionalización

openMUN prioriza la inclusión en el entorno académico y de debate:
- **Idiomas**: Alterna entre Español e Inglés desde el selector de idioma en la barra de navegación.
- **Filtros de Visión**: Ajustes dedicados para acromatopsia, protanopia, deuteranopia y tritanopia.
- **Tipografía OpenDyslexic**: Facilita la lectura a usuarios con dislexia.
- **Temas Visuales**: Paletas de alto contraste Claro y Oscuro para salones con luz directa o baja iluminación.

---

## 🚀 Instalación y Despliegue

### Requisitos Previos
- [Node.js](https://nodejs.org/) (v18 o superior)
- Gestor de paquetes: `npm`, `pnpm` o `yarn`

### Pasos de Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/luk4sk4/OPENMUN.git
   cd OPEN2MUN
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el entorno de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre tu navegador en `http://localhost:5173`.

4. **Compilar para producción:**
   ```bash
   npm run build
   ```

5. **Previsualizar la compilación:**
   ```bash
   npm run preview
   ```

---

## 📂 Estructura del Proyecto

```text
openMUN/
├── public/                 # Recursos públicos, plantillas y assets estáticos
├── src/
│   ├── assets/             # Banderas, iconos y recursos multimedia
│   ├── components/
│   │   ├── common/         # Componentes transversales (Logo, Selector Idioma, Banners)
│   │   ├── modals/         # Modales (P2P Live, Drive Sync, Accesibilidad, Edición)
│   │   ├── pages/          # Páginas principales (HomePage, etc.)
│   │   ├── panels/         # Barras laterales y paneles de configuración
│   │   ├── views/          # Vistas por rol (Delegate, Secretariat, Backroom, Join)
│   │   └── widgets/        # Widgets modulares de debate, votación y crisis
│   ├── config/             # Layouts maestros y configuraciones predeterminadas
│   ├── context/            # Contextos React (Session, P2P, Accessibility, etc.)
│   ├── languages/          # Archivos de traducción i18n (es.json, en.json)
│   ├── layouts/            # Sistema de cuadrícula y layout Dashboard
│   ├── plantillas/         # Plantillas de importación de comités
│   ├── services/           # Lógica P2P (PeerJS), almacenamiento y Google Drive
│   ├── utils/              # Utilidades de cálculo, quórum y formato
│   ├── App.jsx             # Enrutador de vistas y punto principal de la app
│   └── main.jsx            # Entrada de inicialización e i18n
├── package.json
└── README.md
```

---

## 📄 Licencia

Este proyecto está licenciado bajo los términos de la **GNU Affero General Public License v3.0 (AGPLv3)**. Consulta el archivo `LICENSE` para más detalles.
