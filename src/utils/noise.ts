/**
 * シンプルなパーリンノイズ実装
 */

// 順列テーブル
const permutation: number[] = [];
const p: number[] = [];

// 初期化
function initPermutation(): void {
  if (permutation.length > 0) return;

  for (let i = 0; i < 256; i++) {
    permutation[i] = i;
  }

  // シャッフル
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
  }

  // 2倍に拡張
  for (let i = 0; i < 512; i++) {
    p[i] = permutation[i & 255];
  }
}

initPermutation();

/**
 * フェード関数（5次補間）
 */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * 線形補間
 */
function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/**
 * 2Dグラデーション
 */
function grad2D(hash: number, x: number, y: number): number {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/**
 * 3Dグラデーション
 */
function grad3D(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/**
 * 2Dパーリンノイズ
 */
export function perlin2D(x: number, y: number): number {
  // 整数部分と小数部分
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  // フェード
  const u = fade(xf);
  const v = fade(yf);

  // ハッシュ
  const aa = p[p[xi] + yi];
  const ab = p[p[xi] + yi + 1];
  const ba = p[p[xi + 1] + yi];
  const bb = p[p[xi + 1] + yi + 1];

  // グラデーション補間
  const x1 = lerp(grad2D(aa, xf, yf), grad2D(ba, xf - 1, yf), u);
  const x2 = lerp(grad2D(ab, xf, yf - 1), grad2D(bb, xf - 1, yf - 1), u);

  return lerp(x1, x2, v);
}

/**
 * 3Dパーリンノイズ
 */
export function perlin3D(x: number, y: number, z: number): number {
  // 整数部分と小数部分
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const zi = Math.floor(z) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const zf = z - Math.floor(z);

  // フェード
  const u = fade(xf);
  const v = fade(yf);
  const w = fade(zf);

  // ハッシュ
  const aaa = p[p[p[xi] + yi] + zi];
  const aba = p[p[p[xi] + yi + 1] + zi];
  const aab = p[p[p[xi] + yi] + zi + 1];
  const abb = p[p[p[xi] + yi + 1] + zi + 1];
  const baa = p[p[p[xi + 1] + yi] + zi];
  const bba = p[p[p[xi + 1] + yi + 1] + zi];
  const bab = p[p[p[xi + 1] + yi] + zi + 1];
  const bbb = p[p[p[xi + 1] + yi + 1] + zi + 1];

  // グラデーション補間
  const x1 = lerp(grad3D(aaa, xf, yf, zf), grad3D(baa, xf - 1, yf, zf), u);
  const x2 = lerp(grad3D(aba, xf, yf - 1, zf), grad3D(bba, xf - 1, yf - 1, zf), u);
  const y1 = lerp(x1, x2, v);

  const x3 = lerp(grad3D(aab, xf, yf, zf - 1), grad3D(bab, xf - 1, yf, zf - 1), u);
  const x4 = lerp(grad3D(abb, xf, yf - 1, zf - 1), grad3D(bbb, xf - 1, yf - 1, zf - 1), u);
  const y2 = lerp(x3, x4, v);

  return lerp(y1, y2, w);
}

/**
 * フラクタルブラウン運動（複数オクターブのノイズ）
 */
export function fbm(x: number, y: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * perlin2D(x * frequency, y * frequency);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

/**
 * 3D FBM
 */
export function fbm3D(x: number, y: number, z: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * perlin3D(x * frequency, y * frequency, z * frequency);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

/**
 * タービュランスノイズ（絶対値を使用）
 */
export function turbulence(x: number, y: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * Math.abs(perlin2D(x * frequency, y * frequency));
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}
