import { lazyWithRetry } from '../../utils/lazyWithRetry';

// Lazy load widgets with automatic chunk reload retry on new deployments
const CronometroPrincipal = lazyWithRetry(() => import('./CronometroPrincipal'), 'CronometroPrincipal');
const ListaOradores = lazyWithRetry(() => import('./ListaOradores'), 'ListaOradores');
const PizarraMociones = lazyWithRetry(() => import('./PizarraMociones'), 'PizarraMociones');
const CronometroDual = lazyWithRetry(() => import('./CronometroDual'), 'CronometroDual');
const CronometroOnlyTime = lazyWithRetry(() => import('./CronometroOnlyTime'), 'CronometroOnlyTime');
const MatrizPaises = lazyWithRetry(() => import('./MatrizPaises'), 'MatrizPaises');
const HistoricoDelegaciones = lazyWithRetry(() => import('./HistoricoDelegaciones'), 'HistoricoDelegaciones');
const VotacionOficial = lazyWithRetry(() => import('./VotacionOficial'), 'VotacionOficial');
const EstablecerAgenda = lazyWithRetry(() => import('./EstablecerAgenda'), 'EstablecerAgenda');
const ImportarPaises = lazyWithRetry(() => import('./ImportarPaises'), 'ImportarPaises');
const ConfigurarComite = lazyWithRetry(() => import('./ConfigurarComite'), 'ConfigurarComite');
const AnadirPaises = lazyWithRetry(() => import('./AnadirPaises'), 'AnadirPaises');
const AnadirPaisesGSL = lazyWithRetry(() => import('./AnadirPaisesGSL'), 'AnadirPaisesGSL');
const AnadirPaisesDebate = lazyWithRetry(() => import('./AnadirPaisesDebate'), 'AnadirPaisesDebate');
const SelectorAleatorio = lazyWithRetry(() => import('./SelectorAleatorio'), 'SelectorAleatorio');
const GestorCrisis = lazyWithRetry(() => import('./GestorCrisis'), 'GestorCrisis');
const TeleNoticiasCrisis = lazyWithRetry(() => import('./TeleNoticiasCrisis'), 'TeleNoticiasCrisis');
const PizarraInteractiva = lazyWithRetry(() => import('./PizarraInteractiva'), 'PizarraInteractiva');
const MapaVotacion = lazyWithRetry(() => import('./MapaVotacion'), 'MapaVotacion');
const MiniVotacion = lazyWithRetry(() => import('./MiniVotacion'), 'MiniVotacion');
const ControladorEnmiendas = lazyWithRetry(() => import('./ControladorEnmiendas'), 'ControladorEnmiendas');
const CronometroEnmiendas = lazyWithRetry(() => import('./CronometroEnmiendas'), 'CronometroEnmiendas');


const WidgetRegistry = {
  // Widgets Canónicos Únicos
  "establecer_agenda": EstablecerAgenda,
  "importar_paises": ImportarPaises,
  "lista_oradores": ListaOradores,
  "anadir_paises_gsl": AnadirPaisesGSL,
  "cronometro_principal": CronometroPrincipal,
  "cronometro_dual": CronometroDual,
  "cronometro_only_time": CronometroOnlyTime,
  "cronometro_enmiendas": CronometroEnmiendas,
  "pizarra_mociones": PizarraMociones,
  "anadir_paises_debate": AnadirPaisesDebate,
  "votacion_oficial": VotacionOficial,
  "mini_votacion": MiniVotacion,
  "controlador_enmiendas": ControladorEnmiendas,
  "mapa_votacion": MapaVotacion,
  "matriz_paises": MatrizPaises,
  "historico_delegaciones": HistoricoDelegaciones,
  "selector_aleatorio": SelectorAleatorio,
  "gestor_crisis": GestorCrisis,
  "tele_noticias": TeleNoticiasCrisis,
  "pizarra_interactiva": PizarraInteractiva,

  // Alias y Compatibilidad Retroactiva
  "mini_voting": MiniVotacion,
  "votacion_rapida": MiniVotacion,
  "gestor_enmiendas": ControladorEnmiendas,
  "enmiendas": ControladorEnmiendas,
  "amendments_controller": ControladorEnmiendas,
  "timer_enmiendas": CronometroEnmiendas,
  "cronometro_debate_enmiendas": CronometroEnmiendas,
  "configurar_comite": EstablecerAgenda,
  "comite_agenda": EstablecerAgenda,
  "anadir_paises": AnadirPaises,
  "agregar_paises": AnadirPaises,
  "ruleta_paises": SelectorAleatorio,
  "breaking_news": GestorCrisis,
  "tv_crisis": TeleNoticiasCrisis,
  "noticiero_tv": TeleNoticiasCrisis,
  "pizarra_dibujo": PizarraInteractiva,
  "whiteboard": PizarraInteractiva,
  "mapa_interactivo": PizarraInteractiva,
  "voting_map": MapaVotacion,
  "mapa_votos": MapaVotacion,
};

export default WidgetRegistry;


