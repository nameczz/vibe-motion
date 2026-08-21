type TickerCardInput = {
  title: string;
  subtitle: string;
  accent: string;
  accent2: string;
  badge: string;
  metric: string;
};

type AlbumArtInput = {
  title: string;
  artist: string;
  accent: string;
  accent2: string;
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const svgToDataUri = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export const createTickerCardDataUri = ({
  title,
  subtitle,
  accent,
  accent2,
  badge,
  metric,
}: TickerCardInput) => {
  const safeTitle = escapeXml(title);
  const safeSubtitle = escapeXml(subtitle);
  const safeBadge = escapeXml(badge);
  const safeMetric = escapeXml(metric);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="${accent2}" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="18%" r="75%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="26" stdDeviation="24" flood-color="#02040a" flood-opacity="0.55" />
        </filter>
      </defs>
      <rect width="800" height="1000" rx="54" fill="#07111c" />
      <rect x="20" y="20" width="760" height="960" rx="44" fill="url(#bg)" filter="url(#shadow)" />
      <rect x="20" y="20" width="760" height="960" rx="44" fill="url(#glow)" />
      <g opacity="0.18">
        <path d="M-40 760 C 120 660, 220 640, 350 700 S 590 860, 860 740" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" />
        <path d="M-30 300 C 150 360, 300 240, 520 280 S 690 400, 860 300" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" />
      </g>
      <g fill="none" opacity="0.18" stroke="#ffffff">
        <circle cx="662" cy="188" r="118" stroke-width="2" />
        <circle cx="662" cy="188" r="72" stroke-width="2" />
        <circle cx="138" cy="816" r="110" stroke-width="2" />
      </g>
      <g fill="#ffffff">
        <text x="58" y="112" font-family="Inter, Arial, sans-serif" font-size="26" letter-spacing="5" opacity="0.76">${safeBadge}</text>
        <text x="58" y="235" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="800">${safeTitle}</text>
        <text x="58" y="292" font-family="Inter, Arial, sans-serif" font-size="30" opacity="0.76">${safeSubtitle}</text>
        <text x="58" y="888" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="84" font-weight="700">${safeMetric}</text>
        <text x="58" y="940" font-family="Inter, Arial, sans-serif" font-size="24" opacity="0.7">synthetic data URI art</text>
      </g>
      <rect x="58" y="352" width="684" height="4" rx="2" fill="#ffffff" opacity="0.24" />
      <rect x="58" y="352" width="260" height="4" rx="2" fill="#ffffff" opacity="0.78" />
      <g transform="translate(58 420)">
        <rect x="0" y="0" width="684" height="300" rx="34" fill="rgba(2,4,10,0.18)" stroke="rgba(255,255,255,0.16)" />
        <path d="M32 248 C 120 196, 174 224, 258 152 S 418 92, 520 136 S 612 170, 652 110" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M32 248 L 58 228 L 92 198 L 124 184 L 160 202 L 196 160 L 230 148 L 258 152 L 296 118 L 336 98 L 378 112 L 414 124 L 454 100 L 488 122 L 524 136 L 566 160 L 612 170 L 652 110" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="2" />
      </g>
    </svg>
  `;

  return svgToDataUri(svg);
};

export const createAlbumArtDataUri = ({
  title,
  artist,
  accent,
  accent2,
}: AlbumArtInput) => {
  const safeTitle = escapeXml(title);
  const safeArtist = escapeXml(artist);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="${accent2}" />
        </linearGradient>
        <radialGradient id="disc" cx="40%" cy="28%" r="80%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.24" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="800" rx="56" fill="url(#bg)" />
      <rect width="800" height="800" rx="56" fill="url(#disc)" />
      <circle cx="400" cy="400" r="186" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="8" />
      <circle cx="400" cy="400" r="132" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="6" />
      <circle cx="400" cy="400" r="78" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="4" />
      <circle cx="400" cy="400" r="32" fill="#0a0f16" opacity="0.92" />
      <g fill="#ffffff">
        <text x="60" y="110" font-family="Inter, Arial, sans-serif" font-size="28" letter-spacing="4" opacity="0.7">SIDE A</text>
        <text x="60" y="206" font-family="Inter, Arial, sans-serif" font-size="66" font-weight="800">${safeTitle}</text>
        <text x="60" y="258" font-family="Inter, Arial, sans-serif" font-size="28" opacity="0.72">${safeArtist}</text>
      </g>
      <g opacity="0.24" fill="none" stroke="#fff">
        <path d="M160 640 C 276 560, 378 566, 500 638 S 650 720, 742 620" stroke-width="10" stroke-linecap="round" />
        <path d="M118 148 C 176 202, 212 218, 276 240" stroke-width="4" stroke-linecap="round" />
      </g>
    </svg>
  `;
  return svgToDataUri(svg);
};
