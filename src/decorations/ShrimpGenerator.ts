import * as THREE from 'three';
import { CreatureModelParams, DEFAULT_TURTLE_PARAMS } from '../types/decorations';

/**
 * エビのプロシージャルジェネレーター
 *
 * +x を前方とする。背側に弓なりの体・とがった額角（rostrum）・尾扇・
 * 長い触角（2本）・複数の脚・柄のある目。海底をゆっくり歩く想定。
 * 触角と脚は遊泳アニメで小刻みに揺れる。
 */
export class ShrimpGenerator {
  // 体の中心線（x-y、頭+xから尾-xへ弓なり）
  private static readonly CURVE: [number, number][] = [
    [1.7, 0.15], [1.0, 0.5], [0.0, 0.72], [-1.0, 0.55], [-1.7, 0.15],
  ];

  public static generate(params: Partial<CreatureModelParams> = {}): THREE.Group {
    const { size, color } = { ...DEFAULT_TURTLE_PARAMS, color: '#e6967f', ...params };
    const s = size;
    const group = new THREE.Group();
    group.name = 'shrimp';

    // 半透明のエビらしい体
    const bodyMat = new THREE.MeshStandardMaterial({
      color, roughness: 0.35, metalness: 0.0, transparent: true, opacity: 0.5,
      emissive: new THREE.Color(color).multiplyScalar(0.1), side: THREE.DoubleSide,
      depthWrite: false,
    });
    const limbMat = new THREE.MeshStandardMaterial({
      color: '#d98873', roughness: 0.5, transparent: true, opacity: 0.5, depthWrite: false,
    });
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#1a1212', roughness: 0.3 });

    // 体（弓なりのチューブ）
    const pts = this.CURVE.map(([x, y]) => new THREE.Vector3(x * s, y * s, 0));
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.42 * s, 10, false), bodyMat);
    tube.castShadow = true;
    group.add(tube);

    // 額角（rostrum・前方の尖り）
    const ros = new THREE.Mesh(new THREE.ConeGeometry(0.1 * s, 1.1 * s, 6), bodyMat);
    ros.rotation.z = -Math.PI / 2;
    ros.position.set(2.2 * s, 0.25 * s, 0);
    group.add(ros);

    // 尾扇（後端のフレア）
    const fanShape = new THREE.Shape();
    fanShape.moveTo(0, 0);
    fanShape.lineTo(-0.9 * s, 0.7 * s);
    fanShape.lineTo(-1.2 * s, 0);
    fanShape.lineTo(-0.9 * s, -0.7 * s);
    fanShape.lineTo(0, 0);
    const fan = new THREE.Mesh(new THREE.ShapeGeometry(fanShape), bodyMat);
    fan.position.set(-1.7 * s, 0.1 * s, 0);
    group.add(fan);

    // 目（柄付き・左右）
    for (const sign of [1, -1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 8, 8), eyeMat);
      eye.position.set(1.9 * s, 0.5 * s, sign * 0.28 * s);
      group.add(eye);
    }

    // 触角（長い・左右）。'shrimpAnt' で揺らす
    for (const sign of [1, -1]) {
      const ant = new THREE.Group();
      ant.name = 'shrimpAnt';
      ant.position.set(2.0 * s, 0.4 * s, sign * 0.2 * s);
      ant.userData.sign = sign;
      const len = 4.5 * s;
      const geo = new THREE.CylinderGeometry(0.02 * s, 0.05 * s, len, 4);
      geo.rotateZ(-Math.PI / 2);   // +x方向へ
      geo.translate(len / 2, 0, 0);
      const whip = new THREE.Mesh(geo, limbMat);
      ant.add(whip);
      ant.rotation.z = 0.25;
      ant.rotation.y = sign * 0.25;
      group.add(ant);
    }

    // 脚（下面に複数・小刻みに動く）。'shrimpLegs'
    const legs = new THREE.Group();
    legs.name = 'shrimpLegs';
    for (let i = 0; i < 5; i++) {
      const x = (0.9 - i * 0.45) * s;
      for (const sign of [1, -1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.04 * s, 0.7 * s, 4), limbMat);
        leg.position.set(x, -0.1 * s, sign * 0.25 * s);
        leg.rotation.x = sign * 0.5;
        leg.userData.base = leg.rotation.x;
        leg.userData.phase = i * 0.6 + (sign > 0 ? 0 : Math.PI);
        legs.add(leg);
      }
    }
    group.add(legs);

    return group;
  }

  /** 触角と脚の小刻みな揺れ */
  public static updateSwim(group: THREE.Group, time: number): void {
    group.traverse((child) => {
      if (child.name === 'shrimpAnt') {
        const sign = (child.userData.sign as number) || 1;
        child.rotation.z = 0.25 + Math.sin(time * 2 + sign) * 0.12;
        child.rotation.y = sign * (0.25 + Math.sin(time * 1.5) * 0.1);
      }
    });
    const legs = group.getObjectByName('shrimpLegs');
    if (legs) {
      for (const leg of legs.children) {
        const base = (leg.userData.base as number) || 0;
        const ph = (leg.userData.phase as number) || 0;
        leg.rotation.x = base + Math.sin(time * 5 + ph) * 0.25;
      }
    }
  }
}
