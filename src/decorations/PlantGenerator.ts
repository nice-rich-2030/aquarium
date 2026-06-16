import * as THREE from 'three';
import { PlantParams, DEFAULT_PLANT_PARAMS } from '../types/decorations';
import { randomRange } from '../utils/math';

/**
 * 水草のプロシージャルジェネレーター
 *
 * 茎を複数の関節セグメント（stem-seg）のネストで構成し、
 * 各関節をわずかずつ曲げることで「弧を描いてしなる」茎を表現する。
 * 静的な初期しなりに加え、全草で共通の水流場による動的なうねりを与える。
 */
export class PlantGenerator {
  // 水槽全体を流れる共通の水流場（全草で共有して連動させる）
  private static readonly FLOW_SPEED = 1.1;
  private static readonly FLOW_WAVE_NUMBER_X = 0.09;
  private static readonly FLOW_WAVE_NUMBER_Z = -0.06;
  private static readonly SEGMENTS = 6;

  /**
   * 水草のメッシュを生成
   */
  public static generate(params: Partial<PlantParams> = {}): THREE.Group {
    const config = { ...DEFAULT_PLANT_PARAMS, ...params };
    const group = new THREE.Group();
    group.name = 'plant';

    for (let i = 0; i < config.stemCount; i++) {
      group.add(this.generateStem(config, i));
    }

    group.userData = {
      swaySpeed: config.swaySpeed,
      swayAmount: config.swayAmount,
      phase: Math.random() * Math.PI * 2,
    };

    return group;
  }

  /**
   * 茎を多関節セグメントで生成
   */
  private static generateStem(config: PlantParams, index: number): THREE.Group {
    const stemGroup = new THREE.Group();
    stemGroup.name = 'stem-group';

    const height = randomRange(config.stemHeight.min, config.stemHeight.max);
    const segments = this.SEGMENTS;
    const segLen = height / segments;
    const baseRadius = 0.16;

    const stemColor = new THREE.Color(config.color).multiplyScalar(0.7);
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: stemColor,
      roughness: 0.7,
      metalness: 0.0,
      envMapIntensity: 0.4,
    });
    const leafColor = new THREE.Color(config.color).multiplyScalar(1.15);
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: leafColor,
      roughness: 0.55,
      metalness: 0.0,
      emissive: new THREE.Color(config.color).multiplyScalar(0.15),
      envMapIntensity: 0.5,
      side: THREE.DoubleSide,
    });

    // 株ごとの静的しなり（向きと強さ）
    const bendDir = Math.random() * Math.PI * 2;
    const baseBend = 0.05 + Math.random() * 0.04;

    const leafPerSeg = Math.max(1, Math.round(config.leafCount / segments));

    // ネストした関節を積み上げる（各 seg は親 seg の先端に乗る）
    let parent: THREE.Object3D = stemGroup;
    for (let s = 0; s < segments; s++) {
      const seg = new THREE.Group();
      seg.name = 'stem-seg';
      seg.position.y = s === 0 ? 0 : segLen;
      seg.userData.segIndex = s;
      seg.userData.bendDir = bendDir;
      seg.userData.baseBend = baseBend;

      // このセグメントの茎（根元側を太く、先端側を細く）
      const rBot = THREE.MathUtils.lerp(baseRadius, baseRadius * 0.3, s / segments);
      const rTop = THREE.MathUtils.lerp(baseRadius, baseRadius * 0.3, (s + 1) / segments);
      const cylGeo = new THREE.CylinderGeometry(rTop, rBot, segLen, 6, 1);
      cylGeo.translate(0, segLen / 2, 0);
      const cyl = new THREE.Mesh(cylGeo, stemMaterial);
      cyl.name = 'stem';
      cyl.castShadow = true;
      seg.add(cyl);

      // 葉（根元セグメントを除いて分散配置）
      if (s >= 1) {
        for (let l = 0; l < leafPerSeg; l++) {
          const leafGeo = this.createLeafGeometry(config.leafSize);
          const leaf = new THREE.Mesh(leafGeo, leafMaterial);
          leaf.position.y = ((l + 0.5) / leafPerSeg) * segLen;
          const rx = Math.random() * 0.4 - 0.2;
          const rz = Math.random() * 0.5 - 0.25;
          leaf.rotation.set(rx, Math.random() * Math.PI * 2, rz);
          leaf.userData.heightRatio = (s + (l + 0.5) / leafPerSeg) / segments;
          leaf.userData.baseRot = { x: rx, z: rz };
          leaf.castShadow = true;
          seg.add(leaf);
        }
      }

      parent.add(seg);
      parent = seg;
    }

    // 株を中心付近のランダムな位置に
    const radius = 1;
    const angle = (index / config.stemCount) * Math.PI * 2 + Math.random() * 0.5;
    stemGroup.position.set(
      Math.cos(angle) * radius * Math.random(),
      0,
      Math.sin(angle) * radius * Math.random()
    );

    return stemGroup;
  }

  /**
   * 葉のジオメトリを作成（楕円的なカーブ）
   */
  private static createLeafGeometry(size: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(size * 0.3, size * 0.5, 0, size);
    shape.quadraticCurveTo(-size * 0.3, size * 0.5, 0, 0);
    return new THREE.ShapeGeometry(shape);
  }

  /**
   * 水草の揺れを更新（全草共通の水流場で連動）
   */
  public static updateSway(plant: THREE.Group, time: number): void {
    const userData = plant.userData;
    if (!userData || userData.swayAmount === undefined) return;

    const swayAmount = userData.swayAmount;

    // 位置に応じた空間位相 → 隣接する草ほど連動して揺れる進行波
    const spatialPhase =
      plant.position.x * this.FLOW_WAVE_NUMBER_X +
      plant.position.z * this.FLOW_WAVE_NUMBER_Z;
    const flowBase = time * this.FLOW_SPEED + spatialPhase;
    const jitter = (userData.phase || 0) * 0.1;

    plant.traverse((child) => {
      if (child.name === 'stem-seg') {
        const s = child.userData.segIndex || 0;
        const baseBend = child.userData.baseBend || 0.05;
        const dir = child.userData.bendDir || 0;

        // セグメントごとの位相遅延で、うねりが茎を上方へ伝播する
        // （動的成分は控えめに。静的な弧 baseBend で曲がりは保つ）
        const flow = flowBase + s * 0.4 + jitter;
        const dyn = Math.sin(flow) * swayAmount * 0.05;
        const bend = baseBend + dyn;

        // 各関節をしなり方向へ曲げる（累積して弧になる）
        child.rotation.z = Math.cos(dir) * bend;
        child.rotation.x = Math.sin(dir) * bend;
        return;
      }

      if (child.userData.heightRatio !== undefined) {
        const hr = child.userData.heightRatio;
        const base = child.userData.baseRot || { x: 0, z: 0 };
        const sway = Math.sin(flowBase + hr * 1.5) * swayAmount * 0.18 * hr;
        child.rotation.x = base.x + sway;
        child.rotation.z = base.z + sway * 0.5;
      }
    });
  }
}
