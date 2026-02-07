import * as THREE from 'three';
import { WaterConfig, DEFAULT_WATER_CONFIG } from '../types/config';

/**
 * シーン管理クラス
 * Three.jsシーンの作成・管理を担当
 */
export class AquariumScene {
  private scene: THREE.Scene;
  private waterConfig: WaterConfig;

  constructor(waterConfig: WaterConfig = DEFAULT_WATER_CONFIG) {
    this.waterConfig = waterConfig;
    this.scene = new THREE.Scene();
    this.setupScene();
  }

  /**
   * シーンの初期設定
   */
  private setupScene(): void {
    // 背景色
    this.scene.background = new THREE.Color(0x001830);

    // 水中の霧効果
    this.setupFog();
  }

  /**
   * 霧効果の設定
   */
  private setupFog(): void {
    const fogColor = new THREE.Color(this.waterConfig.fogColor);
    this.scene.fog = new THREE.Fog(
      fogColor,
      this.waterConfig.fogNear,
      this.waterConfig.fogFar
    );
  }

  /**
   * 霧のパラメータを更新
   */
  public updateFog(config: Partial<WaterConfig>): void {
    if (config.fogColor) {
      (this.scene.fog as THREE.Fog).color.set(config.fogColor);
    }
    if (config.fogNear !== undefined) {
      (this.scene.fog as THREE.Fog).near = config.fogNear;
    }
    if (config.fogFar !== undefined) {
      (this.scene.fog as THREE.Fog).far = config.fogFar;
    }
  }

  /**
   * オブジェクトをシーンに追加
   */
  public add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /**
   * オブジェクトをシーンから削除
   */
  public remove(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  /**
   * 名前でオブジェクトを検索
   */
  public getObjectByName(name: string): THREE.Object3D | undefined {
    return this.scene.getObjectByName(name);
  }

  /**
   * すべての子オブジェクトを取得
   */
  public getChildren(): THREE.Object3D[] {
    return this.scene.children;
  }

  /**
   * Three.jsシーンインスタンスを取得
   */
  public getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * シーンの破棄
   */
  public dispose(): void {
    // すべての子オブジェクトを再帰的に破棄
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        } else if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose());
        }
      }
    });

    // シーンをクリア
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
  }
}
