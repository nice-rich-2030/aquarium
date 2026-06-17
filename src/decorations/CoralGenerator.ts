import * as THREE from 'three';
import { CoralParams, DEFAULT_CORAL_PARAMS } from '../types/decorations';

/**
 * 珊瑚のプロシージャルジェネレーター
 *
 * 3種類の形状をサポートする:
 *  - branching: 根元から枝分かれする樹状珊瑚（枝先にポリプの瘤）
 *  - table:     短い幹から傘状に広がるテーブルサンゴ（ミドリイシ風）
 *  - brain:     溝模様のある塊状の脳サンゴ（ノウサンゴ／ハマサンゴ風）
 *
 * いずれも鮮やかな色＋わずかな自己発光でアクセントになる。
 */
export class CoralGenerator {
  private static readonly UP = new THREE.Vector3(0, 1, 0);

  public static generate(params: Partial<CoralParams> = {}): THREE.Group {
    const config = { ...DEFAULT_CORAL_PARAMS, ...params };
    const group = new THREE.Group();
    group.name = 'coral';

    const material = this.makeMaterial(config.color);

    switch (config.shape) {
      case 'table':
        this.buildTable(group, material, config);
        break;
      case 'brain':
        this.buildBrain(group, material, config);
        break;
      case 'branching':
      default:
        this.buildBranching(group, material, config);
        break;
    }

    return group;
  }

  /**
   * 珊瑚共通のマテリアル（ざらつき・わずかな自己発光）
   */
  private static makeMaterial(color: string): THREE.MeshStandardMaterial {
    const baseColor = new THREE.Color(color);
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.0,
      emissive: baseColor.clone().multiplyScalar(0.16),
      envMapIntensity: 0.5,
      flatShading: false,
    });
  }

  // ============================================================
  // 樹状珊瑚
  // ============================================================

  private static buildBranching(group: THREE.Group, material: THREE.Material, config: CoralParams): void {
    // 根元から複数の主枝を放射状に
    const trunks = 3;
    for (let i = 0; i < trunks; i++) {
      const ang = (i / trunks) * Math.PI * 2 + Math.random() * 0.6;
      const dir = new THREE.Vector3(Math.cos(ang) * 0.35, 1, Math.sin(ang) * 0.35).normalize();
      this.branch(
        group, material,
        new THREE.Vector3(0, 0, 0), dir,
        config.length, config.thickness, config.branchDepth, config
      );
    }
  }

  /**
   * 1本の枝を作り、先端から再帰的に分岐する
   */
  private static branch(
    parent: THREE.Group,
    material: THREE.Material,
    start: THREE.Vector3,
    dir: THREE.Vector3,
    length: number,
    thickness: number,
    depth: number,
    config: CoralParams
  ): void {
    if (depth <= 0) return;

    const end = start.clone().addScaledVector(dir, length);

    // 先細りの枝。根元をやや太らせて隣接枝と癒着して見せる
    const geo = new THREE.CylinderGeometry(thickness * 0.6, thickness * 1.05, length, 8, 1);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(this.UP, dir.clone().normalize());
    mesh.castShadow = true;
    parent.add(mesh);

    // 枝に沿ってポリプの小瘤を散らす（質感アップ）
    this.addPolyps(parent, material, start, end, thickness);

    if (depth === 1) {
      // 先端の丸い瘤（成長点）
      const tip = new THREE.Mesh(new THREE.SphereGeometry(thickness * 0.95, 8, 6), material);
      tip.position.copy(end);
      tip.castShadow = true;
      parent.add(tip);
      return;
    }

    const children = 2 + Math.floor(Math.random() * 2);
    for (let c = 0; c < children; c++) {
      const newDir = this.bendDirection(dir, config.branchAngle);
      this.branch(parent, material, end, newDir, length * 0.72, thickness * 0.68, depth - 1, config);
    }
  }

  /**
   * 枝に沿って小さなポリプ（瘤）を散らす
   */
  private static addPolyps(
    parent: THREE.Group,
    material: THREE.Material,
    start: THREE.Vector3,
    end: THREE.Vector3,
    thickness: number
  ): void {
    const count = 2 + Math.floor(Math.random() * 2);
    const axis = end.clone().sub(start);
    // 軸に直交する適当なベクトルを得る
    const ortho = Math.abs(axis.y) < 0.9
      ? new THREE.Vector3(0, 1, 0).cross(axis).normalize()
      : new THREE.Vector3(1, 0, 0).cross(axis).normalize();
    for (let i = 0; i < count; i++) {
      const t = 0.2 + Math.random() * 0.7;
      const pos = start.clone().addScaledVector(axis, t);
      const a = Math.random() * Math.PI * 2;
      const off = ortho.clone().applyAxisAngle(axis.clone().normalize(), a).multiplyScalar(thickness * 0.85);
      pos.add(off);
      const bump = new THREE.Mesh(
        new THREE.SphereGeometry(thickness * (0.22 + Math.random() * 0.15), 5, 4),
        material
      );
      bump.position.copy(pos);
      parent.add(bump);
    }
  }

  /**
   * 枝の方向をランダムに傾ける（上向き成分を保って珊瑚らしく立てる）
   */
  private static bendDirection(dir: THREE.Vector3, angle: number): THREE.Vector3 {
    const axis = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();
    const q = new THREE.Quaternion().setFromAxisAngle(axis, angle * (0.6 + Math.random() * 0.8));
    const nd = dir.clone().applyQuaternion(q).normalize();
    nd.y = Math.abs(nd.y) * 0.6 + 0.4; // 上向きを維持
    return nd.normalize();
  }

  // ============================================================
  // テーブルサンゴ（傘状）
  // ============================================================

  private static buildTable(group: THREE.Group, material: THREE.Material, config: CoralParams): void {
    const stalkH = config.length * 1.1;
    const stalkR = config.thickness * 1.3;
    const plateR = config.length * 1.25; // 傘の半径（控えめに）

    // 中央の幹
    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(stalkR * 0.7, stalkR, stalkH, 9),
      material
    );
    stalk.position.y = stalkH * 0.5;
    stalk.castShadow = true;
    group.add(stalk);

    // 天板（傘）: 円盤を中央高くドーム状に持ち上げ、外周を波打たせて自然な縁に
    const plateGeo = new THREE.CylinderGeometry(plateR, plateR * 0.55, config.thickness * 0.8, 26, 1);
    const pos = plateGeo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const r = Math.hypot(v.x, v.z);
      const rn = r / plateR;
      const ang = Math.atan2(v.z, v.x);
      // 上面・下面とも中央を持ち上げてドーム（傘）状にする
      v.y += (1 - rn * rn) * config.length * 0.9;
      const wob = 1 + Math.sin(ang * 6) * 0.08 + Math.sin(ang * 11) * 0.04;
      v.x *= wob;
      v.z *= wob;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    plateGeo.computeVertexNormals();
    const plate = new THREE.Mesh(plateGeo, material);
    plate.position.y = stalkH + config.thickness * 0.3;
    plate.castShadow = true;
    group.add(plate);

    // 天板を支える放射状の細枝（裏側の支柱）
    const struts = 6;
    for (let i = 0; i < struts; i++) {
      const a = (i / struts) * Math.PI * 2 + Math.random() * 0.3;
      const top = new THREE.Vector3(Math.cos(a) * plateR * 0.8, stalkH, Math.sin(a) * plateR * 0.8);
      const bottom = new THREE.Vector3(Math.cos(a) * stalkR, stalkH * 0.4, Math.sin(a) * stalkR);
      const dir = top.clone().sub(bottom);
      const len = dir.length();
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(config.thickness * 0.18, config.thickness * 0.3, len, 5),
        material
      );
      strut.position.copy(bottom).add(top).multiplyScalar(0.5);
      strut.quaternion.setFromUnitVectors(this.UP, dir.normalize());
      group.add(strut);
    }
  }

  // ============================================================
  // 脳サンゴ（塊状・溝模様）
  // ============================================================

  private static buildBrain(group: THREE.Group, material: THREE.Material, config: CoralParams): void {
    const R = config.length * 1.6;
    const geo = new THREE.IcosahedronGeometry(R, 4);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = v.clone().normalize();
      // 球面座標から溝模様（脳のしわ）を作る
      const theta = Math.atan2(n.z, n.x);
      const phi = Math.acos(THREE.MathUtils.clamp(n.y, -1, 1));
      // 蛇行する溝: 複数周波の sin を重ねて迷路状のうねり
      const grooves =
        Math.sin(phi * 9 + Math.sin(theta * 3) * 1.5) * 0.5 +
        Math.sin(theta * 8 + Math.sin(phi * 4) * 1.5) * 0.5;
      const lump = Math.sin(theta * 3.0) * Math.cos(phi * 3.0) * 0.12; // 大きな起伏
      const displace = R * (0.07 * grooves + lump);
      // 底面は平らに（地面に座る塊状）
      const flatten = n.y < -0.2 ? n.y * R * 0.35 : 0;
      v.addScaledVector(n, displace);
      v.y += flatten;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, material);
    mesh.position.y = R * 0.55;
    mesh.scale.y = 0.8; // 横に広い塊に
    mesh.castShadow = true;
    group.add(mesh);
  }
}
