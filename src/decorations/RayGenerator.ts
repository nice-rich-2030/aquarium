import * as THREE from 'three';
import { CreatureModelParams, DEFAULT_RAY_PARAMS } from '../types/decorations';

/**
 * エイ（マンタ／アカエイ風）のプロシージャルジェネレーター
 *
 * +x を前方、±z を左右の翼、-x を後方の尾とする。
 * 菱形の胸鰭（翼）を背面（暗色）と腹面（白）の2枚のサーフェスで作り、
 * カウンターシェーディングで立体感を出す。翼端が波打って遊泳する。
 */
export class RayGenerator {
  private static readonly NX = 22;
  private static readonly NZ = 26;

  public static generate(params: Partial<CreatureModelParams> = {}): THREE.Group {
    const { size } = { ...DEFAULT_RAY_PARAMS, ...params };
    const group = new THREE.Group();
    group.name = 'ray';

    const L = 7 * size;   // 前後の半長
    const W = 9 * size;   // 翼の半幅
    const T = 1.1 * size; // 厚み

    const topMat = new THREE.MeshStandardMaterial({
      color: '#39495a', roughness: 0.5, metalness: 0.1, envMapIntensity: 0.6, side: THREE.DoubleSide,
    });
    const botMat = new THREE.MeshStandardMaterial({
      color: '#dadfe2', roughness: 0.6, metalness: 0.0, envMapIntensity: 0.4, side: THREE.DoubleSide,
    });

    const topGeo = this.buildSurface(L, W, T, 1);
    const botGeo = this.buildSurface(L, W, T, -1);

    const top = new THREE.Mesh(topGeo, topMat);
    top.name = 'ray-surface';
    top.castShadow = true;
    top.userData.original = (topGeo.attributes.position.array as Float32Array).slice();

    const bot = new THREE.Mesh(botGeo, botMat);
    bot.name = 'ray-surface';
    bot.userData.original = (botGeo.attributes.position.array as Float32Array).slice();

    group.add(top);
    group.add(bot);

    // 目（背面前方の左右）
    const eyeGeo = new THREE.SphereGeometry(L * 0.06, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2, metalness: 0.3 });
    for (const sign of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(L * 0.5, T * 0.55, sign * W * 0.14);
      group.add(eye);
    }

    // 頭部の小さな膨らみ
    const headGeo = new THREE.SphereGeometry(L * 0.22, 12, 10);
    headGeo.scale(1.3, 0.6, 0.9);
    const head = new THREE.Mesh(headGeo, topMat);
    head.position.set(L * 0.55, T * 0.2, 0);
    group.add(head);

    // 尾（後方へ伸びる鞭状。複数セグメントで揺らす）
    group.add(this.buildTail(L, T, size, botMat, topMat));

    return group;
  }

  /**
   * 翼（菱形サーフェス）の頂点を生成
   */
  private static buildSurface(L: number, W: number, T: number, sign: number): THREE.BufferGeometry {
    const nx = this.NX;
    const nz = this.NZ;
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= nx; i++) {
      const xr = (i / nx) * 2 - 1; // -1(後)〜+1(前)
      const x = xr * L;
      // 翼半幅プロファイル（中央最大、前後ですぼまる。前方をやや尖らせる）
      const halfW = W * Math.max(0.0001, Math.pow(1 - Math.abs(xr), 0.85)) * (xr > 0 ? 1.0 : 0.92);

      for (let j = 0; j <= nz; j++) {
        const zr = (j / nz) * 2 - 1; // -1〜1
        const z = zr * halfW;
        // 中央厚く、翼端・前後で薄い断面
        const body = Math.max(0, (1 - zr * zr) * (1 - xr * xr * 0.55));
        const y = sign * T * body * (sign > 0 ? 1.0 : 0.4);
        vertices.push(x, y, z);
      }
    }

    const row = nz + 1;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const a = i * row + j;
        const b = a + 1;
        const c = a + row;
        const d = c + 1;
        if (sign > 0) {
          indices.push(a, c, b, b, c, d);
        } else {
          indices.push(a, b, c, b, d, c);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * 尾（後方へ伸びる先細りの鞭）
   */
  private static buildTail(
    L: number, T: number, size: number,
    _botMat: THREE.Material, topMat: THREE.Material
  ): THREE.Group {
    const tailGroup = new THREE.Group();
    tailGroup.name = 'ray-tail';

    const segments = 5;
    const segLen = L * 0.5;
    let parent: THREE.Object3D = tailGroup;
    for (let s = 0; s < segments; s++) {
      const seg = new THREE.Group();
      seg.name = 'ray-tail-seg';
      seg.position.x = s === 0 ? -L * 0.95 : -segLen;
      seg.userData.segIndex = s;

      const rBot = THREE.MathUtils.lerp(T * 0.35, T * 0.04, s / segments) * size;
      const rTop = THREE.MathUtils.lerp(T * 0.35, T * 0.04, (s + 1) / segments) * size;
      const geo = new THREE.CylinderGeometry(rTop, rBot, segLen, 6);
      geo.rotateZ(Math.PI / 2); // x軸方向に寝かせる
      geo.translate(-segLen / 2, 0, 0);
      const mesh = new THREE.Mesh(geo, topMat);
      mesh.castShadow = true;
      seg.add(mesh);

      parent.add(seg);
      parent = seg;
    }

    return tailGroup;
  }

  /**
   * 遊泳アニメーション（翼の波打ち＋尾の揺れ）を更新
   */
  public static updateSwim(group: THREE.Group, time: number, speed: number, recomputeNormals = true): void {
    const flap = time * speed * 2.2;

    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name === 'ray-surface') {
        const orig = child.userData.original as Float32Array | undefined;
        if (!orig) return;
        const pos = child.geometry.attributes.position;
        const arr = pos.array as Float32Array;
        const W = 9; // 正規化用の概算（翼端ほど大きく波打つ）

        for (let v = 0; v < pos.count; v++) {
          const x = orig[v * 3];
          const z = orig[v * 3 + 2];
          const tipRatio = Math.min(1, Math.abs(z) / (W * 0.9));
          // 翼端が遅れて上下する進行波
          const wave = Math.sin(flap + x * 0.15 - Math.abs(z) * 0.18) * tipRatio * tipRatio * 2.4;
          arr[v * 3 + 1] = orig[v * 3 + 1] + wave;
        }
        pos.needsUpdate = true;
        if (recomputeNormals) child.geometry.computeVertexNormals(); // 法線は間引き可
      } else if (child.name === 'ray-tail-seg') {
        const s = child.userData.segIndex || 0;
        // 尾は先端ほど大きく、位相遅延でしなる
        const amt = 0.12 + s * 0.05;
        child.rotation.y = Math.sin(flap * 0.6 - s * 0.5) * amt;
        child.rotation.z = Math.cos(flap * 0.5 - s * 0.5) * amt * 0.5;
      }
    });
  }
}
