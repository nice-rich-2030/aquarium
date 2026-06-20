import * as THREE from 'three';

/** 1粒の餌 */
export interface FoodPellet {
  id: string;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  settled: boolean; // 底に着いたか
  age: number;      // 着底後の経過時間(秒)
}

/**
 * 餌やりシステム。
 *
 * - ダブルクリック位置に餌を出し、ゆっくり沈める
 * - 魚AI(BoidsBehavior)が最寄りの餌へ向かい、口先で食べる
 * - 着底した餌は一定時間で消える
 */
export class FeedingManager {
  private group: THREE.Group;
  private tankBounds: THREE.Box3;
  private pellets: FoodPellet[] = [];
  private nextId = 0;

  private geometry: THREE.SphereGeometry;
  private material: THREE.MeshStandardMaterial;

  // 沈降・寿命のパラメータ
  private gravity = 2;        // 沈む加速度
  private maxSinkSpeed = 2;   // 終端速度（落ちる速さの上限・小さいほどゆっくり）
  private settledLifetime = 10; // 着底後に消えるまでの秒数

  constructor(tankBounds: THREE.Box3) {
    this.tankBounds = tankBounds;
    this.group = new THREE.Group();
    this.group.name = 'food';

    // 餌の見た目（共有のジオメトリ・マテリアル）
    this.geometry = new THREE.SphereGeometry(0.45, 8, 6);
    this.material = new THREE.MeshStandardMaterial({
      color: '#c98a3c',
      roughness: 0.8,
      metalness: 0.0,
      emissive: '#3a2710',
      emissiveIntensity: 0.4,
    });
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  /** 水槽中心（ダブルクリックの投下面に使用） */
  public getCenter(): THREE.Vector3 {
    return this.tankBounds.getCenter(new THREE.Vector3());
  }

  /** 現在の餌一覧（AIが参照） */
  public getPellets(): FoodPellet[] {
    return this.pellets;
  }

  /**
   * 指定位置に餌を出す（水槽内にクランプ）
   */
  public spawn(position: THREE.Vector3): void {
    const pos = position.clone();
    const margin = 1;
    pos.x = THREE.MathUtils.clamp(pos.x, this.tankBounds.min.x + margin, this.tankBounds.max.x - margin);
    pos.y = THREE.MathUtils.clamp(pos.y, this.tankBounds.min.y + 0.5, this.tankBounds.max.y - margin);
    pos.z = THREE.MathUtils.clamp(pos.z, this.tankBounds.min.z + margin, this.tankBounds.max.z - margin);

    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.position.copy(pos);
    mesh.castShadow = false;
    this.group.add(mesh);

    this.pellets.push({
      id: `food_${this.nextId++}`,
      mesh,
      position: pos,
      velocity: new THREE.Vector3(0, 0, 0),
      settled: false,
      age: 0,
    });
  }

  /**
   * 餌を消費（魚が食べた／寿命切れ）
   */
  public consume(pellet: FoodPellet): void {
    const idx = this.pellets.indexOf(pellet);
    if (idx === -1) return;
    this.group.remove(pellet.mesh);
    this.pellets.splice(idx, 1);
  }

  /**
   * 毎フレーム更新（沈降と寿命）
   */
  public update(delta: number): void {
    const floorY = this.tankBounds.min.y + 0.5;

    for (let i = this.pellets.length - 1; i >= 0; i--) {
      const p = this.pellets[i];

      if (!p.settled) {
        p.velocity.y -= this.gravity * delta;
        if (p.velocity.y < -this.maxSinkSpeed) p.velocity.y = -this.maxSinkSpeed;
        p.position.addScaledVector(p.velocity, delta);

        if (p.position.y <= floorY) {
          p.position.y = floorY;
          p.settled = true;
          p.age = 0;
        }
        p.mesh.position.copy(p.position);
      } else {
        p.age += delta;
        if (p.age > this.settledLifetime) {
          this.consume(p);
        }
      }
    }
  }

  public dispose(): void {
    for (const p of this.pellets) {
      this.group.remove(p.mesh);
    }
    this.pellets = [];
    this.geometry.dispose();
    this.material.dispose();
  }
}
