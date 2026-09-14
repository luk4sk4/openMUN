import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');

// 1. Create a pristine square SVG for favicon/app icon with an elegant brand background
const squareSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <linearGradient id="lightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#e2e8f0" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#3b82f6" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Background rounded squircle (super crisp on Google search results & mobile home screens) -->
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bgGrad)" stroke="rgba(255,255,255,0.12)" stroke-width="6" />

  <!-- Inner subtle ambient glow -->
  <circle cx="256" cy="240" r="180" fill="#2563eb" opacity="0.18" filter="blur(30px)" />

  <!-- Scaled & Centered Temple Emblem -->
  <g transform="translate(256, 252) scale(0.56) translate(-400, -250)" filter="url(#glow)">
    <!-- Base Steps -->
    <g fill="url(#lightGrad)">
      <rect x="80" y="500" width="640" height="20" rx="4" />
      <rect x="100" y="480" width="600" height="20" rx="4" />
      <rect x="120" y="460" width="560" height="20" rx="4" />
    </g>

    <!-- Architrave -->
    <rect x="120" y="180" width="560" height="40" fill="url(#lightGrad)" rx="2" />
    <rect x="120" y="195" width="560" height="6" fill="url(#goldGrad)" />

    <!-- Roof / Pediment with MUN Letters in Tympanum -->
    <g id="techo">
      <g fill="url(#lightGrad)">
        <path d="M 160,180 L 160,148 L 260,94 L 260,180 Z M 185,165 L 235,165 L 235,110 L 185,137 Z" />
        <path d="M 280,180 L 280,84 L 380,30 L 380,120 L 310,120 L 310,180 Z M 310,100 L 350,100 L 350,55 L 310,75 Z" />
        <path d="M 420,180 L 420,30 L 520,84 L 520,104 L 450,66 L 450,110 L 500,110 L 500,130 L 450,130 L 450,160 L 520,160 L 520,180 Z" />
        <path d="M 540,180 L 540,94 L 570,110 L 610,165 L 610,132 L 640,148 L 640,180 L 610,180 L 570,125 L 570,180 Z" />
      </g>

      <polygon points="60,180 400,-5 740,180 700,180 400,10 100,180" fill="url(#goldGrad)" />
      <path d="M 400,-25 L 415,-5 L 385,-5 Z" fill="url(#goldGrad)" />
      <path d="M 60,180 L 50,160 L 70,180 Z" fill="url(#goldGrad)" />
      <path d="M 740,180 L 750,160 L 730,180 Z" fill="url(#goldGrad)" />
    </g>

    <!-- Columns M-U-N -->
    <g fill="url(#lightGrad)">
      <path d="M 150,460 L 150,220 L 195,220 L 235,350 L 275,220 L 320,220 L 320,460 L 285,460 L 285,290 L 245,410 L 225,410 L 185,290 L 185,460 Z" />
      <path d="M 360,220 L 395,220 L 395,400 Q 395,425 425,425 Q 455,425 455,400 L 455,200 L 490,220 L 490,400 Q 490,460 425,460 Q 360,460 360,400 Z" />
      <path d="M 530,460 L 530,220 L 565,220 L 615,360 L 615,220 L 650,220 L 650,460 L 615,460 L 565,320 L 565,460 Z" />
    </g>

    <!-- Column Capitals -->
    <g fill="url(#goldGrad)">
      <rect x="145" y="220" width="55" height="10" rx="2" />
      <rect x="270" y="220" width="55" height="10" rx="2" />
      <rect x="355" y="220" width="45" height="10" rx="2" />
      <rect x="450" y="220" width="45" height="10" rx="2" />
      <rect x="525" y="220" width="45" height="10" rx="2" />
      <rect x="610" y="220" width="45" height="10" rx="2" />
    </g>

    <!-- Column Bases -->
    <g fill="url(#goldGrad)">
      <rect x="145" y="450" width="45" height="10" rx="2" />
      <rect x="280" y="450" width="45" height="10" rx="2" />
      <rect x="525" y="450" width="45" height="10" rx="2" />
      <rect x="610" y="450" width="45" height="10" rx="2" />
    </g>
  </g>
</svg>`;

// 2. OpenGraph 1200x630 Social Banner SVG
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <linearGradient id="blueGlow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#818cf8" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />

  <!-- Ambient Glow Orbs -->
  <circle cx="280" cy="315" r="260" fill="#2563eb" opacity="0.22" />
  <circle cx="950" cy="180" r="220" fill="#6366f1" opacity="0.15" />
  
  <!-- Left Side: Temple Icon Card -->
  <g transform="translate(110, 115)">
    <rect width="400" height="400" rx="60" fill="#0f172a" stroke="rgba(255,255,255,0.12)" stroke-width="4" />
    <g transform="translate(200, 200) scale(0.48) translate(-400, -250)">
      <g fill="#ffffff">
        <rect x="80" y="500" width="640" height="20" rx="4" />
        <rect x="100" y="480" width="600" height="20" rx="4" />
        <rect x="120" y="460" width="560" height="20" rx="4" />
      </g>
      <rect x="120" y="180" width="560" height="40" fill="#ffffff" rx="2" />
      <rect x="120" y="195" width="560" height="6" fill="#38bdf8" />
      <g fill="#ffffff">
        <path d="M 160,180 L 160,148 L 260,94 L 260,180 Z M 185,165 L 235,165 L 235,110 L 185,137 Z" />
        <path d="M 280,180 L 280,84 L 380,30 L 380,120 L 310,120 L 310,180 Z M 310,100 L 350,100 L 350,55 L 310,75 Z" />
        <path d="M 420,180 L 420,30 L 520,84 L 520,104 L 450,66 L 450,110 L 500,110 L 500,130 L 450,130 L 450,160 L 520,160 L 520,180 Z" />
        <path d="M 540,180 L 540,94 L 570,110 L 610,165 L 610,132 L 640,148 L 640,180 L 610,180 L 570,125 L 570,180 Z" />
      </g>
      <polygon points="60,180 400,-5 740,180 700,180 400,10 100,180" fill="#38bdf8" />
      <g fill="#ffffff">
        <path d="M 150,460 L 150,220 L 195,220 L 235,350 L 275,220 L 320,220 L 320,460 L 285,460 L 285,290 L 245,410 L 225,410 L 185,290 L 185,460 Z" />
        <path d="M 360,220 L 395,220 L 395,400 Q 395,425 425,425 Q 455,425 455,400 L 455,200 L 490,220 L 490,400 Q 490,460 425,460 Q 360,460 360,400 Z" />
        <path d="M 530,460 L 530,220 L 565,220 L 615,360 L 615,220 L 650,220 L 650,460 L 615,460 L 565,320 L 565,460 Z" />
      </g>
      <g fill="#38bdf8">
        <rect x="145" y="220" width="55" height="10" rx="2" />
        <rect x="270" y="220" width="55" height="10" rx="2" />
        <rect x="355" y="220" width="45" height="10" rx="2" />
        <rect x="450" y="220" width="45" height="10" rx="2" />
        <rect x="525" y="220" width="45" height="10" rx="2" />
        <rect x="610" y="220" width="45" height="10" rx="2" />
        <rect x="145" y="450" width="45" height="10" rx="2" />
        <rect x="280" y="450" width="45" height="10" rx="2" />
        <rect x="525" y="450" width="45" height="10" rx="2" />
        <rect x="610" y="450" width="45" height="10" rx="2" />
      </g>
    </g>
  </g>

  <!-- Right Side: Brand Typography and Taglines -->
  <g transform="translate(560, 175)">
    <!-- Badge -->
    <rect x="0" y="0" width="230" height="36" rx="18" fill="rgba(56, 189, 248, 0.15)" stroke="rgba(56, 189, 248, 0.4)" stroke-width="1.5" />
    <text x="115" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" fill="#38bdf8" text-anchor="middle" letter-spacing="1.5">SOFTWARE LIBRE MUN</text>

    <!-- Title -->
    <text x="0" y="95" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="900" fill="#ffffff" letter-spacing="2">OPEN<tspan fill="#60a5fa">MUN</tspan></text>
    
    <!-- Subtitle -->
    <text x="0" y="145" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700" fill="#94a3b8" letter-spacing="1">Plataforma Web para Modelos de Naciones Unidas</text>

    <!-- Bullets / Pills -->
    <g transform="translate(0, 190)">
      <rect x="0" y="0" width="175" height="38" rx="8" fill="rgba(255,255,255,0.06)" border="1px solid rgba(255,255,255,0.1)" />
      <text x="87" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#f8fafc" text-anchor="middle">⚡ P2P en Tiempo Real</text>

      <rect x="190" y="0" width="165" height="38" rx="8" fill="rgba(255,255,255,0.06)" />
      <text x="272" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#f8fafc" text-anchor="middle">⏱️ GSL &amp; Caucus</text>

      <rect x="370" y="0" width="185" height="38" rx="8" fill="rgba(255,255,255,0.06)" />
      <text x="462" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#f8fafc" text-anchor="middle">📊 Votación &amp; Quórum</text>
    </g>

    <!-- Domain footer -->
    <text x="0" y="285" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#64748b">openmun.app</text>
  </g>
</svg>`;

async function run() {
  console.log('Generating images...');

  // Save updated square favicon.svg
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), squareSvg, 'utf-8');

  const svgBuffer = Buffer.from(squareSvg);

  // Generate Google favicon sizes (multiple of 48px square: 48, 96, 144, 192) + browser icons
  await sharp(svgBuffer).resize(16, 16).png().toFile(path.join(publicDir, 'favicon-16x16.png'));
  await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(svgBuffer).resize(48, 48).png().toFile(path.join(publicDir, 'favicon-48x48.png'));
  await sharp(svgBuffer).resize(96, 96).png().toFile(path.join(publicDir, 'favicon-96x96.png'));
  await sharp(svgBuffer).resize(144, 144).png().toFile(path.join(publicDir, 'favicon-144x144.png'));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'android-chrome-192x192.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'android-chrome-512x512.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'logo.png'));
  await sharp(svgBuffer).resize(48, 48).toFile(path.join(publicDir, 'favicon.ico'));

  // Generate og-image.png for Google Rich Snippets, WhatsApp, Twitter, LinkedIn previews
  const ogBuffer = Buffer.from(ogSvg);
  await sharp(ogBuffer).png().toFile(path.join(publicDir, 'og-image.png'));

  console.log('All logo and favicon assets generated successfully!');
}

run().catch(console.error);
