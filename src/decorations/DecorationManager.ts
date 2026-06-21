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
import { FeedingManager } from '../creatures';
import { RockGenerator } from './RockGenerator';
import { PlantGenerator } from './PlantGenerator';
import { WaterWheelGenerator } from './WaterWheelGenerator';
import { TurtleGenerator } from './TurtleGenerator';
import { RayGenerator } from './RayGenerator';
import { MorayGenerator } from './MorayGenerator';
import { StarfishGenerator } from './StarfishGenerator';
import { AnemoneGenerator } from './AnemoneGenerator';
import { RuinsGenerator } from './RuinsGenerator';
import { LighthouseGenerator } from './LighthouseGenerator';
import { CoralGenerator } from './CoralGenerator';

// デフォルトの装飾定義
const DEFAULT_DECORATIONS: DecorationDefinition[] = [
  {
    id: 'rock-large',
    name: '大きな岩',
    description: '景の中心となる、どっしりした自然石',
    category: 'rock',
    generatorType: 'rock',
    params: { ...DEFAULT_ROCK_PARAMS, baseRadius: 5 },
  },
  {
    id: 'rock-medium',
    name: '中くらいの岩',
    description: '石組みを支える、ほどよい大きさの石',
    category: 'rock',
    generatorType: 'rock',
    params: { ...DEFAULT_ROCK_PARAMS, baseRadius: 3 },
  },
  {
    id: 'rock-small',
    name: '小さな岩',
    description: '州浜を彩る、ごつごつした玉石',
    category: 'rock',
    generatorType: 'rock',
    params: { ...DEFAULT_ROCK_PARAMS, baseRadius: 1.5 },
  },
  {
    id: 'seagrass',
    name: '海草',
    description: '水流にゆらゆらと揺れる、やわらかな水草',
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
    description: '水中で大きくしなる、背の高い水草',
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
    description: 'まんまるに育つ、緑の藻のかたまり',
    category: 'plant',
    generatorType: 'moss',
    params: { ...DEFAULT_PLANT_PARAMS, stemCount: 0 },
  },
  {
    id: 'waterwheel',
    name: '水車',
    description: 'のんびりと回り続ける、木製の水車',
    category: 'other',
    generatorType: 'waterwheel',
    params: { ...DEFAULT_WATERWHEEL_PARAMS },
    animation: { type: 'rotate', speed: 0.4 },
  },
  {
    id: 'greek-ruins',
    name: 'ギリシャ神殿の遺跡',
    description: '崩れた石柱が静かに佇む古代の遺跡',
    category: 'other',
    generatorType: 'ruins',
    params: { size: 1.0 },
  },
  {
    id: 'lighthouse',
    name: '灯台',
    description: '先端の光がゆっくり回る、海辺の灯台',
    category: 'other',
    generatorType: 'lighthouse',
    params: { size: 1.0 },
    animation: { type: 'lighthouse', speed: 0.6 },
  },
  {
    id: 'sea-turtle',
    name: 'ウミガメ',
    description: 'ひれをゆったり動かして泳ぐ、長寿の海亀',
    category: 'other',
    generatorType: 'turtle',
    params: { ...DEFAULT_TURTLE_PARAMS },
    animation: { type: 'turtle', speed: 1.0 },
  },
  {
    id: 'stingray',
    name: 'エイ',
    description: 'ひれを波打たせ、滑空するように泳ぐ',
    category: 'other',
    generatorType: 'ray',
    params: { ...DEFAULT_RAY_PARAMS },
    animation: { type: 'ray', speed: 1.0 },
  },
  {
    id: 'moray',
    name: 'ウツボ',
    description: '岩陰から顔を出して潜む。口を開閉しながら首を振る',
    category: 'other',
    generatorType: 'moray',
    params: { size: 1.0 },
    animation: { type: 'moray', speed: 1.0 },
  },
  {
    id: 'starfish-orange', name: 'ヒトデ（橙）',
    description: '砂の上をごくゆっくり這い回る五本腕の星形',
    category: 'other', generatorType: 'starfish',
    params: { size: 1.6, color: '#e8643c' },
    animation: { type: 'starfish', speed: 1.0 },
  },
  {
    id: 'starfish-red', name: 'ヒトデ（赤）',
    description: '砂の上をごくゆっくり這い回る五本腕の星形',
    category: 'other', generatorType: 'starfish',
    params: { size: 1.4, color: '#d23b3b' },
    animation: { type: 'starfish', speed: 1.0 },
  },
  {
    id: 'starfish-purple', name: 'ヒトデ（紫）',
    description: '砂の上をごくゆっくり這い回る五本腕の星形',
    category: 'other', generatorType: 'starfish',
    params: { size: 1.5, color: '#9b5bd6' },
    animation: { type: 'starfish', speed: 1.0 },
  },
  {
    id: 'anemone-pink', name: 'イソギンチャク（桃）',
    description: '触手をゆらゆら揺らす。カクレクマノミの住処',
    category: 'other', generatorType: 'anemone',
    params: { size: 1.8, color: '#c25b86' },
    animation: { type: 'anemone', speed: 1.0 },
  },
  {
    id: 'anemone-orange', name: 'イソギンチャク（橙）',
    description: '触手をゆらゆら揺らす。カクレクマノミの住処',
    category: 'other', generatorType: 'anemone',
    params: { size: 1.5, color: '#e08a3c' },
    animation: { type: 'anemone', speed: 1.0 },
  },
  // 珊瑚（色のアクセント・4色）
  {
    id: 'coral-pink', name: '珊瑚（桃）', description: '枝分かれしながら育つ、樹状の造礁サンゴ',
    category: 'coral', generatorType: 'coral',
    params: { ...DEFAULT_CORAL_PARAMS, color: '#ff6b9d', branchDepth: 3, length: 2.0, thickness: 0.4 },
  },
  {
    id: 'coral-orange', name: '珊瑚（橙）', description: '枝分かれしながら育つ、樹状の造礁サンゴ',
    category: 'coral', generatorType: 'coral',
    params: { ...DEFAULT_CORAL_PARAMS, color: '#ff9d4d', branchDepth: 3, length: 2.0, thickness: 0.4 },
  },
  {
    id: 'coral-purple', name: '珊瑚（紫）', description: '枝分かれしながら育つ、樹状の造礁サンゴ',
    category: 'coral', generatorType: 'coral',
    params: { ...DEFAULT_CORAL_PARAMS, color: '#b06bff', branchDepth: 3, length: 2.0, thickness: 0.4 },
  },
  {
    id: 'coral-yellow', name: '珊瑚（黄）', description: '枝分かれしながら育つ、樹状の造礁サンゴ',
    category: 'coral', generatorType: 'coral',
    params: { ...DEFAULT_CORAL_PARAMS, color: '#ffd24d', branchDepth: 3, length: 2.0, thickness: 0.4 },
  },
  // テーブルサンゴ（傘状に広がるミドリイシ風）
  {
    id: 'coral-table-orange', name: 'テーブル珊瑚（橙）', description: '傘のように平たく広がるミドリイシの仲間',
    category: 'coral', generatorType: 'coral',
    params: { ...DEFAULT_CORAL_PARAMS, shape: 'table', color: '#ffae5c', length: 1.7, thickness: 0.4 },
  },
  {
    id: 'coral-table-purple', name: 'テーブル珊瑚（紫）', description: '傘のように平たく広がるミドリイシの仲間',
    category: 'coral', generatorType: 'coral',
    params: { ...DEFAULT_CORAL_PARAMS, shape: 'table', color: '#a987ff', length: 1.7, thickness: 0.4 },
  },
  // 脳サンゴ（塊状・溝模様のハマサンゴ／ノウサンゴ風）
  {
    id: 'coral-brain-pink', name: '脳珊瑚（桃）', description: '脳のような溝模様をもつ、塊状のサンゴ',
    category: 'coral', generatorType: 'coral',
    params: { ...DEFAULT_CORAL_PARAMS, shape: 'brain', color: '#ff8fab', thickness: 0.5 },
  },
  {
    id: 'coral-brain-green', name: '脳珊瑚（緑）', description: '脳のような溝模様をもつ、塊状のサンゴ',
    category: 'coral', generatorType: 'coral',
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
  private feedingManager: FeedingManager | null = null;

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
      case 'moray':
        mesh = MorayGenerator.generate(definition.params as CreatureModelParams);
        break;
      case 'starfish':
        mesh = StarfishGenerator.generate(definition.params as CreatureModelParams);
        break;
      case 'anemone':
        mesh = AnemoneGenerator.generate(definition.params as CreatureModelParams);
        break;
      case 'ruins':
        mesh = RuinsGenerator.generate(definition.params as CreatureModelParams);
        break;
      case 'lighthouse':
        mesh = LighthouseGenerator.generate(definition.params as CreatureModelParams);
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

    // 回遊する生物（亀・エイ）の初期状態。モデルは +X が前方なので
    // rotation.y から水平な前進方向ベクトルを作る。
    if (definition.generatorType === 'turtle' || definition.generatorType === 'ray') {
      instance.roamDir = new THREE.Vector3(
        Math.cos(rotation.y),
        0,
        -Math.sin(rotation.y)
      ).normalize();
      instance.roamSpeed = definition.generatorType === 'turtle' ? 4.5 : 6.0;
      instance.reactionTimer = 0;
    }

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
  /**
   * 餌やりシステムを接続する（亀・エイの摂餌に使用）
   */
  public setFeedingManager(feeding: FeedingManager): void {
    this.feedingManager = feeding;
  }

  public update(delta: number, elapsed: number): void {
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
        this.animateRoam(instance, delta, elapsed);
        TurtleGenerator.updateSwim(instance.mesh, elapsed);
      } else if (type === 'ray') {
        this.animateRoam(instance, delta, elapsed);
        RayGenerator.updateSwim(instance.mesh, elapsed, instance.animation!.speed ?? 1.0);
      } else if (type === 'moray') {
        // クリック反応中は巣穴へ引っ込む。
        // 潜行(0→1を約0.5秒で見せる) → 待機 → 復帰(最後の1秒で1→0) の3段階。
        let retract = 0;
        if (instance.reactionTimer && instance.reactionTimer > 0) {
          instance.reactionTimer -= delta;
          const t = instance.reactionTimer; // 残り時間
          const DUR = 2.5;
          const DIVE = 0.5; // 潜る所要時間（この間の動きが見える）
          const since = DUR - t;
          const smooth = (k: number) => k * k * (3 - 2 * k);
          if (since < DIVE) {
            retract = smooth(since / DIVE); // 穴へ潜る動き
          } else if (t > 1.0) {
            retract = 1; // しばらく隠れる
          } else {
            retract = smooth(t / 1.0); // 最後の1秒で顔を出す
          }
        }
        MorayGenerator.updateSwim(instance.mesh, elapsed, retract);
      } else if (type === 'anemone') {
        AnemoneGenerator.updateSway(instance.mesh, elapsed);
      } else if (type === 'lighthouse') {
        LighthouseGenerator.updateSpin(instance.mesh, elapsed, instance.animation!.speed ?? 0.6);
      } else if (type === 'starfish') {
        this.animateStarfish(instance, elapsed);
      }
    }
  }

  /**
   * ヒトデの徘徊。約10分周期の閉じた8の字パスで、元の位置周辺を
   * ごくゆっくり這い、周期ごとに必ず元の場所へ戻る（ドリフトしない）。
   */
  private animateStarfish(instance: DecorationInstance, time: number): void {
    const base = instance.position;
    const ph = base.x * 0.3 + base.z * 0.21;     // 個体ごとに位相をずらす
    const w = (Math.PI * 2) / 600;               // 10分周期
    const a = time * w + ph;
    const radius = 5;                             // 徘徊範囲
    instance.mesh.position.x = base.x + Math.sin(a) * radius;
    instance.mesh.position.z = base.z + Math.sin(a * 2) * radius * 0.6; // 8の字
    instance.mesh.rotation.y = instance.rotation.y + Math.sin(a) * 0.4; // 向きもゆっくり振る
  }

  /**
   * 回遊する生物（亀・エイ）のゆったりした遊泳。
   *
   * 前進しながら緩やかに蛇行し、壁際では中央へ向き直る。
   * クリック反応中(reactionTimer>0)は逃避方向へ素早く向き直り加速する。
   * 上下のbobと軽いロールで生き物らしい揺れも加える。
   */
  private animateRoam(instance: DecorationInstance, delta: number, time: number): void {
    if (!instance.roamDir) return;

    const dir = instance.roamDir;
    const pos = instance.position;
    const ph = pos.x * 0.2 + pos.z * 0.13;

    // 満腹タイマーを進める（>0 の間は餌に反応しない）
    if (instance.satietyTimer && instance.satietyTimer > 0) {
      instance.satietyTimer -= delta;
    }

    // 反応中・満腹中でなければ最寄りの餌を探す
    const reacting = !!(instance.reactionTimer && instance.reactionTimer > 0);
    const foodTarget =
      reacting ? null : this.findNearestFoodForRoam(instance);

    // 目標方向を決める
    const desired = dir.clone();
    let speed = instance.roamSpeed ?? 4.5;
    let turnRate = 0.8; // 通常時の旋回の機敏さ(1/sec)

    if (reacting && instance.reactionDir) {
      // クリック反応：逃避方向へ素早く向き直り加速
      instance.reactionTimer! -= delta;
      desired.copy(instance.reactionDir);
      speed *= 2.4;
      turnRate = 3.5;
    } else if (foodTarget) {
      // 摂餌：餌の方へ向き直って泳ぐ（蛇行より優先）
      desired.copy(foodTarget.position).sub(pos);
      speed *= 1.4;
      turnRate = 1.6;
    } else {
      // 緩やかな蛇行（時間と個体位相でゆっくり旋回）
      const wander = Math.sin(time * 0.2 + ph) * 0.6;
      this.rotateY(desired, wander * delta);
    }

    // 壁際では中央へ向き直る（反応中でも安全のため適用）
    const margin = 14;
    const b = this.tankBounds;
    const center = b.getCenter(new THREE.Vector3());
    let nearWall = false;
    if (
      pos.x < b.min.x + margin || pos.x > b.max.x - margin ||
      pos.z < b.min.z + margin || pos.z > b.max.z - margin
    ) {
      nearWall = true;
    }
    if (nearWall) {
      const toCenter = new THREE.Vector3(center.x - pos.x, 0, center.z - pos.z).normalize();
      desired.lerp(toCenter, 0.6);
    }

    // 現在の向きを目標へ補間（水平を保つ）
    desired.y = 0;
    if (desired.lengthSq() > 1e-6) {
      desired.normalize();
      dir.lerp(desired, Math.min(1, turnRate * delta)).normalize();
    }

    // 前進
    pos.x += dir.x * speed * delta;
    pos.z += dir.z * speed * delta;
    // 念のため水槽内にクランプ
    pos.x = Math.max(b.min.x + 2, Math.min(b.max.x - 2, pos.x));
    pos.z = Math.max(b.min.z + 2, Math.min(b.max.z - 2, pos.z));

    // 摂餌：口先（頭=+X前方、約5×scale先）が餌に届いたら食べる
    if (foodTarget && this.feedingManager) {
      const mouth = new THREE.Vector3(
        pos.x + dir.x * 5 * instance.scale,
        pos.y,
        pos.z + dir.z * 5 * instance.scale
      );
      if (mouth.distanceTo(foodTarget.position) < 1.2 * instance.scale + 0.5) {
        this.feedingManager.consume(foodTarget);
        instance.satietyTimer = 60; // 食べたら一定時間お腹いっぱい
      }
    }

    // メッシュへ反映（bob と軽いロールを付加）
    instance.mesh.position.set(
      pos.x,
      pos.y + Math.sin(time * 0.5 + ph) * 1.2,
      pos.z
    );
    instance.mesh.rotation.y = Math.atan2(-dir.z, dir.x);
    instance.mesh.rotation.z = instance.rotation.z + Math.sin(time * 0.32 + ph) * 0.06;
  }

  /**
   * 回遊個体から知覚範囲内の最寄りの餌を探す（満腹中・餌なしは null）
   */
  private findNearestFoodForRoam(instance: DecorationInstance) {
    if (!this.feedingManager) return null;
    if (instance.satietyTimer && instance.satietyTimer > 0) return null;

    const pellets = this.feedingManager.getPellets();
    if (pellets.length === 0) return null;

    // 体が大きいので広めの範囲で気づく
    const feedRadius = 45;
    let best = null;
    let bestDist = feedRadius;
    for (const pellet of pellets) {
      const d = instance.position.distanceTo(pellet.position);
      if (d < bestDist) {
        bestDist = d;
        best = pellet;
      }
    }
    return best;
  }

  /**
   * ベクトルをY軸まわりに回転（水平面の旋回用）
   */
  private rotateY(v: THREE.Vector3, angle: number): void {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const x = v.x * c + v.z * s;
    const z = -v.x * s + v.z * c;
    v.x = x;
    v.z = z;
  }

  /**
   * クリック反応できる装飾か（回遊する亀・エイ、または巣穴のウツボ）
   */
  public canReact(instance: DecorationInstance): boolean {
    if (instance.roamDir) return true;
    const def = this.definitions.get(instance.definitionId);
    return def?.generatorType === 'moray';
  }

  /**
   * クリック反応：
   * - 回遊個体（亀・エイ）は驚いて逆方向へ逃げる
   * - ウツボは驚いて巣穴へ引っ込む
   */
  public triggerReaction(instance: DecorationInstance, duration: number = 2.0): void {
    if (instance.roamDir) {
      // 現在の進行方向の逆＋わずかにランダムに逸らす
      const away = instance.roamDir.clone().multiplyScalar(-1);
      this.rotateY(away, (Math.random() - 0.5) * 1.0);
      away.y = 0;
      instance.reactionDir = away.normalize();
      instance.reactionTimer = duration;
      return;
    }

    const def = this.definitions.get(instance.definitionId);
    if (def?.generatorType === 'moray') {
      // 引っ込んで隠れ、しばらくして再び顔を出す
      instance.reactionTimer = 2.5;
    }
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

    // --- ギリシャ神殿の遺跡（左奥の点景） ---
    this.place({
      definitionId: 'greek-ruins',
      position: { x: -78, y: floorY, z: -28 },
      rotation: { x: 0, y: 0.7, z: 0 },
      scale: 1.2,
    });

    // --- 灯台（神殿の奥・正面から見て左へ寄せて草に隠れすぎないように） ---
    this.place({
      definitionId: 'lighthouse',
      position: { x: -92, y: floorY, z: -40 },
      rotation: { x: 0, y: 0.4, z: 0 },
      scale: 1.0,
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
    // 半数の亀をやや小さめに（小さくなりすぎたため 0.63 → 0.72 に調整）
    this.place({
      definitionId: 'sea-turtle',
      position: { x: -28, y: 8, z: 12 },
      rotation: { x: 0, y: 0.6, z: 0 },
      scale: 0.72,
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

    // --- 砂地の生物 ---
    // ウツボ（左奥の主石組のそばから顔を出す。顔が手前(カメラ側)へやや向く）
    this.place({
      definitionId: 'moray',
      position: { x: -46, y: floorY, z: -12 },
      rotation: { x: 0, y: -0.7, z: 0 },
      scale: 1.2,
    });

    // ヒトデ（砂の上に3個）
    this.place({
      definitionId: 'starfish-orange',
      position: { x: -16, y: floorY + 0.2, z: 26 },
      rotation: { x: 0, y: Math.random() * Math.PI, z: 0 },
      scale: 1.0,
    });
    this.place({
      definitionId: 'starfish-red',
      position: { x: 34, y: floorY + 0.2, z: -20 },
      rotation: { x: 0, y: Math.random() * Math.PI, z: 0 },
      scale: 0.9,
    });
    this.place({
      definitionId: 'starfish-purple',
      position: { x: 10, y: floorY + 0.2, z: 34 },
      rotation: { x: 0, y: Math.random() * Math.PI, z: 0 },
      scale: 0.95,
    });

    // イソギンチャク（カクレクマノミの住処。2株を近くに並べる）
    this.place({
      definitionId: 'anemone-pink',
      position: { x: -6, y: floorY, z: 16 },
      scale: 1.0,
    });
    this.place({
      definitionId: 'anemone-orange',
      position: { x: 8, y: floorY, z: 18 },
      scale: 0.9,
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
   * 装飾（岩・珊瑚・イソギンチャク・木部など）の起伏(bumpScale)を
   * ライブ調整する。各マテリアルの基準値×multiplier。
   */
  public setReliefMultiplier(multiplier: number): void {
    this.group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        const sm = mat as THREE.MeshStandardMaterial;
        if (sm && sm.bumpMap) {
          if (sm.userData.baseBump === undefined) sm.userData.baseBump = sm.bumpScale;
          sm.bumpScale = sm.userData.baseBump * multiplier;
        }
      }
    });
  }

  /**
   * 泡の湧出点となる草の位置を返す（草が密なほど点が多く＝泡が多く湧く）。
   */
  public getPlantEmitterPositions(): THREE.Vector3[] {
    return this.instances
      .filter((i) => this.definitions.get(i.definitionId)?.generatorType === 'plant')
      .map((i) => i.position.clone());
  }

  /**
   * イソギンチャクの湧出点を返す。株数が少ないため weight 回ぶん複製して
   * 候補点を増やし、草と同様にそのエリアから泡が多く湧くようにする。
   */
  public getAnemoneEmitterPositions(weight: number = 50): THREE.Vector3[] {
    const result: THREE.Vector3[] = [];
    for (const i of this.instances) {
      if (this.definitions.get(i.definitionId)?.generatorType === 'anemone') {
        for (let k = 0; k < weight; k++) result.push(i.position.clone());
      }
    }
    return result;
  }

  /**
   * 住処（イソギンチャク）の位置を返す。
   * 触手の中ほどを狙えるよう少し上にオフセットする。
   */
  public getShelterPositions(): THREE.Vector3[] {
    return this.instances
      .filter((i) => this.definitions.get(i.definitionId)?.generatorType === 'anemone')
      .map((i) => i.position.clone().add(new THREE.Vector3(0, 7, 0)));
  }

  /**
   * レイキャストでヒットしたオブジェクトから装飾個体を逆引きする。
   */
  public findInstanceByObject(object: THREE.Object3D): DecorationInstance | null {
    let node: THREE.Object3D | null = object;
    while (node) {
      if (node.parent === this.group) {
        return this.instances.find((i) => i.mesh === node) || null;
      }
      node = node.parent;
    }
    return null;
  }

  /**
   * 装飾の表示情報を取得（ツールチップ用）
   */
  public getDisplayInfo(instance: DecorationInstance): {
    name: string;
    description: string;
  } {
    const def = this.definitions.get(instance.definitionId);
    return {
      name: def?.name ?? instance.definitionId,
      description: def?.description ?? '',
    };
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
