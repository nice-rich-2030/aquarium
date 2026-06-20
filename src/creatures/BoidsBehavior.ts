import * as THREE from 'three';
import { CreatureInstance, BehaviorParams, DEFAULT_BEHAVIOR } from '../types/creatures';
import { clampMagnitude, randomInSphere, headingToQuaternion } from '../utils/math';
import { FoodPellet } from './FeedingManager';

interface SpatialCell {
  creatures: CreatureInstance[];
}

/** 魚AIへ渡す餌情報（最寄りの餌を探し、食べたら消費する） */
export interface FeedingContext {
  pellets: FoodPellet[];
  consume(pellet: FoodPellet): void;
}

/** 魚モデルの前方（頭）はローカル -X 軸 */
const FISH_FORWARD = new THREE.Vector3(-1, 0, 0);

/**
 * Boidsアルゴリズムによる群泳AI
 *
 * 重なり防止のため3段階の仕組みを持つ:
 * 1. Separation力: 距離の2乗に反比例する強い反発力（全種対象）
 * 2. Alignment/Cohesion: 群泳制御（同種のみ）
 * 3. ハードコリジョン: 位置更新後に重なりを直接解消
 */
export class BoidsBehavior {
  private tankBounds: THREE.Box3;
  private spatialGrid: Map<string, SpatialCell> = new Map();
  private cellSize: number;
  private boundaryMargin: number = 10;

  constructor(tankBounds: THREE.Box3, cellSize?: number) {
    this.tankBounds = tankBounds;
    this.cellSize = cellSize || DEFAULT_BEHAVIOR.perceptionRadius;
  }

  /**
   * すべての生き物を更新
   */
  public update(
    creatures: CreatureInstance[],
    delta: number,
    feeding?: FeedingContext
  ): void {
    // 空間分割グリッドを再構築
    this.rebuildSpatialGrid(creatures);

    // 捕食者（サメなど）を抽出（少数前提なので毎フレーム線形探索で十分）
    const predators = creatures.filter((c) => c.isPredator);

    // 各個体の力を計算し速度・位置を更新
    for (const creature of creatures) {
      this.updateCreature(creature, delta, feeding, predators);
    }

    // ハードコリジョン解決（重なりが残っている場合に強制的に押し出す）
    this.rebuildSpatialGrid(creatures);
    this.resolveCollisions(creatures);
  }

  /**
   * 空間分割グリッドを再構築
   */
  private rebuildSpatialGrid(creatures: CreatureInstance[]): void {
    this.spatialGrid.clear();

    for (const creature of creatures) {
      const key = this.getCellKey(creature.position);
      let cell = this.spatialGrid.get(key);
      if (!cell) {
        cell = { creatures: [] };
        this.spatialGrid.set(key, cell);
      }
      cell.creatures.push(creature);
    }
  }

  /**
   * セルキーを取得
   */
  private getCellKey(position: THREE.Vector3): string {
    const x = Math.floor(position.x / this.cellSize);
    const y = Math.floor(position.y / this.cellSize);
    const z = Math.floor(position.z / this.cellSize);
    return `${x},${y},${z}`;
  }

  /**
   * 個体の衝突半径を取得（体サイズに基づく）
   */
  private getCollisionRadius(creature: CreatureInstance): number {
    return creature.size * 1.5;
  }

  /**
   * 群泳用の近傍を取得（同種のみ）
   */
  private getFlockNeighbors(
    creature: CreatureInstance,
    radius: number
  ): CreatureInstance[] {
    const neighbors: CreatureInstance[] = [];
    const cx = Math.floor(creature.position.x / this.cellSize);
    const cy = Math.floor(creature.position.y / this.cellSize);
    const cz = Math.floor(creature.position.z / this.cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cell = this.spatialGrid.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (!cell) continue;

          for (const candidate of cell.creatures) {
            if (candidate === creature) continue;
            if (candidate.definitionId !== creature.definitionId) continue;

            if (creature.position.distanceTo(candidate.position) < radius) {
              neighbors.push(candidate);
            }
          }
        }
      }
    }

    return neighbors;
  }

  /**
   * 衝突回避用の近傍を取得（全種対象）
   */
  private getAllNearby(
    creature: CreatureInstance,
    radius: number
  ): CreatureInstance[] {
    const neighbors: CreatureInstance[] = [];
    const cx = Math.floor(creature.position.x / this.cellSize);
    const cy = Math.floor(creature.position.y / this.cellSize);
    const cz = Math.floor(creature.position.z / this.cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cell = this.spatialGrid.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (!cell) continue;

          for (const candidate of cell.creatures) {
            if (candidate === creature) continue;

            if (creature.position.distanceTo(candidate.position) < radius) {
              neighbors.push(candidate);
            }
          }
        }
      }
    }

    return neighbors;
  }

  /**
   * 個体を更新
   */
  private updateCreature(
    creature: CreatureInstance,
    delta: number,
    feeding?: FeedingContext,
    predators: CreatureInstance[] = []
  ): void {
    const params = creature.behaviorParams;
    const collisionRadius = this.getCollisionRadius(creature);

    // 捕食者からの逃避力（自分が捕食者でない場合のみ）
    const flee = this.calculateFlee(creature, predators);
    const isFleeing = flee.lengthSq() > 1e-6;

    // 満腹タイマーを進める（>0 の間は餌に反応しない）
    if (creature.satietyTimer !== undefined && creature.satietyTimer > 0) {
      creature.satietyTimer -= delta;
    }

    // 摂餌：知覚範囲内で最寄りの餌を探す（満腹中は探さない）
    const foodTarget = this.findNearestFood(creature, feeding);

    // 群泳用近傍（同種のみ）
    const flockNeighbors = this.getFlockNeighbors(creature, params.perceptionRadius);

    // 衝突回避用近傍（全種、広めの範囲）
    const allNearby = this.getAllNearby(creature, collisionRadius * 4);

    // 分離力（全種対象、サイズベースの強い反発）
    const separation = this.calculateSeparation(creature, allNearby, collisionRadius);

    // 群泳力（同種のみ）
    const alignment = this.calculateAlignment(creature, flockNeighbors);
    const cohesion = this.calculateCohesion(creature, flockNeighbors);

    // 環境力
    const boundary = this.calculateBoundaryAvoidance(creature);
    const wander = this.calculateWander(params);

    // 力を合成（分離力の重みを大きく）
    const acceleration = new THREE.Vector3()
      .add(separation.multiplyScalar(params.separationWeight * 3.0))
      .add(alignment.multiplyScalar(params.alignmentWeight))
      .add(cohesion.multiplyScalar(params.cohesionWeight))
      .add(boundary.multiplyScalar(2.0))
      .add(wander);

    if (isFleeing) {
      // 逃避中：捕食者から離れる方向を最優先（摂餌・徘徊より強い）
      acceleration.add(flee.multiplyScalar(params.maxSpeed * 10));
    } else if (foodTarget) {
      // 摂餌：餌があれば最寄りの餌へ強く誘導（徘徊などより優先される）
      const toFood = foodTarget.position.clone().sub(creature.position).normalize();
      acceleration.add(toFood.multiplyScalar(params.maxSpeed * 6));
    }

    // --- ステアリング（操舵）---
    // Boids 力からは「行きたい速度（desired）」だけを求める。
    // 実際の移動は常に頭の向きへ行うことで、向きと進行方向を一致させる。
    const desiredVelocity = creature.velocity.clone().add(acceleration.multiplyScalar(delta));
    // 逃避中は恐怖で速度上限を引き上げる（パニックダッシュ）
    const speedCap = isFleeing ? params.maxSpeed * 1.6 : params.maxSpeed;
    let clampedDesired = clampMagnitude(desiredVelocity, speedCap);

    // クリックで誘発された反転アクション：
    // 一定時間、逆方向を目標として上書きする。頭が向き変えしてから泳ぎ出す
    // 新しい移動モデルにより、自然な「Uターン」として見える。
    if (creature.flipTimer !== undefined && creature.flipTimer > 0) {
      creature.flipTimer -= delta;
      const dir = creature.flipDir ?? FISH_FORWARD;
      clampedDesired = dir.clone().multiplyScalar(params.maxSpeed);
    }

    const desiredSpeed = clampedDesired.length();

    // 頭を目標方向へゆっくり旋回（速度方向ではなく頭で進む）
    if (desiredSpeed > 0.001) {
      const desiredDir = clampedDesired.clone().divideScalar(desiredSpeed);
      const targetRotation = headingToQuaternion(desiredDir);
      creature.rotation.slerp(targetRotation, Math.min(1, params.turnSpeed * delta));
    }

    // 現在頭が向いている方向（ローカル -X をワールドへ変換）
    const forward = FISH_FORWARD.clone().applyQuaternion(creature.rotation);

    // 頭と目標方向のズレに応じて減速：
    // 旋回中・反転中は遅く（頭を向けてから進む）、向きが整うと加速する。
    const headingDot =
      desiredSpeed > 0.001
        ? forward.dot(clampedDesired) / desiredSpeed
        : 1;
    const headingFactor = Math.max(0, Math.min(1, headingDot));
    const speed = desiredSpeed * (0.15 + 0.85 * headingFactor);

    // 速度は必ず頭の向きに沿わせる → 向きと進行方向が常に一致
    creature.velocity.copy(forward).multiplyScalar(speed);

    // 位置を更新
    creature.position.add(creature.velocity.clone().multiplyScalar(delta));

    // 摂餌：口先（頭=forward方向）が餌に届いたら食べる
    if (foodTarget && feeding) {
      const mouth = creature.position.clone().addScaledVector(forward, creature.size * 1.2);
      // 口先が餌にほぼ触れるまで近づいてから食べる（餌径ぶん＋わずか）
      if (mouth.distanceTo(foodTarget.position) < 0.5 + creature.size * 0.15) {
        feeding.consume(foodTarget);
        // 食べたら一定時間お腹いっぱい（餌に反応しなくなる）
        creature.satietyTimer = 60;
      }
    }

    // メッシュを更新
    creature.mesh.position.copy(creature.position);
    creature.mesh.quaternion.copy(creature.rotation);
  }

  /**
   * 分離力（全種対象）
   *
   * 2体の衝突半径の合計を最小距離とし、
   * その範囲内に入ると距離の2乗に反比例する急激な反発力を生じる。
   */
  private calculateSeparation(
    creature: CreatureInstance,
    nearby: CreatureInstance[],
    collisionRadius: number
  ): THREE.Vector3 {
    const force = new THREE.Vector3();

    for (const other of nearby) {
      const diff = creature.position.clone().sub(other.position);
      const distance = diff.length();

      if (distance < 0.001) {
        // 完全に同じ位置 → ランダム方向に強く押し出す
        force.add(randomInSphere(10));
        continue;
      }

      const otherRadius = this.getCollisionRadius(other);
      const minDistance = collisionRadius + otherRadius;

      if (distance < minDistance) {
        // 衝突範囲内: overlap^2 で急激に増大
        const overlap = 1 - (distance / minDistance);
        const strength = overlap * overlap * 20;
        force.add(diff.normalize().multiplyScalar(strength));
      } else if (distance < minDistance * 2.5) {
        // 接近範囲: 緩やかに回避
        const proximity = 1 - ((distance - minDistance) / (minDistance * 1.5));
        const strength = proximity * 2;
        force.add(diff.normalize().multiplyScalar(strength));
      }
    }

    return force;
  }

  /**
   * 整列（仲間と同じ方向を向く）
   */
  private calculateAlignment(
    creature: CreatureInstance,
    neighbors: CreatureInstance[]
  ): THREE.Vector3 {
    const force = new THREE.Vector3();
    if (neighbors.length === 0) return force;

    for (const neighbor of neighbors) {
      force.add(neighbor.velocity);
    }
    force.divideScalar(neighbors.length);
    force.sub(creature.velocity);

    return force;
  }

  /**
   * 結合（群れの中心に向かう）
   */
  private calculateCohesion(
    creature: CreatureInstance,
    neighbors: CreatureInstance[]
  ): THREE.Vector3 {
    const force = new THREE.Vector3();
    if (neighbors.length === 0) return force;

    const center = new THREE.Vector3();
    for (const neighbor of neighbors) {
      center.add(neighbor.position);
    }
    center.divideScalar(neighbors.length);

    force.copy(center).sub(creature.position);
    force.normalize();

    return force;
  }

  /**
   * 境界回避（壁に近づいたら中心へ）
   */
  private calculateBoundaryAvoidance(creature: CreatureInstance): THREE.Vector3 {
    const force = new THREE.Vector3();
    const pos = creature.position;
    const margin = this.boundaryMargin;

    if (pos.x < this.tankBounds.min.x + margin) {
      force.x = (margin - (pos.x - this.tankBounds.min.x)) / margin;
    } else if (pos.x > this.tankBounds.max.x - margin) {
      force.x = -(margin - (this.tankBounds.max.x - pos.x)) / margin;
    }

    if (pos.y < this.tankBounds.min.y + margin) {
      force.y = (margin - (pos.y - this.tankBounds.min.y)) / margin;
    } else if (pos.y > this.tankBounds.max.y - margin) {
      force.y = -(margin - (this.tankBounds.max.y - pos.y)) / margin;
    }

    if (pos.z < this.tankBounds.min.z + margin) {
      force.z = (margin - (pos.z - this.tankBounds.min.z)) / margin;
    } else if (pos.z > this.tankBounds.max.z - margin) {
      force.z = -(margin - (this.tankBounds.max.z - pos.z)) / margin;
    }

    return force;
  }

  /**
   * ランダム探索
   */
  private calculateWander(params: BehaviorParams): THREE.Vector3 {
    return randomInSphere(params.wanderStrength);
  }

  /**
   * 捕食者からの逃避力。
   *
   * 自分が捕食者でない場合、逃避半径（捕食者サイズ依存）内にいる捕食者から
   * 離れる方向の力を返す。近いほど強い。捕食者がいなければゼロベクトル。
   */
  private calculateFlee(
    creature: CreatureInstance,
    predators: CreatureInstance[]
  ): THREE.Vector3 {
    const force = new THREE.Vector3();
    if (creature.isPredator || predators.length === 0) return force;

    for (const predator of predators) {
      // 大きい捕食者ほど広い範囲で恐れられる
      const fleeRadius = predator.size * 5;
      const diff = creature.position.clone().sub(predator.position);
      const distance = diff.length();

      if (distance < fleeRadius && distance > 0.001) {
        // 近いほど強く（線形）。方向は捕食者の逆向き
        const strength = 1 - distance / fleeRadius;
        force.add(diff.normalize().multiplyScalar(strength));
      }
    }
    return force;
  }

  /**
   * 知覚範囲内で最寄りの餌を探す（なければ null）
   */
  private findNearestFood(
    creature: CreatureInstance,
    feeding?: FeedingContext
  ): FoodPellet | null {
    if (!feeding || feeding.pellets.length === 0) return null;

    // 捕食者（サメ）は魚の餌を食べない
    if (creature.isPredator) return null;

    // 満腹中は餌に気づかない
    if (creature.satietyTimer !== undefined && creature.satietyTimer > 0) return null;

    // 餌は通常の知覚より広めに気づく
    const feedRadius = creature.behaviorParams.perceptionRadius * 1.6;
    let best: FoodPellet | null = null;
    let bestDist = feedRadius;

    for (const pellet of feeding.pellets) {
      const d = creature.position.distanceTo(pellet.position);
      if (d < bestDist) {
        bestDist = d;
        best = pellet;
      }
    }
    return best;
  }

  /**
   * ハードコリジョン解決
   *
   * 力ベースの分離だけでは1フレーム内に重なりが残る場合がある。
   * 位置更新後に重なりを検出し、直接押し出して確実に解消する。
   */
  private resolveCollisions(creatures: CreatureInstance[]): void {
    for (const creature of creatures) {
      const radius = this.getCollisionRadius(creature);
      const nearby = this.getAllNearby(creature, radius * 3);

      for (const other of nearby) {
        const diff = creature.position.clone().sub(other.position);
        const distance = diff.length();

        if (distance < 0.001) {
          // 完全に同じ位置 → ランダムに分離
          creature.position.add(randomInSphere(radius));
          creature.mesh.position.copy(creature.position);
          continue;
        }

        const otherRadius = this.getCollisionRadius(other);
        const minDistance = radius + otherRadius;

        if (distance < minDistance) {
          // 重なり量の半分だけ自分を押し出す
          const overlap = minDistance - distance;
          const pushDir = diff.normalize();
          creature.position.add(pushDir.multiplyScalar(overlap * 0.5));
          creature.mesh.position.copy(creature.position);
        }
      }
    }
  }

  /**
   * 水槽の境界を更新
   */
  public setTankBounds(bounds: THREE.Box3): void {
    this.tankBounds = bounds;
  }
}
