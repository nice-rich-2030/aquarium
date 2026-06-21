import GUI from 'lil-gui';
import { AquariumCamera } from '../core/Camera';
import { CreatureManager } from '../creatures/CreatureManager';
import { DecorationManager } from '../decorations/DecorationManager';
import { Lighting } from '../environment/Lighting';
import { Tank } from '../environment/Tank';

interface SettingsPanelOptions {
  camera: AquariumCamera;
  creatureManager: CreatureManager;
  decorationManager: DecorationManager;
  lighting: Lighting;
  tank: Tank;
  onFullscreen?: () => void;
  onReset?: () => void;
}

/**
 * 設定パネルUI
 */
export class SettingsPanel {
  private gui: GUI;
  private options: SettingsPanelOptions;
  private settings: {
    autoRotate: boolean;
    autoRotateSpeed: number;
    causticsEnabled: boolean;
    ambientIntensity: number;
    sunIntensity: number;
    decorRelief: number;
    sandRelief: number;
  };
  // カメラの現在値（ライブ表示用）
  private cameraInfo = {
    posX: 0, posY: 0, posZ: 0,
    tgtX: 0, tgtY: 0, tgtZ: 0,
  };

  constructor(options: SettingsPanelOptions) {
    this.options = options;

    this.settings = {
      autoRotate: false,
      autoRotateSpeed: 0.5,
      causticsEnabled: true,
      ambientIntensity: 0.4,
      sunIntensity: 1.0,
      decorRelief: 10.0,
      sandRelief: 5.0,
    };

    this.gui = new GUI({ title: 'Settings' });
    this.setupUI();
  }

  /**
   * UIをセットアップ
   */
  private setupUI(): void {
    this.setupActionsFolder();
    this.setupCameraFolder();
    this.setupLightingFolder();
    this.setupTextureFolder();
    this.setupCreaturesFolder();
    this.setupDecorationsFolder();

    // 初期状態で閉じる
    this.gui.close();
  }

  /**
   * アクションフォルダ
   */
  private setupActionsFolder(): void {
    const folder = this.gui.addFolder('Actions');

    folder.add({
      fullscreen: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
      },
    }, 'fullscreen').name('Toggle Fullscreen');

    folder.add({
      reset: () => {
        this.options.camera.reset();
      },
    }, 'reset').name('Reset Camera');

    folder.open();
  }

  /**
   * カメラフォルダ
   */
  private setupCameraFolder(): void {
    const folder = this.gui.addFolder('Camera');

    // プリセット
    const presets = this.options.camera.getPresets();
    const presetNames = presets.map((p) => p.name);

    folder.add({ preset: presetNames[0] }, 'preset', presetNames)
      .name('Preset')
      .onChange((value: string) => {
        this.options.camera.setPreset(value);
      });

    // 自動回転
    folder.add(this.settings, 'autoRotate')
      .name('Auto Rotate')
      .onChange((value: boolean) => {
        this.options.camera.enableAutoRotate(value, this.settings.autoRotateSpeed);
      });

    folder.add(this.settings, 'autoRotateSpeed', 0.1, 2, 0.1)
      .name('Rotate Speed')
      .onChange((value: number) => {
        this.options.camera.enableAutoRotate(this.settings.autoRotate, value);
      });

    // カメラの現在値をライブ表示（読み取り専用）。プリセット微調整に使う
    const info = folder.addFolder('View Info (live)');
    info.add(this.cameraInfo, 'posX').name('pos.x').listen().disable();
    info.add(this.cameraInfo, 'posY').name('pos.y').listen().disable();
    info.add(this.cameraInfo, 'posZ').name('pos.z').listen().disable();
    info.add(this.cameraInfo, 'tgtX').name('lookAt.x').listen().disable();
    info.add(this.cameraInfo, 'tgtY').name('lookAt.y').listen().disable();
    info.add(this.cameraInfo, 'tgtZ').name('lookAt.z').listen().disable();

    // 現在のビューをプリセット形式でコンソール出力（config.tsへ転記用）
    info.add({
      log: () => {
        const p = this.options.camera.getCamera().position;
        const t = this.options.camera.getControls().target;
        const r = (v: number) => Math.round(v * 10) / 10;
        const preset = {
          name: '正面',
          position: { x: r(p.x), y: r(p.y), z: r(p.z) },
          lookAt: { x: r(t.x), y: r(t.y), z: r(t.z) },
        };
        console.log('Camera preset:', JSON.stringify(preset));
      },
    }, 'log').name('Log preset to console');

    info.open();
  }

  /**
   * ライティングフォルダ
   */
  private setupLightingFolder(): void {
    const folder = this.gui.addFolder('Lighting');

    folder.add(this.settings, 'ambientIntensity', 0, 1, 0.1)
      .name('Ambient')
      .onChange(() => this.updateLighting());

    folder.add(this.settings, 'sunIntensity', 0, 2, 0.1)
      .name('Sun')
      .onChange(() => this.updateLighting());

    folder.add(this.settings, 'causticsEnabled')
      .name('Caustics')
      .onChange((value: boolean) => {
        this.options.lighting.setCausticsEnabled(value);
      });
  }

  /**
   * テクスチャ（起伏）フォルダ
   */
  private setupTextureFolder(): void {
    const folder = this.gui.addFolder('Texture');

    folder.add(this.settings, 'decorRelief', 0, 20, 0.5)
      .name('Relief: 岩/珊瑚/イソギン')
      .onChange((v: number) => {
        this.options.decorationManager.setReliefMultiplier(v);
      });

    folder.add(this.settings, 'sandRelief', 0, 20, 0.5)
      .name('Relief: 砂地')
      .onChange((v: number) => {
        this.options.tank.setSandRelief(v);
      });

    // デフォルト値を起動時に適用
    this.options.decorationManager.setReliefMultiplier(this.settings.decorRelief);
    this.options.tank.setSandRelief(this.settings.sandRelief);
  }

  /**
   * ライティングを更新
   */
  private updateLighting(): void {
    this.options.lighting.setIntensity(
      this.settings.ambientIntensity,
      this.settings.sunIntensity
    );
  }

  /**
   * 生き物フォルダ
   */
  private setupCreaturesFolder(): void {
    const folder = this.gui.addFolder('Creatures');
    const creatureManager = this.options.creatureManager;

    // 生き物追加
    const definitions = creatureManager.getDefinitions();
    const addCreature = {
      type: definitions[0]?.id || '',
      count: 5,
      add: () => {
        if (addCreature.type) {
          creatureManager.spawn({
            definitionId: addCreature.type,
            count: addCreature.count,
          });
          this.refreshCreatureList(folder);
        }
      },
    };

    folder.add(addCreature, 'type', definitions.map((d) => d.id)).name('Species');
    folder.add(addCreature, 'count', 1, 20, 1).name('Count');
    folder.add(addCreature, 'add').name('Add Creatures');

    // 現在の生き物リスト
    this.refreshCreatureList(folder);
  }

  /**
   * 生き物リストを更新
   */
  private refreshCreatureList(folder: GUI): void {
    // 既存のリストアイテムを削除
    const controllers = folder.controllers.slice();
    for (const controller of controllers) {
      if (controller.property.startsWith('remove_')) {
        controller.destroy();
      }
    }

    // 現在の生き物を表示
    const list = this.options.creatureManager.getCreatureList();
    for (const item of list) {
      const def = this.options.creatureManager.getDefinitions()
        .find((d) => d.id === item.definitionId);
      const name = def?.name || item.definitionId;

      folder.add({
        [`remove_${item.definitionId}`]: () => {
          this.options.creatureManager.remove(item.definitionId);
          this.refreshCreatureList(folder);
        },
      }, `remove_${item.definitionId}`).name(`${name} (${item.count}) - Remove`);
    }
  }

  /**
   * 装飾フォルダ
   */
  private setupDecorationsFolder(): void {
    const folder = this.gui.addFolder('Decorations');
    const decorationManager = this.options.decorationManager;

    // 装飾追加
    const definitions = decorationManager.getDefinitions();
    const addDecoration = {
      type: definitions[0]?.id || '',
      x: 0,
      z: 0,
      add: () => {
        if (addDecoration.type) {
          const floorY = -30 + 0.5;
          decorationManager.place({
            definitionId: addDecoration.type,
            position: { x: addDecoration.x, y: floorY, z: addDecoration.z },
            rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
          });
        }
      },
    };

    folder.add(addDecoration, 'type', definitions.map((d) => d.id)).name('Type');
    folder.add(addDecoration, 'x', -40, 40, 1).name('X Position');
    folder.add(addDecoration, 'z', -20, 20, 1).name('Z Position');
    folder.add(addDecoration, 'add').name('Add Decoration');
  }

  /**
   * カメラの現在値を更新（毎フレーム呼ぶ。ライブ表示用）
   */
  public update(): void {
    const p = this.options.camera.getCamera().position;
    const t = this.options.camera.getControls().target;
    const r = (v: number) => Math.round(v * 10) / 10;
    this.cameraInfo.posX = r(p.x);
    this.cameraInfo.posY = r(p.y);
    this.cameraInfo.posZ = r(p.z);
    this.cameraInfo.tgtX = r(t.x);
    this.cameraInfo.tgtY = r(t.y);
    this.cameraInfo.tgtZ = r(t.z);
  }

  /**
   * パネルを開く
   */
  public open(): void {
    this.gui.open();
  }

  /**
   * パネルを閉じる
   */
  public close(): void {
    this.gui.close();
  }

  /**
   * 破棄
   */
  public dispose(): void {
    this.gui.destroy();
  }
}
