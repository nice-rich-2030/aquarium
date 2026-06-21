import { AquariumScene, AquariumRenderer, AquariumCamera, AnimationLoop, PostProcessing } from './core';
import { Tank, Lighting, Particles, Geyser } from './environment';
import { CreatureManager, FeedingManager } from './creatures';
import { DecorationManager } from './decorations';
import { SettingsPanel, CreatureInteraction } from './ui';
import {
  DEFAULT_TANK_CONFIG,
  DEFAULT_LIGHTING_CONFIG,
  DEFAULT_PARTICLE_CONFIG,
  DEFAULT_CAMERA_CONFIG,
  DEFAULT_CAMERA_PRESETS,
} from './types/config';

/**
 * デジタルアクアリウム メインアプリケーション
 */
class DigitalAquarium {
  private scene: AquariumScene;
  private renderer: AquariumRenderer;
  private camera: AquariumCamera;
  private loop: AnimationLoop;
  private postProcessing: PostProcessing;

  private tank: Tank;
  private lighting: Lighting;
  private particles: Particles;
  private geysers: Geyser[] = [];
  private creatureManager: CreatureManager;
  private feedingManager: FeedingManager;
  private decorationManager: DecorationManager;
  private settingsPanel: SettingsPanel;
  private creatureInteraction: CreatureInteraction;

  constructor(container: HTMLElement) {
    // コアシステム初期化
    this.scene = new AquariumScene();
    this.renderer = new AquariumRenderer(container);

    // 環境マップ(IBL)をセットアップ（ガラス・魚体の反射に使用）
    this.scene.setupEnvironment(this.renderer.getRenderer());
    this.camera = new AquariumCamera(
      this.renderer.getDomElement(),
      this.renderer.getAspect(),
      DEFAULT_CAMERA_CONFIG,
      DEFAULT_CAMERA_PRESETS
    );
    this.loop = new AnimationLoop();

    // 水槽を作成
    this.tank = new Tank(DEFAULT_TANK_CONFIG);
    this.scene.add(this.tank.getGroup());

    // ライティングを作成
    this.lighting = new Lighting(
      this.tank.getBounds(),
      DEFAULT_LIGHTING_CONFIG
    );
    this.scene.add(this.lighting.getGroup());

    // パーティクルを作成
    this.particles = new Particles(
      this.tank.getBounds(),
      DEFAULT_PARTICLE_CONFIG
    );
    this.scene.add(this.particles.getGroup());

    // 砂地から水が吹き出す噴出口（3か所）
    // 3つ目は水車(66,-32)の向かって右下。上向き水流が反時計回りの回転を生む
    const floorY = this.tank.getBounds().min.y + 0.5;
    const ventDefs: { x: number; z: number; h?: number }[] = [
      { x: 4, z: 22 },
      { x: -34, z: 4 },
      { x: 80, z: -32, h: 24 },
    ];
    for (const p of ventDefs) {
      const geyser = new Geyser({ x: p.x, y: floorY, z: p.z }, p.h);
      this.geysers.push(geyser);
      this.scene.add(geyser.getGroup());
    }

    // 生き物マネージャーを作成
    this.creatureManager = new CreatureManager(this.tank.getSwimmableArea());
    this.scene.add(this.creatureManager.getGroup());

    // 餌やりシステムを作成し、魚AIに接続
    this.feedingManager = new FeedingManager(this.tank.getSwimmableArea());
    this.scene.add(this.feedingManager.getGroup());
    this.creatureManager.setFeedingManager(this.feedingManager);

    // 装飾マネージャーを作成
    this.decorationManager = new DecorationManager(this.tank.getBounds());
    this.scene.add(this.decorationManager.getGroup());
    // 亀・エイも餌を食べられるよう餌やりシステムを接続
    this.decorationManager.setFeedingManager(this.feedingManager);

    // デフォルトの生き物を配置
    this.spawnDefaultCreatures();

    // デフォルトの装飾を配置
    this.decorationManager.placeDefaultDecorations();

    // カクレクマノミの住処としてイソギンチャク位置を登録
    this.creatureManager.setShelters(this.decorationManager.getShelterPositions());

    // 泡の湧出点として草とイソギンチャクの位置を登録
    // （草が密な場所・イソギンチャクのエリアから泡が多く湧く）
    this.particles.setEmitters([
      ...this.decorationManager.getPlantEmitterPositions(),
      ...this.decorationManager.getAnemoneEmitterPositions(),
    ]);

    // ポストプロセス（ブルーム）を構築
    this.postProcessing = new PostProcessing(
      this.renderer.getRenderer(),
      this.scene.getScene(),
      this.camera.getCamera()
    );

    // 設定パネルを作成
    this.settingsPanel = new SettingsPanel({
      camera: this.camera,
      creatureManager: this.creatureManager,
      decorationManager: this.decorationManager,
      lighting: this.lighting,
      tank: this.tank,
    });

    // 生き物へのマウス操作（ホバー情報・クリックで反転）
    this.creatureInteraction = new CreatureInteraction(
      this.renderer.getDomElement(),
      this.camera.getCamera(),
      this.creatureManager,
      this.decorationManager,
      this.feedingManager
    );

    // ループを設定
    this.setupLoop();

    // リサイズハンドラ
    this.setupResizeHandler();

    // キーボードショートカット
    this.setupKeyboard();

    // ローディング画面を非表示
    this.hideLoading();
  }

  /**
   * デフォルトの生き物を配置
   */
  private spawnDefaultCreatures(): void {
    // ネオンテトラの群れ（1.3倍に大型化）
    this.creatureManager.spawn({
      definitionId: 'neontetra',
      count: 30,
      sizeScale: 1.3,
    });

    // カクレクマノミ（0.8倍）
    this.creatureManager.spawn({
      definitionId: 'clownfish',
      count: 6,
      sizeScale: 0.8,
    });

    // エンゼルフィッシュ
    this.creatureManager.spawn({
      definitionId: 'angelfish',
      count: 4,
    });

    // グッピー（1.3倍に大型化）
    this.creatureManager.spawn({
      definitionId: 'guppy',
      count: 16,
      sizeScale: 1.3,
    });

    // 金魚（大きすぎたので縮小：半数を0.33倍・半数を0.25倍）
    this.creatureManager.spawn({
      definitionId: 'goldfish',
      count: 2,
      sizeScale: 0.33,
    });
    this.creatureManager.spawn({
      definitionId: 'goldfish',
      count: 2,
      sizeScale: 0.25,
    });

    // サメ（捕食者・1匹）。近づくと周囲の魚が逃げる
    this.creatureManager.spawn({
      definitionId: 'shark',
      count: 1,
    });
  }

  /**
   * アニメーションループを設定
   */
  private setupLoop(): void {
    // 更新コールバックを追加
    this.loop.addUpdateCallback((delta, elapsed) => {
      // カメラ更新
      this.camera.update(delta);

      // 設定パネルのカメラ情報をライブ更新
      this.settingsPanel.update();

      // 水槽更新（背景の海中ライトのアニメーション）
      this.tank.update(elapsed);

      // ライティング更新（コースティクスアニメーション）
      this.lighting.update(elapsed);

      // パーティクル更新
      this.particles.update(delta, elapsed);

      // 噴出口（水・砂の吹き出し）更新
      for (const geyser of this.geysers) {
        geyser.update(delta, elapsed);
      }

      // 餌の沈降・寿命を更新（魚AIが参照する前に位置を更新）
      this.feedingManager.update(delta);

      // 生き物更新
      this.creatureManager.update(delta, elapsed);

      // 装飾更新（揺れアニメーション）
      this.decorationManager.update(delta, elapsed);
    });

    // レンダリングコールバック（ポストプロセス経由）
    this.loop.setRenderCallback(() => {
      this.postProcessing.render();
    });
  }

  /**
   * キーボードショートカットを設定
   * f: 正面プリセットを表示
   */
  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      // 入力欄(設定パネル等)への入力中は無視
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        this.camera.setPreset('正面');
      }
    });
  }

  /**
   * リサイズハンドラを設定
   */
  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.camera.updateAspect(this.renderer.getAspect());
      const size = this.renderer.getSize();
      this.postProcessing.setSize(size.width, size.height);
    });
  }

  /**
   * ローディング画面を非表示
   */
  private hideLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('hidden');
    }
  }

  /**
   * アプリケーション開始
   */
  public start(): void {
    this.loop.start();
  }

  /**
   * アプリケーション停止
   */
  public stop(): void {
    this.loop.stop();
  }

  /**
   * 破棄
   */
  public dispose(): void {
    this.loop.dispose();
    this.postProcessing.dispose();
    this.settingsPanel.dispose();
    this.creatureInteraction.dispose();
    this.feedingManager.dispose();
    this.creatureManager.dispose();
    this.decorationManager.dispose();
    this.particles.dispose();
    for (const geyser of this.geysers) geyser.dispose();
    this.lighting.dispose();
    this.tank.dispose();
    this.scene.dispose();
    this.camera.dispose();
    this.renderer.dispose();
  }
}

// アプリケーション起動
function init(): void {
  const container = document.getElementById('app');
  if (!container) {
    showError('Container element not found');
    return;
  }

  // WebGLサポートチェック
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }
  } catch {
    showError('お使いのブラウザはWebGLに対応していません。Chrome、Firefox、Edgeなどの最新ブラウザをお使いください。');
    return;
  }

  try {
    const app = new DigitalAquarium(container);
    app.start();

    // グローバルに公開（デバッグ用）
    (window as any).aquarium = app;
  } catch (error) {
    console.error('Failed to initialize aquarium:', error);
    showError('アクアリウムの初期化に失敗しました。');
  }
}

function showError(message: string): void {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
  }

  const errorDiv = document.getElementById('error');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.add('visible');
  }
}

// DOMContentLoaded後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
