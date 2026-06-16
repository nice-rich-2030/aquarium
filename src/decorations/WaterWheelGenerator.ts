import * as THREE from 'three';
import { WaterWheelParams, DEFAULT_WATERWHEEL_PARAMS } from '../types/decorations';

/**
 * 水車のプロシージャルジェネレーター
 *
 * 回転する車輪部（name='wheel'）と、固定の支柱部（フレーム）で構成する。
 * DecorationManager が animation.type === 'rotate' のとき 'wheel' を回す。
 * 原点は車輪の回転中心。支柱は下方向に伸びて底面へ接地する。
 */
export class WaterWheelGenerator {
  public static generate(params: Partial<WaterWheelParams> = {}): THREE.Group {
    const config = { ...DEFAULT_WATERWHEEL_PARAMS, ...params };
    const group = new THREE.Group();
    group.name = 'waterwheel';

    group.add(this.createWheel(config));
    group.add(this.createFrame(config));

    return group;
  }

  /**
   * 回転する車輪部
   */
  private static createWheel(config: WaterWheelParams): THREE.Group {
    const wheel = new THREE.Group();
    wheel.name = 'wheel';

    const { radius, width, paddleCount } = config;
    const halfWidth = width / 2;

    const woodMaterial = new THREE.MeshStandardMaterial({
      color: config.woodColor,
      roughness: 0.75,
      metalness: 0.0,
      envMapIntensity: 0.5,
    });
    const hubMaterial = new THREE.MeshStandardMaterial({
      color: config.hubColor,
      roughness: 0.5,
      metalness: 0.6,
      envMapIntensity: 0.8,
    });

    // 中心軸（hub）— z軸方向に向ける
    const hubGeometry = new THREE.CylinderGeometry(
      radius * 0.12,
      radius * 0.12,
      width * 1.25,
      16
    );
    hubGeometry.rotateX(Math.PI / 2);
    wheel.add(new THREE.Mesh(hubGeometry, hubMaterial));

    // 左右の外周リング（トーラス、z軸周り）
    const ringGeometry = new THREE.TorusGeometry(radius, radius * 0.06, 12, 48);
    for (const z of [-halfWidth, halfWidth]) {
      const ring = new THREE.Mesh(ringGeometry, woodMaterial);
      ring.position.z = z;
      wheel.add(ring);
    }

    // スポークと羽根（パドル）を放射状に配置
    const spokeGeometry = new THREE.BoxGeometry(radius * 1.9, radius * 0.06, radius * 0.06);
    const paddleGeometry = new THREE.BoxGeometry(
      radius * 0.04,
      radius * 0.45,
      width
    );

    for (let i = 0; i < paddleCount; i++) {
      const angle = (i / paddleCount) * Math.PI * 2;

      // スポーク（中心を貫く梁を兼ねる。半数だけ置いて重複を避ける）
      if (i < paddleCount / 2) {
        const spoke = new THREE.Mesh(spokeGeometry, woodMaterial);
        spoke.rotation.z = angle;
        for (const z of [-halfWidth, halfWidth]) {
          const s = spoke.clone();
          s.position.z = z;
          wheel.add(s);
        }
      }

      // 羽根（外周に接線方向で取り付け）
      const paddle = new THREE.Mesh(paddleGeometry, woodMaterial);
      paddle.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0
      );
      paddle.rotation.z = angle;
      wheel.add(paddle);
    }

    return wheel;
  }

  /**
   * 固定の支柱部（A字フレーム）
   */
  private static createFrame(config: WaterWheelParams): THREE.Group {
    const frame = new THREE.Group();
    frame.name = 'frame';

    const { radius, width } = config;
    const legLength = radius * 1.35;
    const halfWidth = width / 2 + 1;

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: config.frameColor,
      roughness: 0.8,
      metalness: 0.0,
      envMapIntensity: 0.4,
    });

    const legGeometry = new THREE.BoxGeometry(radius * 0.12, legLength, radius * 0.12);

    // 軸の両側に2本ずつ、ハの字に開いた脚で支える
    for (const z of [-halfWidth, halfWidth]) {
      for (const dir of [-1, 1]) {
        const leg = new THREE.Mesh(legGeometry, frameMaterial);
        // 上端を回転中心付近、下端を外側へ開く
        leg.position.set(dir * radius * 0.35, -legLength / 2, z);
        leg.rotation.z = dir * 0.32;
        frame.add(leg);
      }
    }

    // 軸受けの横木（左右の脚をつなぐ）
    const beamGeometry = new THREE.BoxGeometry(radius * 0.12, radius * 0.12, width + 2);
    const beam = new THREE.Mesh(beamGeometry, frameMaterial);
    frame.add(beam);

    return frame;
  }
}
