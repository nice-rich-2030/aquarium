import * as THREE from 'three';
import { TankConfig, DEFAULT_TANK_CONFIG } from '../types/config';

/**
 * 水槽本体クラス
 * ガラス壁、底砂、背景のメッシュを生成
 */
export class Tank {
  private group: THREE.Group;
  private config: TankConfig;
  private bounds: THREE.Box3;

  constructor(config: TankConfig = DEFAULT_TANK_CONFIG) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.name = 'tank';

    // 境界ボックスを計算
    this.bounds = new THREE.Box3(
      new THREE.Vector3(
        -config.width / 2,
        -config.height / 2,
        -config.depth / 2
      ),
      new THREE.Vector3(
        config.width / 2,
        config.height / 2,
        config.depth / 2
      )
    );

    this.createTank();
  }

  /**
   * 水槽を作成
   */
  private createTank(): void {
    this.createFloor();
    this.createGlassWalls();
    this.createBackground();
  }

  /**
   * 底面（砂）を作成
   */
  private createFloor(): void {
    const { width, depth, height, sandColor } = this.config;

    // 砂のジオメトリ
    const geometry = new THREE.PlaneGeometry(width, depth, 64, 64);

    // 頂点を少し凸凹に
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getY(i);
      const noise = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 0.5;
      positions.setZ(i, noise);
    }
    geometry.computeVertexNormals();

    // マテリアル
    const material = new THREE.MeshStandardMaterial({
      color: sandColor,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -height / 2;
    floor.name = 'floor';
    floor.receiveShadow = true;

    this.group.add(floor);
  }

  /**
   * ガラス壁を作成
   */
  private createGlassWalls(): void {
    const { width, height, depth, glassColor, glassOpacity } = this.config;

    const material = new THREE.MeshPhysicalMaterial({
      color: glassColor,
      transparent: true,
      opacity: glassOpacity,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.9,
      thickness: 0.5,
      side: THREE.BackSide,
    });

    // 前面
    const frontGeometry = new THREE.PlaneGeometry(width, height);
    const front = new THREE.Mesh(frontGeometry, material);
    front.position.set(0, 0, depth / 2);
    front.name = 'glass-front';
    this.group.add(front);

    // 背面
    const back = new THREE.Mesh(frontGeometry, material);
    back.position.set(0, 0, -depth / 2);
    back.rotation.y = Math.PI;
    back.name = 'glass-back';
    this.group.add(back);

    // 左側面
    const sideGeometry = new THREE.PlaneGeometry(depth, height);
    const left = new THREE.Mesh(sideGeometry, material);
    left.position.set(-width / 2, 0, 0);
    left.rotation.y = Math.PI / 2;
    left.name = 'glass-left';
    this.group.add(left);

    // 右側面
    const right = new THREE.Mesh(sideGeometry, material);
    right.position.set(width / 2, 0, 0);
    right.rotation.y = -Math.PI / 2;
    right.name = 'glass-right';
    this.group.add(right);
  }

  /**
   * 背景グラデーションを作成
   */
  private createBackground(): void {
    const { width, height, depth, backgroundColor } = this.config;

    // 背景は暗い青のグラデーション
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#001020');
    gradient.addColorStop(0.5, backgroundColor);
    gradient.addColorStop(1, '#000510');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);

    // 背面の背景
    const geometry = new THREE.PlaneGeometry(width * 1.5, height * 1.5);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.FrontSide,
    });

    const background = new THREE.Mesh(geometry, material);
    background.position.set(0, 0, -depth / 2 - 1);
    background.name = 'background';

    this.group.add(background);
  }

  /**
   * 水槽の境界ボックスを取得
   */
  public getBounds(): THREE.Box3 {
    return this.bounds.clone();
  }

  /**
   * 内部の移動可能範囲を取得（壁からのマージン付き）
   */
  public getSwimmableArea(margin: number = 5): THREE.Box3 {
    return new THREE.Box3(
      new THREE.Vector3(
        this.bounds.min.x + margin,
        this.bounds.min.y + margin,
        this.bounds.min.z + margin
      ),
      new THREE.Vector3(
        this.bounds.max.x - margin,
        this.bounds.max.y - margin,
        this.bounds.max.z - margin
      )
    );
  }

  /**
   * グループを取得
   */
  public getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * 設定を取得
   */
  public getConfig(): TankConfig {
    return this.config;
  }

  /**
   * 破棄
   */
  public dispose(): void {
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
