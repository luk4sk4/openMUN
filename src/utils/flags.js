// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de Banderas e Imágenes de Delegaciones para openMUN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convierte un emoji de bandera Unicode (ej: '🇪🇸', '🇨🇦') a su código ISO de 2 letras ('es', 'ca').
 */
export function emojiToIso(emoji) {
  if (!emoji || typeof emoji !== 'string') return null;
  const trimmed = emoji.trim();
  
  // Casos especiales frecuentes
  if (trimmed === '🇺🇳') return 'un';
  if (trimmed === '🇪🇺') return 'eu';
  
  const codePoints = Array.from(trimmed).map(char => char.codePointAt(0));
  if (codePoints.length >= 2) {
    const [c1, c2] = codePoints;
    // Regional Indicator Symbols están en el rango 0x1F1E6 ('A') a 0x1F1FF ('Z')
    if (c1 >= 0x1F1E6 && c1 <= 0x1F1FF && c2 >= 0x1F1E6 && c2 <= 0x1F1FF) {
      const l1 = String.fromCharCode(c1 - 0x1F1E6 + 65);
      const l2 = String.fromCharCode(c2 - 0x1F1E6 + 65);
      return `${l1}${l2}`.toLowerCase();
    }
  }
  return null;
}

/**
 * Diccionario exhaustivo de nombres comunes, formales y en varios idiomas a códigos ISO 3166-1 alpha-2.
 * Incluye los 193 Estados Miembros de la ONU, Observadores, Organizaciones Internacionales y Territorios.
 */
export const DICCIONARIO_PAISES_ISO = {
  // P5, Organizaciones y Observadores
  'estados unidos': 'us', 'eeuu': 'us', 'usa': 'us', 'united states': 'us', 'ee.uu.': 'us', 'estados unidos de america': 'us', 'united states of america': 'us', 'us': 'us',
  'reino unido': 'gb', 'uk': 'gb', 'united kingdom': 'gb', 'gran bretana': 'gb', 'gran bretaña': 'gb', 'inglaterra': 'gb', 'england': 'gb', 'great britain': 'gb', 'gb': 'gb',
  'francia': 'fr', 'france': 'fr', 'republica francesa': 'fr', 'french republic': 'fr', 'fr': 'fr',
  'rusia': 'ru', 'federacion rusa': 'ru', 'federación rusa': 'ru', 'russia': 'ru', 'russian federation': 'ru', 'ru': 'ru',
  'china': 'cn', 'republica popular china': 'cn', 'república popular china': 'cn', "people's republic of china": 'cn', 'cn': 'cn',
  'onu': 'un', 'naciones unidas': 'un', 'united nations': 'un', 'un': 'un',
  'union europea': 'eu', 'unión europea': 'eu', 'european union': 'eu', 'ue': 'eu', 'eu': 'eu',
  'vaticano': 'va', 'santa sede': 'va', 'holy see': 'va', 'vatican': 'va', 'vatican city': 'va', 'ciudad del vaticano': 'va',
  'palestina': 'ps', 'palestine': 'ps', 'estado de palestina': 'ps', 'state of palestine': 'ps',

  // América
  'antigua y barbuda': 'ag', 'antigua and barbuda': 'ag',
  'argentina': 'ar', 'republica argentina': 'ar',
  'bahamas': 'bs', 'the bahamas': 'bs',
  'barbados': 'bb',
  'belice': 'bz', 'belize': 'bz',
  'bolivia': 'bo', 'estado plurinacional de bolivia': 'bo',
  'brasil': 'br', 'brazil': 'br',
  'canada': 'ca', 'canadá': 'ca',
  'chile': 'cl',
  'colombia': 'co',
  'costa rica': 'cr',
  'cuba': 'cu',
  'dominica': 'dm',
  'ecuador': 'ec',
  'el salvador': 'sv',
  'granada': 'gd', 'grenada': 'gd',
  'guatemala': 'gt',
  'guyana': 'gy',
  'haiti': 'ht', 'haití': 'ht',
  'honduras': 'hn',
  'jamaica': 'jm',
  'mexico': 'mx', 'méxico': 'mx', 'estados unidos mexicanos': 'mx',
  'nicaragua': 'ni',
  'panama': 'pa', 'panamá': 'pa',
  'paraguay': 'py',
  'peru': 'pe', 'perú': 'pe',
  'puerto rico': 'pr',
  'republica dominicana': 'do', 'república dominicana': 'do', 'dominican republic': 'do',
  'san cristobal y nieves': 'kn', 'saint kitts and nevis': 'kn', 'st kitts': 'kn',
  'santa lucia': 'lc', 'saint lucia': 'lc',
  'san vicente y las granadinas': 'vc', 'saint vincent and the grenadines': 'vc',
  'surinam': 'sr', 'suriname': 'sr',
  'trinidad y tobago': 'tt', 'trinidad and tobago': 'tt',
  'uruguay': 'uy',
  'venezuela': 've', 'republica bolivariana de venezuela': 've',

  // Europa
  'albania': 'al',
  'alemania': 'de', 'germany': 'de', 'deutschland': 'de',
  'andorra': 'ad',
  'armenia': 'am',
  'austria': 'at',
  'azerbaiyan': 'az', 'azerbaiyán': 'az', 'azerbaijan': 'az',
  'belgica': 'be', 'bélgica': 'be', 'belgium': 'be',
  'bielorrusia': 'by', 'belarus': 'by',
  'bosnia y herzegovina': 'ba', 'bosnia and herzegovina': 'ba', 'bosnia': 'ba',
  'bulgaria': 'bg',
  'chipre': 'cy', 'cyprus': 'cy',
  'croacia': 'hr', 'croatia': 'hr',
  'dinamarca': 'dk', 'denmark': 'dk',
  'eslovaquia': 'sk', 'slovakia': 'sk',
  'eslovenia': 'si', 'slovenia': 'si',
  'espana': 'es', 'españa': 'es', 'spain': 'es', 'reino de espana': 'es', 'reino de españa': 'es',
  'estonia': 'ee',
  'finlandia': 'fi', 'finland': 'fi',
  'georgia': 'ge',
  'grecia': 'gr', 'greece': 'gr',
  'hungria': 'hu', 'hungría': 'hu', 'hungary': 'hu',
  'irlanda': 'ie', 'ireland': 'ie',
  'islandia': 'is', 'iceland': 'is',
  'italia': 'it', 'italy': 'it',
  'kazajistan': 'kz', 'kazajistán': 'kz', 'kazakhstan': 'kz',
  'kosovo': 'xk',
  'letonia': 'lv', 'latvia': 'lv',
  'liechtenstein': 'li',
  'lituania': 'lt', 'lithuania': 'lt',
  'luxemburgo': 'lu', 'luxembourg': 'lu',
  'macedonia del norte': 'mk', 'macedonia': 'mk', 'north macedonia': 'mk',
  'malta': 'mt',
  'moldavia': 'md', 'moldova': 'md',
  'monaco': 'mc', 'mónaco': 'mc',
  'montenegro': 'me',
  'noruega': 'no', 'norway': 'no',
  'paises bajos': 'nl', 'países bajos': 'nl', 'holanda': 'nl', 'netherlands': 'nl', 'holland': 'nl',
  'polonia': 'pl', 'poland': 'pl',
  'portugal': 'pt',
  'republica checa': 'cz', 'república checa': 'cz', 'chequia': 'cz', 'czechia': 'cz', 'czech republic': 'cz',
  'rumania': 'ro', 'rumanía': 'ro', 'romania': 'ro',
  'san marino': 'sm',
  'serbia': 'rs',
  'suecia': 'se', 'sweden': 'se',
  'suiza': 'ch', 'switzerland': 'ch',
  'turquia': 'tr', 'turquía': 'tr', 'turkey': 'tr', 'turkiye': 'tr', 'türkiye': 'tr',
  'ucrania': 'ua', 'ukraine': 'ua',

  // Asia y Medio Oriente
  'afganistan': 'af', 'afganistán': 'af', 'afghanistan': 'af',
  'arabia saudita': 'sa', 'arabia saudi': 'sa', 'arabia saudí': 'sa', 'saudi arabia': 'sa',
  'barein': 'bh', 'baréin': 'bh', 'bahrain': 'bh',
  'banglades': 'bd', 'bangladés': 'bd', 'bangladesh': 'bd',
  'brunei': 'bn', 'brunéi': 'bn',
  'butan': 'bt', 'bután': 'bt', 'bhutan': 'bt',
  'camboya': 'kh', 'cambodia': 'kh',
  'catar': 'qa', 'qatar': 'qa',
  'corea del norte': 'kp', 'north korea': 'kp', 'rpd corea': 'kp', 'dprk': 'kp',
  'corea del sur': 'kr', 'south korea': 'kr', 'corea': 'kr', 'republica de corea': 'kr', 'república de corea': 'kr', 'republic of korea': 'kr',
  'emiratos arabes unidos': 'ae', 'emiratos árabes unidos': 'ae', 'eau': 'ae', 'uae': 'ae', 'united arab emirates': 'ae',
  'filipinas': 'ph', 'philippines': 'ph',
  'hong kong': 'hk',
  'india': 'in',
  'indonesia': 'id',
  'irak': 'iq', 'iraq': 'iq',
  'iran': 'ir', 'irán': 'ir', 'republica islamica de iran': 'ir',
  'israel': 'il',
  'japon': 'jp', 'japón': 'jp', 'japan': 'jp',
  'jordania': 'jo', 'jordan': 'jo',
  'kirguistan': 'kg', 'kirguistán': 'kg', 'kyrgyzstan': 'kg',
  'kuwait': 'kw',
  'laos': 'la',
  'libano': 'lb', 'líbano': 'lb', 'lebanon': 'lb',
  'malasia': 'my', 'malaysia': 'my',
  'maldivas': 'mv', 'maldives': 'mv',
  'mongolia': 'mn',
  'myanmar': 'mm', 'birmania': 'mm', 'burma': 'mm',
  'nepal': 'np',
  'oman': 'om', 'omán': 'om',
  'pakistan': 'pk', 'pakistán': 'pk',
  'singapur': 'sg', 'singapore': 'sg',
  'siria': 'sy', 'syria': 'sy',
  'sri lanka': 'lk',
  'tailandia': 'th', 'thailand': 'th',
  'taiwan': 'tw', 'taiwán': 'tw',
  'tayikistan': 'tj', 'tayikistán': 'tj', 'tajikistan': 'tj',
  'timor oriental': 'tl', 'timor-leste': 'tl', 'east timor': 'tl',
  'turkmenistan': 'tm', 'turkmenistán': 'tm', 'turkmenistan': 'tm',
  'uzbekistan': 'uz', 'uzbekistán': 'uz',
  'vietnam': 'vn', 'viet nam': 'vn',
  'yemen': 'ye',

  // África
  'angola': 'ao',
  'argelia': 'dz', 'algeria': 'dz',
  'benin': 'bj', 'benín': 'bj',
  'botsuana': 'bw', 'botswana': 'bw',
  'burkina faso': 'bf',
  'burundi': 'bi',
  'cabo verde': 'cv', 'cape verde': 'cv',
  'camerun': 'cm', 'camerún': 'cm', 'cameroon': 'cm',
  'chad': 'td',
  'comoras': 'km', 'comoros': 'km',
  'congo': 'cg', 'republica del congo': 'cg', 'republic of the congo': 'cg',
  'rd congo': 'cd', 'r d congo': 'cd', 'republica democratica del congo': 'cd', 'república democrática del congo': 'cd', 'drc': 'cd', 'democratic republic of the congo': 'cd',
  'costa de marfil': 'ci', "cote d'ivoire": 'ci', 'ivory coast': 'ci',
  'egipto': 'eg', 'egypt': 'eg',
  'eritrea': 'er',
  'esuatini': 'sz', 'eswatini': 'sz', 'suazilandia': 'sz', 'swaziland': 'sz',
  'etiopia': 'et', 'etiopía': 'et', 'ethiopia': 'et',
  'gabon': 'ga', 'gabón': 'ga',
  'gambia': 'gm', 'the gambia': 'gm',
  'ghana': 'gh',
  'guinea': 'gn',
  'guinea ecuatorial': 'gq', 'equatorial guinea': 'gq',
  'guinea bisau': 'gw', 'guinea-bissau': 'gw',
  'kenia': 'ke', 'kenya': 'ke',
  'lesoto': 'ls', 'lesotho': 'ls',
  'liberia': 'lr',
  'libia': 'ly', 'libya': 'ly',
  'madagascar': 'mg',
  'malaui': 'mw', 'malawi': 'mw',
  'mali': 'ml', 'malí': 'ml',
  'marruecos': 'ma', 'morocco': 'ma',
  'mauricio': 'mu', 'mauritius': 'mu',
  'mauritania': 'mr',
  'mozambique': 'mz',
  'namibia': 'na',
  'niger': 'ne', 'níger': 'ne',
  'nigeria': 'ng',
  'ruanda': 'rw', 'rwanda': 'rw',
  'santo tome y principe': 'st', 'santo tomé y príncipe': 'st', 'sao tome and principe': 'st',
  'senegal': 'sn',
  'seychelles': 'sc',
  'sierra leona': 'sl', 'sierra leone': 'sl',
  'somalia': 'so',
  'sudafrica': 'za', 'sudáfrica': 'za', 'south africa': 'za',
  'sudan': 'sd', 'sudán': 'sd', 'sudan': 'sd',
  'sudan del sur': 'ss', 'sudán del sur': 'ss', 'south sudan': 'ss',
  'tanzania': 'tz',
  'togo': 'tg',
  'tunez': 'tn', 'túnez': 'tn', 'tunisia': 'tn',
  'uganda': 'ug',
  'yibuti': 'dj', 'djibouti': 'dj',
  'zambia': 'zm',
  'zimbabue': 'zw', 'zimbabwe': 'zw',

  // Oceanía
  'australia': 'au',
  'fiyi': 'fj', 'fiji': 'fj',
  'islas marshall': 'mh', 'marshall islands': 'mh',
  'islas salomon': 'sb', 'islas salomón': 'sb', 'solomon islands': 'sb',
  'kiribati': 'ki',
  'micronesia': 'fm', 'estados federados de micronesia': 'fm',
  'nauru': 'nr',
  'nueva zelanda': 'nz', 'new zealand': 'nz',
  'palaos': 'pw', 'palau': 'pw',
  'papua nueva guinea': 'pg', 'papúa nueva guinea': 'pg', 'papua new guinea': 'pg',
  'samoa': 'ws',
  'tonga': 'to',
  'tuvalu': 'tv',
  'vanuatu': 'vu'
};

/**
 * Normaliza cualquier entrada de bandera (emoji, ISO, nombre o URL).
 * Si recibe un emoji de bandera válido (ej: 🇨🇦), extrae directamente su código ISO (ca)
 * y garantiza que nunca se devuelva '🌐' ni 'un' cuando haya información suficiente.
 */
export function normalizarBandera(input, nombrePais = '') {
  const raw = (input || '').trim();
  const nombreTrim = (nombrePais || '').trim();

  if (!raw && !nombreTrim) return 'un';
  
  // 1. Si ya es una URL web o DataURL Base64
  if (raw.startsWith('data:image/') || raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('blob:')) {
    return raw;
  }

  // 2. Si es un emoji de bandera válido (incluyendo regionales Unicode)
  const isoFromEmoji = emojiToIso(raw);
  if (isoFromEmoji) {
    return isoFromEmoji;
  }

  // 3. Si es un código ISO de 2 letras directo (ej: 'es', 'ca', 'US')
  if (/^[a-zA-Z]{2}$/.test(raw) && raw.toLowerCase() !== 'un') {
    return raw.toLowerCase();
  }

  // 4. Búsqueda por input limpio si no es emoji genérico ('🌐', etc.)
  if (raw && raw !== '🌐' && raw !== '🇺🇳') {
    const cleanInput = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (DICCIONARIO_PAISES_ISO[cleanInput]) {
      return DICCIONARIO_PAISES_ISO[cleanInput];
    }
  }

  // 5. Búsqueda por el nombre del país (español, inglés, oficial o variantes)
  if (nombreTrim) {
    const cleanNombre = nombreTrim.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (DICCIONARIO_PAISES_ISO[cleanNombre]) {
      return DICCIONARIO_PAISES_ISO[cleanNombre];
    }

    // Comprobación de prefijos comunes como "delegacion de ...", "republica de ...", "reino de ..."
    const nombreSinPrefijo = cleanNombre
      .replace(/^(delegacion|republica|república|reino|estado|estados|gobierno)\s+(de\s+|del\s+|de\s+la\s+|de\s+los\s+|de\s+las\s+)?/i, '')
      .trim();
    if (nombreSinPrefijo && DICCIONARIO_PAISES_ISO[nombreSinPrefijo]) {
      return DICCIONARIO_PAISES_ISO[nombreSinPrefijo];
    }
  }

  // Si era un código de 2 letras 'un', retornarlo
  if (raw.toLowerCase() === 'un') {
    return 'un';
  }

  // Si tiene código de 2 letras devuelto
  if (/^[a-zA-Z]{2}$/.test(raw)) {
    return raw.toLowerCase();
  }

  return raw || 'un';
}

/**
 * Retorna la URL de la imagen de la bandera.
 */
export function getFlagImageUrl(bandera, nombrePais = '') {
  const norm = normalizarBandera(bandera, nombrePais);
  
  if (!norm) return null;

  // Si ya es una URL completa o Base64
  if (norm.startsWith('data:image/') || norm.startsWith('http://') || norm.startsWith('https://') || norm.startsWith('blob:')) {
    return norm;
  }

  // Si es un código ISO (ej: 'es', 'un', 'us')
  if (/^[a-z]{2}$/.test(norm)) {
    return `https://flagcdn.com/w80/${norm}.png`;
  }

  return null;
}

/**
 * Obtiene iniciales elegantes de una delegación (ej: "Estados Unidos" -> "EU", "Cruz Roja" -> "CR").
 */
export function obtenerIniciales(nombre = '') {
  const palabras = (nombre || '').trim().split(/\s+/).filter(p => !['de', 'del', 'la', 'las', 'el', 'los', 'y', 'and', 'the', 'of'].includes(p.toLowerCase()));
  if (palabras.length === 0) return 'UN';
  if (palabras.length === 1) return palabras[0].substring(0, 2).toUpperCase();
  return (palabras[0][0] + palabras[1][0]).toUpperCase();
}

/**
 * Genera un color armónico basado en el string para insignias sin bandera.
 */
export function generarColorAvatar(nombre = '') {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 45%)`;
}

/**
 * Procesa y comprime una imagen (File, Blob o Clipboard item) a un DataURL Base64 optimizado (máx 200x150 px).
 * Esto garantiza que la imagen se guarde de forma ultraligera en localStorage y P2P.
 */
export function procesarImagenBandera(fileOrBlob, maxWidth = 200, maxHeight = 150) {
  return new Promise((resolve, reject) => {
    if (!fileOrBlob) {
      return reject(new Error('No se proporcionó ningún archivo de imagen'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcular ratio de reducción manteniendo proporción
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Suavizado de imagen de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Formato PNG o WebP según soporte
        const dataUrl = canvas.toDataURL('image/png', 0.88);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Convierte un código ISO (ej: 'es') a su correspondiente emoji de bandera (ej: '🇪🇸').
 */
export function isoToEmoji(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const clean = iso.trim().toLowerCase();
  if (clean === 'un') return '🇺🇳';
  if (clean === 'eu') return '🇪🇺';
  if (clean.length === 2 && /^[a-z]{2}$/.test(clean)) {
    const c1 = clean.toUpperCase().charCodeAt(0) - 65 + 0x1F1E6;
    const c2 = clean.toUpperCase().charCodeAt(1) - 65 + 0x1F1E6;
    return String.fromCodePoint(c1, c2);
  }
  return null;
}

/**
 * Obtiene el emoji visual de la bandera o un fallback adecuado para selects y textos planos.
 */
export function getFlagEmoji(bandera, nombrePais = '') {
  if (!bandera && !nombrePais) return '🇺🇳';
  const str = (bandera || '').trim();
  
  // Si ya es un emoji de bandera válido
  const codePoints = Array.from(str).map(c => c.codePointAt(0));
  if (codePoints.length >= 2 && codePoints[0] >= 0x1F1E6 && codePoints[0] <= 0x1F1FF) {
    return str;
  }
  
  const iso = normalizarBandera(bandera, nombrePais);
  if (iso) {
    const emoji = isoToEmoji(iso);
    if (emoji) return emoji;
  }
  return '🌐';
}


