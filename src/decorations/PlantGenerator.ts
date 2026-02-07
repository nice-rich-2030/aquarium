import * as THREE from 'three';
import { PlantParams, DEFAULT_PLANT_PARAMS } from '../types/decorations';
import { randomRange } from '../utils/math';

/**
 * 水草のプロシージャルジェネレーター
 */
export class PlantGenerator {
  /**
   * 水草のメッシュを生成
   */
  public static generate(params: Partial<PlantParams> = {}): THREE.Group {
    const config = { ...DEFAULT_PLANT_PARAMS, ...params };
    const group = new THREE.Group();
    group.name = 'plant';

    // 複数の茎を生成
    for (let i = 0; i < config.stemCount; i++) {
      const stem = this.generateStem(config, i);
      group.add(stem);
    }

    // 揺れアニメーション用のユーザーデータを設定
    group.userData = {
      swaySpeed: config.swaySpeed,
      swayAmount: config.swayAmount,
      phase: Math.random() * Math.PI * 2,
    };

    return group;
  }

  /**
   * 茎を生成
   */
  private static generateStem(config: PlantParams, index: number): THREE.Group {
    const stemGroup = new THREE.Group();
    const height = randomRange(config.stemHeight.min, config.stemHeight.max);
    const segments = 8;

    // 茎のカーブを生成
    const curve = this.generateStemCurve(height, config.stemCurve, index);

    // 茎のジオメトリ
    const stemGeometry = new THREE.TubeGeometry(curve, segments, 0.1, 6, false);

    // 茎のマテリアル
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.7,
      metalness: 0.0,
    });

    const stemMesh = new THREE.Mesh(stemGeometry, stemMaterial);
    stemMesh.name = 'stem';
    stemGroup.add(stemMesh);

    // 葉を追加
    const leaves = this.generateLeaves(curve, config, height);
    stemGroup.add(leaves);

    // 茎をランダムな位置に配置
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
   * 茎のカーブを生成
   */
  private static generateStemCurve(
    height: number,
    curveFactor: number,
    index: number
  ): THREE.CatmullRomCurve3 {
    const points: THREE.Vector3[] = [];
    const segmentCount = 5;

    // 根元
    const angle = index * 0.5;
    const curveX = Math.sin(angle) * curveFactor;
    const curveZ = Math.cos(angle) * curveFactor;

    for (let i = 0; i <= segmentCount; i++) {
      const t = i / segmentCount;
      const x = curveX * t * t;
      const y = height * t;
      const z = curveZ * t * t;
      points.push(new THREE.Vector3(x, y, z));
    }

    return new THREE.CatmullRomCurve3(points);
  }

  /**
   * 葉を生成
   */
  private static generateLeaves(
    curve: THREE.CatmullRomCurve3,
    config: PlantParams,
    _height: number
  ): THREE.Group {
    const leavesGroup = new THREE.Group();
    leavesGroup.name = 'leaves';

    const leafMaterial = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.6,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < config.leafCount; i++) {
      const t = 0.3 + (i / config.leafCount) * 0.6;
      const position = curve.getPointAt(t);

      // 葉の形状
      const leafGeometry = this.createLeafGeometry(config.leafSize);
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);

      leaf.position.copy(position);

      // ランダムな向き
      leaf.rotation.set(
        Math.random() * 0.5 - 0.25,
        Math.random() * Math.PI * 2,
        Math.random() * 0.5
      );

      // 高さに応じた高さ比率を保存（揺れアニメーション用）
      leaf.userData.heightRatio = t;

      leavesGroup.add(leaf);
    }

    return leavesGroup;
  }

  /**
   * 葉のジオメトリを作成
   */
  private static createLeafGeometry(size: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();

    // 葉の形状（楕円的なカーブ）
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(size * 0.3, size * 0.5, 0, size);
    shape.quadraticCurveTo(-size * 0.3, size * 0.5, 0, 0);

    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);

    return geometry;
  }

  /**
   * 水草の揺れを更新
   */
  public static updateSway(plant: THREE.Group, time: number): void {
    const userData = plant.userData;
    if (!userData || userData.swaySpeed === undefined) return;

    const swayAmount = userData.swayAmount;
    const phase = userData.phase;

    plant.traverse((child) => {
      if (child.name === 'leaves' || child.userData.heightRatio !== undefined) {
        const heightRatio = child.userData.heightRatio || 0.5;
        const sway = Math.sin(time * userData.swaySpeed + phase + heightRatio * 2) * swayAmount * heightRatio * heightRatio;

        child.rotation.x = sway;
        child.rotation.z = sway * 0.5;
      }
    });
  }
}
