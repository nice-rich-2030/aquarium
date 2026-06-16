import * as THREE from 'three';
import { CoralParams, DEFAULT_CORAL_PARAMS } from '../types/decorations';

/**
 * 珊瑚のプロシージャルジェネレーター
 *
 * 根元から数本の主枝を立て、各枝先から再帰的に枝分かれする
 * 樹状珊瑚を生成する。鮮やかな色＋わずかな自己発光でアクセントになる。
 */
export class CoralGenerator {
  private static readonly UP = new THREE.Vector3(0, 1, 0);

  public static generate(params: Partial<CoralParams> = {}): THREE.Group {
    const config = { ...DEFAULT_CORAL_PARAMS, ...params };
    const group = new THREE.Group();
    group.name = 'coral';

    const baseColor = new THREE.Color(config.color);
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.55,
      metalness: 0.0,
      emissive: baseColor.clone().multiplyScalar(0.18),
      envMapIntensity: 0.6,
    });

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

    return group;
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

    const geo = new THREE.CylinderGeometry(thickness * 0.65, thickness, length, 7);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(this.UP, dir.clone().normalize());
    mesh.castShadow = true;
    parent.add(mesh);

    if (depth === 1) {
      // 先端の丸い瘤
      const tip = new THREE.Mesh(new THREE.SphereGeometry(thickness * 0.85, 7, 6), material);
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
}
