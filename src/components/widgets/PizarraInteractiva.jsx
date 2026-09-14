import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  MoveRight,
  Circle,
  Type,
  RotateCcw,
  RotateCw,
  Trash2,
  Download,
  Upload,
  Image as ImageIcon,
  Palette,
  Maximize2,
  Check,
  ChevronDown,
  Layers,
  Sparkles,
  Compass,
  Grid,
  FileImage,
  RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import worldSvgUrl from '../../assets/world.svg';

// Generador de fondos SVG predefinidos para renderizado vectorial nítido
const createSvgDataUrl = (svgContent) => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
};

const WORLD_MAP_SVG = worldSvgUrl;

const TACTICAL_RADAR_SVG = createSvgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
  <defs>
    <radialGradient id="radarGrad" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#042f2e"/>
      <stop offset="60%" stop-color="#021a1a"/>
      <stop offset="100%" stop-color="#010c0c"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#radarGrad)"/>
  
  <!-- Radar concentric circles -->
  <circle cx="800" cy="500" r="100" fill="none" stroke="#0d9488" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.7"/>
  <circle cx="800" cy="500" r="220" fill="none" stroke="#0d9488" stroke-width="1.5" opacity="0.5"/>
  <circle cx="800" cy="500" r="350" fill="none" stroke="#0d9488" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.6"/>
  <circle cx="800" cy="500" r="460" fill="none" stroke="#14b8a6" stroke-width="2" opacity="0.8"/>

  <!-- Crosshairs -->
  <line x1="800" y1="30" x2="800" y2="970" stroke="#0d9488" stroke-width="1.5" opacity="0.6"/>
  <line x1="100" y1="500" x2="1500" y2="500" stroke="#0d9488" stroke-width="1.5" opacity="0.6"/>
  <line x1="300" y1="100" x2="1300" y2="900" stroke="#0d9488" stroke-width="1" stroke-dasharray="4,6" opacity="0.3"/>
  <line x1="300" y1="900" x2="1300" y2="100" stroke="#0d9488" stroke-width="1" stroke-dasharray="4,6" opacity="0.3"/>

  <!-- Angle marks -->
  <text x="810" y="70" fill="#2dd4bf" font-family="monospace" font-size="18" font-weight="700">000° N</text>
  <text x="1440" y="490" fill="#2dd4bf" font-family="monospace" font-size="18" font-weight="700">090° E</text>
  <text x="810" y="960" fill="#2dd4bf" font-family="monospace" font-size="18" font-weight="700">180° S</text>
  <text x="110" y="490" fill="#2dd4bf" font-family="monospace" font-size="18" font-weight="700">270° W</text>
</svg>
`);

const WHITEBOARD_SVG = createSvgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
  <defs>
    <pattern id="dotGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="20" r="1.5" fill="#cbd5e1" />
    </pattern>
  </defs>
  <rect width="1600" height="1000" fill="#ffffff"/>
  <rect width="1600" height="1000" fill="url(#dotGrid)"/>
</svg>
`);

const BLACKBOARD_SVG = createSvgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
  <defs>
    <radialGradient id="darkGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1f242c"/>
      <stop offset="100%" stop-color="#0f1115"/>
    </radialGradient>
    <pattern id="gridPattern" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#2a303c" stroke-width="0.8" stroke-dasharray="2,3"/>
    </pattern>
  </defs>
  <rect width="1600" height="1000" fill="url(#darkGrad)"/>
  <rect width="1600" height="1000" fill="url(#gridPattern)"/>
</svg>
`);

const PRESET_BACKGROUNDS = [
  { id: 'world_map', name: 'Mapa Mundial', icon: Compass, src: WORLD_MAP_SVG },
  { id: 'tactical_radar', name: 'Radar de Crisis', icon: Sparkles, src: TACTICAL_RADAR_SVG },
  { id: 'blackboard', name: 'Pizarra Oscura', icon: Grid, src: BLACKBOARD_SVG },
  { id: 'whiteboard', name: 'Pizarra Blanca', icon: Layers, src: WHITEBOARD_SVG },
];

const PRESET_COLORS = [
  '#ef4444', // Rojo Táctico
  '#3b82f6', // Azul ONU
  '#22c55e', // Verde Aprobación
  '#eab308', // Amarillo Alerta
  '#f97316', // Naranja
  '#a855f7', // Púrpura
  '#06b6d4', // Cian
  '#ffffff', // Blanco
  '#09090b', // Negro / Tinta oscura
];

const BRUSH_SIZES = [
  { label: 'Fino', size: 2 },
  { label: 'Medio', size: 5 },
  { label: 'Grueso', size: 12 },
  { label: 'Marcador', size: 24 }
];

const PizarraInteractiva = () => {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Estados de Herramienta
  const [tool, setTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser' | 'arrow' | 'circle' | 'text'
  const [color, setColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(5);
  const [bgType, setBgType] = useState('world_map');
  const [customBgUrl, setCustomBgUrl] = useState(null);
  const [textInputPrompt, setTextInputPrompt] = useState(null); // { x, y, text: '' }

  // Historial de Trazos para Deshacer / Rehacer
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Control de dibujo interactivo
  const isDrawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const snapshotData = useRef(null);

  // Imagen de fondo cargada en memoria
  const bgImageRef = useRef(null);

  // Obtener URL del fondo actual
  const currentBgUrl = customBgUrl || (PRESET_BACKGROUNDS.find(b => b.id === bgType)?.src || WORLD_MAP_SVG);

  // Cargar imagen de fondo cuando cambie
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      bgImageRef.current = img;
      redrawAll();
    };
    img.src = currentBgUrl;
  }, [currentBgUrl]);

  // Inicializar canvas con resolución nativa de alta definición
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = 1600;
    const height = 900;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      redrawAll();
    }
  }, []);

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, [initCanvas]);

  // Redibujar todo: Fondo + Estado actual del historial
  const redrawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Dibujar Fondo
    if (bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Dibujar trazos guardados hasta el paso actual
    if (historyStep >= 0 && history[historyStep]) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[historyStep];
    }
  };

  // Guardar estado actual al historial
  const saveStateToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();

    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(dataUrl);

    // Limitar historial a 30 pasos para optimizar memoria
    if (newHistory.length > 30) {
      newHistory.shift();
    }

    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  // Coordenadas relativas al Canvas HD
  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Iniciar trazo
  const handleStartDraw = (e) => {
    if (textInputPrompt) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getCanvasCoordinates(e);

    if (tool === 'text') {
      setTextInputPrompt({ x: pos.x, y: pos.y, text: '' });
      return;
    }

    isDrawing.current = true;
    startPos.current = pos;

    // Guardar snapshot para vista previa de figuras
    snapshotData.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = brushSize * 2.5;
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize * 2.2;
      ctx.globalAlpha = 0.35;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = 1.0;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  // Mover trazo
  const handleMoveDraw = (e) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getCanvasCoordinates(e);

    if (tool === 'arrow' || tool === 'circle') {
      // Restaurar snapshot previo para dibujar la figura elásticamente
      if (snapshotData.current) {
        ctx.putImageData(snapshotData.current, 0, 0);
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = 1.0;

      if (tool === 'arrow') {
        drawArrow(ctx, startPos.current.x, startPos.current.y, pos.x, pos.y, brushSize);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(pos.x - startPos.current.x, 2) + Math.pow(pos.y - startPos.current.y, 2)
        );
        ctx.beginPath();
        ctx.arc(startPos.current.x, startPos.current.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        // Relleno sutil
        ctx.globalAlpha = 0.12;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    } else {
      // Dibujo a mano alzada / Borrador / Resaltador
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  // Finalizar trazo
  const handleEndDraw = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.closePath();
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';

    saveStateToHistory();
  };

  // Función para dibujar flechas tácticas vectoriales
  const drawArrow = (ctx, fromX, fromY, toX, toY, size) => {
    const headLength = Math.max(16, size * 3.5);
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    // Línea principal
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Cabeza de la flecha
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  };

  // Aplicar texto escrito
  const applyText = () => {
    if (!textInputPrompt || !textInputPrompt.text.trim()) {
      setTextInputPrompt(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const fontSize = Math.max(18, brushSize * 4.5);
    ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = color;

    // Sombra para legibilidad sobre cualquier fondo
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillText(textInputPrompt.text, textInputPrompt.x, textInputPrompt.y);

    // Resetear sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    setTextInputPrompt(null);
    saveStateToHistory();
  };

  // Deshacer (Undo)
  const handleUndo = () => {
    if (historyStep > 0) {
      const nextStep = historyStep - 1;
      setHistoryStep(nextStep);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[nextStep];
    } else if (historyStep === 0) {
      setHistoryStep(-1);
      redrawAll();
    }
  };

  // Rehacer (Redo)
  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      setHistoryStep(nextStep);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[nextStep];
    }
  };

  // Limpiar solo los trazos dibujados manteniendo el fondo
  const handleClearDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
    }
    saveStateToHistory();
  };

  // Cargar imagen personalizada del usuario
  const handleUploadImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomBgUrl(event.target.result);
      setBgType('custom');
      setHistory([]);
      setHistoryStep(-1);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Descargar imagen compuesta en alta resolución
  const handleDownloadSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `pizarra_openmun_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--panel-color)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
        position: 'relative',
        userSelect: 'none'
      }}
    >
      {/* ─── BARRA DE HERRAMIENTAS SUPERIOR ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.5rem 0.85rem',
          backgroundColor: 'var(--card-header-bg)',
          borderBottom: '1px solid var(--border-color)',
          zIndex: 10
        }}
      >
        {/* Selector de Herramientas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <button
            onClick={() => setTool('pen')}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: tool === 'pen' ? '1px solid var(--btn-bg)' : '1px solid var(--border-color)',
              backgroundColor: tool === 'pen' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: tool === 'pen' ? 'var(--btn-bg)' : 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.78rem',
              fontWeight: '600'
            }}
            title="Lápiz / Pincel"
          >
            <Pen size={14} />
            <span style={{ display: 'none', md: 'inline' }}>{t('whiteboard.pen', 'Lápiz')}</span>
          </button>

          <button
            onClick={() => setTool('highlighter')}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: tool === 'highlighter' ? '1px solid #f59e0b' : '1px solid var(--border-color)',
              backgroundColor: tool === 'highlighter' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              color: tool === 'highlighter' ? '#f59e0b' : 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.78rem',
              fontWeight: '600'
            }}
            title="Resaltador Semitransparente"
          >
            <Highlighter size={14} />
            <span style={{ display: 'none', md: 'inline' }}>{t('whiteboard.highlighter', 'Resaltador')}</span>
          </button>

          <button
            onClick={() => setTool('arrow')}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: tool === 'arrow' ? '1px solid #ec4899' : '1px solid var(--border-color)',
              backgroundColor: tool === 'arrow' ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
              color: tool === 'arrow' ? '#ec4899' : 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.78rem',
              fontWeight: '600'
            }}
            title="Flecha Táctica"
          >
            <MoveRight size={14} />
            <span style={{ display: 'none', md: 'inline' }}>{t('whiteboard.arrow', 'Flecha')}</span>
          </button>

          <button
            onClick={() => setTool('circle')}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: tool === 'circle' ? '1px solid #10b981' : '1px solid var(--border-color)',
              backgroundColor: tool === 'circle' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: tool === 'circle' ? '#10b981' : 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.78rem',
              fontWeight: '600'
            }}
            title="Zona Táctica / Círculo"
          >
            <Circle size={14} />
            <span style={{ display: 'none', md: 'inline' }}>{t('whiteboard.zone', 'Zona')}</span>
          </button>

          <button
            onClick={() => setTool('text')}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: tool === 'text' ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
              backgroundColor: tool === 'text' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              color: tool === 'text' ? '#8b5cf6' : 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.78rem',
              fontWeight: '600'
            }}
            title="Añadir Texto"
          >
            <Type size={14} />
            <span style={{ display: 'none', md: 'inline' }}>{t('whiteboard.text', 'Texto')}</span>
          </button>

          <button
            onClick={() => setTool('eraser')}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: tool === 'eraser' ? '1px solid #ef4444' : '1px solid var(--border-color)',
              backgroundColor: tool === 'eraser' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
              color: tool === 'eraser' ? '#ef4444' : 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.78rem',
              fontWeight: '600'
            }}
            title="Borrador"
          >
            <Eraser size={14} />
            <span style={{ display: 'none', md: 'inline' }}>{t('whiteboard.eraser', 'Borrador')}</span>
          </button>
        </div>

        {/* Paleta de Colores & Selector de Grosor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Paleta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: color === c ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.5)',
                  boxShadow: color === c ? '0 0 6px rgba(255,255,255,0.6)' : 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transform: color === c ? 'scale(1.2)' : 'scale(1)',
                  transition: 'transform 0.15s ease'
                }}
                title={`Color ${c}`}
              />
            ))}
            {/* Color Picker Libre */}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{
                width: '20px',
                height: '20px',
                padding: 0,
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                background: 'transparent'
              }}
              title="Selector de color personalizado"
            />
          </div>

          {/* Selector de Grosor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            {BRUSH_SIZES.map((b) => (
              <button
                key={b.size}
                onClick={() => setBrushSize(b.size)}
                style={{
                  padding: '0.25rem 0.45rem',
                  fontSize: '0.7rem',
                  fontWeight: brushSize === b.size ? '700' : '500',
                  borderRadius: '4px',
                  border: brushSize === b.size ? '1px solid var(--btn-bg)' : '1px solid var(--border-color)',
                  backgroundColor: brushSize === b.size ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: brushSize === b.size ? 'var(--btn-bg)' : 'var(--muted-text)',
                  cursor: 'pointer'
                }}
                title={`Grosor: ${b.label}`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fondos Predefinidos, Carga de Archivo & Exportar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {/* Selector de Fondo */}
          <select
            value={bgType}
            onChange={(e) => {
              const val = e.target.value;
              setBgType(val);
              if (val !== 'custom') {
                setCustomBgUrl(null);
              }
            }}
            style={{
              padding: '0.35rem 0.5rem',
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              fontSize: '0.76rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {PRESET_BACKGROUNDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
            {customBgUrl && <option value="custom">Imagen Subida</option>}
          </select>

          {/* Botón Subir Imagen */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '0.4rem 0.55rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--panel-color)',
              color: 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.76rem',
              fontWeight: '600'
            }}
            title="Cargar mapa o imagen personalizada desde tu equipo"
          >
            <Upload size={13} />
            <span>{t('common.upload', 'Subir')}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleUploadImage}
          />

          {/* Deshacer */}
          <button
            onClick={handleUndo}
            disabled={historyStep < 0}
            style={{
              padding: '0.4rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: historyStep >= 0 ? 'var(--text-color)' : 'var(--muted-text)',
              cursor: historyStep >= 0 ? 'pointer' : 'not-allowed',
              opacity: historyStep >= 0 ? 1 : 0.4
            }}
            title="Deshacer (Undo)"
          >
            <RotateCcw size={14} />
          </button>

          {/* Rehacer */}
          <button
            onClick={handleRedo}
            disabled={historyStep >= history.length - 1}
            style={{
              padding: '0.4rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: historyStep < history.length - 1 ? 'var(--text-color)' : 'var(--muted-text)',
              cursor: historyStep < history.length - 1 ? 'pointer' : 'not-allowed',
              opacity: historyStep < history.length - 1 ? 1 : 0.4
            }}
            title="Rehacer (Redo)"
          >
            <RotateCw size={14} />
          </button>

          {/* Limpiar */}
          <button
            onClick={handleClearDrawing}
            style={{
              padding: '0.4rem',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              cursor: 'pointer'
            }}
            title="Limpiar todos los trazos (mantiene el fondo)"
          >
            <Trash2 size={14} />
          </button>

          {/* Descargar Captura PNG */}
          <button
            onClick={handleDownloadSnapshot}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid #3b82f644',
              backgroundColor: '#1d4ed8',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.76rem',
              fontWeight: '600',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
            }}
            title="Descargar captura PNG con fondo y dibujos"
          >
            <Download size={13} />
            <span>{t('common.save', 'Guardar')}</span>
          </button>
        </div>
      </div>

      {/* ─── ÁREA PRINCIPAL DE LIENZO / CANVAS ─── */}
      <div
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: '#020617',
          cursor:
            tool === 'eraser'
              ? 'crosshair'
              : tool === 'text'
              ? 'text'
              : tool === 'arrow' || tool === 'circle'
              ? 'crosshair'
              : 'crosshair'
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleStartDraw}
          onMouseMove={handleMoveDraw}
          onMouseUp={handleEndDraw}
          onMouseLeave={handleEndDraw}
          onTouchStart={handleStartDraw}
          onTouchMove={handleMoveDraw}
          onTouchEnd={handleEndDraw}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            touchAction: 'none'
          }}
        />

        {/* Input Modal / Prompt para escribir texto en el canvas */}
        {textInputPrompt && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.85rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              minWidth: '260px'
            }}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-color)' }}>
              {t('whiteboard.insertText', 'Insertar Anotación / Texto')}
            </div>
            <input
              autoFocus
              type="text"
              placeholder={t('whiteboard.notePlaceholder', 'Escribe tu nota aquí...')}
              value={textInputPrompt.text}
              onChange={(e) => setTextInputPrompt({ ...textInputPrompt, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyText();
                if (e.key === 'Escape') setTextInputPrompt(null);
              }}
              style={{
                padding: '0.45rem 0.6rem',
                backgroundColor: 'var(--card-header-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-color)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
              <button
                onClick={() => setTextInputPrompt(null)}
                style={{
                  padding: '0.3rem 0.6rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--muted-text)',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                onClick={applyText}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {t('whiteboard.insert', 'Insertar')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PizarraInteractiva;
