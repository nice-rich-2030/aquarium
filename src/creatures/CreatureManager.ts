import * as THREE from 'three';
import {
  CreatureDefinition,
  CreatureInstance,
  CreatureSpawnConfig,
  DEFAULT_BEHAVIOR,
  DEFAULT_ANIMATION,
} from '../types/creatures';
import { FishGenerator } from './FishGenerator';
import { BoidsBehavior } from './BoidsBehavior';
import { randomInBox, randomRange } from '../utils/math';

// デフォルトの生き物定義
const DEFAULT_CREATURES: CreatureDefinition[] = [
  {
    id: 'clownfish',
    name: 'カクレクマノミ',
    category: 'fish',
    size: { min: 1.5, max: 2.5 },
    colors: { primary: '#ff6600', secondary: '#ffffff', pattern: 'stripe', stripeCount: 3 },
    bodyShape: { length: 3, widthCurve: [0.3, 0.8, 0.6, 0.1], heightCurve: [0.3, 0.6, 0.5, 0.1] },
    finShape: { tail: { type: 'fan', size: 0.8 }, dorsal: { x: 0, size: 0.6, angle: 0 }, pectoral: { x: -0.5, size: 0.4, angle: 0.3 } },
    behavior: { ...DEFAULT_BEHAVIOR, maxSpeed: 5, perceptionRadius: 20, cohesionWeight: 0.6 },
    animation: { ...DEFAULT_ANIMATION, swimFrequency: 8, swimAmplitude: 0.2 },
  },
  {
    id: 'neontetra',
    name: 'ネオンテトラ',
    category: 'fish',
    size: { min: 0.8, max: 1.2 },
    colors: { primary: '#0088ff', secondary: '#ff3333', pattern: 'gradient' },
    bodyShape: { length: 2, widthCurve: [0.2, 0.5, 0.4, 0.1], heightCurve: [0.2, 0.4, 0.3, 0.1] },
    finShape: { tail: { type: 'forked', size: 0.5 }, pectoral: { x: -0.4, size: 0.2, angle: 0.2 } },
    behavior: { ...DEFAULT_BEHAVIOR, maxSpeed: 8, perceptionRadius: 15, alignmentWeight: 1.2, cohesionWeight: 1.0 },
    animation: { ...DEFAULT_ANIMATION, swimFrequency: 10, swimAmplitude: 0.15 },
  },
  {
    id: 'angelfish',
    name: 'エンゼルフィッシュ',
    category: 'fish',
    size: { min: 2, max: 3.5 },
    colors: { primary: '#c0c0c0', secondary: '#333333', pattern: 'stripe', stripeCount: 5 },
    bodyShape: { length: 2.5, widthCurve: [0.1, 0.25, 0.2, 0.05], heightCurve: [0.4, 1.2, 1.0, 0.2] },
    finShape: { tail: { type: 'flowing', size: 1.0 }, dorsal: { x: 0.2, size: 1.5, angle: 0.1 }, anal: { x: -0.2, size: 1.2 } },
    behavior: { ...DEFAULT_BEHAVIOR, maxSpeed: 3, turnSpeed: 2, cohesionWeight: 0.3, alignmentWeight: 0.5 },
    animation: { ...DEFAULT_ANIMATION, swimFrequency: 3, swimAmplitude: 0.1 },
  },
  {
    id: 'goldfish',
    name: '金魚',
    category: 'fish',
    size: { min: 2, max: 4 },
    colors: { primary: '#ff8800', secondary: '#ffcc00', pattern: 'gradient' },
    bodyShape: { length: 3, widthCurve: [0.3, 1.0, 0.8, 0.1], heightCurve: [0.3, 0.8, 0.6, 0.1] },
    finShape: { tail: { type: 'double', size: 1.2 }, dorsal: { x: 0.3, size: 0.8, angle: 0 }, pectoral: { x: -0.3, size: 0.5, angle: 0.4 } },
    behavior: { ...DEFAULT_BEHAVIOR, maxSpeed: 4, wanderStrength: 0.8 },
    animation: { ...DEFAULT_ANIMATION, swimFrequency: 4, swimAmplitude: 0.25 },
  },
  {
    id: 'guppy',
    name: 'グッピー',
    category: 'fish',
    size: { min: 0.6, max: 1.0 },
    colors: { primary: '#00ccff', secondary: '#ff00ff', accent: '#ffff00', pattern: 'gradient' },
    bodyShape: { length: 1.5, widthCurve: [0.2, 0.4, 0.3, 0.1], heightCurve: [0.2, 0.35, 0.25, 0.1] },
    finShape: { tail: { type: 'fan', size: 0.8 }, dorsal: { x: 0.1, size: 0.3, angle: 0 } },
    behavior: { ...DEFAULT_BEHAVIOR, maxSpeed: 6, perceptionRadius: 12 },
    animation: { ...DEFAULT_ANIMATION, swimFrequency: 12, swimAmplitude: 0.1 },
  },
];

/**
 * 生き物管理クラス
 */
export class CreatureManager {
  private group: THREE.Group;
  private definitions: Map<string, CreatureDefinition> = new Map();
  private instances: CreatureInstance[] = [];
  private boidsBehavior: BoidsBehavior;
  private tankBounds: THREE.Box3;
  private nextInstanceId: number = 0;

  constructor(tankBounds: THREE.Box3) {
    this.tankBounds = tankBounds;
    this.group = new THREE.Group();
    this.group.name = 'creatures';

    this.boidsBehavior = new BoidsBehavior(tankBounds);

    // デフォルトの生き物定義を読み込み
    this.loadDefaultDefinitions();
  }

  /**
   * デフォルトの生き物定義を読み込み
   */
  private loadDefaultDefinitions(): void {
    for (const def of DEFAULT_CREATURES) {
      this.definitions.set(def.id, def);
    }
  }

  /**
   * 生き物定義を追加
   */
  public addDefinition(definition: CreatureDefinition): void {
    this.definitions.set(definition.id, definition);
  }

  /**
   * 生き物をスポーン
   */
  public spawn(config: CreatureSpawnConfig): CreatureInstance[] {
    const definition = this.definitions.get(config.definitionId);
    if (!definition) {
      console.warn(`Unknown creature definition: ${config.definitionId}`);
      return [];
    }

    const spawnedInstances: CreatureInstance[] = [];
    const spawnArea = config.spawnArea || this.getDefaultSpawnArea();

    for (let i = 0; i < config.count; i++) {
      const instance = this.createInstance(definition, spawnArea);
      this.instances.push(instance);
      this.group.add(instance.mesh);
      spawnedInstances.push(instance);
    }

    return spawnedInstances;
  }

  /**
   * 個体を作成
   */
  private createInstance(
    definition: CreatureDefinition,
    spawnArea: THREE.Box3
  ): CreatureInstance {
    const size = randomRange(definition.size.min, definition.size.max);

    // メッシュを生成
    const mesh = FishGenerator.generate(
      definition.bodyShape,
      definition.finShape,
      definition.colors,
      size
    );

    // 初期位置・速度を設定
    const position = randomInBox(spawnArea);
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 2
    ).normalize().multiplyScalar(definition.behavior.maxSpeed * 0.5);

    const rotation = new THREE.Quaternion();
    const matrix = new THREE.Matrix4();
    matrix.lookAt(new THREE.Vector3(), velocity.clone().normalize(), new THREE.Vector3(0, 1, 0));
    rotation.setFromRotationMatrix(matrix);

    mesh.position.copy(position);
    mesh.quaternion.copy(rotation);

    const instance: CreatureInstance = {
      id: `creature_${this.nextInstanceId++}`,
      definitionId: definition.id,
      mesh,
      position,
      velocity,
      rotation,
      size,
      swimPhase: Math.random() * Math.PI * 2,
      behaviorParams: { ...definition.behavior },
      animationParams: { ...definition.animation },
    };

    return instance;
  }

  /**
   * デフォルトのスポーンエリアを取得
   */
  private getDefaultSpawnArea(): THREE.Box3 {
    const size = this.tankBounds.getSize(new THREE.Vector3());
    const center = this.tankBounds.getCenter(new THREE.Vector3());

    return new THREE.Box3(
      new THREE.Vector3(
        center.x - size.x * 0.4,
        center.y - size.y * 0.3,
        center.z - size.z * 0.4
      ),
      new THREE.Vector3(
        center.x + size.x * 0.4,
        center.y + size.y * 0.3,
        center.z + size.z * 0.4
      )
    );
  }

  /**
   * 生き物を削除
   */
  public remove(definitionId: string): void {
    const toRemove = this.instances.filter(
      (i) => i.definitionId === definitionId
    );

    for (const instance of toRemove) {
      this.group.remove(instance.mesh);
      // メッシュのジオメトリとマテリアルを破棄
      instance.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    }

    this.instances = this.instances.filter(
      (i) => i.definitionId !== definitionId
    );
  }

  /**
   * 毎フレーム更新
   */
  public update(delta: number, elapsed: number): void {
    // Boids行動更新
    this.boidsBehavior.update(this.instances, delta);

    // アニメーション更新
    for (const instance of this.instances) {
      this.updateAnimation(instance, delta, elapsed);
    }
  }

  /**
   * アニメーションを更新
   */
  private updateAnimation(
    instance: CreatureInstance,
    delta: number,
    _elapsed: number
  ): void {
    const params = instance.animationParams;
    instance.swimPhase += delta * params.swimFrequency;

    // 泳ぎのうねり（体の子メッシュを変形）
    const bodyMesh = instance.mesh.getObjectByName('body') as THREE.Mesh;
    if (bodyMesh && bodyMesh.geometry) {
      // 速度に応じた振幅
      const speedRatio = instance.velocity.length() / instance.behaviorParams.maxSpeed;
      const amplitude = params.swimAmplitude * (0.3 + speedRatio * 0.7);

      // 頂点を変形（シンプルな実装）
      const positions = bodyMesh.geometry.attributes.position;
      const originalPositions = (bodyMesh.geometry as any)._originalPositions;

      if (!originalPositions) {
        // オリジナル位置を保存
        (bodyMesh.geometry as any)._originalPositions = positions.array.slice();
      } else {
        const posArray = positions.array as Float32Array;
        for (let i = 0; i < positions.count; i++) {
          const x = originalPositions[i * 3];
          const tailRatio = (x / (instance.size * 3) + 0.5);
          const waveFactor = tailRatio * tailRatio;

          const wave = Math.sin(instance.swimPhase + tailRatio * 3) * amplitude * instance.size;
          posArray[i * 3 + 2] = originalPositions[i * 3 + 2] + wave * waveFactor;
        }
        positions.needsUpdate = true;
      }
    }
  }

  /**
   * 生き物の一覧を取得
   */
  public getCreatureList(): { definitionId: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const instance of this.instances) {
      const current = counts.get(instance.definitionId) || 0;
      counts.set(instance.definitionId, current + 1);
    }

    return Array.from(counts.entries()).map(([definitionId, count]) => ({
      definitionId,
      count,
    }));
  }

  /**
   * 定義一覧を取得
   */
  public getDefinitions(): CreatureDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * グループを取得
   */
  public getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * 破棄
   */
  public dispose(): void {
    for (const instance of this.instances) {
      instance.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    }
    this.instances = [];
  }
}
