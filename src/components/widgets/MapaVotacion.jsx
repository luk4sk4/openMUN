import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Vote,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Crown,
  Search,
  Users,
  Eye,
  Sliders,
  Sparkles,
  Info,
  X,
  Target,
  Flame,
  Check,
  Globe,
  Play,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Square,
  Settings,
  ShieldAlert,
  Scale
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../context/SessionContext';
import CountryFlag from '../common/CountryFlag';
import { emojiToIso, normalizarBandera, DICCIONARIO_PAISES_ISO } from '../../utils/flags';
import worldSvgRaw from '../../assets/world.svg?raw';

// Normalizador estricto de texto
const normalizar = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

// Diccionario completo extendido para mapeo SVG <-> ISO 3166-1 alpha-2
const SVG_NAME_TO_ISO = {
  // P5 y Potencias
  'united states': 'us', 'usa': 'us', 'estados unidos': 'us', 'estados unidos de america': 'us', 'american samoa': 'us', 'puerto rico': 'us', 'guam': 'us', 'northern mariana islands': 'us', 'united states virgin islands': 'us',
  'united kingdom': 'gb', 'uk': 'gb', 'reino unido': 'gb', 'gran bretana': 'gb', 'great britain': 'gb', 'inglaterra': 'gb', 'falkland islands': 'gb', 'cayman islands': 'gb', 'turks and caicos islands': 'gb', 'bermuda': 'gb', 'gibraltar': 'gb',
  'russian federation': 'ru', 'russia': 'ru', 'rusia': 'ru', 'federacion rusa': 'ru', 'federacion de rusia': 'ru',
  'china': 'cn', 'peoples republic of china': 'cn', 'republica popular china': 'cn', 'taiwan': 'tw', 'hong kong': 'hk', 'macau': 'mo',
  'france': 'fr', 'francia': 'fr', 'french polynesia': 'fr', 'new caledonia': 'fr', 'guadeloupe': 'fr', 'martinique': 'fr', 'french guiana': 'fr', 'reunion': 'fr',

  // Iberoamérica
  'spain': 'es', 'espana': 'es', 'españa': 'es', 'canary islands (spain)': 'es', 'reino de espana': 'es',
  'argentina': 'ar', 'bolivia': 'bo', 'brazil': 'br', 'brasil': 'br', 'chile': 'cl',
  'colombia': 'co', 'costa rica': 'cr', 'cuba': 'cu', 'dominican republic': 'do', 'republica dominicana': 'do',
  'ecuador': 'ec', 'el salvador': 'sv', 'guatemala': 'gt', 'honduras': 'hn', 'mexico': 'mx',
  'nicaragua': 'ni', 'panama': 'pa', 'paraguay': 'py', 'peru': 'pe', 'uruguay': 'uy', 'venezuela': 've',
  'portugal': 'pt',

  // Europa
  'albania': 'al', 'germany': 'de', 'alemania': 'de', 'andorra': 'ad', 'austria': 'at',
  'belarus': 'by', 'belgica': 'be', 'belgium': 'be', 'bosnia and herzegovina': 'ba', 'bulgaria': 'bg',
  'croatia': 'hr', 'croacia': 'hr', 'cyprus': 'cy', 'chipre': 'cy', 'czech republic': 'cz', 'czechia': 'cz', 'republica checa': 'cz',
  'denmark': 'dk', 'dinamarca': 'dk', 'greenland': 'dk', 'faeroe islands': 'dk',
  'estonia': 'ee', 'finland': 'fi', 'finlandia': 'fi', 'georgia': 'ge', 'greece': 'gr', 'grecia': 'gr',
  'hungary': 'hu', 'hungria': 'hu', 'iceland': 'is', 'islandia': 'is', 'ireland': 'ie', 'irlanda': 'ie',
  'italy': 'it', 'italia': 'it', 'latvia': 'lv', 'letonia': 'lv', 'liechtenstein': 'li', 'lithuania': 'lt', 'lituania': 'lt',
  'luxembourg': 'lu', 'luxemburgo': 'lu', 'macedonia': 'mk', 'north macedonia': 'mk', 'macedonia del norte': 'mk',
  'malta': 'mt', 'moldova': 'md', 'monaco': 'mc', 'montenegro': 'me', 'netherlands': 'nl', 'paises bajos': 'nl', 'holanda': 'nl',
  'saba (netherlands)': 'nl', 'st. eustatius (netherlands)': 'nl',
  'norway': 'no', 'noruega': 'no', 'poland': 'pl', 'polonia': 'pl', 'romania': 'ro', 'rumania': 'ro',
  'san marino': 'sm', 'serbia': 'rs', 'slovakia': 'sk', 'eslovaquia': 'sk', 'slovenia': 'si', 'eslovenia': 'si',
  'sweden': 'se', 'suecia': 'se', 'switzerland': 'ch', 'suiza': 'ch', 'turkey': 'tr', 'turquia': 'tr', 'turkiye': 'tr',
  'ukraine': 'ua', 'ucrania': 'ua', 'vatican': 'va', 'holy see': 'va', 'santa sede': 'va',

  // Asia y Oceanía
  'afghanistan': 'af', 'armenia': 'am', 'australia': 'au', 'azerbaijan': 'az', 'bahrain': 'bh',
  'bangladesh': 'bd', 'bhutan': 'bt', 'brunei darussalam': 'bn', 'brunei': 'bn', 'cambodia': 'kh',
  'dem. rep. korea': 'kp', 'north korea': 'kp', 'corea del norte': 'kp', 'democratic peoples republic of korea': 'kp',
  'republic of korea': 'kr', 'south korea': 'kr', 'corea del sur': 'kr', 'korea': 'kr',
  'india': 'in', 'indonesia': 'id', 'iran': 'ir', 'iraq': 'iq', 'israel': 'il', 'palestine': 'ps',
  'japan': 'jp', 'japon': 'jp', 'jordan': 'jo', 'jordania': 'jo', 'kazakhstan': 'kz', 'kuwait': 'kw',
  'kyrgyzstan': 'kg', 'lao pdr': 'la', 'laos': 'la', 'lebanon': 'lb', 'libano': 'lb',
  'malaysia': 'my', 'malasia': 'my', 'maldives': 'mv', 'mongolia': 'mn', 'myanmar': 'mm', 'burma': 'mm',
  'nepal': 'np', 'oman': 'om', 'pakistan': 'pk', 'philippines': 'ph', 'filipinas': 'ph',
  'qatar': 'qa', 'saudi arabia': 'sa', 'arabia saudita': 'sa', 'singapore': 'sg', 'sri lanka': 'lk',
  'syria': 'sy', 'syrian arab republic': 'sy', 'siria': 'sy', 'tajikistan': 'tj', 'thailand': 'th', 'tailandia': 'th',
  'timor-leste': 'tl', 'east timor': 'tl', 'turkmenistan': 'tm', 'united arab emirates': 'ae', 'emiratos arabes unidos': 'ae',
  'uzbekistan': 'uz', 'vietnam': 'vn', 'viet nam': 'vn', 'yemen': 'ye',
  'new zealand': 'nz', 'nueva zelanda': 'nz', 'fiji': 'fj', 'papua new guinea': 'pg', 'solomon islands': 'sb',
  'vanuatu': 'vu', 'samoa': 'ws', 'tonga': 'to', 'kiribati': 'ki', 'micronesia': 'fm',
  'federated states of micronesia': 'fm', 'marshall islands': 'mh', 'palau': 'pw', 'nauru': 'nr', 'tuvalu': 'tv',

  // África
  'algeria': 'dz', 'argelia': 'dz', 'angola': 'ao', 'benin': 'bj', 'botswana': 'bw', 'burkina faso': 'bf',
  'burundi': 'bi', 'cabo verde': 'cv', 'cape verde': 'cv', 'cameroon': 'cm', 'camerun': 'cm',
  'central african republic': 'cf', 'republica centroafricana': 'cf', 'chad': 'td', 'comoros': 'km',
  'republic of congo': 'cg', 'congo': 'cg', 'democratic republic of the congo': 'cd', 'rd congo': 'cd',
  'cote d\'ivoire': 'ci', 'cote divoire': 'ci', 'costa de marfil': 'ci', 'djibouti': 'dj', 'egypt': 'eg', 'egipto': 'eg',
  'equatorial guinea': 'gq', 'guinea ecuatorial': 'gq', 'eritrea': 'er', 'eswatini': 'sz', 'swaziland': 'sz',
  'ethiopia': 'et', 'etiopia': 'et', 'gabon': 'ga', 'the gambia': 'gm', 'gambia': 'gm', 'ghana': 'gh',
  'guinea': 'gn', 'guinea-bissau': 'gw', 'kenya': 'ke', 'kenia': 'ke', 'lesotho': 'ls', 'liberia': 'lr',
  'libya': 'ly', 'libia': 'ly', 'madagascar': 'mg', 'malawi': 'mw', 'mali': 'ml', 'mauritania': 'mr',
  'mauritius': 'mu', 'mauricio': 'mu', 'morocco': 'ma', 'marruecos': 'ma', 'mozambique': 'mz',
  'namibia': 'na', 'niger': 'ne', 'nigeria': 'ng', 'rwanda': 'rw', 'sao tome and principe': 'st',
  'senegal': 'sn', 'seychelles': 'sc', 'sierra leone': 'sl', 'somalia': 'so', 'south africa': 'za', 'sudafrica': 'za',
  'south sudan': 'ss', 'sudan del sur': 'ss', 'sudan': 'sd', 'tanzania': 'tz', 'togo': 'tg',
  'tunisia': 'tn', 'tunez': 'tn', 'uganda': 'ug', 'zambia': 'zm', 'zimbabwe': 'zw',

  // Caribe y otros
  'antigua and barbuda': 'ag', 'bahamas': 'bs', 'barbados': 'bb', 'belize': 'bz', 'belice': 'bz',
  'dominica': 'dm', 'grenada': 'gd', 'guyana': 'gy', 'haiti': 'ht', 'jamaica': 'jm',
  'saint kitts and nevada': 'kn', 'saint kitts and nevis': 'kn', 'saint lucia': 'lc', 'saint vincent and the grenadines': 'vc',
  'suriname': 'sr', 'trinidad and tobago': 'tt'
};

// Función para obtener ISO a partir de los atributos del SVG
function resolvePathIso(id, className, name) {
  if (id) {
    const cleanId = id.trim().toLowerCase();
    if (cleanId.length === 2) return cleanId;
    if (cleanId.startsWith('bq')) return 'nl';
  }
  if (className) {
    const norm = normalizar(className);
    const iso = SVG_NAME_TO_ISO[norm] || DICCIONARIO_PAISES_ISO[norm];
    if (iso) return iso.toLowerCase();
  }
  if (name) {
    const norm = normalizar(name);
    const iso = SVG_NAME_TO_ISO[norm] || DICCIONARIO_PAISES_ISO[norm];
    if (iso) return iso.toLowerCase();
  }
  return null;
}

// ─── PARSEO ESTÁTICO DE LOS TRAZADOS SVG (Ejecutado 1 sola vez en memoria) ───
const PARSED_WORLD_PATHS = (() => {
  const pathRegex = /<path\s+([^>]+)>/gi;
  const list = [];
  let match;

  while ((match = pathRegex.exec(worldSvgRaw)) !== null) {
    const attrs = match[1];
    const dMatch = attrs.match(/d\s*=\s*["']([^"']+)["']/i);
    const d = dMatch ? dMatch[1] : '';
    const idMatch = attrs.match(/id\s*=\s*["']([^"']+)["']/i);
    const id = idMatch ? idMatch[1] : '';
    const nameMatch = attrs.match(/name\s*=\s*["']([^"']+)["']/i);
    const name = nameMatch ? nameMatch[1] : '';
    const classMatch = attrs.match(/class\s*=\s*["']([^"']+)["']/i);
    const className = classMatch ? classMatch[1] : '';

    if (d) {
      const iso = resolvePathIso(id, className, name) || '';
      const displayName = name || className || id;
      list.push({
        d,
        id,
        name: displayName,
        normName: normalizar(displayName),
        className,
        iso
      });
    }
  }

  return list;
})();

const MapaVotacion = ({ isLight: propIsLight }) => {
  const { t } = useTranslation();
  const {
    paises,
    votacionSesion,
    registrarVotoPais,
    configurarVotacion,
    resetearVotacion
  } = useSession();

  const outerContainerRef = useRef(null);
  const { asunto = 'Votación', tipoVotacion = 'procedural', tipoMayoria = 'simple', aplicarVeto = true, votos = {} } = votacionSesion || {};

  // Detección reactiva de Modo Claro / Modo Oscuro
  const [internalIsLight, setInternalIsLight] = useState(() => {
    if (propIsLight !== undefined) return propIsLight;
    try {
      const saved = localStorage.getItem('openmun_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed?.accessibility?.themeMode === 'light';
      }
    } catch { }
    return false;
  });

  useEffect(() => {
    if (propIsLight !== undefined) {
      setInternalIsLight(propIsLight);
    }
  }, [propIsLight]);

  // Escuchar cambios de tema en tiempo real
  useEffect(() => {
    const handleThemeCheck = () => {
      try {
        const saved = localStorage.getItem('openmun_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.accessibility?.themeMode) {
            setInternalIsLight(parsed.accessibility.themeMode === 'light');
          }
        }
      } catch { }
    };

    window.addEventListener('storage', handleThemeCheck);
    window.addEventListener('openmun_theme_change', handleThemeCheck);
    return () => {
      window.removeEventListener('storage', handleThemeCheck);
      window.removeEventListener('openmun_theme_change', handleThemeCheck);
    };
  }, []);

  const isLight = propIsLight !== undefined ? propIsLight : internalIsLight;

  // Estados de Interacción del Mapa
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPos, setStartPanPos] = useState({ x: 0, y: 0 });
  const [hasMovedPan, setHasMovedPan] = useState(false);

  // Modales y Hover
  const [hoveredIso, setHoveredIso] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [selectedCountryForVote, setSelectedCountryForVote] = useState(null);

  // Filtros & Modos
  const [filtroVista, setFiltroVista] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mostrarAjustes, setMostrarAjustes] = useState(false);

  // ─── ESTADO PARA ROLL CALL NOMINAL DE 2 RONDAS ───
  const [modoRollCall, setModoRollCall] = useState(false);
  const [rondaRollCall, setRondaRollCall] = useState(1);
  const [indiceRollCall, setIndiceRollCall] = useState(0);
  const [paisesPasados, setPaisesPasados] = useState([]);
  const [rollCallFinalizado, setRollCallFinalizado] = useState(false);

  // Lista de Países Asistentes
  const paisesAsistentes = useMemo(() => {
    return paises.filter(p => p.estatus === 'Presente' || p.estatus === 'Presente y Votando');
  }, [paises]);

  // Lista de Países para la Ronda de Roll Call Actual
  const listaPaisesRondaRollCall = useMemo(() => {
    const todosOrdenados = [...paisesAsistentes].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    if (rondaRollCall === 1) {
      return todosOrdenados;
    } else {
      return todosOrdenados.filter(p => paisesPasados.includes(p.id));
    }
  }, [paisesAsistentes, rondaRollCall, paisesPasados]);

  const paisActualRollCall = (!rollCallFinalizado && listaPaisesRondaRollCall[indiceRollCall]) || null;

  // Mapa de correspondencia unificado: ISO/Nombre -> Objeto País de SessionContext
  const countryLookup = useMemo(() => {
    const map = new Map();

    paises.forEach(p => {
      if (p.id !== undefined && p.id !== null) {
        map.set(String(p.id), p);
      }

      const iso = normalizarBandera(p.bandera, p.nombre);
      if (iso && iso.length === 2) {
        map.set(iso.toLowerCase(), p);
      }

      const normName = normalizar(p.nombre);
      map.set(normName, p);

      const isoFromDict = DICCIONARIO_PAISES_ISO[normName] || SVG_NAME_TO_ISO[normName];
      if (isoFromDict) {
        map.set(isoFromDict.toLowerCase(), p);
      }
    });

    return map;
  }, [paises]);

  // Extraer estadísticas y dictamen
  const stats = useMemo(() => {
    let f = 0, c = 0, a = 0, pendientes = 0;
    const vetoPaises = [];

    paisesAsistentes.forEach(p => {
      const v = votos[p.id] || votos[String(p.id)];
      if (v === 'favor') f++;
      else if (v === 'contra') {
        c++;
        if (aplicarVeto && p.veto) {
          vetoPaises.push(p);
        }
      }
      else if (v === 'abstencion') a++;
      else pendientes++;
    });

    const totalEmitidos = f + c + a;
    const totalAsistentes = paisesAsistentes.length;
    const reqSimpleQuorum = totalAsistentes > 0 ? Math.floor(totalAsistentes / 2) + 1 : 0;
    const reqDosTerciosQuorum = totalAsistentes > 0 ? Math.ceil((totalAsistentes * 2) / 3) : 0;

    const votosValidosSinAbstencion = f + c;
    let superado = false;
    let requeridos = reqSimpleQuorum;
    let textoRequerido = '';

    if (tipoMayoria === 'simple') {
      if (tipoVotacion === 'substantive' && totalEmitidos > 0 && votosValidosSinAbstencion > 0) {
        requeridos = Math.floor(votosValidosSinAbstencion / 2) + 1;
        superado = f > c && f >= requeridos;
        textoRequerido = `${requeridos} votos A Favor (50%+1 de ${votosValidosSinAbstencion} votos válidos emitidos)`;
      } else {
        requeridos = reqSimpleQuorum;
        superado = f > c && f >= reqSimpleQuorum;
        textoRequerido = `${requeridos} votos A Favor (50%+1 de ${totalAsistentes} delegaciones)`;
      }
    } else if (tipoMayoria === '2/3') {
      if (tipoVotacion === 'substantive' && totalEmitidos > 0 && votosValidosSinAbstencion > 0) {
        requeridos = Math.ceil((votosValidosSinAbstencion * 2) / 3);
        superado = f >= requeridos && f > 0;
        textoRequerido = `${requeridos} votos A Favor (2/3 de ${votosValidosSinAbstencion} votos válidos emitidos)`;
      } else {
        requeridos = reqDosTerciosQuorum;
        superado = f >= reqDosTerciosQuorum && f > 0;
        textoRequerido = `${requeridos} votos A Favor (2/3 de ${totalAsistentes} delegaciones)`;
      }
    } else if (tipoMayoria === 'consensus') {
      requeridos = 0;
      superado = c === 0 && f > 0 && pendientes === 0;
      textoRequerido = `0 votos En Contra (100% consenso de ${totalAsistentes} delegaciones)`;
    }

    const vetoEjercido = vetoPaises.length > 0;
    const aprobada = superado && !vetoEjercido;

    return {
      favor: f,
      contra: c,
      abstencion: a,
      pendientes,
      totalAsistentes,
      totalEmitidos,
      requeridos,
      reqSimpleQuorum,
      reqDosTerciosQuorum,
      superado,
      aprobada,
      vetoEjercido,
      paisesVeto: vetoPaises,
      textoRequerido
    };
  }, [paisesAsistentes, votos, tipoMayoria, tipoVotacion, aplicarVeto]);

  // 1. Zoom con la rueda sin desplazar la pestaña
  useEffect(() => {
    const el = outerContainerRef.current;
    if (!el) return;

    const onWheelNative = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      setZoom(z => Math.min(Math.max(z * factor, 0.65), 5.5));
    };

    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheelNative);
    };
  }, []);

  // Controles de Pan & Zoom
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.35, 5.5));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.35, 0.65));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedCountryForVote(null);
  };

  // Drag Panning
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setHasMovedPan(false);
    setStartPanPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    const newX = e.clientX - startPanPos.x;
    const newY = e.clientY - startPanPos.y;
    if (Math.abs(newX - pan.x) > 4 || Math.abs(newY - pan.y) > 4) {
      setHasMovedPan(true);
    }
    setPan({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setTimeout(() => setHasMovedPan(false), 50);
  };

  // ─── ACCIONES DE ROLL CALL NOMINAL ───
  const toggleModoRollCall = () => {
    if (!modoRollCall) {
      setModoRollCall(true);
      setRondaRollCall(1);
      setIndiceRollCall(0);
      setPaisesPasados([]);
      setRollCallFinalizado(false);
      setSelectedCountryForVote(null);
    } else {
      setModoRollCall(false);
      setRollCallFinalizado(false);
    }
  };

  const registrarYAvanzarRollCall = (voto) => {
    if (!paisActualRollCall) return;

    let nuevosPasados = paisesPasados;
    if (voto === 'pasar') {
      if (!paisesPasados.includes(paisActualRollCall.id)) {
        nuevosPasados = [...paisesPasados, paisActualRollCall.id];
        setPaisesPasados(nuevosPasados);
      }
    } else {
      registrarVotoPais(paisActualRollCall.id, voto);
    }

    if (indiceRollCall < listaPaisesRondaRollCall.length - 1) {
      setIndiceRollCall(prev => prev + 1);
    } else {
      if (rondaRollCall === 1) {
        if (nuevosPasados.length > 0) {
          setRondaRollCall(2);
          setIndiceRollCall(0);
        } else {
          setRollCallFinalizado(true);
        }
      } else {
        setRollCallFinalizado(true);
      }
    }
  };

  const retrocederRollCall = () => {
    if (indiceRollCall > 0) {
      setIndiceRollCall(prev => prev - 1);
    }
  };

  // Voto rápido desde modal
  const handleSetVote = (voteType) => {
    if (!selectedCountryForVote?.countryObj) return;
    registrarVotoPais(selectedCountryForVote.countryObj.id, voteType);
    setSelectedCountryForVote(null);
  };

  // Limpiar voto
  const handleClearVote = () => {
    if (!selectedCountryForVote?.countryObj) return;
    registrarVotoPais(selectedCountryForVote.countryObj.id, null);
    setSelectedCountryForVote(null);
  };

  // Toggle Pantalla Completa
  const toggleFullscreen = () => {
    if (!outerContainerRef.current) return;
    if (!document.fullscreenElement) {
      outerContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Manejadores de Eventos sobre cada Path
  const handlePathClick = (country, name, e) => {
    e.stopPropagation();
    if (hasMovedPan) return;

    const rect = outerContainerRef.current.getBoundingClientRect();
    const popupX = Math.max(20, Math.min(rect.width - 240, e.clientX - rect.left));
    const popupY = Math.max(20, Math.min(rect.height - 250, e.clientY - rect.top));

    if (country) {
      setSelectedCountryForVote({
        countryObj: country,
        x: popupX,
        y: popupY
      });
    }
  };

  const handlePathMouseEnter = (iso, country, name, e) => {
    setHoveredIso(iso || name);
    const rect = outerContainerRef.current.getBoundingClientRect();
    const mouseX = Math.max(10, Math.min(rect.width - 210, e.clientX - rect.left));
    const mouseY = Math.max(10, Math.min(rect.height - 110, e.clientY - rect.top));

    const currentVote = country ? (votos[country.id] || votos[String(country.id)]) : null;

    setTooltipData({
      name: country ? country.nombre : name,
      iso,
      countryObj: country,
      vote: currentVote,
      status: country ? country.estatus : 'No Delegado',
      isP5: country ? country.veto : false,
      x: mouseX,
      y: mouseY
    });
  };

  const handlePathMouseMove = (e) => {
    if (!outerContainerRef.current) return;
    const rect = outerContainerRef.current.getBoundingClientRect();
    const mouseX = Math.max(10, Math.min(rect.width - 210, e.clientX - rect.left));
    const mouseY = Math.max(10, Math.min(rect.height - 110, e.clientY - rect.top));

    setTooltipData(prev => prev ? { ...prev, x: mouseX, y: mouseY } : null);
  };

  const handlePathMouseLeave = () => {
    setHoveredIso(null);
    setTooltipData(null);
  };

  return (
    <div
      ref={outerContainerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: isLight ? 'var(--panel-color, #ffffff)' : '#040711',
        color: isLight ? 'var(--text-color, #0f172a)' : '#f8fafc',
        borderRadius: isFullscreen ? '0' : 'var(--border-radius, 8px)',
        overflow: 'hidden',
        border: isFullscreen ? 'none' : `1px solid ${isLight ? 'var(--border-color, #e2e8f0)' : '#2b3042'}`,
        boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : '0 8px 32px rgba(0,0,0,0.5)',
        position: 'relative',
        userSelect: 'none',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
      onClick={() => setSelectedCountryForVote(null)}
    >
      {/* ─── HEADER SUPERIOR: ASUNTO Y MARCADORES EN VIVO ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.65rem',
          padding: '0.65rem 1rem',
          backgroundColor: isLight ? 'var(--card-header-bg, #f8fafc)' : '#0a0f1e',
          borderBottom: `1px solid ${isLight ? 'var(--border-color, #e2e8f0)' : '#1e293b'}`,
          zIndex: 20
        }}
      >
        {/* Título & Asunto editable */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: '200px', flex: '1 1 auto' }}>
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: isLight ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.15)',
              border: `1px solid ${isLight ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.35)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Globe size={18} color="#3b82f6" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: '800', color: isLight ? 'var(--text-color, #0f172a)' : '#ffffff', letterSpacing: '-0.01em' }}>
                {t('voting.worldMapTitle', 'Mapa Mundial de Votación')}
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: '800',
                  padding: '0.12rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor: stats.vetoEjercido
                    ? (isLight ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.25)')
                    : (stats.superado
                      ? (isLight ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.2)')
                      : (isLight ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.18)')),
                  color: stats.vetoEjercido
                    ? (isLight ? '#dc2626' : '#f87171')
                    : (stats.superado
                      ? (isLight ? '#16a34a' : '#4ade80')
                      : (isLight ? '#2563eb' : '#60a5fa')),
                  border: `1px solid ${stats.vetoEjercido ? (isLight ? '#ef4444' : 'rgba(239, 68, 68, 0.45)') : (stats.superado ? (isLight ? '#22c55e' : 'rgba(34, 197, 94, 0.45)') : (isLight ? '#3b82f6' : 'rgba(59, 130, 246, 0.45)'))}`
                }}
              >
                {stats.vetoEjercido ? t('voting.vetoed', 'VETADA') : (stats.superado ? t('voting.passed', 'APROBADA') : (tipoMayoria === 'consensus' ? t('voting.consensus', 'CONSENSO (0 contra)') : `${t('voting.target', 'META')}: ${stats.favor}/${stats.requeridos}`))}
              </span>

              {/* Badges de Tipo y Mayoría */}
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  backgroundColor: isLight ? '#f1f5f9' : '#1e293b',
                  color: isLight ? '#475569' : '#94a3b8',
                  border: `1px solid ${isLight ? '#cbd5e1' : '#334155'}`
                }}
              >
                {tipoVotacion === 'substantive' ? t('voting.substantive', 'Sustantiva') : t('voting.procedural', 'Procedimental (Sin Abst.)')}
              </span>

              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  backgroundColor: isLight ? '#f1f5f9' : '#1e293b',
                  color: isLight ? '#475569' : '#94a3b8',
                  border: `1px solid ${isLight ? '#cbd5e1' : '#334155'}`
                }}
              >
                {tipoMayoria === 'simple' ? t('voting.simpleMajority', 'Mayoría 50%+1') : (tipoMayoria === '2/3' ? t('voting.twoThirds', 'Mayoría 2/3') : t('voting.consensus', 'Consenso'))}
              </span>

              {aplicarVeto && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: '700',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    backgroundColor: isLight ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.18)',
                    color: isLight ? '#b45309' : '#fbbf24',
                    border: `1px solid ${isLight ? '#f59e0b55' : '#f59e0b44'}`
                  }}
                  title="Derecho a Veto del Consejo de Seguridad activo"
                >
                  👑 {t('voting.vetoP5', 'Veto P5')}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: isLight ? 'var(--muted-text, #64748b)' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
              {asunto || t('voting.defaultSubject', 'Votación oficial en tiempo real')}
            </div>
          </div>
        </div>

        {/* Marcadores de Conteo en Vivo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {/* A Favor */}
          <button
            type="button"
            onClick={() => setFiltroVista(filtroVista === 'FAVOR' ? 'TODOS' : 'FAVOR')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.65rem',
              backgroundColor: filtroVista === 'FAVOR' ? (isLight ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.35)') : (isLight ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.12)'),
              border: `1px solid ${filtroVista === 'FAVOR' ? '#22c55e' : (isLight ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.3)')}`,
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '800',
              color: isLight ? '#15803d' : '#86efac',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Filtrar delegaciones a favor"
          >
            <CheckCircle2 size={13} color={isLight ? '#16a34a' : '#22c55e'} />
            <span>{t('voting.inFavor', 'A Favor')}: {stats.favor}</span>
          </button>

          {/* En Contra */}
          <button
            type="button"
            onClick={() => setFiltroVista(filtroVista === 'CONTRA' ? 'TODOS' : 'CONTRA')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.65rem',
              backgroundColor: filtroVista === 'CONTRA' ? (isLight ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.35)') : (isLight ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.12)'),
              border: `1px solid ${filtroVista === 'CONTRA' ? '#ef4444' : (isLight ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.3)')}`,
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '800',
              color: isLight ? '#b91c1c' : '#fca5a5',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Filtrar delegaciones en contra"
          >
            <XCircle size={13} color={isLight ? '#dc2626' : '#ef4444'} />
            <span>{t('voting.against', 'En Contra')}: {stats.contra}</span>
          </button>

          {/* Abstención */}
          <button
            type="button"
            onClick={() => setFiltroVista(filtroVista === 'ABSTENCION' ? 'TODOS' : 'ABSTENCION')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.65rem',
              backgroundColor: filtroVista === 'ABSTENCION' ? (isLight ? 'rgba(234, 179, 8, 0.25)' : 'rgba(217, 119, 6, 0.35)') : (isLight ? 'rgba(234, 179, 8, 0.12)' : 'rgba(217, 119, 6, 0.12)'),
              border: `1px solid ${filtroVista === 'ABSTENCION' ? '#f59e0b' : (isLight ? 'rgba(234, 179, 8, 0.4)' : 'rgba(217, 119, 6, 0.3)')}`,
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '800',
              color: isLight ? '#a16207' : '#fde047',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Filtrar abstenciones"
          >
            <AlertTriangle size={13} color={isLight ? '#d97706' : '#f59e0b'} />
            <span>{t('voting.abstentionShort', 'Abst')}: {stats.abstencion}</span>
          </button>

          {/* Pendientes */}
          <button
            type="button"
            onClick={() => setFiltroVista(filtroVista === 'PENDIENTES' ? 'TODOS' : 'PENDIENTES')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.65rem',
              backgroundColor: filtroVista === 'PENDIENTES' ? (isLight ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.35)') : (isLight ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.12)'),
              border: `1px solid ${filtroVista === 'PENDIENTES' ? '#3b82f6' : (isLight ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)')}`,
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '800',
              color: isLight ? '#1d4ed8' : '#93c5fd',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Filtrar delegaciones con voto pendiente"
          >
            <HelpCircle size={13} color="#3b82f6" />
            <span>{t('voting.pendingShort', 'Pend')}: {stats.pendientes}</span>
          </button>
        </div>

        {/* ── Botón de Roll Call Nominal & Controles ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {/* Botón Ajustes de la Votación */}
          <button
            type="button"
            onClick={() => setMostrarAjustes(prev => !prev)}
            style={{
              padding: '0.35rem 0.65rem',
              backgroundColor: mostrarAjustes ? (isLight ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.25)') : (isLight ? '#ffffff' : '#131c31'),
              border: `1px solid ${mostrarAjustes ? '#3b82f6' : (isLight ? 'var(--border-color, #cbd5e1)' : '#2b3956')}`,
              borderRadius: '6px',
              color: mostrarAjustes ? (isLight ? '#1d4ed8' : '#60a5fa') : (isLight ? '#334155' : '#cbd5e1'),
              fontSize: '0.74rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
            title="Ajustes de la Votación (Tipo, Mayoría, Veto P5, Asunto)"
          >
            <Settings size={13} color={mostrarAjustes ? (isLight ? '#1d4ed8' : '#60a5fa') : (isLight ? '#64748b' : '#94a3b8')} />
            <span>{t('common.settings', 'Ajustes')}</span>
          </button>

          {/* Botón Iniciar Roll Call */}
          <button
            type="button"
            onClick={toggleModoRollCall}
            style={{
              padding: '0.35rem 0.75rem',
              backgroundColor: modoRollCall ? '#2563eb' : (isLight ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.15)'),
              border: `1px solid ${modoRollCall ? '#2563eb' : (isLight ? 'rgba(59, 130, 246, 0.35)' : '#3b82f6')}`,
              color: modoRollCall ? '#ffffff' : (isLight ? '#1d4ed8' : '#ffffff'),
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: modoRollCall ? '0 0 12px rgba(37, 99, 235, 0.5)' : 'none',
              transition: 'all 0.15s ease'
            }}
            title="Iniciar votación nominal delegación por delegación en el mapa"
          >
            {modoRollCall ? <Square size={12} fill="#ffffff" /> : <Play size={12} fill={isLight ? '#2563eb' : '#60a5fa'} color={isLight ? '#2563eb' : '#60a5fa'} />}
            <span>{modoRollCall ? t('voting.exitRollCall', 'Salir Roll Call') : t('voting.startRollCall', 'Modo Roll Call')}</span>
          </button>

          {/* Botón Reiniciar Votación */}
          <button
            type="button"
            onClick={() => {
              resetearVotacion();
              setModoRollCall(false);
              setRollCallFinalizado(false);
              setSelectedCountryForVote(null);
            }}
            style={{
              padding: '0.35rem 0.65rem',
              backgroundColor: isLight ? '#ffffff' : '#131c31',
              border: `1px solid ${isLight ? 'var(--border-color, #cbd5e1)' : '#2b3956'}`,
              borderRadius: '6px',
              color: isLight ? '#334155' : '#cbd5e1',
              fontSize: '0.74rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              transition: 'all 0.15s ease'
            }}
            title={t('voting.resetVotingTitle', 'Reiniciar todos los votos')}
          >
            <RotateCcw size={12} />
            <span>{t('common.reset', 'Reiniciar')}</span>
          </button>

          {/* Buscador de país */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: isLight ? '#94a3b8' : '#64748b' }} />
            <input
              type="text"
              placeholder={t('countries.searchPlaceholder', 'Buscar país...')}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '110px',
                padding: '0.3rem 0.5rem 0.3rem 1.6rem',
                backgroundColor: isLight ? '#ffffff' : '#131c31',
                border: `1px solid ${isLight ? 'var(--border-color, #cbd5e1)' : '#2b3956'}`,
                borderRadius: '6px',
                color: isLight ? '#0f172a' : '#ffffff',
                fontSize: '0.74rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Botón P5 */}
          <button
            type="button"
            onClick={() => setFiltroVista(filtroVista === 'P5' ? 'TODOS' : 'P5')}
            style={{
              padding: '0.35rem 0.55rem',
              backgroundColor: filtroVista === 'P5' ? (isLight ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.25)') : (isLight ? '#ffffff' : '#131c31'),
              border: `1px solid ${filtroVista === 'P5' ? '#f59e0b' : (isLight ? 'var(--border-color, #cbd5e1)' : '#2b3956')}`,
              borderRadius: '6px',
              color: filtroVista === 'P5' ? (isLight ? '#b45309' : '#fbbf24') : (isLight ? '#64748b' : '#94a3b8'),
              fontSize: '0.74rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            title="Resaltar países del Consejo de Seguridad con derecho a Veto (P5)"
          >
            <Crown size={13} color="#f59e0b" />
            <span>P5</span>
          </button>

          {/* Zoom y Reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: isLight ? '#ffffff' : '#131c31', padding: '2px', borderRadius: '6px', border: `1px solid ${isLight ? 'var(--border-color, #cbd5e1)' : '#2b3956'}` }}>
            <button
              type="button"
              onClick={handleZoomIn}
              style={{ background: 'transparent', border: 'none', color: isLight ? '#475569' : '#cbd5e1', cursor: 'pointer', padding: '4px', display: 'flex' }}
              title="Acercar (Zoom In)"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              style={{ background: 'transparent', border: 'none', color: isLight ? '#475569' : '#cbd5e1', cursor: 'pointer', padding: '4px', display: 'flex' }}
              title="Alejar (Zoom Out)"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              style={{ background: 'transparent', border: 'none', color: isLight ? '#475569' : '#cbd5e1', cursor: 'pointer', padding: '4px', display: 'flex' }}
              title="Centrar y Restablecer Vista"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {/* Pantalla Completa / Proyección */}
          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              padding: '0.35rem 0.5rem',
              backgroundColor: isLight ? '#ffffff' : '#131c31',
              border: `1px solid ${isLight ? 'var(--border-color, #cbd5e1)' : '#2b3956'}`,
              borderRadius: '6px',
              color: isLight ? '#475569' : '#cbd5e1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title={isFullscreen ? 'Salir de Pantalla Completa' : 'Modo Proyector / Pantalla Completa'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* ─── MODAL / PANEL DE AJUSTES DE LA VOTACIÓN ─── */}
      {mostrarAjustes && (
        <div
          style={{
            position: 'absolute',
            top: '56px',
            right: '16px',
            zIndex: 70,
            width: 'calc(100% - 2rem)',
            maxWidth: '520px',
            backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(10, 16, 30, 0.97)',
            backdropFilter: 'blur(16px)',
            border: `1.5px solid ${isLight ? '#cbd5e1' : '#2b3956'}`,
            borderRadius: '12px',
            padding: '1rem 1.15rem',
            boxShadow: isLight ? '0 16px 45px rgba(0,0,0,0.18)' : '0 20px 50px rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem',
            animation: 'fadeIn 0.15s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabecera del Panel de Ajustes */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${isLight ? '#e2e8f0' : '#1e293b'}`, paddingBottom: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.15)', display: 'flex' }}>
                <Settings size={17} color="#3b82f6" />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: '900', color: isLight ? '#0f172a' : '#ffffff' }}>
                  {t('voting.settingsTitle', 'Ajustes de la Votación')}
                </div>
                <div style={{ fontSize: '0.7rem', color: isLight ? '#64748b' : '#94a3b8' }}>
                  {t('voting.settingsSubtitle', 'Configuración en tiempo real sincronizada con el comité')}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMostrarAjustes(false)}
              style={{ background: 'transparent', border: 'none', color: isLight ? '#64748b' : '#94a3b8', cursor: 'pointer', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* 1. Asunto de la Votación */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.74rem', fontWeight: '800', color: isLight ? '#334155' : '#cbd5e1' }}>
              {t('voting.subjectLabel', 'Asunto / Título del Proyecto de Resolución o Moción')}
            </label>
            <input
              type="text"
              value={asunto || ''}
              onChange={(e) => configurarVotacion({ asunto: e.target.value })}
              placeholder={t('voting.subjectPlaceholder', 'Ej: Proyecto de Resolución 1.1 / Moción de Debate Moderado')}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem',
                backgroundColor: isLight ? '#ffffff' : '#131c31',
                border: `1px solid ${isLight ? '#cbd5e1' : '#2b3956'}`,
                borderRadius: '8px',
                color: isLight ? '#0f172a' : '#ffffff',
                fontSize: '0.82rem',
                outline: 'none',
                fontWeight: '600'
              }}
            />
          </div>

          {/* 2. Tipo de Votación: Sustantiva vs Procedimental */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: '800', color: isLight ? '#334155' : '#cbd5e1' }}>
                {t('voting.voteType', 'Tipo de Votación')}
              </label>
              <span style={{ fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8' }}>
                {tipoVotacion === 'procedural' ? `🚫 ${t('voting.abstentionForbidden', 'Abstención prohibida')}` : `✅ ${t('voting.abstentionAllowed', 'Abstención permitida')}`}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {/* Opción Procedimental */}
              <button
                type="button"
                onClick={() => configurarVotacion({ tipoVotacion: 'procedural' })}
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: `1.5px solid ${tipoVotacion === 'procedural' ? '#3b82f6' : (isLight ? '#e2e8f0' : '#1e293b')}`,
                  backgroundColor: tipoVotacion === 'procedural' ? (isLight ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.2)') : (isLight ? '#ffffff' : '#131c31'),
                  color: tipoVotacion === 'procedural' ? (isLight ? '#1d4ed8' : '#60a5fa') : (isLight ? '#475569' : '#cbd5e1'),
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: '800', fontSize: '0.8rem' }}>{t('voting.procedural', 'Procedimental')}</div>
                  {tipoVotacion === 'procedural' && <Check size={14} color="#3b82f6" />}
                </div>
                <div style={{ fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8', marginTop: '2px' }}>
                  {t('voting.proceduralSub', 'Mociones y orden (Sin abstención)')}
                </div>
              </button>

              {/* Opción Sustantiva */}
              <button
                type="button"
                onClick={() => configurarVotacion({ tipoVotacion: 'substantive' })}
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: `1.5px solid ${tipoVotacion === 'substantive' ? '#3b82f6' : (isLight ? '#e2e8f0' : '#1e293b')}`,
                  backgroundColor: tipoVotacion === 'substantive' ? (isLight ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.2)') : (isLight ? '#ffffff' : '#131c31'),
                  color: tipoVotacion === 'substantive' ? (isLight ? '#1d4ed8' : '#60a5fa') : (isLight ? '#475569' : '#cbd5e1'),
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: '800', fontSize: '0.8rem' }}>{t('voting.substantive', 'Sustantiva')}</div>
                  {tipoVotacion === 'substantive' && <Check size={14} color="#3b82f6" />}
                </div>
                <div style={{ fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8', marginTop: '2px' }}>
                  {t('voting.substantiveSub', 'Resoluciones y enmiendas (Con abstención)')}
                </div>
              </button>
            </div>
          </div>

          {/* 3. Regla de Mayoría */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.74rem', fontWeight: '800', color: isLight ? '#334155' : '#cbd5e1' }}>
              {t('voting.majorityRequired', 'Regla de Mayoría Requerida')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
              {/* Mayoría Simple */}
              <button
                type="button"
                onClick={() => configurarVotacion({ tipoMayoria: 'simple' })}
                style={{
                  padding: '0.5rem 0.6rem',
                  borderRadius: '8px',
                  border: `1.5px solid ${tipoMayoria === 'simple' ? '#3b82f6' : (isLight ? '#e2e8f0' : '#1e293b')}`,
                  backgroundColor: tipoMayoria === 'simple' ? (isLight ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.2)') : (isLight ? '#ffffff' : '#131c31'),
                  color: tipoMayoria === 'simple' ? (isLight ? '#1d4ed8' : '#60a5fa') : (isLight ? '#475569' : '#cbd5e1'),
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: '800' }}>{t('voting.simpleMajority', 'Simple (50%+1)')}</div>
                <div style={{ fontSize: '0.67rem', opacity: 0.8, marginTop: '2px' }}>
                  {t('voting.target', 'Meta')}: {stats.reqSimpleQuorum} {stats.reqSimpleQuorum === 1 ? t('voting.vote', 'voto') : t('voting.votes', 'votos')}
                </div>
              </button>

              {/* Mayoría Cualificada 2/3 */}
              <button
                type="button"
                onClick={() => configurarVotacion({ tipoMayoria: '2/3' })}
                style={{
                  padding: '0.5rem 0.6rem',
                  borderRadius: '8px',
                  border: `1.5px solid ${tipoMayoria === '2/3' ? '#a855f7' : (isLight ? '#e2e8f0' : '#1e293b')}`,
                  backgroundColor: tipoMayoria === '2/3' ? (isLight ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.2)') : (isLight ? '#ffffff' : '#131c31'),
                  color: tipoMayoria === '2/3' ? (isLight ? '#7e22ce' : '#c084fc') : (isLight ? '#475569' : '#cbd5e1'),
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: '800' }}>{t('voting.twoThirds', 'Cualificada (2/3)')}</div>
                <div style={{ fontSize: '0.67rem', opacity: 0.8, marginTop: '2px' }}>
                  {t('voting.target', 'Meta')}: {stats.reqDosTerciosQuorum} {stats.reqDosTerciosQuorum === 1 ? t('voting.vote', 'voto') : t('voting.votes', 'votos')}
                </div>
              </button>

              {/* Consenso 100% */}
              <button
                type="button"
                onClick={() => configurarVotacion({ tipoMayoria: 'consensus' })}
                style={{
                  padding: '0.5rem 0.6rem',
                  borderRadius: '8px',
                  border: `1.5px solid ${tipoMayoria === 'consensus' ? '#f59e0b' : (isLight ? '#e2e8f0' : '#1e293b')}`,
                  backgroundColor: tipoMayoria === 'consensus' ? (isLight ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.2)') : (isLight ? '#ffffff' : '#131c31'),
                  color: tipoMayoria === 'consensus' ? (isLight ? '#b45309' : '#fbbf24') : (isLight ? '#475569' : '#cbd5e1'),
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: '800' }}>{t('voting.consensus', 'Consenso')}</div>
                <div style={{ fontSize: '0.67rem', opacity: 0.8, marginTop: '2px' }}>
                  {t('voting.requiresZeroAgainst', '0 en contra')}
                </div>
              </button>
            </div>
          </div>

          {/* 4. Aplicación de Veto P5 (Consejo de Seguridad) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', borderRadius: '8px', backgroundColor: isLight ? '#f8fafc' : '#131c31', border: `1px solid ${isLight ? '#e2e8f0' : '#1e293b'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Crown size={18} color="#f59e0b" />
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: '800', color: isLight ? '#0f172a' : '#ffffff' }}>
                  {t('voting.vetoRight', 'Derecho a Veto (P5)')}
                </div>
                <div style={{ fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8' }}>
                  {t('voting.vetoRightDesc', 'Voto en contra de miembros permanentes veta la resolución')}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => configurarVotacion({ aplicarVeto: !aplicarVeto })}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '6px',
                border: `1.5px solid ${aplicarVeto ? '#f59e0b' : (isLight ? '#cbd5e1' : '#334155')}`,
                backgroundColor: aplicarVeto ? (isLight ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.25)') : 'transparent',
                color: aplicarVeto ? (isLight ? '#b45309' : '#fbbf24') : (isLight ? '#64748b' : '#94a3b8'),
                fontSize: '0.75rem',
                fontWeight: '900',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {aplicarVeto ? t('common.activeOn', 'ACTIVO (ON)') : t('common.inactiveOff', 'INACTIVO (OFF)')}
            </button>
          </div>

          {/* 5. Acciones de Reinicio y Cierre */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '0.4rem', borderTop: `1px solid ${isLight ? '#e2e8f0' : '#1e293b'}` }}>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('¿Deseas reiniciar y limpiar todos los votos registrados de esta votación?')) {
                  resetearVotacion();
                }
              }}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${isLight ? '#cbd5e1' : '#334155'}`,
                backgroundColor: 'transparent',
                color: isLight ? '#dc2626' : '#f87171',
                fontSize: '0.74rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <RotateCcw size={13} />
              <span>{t('voting.clearVotes', 'Limpiar Votos')}</span>
            </button>

            <button
              type="button"
              onClick={() => setMostrarAjustes(false)}
              style={{
                padding: '0.45rem 1.1rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '0.76rem',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35)'
              }}
            >
              {t('common.done', 'Listo')}
            </button>
          </div>
        </div>
      )}

      {/* ─── DOCK FLOTANTE DE ROLL CALL NOMINAL DENTRO DEL MAPA ─── */}
      {modoRollCall && (
        <div
          style={{
            position: 'absolute',
            top: '56px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 45,
            width: 'calc(100% - 2rem)',
            maxWidth: '750px',
            backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(13, 21, 39, 0.96)',
            backdropFilter: 'blur(12px)',
            border: `1.5px solid ${rollCallFinalizado ? (stats.vetoEjercido ? '#ef4444' : (stats.superado ? '#22c55e' : '#ef4444')) : (rondaRollCall === 2 ? '#f59e0b' : '#3b82f6')}`,
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            boxShadow: isLight ? '0 12px 35px rgba(0,0,0,0.18)' : '0 12px 35px rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Encabezado del Roll Call */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${isLight ? '#e2e8f0' : '#1e293b'}`, paddingBottom: '0.45rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} color={rollCallFinalizado ? (stats.vetoEjercido ? '#ef4444' : (stats.superado ? '#22c55e' : '#ef4444')) : (rondaRollCall === 2 ? '#f59e0b' : '#3b82f6')} />
              <span style={{
                fontWeight: '900',
                fontSize: '0.85rem',
                color: rollCallFinalizado
                  ? (stats.vetoEjercido ? (isLight ? '#dc2626' : '#f87171') : (stats.superado ? (isLight ? '#16a34a' : '#4ade80') : (isLight ? '#dc2626' : '#f87171')))
                  : (rondaRollCall === 2 ? (isLight ? '#b45309' : '#fbbf24') : (isLight ? '#1d4ed8' : '#60a5fa')),
                letterSpacing: '0.02em'
              }}>
                {rollCallFinalizado
                  ? t('voting.finalRulingRollCall', 'DICTAMEN FINAL — ROLL CALL NOMINAL')
                  : (rondaRollCall === 1 ? t('voting.round1RollCall', 'PRIMERA RONDA — ROLL CALL NOMINAL') : t('voting.round2RollCall', 'SEGUNDA RONDA — DELEGACIONES QUE PASARON'))}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: isLight ? '#64748b' : '#94a3b8' }}>
                {paisActualRollCall ? `${t('voting.turn', 'Turno')} ${indiceRollCall + 1} ${t('common.of', 'de')} ${listaPaisesRondaRollCall.length}` : t('voting.rollCallCompleted', 'Votación Nominal Completada')}
              </span>
              <button
                type="button"
                onClick={toggleModoRollCall}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isLight ? '#64748b' : '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={t('voting.closeRollCall', 'Cerrar Roll Call')}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Tarjeta del País Activo y Botones de Voto */}
          {paisActualRollCall ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Info de la Delegación en Turno */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CountryFlag bandera={paisActualRollCall.bandera} nombre={paisActualRollCall.nombre} size="xl" />
                <div>
                  <div style={{ fontSize: '0.7rem', color: isLight ? '#64748b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700' }}>
                    {paisActualRollCall.estatus}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '900', color: isLight ? '#0f172a' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span>{paisActualRollCall.nombre}</span>
                    {paisActualRollCall.veto && <Crown size={16} color="#f59e0b" fill="#f59e0b" title="Miembro Permanente (P5) con Veto" />}
                  </div>
                </div>
              </div>

              {/* Botones de Voto Roll Call */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                {indiceRollCall > 0 && (
                  <button
                    type="button"
                    onClick={retrocederRollCall}
                    style={{
                      padding: '0.55rem 0.65rem',
                      backgroundColor: isLight ? '#f1f5f9' : '#1e293b',
                      color: isLight ? '#334155' : '#cbd5e1',
                      fontWeight: '700',
                      border: `1px solid ${isLight ? '#cbd5e1' : '#334155'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                    title="Retroceder al país anterior"
                  >
                    <ChevronLeft size={14} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => registrarYAvanzarRollCall('favor')}
                  style={{
                    padding: '0.55rem 1rem',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontWeight: '900',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.86rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.4)'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{t('voting.inFavor', 'A Favor')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => registrarYAvanzarRollCall('contra')}
                  style={{
                    padding: '0.55rem 1rem',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontWeight: '900',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.86rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)'
                  }}
                >
                  <XCircle size={16} />
                  <span>{t('voting.against', 'En Contra')}</span>
                </button>

                {tipoVotacion === 'substantive' && (
                  <button
                    type="button"
                    onClick={() => registrarYAvanzarRollCall('abstencion')}
                    disabled={paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2}
                    style={{
                      padding: '0.55rem 0.9rem',
                      backgroundColor: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? (isLight ? '#e2e8f0' : '#1e293b') : '#d97706',
                      color: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? (isLight ? '#94a3b8' : '#64748b') : '#ffffff',
                      fontWeight: '800',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 'not-allowed' : 'pointer',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      opacity: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 0.4 : 1
                    }}
                    title={
                      rondaRollCall === 2
                        ? 'En segunda ronda no se puede abstener'
                        : (paisActualRollCall.estatus === 'Presente y Votando' ? 'Delegaciones en "Presente y Votando" no pueden abstenerse' : 'Abstención')
                    }
                  >
                    <AlertTriangle size={15} />
                    <span>{t('voting.abstention', 'Abstención')}</span>
                  </button>
                )}

                {rondaRollCall === 1 && (
                  <button
                    type="button"
                    onClick={() => registrarYAvanzarRollCall('pasar')}
                    style={{
                      padding: '0.55rem 0.9rem',
                      backgroundColor: isLight ? '#64748b' : '#334155',
                      color: '#ffffff',
                      fontWeight: '800',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                    title="Pasar / Omitir para votar en Segunda Ronda"
                  >
                    <SkipForward size={14} />
                    <span>{t('voting.pass', 'Pasar')}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ── PANTALLA DE RESULTADO FINAL TRAS ACABAR ROLL CALL ── */
            <div style={{ textAlign: 'center', padding: '0.8rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', alignItems: 'center' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.4rem 1rem',
                borderRadius: '8px',
                backgroundColor: stats.vetoEjercido
                  ? (isLight ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.25)')
                  : (stats.superado
                    ? (isLight ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.25)')
                    : (isLight ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.25)')),
                border: `1.5px solid ${stats.vetoEjercido ? '#ef4444' : (stats.superado ? '#22c55e' : '#ef4444')}`
              }}>
                {stats.vetoEjercido ? (
                  <ShieldAlert size={24} color="#ef4444" />
                ) : stats.superado ? (
                  <CheckCircle2 size={24} color="#22c55e" />
                ) : (
                  <XCircle size={24} color="#ef4444" />
                )}
                <div style={{
                  fontSize: '1.05rem',
                  fontWeight: '900',
                  color: stats.vetoEjercido
                    ? (isLight ? '#dc2626' : '#f87171')
                    : (stats.superado ? (isLight ? '#16a34a' : '#4ade80') : (isLight ? '#dc2626' : '#f87171'))
                }}>
                  {stats.vetoEjercido
                    ? t('voting.vetoedResultBanner', '¡VOTACIÓN REPROBADA POR VETO!')
                    : (stats.superado ? t('voting.passedResultBanner', '¡VOTACIÓN APROBADA CON ÉXITO!') : t('voting.failedResultBanner', '¡VOTACIÓN REPROBADA!'))}
                </div>
              </div>

              {/* Detalle si hubo veto */}
              {stats.vetoEjercido && stats.paisesVeto.length > 0 && (
                <div style={{ fontSize: '0.78rem', color: isLight ? '#b91c1c' : '#fca5a5', fontWeight: '700' }}>
                  {t('voting.vetoExercisedBy', 'Veto ejercido por')}: {stats.paisesVeto.map(p => p.nombre).join(', ')}
                </div>
              )}

              {/* Chips de Conteo */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.8rem', fontWeight: '700' }}>
                <span style={{ color: isLight ? '#16a34a' : '#4ade80', backgroundColor: isLight ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.2)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                  {t('voting.inFavor', 'A Favor')}: {stats.favor}
                </span>
                <span style={{ color: isLight ? '#dc2626' : '#f87171', backgroundColor: isLight ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.2)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                  {t('voting.against', 'En Contra')}: {stats.contra}
                </span>
                {tipoVotacion === 'substantive' && (
                  <span style={{ color: isLight ? '#d97706' : '#facc15', backgroundColor: isLight ? 'rgba(234, 179, 8, 0.12)' : 'rgba(234, 179, 8, 0.2)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                    {t('voting.abstention', 'Abstención')}: {stats.abstencion}
                  </span>
                )}
                <span style={{ color: isLight ? '#2563eb' : '#60a5fa', backgroundColor: isLight ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.2)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                  {t('voting.quorum', 'Quórum')}: {stats.totalEmitidos}/{stats.totalAsistentes}
                </span>
              </div>

              <div style={{ fontSize: '0.74rem', color: isLight ? '#64748b' : '#94a3b8' }}>
                {t('voting.rule', 'Regla')}: {stats.textoRequerido}
              </div>

              {/* Botones de acción post Roll Call */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setModoRollCall(false);
                    setRollCallFinalizado(false);
                  }}
                  style={{
                    padding: '0.45rem 1rem',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontWeight: '800',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
                  }}
                >
                  {t('voting.viewResultsOnMap', 'Ver Resultados en el Mapa')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Deseas reiniciar los votos y comenzar una nueva votación?')) {
                      resetearVotacion();
                      setModoRollCall(false);
                      setRollCallFinalizado(false);
                    }
                  }}
                  style={{
                    padding: '0.45rem 0.85rem',
                    backgroundColor: isLight ? '#f1f5f9' : '#1e293b',
                    color: isLight ? '#475569' : '#cbd5e1',
                    fontWeight: '700',
                    border: `1px solid ${isLight ? '#cbd5e1' : '#334155'}`,
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    cursor: 'pointer'
                  }}
                >
                  {t('voting.resetVoting', 'Reiniciar Votación')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── CONTENEDOR DEL MAPA VECTORIAL INTERACTIVO PURO REACT ─── */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: isLight ? '#e2e8f0' : '#050914',
          backgroundImage: isLight
            ? 'radial-gradient(ellipse at center, #f1f5f9 0%, #cbd5e1 100%)'
            : 'radial-gradient(ellipse at center, #0a1228 0%, #03060f 100%)',
          cursor: isPanning ? 'grabbing' : 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.3s ease, background-image 0.3s ease'
        }}
      >
        {/* Renderizado NATIVO Declarativo en React SVG (470 trazados a 60 FPS) */}
        <svg
          viewBox="0 0 2000 857"
          preserveAspectRatio="xMidYMid meet"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            overflow: 'visible'
          }}
        >
          <g
            transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
            style={{
              transformOrigin: '1000px 428.5px',
              transition: isPanning ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)'
            }}
          >
            {PARSED_WORLD_PATHS.map((p, idx) => {
              // 1. Identificar país del contexto
              const country = (p.iso && countryLookup.get(p.iso)) || countryLookup.get(p.normName) || null;
              const countryIdentifier = country ? country.id : (p.iso || p.normName);
              const voto = country ? (votos[country.id] || votos[String(country.id)]) : null;
              const isPresente = country ? (country.estatus === 'Presente' || country.estatus === 'Presente y Votando') : false;
              const isCurrentRollCall = modoRollCall && paisActualRollCall && country && (country.id === paisActualRollCall.id);
              const isHovered = hoveredIso && (hoveredIso === p.iso || hoveredIso === p.name || hoveredIso === p.normName);

              // 2. Colores y Estilos Declarativos adaptados a Modo Claro y Modo Oscuro
              let fillColor = isLight ? '#ffffff' : '#172033'; // Base para países no delegados
              let strokeColor = isLight ? '#cbd5e1' : '#25334d';
              let strokeWidth = 0.5;
              let opacity = 0.85;

              if (country) {
                if (voto === 'favor') {
                  fillColor = isLight ? '#22c55e' : '#16a34a'; // Verde
                  strokeColor = isLight ? '#15803d' : '#4ade80';
                  strokeWidth = 1.2;
                  opacity = 1.0;
                } else if (voto === 'contra') {
                  fillColor = isLight ? '#ef4444' : '#dc2626'; // Rojo
                  strokeColor = country.veto && aplicarVeto ? (isLight ? '#d97706' : '#fbbf24') : (isLight ? '#b91c1c' : '#f87171');
                  strokeWidth = country.veto && aplicarVeto ? 2.5 : 1.2;
                  opacity = 1.0;
                } else if (voto === 'abstencion') {
                  fillColor = isLight ? '#eab308' : '#d97706'; // Ámbar
                  strokeColor = isLight ? '#a16207' : '#fde047';
                  strokeWidth = 1.2;
                  opacity = 1.0;
                } else if (isPresente) {
                  // Presente pendiente
                  fillColor = isLight ? '#3b82f6' : '#2563eb'; // Azul delegación
                  strokeColor = isLight ? '#1d4ed8' : '#93c5fd';
                  strokeWidth = 0.9;
                  opacity = 0.9;
                } else {
                  // Ausente
                  fillColor = isLight ? '#e2e8f0' : '#1e293b';
                  strokeColor = isLight ? '#94a3b8' : '#334155';
                  opacity = 0.6;
                }

                // Filtros de Vista
                if (filtroVista === 'FAVOR' && voto !== 'favor') opacity = 0.12;
                if (filtroVista === 'CONTRA' && voto !== 'contra') opacity = 0.12;
                if (filtroVista === 'ABSTENCION' && voto !== 'abstencion') opacity = 0.12;
                if (filtroVista === 'PENDIENTES' && (!isPresente || voto)) opacity = 0.12;
                if (filtroVista === 'P5' && !country.veto) opacity = 0.12;

                // Búsqueda
                if (busqueda.trim()) {
                  const match = normalizar(country.nombre).includes(normalizar(busqueda));
                  if (!match) {
                    opacity = 0.12;
                  } else {
                    strokeColor = isLight ? '#1e293b' : '#ffffff';
                    strokeWidth = 2.5;
                    opacity = 1.0;
                  }
                }
              } else {
                if (filtroVista !== 'TODOS' || busqueda.trim()) {
                  opacity = 0.08;
                }
              }

              // Resaltado sincronizado al pasar el ratón
              if (isHovered) {
                strokeColor = isLight ? '#0f172a' : '#ffffff';
                strokeWidth = Math.max(strokeWidth, 2.2);
              }

              // Resaltado especial durante Roll Call
              if (isCurrentRollCall) {
                strokeColor = isLight ? '#2563eb' : '#60a5fa';
                strokeWidth = 3.5;
                opacity = 1.0;
              }

              return (
                <path
                  key={idx}
                  d={p.d}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                  style={{
                    transition: isPanning ? 'none' : 'fill 0.15s ease, stroke 0.15s ease, opacity 0.15s ease',
                    cursor: country ? 'pointer' : 'default'
                  }}
                  onClick={(e) => handlePathClick(country, p.name, e)}
                  onMouseEnter={(e) => handlePathMouseEnter(p.iso, country, p.name, e)}
                  onMouseMove={handlePathMouseMove}
                  onMouseLeave={handlePathMouseLeave}
                />
              );
            })}
          </g>
        </svg>

        {/* ─── TOOLTIP FLOTANTE (Posicionado y Clampeado) ─── */}
        {tooltipData && !modoRollCall && (
          <div
            style={{
              position: 'absolute',
              left: `${tooltipData.x + 14}px`,
              top: `${tooltipData.y + 14}px`,
              backgroundColor: isLight ? 'rgba(255, 255, 255, 0.97)' : 'rgba(10, 15, 30, 0.96)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${isLight ? '#cbd5e1' : '#2b3956'}`,
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              boxShadow: isLight ? '0 8px 24px rgba(0,0,0,0.15)' : '0 8px 24px rgba(0,0,0,0.7)',
              pointerEvents: 'none',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              minWidth: '150px',
              color: isLight ? '#0f172a' : '#ffffff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: '800', fontSize: '0.85rem', color: isLight ? '#0f172a' : '#ffffff' }}>
              {tooltipData.countryObj ? (
                <CountryFlag bandera={tooltipData.countryObj.bandera} nombre={tooltipData.name} size="xs" />
              ) : (
                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>🌐</span>
              )}
              <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tooltipData.name}
              </span>
              {tooltipData.isP5 && (
                <Crown size={13} color="#f59e0b" title="Miembro Permanente (P5) con Veto" />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8' }}>
              <span>{t('voting.state', 'Estado')}:</span>
              <span
                style={{
                  fontWeight: '800',
                  color:
                    tooltipData.vote === 'favor'
                      ? (isLight ? '#16a34a' : '#4ade80')
                      : tooltipData.vote === 'contra'
                      ? (isLight ? '#dc2626' : '#f87171')
                      : tooltipData.vote === 'abstencion'
                      ? (isLight ? '#d97706' : '#facc15')
                      : tooltipData.countryObj
                      ? '#2563eb'
                      : (isLight ? '#94a3b8' : '#64748b')
                }}
              >
                {tooltipData.vote === 'favor'
                  ? t('voting.inFavorUpper', 'A FAVOR')
                  : tooltipData.vote === 'contra'
                  ? t('voting.againstUpper', 'EN CONTRA')
                  : tooltipData.vote === 'abstencion'
                  ? t('voting.abstentionUpper', 'ABSTENCIÓN')
                  : tooltipData.countryObj
                  ? t('voting.pendingUpper', 'PENDIENTE')
                  : t('voting.notDelegationUpper', 'NO DELEGADO')}
              </span>
            </div>

            {tooltipData.countryObj && (
              <div style={{ fontSize: '0.65rem', color: isLight ? '#94a3b8' : '#64748b', borderTop: `1px solid ${isLight ? '#e2e8f0' : '#1e293b'}`, paddingTop: '0.2rem', marginTop: '0.1rem' }}>
                {t('voting.clickToVote', 'Haz clic para registrar o cambiar voto')}
              </div>
            )}
          </div>
        )}

        {/* ─── MODAL FLOTANTE DE VOTACIÓN RÁPIDA (Al Clic) ─── */}
        {selectedCountryForVote && !modoRollCall && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: `${selectedCountryForVote.x}px`,
              top: `${selectedCountryForVote.y}px`,
              backgroundColor: isLight ? '#ffffff' : '#0d1527',
              border: '1.5px solid #3b82f6',
              borderRadius: '12px',
              padding: '0.85rem',
              boxShadow: isLight ? '0 16px 40px rgba(0,0,0,0.2)' : '0 16px 40px rgba(0,0,0,0.85)',
              zIndex: 60,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              minWidth: '210px',
              color: isLight ? '#0f172a' : '#ffffff',
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            {/* Cabecera del País */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${isLight ? '#e2e8f0' : '#1e293b'}`, paddingBottom: '0.45rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <CountryFlag
                  bandera={selectedCountryForVote.countryObj.bandera}
                  nombre={selectedCountryForVote.countryObj.nombre}
                  size="sm"
                />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: isLight ? '#0f172a' : '#ffffff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{selectedCountryForVote.countryObj.nombre}</span>
                    {selectedCountryForVote.countryObj.veto && <Crown size={13} color="#f59e0b" />}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8' }}>
                    {selectedCountryForVote.countryObj.estatus}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCountryForVote(null)}
                style={{ background: 'transparent', border: 'none', color: isLight ? '#64748b' : '#94a3b8', cursor: 'pointer', padding: '2px' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Voto Actual */}
            <div style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('voting.recordedVote', 'Voto registrado')}:</span>
              <strong style={{
                color: (votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'favor' ? (isLight ? '#16a34a' : '#4ade80') :
                  (votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'contra' ? (isLight ? '#dc2626' : '#f87171') :
                  (votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'abstencion' ? (isLight ? '#d97706' : '#facc15') : '#2563eb'
              }}>
                {(votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) ? (votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]).toUpperCase() : t('voting.pendingUpper', 'PENDIENTE')}
              </strong>
            </div>

            {/* Botones de Votación Rápida */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => handleSetVote('favor')}
                style={{
                  padding: '0.45rem 0.7rem',
                  borderRadius: '7px',
                  border: '1px solid #16a34a',
                  backgroundColor: (votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'favor' ? '#16a34a' : (isLight ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.18)'),
                  color: (votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'favor' ? '#ffffff' : (isLight ? '#15803d' : '#86efac'),
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <CheckCircle2 size={14} color={(votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'favor' ? '#ffffff' : (isLight ? '#16a34a' : '#22c55e')} />
                <span>{t('voting.inFavor', 'A Favor')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetVote('contra')}
                style={{
                  padding: '0.45rem 0.7rem',
                  borderRadius: '7px',
                  border: '1px solid #dc2626',
                  backgroundColor: (votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'contra' ? '#dc2626' : (isLight ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.18)'),
                  color: (votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'contra' ? '#ffffff' : (isLight ? '#b91c1c' : '#fca5a5'),
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <XCircle size={14} color={(votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'contra' ? '#ffffff' : (isLight ? '#dc2626' : '#ef4444')} />
                <span>{t('voting.against', 'En Contra')} {selectedCountryForVote.countryObj.veto && aplicarVeto ? `(${t('voting.vetoWord', 'Veto')})` : ''}</span>
              </button>

              <button
                type="button"
                disabled={tipoVotacion === 'procedural' || selectedCountryForVote.countryObj.estatus === 'Presente y Votando'}
                onClick={() => handleSetVote('abstencion')}
                style={{
                  padding: '0.45rem 0.7rem',
                  borderRadius: '7px',
                  border: '1px solid #ca8a04',
                  backgroundColor: (votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'abstencion' ? '#d97706' : (isLight ? 'rgba(234, 179, 8, 0.15)' : 'rgba(234, 179, 8, 0.18)'),
                  color: (votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'abstencion' ? '#ffffff' : (isLight ? '#a16207' : '#fde047'),
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  cursor: (tipoVotacion === 'procedural' || selectedCountryForVote.countryObj.estatus === 'Presente y Votando') ? 'not-allowed' : 'pointer',
                  opacity: (tipoVotacion === 'procedural' || selectedCountryForVote.countryObj.estatus === 'Presente y Votando') ? 0.35 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease'
                }}
                title={
                  tipoVotacion === 'procedural'
                    ? 'Prohibida la abstención en votación procedimental'
                    : (selectedCountryForVote.countryObj.estatus === 'Presente y Votando' ? 'Delegaciones en estatus "Presente y Votando" no pueden abstenerse' : 'Abstención')
                }
              >
                <AlertTriangle size={14} color={(votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'abstencion' ? '#ffffff' : (isLight ? '#d97706' : '#eab308')} />
                <span>{t('voting.abstention', 'Abstención')}</span>
              </button>

              {(votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) && (
                <button
                  type="button"
                  onClick={handleClearVote}
                  style={{
                    padding: '0.35rem 0.6rem',
                    borderRadius: '6px',
                    border: `1px solid ${isLight ? '#cbd5e1' : '#334155'}`,
                    backgroundColor: 'transparent',
                    color: isLight ? '#64748b' : '#94a3b8',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    marginTop: '2px'
                  }}
                >
                  <RotateCcw size={11} /> {t('voting.clearVote', 'Limpiar Voto')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── LEYENDA INFERIOR SUTIL Y ELEGANTE ─── */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            backgroundColor: isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(10, 15, 30, 0.9)',
            backdropFilter: 'blur(8px)',
            padding: '0.35rem 0.85rem',
            borderRadius: '8px',
            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(43, 57, 86, 0.7)'}`,
            fontSize: '0.72rem',
            color: isLight ? '#334155' : '#cbd5e1',
            pointerEvents: 'none',
            zIndex: 15
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isLight ? '#22c55e' : '#16a34a', boxShadow: `0 0 6px ${isLight ? '#22c55e' : '#16a34a'}` }} />
            <span>{t('voting.inFavor', 'A Favor')} ({stats.favor})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isLight ? '#ef4444' : '#dc2626', boxShadow: `0 0 6px ${isLight ? '#ef4444' : '#dc2626'}` }} />
            <span>{t('voting.against', 'En Contra')} ({stats.contra})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isLight ? '#eab308' : '#d97706', boxShadow: `0 0 6px ${isLight ? '#eab308' : '#d97706'}` }} />
            <span>{t('voting.abstention', 'Abstención')} ({stats.abstencion})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isLight ? '#3b82f6' : '#2563eb', boxShadow: `0 0 6px ${isLight ? '#3b82f6' : '#2563eb'}` }} />
            <span>{t('voting.pending', 'Pendiente')} ({stats.pendientes})</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapaVotacion;
