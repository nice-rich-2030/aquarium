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
  private causticsMaterial: THREE.ShaderMaterial | null = null;
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
    const light = this.directionalLight;

    // 斜め上から当てて、底面に魚の影が落ちるようにする
    light.position.set(size.x * 0.35, size.y * 1.8, size.z * 0.5);
    light.target.position.set(0, this.tankBounds.min.y, 0);
    this.group.add(light.target);

    // シャドウマップ設定
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);

    // 影を投影する正射影カメラを水槽全体に合わせる
    const cam = light.shadow.camera;
    const extent = Math.max(size.x, size.z) * 0.75;
    cam.left = -extent;
    cam.right = extent;
    cam.top = extent;
    cam.bottom = -extent;
    cam.near = 1;
    cam.far = size.y * 4;
    cam.updateProjectionMatrix();

    // シャドウアクネ抑制
    light.shadow.bias = -0.0005;
    light.shadow.normalBias = 0.5;
    light.shadow.radius = 3;
  }

  /**
   * コースティクス効果を作成（GPUフラグメントシェーダーで生成）
   *
   * 従来はCanvas2Dで256pxのVoronoiを毎フレームCPU計算していたが、
   * ドメインワーピングした正弦波をGPUで評価する方式に置き換え、
   * 解像度フリー・低負荷で揺らめく光の網を底面に投影する。
   */
  private createCaustics(): void {
    const size = this.tankBounds.getSize(new THREE.Vector3());

    this.causticsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: this.config.causticsIntensity },
        uColor: { value: new THREE.Color(0xaad8ff) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uIntensity;
        uniform vec3 uColor;

        void main() {
          // 底面を網目スケールにスケーリング
          vec2 uv = vUv * 9.0;
          float t = uTime * 0.6;

          // ドメインワーピングで揺らめきを作る
          for (int i = 1; i < 4; i++) {
            float fi = float(i);
            uv.x += 0.32 / fi * sin(fi * 1.8 * uv.y + t);
            uv.y += 0.32 / fi * cos(fi * 1.8 * uv.x + t * 1.1);
          }

          // 干渉縞 → 光の集中部分を鋭く
          float v = 0.5 + 0.5 * sin(uv.x) * sin(uv.y);
          v = pow(v, 4.0);

          gl_FragColor = vec4(uColor * v, v * uIntensity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // コースティクスを投影するプレーン（底面に配置）
    const geometry = new THREE.PlaneGeometry(size.x, size.z);
    this.causticsPlane = new THREE.Mesh(geometry, this.causticsMaterial);
    this.causticsPlane.rotation.x = -Math.PI / 2;
    this.causticsPlane.position.y = this.tankBounds.min.y + 0.15;
    this.causticsPlane.name = 'caustics';

    this.group.add(this.causticsPlane);
  }

  /**
   * 毎フレーム更新
   */
  public update(time: number): void {
    if (this.config.caustics && this.causticsMaterial) {
      this.causticsMaterial.uniforms.uTime.value = time;
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
    this.causticsMaterial?.dispose();
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
