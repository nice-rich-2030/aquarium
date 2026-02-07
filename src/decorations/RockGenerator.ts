import * as THREE from 'three';
import { RockParams, DEFAULT_ROCK_PARAMS } from '../types/decorations';
import { perlin3D } from '../utils/noise';

/**
 * 岩のプロシージャルジェネレーター
 */
export class RockGenerator {
  /**
   * 岩のメッシュを生成
   */
  public static generate(params: Partial<RockParams> = {}): THREE.Group {
    const config = { ...DEFAULT_ROCK_PARAMS, ...params };
    const group = new THREE.Group();
    group.name = 'rock';

    // 基本形状（正二十面体）
    const geometry = new THREE.IcosahedronGeometry(
      config.baseRadius,
      config.subdivisions
    );

    // ノイズで変形
    this.applyNoise(geometry, config);

    // 法線を再計算
    geometry.computeVertexNormals();

    // マテリアル
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: config.roughness,
      metalness: 0.0,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    return group;
  }

  /**
   * ノイズで頂点を変形
   */
  private static applyNoise(
    geometry: THREE.IcosahedronGeometry,
    config: RockParams
  ): void {
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);

      // Perlinノイズで変位量を計算
      const noise = perlin3D(
        vertex.x * config.noiseScale,
        vertex.y * config.noiseScale,
        vertex.z * config.noiseScale
      );

      // 変位を適用
      const displacement = (1 + noise * config.noiseIntensity);
      vertex.multiplyScalar(displacement);

      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    positions.needsUpdate = true;
  }

  /**
   * 複数の岩をグループで生成
   */
  public static generateCluster(
    count: number,
    areaSize: number,
    params: Partial<RockParams> = {}
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'rock-cluster';

    for (let i = 0; i < count; i++) {
      const rock = this.generate({
        ...params,
        baseRadius: (params.baseRadius || DEFAULT_ROCK_PARAMS.baseRadius) *
          (0.5 + Math.random() * 0.8),
      });

      // ランダムな位置に配置
      rock.position.set(
        (Math.random() - 0.5) * areaSize,
        0,
        (Math.random() - 0.5) * areaSize
      );

      // ランダムな回転
      rock.rotation.set(
        Math.random() * Math.PI * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 0.3
      );

      group.add(rock);
    }

    return group;
  }
}
