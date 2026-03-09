/**
 * Generates a full palette of shades from a hex color and applies
 * them as CSS custom properties on :root for dynamic client branding.
 * Automatically adapts to dark mode.
 */

function hexToHSL(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l * 100];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export interface ClientPalette {
  50: string; 100: string; 200: string; 300: string; 400: string;
  500: string; 600: string; 700: string; 800: string; 900: string; 950: string;
}

export function generatePalette(hex: string): ClientPalette {
  const [h, s] = hexToHSL(hex);
  return {
    50:  hslToHex(h, Math.min(s, 100), 97),
    100: hslToHex(h, Math.min(s, 96), 93),
    200: hslToHex(h, Math.min(s, 90), 85),
    300: hslToHex(h, Math.min(s, 85), 74),
    400: hslToHex(h, Math.min(s, 82), 60),
    500: hslToHex(h, s, 48),
    600: hslToHex(h, s, 40),
    700: hslToHex(h, Math.min(s, 90), 33),
    800: hslToHex(h, Math.min(s, 85), 26),
    900: hslToHex(h, Math.min(s, 80), 20),
    950: hslToHex(h, Math.min(s, 75), 12),
  };
}

/** Dark-mode palette: lighter accents, darker backgrounds */
export function generateDarkPalette(hex: string): ClientPalette {
  const [h, s] = hexToHSL(hex);
  return {
    50:  hslToHex(h, Math.min(s, 30), 10),
    100: hslToHex(h, Math.min(s, 35), 15),
    200: hslToHex(h, Math.min(s, 40), 20),
    300: hslToHex(h, Math.min(s, 55), 30),
    400: hslToHex(h, Math.min(s, 70), 45),
    500: hslToHex(h, Math.min(s, 85), 58),
    600: hslToHex(h, Math.min(s, 80), 68),
    700: hslToHex(h, Math.min(s, 75), 78),
    800: hslToHex(h, Math.min(s, 70), 85),
    900: hslToHex(h, Math.min(s, 65), 90),
    950: hslToHex(h, Math.min(s, 60), 95),
  };
}

const SHADES = ['50','100','200','300','400','500','600','700','800','900','950'] as const;

let _currentHex: string | null = null;
let _observer: MutationObserver | null = null;

function isDark() {
  return document.documentElement.classList.contains('dark');
}

function applyVars(hex: string) {
  const root = document.documentElement;
  const palette = isDark() ? generateDarkPalette(hex) : generatePalette(hex);

  root.style.setProperty('--client-base', hex);
  SHADES.forEach(shade => {
    root.style.setProperty(`--client-${shade}`, palette[shade]);
  });
  root.style.setProperty('--client-500-contrast', contrastText(palette['500']));
}

function clearVars() {
  const root = document.documentElement;
  SHADES.forEach(s => root.style.removeProperty(`--client-${s}`));
  root.style.removeProperty('--client-base');
  root.style.removeProperty('--client-500-contrast');
}

/** Apply palette as --client-* CSS custom properties, auto-adapting to dark mode */
export function applyClientPalette(hex: string | null) {
  // Clean up previous observer
  if (_observer) { _observer.disconnect(); _observer = null; }

  if (!hex) {
    _currentHex = null;
    clearVars();
    return;
  }

  _currentHex = hex;
  applyVars(hex);

  // Watch for dark mode class changes and re-apply
  _observer = new MutationObserver(() => {
    if (_currentHex) applyVars(_currentHex);
  });
  _observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

/** Returns white or dark text color for best contrast on a given hex bg */
export function contrastText(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 0.55 ? '#1a1a1a' : '#ffffff';
}
