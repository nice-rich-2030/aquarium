import * as THREE from 'three';
import { CreatureModelParams, DEFAULT_TURTLE_PARAMS } from '../types/decorations';
import { morayTextures } from '../utils/textures';

/**
 * ウツボのプロシージャルジェネレーター
 *
 * 砂・岩の隙間から上半身だけを出して潜む「ヌシ」。
 * 体は地中から立ち上がって前方(+x)へ伸び、頭がゆらゆら首を振り、
 * 口を開閉して威嚇する。長い後半身は地中(y<0)に隠れる。
 *
 * 構造:
 *  group 'moray'
 *   └ moraySway (基部のピボット: 全体を左右に首振り)
 *       ├ 体チューブ
 *       └ headPivot (頭。接線方向へ向ける)
 *           ├ 上顎・頭
 *           ├ morayJaw (下顎ピボット: 開閉)
 *           ├ 口内(暗)
 *           └ 目
 */
export class MorayGenerator {
  // 体の制御点（基準スケール、t順に地中→頭）
  private static readonly CURVE: [number, number, number][] = [
    [0, -7, 0], [0, -1, 0], [1.2, 2.5, 0],
    [3.5, 5.0, 0], [6.2, 5.6, 0], [8.2, 5.2, 0],
  ];

  public static generate(params: Partial<CreatureModelParams> = {}): THREE.Group {
    const { size } = { ...DEFAULT_TURTLE_PARAMS, ...params };
    const s = size;
    const group = new THREE.Group();
    group.name = 'moray';
    group.userData.size = s; // 引っ込み量の計算に使用

    // グロテスクな豹紋テクスチャ（網目状の暗い斑＋疣状の凹凸）
    const { map: morayMap, bump: morayBump } = morayTextures();
    morayMap.repeat.set(3, 7);  // 周方向3・長手方向7で斑を散らす
    morayBump.repeat.set(3, 7);
    const skinMat = new THREE.MeshStandardMaterial({
      color: '#8a9a54', roughness: 0.55, metalness: 0.0, envMapIntensity: 0.4,
      map: morayMap, bumpMap: morayBump, bumpScale: 0.35,
    });
    const bellyMat = new THREE.MeshStandardMaterial({
      color: '#c9c98a', roughness: 0.6, metalness: 0.0, envMapIntensity: 0.35,
    });
    const mouthMat = new THREE.MeshStandardMaterial({
      color: '#3a1418', roughness: 0.6, metalness: 0.0,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: '#0a0a0a', roughness: 0.2, metalness: 0.3,
    });

    const sway = new THREE.Group();
    sway.name = 'moraySway';
    group.add(sway);

    // --- 体（チューブ） ---
    const pts = this.CURVE.map(([x, y, z]) => new THREE.Vector3(x * s, y * s, z * s));
    const curve = new THREE.CatmullRomCurve3(pts);
    // 体の太さ（直径）を1.5倍に（チンアナゴ的な細さを解消）
    const tubeGeo = new THREE.TubeGeometry(curve, 50, 1.35 * s, 12, false);
    const body = new THREE.Mesh(tubeGeo, skinMat);
    body.castShadow = true;
    sway.add(body);

    // --- 頭 ---
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const dir = last.clone().sub(prev);
    const pitch = Math.atan2(dir.y, dir.x); // 接線の上下角

    const head = new THREE.Group();
    head.name = 'morayHead';
    head.position.copy(last);
    head.rotation.z = pitch;
    sway.add(head);

    // 上顎・頭（前方+xへ伸びる紡錘）。体が太くなったぶん頭も太く
    const skullGeo = new THREE.SphereGeometry(1.3 * s, 16, 12);
    skullGeo.scale(1.7, 0.95, 0.92);
    const skull = new THREE.Mesh(skullGeo, skinMat);
    skull.position.set(0.9 * s, 0.05 * s, 0);
    skull.castShadow = true;
    head.add(skull);

    // 口内（暗いくぼみ）
    const gapeGeo = new THREE.SphereGeometry(0.95 * s, 12, 10);
    gapeGeo.scale(1.7, 0.55, 0.85);
    const gape = new THREE.Mesh(gapeGeo, mouthMat);
    gape.position.set(1.2 * s, -0.14 * s, 0);
    head.add(gape);

    // 下顎（ピボットで開閉）
    const jaw = new THREE.Group();
    jaw.name = 'morayJaw';
    jaw.position.set(0.3 * s, -0.22 * s, 0);
    const jawGeo = new THREE.SphereGeometry(0.95 * s, 14, 10);
    jawGeo.scale(1.8, 0.45, 0.9);
    const jawMesh = new THREE.Mesh(jawGeo, bellyMat);
    jawMesh.position.set(0.85 * s, -0.05 * s, 0);
    jawMesh.castShadow = true;
    jaw.add(jawMesh);
    head.add(jaw);

    // 目（頭部側面の上寄り）
    const eyeGeo = new THREE.SphereGeometry(0.18 * s, 10, 10);
    for (const sign of [1, -1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(0.45 * s, 0.55 * s, sign * 0.6 * s);
      head.add(eye);
    }

    return group;
  }

  /**
   * 遊泳/威嚇アニメーション（首振り＋口の開閉）
   *
   * retract（0〜1）はクリック時の「引っ込み」量。1で頭を巣穴へ沈め、
   * 0で通常どおり顔を出す。引っ込み中は首振り・口の動きを抑える。
   */
  public static updateSwim(group: THREE.Group, time: number, retract: number = 0): void {
    const s = (group.userData.size as number) || 1;
    const active = 1 - retract; // 表に出ている度合い

    const sway = group.getObjectByName('moraySway');
    if (sway) {
      // 引っ込むときは体の後方（＝石/巣穴のある向き）へ引き、わずかに沈める。
      // 並進なので頭(前端)から出て胴体が続く＝「頭→胴」の順で出てくる演出になる。
      sway.position.x = -retract * 7.0 * s;
      sway.position.y = -retract * 6.0 * s;
      sway.rotation.y = Math.sin(time * 0.6) * 0.25 * active; // 左右の首振り
      sway.rotation.x = Math.sin(time * 0.4 + 1.0) * 0.06 * active;
    }
    const jaw = group.getObjectByName('morayJaw');
    if (jaw) {
      // 口の開閉（引っ込み中はほぼ閉じる）
      jaw.rotation.z = -(0.16 + 0.16 * Math.sin(time * 0.9)) * active;
    }
  }
}
