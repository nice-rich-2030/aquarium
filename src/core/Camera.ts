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

  // 魚視点（追従）モード
  private followMesh: THREE.Object3D | null = null;
  private followSize: number = 1;
  private followMode: 'fpv' | 'shoulder' = 'shoulder';
  // カメラ位置・注視点の平滑化用（魚のうねりによる揺れを抑える）
  private smoothedEye: THREE.Vector3 = new THREE.Vector3();
  private smoothedTarget: THREE.Vector3 = new THREE.Vector3();
  private followInitialized: boolean = false;

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
    // 魚視点（追従）モード中は OrbitControls を使わず、魚にカメラを追従させる
    if (this.followMesh) {
      this.updateFollow(delta);
      return;
    }

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
   * 魚視点（追従）モードの毎フレーム更新。
   *
   * 魚モデルは頭部がローカル -X を向く規約。その頭の位置・進行方向を基準に、
   * 一人称（fpv）または肩越し（shoulder）のカメラ位置と注視点を求める。
   * 魚は遊泳でうねるため、算出した位置・注視点を指数平滑化して揺れを抑える。
   */
  private updateFollow(delta: number): void {
    const mesh = this.followMesh!;
    const q = mesh.quaternion;
    const p = mesh.position;
    const s = this.followSize;

    // ローカル空間でのカメラ位置(eye)と注視点(look)
    // -X が頭（前方）、+Y が背（上）
    let eyeLocal: THREE.Vector3;
    let lookLocal: THREE.Vector3;
    if (this.followMode === 'fpv') {
      // 一人称: 目の位置（頭の先・やや上）から進行方向を見る
      eyeLocal = new THREE.Vector3(-s * 1.0, s * 0.35, 0);
      lookLocal = new THREE.Vector3(-s * 8.0, s * 0.2, 0);
    } else {
      // 肩越し: 魚のやや後方・上から、魚と進行方向を見る
      eyeLocal = new THREE.Vector3(s * 3.0, s * 1.6, 0);
      lookLocal = new THREE.Vector3(-s * 4.0, s * 0.2, 0);
    }

    const eye = eyeLocal.applyQuaternion(q).add(p);
    const look = lookLocal.applyQuaternion(q).add(p);

    if (!this.followInitialized) {
      // 切替直後はスナップして開始（次フレーム以降に平滑追従）
      this.smoothedEye.copy(eye);
      this.smoothedTarget.copy(look);
      this.followInitialized = true;
    } else {
      // 指数平滑化（フレームレート非依存）
      const k = 1 - Math.exp(-delta * 8);
      this.smoothedEye.lerp(eye, k);
      this.smoothedTarget.lerp(look, k);
    }

    this.camera.position.copy(this.smoothedEye);
    this.camera.lookAt(this.smoothedTarget);
  }

  /**
   * 魚視点（追従）モードを開始／対象を差し替える。
   * @param mesh 追従する魚のメッシュ（ローカル -X が頭）
   * @param size 魚のサイズ（カメラのオフセット量に使用）
   */
  public followCreature(mesh: THREE.Object3D, size: number): void {
    // 別の魚に切り替える場合、前の対象は表示に戻す
    if (this.followMesh && this.followMesh !== mesh) {
      this.followMesh.visible = true;
    }
    this.followMesh = mesh;
    this.followSize = size;
    this.followInitialized = false;
    // 追従中はユーザー操作・トランジションを止める
    this.controls.enabled = false;
    this.isTransitioning = false;
    this.applyFollowVisibility();
  }

  /**
   * 視点スタイルに応じて対象魚の表示/非表示を切り替える。
   * 一人称（fpv）はカメラが頭部に入り体内が見えてしまうため、対象魚を隠す。
   * 肩越し（shoulder）は魚を見せたいので表示する。
   */
  private applyFollowVisibility(): void {
    if (!this.followMesh) return;
    this.followMesh.visible = this.followMode !== 'fpv';
  }

  /**
   * 魚視点の表示スタイルを切り替える（一人称 ⇄ 肩越し）。
   * 追従中でない場合は何もしない。
   */
  public toggleFollowMode(): 'fpv' | 'shoulder' {
    this.followMode = this.followMode === 'fpv' ? 'shoulder' : 'fpv';
    // 位置が大きく変わるのでスナップし直す
    this.followInitialized = false;
    // 一人称⇄肩越しで対象魚の表示状態を切り替える
    this.applyFollowVisibility();
    return this.followMode;
  }

  /**
   * 現在の魚視点スタイルを取得
   */
  public getFollowMode(): 'fpv' | 'shoulder' {
    return this.followMode;
  }

  /**
   * 魚視点（追従）モードを終了し、通常のOrbitControlsに戻す。
   */
  public stopFollow(): void {
    if (!this.followMesh) return;
    // 隠していた対象魚を必ず表示に戻す
    this.followMesh.visible = true;
    this.followMesh = null;
    this.followInitialized = false;
    this.controls.enabled = true;
    // 現在のカメラ位置を基準にOrbitControlsを再同期
    this.controls.update();
  }

  /**
   * 魚視点（追従）モード中かどうか
   */
  public isFollowing(): boolean {
    return this.followMesh !== null;
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
