import * as THREE from 'three';
import { ParticleConfig, DEFAULT_PARTICLE_CONFIG } from '../types/config';

interface Bubble {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  wobble: number;
}

interface Dust {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
}

/**
 * パーティクルシステム
 * 泡と浮遊物（塵）を管理
 */
export class Particles {
  private group: THREE.Group;
  private config: ParticleConfig;
  private tankBounds: THREE.Box3;

  // 泡
  private bubbles: Bubble[] = [];
  private bubbleGeometry: THREE.SphereGeometry;
  private bubbleMaterial: THREE.MeshPhysicalMaterial;
  private bubbleMesh: THREE.InstancedMesh;

  // 浮遊物
  private dusts: Dust[] = [];
  private dustGeometry: THREE.SphereGeometry;
  private dustMaterial: THREE.MeshBasicMaterial;
  private dustMesh: THREE.InstancedMesh;

  private dummy: THREE.Object3D = new THREE.Object3D();

  constructor(tankBounds: THREE.Box3, config: ParticleConfig = DEFAULT_PARTICLE_CONFIG) {
    this.config = config;
    this.tankBounds = tankBounds;
    this.group = new THREE.Group();
    this.group.name = 'particles';

    // 泡のセットアップ
    this.bubbleGeometry = new THREE.SphereGeometry(1, 8, 8);
    this.bubbleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      roughness: 0.0,
      metalness: 0.0,
      transmission: 0.8,
    });
    this.bubbleMesh = new THREE.InstancedMesh(
      this.bubbleGeometry,
      this.bubbleMaterial,
      config.bubbleCount
    );
    this.bubbleMesh.name = 'bubbles';
    this.group.add(this.bubbleMesh);

    // 浮遊物のセットアップ
    this.dustGeometry = new THREE.SphereGeometry(0.1, 4, 4);
    this.dustMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
    });
    this.dustMesh = new THREE.InstancedMesh(
      this.dustGeometry,
      this.dustMaterial,
      config.dustCount
    );
    this.dustMesh.name = 'dust';
    this.group.add(this.dustMesh);

    this.initBubbles();
    this.initDust();
  }

  /**
   * 泡を初期化
   */
  private initBubbles(): void {
    const size = this.tankBounds.getSize(new THREE.Vector3());
    const center = this.tankBounds.getCenter(new THREE.Vector3());

    for (let i = 0; i < this.config.bubbleCount; i++) {
      const bubble: Bubble = {
        position: new THREE.Vector3(
          center.x + (Math.random() - 0.5) * size.x * 0.8,
          this.tankBounds.min.y + Math.random() * size.y,
          center.z + (Math.random() - 0.5) * size.z * 0.8
        ),
        velocity: new THREE.Vector3(
          0,
          this.config.bubbleSpeed * (0.5 + Math.random() * 0.5),
          0
        ),
        size:
          this.config.bubbleSize.min +
          Math.random() * (this.config.bubbleSize.max - this.config.bubbleSize.min),
        wobble: Math.random() * Math.PI * 2,
      };
      this.bubbles.push(bubble);
    }
  }

  /**
   * 浮遊物を初期化
   */
  private initDust(): void {
    const size = this.tankBounds.getSize(new THREE.Vector3());
    const center = this.tankBounds.getCenter(new THREE.Vector3());

    for (let i = 0; i < this.config.dustCount; i++) {
      const dust: Dust = {
        position: new THREE.Vector3(
          center.x + (Math.random() - 0.5) * size.x * 0.9,
          center.y + (Math.random() - 0.5) * size.y * 0.9,
          center.z + (Math.random() - 0.5) * size.z * 0.9
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * this.config.dustSpeed,
          (Math.random() - 0.5) * this.config.dustSpeed * 0.5,
          (Math.random() - 0.5) * this.config.dustSpeed
        ),
      };
      this.dusts.push(dust);
    }
  }

  /**
   * 毎フレーム更新
   */
  public update(delta: number, elapsed: number): void {
    this.updateBubbles(delta, elapsed);
    this.updateDust(delta, elapsed);
  }

  /**
   * 泡を更新
   */
  private updateBubbles(delta: number, _elapsed: number): void {
    const size = this.tankBounds.getSize(new THREE.Vector3());
    const center = this.tankBounds.getCenter(new THREE.Vector3());

    for (let i = 0; i < this.bubbles.length; i++) {
      const bubble = this.bubbles[i];

      // 上昇
      bubble.position.y += bubble.velocity.y * delta;

      // 横揺れ
      bubble.wobble += delta * 3;
      bubble.position.x += Math.sin(bubble.wobble) * delta * 0.5;
      bubble.position.z += Math.cos(bubble.wobble * 0.7) * delta * 0.3;

      // 水面に達したらリセット
      if (bubble.position.y > this.tankBounds.max.y - 1) {
        bubble.position.set(
          center.x + (Math.random() - 0.5) * size.x * 0.8,
          this.tankBounds.min.y,
          center.z + (Math.random() - 0.5) * size.z * 0.8
        );
        bubble.wobble = Math.random() * Math.PI * 2;
      }

      // インスタンス行列を更新
      this.dummy.position.copy(bubble.position);
      this.dummy.scale.setScalar(bubble.size);
      this.dummy.updateMatrix();
      this.bubbleMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.bubbleMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * 浮遊物を更新
   */
  private updateDust(delta: number, _elapsed: number): void {

    for (let i = 0; i < this.dusts.length; i++) {
      const dust = this.dusts[i];

      // ブラウン運動（ランダムな微小移動）
      dust.velocity.x += (Math.random() - 0.5) * delta * 0.5;
      dust.velocity.y += (Math.random() - 0.5) * delta * 0.3;
      dust.velocity.z += (Math.random() - 0.5) * delta * 0.5;

      // 速度を減衰
      dust.velocity.multiplyScalar(0.98);

      // 位置更新
      dust.position.add(dust.velocity.clone().multiplyScalar(delta));

      // 境界チェック
      if (dust.position.x < this.tankBounds.min.x + 5) {
        dust.velocity.x = Math.abs(dust.velocity.x);
      }
      if (dust.position.x > this.tankBounds.max.x - 5) {
        dust.velocity.x = -Math.abs(dust.velocity.x);
      }
      if (dust.position.y < this.tankBounds.min.y + 5) {
        dust.velocity.y = Math.abs(dust.velocity.y);
      }
      if (dust.position.y > this.tankBounds.max.y - 5) {
        dust.velocity.y = -Math.abs(dust.velocity.y);
      }
      if (dust.position.z < this.tankBounds.min.z + 5) {
        dust.velocity.z = Math.abs(dust.velocity.z);
      }
      if (dust.position.z > this.tankBounds.max.z - 5) {
        dust.velocity.z = -Math.abs(dust.velocity.z);
      }

      // インスタンス行列を更新
      this.dummy.position.copy(dust.position);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.dustMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.dustMesh.instanceMatrix.needsUpdate = true;
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
    this.bubbleGeometry.dispose();
    this.bubbleMaterial.dispose();
    this.dustGeometry.dispose();
    this.dustMaterial.dispose();
  }
}
