import * as THREE from 'three';

// 更新コールバックの型
export type UpdateCallback = (delta: number, elapsed: number) => void;

/**
 * アニメーションループ管理クラス
 * requestAnimationFrameを使用したメインループを担当
 */
export class AnimationLoop {
  private clock: THREE.Clock;
  private callbacks: Set<UpdateCallback>;
  private renderCallback: (() => void) | null = null;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private maxDelta: number = 0.1; // タブ非アクティブ時対策

  constructor() {
    this.clock = new THREE.Clock();
    this.callbacks = new Set();
  }

  /**
   * レンダリングコールバックを設定
   */
  public setRenderCallback(callback: () => void): void {
    this.renderCallback = callback;
  }

  /**
   * 更新コールバックを追加
   */
  public addUpdateCallback(callback: UpdateCallback): void {
    this.callbacks.add(callback);
  }

  /**
   * 更新コールバックを削除
   */
  public removeUpdateCallback(callback: UpdateCallback): void {
    this.callbacks.delete(callback);
  }

  /**
   * ループ開始
   */
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.clock.start();
    this.tick();
  }

  /**
   * ループ停止
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.clock.stop();
  }

  /**
   * メインループ
   */
  private tick = (): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.tick);

    // delta時間計算（上限設定）
    let delta = this.clock.getDelta();
    if (delta > this.maxDelta) {
      delta = this.maxDelta;
    }

    const elapsed = this.clock.getElapsedTime();

    // すべての更新コールバックを呼び出し
    this.callbacks.forEach((callback) => {
      callback(delta, elapsed);
    });

    // レンダリング
    if (this.renderCallback) {
      this.renderCallback();
    }
  };

  /**
   * 経過時間を取得
   */
  public getElapsedTime(): number {
    return this.clock.getElapsedTime();
  }

  /**
   * ループ中かどうか
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 破棄
   */
  public dispose(): void {
    this.stop();
    this.callbacks.clear();
    this.renderCallback = null;
  }
}
