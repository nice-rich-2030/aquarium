import * as THREE from 'three';
import { CreatureModelParams, DEFAULT_TURTLE_PARAMS } from '../types/decorations';

/**
 * 灯台のプロシージャルジェネレーター
 *
 * 灰色ベースのテーパー塔＋ギャラリー＋ランタン室（ガラス）＋灰色の屋根。
 * 中心に発光するランプ（bloomで光る）を置き、外向きの光ビームを
 * `lighthouseBeam` グループに入れて回転させる。
 *
 * ビームは光源側で明るく先で消える長さフォールオフのシェーダーで、
 * フォグ（体積光）のように柔らかく見せる（単純な不透明コーンの幼稚さを回避）。
 */
export class LighthouseGenerator {
  public static generate(params: Partial<CreatureModelParams> = {}): THREE.Group {
    const { size } = { ...DEFAULT_TURTLE_PARAMS, ...params };
    const u = size;
    const group = new THREE.Group();
    group.name = 'lighthouse';

    // 周囲(岩・砂)と調和する灰色ベース
    const bandLight = new THREE.MeshStandardMaterial({ color: '#c6cbce', roughness: 0.8, metalness: 0.0 });
    const bandDark = new THREE.MeshStandardMaterial({ color: '#878d92', roughness: 0.85, metalness: 0.0 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#3a3f44', roughness: 0.6, metalness: 0.2 });
    const roofMat = new THREE.MeshStandardMaterial({ color: '#565f66', roughness: 0.7, metalness: 0.1 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#c2ccd0', transparent: true, opacity: 0.22,
      roughness: 0.1, metalness: 0.0, transmission: 0.9, side: THREE.DoubleSide,
    });
    const lampMat = new THREE.MeshStandardMaterial({
      color: '#fff2cc', emissive: '#ffd680', emissiveIntensity: 2.6, roughness: 0.3,
    });

    // --- 塔（灰の濃淡の縞・テーパー） ---
    const towerH = 16 * u;
    const rBot = 3 * u;
    const rTop = 2 * u;
    const bands = 6;
    const bandH = towerH / bands;
    for (let i = 0; i < bands; i++) {
      const r0 = THREE.MathUtils.lerp(rBot, rTop, i / bands);
      const r1 = THREE.MathUtils.lerp(rBot, rTop, (i + 1) / bands);
      const geo = new THREE.CylinderGeometry(r1, r0, bandH, 20);
      const band = new THREE.Mesh(geo, i % 2 === 0 ? bandLight : bandDark);
      band.position.y = bandH * (i + 0.5);
      band.castShadow = true;
      band.receiveShadow = true;
      group.add(band);
    }

    // --- ギャラリー（張り出した円盤） ---
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(rTop * 1.35, rTop * 1.35, 0.6 * u, 20), darkMat);
    gallery.position.y = towerH + 0.3 * u;
    gallery.castShadow = true;
    group.add(gallery);

    // --- ランタン室（ガラス＋支柱） ---
    const lanternY = towerH + 0.6 * u;
    const lanternH = 3 * u;
    const lanternR = 1.7 * u;
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(lanternR, lanternR, lanternH, 16), glassMat);
    glass.position.y = lanternY + lanternH * 0.5;
    group.add(glass);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18 * u, lanternH, 0.18 * u), darkMat);
      post.position.set(Math.cos(a) * lanternR, lanternY + lanternH * 0.5, Math.sin(a) * lanternR);
      group.add(post);
    }

    // --- ランプ（発光・bloomで光る） ---
    const lampY = lanternY + lanternH * 0.5;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.9 * u, 14, 12), lampMat);
    lamp.position.y = lampY;
    group.add(lamp);

    // --- 回転ビーム（フォグ感のある体積光・左右2方向） ---
    const beamGroup = new THREE.Group();
    beamGroup.name = 'lighthouseBeam';
    beamGroup.position.y = lampY;
    const beamLen = 20 * u;
    beamGroup.add(this.makeBeam(beamLen, 3.2 * u));
    const beam2 = this.makeBeam(beamLen, 3.2 * u);
    beam2.rotation.y = Math.PI;
    beamGroup.add(beam2);
    group.add(beamGroup);

    // --- 屋根（灰色の円錐）＋頂飾り ---
    const roof = new THREE.Mesh(new THREE.ConeGeometry(lanternR * 1.25, 3 * u, 12), roofMat);
    roof.position.y = lanternY + lanternH + 1.5 * u;
    roof.castShadow = true;
    group.add(roof);

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.35 * u, 8, 8), darkMat);
    finial.position.y = lanternY + lanternH + 3 * u;
    group.add(finial);

    return group;
  }

  /**
   * フォグ感のある光ビーム（円錐）を作る。
   * 光源(頂点)で明るく先で消える長さフォールオフ＋加算合成で体積光に見せる。
   * 頂点を原点に置き +x 方向へ伸ばす。
   */
  private static makeBeam(len: number, radius: number): THREE.Mesh {
    // 頂点を原点へ、軸を +x へ
    const geo = new THREE.ConeGeometry(radius, len, 18, 1, true);
    geo.translate(0, -len / 2, 0); // 頂点(+y)を原点へ → y∈[-len,0]
    geo.rotateZ(-Math.PI / 2);     // -y(底面)を +x へ倒す

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color('#ffe8b0') },
        uLen: { value: len },
      },
      vertexShader: `
        uniform float uLen;
        varying float vAxial; // 1:光源 → 0:先端
        varying float vEdge;  // 0:中心軸 → 1:外周（位置xから距離で近似）
        void main() {
          // 回転前のローカル座標は +x 方向へ伸びる（頂点が原点）
          float along = clamp(-position.x / uLen, 0.0, 1.0); // 0:光源 1:先端
          vAxial = 1.0 - along;
          vEdge = clamp(length(position.yz) / (uLen * 0.16), 0.0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAxial;
        varying float vEdge;
        void main() {
          // 光源側ほど明るく先細りで消える＋外周を柔らかく
          float a = pow(vAxial, 1.7) * (1.0 - vEdge * 0.85) * 0.32;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    return new THREE.Mesh(geo, mat);
  }

  /**
   * ビームの回転を更新
   */
  public static updateSpin(group: THREE.Group, time: number, speed: number): void {
    const beam = group.getObjectByName('lighthouseBeam');
    if (beam) beam.rotation.y = time * speed;
  }
}
