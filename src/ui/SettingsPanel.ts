import GUI from 'lil-gui';
import { AquariumCamera } from '../core/Camera';
import { CreatureManager } from '../creatures/CreatureManager';
import { DecorationManager } from '../decorations/DecorationManager';
import { Lighting } from '../environment/Lighting';

interface SettingsPanelOptions {
  camera: AquariumCamera;
  creatureManager: CreatureManager;
  decorationManager: DecorationManager;
  lighting: Lighting;
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
  };

  constructor(options: SettingsPanelOptions) {
    this.options = options;

    this.settings = {
      autoRotate: false,
      autoRotateSpeed: 0.5,
      causticsEnabled: true,
      ambientIntensity: 0.4,
      sunIntensity: 1.0,
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
