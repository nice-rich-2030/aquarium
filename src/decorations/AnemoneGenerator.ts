import * as THREE from 'three';
import { CreatureModelParams, DEFAULT_TURTLE_PARAMS } from '../types/decorations';
import { anemoneTextures } from '../utils/textures';

/**
 * イソギンチャクのプロシージャルジェネレーター
 *
 * 柱（体）＋口盤＋多数の触手で構成。触手は1つのメッシュに統合し、
 * 各頂点を「根元からの高さ重み × 触手ごとの位相」で水平変位させて、
 * 草のように柔らかく、かつ触手ごとにばらけた有機的な揺れを再現する。
 *
 * カクレクマノミが寄り添う住処を想定した、ふわふわ揺れる装飾。
 */
export class AnemoneGenerator {
  private static readonly TENTACLES = 46;
  private static readonly NSEG = 6;   // 触手の長手方向の分割
  private static readonly NRAD = 6;   // 触手の断面の分割
  private static readonly SWAY_FREQ = 1.3;

  public static generate(params: Partial<CreatureModelParams> = {}): THREE.Group {
    const { size, color } = { ...DEFAULT_TURTLE_PARAMS, color: '#c25b86', ...params };
    const s = size;
    const group = new THREE.Group();
    group.name = 'anemone';
    group.userData.size = s;

    // --- 柱（体）と口盤 ---
    // 薄い触手では bump が見えにくいので、色マップ（縞）で視認できる模様を付ける
    const { map: anemoneMap, bump: anemoneBump } = anemoneTextures();
    const columnMat = new THREE.MeshStandardMaterial({
      color: '#b06a72', roughness: 0.7, metalness: 0.0, envMapIntensity: 0.35,
      map: anemoneMap, bumpMap: anemoneBump, bumpScale: 0.35,
    });
    const discMat = new THREE.MeshStandardMaterial({
      color: '#7a464f', roughness: 0.7, metalness: 0.0,
      map: anemoneMap, bumpMap: anemoneBump, bumpScale: 0.22,
    });

    // 台は低く・広く。面積をさらに1.5倍（累積で水平×1.5＝面積約2.25倍）にして隠れやすく
    const widen = 1.5;
    const discTopY = 2.0 * s * 0.66;
    const discR = 2.0 * s * widen;

    const columnGeo = new THREE.CylinderGeometry(1.7 * s * widen, 2.5 * s * widen, discTopY, 18);
    const column = new THREE.Mesh(columnGeo, columnMat);
    column.position.y = discTopY * 0.5;
    column.castShadow = true;
    column.receiveShadow = true;
    group.add(column);

    const discGeo = new THREE.CircleGeometry(discR * 0.95, 20);
    discGeo.rotateX(-Math.PI / 2);
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = discTopY + 0.01 * s;
    group.add(disc);

    // 口（中央の小さなくぼみ）
    const mouthGeo = new THREE.SphereGeometry(0.45 * s, 10, 8);
    mouthGeo.scale(1, 0.4, 1);
    const mouth = new THREE.Mesh(mouthGeo, discMat);
    mouth.position.y = discTopY - 0.05 * s;
    group.add(mouth);

    // --- 触手（1メッシュに統合） ---
    const baseColor = new THREE.Color(color);
    const tipColor = baseColor.clone().lerp(new THREE.Color('#ffffff'), 0.55);

    const positions: number[] = [];
    const colors: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const weights: number[] = []; // 揺れの重み（頂点ごと）
    const phases: number[] = [];  // 触手ごとの位相（頂点ごとに複製）
    let vBase = 0;

    const ringVerts = this.NRAD + 1;

    for (let t = 0; t < this.TENTACLES; t++) {
      const a = (t / this.TENTACLES) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      // 口盤上に内外2〜3列で根を散らす
      const rr = (0.35 + Math.random() * 0.62) * discR;
      const rootX = Math.cos(a) * rr;
      const rootZ = Math.sin(a) * rr;
      const outX = Math.cos(a);
      const outZ = Math.sin(a);

      const L = (3.2 + Math.random() * 2.2) * s * 1.5;          // 長さ（1.5倍に）
      const reachMax = (1.1 + Math.random() * 1.0) * s * widen; // 外への張り出し（広げる）
      const r0 = (0.30 + Math.random() * 0.08) * s;     // 根元の太さ
      const phase = a * 1.3 + rr * 0.15 + Math.random() * 0.6;

      for (let k = 0; k <= this.NSEG; k++) {
        const u = k / this.NSEG;
        // 中心線：上へ伸びつつ先で外へ反り、先端はわずかに垂れる
        const reach = reachMax * (u * u);
        const cx = rootX + outX * reach;
        const cz = rootZ + outZ * reach;
        const cy = discTopY + L * u - L * 0.18 * (u * u);
        const r = r0 * (1 - u); // 先端へテーパー（先端は点に収束）

        const w = u * u; // 先端ほど大きく揺れる
        for (let j = 0; j <= this.NRAD; j++) {
          const th = (j / this.NRAD) * Math.PI * 2;
          positions.push(cx + Math.cos(th) * r, cy, cz + Math.sin(th) * r);
          const c = baseColor.clone().lerp(tipColor, u);
          colors.push(c.r, c.g, c.b);
          uvs.push(j / this.NRAD, u * 3.0); // 凹凸テクスチャ用（縦に細かく）
          weights.push(w);
          phases.push(phase);
        }
      }

      // リング間を四角形で接続
      for (let k = 0; k < this.NSEG; k++) {
        for (let j = 0; j < this.NRAD; j++) {
          const aI = vBase + k * ringVerts + j;
          const bI = aI + 1;
          const cI = aI + ringVerts;
          const dI = cI + 1;
          indices.push(aI, cI, bI, bI, cI, dI);
        }
      }
      vBase += (this.NSEG + 1) * ringVerts;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const tentacleMat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.55, metalness: 0.0,
      envMapIntensity: 0.5, side: THREE.DoubleSide,
      // 縞の色マップ（頂点カラーに乗算）＋凹凸で触手の模様を視認可能に
      map: anemoneMap, bumpMap: anemoneBump, bumpScale: 0.16,
    });
    const tentacles = new THREE.Mesh(geo, tentacleMat);
    tentacles.name = 'anemone-tentacles';
    tentacles.castShadow = true;
    tentacles.userData = {
      original: (geo.attributes.position.array as Float32Array).slice(),
      weights: new Float32Array(weights),
      phases: new Float32Array(phases),
    };
    group.add(tentacles);

    return group;
  }

  /**
   * 触手の柔らかい揺れを更新（頂点を水平方向へ進行的に変位）
   */
  public static updateSway(group: THREE.Group, time: number): void {
    const s = (group.userData.size as number) || 1;
    const mesh = group.getObjectByName('anemone-tentacles') as THREE.Mesh | null;
    if (!mesh) return;

    const orig = mesh.userData.original as Float32Array;
    const weights = mesh.userData.weights as Float32Array;
    const phases = mesh.userData.phases as Float32Array;
    const pos = mesh.geometry.attributes.position;
    const arr = pos.array as Float32Array;

    const freq = this.SWAY_FREQ;
    const amp = 0.85 * s; // 先端の揺れ幅

    for (let i = 0; i < pos.count; i++) {
      const w = weights[i];
      const ph = phases[i];
      // x,z で位相をずらし、触手ごとに楕円を描くように揺らす
      const sx = Math.sin(time * freq + ph) * amp * w;
      const sz = Math.cos(time * freq * 0.85 + ph * 1.1) * amp * w;
      arr[i * 3] = orig[i * 3] + sx;
      arr[i * 3 + 2] = orig[i * 3 + 2] + sz;
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }
}
