import * as THREE from 'three';
import {
  DecorationDefinition,
  DecorationInstance,
  DecorationPlacementConfig,
  DEFAULT_ROCK_PARAMS,
  DEFAULT_PLANT_PARAMS,
  RockParams,
  PlantParams,
} from '../types/decorations';
import { RockGenerator } from './RockGenerator';
import { PlantGenerator } from './PlantGenerator';

// デフォルトの装飾定義
const DEFAULT_DECORATIONS: DecorationDefinition[] = [
  {
    id: 'rock-large',
    name: '大きな岩',
    category: 'rock',
    generatorType: 'rock',
    params: { ...DEFAULT_ROCK_PARAMS, baseRadius: 5 },
  },
  {
    id: 'rock-medium',
    name: '中くらいの岩',
    category: 'rock',
    generatorType: 'rock',
    params: { ...DEFAULT_ROCK_PARAMS, baseRadius: 3 },
  },
  {
    id: 'rock-small',
    name: '小さな岩',
    category: 'rock',
    generatorType: 'rock',
    params: { ...DEFAULT_ROCK_PARAMS, baseRadius: 1.5 },
  },
  {
    id: 'seagrass',
    name: '海草',
    category: 'plant',
    generatorType: 'plant',
    params: { ...DEFAULT_PLANT_PARAMS },
    animation: { type: 'sway', speed: 1.0, amount: 0.3 },
  },
  {
    id: 'tall-grass',
    name: '背の高い草',
    category: 'plant',
    generatorType: 'plant',
    params: { ...DEFAULT_PLANT_PARAMS, stemHeight: { min: 8, max: 15 }, stemCount: 8 },
    animation: { type: 'sway', speed: 0.8, amount: 0.4 },
  },
  {
    id: 'moss-ball',
    name: 'マリモ',
    category: 'plant',
    generatorType: 'moss',
    params: { ...DEFAULT_PLANT_PARAMS, stemCount: 0 },
  },
];

/**
 * 装飾管理クラス
 */
export class DecorationManager {
  private group: THREE.Group;
  private definitions: Map<string, DecorationDefinition> = new Map();
  private instances: DecorationInstance[] = [];
  private tankBounds: THREE.Box3;
  private nextInstanceId: number = 0;

  constructor(tankBounds: THREE.Box3) {
    this.tankBounds = tankBounds;
    this.group = new THREE.Group();
    this.group.name = 'decorations';

    // デフォルトの装飾定義を読み込み
    this.loadDefaultDefinitions();
  }

  /**
   * デフォルトの装飾定義を読み込み
   */
  private loadDefaultDefinitions(): void {
    for (const def of DEFAULT_DECORATIONS) {
      this.definitions.set(def.id, def);
    }
  }

  /**
   * 装飾定義を追加
   */
  public addDefinition(definition: DecorationDefinition): void {
    this.definitions.set(definition.id, definition);
  }

  /**
   * 装飾を配置
   */
  public place(config: DecorationPlacementConfig): DecorationInstance | null {
    const definition = this.definitions.get(config.definitionId);
    if (!definition) {
      console.warn(`Unknown decoration definition: ${config.definitionId}`);
      return null;
    }

    const instance = this.createInstance(definition, config);
    this.instances.push(instance);
    this.group.add(instance.mesh);

    return instance;
  }

  /**
   * インスタンスを作成
   */
  private createInstance(
    definition: DecorationDefinition,
    config: DecorationPlacementConfig
  ): DecorationInstance {
    let mesh: THREE.Group;

    // ジェネレータータイプに応じてメッシュを生成
    switch (definition.generatorType) {
      case 'rock':
        mesh = RockGenerator.generate(definition.params as RockParams);
        break;
      case 'plant':
        mesh = PlantGenerator.generate(definition.params as PlantParams);
        break;
      case 'moss':
        mesh = this.generateMossBall(definition.params as PlantParams);
        break;
      default:
        mesh = new THREE.Group();
        break;
    }

    const position = new THREE.Vector3(
      config.position.x,
      config.position.y,
      config.position.z
    );

    const rotation = new THREE.Euler(
      config.rotation?.x || 0,
      config.rotation?.y || 0,
      config.rotation?.z || 0
    );

    const scale = config.scale || 1;

    mesh.position.copy(position);
    mesh.rotation.copy(rotation);
    mesh.scale.setScalar(scale);

    const instance: DecorationInstance = {
      id: `decoration_${this.nextInstanceId++}`,
      definitionId: definition.id,
      mesh,
      position,
      rotation,
      scale,
      animation: definition.animation,
    };

    return instance;
  }

  /**
   * マリモを生成
   */
  private generateMossBall(_params: PlantParams): THREE.Group {
    const group = new THREE.Group();
    group.name = 'moss-ball';

    const geometry = new THREE.IcosahedronGeometry(2, 3);
    const material = new THREE.MeshStandardMaterial({
      color: '#1a5c2a',
      roughness: 1.0,
      metalness: 0.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    return group;
  }

  /**
   * 装飾を削除
   */
  public remove(instanceId: string): void {
    const index = this.instances.findIndex((i) => i.id === instanceId);
    if (index === -1) return;

    const instance = this.instances[index];
    this.group.remove(instance.mesh);

    // メッシュを破棄
    instance.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });

    this.instances.splice(index, 1);
  }

  /**
   * 毎フレーム更新
   */
  public update(_delta: number, elapsed: number): void {
    for (const instance of this.instances) {
      if (instance.animation?.type === 'sway') {
        PlantGenerator.updateSway(instance.mesh, elapsed);
      }
    }
  }

  /**
   * デフォルトの装飾を配置
   */
  public placeDefaultDecorations(): void {
    const floorY = this.tankBounds.min.y + 0.5;

    // 岩を配置（大3個、中3個、小3個）
    const rockPlacements = [
      { id: 'rock-large', positions: [{ x: -20, z: -10 }, { x: 15, z: -15 }, { x: -5, z: 18 }] },
      { id: 'rock-medium', positions: [{ x: 25, z: 5 }, { x: -30, z: 8 }, { x: 10, z: -18 }] },
      { id: 'rock-small', positions: [{ x: -10, z: 15 }, { x: 30, z: -8 }, { x: -25, z: -5 }] },
    ];
    for (const rock of rockPlacements) {
      for (const pos of rock.positions) {
        this.place({
          definitionId: rock.id,
          position: { x: pos.x, y: floorY, z: pos.z },
          rotation: { x: 0, y: Math.random() * Math.PI, z: 0 },
        });
      }
    }

    // 水草を配置（15個）
    for (let i = 0; i < 15; i++) {
      this.place({
        definitionId: 'seagrass',
        position: {
          x: -30 + Math.random() * 60,
          y: floorY,
          z: -15 + Math.random() * 30,
        },
        scale: 0.8 + Math.random() * 0.4,
      });
    }

    // 背の高い草を配置（9個）
    for (let i = 0; i < 9; i++) {
      this.place({
        definitionId: 'tall-grass',
        position: {
          x: -35 + Math.random() * 15,
          y: floorY,
          z: -20 + Math.random() * 40,
        },
        scale: 0.7 + Math.random() * 0.3,
      });
    }
  }

  /**
   * 装飾の一覧を取得
   */
  public getDecorationList(): DecorationInstance[] {
    return [...this.instances];
  }

  /**
   * 定義一覧を取得
   */
  public getDefinitions(): DecorationDefinition[] {
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
