import * as THREE from 'three';
import { CreatureModelParams, DEFAULT_TURTLE_PARAMS } from '../types/decorations';

/**
 * クラゲのプロシージャルジェネレーター
 *
 * 半透明の傘（ベル）＋口腕＋多数の触手。中層をふわふわ漂い、
 * 傘が脈動（収縮・拡張）し、触手が遅れて揺れる。
 */
export class JellyfishGenerator {
  public static generate(params: Partial<CreatureModelParams> = {}): THREE.Group {
    const { size, color } = { ...DEFAULT_TURTLE_PARAMS, color: '#bfd8f0', ...params };
    const s = size;
    const group = new THREE.Group();
    group.name = 'jellyfish';
    group.userData.glowPhase = Math.random() * 100; // 発光タイミングを個体ごとにずらす

    const bellMat = new THREE.MeshPhysicalMaterial({
      color, transparent: true, opacity: 0.42, roughness: 0.2, metalness: 0.0,
      transmission: 0.7, side: THREE.DoubleSide, emissive: new THREE.Color(color).multiplyScalar(0.4),
      emissiveIntensity: 0.3, depthWrite: false,
    });
    const armMat = new THREE.MeshStandardMaterial({
      color: '#e7b8d6', transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false,
    });
    const tentMat = new THREE.MeshStandardMaterial({
      color: '#d8e6f2', transparent: true, opacity: 0.45, depthWrite: false,
    });

    const R = 3 * s;

    // 傘（脈動するグループ）
    const bell = new THREE.Group();
    bell.name = 'jellyBell';
    const domeGeo = new THREE.SphereGeometry(R, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.55);
    domeGeo.scale(1, 0.85, 1);
    const dome = new THREE.Mesh(domeGeo, bellMat);
    bell.add(dome);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.92, R * 0.07, 8, 24), bellMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = R * 0.05;
    bell.add(rim);
    group.add(bell);

    // 口腕（中央から垂れるフリル）
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const arm = new THREE.Mesh(new THREE.ConeGeometry(0.5 * s, 3.2 * s, 6, 1, true), armMat);
      arm.position.set(Math.cos(a) * 0.5 * s, -1.4 * s, Math.sin(a) * 0.5 * s);
      arm.rotation.x = Math.PI; // 下向き
      group.add(arm);
    }

    // 触手（傘の縁から多数垂れる・揺れるピボット）
    const tentacles = new THREE.Group();
    tentacles.name = 'jellyTentacles';
    const count = 14;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const pivot = new THREE.Group();
      pivot.position.set(Math.cos(a) * R * 0.85, R * 0.02, Math.sin(a) * R * 0.85);
      pivot.userData.phase = i * 0.5;
      const len = (5 + Math.random() * 3) * s;
      const geo = new THREE.CylinderGeometry(0.05 * s, 0.12 * s, len, 5);
      geo.translate(0, -len / 2, 0); // ピボットから下へ
      const strand = new THREE.Mesh(geo, tentMat);
      pivot.add(strand);
      tentacles.add(pivot);
    }
    group.add(tentacles);

    return group;
  }

  /** 傘の脈動＋触手の揺れ＋たまの発光 */
  public static updateSwim(group: THREE.Group, time: number): void {
    const bell = group.getObjectByName('jellyBell');
    if (bell) {
      const p = Math.sin(time * 1.6);
      bell.scale.y = 1 + p * 0.18;
      bell.scale.x = bell.scale.z = 1 - p * 0.1;

      // たまに光る（peak付近だけ強く発光する生物発光）
      const phase = (group.userData.glowPhase as number) || 0;
      const g = Math.max(0, Math.sin(time * 0.5 + phase));
      const glow = 0.25 + Math.pow(g, 8) * 1.9;
      bell.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m && (m as any).emissiveIntensity !== undefined) m.emissiveIntensity = glow;
      });
    }
    const tent = group.getObjectByName('jellyTentacles');
    if (tent) {
      for (const pivot of tent.children) {
        const ph = (pivot.userData.phase as number) || 0;
        pivot.rotation.x = Math.sin(time * 1.6 + ph) * 0.18;
        pivot.rotation.z = Math.cos(time * 1.3 + ph) * 0.18;
      }
    }
  }
}
