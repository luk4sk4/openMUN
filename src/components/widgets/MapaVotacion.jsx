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
import { useConfirm } from '../../context/ConfirmContext';
import { ListaDerechos } from './VotosConDerechos';
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
  const confirm = useConfirm();
  const {
    paises,
    votacionSesion,
    registrarVotoPais,
    configurarVotacion,
    resetearVotacion
  } = useSession();

  const outerContainerRef = useRef(null);
  const {
    asunto = 'Votación',
    tipoVotacion = 'procedural',
    tipoMayoria = 'simple',
    aplicarVeto = true,
    votos: rawVotos = {}
  } = votacionSesion || {};

  const votos = useMemo(() => {
    return (rawVotos && typeof rawVotos === 'object') ? rawVotos : {};
  }, [rawVotos]);

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
  const vetoOrange = 'var(--timer-orange-color, var(--warning-color))';
  const vetoOrangeBg = 'var(--timer-orange-bg, var(--warning-soft))';
  const vetoOrangeBorder = 'var(--timer-orange-border, var(--warning-color))';

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
    const todosOrdenados = [...paisesAsistentes].sort((a, b) => (a?.nombre || '').localeCompare(b?.nombre || '', 'es'));
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
    const finalizada = pendientes === 0 && totalAsistentes > 0;
    let superado = false;
    let requeridos = reqSimpleQuorum;
    let textoRequerido = '';

    if (tipoMayoria === 'simple') {
      if (tipoVotacion === 'substantive') {
        const baseCalculo = finalizada ? votosValidosSinAbstencion : Math.max(0, totalAsistentes - a);
        requeridos = baseCalculo > 0 ? Math.floor(baseCalculo / 2) + 1 : reqSimpleQuorum;
        superado = finalizada && f > c && f >= requeridos;
        textoRequerido = finalizada
          ? t('ui.votesInFavor501OfValidVotesCast', { v0: requeridos, v1: votosValidosSinAbstencion })
          : t('ui.votesInFavor501OfDelegations', { v0: requeridos, v1: totalAsistentes });
      } else {
        requeridos = reqSimpleQuorum;
        superado = finalizada && f > c && f >= reqSimpleQuorum;
        textoRequerido = t('ui.votesInFavor501OfDelegations', { v0: requeridos, v1: totalAsistentes });
      }
    } else if (tipoMayoria === '2/3') {
      if (tipoVotacion === 'substantive') {
        const baseCalculo = finalizada ? votosValidosSinAbstencion : Math.max(0, totalAsistentes - a);
        requeridos = baseCalculo > 0 ? Math.ceil((baseCalculo * 2) / 3) : reqDosTerciosQuorum;
        superado = finalizada && f >= requeridos && f > 0;
        textoRequerido = finalizada
          ? t('ui.votesInFavor23OfValidVotesCast', { v0: requeridos, v1: votosValidosSinAbstencion })
          : t('ui.votesInFavor23OfDelegations', { v0: requeridos, v1: totalAsistentes });
      } else {
        requeridos = reqDosTerciosQuorum;
        superado = finalizada && f >= reqDosTerciosQuorum && f > 0;
        textoRequerido = t('ui.votesInFavor23OfDelegations', { v0: requeridos, v1: totalAsistentes });
      }
    } else if (tipoMayoria === 'consensus') {
      requeridos = 0;
      superado = finalizada && c === 0 && f > 0;
      textoRequerido = t('ui.0VotesAgainst100ConsensusOfDelegations', { v0: totalAsistentes });
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
      finalizada,
      aprobada,
      vetoEjercido,
      paisesVeto: vetoPaises,
      textoRequerido
    };
  }, [paisesAsistentes, votos, tipoMayoria, tipoVotacion, aplicarVeto, t]);

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
        backgroundColor: 'var(--panel-color)',
        color: 'var(--text-color)',
        borderRadius: isFullscreen ? '0' : 'var(--border-radius)',
        overflow: 'hidden',
        border: 'none',
        boxShadow: 'none',
        position: 'relative',
        userSelect: 'none',
        fontFamily: 'var(--font-family)'
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
          backgroundColor: 'var(--card-header-bg)',
          borderBottom: '1px solid var(--border-color)',
          zIndex: 20
        }}
      >
        {/* Título & Asunto editable */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: '200px', flex: '1 1 auto' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: '800', color: 'var(--text-color)', letterSpacing: '-0.01em' }}>
                {t('voting.worldMapTitle', 'Mapa Mundial de Votación')}
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: '800',
                  padding: '0.12rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor: stats.vetoEjercido
                    ? 'var(--danger-soft)'
                    : (stats.superado
                      ? 'var(--success-soft)'
                      : 'var(--accent-soft)'),
                  color: stats.vetoEjercido
                    ? 'var(--danger-color)'
                    : (stats.superado
                      ? 'var(--success-color)'
                      : 'var(--accent-color)'),
                  border: `1px solid ${stats.vetoEjercido ? 'var(--danger-color)' : (stats.superado ? 'var(--success-color)' : 'var(--accent-color)')}`
                }}
              >
                {stats.vetoEjercido ? t('voting.vetoed', 'VETADA') : (stats.finalizada ? (stats.superado ? t('voting.passed', 'APROBADA') : t('voting.failed', 'REPROBADA')) : (tipoMayoria === 'consensus' ? t('voting.consensus', 'CONSENSO (0 contra)') : `${t('voting.target', 'META')}: ${stats.favor}/${stats.requeridos}`))}
              </span>

              {/* Badges de Tipo y Mayoría */}
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  backgroundColor: 'var(--input-bg, var(--panel-color))',
                  color: 'var(--muted-text)',
                  border: '1px solid var(--border-color)'
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
                  backgroundColor: 'var(--input-bg, var(--panel-color))',
                  color: 'var(--muted-text)',
                  border: '1px solid var(--border-color)'
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
                    backgroundColor: vetoOrangeBg,
                    color: vetoOrange,
                    border: `1px solid ${vetoOrangeBorder}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  title={t('ui.securityCouncilVetoPowerActive')}
                >
                  <span>{t('voting.vetoP5', 'Veto P5')}</span>
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
              {asunto || t('voting.defaultSubject', 'Votación oficial en tiempo real')}
            </div>
          </div>
        </div>

        {/* Marcadores de Conteo y Filtros Rápidos */}
        <div
          role="group"
          aria-label={t('ui.voteFilters')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            flexWrap: 'wrap',
            backgroundColor: 'var(--panel-color)',
            padding: '3px 4px',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--border-color)'
          }}
        >
          {/* A Favor */}
          <button
            type="button"
            aria-pressed={filtroVista === 'FAVOR'}
            onClick={() => setFiltroVista(filtroVista === 'FAVOR' ? 'TODOS' : 'FAVOR')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.55rem',
              backgroundColor: filtroVista === 'FAVOR' ? 'var(--success-soft)' : 'transparent',
              border: `1px solid ${filtroVista === 'FAVOR' ? 'var(--success-color)' : 'transparent'}`,
              borderRadius: 'calc(var(--border-radius) - 2px)',
              fontSize: '0.74rem',
              fontWeight: filtroVista === 'FAVOR' ? '750' : '600',
              color: filtroVista === 'FAVOR' ? 'var(--success-color)' : 'var(--text-color)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title={t('ui.filterDelegationsInFavorClickAgainToShowAll')}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--success-color)', flexShrink: 0 }} />
            <span>{t('voting.inFavor', 'A Favor')}: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{stats.favor}</strong></span>
          </button>

          {/* En Contra */}
          <button
            type="button"
            aria-pressed={filtroVista === 'CONTRA'}
            onClick={() => setFiltroVista(filtroVista === 'CONTRA' ? 'TODOS' : 'CONTRA')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.55rem',
              backgroundColor: filtroVista === 'CONTRA' ? 'var(--danger-soft)' : 'transparent',
              border: `1px solid ${filtroVista === 'CONTRA' ? 'var(--danger-color)' : 'transparent'}`,
              borderRadius: 'calc(var(--border-radius) - 2px)',
              fontSize: '0.74rem',
              fontWeight: filtroVista === 'CONTRA' ? '750' : '600',
              color: filtroVista === 'CONTRA' ? 'var(--danger-color)' : 'var(--text-color)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title={t('ui.filterDelegationsAgainstClickAgainToShowAll')}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--danger-color)', flexShrink: 0 }} />
            <span>{t('voting.against', 'En Contra')}: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{stats.contra}</strong></span>
          </button>

          {/* Abstención */}
          <button
            type="button"
            aria-pressed={filtroVista === 'ABSTENCION'}
            onClick={() => setFiltroVista(filtroVista === 'ABSTENCION' ? 'TODOS' : 'ABSTENCION')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.55rem',
              backgroundColor: filtroVista === 'ABSTENCION' ? 'var(--warning-soft)' : 'transparent',
              border: `1px solid ${filtroVista === 'ABSTENCION' ? 'var(--warning-color)' : 'transparent'}`,
              borderRadius: 'calc(var(--border-radius) - 2px)',
              fontSize: '0.74rem',
              fontWeight: filtroVista === 'ABSTENCION' ? '750' : '600',
              color: filtroVista === 'ABSTENCION' ? 'var(--warning-color)' : 'var(--text-color)',
              opacity: tipoVotacion === 'procedural' ? 0.45 : 1,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title={t('ui.filterAbstentionsClickAgainToShowAll')}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--warning-color)', flexShrink: 0 }} />
            <span>{t('voting.abstentionShort', 'Abst')}: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{tipoVotacion === 'procedural' ? '—' : stats.abstencion}</strong></span>
          </button>

          {/* Pendientes */}
          <button
            type="button"
            aria-pressed={filtroVista === 'PENDIENTES'}
            onClick={() => setFiltroVista(filtroVista === 'PENDIENTES' ? 'TODOS' : 'PENDIENTES')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.55rem',
              backgroundColor: filtroVista === 'PENDIENTES' ? 'var(--info-soft)' : 'transparent',
              border: `1px solid ${filtroVista === 'PENDIENTES' ? 'var(--info-color)' : 'transparent'}`,
              borderRadius: 'calc(var(--border-radius) - 2px)',
              fontSize: '0.74rem',
              fontWeight: filtroVista === 'PENDIENTES' ? '750' : '600',
              color: filtroVista === 'PENDIENTES' ? 'var(--info-color)' : 'var(--text-color)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title={t('ui.filterDelegationsWithPendingVotesClickAgainToShowAll')}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--info-color)', flexShrink: 0 }} />
            <span>{t('voting.pendingShort', 'Pend')}: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{stats.pendientes}</strong></span>
          </button>
        </div>

        {/* ── Botón de Roll Call Nominal & Controles ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {/* Botón Ajustes de la Votación */}
          <button
            type="button"
            aria-pressed={mostrarAjustes}
            onClick={() => setMostrarAjustes(prev => !prev)}
            style={{
              padding: '0.35rem 0.65rem',
              backgroundColor: mostrarAjustes ? 'var(--accent-soft)' : 'var(--input-bg, var(--panel-color))',
              border: `1px solid ${mostrarAjustes ? 'var(--accent-color)' : 'var(--border-color)'}`,
              borderRadius: 'var(--border-radius)',
              color: mostrarAjustes ? 'var(--accent-color)' : 'var(--text-color)',
              fontSize: '0.74rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
            title={t('ui.votingSettingsTypeMajorityP5VetoSubject')}
          >
            <Settings size={13} color={mostrarAjustes ? 'var(--accent-color)' : 'var(--muted-text)'} />
            <span>{t('common.settings', 'Ajustes')}</span>
          </button>

          {/* Botón Iniciar Roll Call (Acción Principal) */}
          <button
            type="button"
            aria-pressed={modoRollCall}
            onClick={toggleModoRollCall}
            style={{
              padding: '0.35rem 0.75rem',
              backgroundColor: modoRollCall ? 'var(--accent-soft)' : 'var(--btn-bg)',
              border: `1px solid ${modoRollCall ? 'var(--accent-color)' : 'var(--btn-bg)'}`,
              color: modoRollCall ? 'var(--accent-color)' : 'var(--btn-text)',
              borderRadius: 'var(--border-radius)',
              fontSize: '0.75rem',
              fontWeight: '750',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
            title={t('ui.startDelegationByDelegationRollCallVotingOnTheMap')}
          >
            {modoRollCall ? <Square size={12} fill="var(--accent-color)" /> : <Play size={12} fill="var(--btn-text)" color="var(--btn-text)" />}
            <span>{modoRollCall ? t('voting.exitRollCall', 'Salir Roll Call') : t('voting.startRollCall', 'Modo Roll Call')}</span>
          </button>

          {/* Botón Reiniciar Votación */}
          <button
            type="button"
            onClick={async () => {
              if (stats.totalEmitidos > 0) {
                const confirmed = await confirm({
                  title: t('voting.confirmResetTitle', 'Reiniciar votación'),
                  message: t('voting.confirmResetVoting', '¿Deseas reiniciar y limpiar todos los votos registrados?'),
                  confirmText: t('voting.reset', 'Reiniciar'),
                  cancelText: t('common.cancel', 'Cancelar'),
                  type: 'danger'
                });
                if (confirmed) {
                  resetearVotacion();
                  setModoRollCall(false);
                  setRollCallFinalizado(false);
                  setSelectedCountryForVote(null);
                }
              } else {
                resetearVotacion();
                setModoRollCall(false);
                setRollCallFinalizado(false);
                setSelectedCountryForVote(null);
              }
            }}
            style={{
              padding: '0.35rem 0.65rem',
              backgroundColor: 'var(--input-bg, var(--panel-color))',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              color: 'var(--text-color)',
              fontSize: '0.74rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
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
            <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-text)' }} />
            <input
              type="text"
              placeholder={t('countries.searchPlaceholder', 'Buscar país...')}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '110px',
                padding: '0.3rem 0.5rem 0.3rem 1.6rem',
                backgroundColor: 'var(--input-bg, var(--panel-color))',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                color: 'var(--text-color)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.74rem',
                outline: 'none',
                transition: 'border-color 0.15s ease'
              }}
            />
          </div>

          {/* Botón P5 */}
          <button
            type="button"
            aria-pressed={filtroVista === 'P5'}
            onClick={() => setFiltroVista(filtroVista === 'P5' ? 'TODOS' : 'P5')}
            style={{
              padding: '0.35rem 0.55rem',
              backgroundColor: filtroVista === 'P5' ? vetoOrangeBg : 'var(--input-bg, var(--panel-color))',
              border: `1px solid ${filtroVista === 'P5' ? vetoOrangeBorder : 'var(--border-color)'}`,
              borderRadius: 'var(--border-radius)',
              color: filtroVista === 'P5' ? vetoOrange : 'var(--muted-text)',
              fontSize: '0.74rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'all 0.15s ease'
            }}
            title={t('ui.highlightSecurityCouncilCountriesWithVetoPowerP5')}
          >
            <Crown size={12} color={filtroVista === 'P5' ? vetoOrange : 'currentColor'} />
            <span>P5</span>
          </button>

          {/* Zoom y Reset */}
          <div
            role="group"
            aria-label={t('ui.zoomControls')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: 'var(--input-bg, var(--panel-color))',
              padding: '2px',
              borderRadius: 'var(--border-radius)',
              border: '1px solid var(--border-color)',
              gap: '2px'
            }}
          >
            <button
              type="button"
              onClick={handleZoomIn}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-color)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: 'calc(var(--border-radius) - 2px)',
                display: 'flex',
                alignItems: 'center'
              }}
              title={t('ui.zoomIn')}
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-color)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: 'calc(var(--border-radius) - 2px)',
                display: 'flex',
                alignItems: 'center'
              }}
              title={t('ui.zoomOut')}
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-color)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: 'calc(var(--border-radius) - 2px)',
                display: 'flex',
                alignItems: 'center'
              }}
              title={t('ui.centerAndResetView')}
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
              backgroundColor: 'var(--input-bg, var(--panel-color))',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              color: 'var(--text-color)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              transition: 'all 0.15s ease'
            }}
            title={isFullscreen ? t('header.exitFullscreen') : t('ui.projectorFullScreenMode')}
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
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            padding: '1rem 1.15rem',
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem',
            animation: 'fadeIn 0.15s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabecera del Panel de Ajustes */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--subborder-color)', paddingBottom: '0.6rem' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-color)' }}>
                {t('voting.settingsTitle', 'Ajustes de la Votación')}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
                {t('voting.settingsSubtitle', 'Configuración en tiempo real sincronizada con el comité')}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMostrarAjustes(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* 1. Asunto de la Votación */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.74rem', fontWeight: '750', color: 'var(--text-color)' }}>
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
                backgroundColor: 'var(--input-bg, var(--panel-color))',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                color: 'var(--text-color)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.82rem',
                outline: 'none',
                fontWeight: '600',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 2. Tipo de Votación: Sustantiva vs Procedimental */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: '750', color: 'var(--text-color)' }}>
                {t('voting.voteType', 'Tipo de Votación')}
              </label>
              <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
                {tipoVotacion === 'procedural' ? `🚫 ${t('voting.abstentionForbidden', 'Abstención prohibida')}` : `✅ ${t('voting.abstentionAllowed', 'Abstención permitida')}`}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {/* Opción Procedimental */}
              <button
                type="button"
                aria-pressed={tipoVotacion === 'procedural'}
                onClick={() => configurarVotacion({ tipoVotacion: 'procedural' })}
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--border-radius)',
                  border: `1px solid ${tipoVotacion === 'procedural' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                  backgroundColor: tipoVotacion === 'procedural' ? 'var(--accent-soft)' : 'var(--input-bg, var(--panel-color))',
                  color: tipoVotacion === 'procedural' ? 'var(--accent-color)' : 'var(--muted-text)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: '750', fontSize: '0.8rem' }}>{t('voting.procedural', 'Procedimental')}</div>
                  {tipoVotacion === 'procedural' && <Check size={14} color="var(--accent-color)" />}
                </div>
                <div style={{ fontSize: '0.68rem', opacity: 0.8, marginTop: '2px' }}>
                  {t('voting.proceduralSub', 'Mociones y orden (Sin abstención)')}
                </div>
              </button>

              {/* Opción Sustantiva */}
              <button
                type="button"
                aria-pressed={tipoVotacion === 'substantive'}
                onClick={() => configurarVotacion({ tipoVotacion: 'substantive' })}
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--border-radius)',
                  border: `1px solid ${tipoVotacion === 'substantive' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                  backgroundColor: tipoVotacion === 'substantive' ? 'var(--accent-soft)' : 'var(--input-bg, var(--panel-color))',
                  color: tipoVotacion === 'substantive' ? 'var(--accent-color)' : 'var(--muted-text)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: '750', fontSize: '0.8rem' }}>{t('voting.substantive', 'Sustantiva')}</div>
                  {tipoVotacion === 'substantive' && <Check size={14} color="var(--accent-color)" />}
                </div>
                <div style={{ fontSize: '0.68rem', opacity: 0.8, marginTop: '2px' }}>
                  {t('voting.substantiveSub', 'Resoluciones y enmiendas (Con abstención)')}
                </div>
              </button>
            </div>
          </div>

          {/* 3. Regla de Mayoría */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.74rem', fontWeight: '750', color: 'var(--text-color)' }}>
              {t('voting.majorityRequired', 'Regla de Mayoría Requerida')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
              {/* Mayoría Simple */}
              <button
                type="button"
                aria-pressed={tipoMayoria === 'simple'}
                onClick={() => configurarVotacion({ tipoMayoria: 'simple' })}
                style={{
                  padding: '0.5rem 0.6rem',
                  borderRadius: 'var(--border-radius)',
                  border: `1px solid ${tipoMayoria === 'simple' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                  backgroundColor: tipoMayoria === 'simple' ? 'var(--accent-soft)' : 'var(--input-bg, var(--panel-color))',
                  color: tipoMayoria === 'simple' ? 'var(--accent-color)' : 'var(--muted-text)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: '750' }}>{t('voting.simpleMajority', 'Simple (50%+1)')}</div>
                <div style={{ fontSize: '0.67rem', opacity: 0.8, marginTop: '2px' }}>
                  {t('voting.target', 'Meta')}: {stats.reqSimpleQuorum} {stats.reqSimpleQuorum === 1 ? t('voting.vote', 'voto') : t('voting.votes', 'votos')}
                </div>
              </button>

              {/* Mayoría Cualificada 2/3 */}
              <button
                type="button"
                aria-pressed={tipoMayoria === '2/3'}
                onClick={() => configurarVotacion({ tipoMayoria: '2/3' })}
                style={{
                  padding: '0.5rem 0.6rem',
                  borderRadius: 'var(--border-radius)',
                  border: `1px solid ${tipoMayoria === '2/3' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                  backgroundColor: tipoMayoria === '2/3' ? 'var(--accent-soft)' : 'var(--input-bg, var(--panel-color))',
                  color: tipoMayoria === '2/3' ? 'var(--accent-color)' : 'var(--muted-text)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: '750' }}>{t('voting.twoThirds', 'Cualificada (2/3)')}</div>
                <div style={{ fontSize: '0.67rem', opacity: 0.8, marginTop: '2px' }}>
                  {t('voting.target', 'Meta')}: {stats.reqDosTerciosQuorum} {stats.reqDosTerciosQuorum === 1 ? t('voting.vote', 'voto') : t('voting.votes', 'votos')}
                </div>
              </button>

              {/* Consenso 100% */}
              <button
                type="button"
                aria-pressed={tipoMayoria === 'consensus'}
                onClick={() => configurarVotacion({ tipoMayoria: 'consensus' })}
                style={{
                  padding: '0.5rem 0.6rem',
                  borderRadius: 'var(--border-radius)',
                  border: `1px solid ${tipoMayoria === 'consensus' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                  backgroundColor: tipoMayoria === 'consensus' ? 'var(--accent-soft)' : 'var(--input-bg, var(--panel-color))',
                  color: tipoMayoria === 'consensus' ? 'var(--accent-color)' : 'var(--muted-text)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: '750' }}>{t('voting.consensus', 'Consenso')}</div>
                <div style={{ fontSize: '0.67rem', opacity: 0.8, marginTop: '2px' }}>
                  {t('voting.requiresZeroAgainst', '0 en contra')}
                </div>
              </button>
            </div>
          </div>

          {/* 4. Aplicación de Veto P5 (Consejo de Seguridad) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', borderRadius: 'var(--border-radius)', backgroundColor: 'var(--card-header-bg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Crown size={18} color={vetoOrange} fill={vetoOrange} />
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: '750', color: 'var(--text-color)' }}>
                  {t('voting.vetoRight', 'Derecho a Veto (P5)')}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
                  {t('voting.vetoRightDesc', 'Voto en contra de miembros permanentes veta la resolución')}
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-pressed={aplicarVeto}
              onClick={() => configurarVotacion({ aplicarVeto: !aplicarVeto })}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: 'var(--border-radius)',
                border: `1px solid ${aplicarVeto ? vetoOrangeBorder : 'var(--border-color)'}`,
                backgroundColor: aplicarVeto ? vetoOrangeBg : 'transparent',
                color: aplicarVeto ? vetoOrange : 'var(--muted-text)',
                fontSize: '0.75rem',
                fontWeight: '750',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {aplicarVeto ? t('common.activeOn', 'ACTIVO (ON)') : t('common.inactiveOff', 'INACTIVO (OFF)')}
            </button>
          </div>

          {/* 5. Acciones de Reinicio y Cierre */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid var(--subborder-color)' }}>
            <button
              type="button"
              onClick={async () => {
                const confirmed = await confirm({
                  title: t('voting.confirmResetTitle', 'Reiniciar votación'),
                  message: t('ui.resetAndClearAllRecordedVotesForThisVote'),
                  confirmText: t('voting.reset', 'Reiniciar'),
                  cancelText: t('common.cancel', 'Cancelar'),
                  type: 'danger'
                });
                if (confirmed) {
                  resetearVotacion();
                }
              }}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--danger-color)',
                backgroundColor: 'var(--danger-soft)',
                color: 'var(--danger-color)',
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
                borderRadius: 'var(--border-radius)',
                border: 'none',
                backgroundColor: 'var(--btn-bg)',
                color: 'var(--btn-text)',
                fontSize: '0.76rem',
                fontWeight: '750',
                cursor: 'pointer'
              }}
            >
              {t('common.done', 'Listo')}
            </button>
          </div>
        </div>
      )}

      <ListaDerechos paises={paises} sesion={votacionSesion} votacionTerminada={stats.finalizada && !modoRollCall} />

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
            backgroundColor: 'var(--card-header-bg)',
            border: `1px solid ${rollCallFinalizado ? (stats.vetoEjercido ? 'var(--danger-color)' : (stats.superado ? 'var(--success-color)' : 'var(--danger-color)')) : (rondaRollCall === 2 ? 'var(--warning-color)' : 'var(--accent-color)')}`,
            borderRadius: 'var(--border-radius)',
            padding: '0.75rem 1rem',
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Encabezado del Roll Call */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--subborder-color)', paddingBottom: '0.45rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontWeight: '750',
                fontSize: '0.85rem',
                color: rollCallFinalizado
                  ? (stats.vetoEjercido ? 'var(--danger-color)' : (stats.superado ? 'var(--success-color)' : 'var(--danger-color)'))
                  : (rondaRollCall === 2 ? 'var(--warning-color)' : 'var(--accent-color)'),
                letterSpacing: '0.02em'
              }}>
                {rollCallFinalizado
                  ? t('voting.finalRulingRollCall', 'DICTAMEN FINAL — ROLL CALL NOMINAL')
                  : (rondaRollCall === 1 ? t('voting.round1RollCall', 'PRIMERA RONDA — ROLL CALL NOMINAL') : t('voting.round2RollCall', 'SEGUNDA RONDA — DELEGACIONES QUE PASARON'))}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted-text)' }}>
                {paisActualRollCall ? `${t('voting.turn', 'Turno')} ${indiceRollCall + 1} ${t('common.of', 'de')} ${listaPaisesRondaRollCall.length}` : t('voting.rollCallCompleted', 'Votación Nominal Completada')}
              </span>
              <button
                type="button"
                onClick={toggleModoRollCall}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted-text)',
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
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700' }}>
                    {t(`sessionValues.${paisActualRollCall.estatus}`, paisActualRollCall.estatus)}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span>{paisActualRollCall.nombre}</span>
                    {paisActualRollCall.veto && <Crown size={16} color={vetoOrange} fill={vetoOrange} title={t('ui.permanentMemberP5WithVeto')} />}
                  </div>
                </div>
              </div>

              {/* Botones de Voto Roll Call */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                {indiceRollCall > 0 && (
                  <button
                    type="button"
                    onClick={retrocederRollCall}
                    style={{
                      padding: '0.35rem 0.55rem',
                      backgroundColor: 'var(--input-bg, var(--panel-color))',
                      color: 'var(--text-color)',
                      fontWeight: '600',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.15s ease'
                    }}
                    title={t('ui.goBackToPreviousCountry', 'Retroceder al país anterior')}
                  >
                    <ChevronLeft size={13} />
                  </button>
                )}

                {/* 1. A Favor */}
                <button
                  type="button"
                  onClick={() => registrarYAvanzarRollCall('favor')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    backgroundColor: 'var(--success-solid)',
                    color: 'var(--btn-text)',
                    fontWeight: '750',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'opacity 0.15s ease'
                  }}
                >
                  <Check size={13} />
                  <span>{t('voting.inFavor', 'A Favor')}</span>
                </button>

                {/* 2. A Favor con Derechos */}
                <button
                  type="button"
                  onClick={() => registrarYAvanzarRollCall('favor_derechos')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    backgroundColor: 'var(--success-soft)',
                    color: 'var(--success-color)',
                    fontWeight: '750',
                    border: '1px solid var(--success-color)',
                    borderRadius: 'var(--border-radius)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.15s ease'
                  }}
                  title={t('voting.inFavorWithRights', 'A favor con derechos')}
                >
                  <Scale size={12} />
                  <span>{t('voting.inFavorWithRights', 'A favor con derechos')}</span>
                </button>

                {/* 3. Abstención (si no es Presente y Votando y no en Ronda 2) */}
                <button
                  type="button"
                  onClick={() => registrarYAvanzarRollCall('abstencion')}
                  disabled={paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2}
                  style={{
                    padding: '0.35rem 0.75rem',
                    backgroundColor: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 'transparent' : 'var(--warning-solid)',
                    color: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 'var(--muted-text)' : 'var(--btn-text)',
                    border: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? '1px solid var(--border-color)' : 'none',
                    opacity: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 0.45 : 1,
                    fontWeight: '750',
                    borderRadius: 'var(--border-radius)',
                    cursor: (paisActualRollCall.estatus === 'Presente y Votando' || rondaRollCall === 2) ? 'not-allowed' : 'pointer',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'opacity 0.15s ease'
                  }}
                  title={
                    rondaRollCall === 2
                      ? t('ui.abstentionIsNotAllowedInTheSecondRound')
                      : (paisActualRollCall.estatus === 'Presente y Votando' ? t('ui.presentAndVotingCannotAbstain') : t('voting.abstention'))
                  }
                >
                  <RotateCcw size={11} />
                  <span>{t('voting.abstention', 'Abstención')}</span>
                </button>

                {/* 4. En Contra con Derechos */}
                <button
                  type="button"
                  onClick={() => registrarYAvanzarRollCall('contra_derechos')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    backgroundColor: 'var(--danger-soft)',
                    color: 'var(--danger-color)',
                    fontWeight: '750',
                    border: '1px solid var(--danger-color)',
                    borderRadius: 'var(--border-radius)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.15s ease'
                  }}
                  title={t('voting.againstWithRights', 'En contra con derechos')}
                >
                  <Scale size={12} />
                  <span>{t('voting.againstWithRights', 'En contra con derechos')}</span>
                </button>

                {/* 5. En Contra */}
                <button
                  type="button"
                  onClick={() => registrarYAvanzarRollCall('contra')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    backgroundColor: 'var(--danger-solid)',
                    color: 'var(--btn-text)',
                    fontWeight: '750',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'opacity 0.15s ease'
                  }}
                >
                  <X size={13} />
                  <span>{t('voting.against', 'En Contra')}</span>
                </button>

                {/* 6. Botón Pasar / Omitir (Solo disponible en Ronda 1) */}
                {rondaRollCall === 1 && (
                  <button
                    type="button"
                    onClick={() => registrarYAvanzarRollCall('pasar')}
                    style={{
                      padding: '0.35rem 0.65rem',
                      backgroundColor: 'var(--input-bg, var(--panel-color))',
                      color: 'var(--text-color)',
                      fontWeight: '600',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.15s ease'
                    }}
                    title={t('voting.passTurn', 'Pasar turno a la segunda ronda')}
                  >
                    <SkipForward size={12} />
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
                borderRadius: 'var(--border-radius)',
                backgroundColor: stats.vetoEjercido
                  ? 'var(--danger-soft)'
                  : (stats.superado
                    ? 'var(--success-soft)'
                    : 'var(--danger-soft)'),
                border: `1px solid ${stats.vetoEjercido ? 'var(--danger-color)' : (stats.superado ? 'var(--success-color)' : 'var(--danger-color)')}`
              }}>
                {stats.vetoEjercido ? (
                  <ShieldAlert size={24} color="var(--danger-color)" />
                ) : stats.superado ? (
                  <CheckCircle2 size={24} color="var(--success-color)" />
                ) : (
                  <XCircle size={24} color="var(--danger-color)" />
                )}
                <div style={{
                  fontSize: '1.05rem',
                  fontWeight: '800',
                  color: stats.vetoEjercido
                    ? 'var(--danger-color)'
                    : (stats.superado ? 'var(--success-color)' : 'var(--danger-color)')
                }}>
                  {stats.vetoEjercido
                    ? t('voting.vetoedResultBanner', '¡VOTACIÓN REPROBADA POR VETO!')
                    : (stats.superado ? t('voting.passedResultBanner', '¡VOTACIÓN APROBADA CON ÉXITO!') : t('voting.failedResultBanner', '¡VOTACIÓN REPROBADA!'))}
                </div>
              </div>

              {/* Detalle si hubo veto */}
              {stats.vetoEjercido && stats.paisesVeto.length > 0 && (
                <div style={{ fontSize: '0.78rem', color: 'var(--danger-color)', fontWeight: '700' }}>
                  {t('voting.vetoExercisedBy', 'Veto ejercido por')}: {stats.paisesVeto.map(p => p.nombre).join(', ')}
                </div>
              )}

              {/* Chips de Conteo */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.8rem', fontWeight: '750' }}>
                <span style={{ color: 'var(--success-color)', backgroundColor: 'var(--success-soft)', border: '1px solid var(--success-color)', padding: '0.2rem 0.55rem', borderRadius: '4px' }}>
                  {t('voting.inFavor', 'A Favor')}: {stats.favor}
                </span>
                <span style={{ color: 'var(--danger-color)', backgroundColor: 'var(--danger-soft)', border: '1px solid var(--danger-color)', padding: '0.2rem 0.55rem', borderRadius: '4px' }}>
                  {t('voting.against', 'En Contra')}: {stats.contra}
                </span>
                {(tipoVotacion === 'substantive' || stats.abstencion > 0) && (
                  <span style={{ color: 'var(--warning-color)', backgroundColor: 'var(--warning-soft)', border: '1px solid var(--warning-color)', padding: '0.2rem 0.55rem', borderRadius: '4px' }}>
                    {t('voting.abstention', 'Abstención')}: {stats.abstencion}
                  </span>
                )}
                <span style={{ color: 'var(--info-color)', backgroundColor: 'var(--info-soft)', border: '1px solid var(--info-color)', padding: '0.2rem 0.55rem', borderRadius: '4px' }}>
                  {t('voting.quorum', 'Quórum')}: {stats.totalEmitidos}/{stats.totalAsistentes}
                </span>
              </div>

              <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)' }}>
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
                    backgroundColor: 'var(--btn-bg)',
                    color: 'var(--btn-text)',
                    fontWeight: '750',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  {t('voting.viewResultsOnMap', 'Ver Resultados en el Mapa')}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const confirmed = await confirm({
                      title: t('voting.confirmResetTitle', 'Reiniciar votación'),
                      message: t('ui.resetVotesAndStartANewVote'),
                      confirmText: t('voting.reset', 'Reiniciar'),
                      cancelText: t('common.cancel', 'Cancelar'),
                      type: 'danger'
                    });
                    if (confirmed) {
                      resetearVotacion();
                      setModoRollCall(false);
                      setRollCallFinalizado(false);
                    }
                  }}
                  style={{
                    padding: '0.45rem 0.85rem',
                    backgroundColor: 'var(--input-bg, var(--panel-color))',
                    color: 'var(--text-color)',
                    fontWeight: '700',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
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
          backgroundColor: 'var(--bg-color)',
          cursor: isPanning ? 'grabbing' : 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.25s ease'
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

              // 2. Colores y Estilos coherentes con el sistema de diseño OpenMUN
              let fillColor = isLight ? '#dedcd8' : '#222222'; // Base para países no delegados
              let strokeColor = isLight ? '#c8c6c2' : '#333333';
              let strokeWidth = 0.5;
              let opacity = 0.85;

              if (country) {
                if (voto === 'favor') {
                  fillColor = isLight ? '#386447' : '#4f795d'; // Success solid
                  strokeColor = isLight ? '#2a4c36' : '#a4d4b3';
                  strokeWidth = 1.2;
                  opacity = 1.0;
                } else if (voto === 'contra') {
                  fillColor = isLight ? '#974b43' : '#a95449'; // Danger solid
                  strokeColor = country.veto && aplicarVeto ? vetoOrange : (isLight ? '#773a34' : '#edaaa1');
                  strokeWidth = country.veto && aplicarVeto ? 2.5 : 1.2;
                  opacity = 1.0;
                } else if (voto === 'abstencion') {
                  fillColor = isLight ? '#80673b' : '#735c34'; // Warning solid
                  strokeColor = isLight ? '#66522f' : '#cbb58d';
                  strokeWidth = 1.2;
                  opacity = 1.0;
                } else if (isPresente) {
                  // Presente pendiente
                  fillColor = isLight ? '#50677f' : '#3d5268'; // Info solid
                  strokeColor = isLight ? '#384859' : '#a6b8c9';
                  strokeWidth = 0.9;
                  opacity = 0.9;
                } else {
                  // Ausente
                  fillColor = isLight ? '#e5e1d8' : '#242424';
                  strokeColor = isLight ? '#d2cbbf' : '#333333';
                  opacity = 0.45;
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
                    strokeColor = isLight ? '#242424' : '#f7f2eb';
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
                strokeColor = isLight ? '#242424' : '#f7f2eb';
                strokeWidth = Math.max(strokeWidth, 2.0);
              }

              // Resaltado especial durante Roll Call
              if (isCurrentRollCall) {
                strokeColor = isLight ? '#ac482a' : '#efa37f';
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
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '0.5rem 0.75rem',
              boxShadow: 'none',
              pointerEvents: 'none',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              minWidth: '150px',
              color: 'var(--text-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: '800', fontSize: '0.85rem', color: 'var(--text-color)' }}>
              {tooltipData.countryObj ? (
                <CountryFlag bandera={tooltipData.countryObj.bandera} nombre={tooltipData.name} size="xs" />
              ) : (
                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>🌐</span>
              )}
              <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tooltipData.name}
              </span>
              {tooltipData.isP5 && (
                <Crown size={13} color={vetoOrange} fill={vetoOrange} title={t('ui.permanentMemberP5WithVeto')} />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--muted-text)' }}>
              <span>{t('voting.state', 'Estado')}:</span>
              <span
                style={{
                  fontWeight: '800',
                  color:
                    tooltipData.vote === 'favor'
                      ? 'var(--success-color)'
                      : tooltipData.vote === 'contra'
                      ? 'var(--danger-color)'
                      : tooltipData.vote === 'abstencion'
                      ? 'var(--warning-color)'
                      : tooltipData.countryObj
                      ? 'var(--info-color)'
                      : 'var(--muted-text)'
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
              <div style={{ fontSize: '0.65rem', color: 'var(--muted-text)', borderTop: '1px solid var(--subborder-color)', paddingTop: '0.2rem', marginTop: '0.1rem' }}>
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
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '0.85rem',
              boxShadow: 'none',
              zIndex: 60,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              minWidth: '210px',
              color: 'var(--text-color)',
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            {/* Cabecera del País */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--subborder-color)', paddingBottom: '0.45rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <CountryFlag
                  bandera={selectedCountryForVote.countryObj.bandera}
                  nombre={selectedCountryForVote.countryObj.nombre}
                  size="sm"
                />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{selectedCountryForVote.countryObj.nombre}</span>
                    {selectedCountryForVote.countryObj.veto && <Crown size={13} color={vetoOrange} fill={vetoOrange} />}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
                    {t(`sessionValues.${selectedCountryForVote.countryObj.estatus}`, selectedCountryForVote.countryObj.estatus)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCountryForVote(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer', padding: '2px' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Voto Actual */}
            <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('voting.recordedVote', 'Voto registrado')}:</span>
              <strong style={{
                color: (votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'favor' ? 'var(--success-color)' :
                  (votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'contra' ? 'var(--danger-color)' :
                  (votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'abstencion' ? 'var(--warning-color)' : 'var(--info-color)'
              }}>
                {(votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) ? (votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]).toUpperCase() : t('voting.pendingUpper', 'PENDIENTE')}
              </strong>
            </div>

            {/* Botones de Votación Rápida */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {/* 1. A Favor */}
              <button
                type="button"
                onClick={() => handleSetVote('favor')}
                style={{
                  padding: '0.45rem 0.7rem',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--success-color)',
                  backgroundColor: ((votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'favor' && !votacionSesion?.derechos?.[selectedCountryForVote.countryObj.id]) ? 'var(--success-solid)' : 'var(--input-bg, var(--panel-color))',
                  color: ((votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'favor' && !votacionSesion?.derechos?.[selectedCountryForVote.countryObj.id]) ? 'var(--btn-text)' : 'var(--success-color)',
                  fontSize: '0.78rem',
                  fontWeight: '750',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Check size={14} />
                <span>{t('voting.inFavor', 'A Favor')}</span>
              </button>

              {/* 2. A Favor con Derechos */}
              <button
                type="button"
                onClick={() => handleSetVote('favor_derechos')}
                style={{
                  padding: '0.45rem 0.7rem',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--success-color)',
                  backgroundColor: ((votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'favor' && votacionSesion?.derechos?.[selectedCountryForVote.countryObj.id]) ? 'var(--success-soft)' : 'var(--input-bg, var(--panel-color))',
                  color: 'var(--success-color)',
                  fontSize: '0.78rem',
                  fontWeight: '750',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease'
                }}
                title={t('voting.inFavorWithRights', 'A favor con derechos')}
              >
                <Scale size={13} />
                <span>{t('voting.inFavorWithRights', 'A favor con derechos')}</span>
              </button>

              {/* 3. Abstención (si no es Presente y Votando) */}
              <button
                type="button"
                disabled={selectedCountryForVote.countryObj.estatus === 'Presente y Votando'}
                onClick={() => handleSetVote('abstencion')}
                style={{
                  padding: '0.45rem 0.7rem',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--warning-color)',
                  backgroundColor: (votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'abstencion' ? 'var(--warning-solid)' : 'var(--input-bg, var(--panel-color))',
                  color: selectedCountryForVote.countryObj.estatus === 'Presente y Votando' ? 'var(--muted-text)' : ((votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'abstencion' ? 'var(--btn-text)' : 'var(--warning-color)'),
                  fontSize: '0.78rem',
                  fontWeight: '750',
                  cursor: selectedCountryForVote.countryObj.estatus === 'Presente y Votando' ? 'not-allowed' : 'pointer',
                  opacity: selectedCountryForVote.countryObj.estatus === 'Presente y Votando' ? 0.35 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease'
                }}
                title={
                  selectedCountryForVote.countryObj.estatus === 'Presente y Votando'
                    ? t('ui.delegationsWithPresentAndVotingStatusCannotAbstain')
                    : t('voting.abstention')
                }
              >
                <RotateCcw size={13} />
                <span>{t('voting.abstention', 'Abstención')}</span>
              </button>

              {/* 4. En Contra con Derechos */}
              <button
                type="button"
                onClick={() => handleSetVote('contra_derechos')}
                style={{
                  padding: '0.45rem 0.7rem',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--danger-color)',
                  backgroundColor: ((votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'contra' && votacionSesion?.derechos?.[selectedCountryForVote.countryObj.id]) ? 'var(--danger-soft)' : 'var(--input-bg, var(--panel-color))',
                  color: 'var(--danger-color)',
                  fontSize: '0.78rem',
                  fontWeight: '750',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease'
                }}
                title={t('voting.againstWithRights', 'En contra con derechos')}
              >
                <Scale size={13} />
                <span>{t('voting.againstWithRights', 'En contra con derechos')}</span>
              </button>

              {/* 5. En Contra */}
              <button
                type="button"
                onClick={() => handleSetVote('contra')}
                style={{
                  padding: '0.45rem 0.7rem',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--danger-color)',
                  backgroundColor: ((votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'contra' && !votacionSesion?.derechos?.[selectedCountryForVote.countryObj.id]) ? 'var(--danger-solid)' : 'var(--input-bg, var(--panel-color))',
                  color: ((votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) === 'contra' && !votacionSesion?.derechos?.[selectedCountryForVote.countryObj.id]) ? 'var(--btn-text)' : 'var(--danger-color)',
                  fontSize: '0.78rem',
                  fontWeight: '750',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <X size={14} />
                <span>{t('voting.against', 'En Contra')} {selectedCountryForVote.countryObj.veto && aplicarVeto ? `(${t('voting.vetoWord', 'Veto')})` : ''}</span>
              </button>

              {(votos[selectedCountryForVote.countryObj.id] || votos[String(selectedCountryForVote.countryObj.id)]) && (
                <button
                  type="button"
                  onClick={handleClearVote}
                  style={{
                    padding: '0.35rem 0.6rem',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--input-bg, var(--panel-color))',
                    color: 'var(--muted-text)',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    marginTop: '2px',
                    transition: 'all 0.15s ease'
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
            backgroundColor: 'var(--card-header-bg)',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--border-color)',
            fontSize: '0.72rem',
            color: 'var(--text-color)',
            pointerEvents: 'none',
            zIndex: 15
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success-color)' }} />
            <span>{t('voting.inFavor', 'A Favor')} ({stats.favor})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger-color)' }} />
            <span>{t('voting.against', 'En Contra')} ({stats.contra})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--warning-color)' }} />
            <span>{t('voting.abstention', 'Abstención')} ({stats.abstencion})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--info-color)' }} />
            <span>{t('voting.pending', 'Pendiente')} ({stats.pendientes})</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapaVotacion;
