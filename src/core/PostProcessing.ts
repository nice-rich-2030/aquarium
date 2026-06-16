import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * ブルーム設定
 */
export interface BloomConfig {
  strength: number;   // にじみの強さ
  radius: number;     // にじみの広がり
  threshold: number;  // 発光とみなす輝度の閾値
}

export const DEFAULT_BLOOM_CONFIG: BloomConfig = {
  strength: 0.55,
  radius: 0.5,
  threshold: 0.85,
};

/**
 * ポストプロセス管理クラス
 *
 * RenderPass → UnrealBloomPass → OutputPass のパイプラインを構築する。
 * 明るい部分（コースティクス、魚の反射、目のハイライト）がにじみ、
 * 水中らしい柔らかな発光感を加える。
 * トーンマッピングとカラースペース変換は OutputPass が担当する。
 */
export class PostProcessing {
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private renderPass: RenderPass;
  private outputPass: OutputPass;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    config: BloomConfig = DEFAULT_BLOOM_CONFIG
  ) {
    const size = renderer.getSize(new THREE.Vector2());

    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.setSize(size.x, size.y);

    // シーンを描画
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // ブルーム
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      config.strength,
      config.radius,
      config.threshold
    );
    this.composer.addPass(this.bloomPass);

    // トーンマッピング＋sRGB出力（最終パス）
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  /**
   * 1フレーム描画
   */
  public render(): void {
    this.composer.render();
  }

  /**
   * リサイズ
   */
  public setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
  }

  /**
   * ブルームの強さを設定
   */
  public setBloomStrength(value: number): void {
    this.bloomPass.strength = value;
  }

  /**
   * ブルームの閾値を設定
   */
  public setBloomThreshold(value: number): void {
    this.bloomPass.threshold = value;
  }

  /**
   * ブルームの広がりを設定
   */
  public setBloomRadius(value: number): void {
    this.bloomPass.radius = value;
  }

  /**
   * 破棄
   */
  public dispose(): void {
    this.composer.dispose();
    this.bloomPass.dispose();
  }
}
