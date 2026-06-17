import * as THREE from 'three';
import {
  DecorationDefinition,
  DecorationInstance,
  DecorationPlacementConfig,
  DEFAULT_ROCK_PARAMS,
  DEFAULT_PLANT_PARAMS,
  DEFAULT_WATERWHEEL_PARAMS,
  DEFAULT_TURTLE_PARAMS,
  DEFAULT_RAY_PARAMS,
  DEFAULT_CORAL_PARAMS,
  RockParams,
  PlantParams,
  WaterWheelParams,
  CreatureModelParams,
  CoralParams,
} from '../types/decorations';
import { RockGenerator } from './RockGenerator';
import { PlantGenerator } from './PlantGenerator';
import { WaterWheelGenerator } from './WaterWheelGenerator';
import { TurtleGenerator } from './TurtleGenerator';
import { RayGenerator } from './RayGenerator';
import { CoralGenerator } from './CoralGenerator';

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
    params: {
      ...DEFAULT_PLANT_PARAMS,
      stemHeight: { min: 9, max: 16 },
      stemCount: 6,
      leafCount: 10,
      swaySpeed: 1.3,
      swayAmount: 0.55,
    },
    animation: { type: 'sway', speed: 1.3, amount: 0.55 },
  },
  {
    id: 'tall-grass',
    name: '背の高い草',
    category: 'plant',
    generatorType: 'plant',
    params: {
      ...DEFAULT_PLANT_PARAMS,
      stemHeight: { min: 21, max: 36 },
      stemCount: 12,
      leafCount: 12,
      leafSize: 1.8,
      swaySpeed: 1.0,
      swayAmount: 0.75,
    },
    animation: { type: 'sway', speed: 1.0, amount: 0.75 },
  },
  {
    id: 'moss-ball',
    name: 'マリモ',
    category: 'plant',
    generatorType: 'moss',
    params: { ...DEFAULT_PLANT_PARAMS, stemCount: 0 },
  },
  {
    id: 'waterwheel',
    name: '水車',
    category: 'other',
    generatorType: 'waterwheel',
    params: { ...DEFAULT_WATERWHEEL_PARAMS },
    animation: { type: 'rotate', speed: 0.4 },
  },
  {
    id: 'sea-turtle',
    name: 'ウミガメ',
    category: 'other',
    generatorType: 'turtle',
    params: { ...DEFAULT_TURTLE_PARAMS },
    animation: { type: 'turtle', speed: 1.0 },
  },
  {
    id: 'stingray',
    name: 'エイ',
    category: 'other',
    generatorType: 'ray',
    params: { ...DEFAULT_RAY_PARAMS },
    animation: { type: 'ray', speed: 1.0 },
  },
  // 珊瑚（色のアクセント・4色）
  {
    id: 'coral-pink', name: '珊瑚（桃）', category: 'coral', generatorType: 'coral',
    params: { ...DEFAULT_CORAL_PARAMS, color: '#ff6b9d', branchDepth: 3, length: 2.0, thickness: 0.4 },
  },
  {
    id: 'coral-orange', name: '珊瑚（橙）', category: 'coral', generatorType: 'coral',
    params: { ...DEFAULT_CORAL_PARAMS, color: '#ff9d4d', branchDepth: 3, length: 2.0, thickness: 0.4 },
  },
  {
    id: 'coral-purple', name: '珊瑚（紫）', category: 'coral', generatorType: 'coral',
    params: { ...DEFAULT_CORAL_PARAMS, color: '#b06bff', branchDepth: 3, length: 2.0, thickness: 0.4 },
  },
  {
    id: 'coral-yellow', name: '珊瑚（黄）', category: 'coral', generatorType: 'coral',
    params: { ...DEFAULT_CORAL_PARAMS, color: '#ffd24d', branchDepth: 3, length: 2.0, thickness: 0.4 },
  },
  // テーブルサンゴ（傘状に広がるミドリイシ風）
  {
    id: 'coral-table-orange', name: 'テーブル珊瑚（橙）', category: 'coral', generatorType: 'coral',
    params: { ...DEFAULT_CORAL_PARAMS, shape: 'table', color: '#ffae5c', length: 1.7, thickness: 0.4 },
  },
  {
    id: 'coral-table-purple', name: 'テーブル珊瑚（紫）', category: 'coral', generatorType: 'coral',
    params: { ...DEFAULT_CORAL_PARAMS, shape: 'table', color: '#a987ff', length: 1.7, thickness: 0.4 },
  },
  // 脳サンゴ（塊状・溝模様のハマサンゴ／ノウサンゴ風）
  {
    id: 'coral-brain-pink', name: '脳珊瑚（桃）', category: 'coral', generatorType: 'coral',
    params: { ...DEFAULT_CORAL_PARAMS, shape: 'brain', color: '#ff8fab', thickness: 0.5 },
  },
  {
    id: 'coral-brain-green', name: '脳珊瑚（緑）', category: 'coral', generatorType: 'coral',
    params: { ...DEFAULT_CORAL_PARAMS, shape: 'brain', color: '#7fc7a3', thickness: 0.5 },
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
      case 'waterwheel':
        mesh = WaterWheelGenerator.generate(definition.params as WaterWheelParams);
        break;
      case 'turtle':
        mesh = TurtleGenerator.generate(definition.params as CreatureModelParams);
        break;
      case 'ray':
        mesh = RayGenerator.generate(definition.params as CreatureModelParams);
        break;
      case 'coral':
        mesh = CoralGenerator.generate(definition.params as CoralParams);
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

    // 影を落とし、かつ受ける。ただし草や小物は数が多く影の効果が薄いため
    // castShadow を無効化してシャドウマップの描画負荷を抑える。
    // 明示指定（config.castShadow）があればそれを優先する。
    const isPlant = definition.generatorType === 'plant';
    const castShadow = config.castShadow ?? !isPlant;
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = castShadow;
        child.receiveShadow = true;
      }
    });

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
      const type = instance.animation?.type;
      if (type === 'sway') {
        PlantGenerator.updateSway(instance.mesh, elapsed);
      } else if (type === 'rotate') {
        // 車輪部分（name='wheel'）のみを回転させる
        const wheel = instance.mesh.getObjectByName('wheel');
        if (wheel) {
          wheel.rotation.z = elapsed * (instance.animation!.speed ?? 1.0);
        }
      } else if (type === 'turtle') {
        this.animateDrift(instance, elapsed);
        TurtleGenerator.updateSwim(instance.mesh, elapsed);
      } else if (type === 'ray') {
        this.animateDrift(instance, elapsed);
        RayGenerator.updateSwim(instance.mesh, elapsed, instance.animation!.speed ?? 1.0);
      }
    }
  }

  /**
   * 水中生物のゆったりした浮遊（上下のbobと緩やかな首振り）
   */
  private animateDrift(instance: DecorationInstance, time: number): void {
    const ph = instance.position.x * 0.2 + instance.position.z * 0.13;
    instance.mesh.position.y = instance.position.y + Math.sin(time * 0.5 + ph) * 1.5;
    instance.mesh.rotation.y = instance.rotation.y + Math.sin(time * 0.18 + ph) * 0.3;
    instance.mesh.rotation.z = instance.rotation.z + Math.sin(time * 0.32 + ph) * 0.08;
  }

  /**
   * デフォルトの装飾を日本庭園のように配置する
   *
   * 非対称・奇数・群植・余白・石組（三尊石）を意識し、
   * ランダム散布ではなく意図的なレイアウトで景を作る。
   */
  public placeDefaultDecorations(): void {
    const floorY = this.tankBounds.min.y + 0.5;

    // --- 石組（三尊石・6群）＋玉石の州浜（合計180個） ---
    const rockGroups = [
      { x: -50, z: -16, s: 1.5 }, { x: 48, z: 24, s: 0.85 }, { x: -80, z: 10, s: 1.0 },
      { x: 80, z: -14, s: 1.1 }, { x: -30, z: -30, s: 0.9 }, { x: 30, z: 30, s: 0.8 },
    ];
    for (const g of rockGroups) {
      this.placeRockGroup(g.x, g.z, g.s, floorY); // 各3石 = 18石
    }

    // 玉石を州浜のように群れで散らす（小石72個）
    const pebbleCenters = [
      { x: -60, z: -24 }, { x: 20, z: -20 }, { x: -18, z: 20 }, { x: 60, z: 10 },
      { x: -92, z: 24 }, { x: 90, z: -8 }, { x: 2, z: -34 }, { x: -44, z: 6 },
      { x: 70, z: 30 },
    ];
    for (const c of pebbleCenters) {
      this.placePebbleCluster(c.x, c.z, 18, floorY); // 9×18 = 162石
    }

    // --- 水車（右奥の点景） ---
    this.place({
      definitionId: 'waterwheel',
      position: { x: 66, y: floorY + 22, z: -32 },
    });

    // --- 草の群植（島状にまとめ、中央手前に砂地の余白を残す） ---
    this.placeGrassCluster(-58, -30, 'tall-grass', 26, 36, floorY); // 主石組の背後（中景の主役）
    this.placeGrassCluster(-42, -26, 'tall-grass', 14, 24, floorY);
    this.placeGrassCluster(-72, 24, 'seagrass', 22, 32, floorY);    // 左手前の州
    this.placeGrassCluster(54, 26, 'seagrass', 18, 26, floorY);     // 右の副石組に寄り添う
    this.placeGrassCluster(78, -8, 'tall-grass', 16, 28, floorY);   // 水車の足元
    this.placeGrassCluster(26, -22, 'seagrass', 16, 26, floorY);    // 中景右の散らし

    // --- 珊瑚礁（色のアクセント・6群・現状の3倍） ---
    const coralCenters = [
      { x: 10, z: -6 }, { x: -32, z: 16 }, { x: -15, z: -26 },
      { x: 56, z: 14 }, { x: -70, z: -6 }, { x: 36, z: 28 },
    ];
    for (const c of coralCenters) {
      this.placeCoralCluster(c.x, c.z, floorY);
    }

    // --- 水中生物（亀2・エイ4） ---
    this.place({
      definitionId: 'sea-turtle',
      position: { x: -28, y: 8, z: 12 },
      rotation: { x: 0, y: 0.6, z: 0 },
      scale: 0.9,
    });
    this.place({
      definitionId: 'sea-turtle',
      position: { x: 42, y: 6, z: -12 },
      rotation: { x: 0, y: -1.8, z: 0 },
      scale: 0.8,
    });
    this.place({
      definitionId: 'stingray',
      position: { x: 36, y: -2, z: 16 },
      rotation: { x: 0, y: -0.5, z: 0 },
      scale: 0.85,
    });
    this.place({
      definitionId: 'stingray',
      position: { x: -54, y: 4, z: -8 },
      rotation: { x: 0, y: 1.2, z: 0 },
      scale: 0.7,
    });
    this.place({
      definitionId: 'stingray',
      position: { x: 64, y: 3, z: 22 },
      rotation: { x: 0, y: -0.9, z: 0 },
      scale: 0.8,
    });
    this.place({
      definitionId: 'stingray',
      position: { x: -18, y: -3, z: -22 },
      rotation: { x: 0, y: 2.2, z: 0 },
      scale: 0.75,
    });
  }

  /**
   * 三尊石（主石・副石・添石）を不等辺三角形に組む
   */
  private placeRockGroup(cx: number, cz: number, scale: number, floorY: number): void {
    this.place({
      definitionId: 'rock-large',
      position: { x: cx, y: floorY, z: cz },
      rotation: { x: 0, y: Math.random() * Math.PI, z: 0 },
      scale,
    });
    this.place({
      definitionId: 'rock-medium',
      position: { x: cx + 7 * scale, y: floorY, z: cz + 9 * scale },
      rotation: { x: 0, y: Math.random() * Math.PI, z: 0 },
      scale: scale * 0.85,
    });
    this.place({
      definitionId: 'rock-small',
      position: { x: cx - 8 * scale, y: floorY, z: cz + 5 * scale },
      rotation: { x: 0, y: Math.random() * Math.PI, z: 0 },
      scale: scale * 0.9,
    });
  }

  /**
   * 草を中心に寄せて島状（群植）に配置する
   */
  private placeGrassCluster(
    cx: number, cz: number, defId: string,
    count: number, spread: number, floorY: number
  ): void {
    const isTall = defId === 'tall-grass';
    for (let i = 0; i < count; i++) {
      // 2つの乱数の平均で中心に密度を寄せる
      const gx = cx + ((Math.random() + Math.random()) / 2 - 0.5) * spread;
      const gz = cz + ((Math.random() + Math.random()) / 2 - 0.5) * spread * 0.7;
      this.place({
        definitionId: defId,
        position: { x: gx, y: floorY, z: gz },
        scale: 0.8 + Math.random() * (isTall ? 0.4 : 0.5),
      });
    }
  }

  /**
   * 珊瑚を小範囲にまとめて礁を作る（色をランダムに混ぜる）
   */
  private placeCoralCluster(cx: number, cz: number, floorY: number): void {
    // 形状（樹状/テーブル/脳）× 4色を混ぜて自然な礁にする
    const ids = [
      'coral-pink', 'coral-orange', 'coral-purple', 'coral-yellow',
      'coral-table-orange', 'coral-table-purple',
      'coral-brain-pink', 'coral-brain-green',
    ];
    const n = 5 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      const id = ids[Math.floor(Math.random() * ids.length)];
      const gx = cx + ((Math.random() + Math.random()) / 2 - 0.5) * 20;
      const gz = cz + ((Math.random() + Math.random()) / 2 - 0.5) * 16;
      this.place({
        definitionId: id,
        position: { x: gx, y: floorY, z: gz },
        rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
        scale: 1.8 + Math.random() * 1.6,
        castShadow: false, // 珊瑚は枝メッシュが多くシャドウ負荷が高いため対象外
      });
    }
  }

  /**
   * 玉石（小石）を州浜のように群れで散らす
   */
  private placePebbleCluster(cx: number, cz: number, count: number, floorY: number): void {
    for (let i = 0; i < count; i++) {
      const gx = cx + ((Math.random() + Math.random()) / 2 - 0.5) * 26;
      const gz = cz + ((Math.random() + Math.random()) / 2 - 0.5) * 20;
      this.place({
        definitionId: 'rock-small',
        position: { x: gx, y: floorY, z: gz },
        rotation: { x: 0, y: Math.random() * Math.PI, z: 0 },
        scale: 0.35 + Math.random() * 0.4,
        castShadow: false, // 小石は影の効果が薄く数が多いためシャドウ対象から外す
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
