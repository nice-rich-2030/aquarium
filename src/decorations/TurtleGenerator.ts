import * as THREE from 'three';
import { CreatureModelParams, DEFAULT_TURTLE_PARAMS } from '../types/decorations';

/**
 * 亀（ウミガメ）のプロシージャルジェネレーター
 *
 * +x を前方、+y を上、±z を左右とする。
 * 甲羅ドーム＋甲板（scute）＋縁甲板＋腹甲＋頭＋4本のヒレ脚＋尾で構成。
 * 前ヒレ（flipper-front-*）は遊泳アニメーションで羽ばたく。
 */
export class TurtleGenerator {
  public static generate(params: Partial<CreatureModelParams> = {}): THREE.Group {
    const { size } = { ...DEFAULT_TURTLE_PARAMS, ...params };
    const group = new THREE.Group();
    group.name = 'turtle';

    const r = 4 * size;
    const rx = r * 1.25; // 前後
    const ry = r * 0.62; // 高さ
    const rz = r * 1.0;  // 左右

    const shellMat = new THREE.MeshStandardMaterial({
      color: '#3c5a2c', roughness: 0.6, metalness: 0.05, flatShading: true, envMapIntensity: 0.5,
    });
    const scuteMat = new THREE.MeshStandardMaterial({
      color: '#52753a', roughness: 0.5, metalness: 0.05, flatShading: true, envMapIntensity: 0.6,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: '#2c3f1d', roughness: 0.75, metalness: 0.0, envMapIntensity: 0.3,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: '#5d6b3c', roughness: 0.6, metalness: 0.0, envMapIntensity: 0.4,
    });
    const plastronMat = new THREE.MeshStandardMaterial({
      color: '#c2b16a', roughness: 0.6, metalness: 0.0, envMapIntensity: 0.4,
    });

    // 甲羅ドーム（上半球を楕円に潰す）
    const shellGeo = new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    shellGeo.scale(rx, ry, rz);
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.castShadow = true;
    shell.receiveShadow = true;
    group.add(shell);

    // 縁甲板（甲羅外周のリム）
    const rimGeo = new THREE.TorusGeometry(r, r * 0.13, 8, 36);
    rimGeo.rotateX(Math.PI / 2);
    rimGeo.scale(1.25, 1.0, 1.0);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.y = ry * 0.12;
    rim.castShadow = true;
    group.add(rim);

    // 甲板（scute）を甲羅表面に貼る
    this.addScutes(group, scuteMat, rx, ry, rz, r);

    // 腹甲（下面の平らな板）
    const plastronGeo = new THREE.CircleGeometry(r * 0.92, 24);
    plastronGeo.rotateX(Math.PI / 2);
    plastronGeo.scale(1.2, 1.0, 0.95);
    const plastron = new THREE.Mesh(plastronGeo, plastronMat);
    plastron.position.y = 0.05;
    plastron.receiveShadow = true;
    group.add(plastron);

    // 頭＋首
    const headGroup = new THREE.Group();
    const neckGeo = new THREE.CylinderGeometry(r * 0.18, r * 0.22, r * 0.5, 10);
    neckGeo.rotateZ(Math.PI / 2);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.set(rx * 0.78, ry * 0.18, 0);
    headGroup.add(neck);

    const headGeo = new THREE.SphereGeometry(r * 0.28, 14, 12);
    headGeo.scale(1.4, 0.9, 0.85);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(rx * 1.05, ry * 0.2, 0);
    head.castShadow = true;
    headGroup.add(head);

    // 目
    const eyeGeo = new THREE.SphereGeometry(r * 0.05, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2, metalness: 0.3 });
    for (const sign of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(rx * 1.14, ry * 0.28, sign * r * 0.16);
      headGroup.add(eye);
    }
    group.add(headGroup);

    // 4本のヒレ脚
    const flipperGeo = this.createFlipperGeometry(r);
    const frontFlipperScale = 1.0;
    const backFlipperScale = 0.65;

    const flipperSpecs: { name: string; x: number; z: number; rotY: number; scale: number }[] = [
      { name: 'flipper-front-left',  x: rx * 0.55, z: rz * 0.7,  rotY: -0.5, scale: frontFlipperScale },
      { name: 'flipper-front-right', x: rx * 0.55, z: -rz * 0.7, rotY: 0.5,  scale: frontFlipperScale },
      { name: 'flipper-back-left',   x: -rx * 0.6, z: rz * 0.62, rotY: -2.4, scale: backFlipperScale },
      { name: 'flipper-back-right',  x: -rx * 0.6, z: -rz * 0.62, rotY: 2.4, scale: backFlipperScale },
    ];

    for (const spec of flipperSpecs) {
      const pivot = new THREE.Group();
      pivot.name = spec.name;
      pivot.position.set(spec.x, ry * 0.05, spec.z);
      pivot.rotation.y = spec.rotY;

      const flipper = new THREE.Mesh(flipperGeo, skinMat);
      flipper.scale.setScalar(spec.scale);
      flipper.castShadow = true;
      // 板の根元が pivot、外側へ伸ばす
      flipper.position.x = r * 0.5 * spec.scale;
      pivot.add(flipper);
      group.add(pivot);
    }

    // 尾
    const tailGeo = new THREE.ConeGeometry(r * 0.12, r * 0.6, 8);
    tailGeo.rotateZ(Math.PI / 2);
    const tail = new THREE.Mesh(tailGeo, skinMat);
    tail.position.set(-rx * 0.98, ry * 0.08, 0);
    group.add(tail);

    return group;
  }

  /**
   * 甲板（scute）を甲羅表面に配置
   */
  private static addScutes(
    group: THREE.Group,
    material: THREE.Material,
    rx: number, ry: number, rz: number, r: number
  ): void {
    // (方位角 u, 天頂角 v) で甲羅面上の位置を指定
    const specs: { u: number; v: number; s: number }[] = [
      { u: 0, v: 0.02, s: 0.9 },                 // 頂部
      { u: 0, v: 0.45, s: 0.95 }, { u: 0, v: 0.85, s: 0.85 },           // 前・背骨
      { u: Math.PI, v: 0.45, s: 0.95 }, { u: Math.PI, v: 0.85, s: 0.85 }, // 後・背骨
      { u: Math.PI / 2, v: 0.55, s: 0.8 }, { u: Math.PI / 2, v: 0.95, s: 0.7 },     // 右・肋
      { u: -Math.PI / 2, v: 0.55, s: 0.8 }, { u: -Math.PI / 2, v: 0.95, s: 0.7 },   // 左・肋
      { u: Math.PI / 4, v: 0.78, s: 0.7 }, { u: -Math.PI / 4, v: 0.78, s: 0.7 },
      { u: 3 * Math.PI / 4, v: 0.78, s: 0.7 }, { u: -3 * Math.PI / 4, v: 0.78, s: 0.7 },
    ];

    const up = new THREE.Vector3(0, 1, 0);
    for (const spec of specs) {
      const sinV = Math.sin(spec.v);
      const cosV = Math.cos(spec.v);
      const pos = new THREE.Vector3(
        rx * sinV * Math.cos(spec.u),
        ry * cosV,
        rz * sinV * Math.sin(spec.u)
      );

      // 楕円体の外向き法線（勾配）
      const normal = new THREE.Vector3(
        pos.x / (rx * rx),
        pos.y / (ry * ry),
        pos.z / (rz * rz)
      ).normalize();

      const scuteGeo = new THREE.CylinderGeometry(r * 0.22 * spec.s, r * 0.24 * spec.s, r * 0.06, 6);
      const scute = new THREE.Mesh(scuteGeo, material);
      scute.position.copy(pos).addScaledVector(normal, r * 0.02);
      scute.quaternion.setFromUnitVectors(up, normal);
      scute.castShadow = true;
      group.add(scute);
    }
  }

  /**
   * ヒレ脚のジオメトリ（平たい楕円板）
   */
  private static createFlipperGeometry(r: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const len = r * 1.1;
    const wid = r * 0.4;
    shape.moveTo(-len * 0.4, 0);
    shape.quadraticCurveTo(-len * 0.1, wid, len * 0.5, wid * 0.7);
    shape.quadraticCurveTo(len, wid * 0.2, len, 0);
    shape.quadraticCurveTo(len, -wid * 0.2, len * 0.5, -wid * 0.7);
    shape.quadraticCurveTo(-len * 0.1, -wid, -len * 0.4, 0);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: r * 0.08,
      bevelEnabled: true,
      bevelThickness: r * 0.04,
      bevelSize: r * 0.04,
      bevelSegments: 2,
    });
    geo.rotateX(Math.PI / 2);
    return geo;
  }

  /**
   * 遊泳アニメーション（ヒレの羽ばたき）を更新
   */
  public static updateSwim(group: THREE.Group, time: number): void {
    const flap = time * 1.4;
    group.traverse((child) => {
      if (child.name === 'flipper-front-left' || child.name === 'flipper-front-right') {
        // 前ヒレを大きく上下に羽ばたかせる
        child.rotation.z = Math.sin(flap) * 0.5;
      } else if (child.name === 'flipper-back-left' || child.name === 'flipper-back-right') {
        // 後ヒレは小さく、位相をずらして動かす
        child.rotation.z = Math.sin(flap + Math.PI * 0.5) * 0.2;
      }
    });
  }
}
