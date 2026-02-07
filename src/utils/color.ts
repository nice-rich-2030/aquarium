import * as THREE from 'three';

/**
 * HEX文字列をRGBに変換
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  };
}

/**
 * RGBをHEX文字列に変換
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * HSLをRGBに変換
 */
export function hslToRgb(
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r, g, b };
}

/**
 * 2つの色を補間
 */
export function lerpColor(
  color1: THREE.Color,
  color2: THREE.Color,
  t: number
): THREE.Color {
  return new THREE.Color(
    color1.r + (color2.r - color1.r) * t,
    color1.g + (color2.g - color1.g) * t,
    color1.b + (color2.b - color1.b) * t
  );
}

/**
 * 彩度を調整
 */
export function adjustSaturation(color: THREE.Color, amount: number): THREE.Color {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  hsl.s = Math.max(0, Math.min(1, hsl.s + amount));
  return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
}

/**
 * 明度を調整
 */
export function adjustLightness(color: THREE.Color, amount: number): THREE.Color {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  hsl.l = Math.max(0, Math.min(1, hsl.l + amount));
  return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
}

/**
 * ランダムな色を生成
 */
export function randomColor(): THREE.Color {
  return new THREE.Color(Math.random(), Math.random(), Math.random());
}

/**
 * パレットからランダムな色を選択
 */
export function randomFromPalette(palette: string[]): THREE.Color {
  const hex = palette[Math.floor(Math.random() * palette.length)];
  return new THREE.Color(hex);
}
