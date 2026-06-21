import * as THREE from 'three';
import { CreatureModelParams, DEFAULT_TURTLE_PARAMS } from '../types/decorations';
import { marbleTextures } from '../utils/textures';

/**
 * ギリシャ神殿の遺跡のプロシージャルジェネレーター
 *
 * 階段状の基壇（スタイロベート）の上に、溝彫り（フルート）の石柱を数本。
 * 完全な柱（柱頭付き）・途中で折れた柱・切り株、さらに地面に倒れた円柱
 * （ドラムが転がる）と倒れた梁石で、静謐な廃墟の景を作る。
 */
export class RuinsGenerator {
  public static generate(params: Partial<CreatureModelParams> = {}): THREE.Group {
    const { size } = { ...DEFAULT_TURTLE_PARAMS, ...params };
    const u = size;
    const group = new THREE.Group();
    group.name = 'ruins';

    // 大理石のノイズテクスチャ（淡い色ムラ・脈＋微細な凹凸）
    const { map: marbleMap, bump: marbleBump } = marbleTextures();
    const stoneMat = new THREE.MeshStandardMaterial({
      color: '#d8d2c2', roughness: 0.9, metalness: 0.0,
      envMapIntensity: 0.4, map: marbleMap, bumpMap: marbleBump, bumpScale: 0.06 * u,
    });
    const stoneDarkMat = new THREE.MeshStandardMaterial({
      color: '#bcb6a4', roughness: 0.93, metalness: 0.0,
      envMapIntensity: 0.35, map: marbleMap, bumpMap: marbleBump, bumpScale: 0.06 * u,
    });

    // --- 基壇（階段状の2段） ---
    const stepH = 1.2 * u;
    this.addBox(group, stoneDarkMat, 22 * u, stepH, 14 * u, 0, stepH * 0.5, 0);
    this.addBox(group, stoneMat, 18 * u, stepH, 11 * u, 0, stepH * 1.5, 0);
    const topY = stepH * 2; // 柱が立つ面

    const R = 1.1 * u;
    const fullH = 13 * u;

    // --- 柱（四隅に配置・状態を変える） ---
    // 奥2本は完全、手前右は折れ、手前左は切り株
    this.placeColumn(group, stoneMat, -7 * u, topY, -4 * u, fullH, R, 'full');
    this.placeColumn(group, stoneMat, 7 * u, topY, -4 * u, fullH, R, 'full');
    this.placeColumn(group, stoneMat, 7 * u, topY, 4 * u, 7 * u, R, 'broken');
    this.placeColumn(group, stoneMat, -7 * u, topY, 4 * u, 2.5 * u, R, 'stump');

    // --- 倒れた円柱（ドラムが連なって転がる。基壇の手前の砂上） ---
    this.addFallenColumn(group, stoneMat, -4 * u, R, 9 * u, R, 0.35);

    // --- 倒れた梁石（基壇上の奥に半分落ちる） ---
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(9 * u, 1.6 * u, 2.2 * u),
      stoneDarkMat
    );
    lintel.position.set(-1 * u, topY + 0.8 * u, -5.2 * u);
    lintel.rotation.set(0.06, 0.2, 0.04);
    lintel.castShadow = true;
    lintel.receiveShadow = true;
    group.add(lintel);

    return group;
  }

  /** 直方体ブロックを追加 */
  private static addBox(
    group: THREE.Group, mat: THREE.Material,
    w: number, h: number, d: number, x: number, y: number, z: number
  ): void {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  /** 柱を配置（full=柱頭付き / broken=折れ / stump=切り株） */
  private static placeColumn(
    group: THREE.Group, mat: THREE.Material,
    x: number, baseY: number, z: number,
    height: number, R: number, type: 'full' | 'broken' | 'stump'
  ): void {
    const col = new THREE.Group();
    col.position.set(x, baseY, z);
    // 風化でわずかに傾く
    col.rotation.set((Math.random() - 0.5) * 0.04, Math.random() * Math.PI, (Math.random() - 0.5) * 0.04);

    const shaft = new THREE.Mesh(this.flutedShaft(height, R, R * 0.88), mat);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    col.add(shaft);

    if (type === 'full') {
      // 柱頭（エキヌス＋アバクス）
      const echinus = new THREE.Mesh(
        new THREE.CylinderGeometry(R * 1.35, R * 1.05, R * 0.5, 16), mat
      );
      echinus.position.y = height + R * 0.25;
      echinus.castShadow = true;
      col.add(echinus);

      const abacus = new THREE.Mesh(
        new THREE.BoxGeometry(R * 2.8, R * 0.4, R * 2.8), mat
      );
      abacus.position.y = height + R * 0.7;
      abacus.castShadow = true;
      col.add(abacus);
    }

    group.add(col);
  }

  /**
   * 溝彫り（フルート）の柱身ジオメトリ。
   * 上に向かってわずかに細る（エンタシス）。底はy=0、上へ伸びる。
   */
  private static flutedShaft(
    height: number, rBot: number, rTop: number, flutes: number = 20
  ): THREE.BufferGeometry {
    const NH = 4;
    const ang = flutes * 4;
    const depth = 0.12; // 溝の深さ（半径比）
    const verts: number[] = [];
    const uvs: number[] = [];
    const idx: number[] = [];

    for (let h = 0; h <= NH; h++) {
      const t = h / NH;
      const y = t * height;
      const R = THREE.MathUtils.lerp(rBot, rTop, t);
      for (let a = 0; a <= ang; a++) {
        const th = (a / ang) * Math.PI * 2;
        const groove = depth * R * (0.5 + 0.5 * Math.cos(th * flutes));
        const rr = R - groove;
        verts.push(Math.cos(th) * rr, y, Math.sin(th) * rr);
        uvs.push(a / ang, t * 2.5); // 縦に伸ばして縞・脈を細かく
      }
    }

    const row = ang + 1;
    for (let h = 0; h < NH; h++) {
      for (let a = 0; a < ang; a++) {
        const A = h * row + a;
        const B = A + 1;
        const C = A + row;
        const D = C + 1;
        idx.push(A, C, B, B, C, D);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * 倒れた円柱：ドラム（円筒）が一列に転がる様子。
   */
  private static addFallenColumn(
    group: THREE.Group, mat: THREE.Material,
    x0: number, y: number, z: number, R: number, drumLen: number
  ): void {
    const drums = 5;
    let x = x0;
    for (let i = 0; i < drums; i++) {
      const len = (drumLen + Math.random() * 0.1) * 6;
      const geo = new THREE.CylinderGeometry(R, R, len, 14);
      geo.rotateZ(Math.PI / 2); // x軸方向へ寝かせる
      const drum = new THREE.Mesh(geo, mat);
      drum.position.set(x + len / 2, y, z + (Math.random() - 0.5) * 0.6 * R);
      drum.rotation.x = (Math.random() - 0.5) * 0.3;
      drum.castShadow = true;
      drum.receiveShadow = true;
      group.add(drum);
      x += len + R * 0.25; // わずかに隙間
    }
  }
}
