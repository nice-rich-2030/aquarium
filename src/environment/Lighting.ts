import * as THREE from 'three';
import { LightingConfig, DEFAULT_LIGHTING_CONFIG } from '../types/config';

/**
 * ライティングクラス
 * 環境光、太陽光、コースティクス投影を担当
 */
export class Lighting {
  private group: THREE.Group;
  private config: LightingConfig;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private causticsPlane: THREE.Mesh | null = null;
  private causticsTexture: THREE.CanvasTexture | null = null;
  private tankBounds: THREE.Box3;

  constructor(tankBounds: THREE.Box3, config: LightingConfig = DEFAULT_LIGHTING_CONFIG) {
    this.config = config;
    this.tankBounds = tankBounds;
    this.group = new THREE.Group();
    this.group.name = 'lighting';

    // 環境光
    this.ambientLight = new THREE.AmbientLight(
      config.ambientColor,
      config.ambientIntensity
    );
    this.group.add(this.ambientLight);

    // 太陽光（上からの主光源）
    this.directionalLight = new THREE.DirectionalLight(
      config.sunColor,
      config.sunIntensity
    );
    this.setupDirectionalLight();
    this.group.add(this.directionalLight);

    // コースティクス
    if (config.caustics) {
      this.createCaustics();
    }
  }

  /**
   * 太陽光の設定
   */
  private setupDirectionalLight(): void {
    const size = this.tankBounds.getSize(new THREE.Vector3());

    this.directionalLight.position.set(0, size.y * 2, 0);
    this.directionalLight.target.position.set(0, 0, 0);
    this.group.add(this.directionalLight.target);
  }

  /**
   * コースティクス効果を作成
   */
  private createCaustics(): void {
    const size = this.tankBounds.getSize(new THREE.Vector3());

    // コースティクステクスチャをキャンバスで生成
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    this.causticsTexture = new THREE.CanvasTexture(canvas);
    this.causticsTexture.wrapS = THREE.RepeatWrapping;
    this.causticsTexture.wrapT = THREE.RepeatWrapping;

    // 初期テクスチャを描画
    this.updateCausticsTexture(0);

    // コースティクスを投影するプレーン（底面に配置）
    const geometry = new THREE.PlaneGeometry(size.x, size.z);
    const material = new THREE.MeshBasicMaterial({
      map: this.causticsTexture,
      transparent: true,
      opacity: this.config.causticsIntensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.causticsPlane = new THREE.Mesh(geometry, material);
    this.causticsPlane.rotation.x = -Math.PI / 2;
    this.causticsPlane.position.y = this.tankBounds.min.y + 0.1;
    this.causticsPlane.name = 'caustics';

    this.group.add(this.causticsPlane);
  }

  /**
   * コースティクステクスチャを更新
   */
  private updateCausticsTexture(time: number): void {
    if (!this.causticsTexture) return;

    const canvas = this.causticsTexture.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;

    // クリア
    ctx.clearRect(0, 0, width, height);

    // Voronoi風のコースティクスパターンを描画
    const cellSize = 32;
    const cells: { x: number; y: number }[] = [];

    // セルの中心点を生成（時間で動く）
    for (let i = 0; i < 64; i++) {
      const baseX = (i % 8) * cellSize + cellSize / 2;
      const baseY = Math.floor(i / 8) * cellSize + cellSize / 2;
      cells.push({
        x: baseX + Math.sin(time * 0.5 + i * 0.5) * 8,
        y: baseY + Math.cos(time * 0.4 + i * 0.7) * 8,
      });
    }

    // 各ピクセルについて最も近いセルとの距離を計算
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minDist = Infinity;
        let secondMinDist = Infinity;

        for (const cell of cells) {
          const dx = x - cell.x;
          const dy = y - cell.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < minDist) {
            secondMinDist = minDist;
            minDist = dist;
          } else if (dist < secondMinDist) {
            secondMinDist = dist;
          }
        }

        // 境界部分を明るく（コースティクスの光の集中）
        const edge = secondMinDist - minDist;
        const brightness = Math.pow(1 - Math.min(edge / 15, 1), 3) * 255;

        const idx = (y * width + x) * 4;
        data[idx] = brightness * 0.8;     // R
        data[idx + 1] = brightness * 0.9; // G
        data[idx + 2] = brightness;       // B
        data[idx + 3] = brightness * 0.5; // A
      }
    }

    ctx.putImageData(imageData, 0, 0);
    this.causticsTexture.needsUpdate = true;
  }

  /**
   * 毎フレーム更新
   */
  public update(time: number): void {
    if (this.config.caustics && this.causticsTexture) {
      this.updateCausticsTexture(time);
    }
  }

  /**
   * ライト強度を設定
   */
  public setIntensity(ambient: number, sun: number): void {
    this.ambientLight.intensity = ambient;
    this.directionalLight.intensity = sun;
  }

  /**
   * コースティクスの有効/無効
   */
  public setCausticsEnabled(enabled: boolean): void {
    if (this.causticsPlane) {
      this.causticsPlane.visible = enabled;
    }
    this.config.caustics = enabled;
  }

  /**
   * グループを取得
   */
  public getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * 破棄
   */
  public dispose(): void {
    this.causticsTexture?.dispose();
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
    });
  }
}
