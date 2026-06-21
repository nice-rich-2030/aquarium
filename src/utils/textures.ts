import * as THREE from 'three';
import { fbm, turbulence } from './noise';

/**
 * ノイズ系のプロシージャルテクスチャ生成。
 *
 * Canvas にフラクタルノイズ（fbm/turbulence）を焼き込み、
 * bumpMap / roughnessMap / map（色ムラ）として材質に貼り、石・木の質感を上げる。
 * 生成コストがあるため種類ごとに一度だけ作って共有する（lazy singleton）。
 */

const SIZE = 256;

/** 値関数(0..1)からグレースケールの CanvasTexture を作る */
function grayTexture(fn: (x: number, y: number) => number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(SIZE, SIZE);
  const data = img.data;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const v = Math.max(0, Math.min(1, fn(x / SIZE, y / SIZE)));
      const g = Math.round(v * 255);
      const i = (y * SIZE + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = g;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

let _stoneMap: THREE.CanvasTexture | null = null;
let _stoneBump: THREE.CanvasTexture | null = null;
let _stoneRough: THREE.CanvasTexture | null = null;
let _marbleMap: THREE.CanvasTexture | null = null;
let _marbleBump: THREE.CanvasTexture | null = null;
let _woodMap: THREE.CanvasTexture | null = null;
let _woodBump: THREE.CanvasTexture | null = null;
let _coralMap: THREE.CanvasTexture | null = null;
let _coralBump: THREE.CanvasTexture | null = null;
let _sandMap: THREE.CanvasTexture | null = null;
let _sandBump: THREE.CanvasTexture | null = null;
let _anemoneMap: THREE.CanvasTexture | null = null;
let _anemoneBump: THREE.CanvasTexture | null = null;
let _whaleMap: THREE.CanvasTexture | null = null;
let _whaleBump: THREE.CanvasTexture | null = null;
let _morayMap: THREE.CanvasTexture | null = null;
let _morayBump: THREE.CanvasTexture | null = null;

/** 岩用：色の濃淡（map）＋ごつごつした凹凸（bump）＋粗さムラ（roughness） */
export function stoneTextures(): {
  map: THREE.CanvasTexture; bump: THREE.CanvasTexture; rough: THREE.CanvasTexture;
} {
  if (!_stoneMap) {
    // 0.45..1.0 の広いレンジで色の濃淡をはっきり付ける（大小2スケールを重ねる）
    _stoneMap = grayTexture((x, y) => {
      const big = fbm(x * 3, y * 3, 4) * 0.5 + 0.5;
      const small = turbulence(x * 12 + 7.1, y * 12 + 2.3, 4);
      return 0.45 + big * 0.45 - small * 0.12;
    });
  }
  if (!_stoneBump) {
    _stoneBump = grayTexture((x, y) => fbm(x * 8, y * 8, 5) * 0.5 + 0.5);
  }
  if (!_stoneRough) {
    // 0.6..1.0 の範囲で粗さを揺らす
    _stoneRough = grayTexture((x, y) => 0.6 + (turbulence(x * 5 + 13.7, y * 5 + 4.2, 4) * 0.4));
  }
  return { map: _stoneMap, bump: _stoneBump, rough: _stoneRough };
}

/** 大理石用：淡い色ムラ＋脈（vein）と微細な凹凸 */
export function marbleTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const vein = (x: number, y: number) => {
    const warp = turbulence(x * 3, y * 3, 4) * 2.0;
    return Math.abs(Math.sin((x * 6.0 + warp) * Math.PI)); // 0:脈 1:地
  };
  if (!_marbleMap) {
    // 0.58..1.0 へレンジを広げ、脈・色ムラの濃淡をはっきりさせる
    _marbleMap = grayTexture((x, y) => {
      const v = vein(x, y);
      const grain = fbm(x * 10, y * 10, 4) * 0.14;
      return 0.58 + v * 0.42 - grain;
    });
  }
  if (!_marbleBump) {
    _marbleBump = grayTexture((x, y) => {
      const v = vein(x, y);
      return 0.5 + (1.0 - v) * 0.5 + (fbm(x * 14, y * 14, 3) * 0.15);
    });
  }
  return { map: _marbleMap, bump: _marbleBump };
}

/** 木材用：木目（grain）の色ムラと凹凸 */
export function woodTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const grain = (x: number, y: number) => {
    const warp = fbm(x * 3, y * 3, 3) * 1.2;
    const lines = 0.5 + 0.5 * Math.sin((y * 26.0 + warp * 6.0));
    const fiber = fbm(x * 40, y * 6, 3) * 0.2;
    return lines * 0.7 + fiber + 0.1;
  };
  if (!_woodMap) {
    // 0.45..1.0 へ広げて木目の濃淡をはっきりさせる
    _woodMap = grayTexture((x, y) => 0.45 + grain(x, y) * 0.55);
  }
  if (!_woodBump) {
    _woodBump = grayTexture((x, y) => grain(x, y));
  }
  return { map: _woodMap, bump: _woodBump };
}

/** 珊瑚用：多孔質のぶつぶつした凹凸＋色の濃淡 */
export function coralTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  // ポリプ状の細かい斑点（高周波の turbulence を鋭く）
  const pore = (x: number, y: number) => {
    const t = turbulence(x * 22, y * 22, 4);
    return Math.pow(Math.min(1, t * 1.4), 1.6); // 0..1 のぶつぶつ
  };
  if (!_coralMap) {
    // 0.5..1.0：大きな色ムラ＋ポリプの斑点でメリハリ
    _coralMap = grayTexture((x, y) => {
      const big = fbm(x * 4, y * 4, 4) * 0.5 + 0.5;
      return 0.5 + big * 0.5 - pore(x, y) * 0.25;
    });
  }
  if (!_coralBump) {
    _coralBump = grayTexture((x, y) => 0.4 + pore(x, y) * 0.6);
  }
  return { map: _coralMap, bump: _coralBump };
}

/** 砂地用：細かい粒状の凹凸＋ゆるい明暗ムラ（タイル前提で高周波） */
export function sandTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  if (!_sandMap) {
    // ゆるい明暗のムラ＋細かな粒のきらめき
    _sandMap = grayTexture((x, y) => {
      const patch = fbm(x * 5, y * 5, 3) * 0.5 + 0.5;
      const grain = turbulence(x * 60 + 3.3, y * 60 + 9.1, 2);
      return 0.7 + patch * 0.3 - grain * 0.12;
    });
  }
  if (!_sandBump) {
    // 細かい砂粒の凹凸（高周波）
    _sandBump = grayTexture((x, y) => turbulence(x * 70, y * 70, 3));
  }
  return { map: _sandMap, bump: _sandBump };
}

/**
 * イソギンチャク用：触手に沿った縞（バンド）＋斑点。
 * 薄い触手では bump が見えにくいので、色マップ(map)で視認できる模様を付ける。
 * （触手UVは v が長手方向、u が周方向）
 */
export function anemoneTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const band = (y: number) => 0.5 + 0.5 * Math.sin(y * Math.PI * 3.0); // 長手方向の縞
  if (!_anemoneMap) {
    // 0.72..1.0：縞の色の濃淡は緩やかに（きつくならないよう振幅を抑える）
    _anemoneMap = grayTexture((x, y) => {
      const speck = turbulence(x * 16, y * 16, 3) * 0.08;
      return 0.72 + band(y) * 0.28 - speck;
    });
  }
  if (!_anemoneBump) {
    _anemoneBump = grayTexture((x, y) => 0.35 + band(y) * 0.5 + fbm(x * 18, y * 18, 3) * 0.15);
  }
  return { map: _anemoneMap, bump: _anemoneBump };
}

/** クジラ用：まだら肌（大きな斑＋フジツボ状の斑点）と皮膚のしわ凹凸 */
export function whaleTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const mottle = (x: number, y: number) => fbm(x * 4, y * 4, 4) * 0.5 + 0.5;
  const speck = (x: number, y: number) => Math.pow(turbulence(x * 18 + 5.1, y * 18 + 2.7, 3), 1.5);
  if (!_whaleMap) {
    // 0.55..1.0：頂点カラー(背暗/腹明)に乗算する、まだらの色ムラ
    _whaleMap = grayTexture((x, y) => 0.62 + mottle(x, y) * 0.38 - speck(x, y) * 0.22);
  }
  if (!_whaleBump) {
    _whaleBump = grayTexture((x, y) => 0.45 + mottle(x, y) * 0.35 + speck(x, y) * 0.2);
  }
  return { map: _whaleMap, bump: _whaleBump };
}

/** ウツボ用：丸い暗斑のマダラ模様（豹紋）と、ゆるい凹凸 */
export function morayTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  // 低周波 fbm を smoothstep で丸い斑にする（線状にならないように）
  const blotch = (x: number, y: number) => {
    const n = fbm(x * 3.4 + 1.2, y * 3.4 + 0.4, 4) * 0.5 + 0.5; // 0..1 の大きな斑
    const e = Math.min(1, Math.max(0, (n - 0.54) / 0.13));
    return e * e * (3 - 2 * e); // smoothstep で縁を丸く
  };
  if (!_morayMap) {
    _morayMap = grayTexture((x, y) => {
      const fine = fbm(x * 9, y * 9, 3) * 0.06;
      return 0.92 - blotch(x, y) * 0.62 - fine;
    });
  }
  if (!_morayBump) {
    _morayBump = grayTexture((x, y) => 0.5 + blotch(x, y) * 0.4);
  }
  return { map: _morayMap, bump: _morayBump };
}
