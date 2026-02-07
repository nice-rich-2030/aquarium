import { AquariumScene, AquariumRenderer, AquariumCamera, AnimationLoop } from './core';
import { Tank, Lighting, Particles } from './environment';
import { CreatureManager } from './creatures';
import { DecorationManager } from './decorations';
import { SettingsPanel } from './ui';
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

  private tank: Tank;
  private lighting: Lighting;
  private particles: Particles;
  private creatureManager: CreatureManager;
  private decorationManager: DecorationManager;
  private settingsPanel: SettingsPanel;

  constructor(container: HTMLElement) {
    // コアシステム初期化
    this.scene = new AquariumScene();
    this.renderer = new AquariumRenderer(container);
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

    // 生き物マネージャーを作成
    this.creatureManager = new CreatureManager(this.tank.getSwimmableArea());
    this.scene.add(this.creatureManager.getGroup());

    // 装飾マネージャーを作成
    this.decorationManager = new DecorationManager(this.tank.getBounds());
    this.scene.add(this.decorationManager.getGroup());

    // デフォルトの生き物を配置
    this.spawnDefaultCreatures();

    // デフォルトの装飾を配置
    this.decorationManager.placeDefaultDecorations();

    // 設定パネルを作成
    this.settingsPanel = new SettingsPanel({
      camera: this.camera,
      creatureManager: this.creatureManager,
      decorationManager: this.decorationManager,
      lighting: this.lighting,
    });

    // ループを設定
    this.setupLoop();

    // リサイズハンドラ
    this.setupResizeHandler();

    // ローディング画面を非表示
    this.hideLoading();
  }

  /**
   * デフォルトの生き物を配置
   */
  private spawnDefaultCreatures(): void {
    // ネオンテトラの群れ
    this.creatureManager.spawn({
      definitionId: 'neontetra',
      count: 15,
    });

    // カクレクマノミ
    this.creatureManager.spawn({
      definitionId: 'clownfish',
      count: 3,
    });

    // エンゼルフィッシュ
    this.creatureManager.spawn({
      definitionId: 'angelfish',
      count: 2,
    });

    // グッピー
    this.creatureManager.spawn({
      definitionId: 'guppy',
      count: 8,
    });

    // 金魚
    this.creatureManager.spawn({
      definitionId: 'goldfish',
      count: 2,
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

      // ライティング更新（コースティクスアニメーション）
      this.lighting.update(elapsed);

      // パーティクル更新
      this.particles.update(delta, elapsed);

      // 生き物更新
      this.creatureManager.update(delta, elapsed);

      // 装飾更新（揺れアニメーション）
      this.decorationManager.update(delta, elapsed);
    });

    // レンダリングコールバック
    this.loop.setRenderCallback(() => {
      this.renderer.render(
        this.scene.getScene(),
        this.camera.getCamera()
      );
    });
  }

  /**
   * リサイズハンドラを設定
   */
  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.camera.updateAspect(this.renderer.getAspect());
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
    this.settingsPanel.dispose();
    this.creatureManager.dispose();
    this.decorationManager.dispose();
    this.particles.dispose();
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
