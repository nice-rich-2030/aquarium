import * as THREE from 'three';
import { CreatureModelParams, DEFAULT_TURTLE_PARAMS } from '../types/decorations';
import { stoneTextures } from '../utils/textures';

/**
 * 巻貝のプロシージャルジェネレーター
 *
 * +x を前方とする。螺旋状の殻（らせんのチューブ）＋這う足＋頭＋2本の触角(目)。
 * 海底をごくゆっくり這う想定。触角がわずかに動く。
 */
export class SnailGenerator {
  public static generate(params: Partial<CreatureModelParams> = {}): THREE.Group {
    const { size, color } = { ...DEFAULT_TURTLE_PARAMS, color: '#b98a5a', ...params };
    const s = size;
    const group = new THREE.Group();
    group.name = 'snail';

    const { bump } = stoneTextures();
    const shellMat = new THREE.MeshStandardMaterial({
      color, roughness: 0.6, metalness: 0.0, bumpMap: bump, bumpScale: 0.08,
    });
    const footMat = new THREE.MeshStandardMaterial({ color: '#d8c4a0', roughness: 0.7 });

    // 殻：三角錐状に巻いた螺旋（基部が太く、頂点へ細る円錐スパイア）。
    // 基部(t=0)は大きな半径・低い位置、頂点(t=1)は小半径・高い位置。
    const pts: THREE.Vector3[] = [];
    const turns = 4;
    const steps = 72;
    const coneH = 3.4 * s;   // 円錐の高さ
    const bigR = 1.5 * s;    // 基部の巻き半径
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const ang = t * turns * Math.PI * 2;
      const rad = bigR * (1 - t) + 0.06 * s; // 上へ向かうほど巻きが細くなる
      pts.push(new THREE.Vector3(Math.cos(ang) * rad, t * coneH, Math.sin(ang) * rad));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    // 管の太さも基部側を太めに見せるため radiusSegments を確保しつつ一定半径
    const shellGeo = new THREE.TubeGeometry(curve, 110, 0.42 * s, 10, false);
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.castShadow = true;
    shell.receiveShadow = true;
    // 円錐の頂点を後ろ上方へ傾けて背負う
    shell.rotation.z = 0.55;
    shell.position.set(-0.4 * s, 0.7 * s, 0);
    group.add(shell);

    // 足（地を這う平たい土台）。貝から飛び出る部分は短く（0.5倍）
    const footGeo = new THREE.SphereGeometry(1, 16, 10);
    footGeo.scale(1.3 * s, 0.4 * s, 1.1 * s);
    const foot = new THREE.Mesh(footGeo, footMat);
    foot.position.set(0.2 * s, 0.35 * s, 0);
    foot.castShadow = true;
    foot.receiveShadow = true;
    group.add(foot);

    // 頭（前方の少し持ち上がった部分）。目は付けない（海中の巻貝）
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 12, 10), footMat);
    head.scale.set(1.2, 0.9, 0.9);
    head.position.set(1.2 * s, 0.45 * s, 0);
    group.add(head);

    return group;
  }

  /** 触角（目）のわずかな動き */
  public static updateSwim(group: THREE.Group, time: number): void {
    group.traverse((child) => {
      if (child.name === 'snailEye') {
        const sign = (child.userData.sign as number) || 1;
        child.rotation.z = -sign * 0.2 + Math.sin(time * 0.8 + sign) * 0.08;
        child.rotation.x = Math.sin(time * 0.6) * 0.06;
      }
    });
  }
}
