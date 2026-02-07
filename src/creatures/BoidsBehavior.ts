import * as THREE from 'three';
import { CreatureInstance, BehaviorParams, DEFAULT_BEHAVIOR } from '../types/creatures';
import { clampMagnitude, randomInSphere } from '../utils/math';

interface SpatialCell {
  creatures: CreatureInstance[];
}

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
  public update(creatures: CreatureInstance[], delta: number): void {
    // 空間分割グリッドを再構築
    this.rebuildSpatialGrid(creatures);

    // 各個体の力を計算し速度・位置を更新
    for (const creature of creatures) {
      this.updateCreature(creature, delta);
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
  private updateCreature(creature: CreatureInstance, delta: number): void {
    const params = creature.behaviorParams;
    const collisionRadius = this.getCollisionRadius(creature);

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

    // 速度を更新
    creature.velocity.add(acceleration.multiplyScalar(delta));
    creature.velocity = clampMagnitude(creature.velocity, params.maxSpeed);

    // 位置を更新
    creature.position.add(creature.velocity.clone().multiplyScalar(delta));

    // 向きを速度方向に補間
    if (creature.velocity.length() > 0.1) {
      const targetRotation = new THREE.Quaternion();
      const matrix = new THREE.Matrix4();
      matrix.lookAt(
        new THREE.Vector3(),
        creature.velocity.clone().normalize(),
        new THREE.Vector3(0, 1, 0)
      );
      targetRotation.setFromRotationMatrix(matrix);

      creature.rotation.slerp(targetRotation, params.turnSpeed * delta);
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
