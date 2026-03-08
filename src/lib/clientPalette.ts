/**
 * Generates a full palette of shades from a hex color and applies
 * them as CSS custom properties on :root for dynamic client branding.
 *
 * Palette shades: 50, 100, 200, 300, 400, 500 (base), 600, 700, 800, 900, 950
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
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export function generatePalette(hex: string): ClientPalette {
  const [h, s] = hexToHSL(hex);

  // Generate shades by varying lightness while keeping hue/saturation
  // Lighter shades get slightly desaturated for a natural feel
  return {
    50:  hslToHex(h, Math.min(s, 100), 97),
    100: hslToHex(h, Math.min(s, 96), 93),
    200: hslToHex(h, Math.min(s, 90), 85),
    300: hslToHex(h, Math.min(s, 85), 74),
    400: hslToHex(h, Math.min(s, 82), 60),
    500: hslToHex(h, s, 48),          // base — vivid
    600: hslToHex(h, s, 40),
    700: hslToHex(h, Math.min(s, 90), 33),
    800: hslToHex(h, Math.min(s, 85), 26),
    900: hslToHex(h, Math.min(s, 80), 20),
    950: hslToHex(h, Math.min(s, 75), 12),
  };
}

/** Apply palette as --client-* CSS custom properties on :root */
export function applyClientPalette(hex: string | null) {
  const root = document.documentElement;

  if (!hex) {
    // Remove all client vars
    const shades = ['50','100','200','300','400','500','600','700','800','900','950'];
    shades.forEach(s => root.style.removeProperty(`--client-${s}`));
    root.style.removeProperty('--client-base');
    return;
  }

  const palette = generatePalette(hex);
  root.style.setProperty('--client-base', hex);

  (Object.entries(palette) as [string, string][]).forEach(([shade, value]) => {
    root.style.setProperty(`--client-${shade}`, value);
  });

  // Set contrast text color for the 500 shade
  root.style.setProperty('--client-500-contrast', contrastText(palette['500']));
}

/** Returns white or dark text color for best contrast on a given hex bg */
export function contrastText(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 0.55 ? '#1a1a1a' : '#ffffff';
}
