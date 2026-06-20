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
  private bgMaterial?: THREE.ShaderMaterial; // 背景の海中ライトのアニメ用

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
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.9,
      thickness: 0.5,
      ior: 1.33, // 水の屈折率
      envMapIntensity: 1.0,
      side: THREE.BackSide,
    });

    // 前面
    const frontGeometry = new THREE.PlaneGeometry(width, height);
    const front = new THREE.Mesh(frontGeometry, material);
    front.position.set(0, 0, depth / 2);
    front.name = 'glass-front';
    this.group.add(front);

    // 背面ガラスは大きな背景面と二重に見えるため表示しない（背景で覆われる）

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
   * 背景を作成（時間で揺らぐ海中の光を表現するシェーダー）
   *
   * 縦グラデーションに加え、上から差すゴッドレイ（光の筋）がゆっくり揺れ、
   * 全体の明暗もゆるやかに呼吸する。色は config.backgroundColor を中間色に使う。
   */
  private createBackground(): void {
    const { width, height, depth, backgroundColor } = this.config;

    const mid = new THREE.Color(backgroundColor);
    const top = mid.clone().lerp(new THREE.Color('#2a6f8f'), 0.6); // 水面側は明るく
    const bottom = new THREE.Color('#00040a');                     // 深部は暗く

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTop: { value: new THREE.Vector3(top.r, top.g, top.b) },
        uMid: { value: new THREE.Vector3(mid.r, mid.g, mid.b) },
        uBottom: { value: new THREE.Vector3(bottom.r, bottom.g, bottom.b) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uTop;
        uniform vec3 uMid;
        uniform vec3 uBottom;
        varying vec2 vUv;
        void main() {
          float t = clamp(vUv.y, 0.0, 1.0);
          // 縦グラデーション（下:暗 → 中 → 上:明）
          vec3 col = t < 0.5 ? mix(uBottom, uMid, t * 2.0)
                             : mix(uMid, uTop, (t - 0.5) * 2.0);

          // ゴッドレイ（上から差す光の筋）。ゆっくり揺れ、上部ほど強い
          float s = sin(vUv.x * 8.0  + vUv.y * 1.5 + uTime * 0.35)
                  + sin(vUv.x * 15.0 - vUv.y * 1.0 + uTime * 0.22)
                  + sin(vUv.x * 23.0 + uTime * 0.15);
          s /= 3.0;
          float rays = smoothstep(0.35, 1.0, s) * t * t;
          col += rays * vec3(0.10, 0.18, 0.24);

          // 全体の明暗をゆるやかに呼吸させる
          float breath = 0.5 + 0.5 * sin(uTime * 0.12);
          col *= 0.88 + 0.18 * breath;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    this.bgMaterial = material;

    // 背面の背景（中心は同じまま、3倍に拡大）
    const geometry = new THREE.PlaneGeometry(width * 3, height * 3);
    const background = new THREE.Mesh(geometry, material);
    background.position.set(0, 0, -depth / 2 - 1);
    background.name = 'background';

    this.group.add(background);
  }

  /**
   * 毎フレーム更新（背景シェーダーの時間を進める）
   */
  public update(time: number): void {
    if (this.bgMaterial) {
      this.bgMaterial.uniforms.uTime.value = time;
    }
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
