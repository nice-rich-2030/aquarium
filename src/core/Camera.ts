import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CameraConfig, CameraPreset, DEFAULT_CAMERA_CONFIG, DEFAULT_CAMERA_PRESETS } from '../types/config';

/**
 * カメラ管理クラス
 * PerspectiveCameraとOrbitControlsを管理
 */
export class AquariumCamera {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private config: CameraConfig;
  private presets: CameraPreset[];
  private isTransitioning: boolean = false;
  private transitionProgress: number = 0;
  private transitionStart: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;
  private transitionEnd: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;

  constructor(
    domElement: HTMLCanvasElement,
    aspect: number,
    config: CameraConfig = DEFAULT_CAMERA_CONFIG,
    presets: CameraPreset[] = DEFAULT_CAMERA_PRESETS
  ) {
    this.config = config;
    this.presets = presets;

    // カメラ作成
    this.camera = new THREE.PerspectiveCamera(
      config.fov,
      aspect,
      config.near,
      config.far
    );

    // 初期位置設定
    this.camera.position.set(
      config.initialPosition.x,
      config.initialPosition.y,
      config.initialPosition.z
    );

    // OrbitControls作成
    this.controls = new OrbitControls(this.camera, domElement);
    this.setupControls();
  }

  /**
   * OrbitControlsの設定
   */
  private setupControls(): void {
    // ターゲット設定
    this.controls.target.set(
      this.config.lookAt.x,
      this.config.lookAt.y,
      this.config.lookAt.z
    );

    // ズーム範囲
    this.controls.minDistance = this.config.minDistance;
    this.controls.maxDistance = this.config.maxDistance;

    // 垂直回転範囲
    this.controls.minPolarAngle = this.config.minPolarAngle;
    this.controls.maxPolarAngle = this.config.maxPolarAngle;

    // 自動回転
    this.controls.autoRotate = this.config.autoRotate;
    this.controls.autoRotateSpeed = this.config.autoRotateSpeed;

    // スムーズな動き
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // パン無効（水槽内に留まるため）
    this.controls.enablePan = false;

    this.controls.update();
  }

  /**
   * 毎フレーム更新
   */
  public update(delta: number): void {
    // トランジション中の場合
    if (this.isTransitioning && this.transitionStart && this.transitionEnd) {
      this.transitionProgress += delta * 2; // 0.5秒でトランジション
      const t = this.easeInOutCubic(Math.min(this.transitionProgress, 1));

      // 位置を補間
      this.camera.position.lerpVectors(
        this.transitionStart.position,
        this.transitionEnd.position,
        t
      );

      // ターゲットを補間
      this.controls.target.lerpVectors(
        this.transitionStart.target,
        this.transitionEnd.target,
        t
      );

      if (this.transitionProgress >= 1) {
        this.isTransitioning = false;
        this.transitionProgress = 0;
        this.transitionStart = null;
        this.transitionEnd = null;
      }
    }

    this.controls.update();
  }

  /**
   * イージング関数
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * プリセット視点に移動
   */
  public setPreset(name: string): void {
    const preset = this.presets.find((p) => p.name === name);
    if (!preset) return;

    this.transitionStart = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };

    this.transitionEnd = {
      position: new THREE.Vector3(preset.position.x, preset.position.y, preset.position.z),
      target: new THREE.Vector3(preset.lookAt.x, preset.lookAt.y, preset.lookAt.z),
    };

    this.isTransitioning = true;
    this.transitionProgress = 0;
  }

  /**
   * 自動回転の有効/無効切替
   */
  public enableAutoRotate(enabled: boolean, speed?: number): void {
    this.controls.autoRotate = enabled;
    if (speed !== undefined) {
      this.controls.autoRotateSpeed = speed;
    }
  }

  /**
   * カメラをリセット
   */
  public reset(): void {
    this.setPreset('正面');
  }

  /**
   * アスペクト比を更新
   */
  public updateAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /**
   * カメラインスタンスを取得
   */
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * OrbitControlsを取得
   */
  public getControls(): OrbitControls {
    return this.controls;
  }

  /**
   * プリセット一覧を取得
   */
  public getPresets(): CameraPreset[] {
    return this.presets;
  }

  /**
   * 破棄
   */
  public dispose(): void {
    this.controls.dispose();
  }
}
