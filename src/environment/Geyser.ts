import * as THREE from 'three';

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

/**
 * 噴出口（ジェット）エフェクト。
 *
 * 砂地の1点から水（泡）が勢いよく噴き上がり、足元の砂も巻き上がる。
 * 水粒子は上向き速度＋わずかな横拡散で立ち上り、上端で消えて根元から再噴出。
 * 砂粒子は低めに舞い上がってから重力で落ちる。噴出量は周期的に脈動する。
 *
 * InstancedMesh で軽量に描画し、毎フレーム位置・スケールのみ更新する。
 */
export class Geyser {
  private group: THREE.Group;
  private base: THREE.Vector3;

  private water: Particle[] = [];
  private sand: Particle[] = [];
  private waterMesh: THREE.InstancedMesh;
  private sandMesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();

  private readonly maxHeight: number;
  private readonly waterCount = 48;
  private readonly sandCount = 18;
  private elapsed = 0;

  constructor(position: { x: number; y: number; z: number }, maxHeight = 18) {
    this.base = new THREE.Vector3(position.x, position.y, position.z);
    this.maxHeight = maxHeight;
    this.group = new THREE.Group();
    this.group.name = 'geyser';

    // 水（泡）
    const waterGeo = new THREE.SphereGeometry(0.4, 6, 5);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#dff0f6', roughness: 0.2, metalness: 0.0,
      transparent: true, opacity: 0.6, emissive: '#bfe0ea', emissiveIntensity: 0.2,
      depthWrite: false,
    });
    this.waterMesh = new THREE.InstancedMesh(waterGeo, waterMat, this.waterCount);
    this.waterMesh.frustumCulled = false;
    this.group.add(this.waterMesh);

    // 砂
    const sandGeo = new THREE.SphereGeometry(0.28, 5, 4);
    const sandMat = new THREE.MeshStandardMaterial({ color: '#cdb98c', roughness: 1.0, metalness: 0.0 });
    this.sandMesh = new THREE.InstancedMesh(sandGeo, sandMat, this.sandCount);
    this.sandMesh.frustumCulled = false;
    this.group.add(this.sandMesh);

    // 小さな砂のマウンド（噴出口らしさ）
    const moundGeo = new THREE.ConeGeometry(2.4, 1.0, 14, 1, true);
    const moundMat = new THREE.MeshStandardMaterial({ color: '#b8a276', roughness: 1.0 });
    const mound = new THREE.Mesh(moundGeo, moundMat);
    mound.position.copy(this.base).add(new THREE.Vector3(0, 0.5, 0));
    this.group.add(mound);

    for (let i = 0; i < this.waterCount; i++) this.water.push(this.spawnWater(true));
    for (let i = 0; i < this.sandCount; i++) this.sand.push(this.spawnSand(true));
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * 噴出の脈動。
   * 平常はゆるい強弱（~0.9）だが、約10秒ごとに短い大噴出（ピーク~1.3）で
   * 通常の約2倍の高さまで噴き上がる（高さは初速の2乗にほぼ比例）。
   */
  private pulse(): number {
    const gentle = 0.9 + 0.1 * Math.sin(this.elapsed * 1.2);
    const period = 10;             // 大噴出の周期(秒)
    const dur = 1.8;               // 大噴出が続く時間(秒)
    const t = this.elapsed % period;
    const burst = t < dur ? Math.sin((t / dur) * Math.PI) : 0; // 0→1→0
    return gentle + burst * 0.4;   // 平常~0.9 → 噴出ピーク~1.3
  }

  private spawnWater(initial = false): Particle {
    const r = Math.random() * 0.8;
    const a = Math.random() * Math.PI * 2;
    const p = this.pulse();
    return {
      pos: this.base.clone().add(new THREE.Vector3(Math.cos(a) * r, initial ? Math.random() * this.maxHeight : 0, Math.sin(a) * r)),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 2.5,
        (16 + Math.random() * 10) * p,
        (Math.random() - 0.5) * 2.5
      ),
      life: 0,
      maxLife: 2.6 + Math.random() * 1.2, // 大噴出でも頂点まで届く長さ
      size: 0.6 + Math.random() * 0.8,
    };
  }

  private spawnSand(initial = false): Particle {
    const r = Math.random() * 1.2;
    const a = Math.random() * Math.PI * 2;
    return {
      pos: this.base.clone().add(new THREE.Vector3(Math.cos(a) * r, initial ? Math.random() * 4 : 0, Math.sin(a) * r)),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        8 + Math.random() * 6,
        (Math.random() - 0.5) * 3
      ),
      life: 0,
      maxLife: 1.0 + Math.random() * 0.6,
      size: 0.6 + Math.random() * 0.7,
    };
  }

  update(delta: number, elapsed: number): void {
    this.elapsed = elapsed;

    // 水：上昇しつつ減速、上端/寿命で再噴出。上ほど縮小して消える。
    for (let i = 0; i < this.water.length; i++) {
      const pt = this.water[i];
      pt.vel.y -= 9 * delta; // ゆるい重力で弧を描く
      pt.pos.addScaledVector(pt.vel, delta);
      pt.life += delta;

      const h = pt.pos.y - this.base.y;
      // 高さ上限では切らず、頂点(vel.y<0)か寿命で再噴出 → 大噴出時は高くまで届く
      if (pt.life > pt.maxLife || pt.vel.y < 0) {
        this.water[i] = this.spawnWater();
      }

      const fade = THREE.MathUtils.clamp(1 - h / (this.maxHeight * 2.2), 0.12, 1);
      this.dummy.position.copy(this.water[i].pos);
      this.dummy.scale.setScalar(this.water[i].size * fade);
      this.dummy.updateMatrix();
      this.waterMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.waterMesh.instanceMatrix.needsUpdate = true;

    // 砂：舞い上がって重力で落下。地面に戻ったら再噴出。
    for (let i = 0; i < this.sand.length; i++) {
      const pt = this.sand[i];
      pt.vel.y -= 22 * delta; // 強い重力
      pt.pos.addScaledVector(pt.vel, delta);
      pt.life += delta;

      if (pt.life > pt.maxLife || pt.pos.y < this.base.y) {
        this.sand[i] = this.spawnSand();
      }

      this.dummy.position.copy(this.sand[i].pos);
      this.dummy.scale.setScalar(this.sand[i].size);
      this.dummy.updateMatrix();
      this.sandMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.sandMesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.waterMesh.geometry.dispose();
    (this.waterMesh.material as THREE.Material).dispose();
    this.sandMesh.geometry.dispose();
    (this.sandMesh.material as THREE.Material).dispose();
  }
}
