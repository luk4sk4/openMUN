import {
  Users,
  Timer,
  Vote,
  FileCheck2,
  BarChart3,
  Hourglass,
  FlaskConical,
  Layers,
  LayoutTemplate,
  Sliders,
  Globe,
  Star,
  Zap,
  Sparkles,
  Flame,
  Dices
} from 'lucide-react';

import gslStandard from './gsl_standard.json';
import debateModerado from './debate_moderado.json';
import votacionQuorum from './votacion_quorum.json';
import setupComienzo from './setup_comienzo.json';
import estadisticasInfo from './estadisticas_info.json';
import caucusSimple from './caucus_simple.json';
import crisisLab from './crisis_lab.json';

const ICON_MAP = {
  Users,
  Timer,
  Vote,
  FileCheck2,
  BarChart3,
  Hourglass,
  FlaskConical,
  Layers,
  LayoutTemplate,
  Sliders,
  Globe,
  Star,
  Zap,
  Sparkles,
  Flame,
  Dices
};

export const RAW_PLANTILLAS_WIDGETS = [
  gslStandard,
  debateModerado,
  votacionQuorum,
  setupComienzo,
  estadisticasInfo,
  caucusSimple,
  crisisLab
];

export const PLANTILLAS_WIDGETS = RAW_PLANTILLAS_WIDGETS.map(tpl => ({
  ...tpl,
  icon: typeof tpl.icon === 'string' ? (ICON_MAP[tpl.icon] || Layers) : tpl.icon
}));

export const PRESET_TEMPLATES = PLANTILLAS_WIDGETS;

export default PLANTILLAS_WIDGETS;
