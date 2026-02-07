import * as THREE from 'three';

/**
 * レンダラー管理クラス
 * WebGLRendererの設定、リサイズ対応を担当
 */
export class AquariumRenderer {
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;

    // WebGLRenderer作成
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });

    this.setupRenderer();
    this.addToContainer();
    this.setupResizeHandler();
  }

  /**
   * レンダラーの初期設定
   */
  private setupRenderer(): void {
    // ピクセル比設定（モバイル対応で2までに制限）
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(pixelRatio);

    // サイズ設定
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );

    // 出力設定
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // 影設定（必要に応じて有効化）
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  /**
   * コンテナにcanvasを追加
   */
  private addToContainer(): void {
    this.container.appendChild(this.renderer.domElement);
  }

  /**
   * リサイズハンドラーの設定
   */
  private setupResizeHandler(): void {
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * リサイズ処理
   */
  public resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.setSize(width, height);
  }

  /**
   * シーンとカメラで1フレーム描画
   */
  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  /**
   * canvasのサイズを取得
   */
  public getSize(): { width: number; height: number } {
    return {
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    };
  }

  /**
   * DOM要素を取得
   */
  public getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /**
   * WebGLRendererインスタンスを取得
   */
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * アスペクト比を取得
   */
  public getAspect(): number {
    const size = this.getSize();
    return size.width / size.height;
  }

  /**
   * トーンマッピング露出を設定
   */
  public setExposure(value: number): void {
    this.renderer.toneMappingExposure = value;
  }

  /**
   * レンダラーの破棄
   */
  public dispose(): void {
    window.removeEventListener('resize', () => this.resize());
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
