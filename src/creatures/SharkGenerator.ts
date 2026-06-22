import * as THREE from 'three';
import { evaluateBezier } from '../utils/math';

/**
 * サメのプロシージャルジェネレーター
 *
 * 頭部をローカル -X、尾をローカル +X とする（他の魚・遊泳の向き計算と統一）。
 * 引き締まった紡錘形の胴体に、立体的な各ヒレ（背・尾・胸・腹・臀）と、
 * 口・歯・エラ・目からなる「怖い顔」を作り込む。質感はマット（光沢を抑えた）。
 *
 * 尾鰭は胴体後端の尾柄に密着させた `tailPivot` グループの中に作り、
 * このピボットを左右に振ることで尾を胴体から離さずに遊泳させる。
 */
export class SharkGenerator {
  // 胴体の太さ・高さプロファイル（t=0 吻端 → t=1 尾柄）
  private static readonly W_CURVE = [0.05, 0.34, 0.5, 0.42, 0.22, 0.07];
  private static readonly H_CURVE = [0.05, 0.42, 0.6, 0.5, 0.26, 0.08];

  public static generate(size: number = 5): THREE.Group {
    const s = size;
    const group = new THREE.Group();
    group.name = 'shark';

    const snoutX = -2.2 * s;
    const peduncleX = 1.5 * s; // 尾柄（尾ピボットの付け根）

    // --- マテリアル（すべてマット：roughness高め・metalness0・clearcoatなし） ---
    const bodyMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.0,
      envMapIntensity: 0.35,
      side: THREE.DoubleSide,
      // エラの縦縞をテクスチャで描く（頂点カラーに乗算）。体表に密着しうねりにも追従。
      map: this.buildBodyTexture(),
    });
    // 尾柄スタブは胴体と同色だが縞テクスチャは不要（別マテリアル）
    const stubMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.0,
      envMapIntensity: 0.35,
      side: THREE.DoubleSide,
    });
    const finMat = new THREE.MeshStandardMaterial({
      color: '#5f6a74',
      roughness: 0.88,
      metalness: 0.0,
      envMapIntensity: 0.3,
      side: THREE.DoubleSide,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: '#160f0f',
      roughness: 0.6,
      metalness: 0.0,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: '#050505',
      roughness: 0.2,
      metalness: 0.25,
    });

    // 太さ・高さの参照関数
    const tAtX = (x: number) => THREE.MathUtils.clamp((x - snoutX) / (peduncleX - snoutX), 0, 1);
    const halfW = (x: number) => s * evaluateBezier(this.W_CURVE, tAtX(x));
    const halfH = (x: number) => s * evaluateBezier(this.H_CURVE, tAtX(x));

    // --- 胴体（遊泳時に左右へしなる） ---
    const body = this.buildBody(s, snoutX, peduncleX, bodyMat);
    body.name = 'bodyFront';
    // 進行波アニメーション用に元の頂点座標とサイズを保存
    body.userData.original = (body.geometry.attributes.position.array as Float32Array).slice();
    group.userData.size = s;
    group.add(body);

    // --- 尾（尾柄に密着したピボット内に尾鰭を作る） ---
    const tailPivot = new THREE.Group();
    tailPivot.name = 'tailPivot';
    tailPivot.position.set(peduncleX, 0, 0);

    // 尾柄を埋める短い円錐（胴体後端と尾鰭の隙間をなくす）
    const stubGeo = new THREE.CylinderGeometry(halfH(peduncleX) * 0.25, halfH(peduncleX) * 0.8, 0.7 * s, 10);
    stubGeo.rotateZ(Math.PI / 2);
    stubGeo.translate(0.35 * s, 0, 0);
    const stub = new THREE.Mesh(stubGeo, stubMat);
    stub.castShadow = true;
    // 円錐は頂点カラーを持たないので頂点カラーを白で補完
    this.fillVertexColor(stubGeo, new THREE.Color('#7c8893'));
    tailPivot.add(stub);

    // 尾鰭（異尾型・上葉が大きく下葉が小さい二股）
    const caudal = this.extrudeFin(this.caudalShape(s), 0.09 * s, finMat);
    tailPivot.add(caudal);
    group.add(tailPivot);

    // --- 背鰭（第一・象徴的に高く後傾） ---
    // 胴長(3.7s)の約20%だけ頭側へ前進させ、大きさは0.8倍
    const dorsalX = -0.69 * s;
    const dorsal = this.extrudeFin(this.dorsalShape(s, 0.8), 0.08 * s, finMat);
    dorsal.position.set(dorsalX, halfH(dorsalX) * 0.92, 0);
    dorsal.scale.y = 0.75; // 高さのみ3/4に（前後長・厚みは維持）
    this.tagSwimFin(dorsal, dorsalX, 0, 0, 1.0);
    group.add(dorsal);

    // 第二背鰭（小・尾寄り）
    const dorsal2 = this.extrudeFin(this.dorsalShape(s, 0.32), 0.06 * s, finMat);
    dorsal2.position.set(1.05 * s, halfH(1.05 * s) * 0.9, 0);
    this.tagSwimFin(dorsal2, 1.05 * s, 0, 0, 1.0);
    group.add(dorsal2);

    // 臀鰭（下面・尾寄り）
    const anal = this.extrudeFin(this.smallFinShape(s, 0.34, -1), 0.05 * s, finMat);
    anal.position.set(0.95 * s, -halfH(0.95 * s) * 0.9, 0);
    this.tagSwimFin(anal, 0.95 * s, 0, 0, 1.0);
    group.add(anal);

    // --- 胸鰭（左右・大きく後方へ張り出す） ---
    for (const sign of [1, -1]) {
      const pec = this.buildPectoral(s, finMat, sign);
      const pz = sign * halfW(-0.7 * s) * 0.8;
      pec.position.set(-0.7 * s, -halfH(-0.7 * s) * 0.45, pz);
      // 胸鰭は付け根が頭寄りで揺れは小さい。振りも控えめに。
      this.tagSwimFin(pec, -0.7 * s, pz, pec.rotation.y, 0.5);
      group.add(pec);
    }

    // 腹鰭（左右・小）
    for (const sign of [1, -1]) {
      const pel = this.buildPectoral(s, finMat, sign, 0.42);
      const pz = sign * halfW(0.55 * s) * 0.6;
      pel.position.set(0.55 * s, -halfH(0.55 * s) * 0.85, pz);
      this.tagSwimFin(pel, 0.55 * s, pz, pel.rotation.y, 0.7);
      group.add(pel);
    }

    // --- 顔（怖い表情：エラ・口・目） ---
    this.buildFace(group, s, halfW, halfH, darkMat, eyeMat);

    return group;
  }

  /**
   * 胴体メッシュ（断面リングのチューブ）を生成。カウンターシェーディング付き。
   */
  private static buildBody(
    s: number,
    snoutX: number,
    peduncleX: number,
    mat: THREE.Material
  ): THREE.Mesh {
    const NX = 30;
    const NR = 18;
    const vertices: number[] = [];
    const colors: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const topColor = new THREE.Color('#4d5862'); // 背側（暗）
    const bellyColor = new THREE.Color('#c7ced3'); // 腹側（明）

    for (let i = 0; i <= NX; i++) {
      const t = i / NX;
      const x = THREE.MathUtils.lerp(snoutX, peduncleX, t);
      const hw = s * evaluateBezier(this.W_CURVE, t);
      const hh = s * evaluateBezier(this.H_CURVE, t);

      for (let j = 0; j <= NR; j++) {
        const a = (j / NR) * Math.PI * 2;
        const ny = Math.sin(a); // -1(腹)〜+1(背)
        const nz = Math.cos(a);
        // 背を少し平たく、腹をやや丸く（サメらしい断面）
        const y = ny * hh * (ny > 0 ? 0.95 : 1.0);
        const z = nz * hw;
        vertices.push(x, y, z);

        const c = bellyColor.clone().lerp(topColor, (ny + 1) / 2);
        colors.push(c.r, c.g, c.b);

        // UV: u=体軸(吻0→尾柄1)、v=周方向(j=0が右側面、j=NR/2が左側面)
        uvs.push(t, j / NR);
      }
    }

    const row = NR + 1;
    for (let i = 0; i < NX; i++) {
      for (let j = 0; j < NR; j++) {
        const a = i * row + j;
        const b = a + 1;
        const c = a + row;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }

  /**
   * ヒレを胴体の進行波に連動させるためのアンカー情報を付与する。
   * baseX: 付け根のx位置（波の位相を決める）
   * baseZ/baseRotY: 波変位を加える前の基準の横位置・ヨー角
   * yaw: 波の接線に応じたヨー回転の強さ（0で平行移動のみ）
   */
  private static tagSwimFin(
    fin: THREE.Mesh,
    baseX: number,
    baseZ: number,
    baseRotY: number,
    yaw: number
  ): void {
    fin.userData.swim = { baseX, baseZ, baseRotY, yaw };
  }

  /**
   * 平面シルエット（[x,y]点列）を厚み付きで押し出してヒレを作る。
   * x=前後、y=上方向、厚みはz方向（薄板）。
   */
  private static extrudeFin(
    points: [number, number][],
    depth: number,
    mat: THREE.Material
  ): THREE.Mesh {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
    geo.translate(0, 0, -depth / 2); // 厚みをz中央に
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }

  /** 異尾型の尾鰭シルエット（上葉大・下葉小の二股） */
  private static caudalShape(s: number): [number, number][] {
    const u = s;
    return ([
      [0.0, 0.10], [0.15, 0.45], [0.55, 0.95], [1.05, 1.55],
      [1.0, 1.25], [0.6, 0.55], [0.42, 0.12],
      [0.6, -0.05], [0.95, -0.35], [1.05, -0.72],
      [0.92, -0.6], [0.5, -0.18], [0.12, -0.10],
    ] as [number, number][]).map(([x, y]) => [x * u, y * u]);
  }

  /** 背鰭シルエット（高く後傾、後縁が凹む）。scaleで縮小可。 */
  private static dorsalShape(s: number, scale = 1): [number, number][] {
    const u = s * scale;
    return ([
      [-0.55, 0.0], [-0.15, 0.55], [0.1, 1.25], [0.22, 1.18],
      [0.45, 0.5], [0.62, 0.08], [0.6, 0.0],
    ] as [number, number][]).map(([x, y]) => [x * u, y * u]);
  }

  /** 小さな三角ヒレ（臀鰭など）。dir=-1で下向き。 */
  private static smallFinShape(s: number, scale: number, dir: number): [number, number][] {
    const u = s * scale;
    return ([
      [-0.3, 0.0], [0.0, 0.6 * dir], [0.4, 0.0],
    ] as [number, number][]).map(([x, y]) => [x * u, y * u]);
  }

  /**
   * 胸鰭・腹鰭（水平に近い後傾の薄板）。sign=±1で左右。
   */
  private static buildPectoral(
    s: number,
    mat: THREE.Material,
    sign: number,
    scale = 1
  ): THREE.Mesh {
    const u = s * scale;
    // (x=前後の翼弦, y=外側への翼幅) で作図し、寝かせて水平にする
    const pts: [number, number][] = ([
      [-0.05, 0.0], [0.5, 0.05], [0.3, 0.6], [0.12, 1.05], [-0.02, 0.55],
    ] as [number, number][]).map(([x, y]) => [x * u, y * u]);

    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
    shape.closePath();

    const depth = 0.06 * s;
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
    geo.translate(0, 0, -depth / 2);
    geo.rotateX(-Math.PI / 2); // 翼幅(y)を -z 方向へ倒して水平化
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    // 左右の向き・後傾・下垂
    // scale.z=-1 の鏡像と併用するため rotation.x も sign を掛けて左右対称にする
    // （鏡像下では x 回転の符号が反転するため、左側は -0.3 が正しい）
    mesh.scale.z = sign; // +zへミラー
    mesh.rotation.x = sign * 0.3;   // 翼端を下げる（左右対称）
    mesh.rotation.y = sign * 0.28;  // 後方へ後退角
    return mesh;
  }

  /**
   * 顔の作り込み（エラ5本×左右・下顎の口・目・眉）
   */
  private static buildFace(
    group: THREE.Group,
    s: number,
    halfW: (x: number) => number,
    halfH: (x: number) => number,
    darkMat: THREE.Material,
    eyeMat: THREE.Material
  ): void {
    // --- 目（吻のやや後ろ・左右）。小さく黒く鋭い ---
    const eyeGeo = new THREE.SphereGeometry(0.13 * s, 10, 10);
    for (const sign of [1, -1]) {
      const ex = -1.45 * s;
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(ex, halfH(ex) * 0.35, sign * halfW(ex) * 0.86);
      group.add(eye);
      // 眉（小さな暗い楔）で睨んだ表情に
      const browGeo = new THREE.BoxGeometry(0.5 * s, 0.08 * s, 0.18 * s);
      const brow = new THREE.Mesh(browGeo, darkMat);
      brow.position.set(ex + 0.05 * s, halfH(ex) * 0.62, sign * halfW(ex) * 0.82);
      // z傾きは左右で同じにして対称な“への字”眉に（吻側を下げて睨む表情）
      brow.rotation.z = 0.22;
      // yヨーのみ左右ミラーにして頭部側面のカーブに沿わせる
      brow.rotation.y = sign * 0.3;
      group.add(brow);
    }

    // エラの縦縞は胴体テクスチャ（buildBodyTexture）で描画する。
    // 板ポリゴンだと曲面から浮き遊泳のうねりにも追従しないため、UVテクスチャに移行した。

    // --- 口（下顎の大きな弧状の暗いくぼみ） ---
    const mouthX = -1.62 * s;
    const mw = halfW(mouthX) * 1.05;
    // 口は小さく潰した半球状なので低分割で十分（288→約80三角形に削減）
    const mouthGeo = new THREE.SphereGeometry(1, 10, 6);
    mouthGeo.scale(0.22 * s, 0.16 * s, mw);
    const mouth = new THREE.Mesh(mouthGeo, darkMat);
    mouth.position.set(mouthX, -halfH(mouthX) * 0.45, 0);
    group.add(mouth);
  }

  /**
   * 胴体に貼るテクスチャ（エラの縦縞）を生成する。
   *
   * 白地に左右側面のエラ位置だけ暗い斜めスリットを描く。頂点カラーへ乗算され、
   * 白部分は素の体色のまま・スリット部分だけ暗くなる。
   * u=体軸(吻0→尾柄1)、v=周方向(0と1が右側面・0.5が左側面)に対応。
   */
  private static buildBodyTexture(): THREE.CanvasTexture {
    const W = 512;
    const H = 256;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // 各エラのu位置（元の板ポリゴンの gx=-1.0s+0.16s*g を tAtX で正規化した値）
    const us = [0.324, 0.368, 0.411, 0.454, 0.497];
    const vHalf = 0.11; // 側面に沿った縦の伸び（v方向）
    const slant = 7;    // 後傾（上が頭側・下が尾側へずれる）
    ctx.lineWidth = W * 0.012;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(20, 14, 14, 0.85)';

    const drawBand = (vCenter: number) => {
      for (const u of us) {
        const x = u * W;
        ctx.beginPath();
        ctx.moveTo(x - slant, (vCenter - vHalf) * H);
        ctx.lineTo(x + slant, (vCenter + vHalf) * H);
        ctx.stroke();
      }
    };
    drawBand(0.0); // 右側面（v=0：上下端にまたがるので両端へ）
    drawBand(1.0);
    drawBand(0.5); // 左側面

    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping; // 周方向はループ
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * 頂点カラー属性を持たないジオメトリへ単色の頂点カラーを付与
   * （vertexColors マテリアル共用のため）
   */
  private static fillVertexColor(geo: THREE.BufferGeometry, color: THREE.Color): void {
    const count = geo.attributes.position.count;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = color.r;
      arr[i * 3 + 1] = color.g;
      arr[i * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
  }

  // 進行波のパラメータ
  private static readonly WAVE_K = 2.0;   // 頭→尾の位相差（波数）
  private static readonly WAVE_ENV = 1.8; // 振幅エンベロープの指数（尾ほど大きく振れる）

  /**
   * 遊泳アニメーション：胴体を左右にしならせる進行波 ＋ 尾鰭の連動。
   *
   * 胴体メッシュ(bodyFront)の各頂点をx位置に応じてz方向へ進行波で変位させ、
   * 体全体をS字にうねらせる。尾ピボットは胴体後端の波（位置と接線）に追従させ、
   * 波の延長として尾鰭が振れるようにする。
   */
  public static updateSwim(mesh: THREE.Group, phase: number, speedRatio: number): void {
    const s = mesh.userData.size as number;
    if (!s) return;

    const headX = -2.2 * s;
    const peduncleX = 1.5 * s;
    const BL = peduncleX - headX;
    const k = this.WAVE_K;
    const p = this.WAVE_ENV;
    // 速いほど大きくしなる
    const amp = (0.16 + 0.34 * Math.min(1, Math.max(0, speedRatio))) * s;

    // 胴体の進行波（zへ変位）
    const body = mesh.getObjectByName('bodyFront') as THREE.Mesh | null;
    const orig = body?.userData.original as Float32Array | undefined;
    if (body && orig) {
      const pos = body.geometry.attributes.position;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < pos.count; i++) {
        const x = orig[i * 3];
        const xn = THREE.MathUtils.clamp((x - headX) / BL, 0, 1);
        const env = Math.pow(xn, p);
        const wave = amp * env * Math.sin(phase - k * xn);
        arr[i * 3 + 2] = orig[i * 3 + 2] + wave;
      }
      pos.needsUpdate = true;
      body.geometry.computeVertexNormals();
    }

    // 尾ピボットを胴体後端の波に追従（位置＝後端の横変位、向き＝波の接線）
    const pivot = mesh.getObjectByName('tailPivot');
    if (pivot) {
      const ang = phase - k; // xn=1（尾柄）での位相
      const zPed = amp * Math.sin(ang);
      const dzdx = (amp / BL) * (p * Math.sin(ang) - k * Math.cos(ang));
      pivot.position.z = zPed;
      pivot.rotation.y = Math.atan2(-dzdx, 1) * 1.4; // 尾の振りを少し強調
    }

    // 各ヒレ（背・腹・胸・臀）を付け根x位置での胴体の波に連動させる。
    // 胴体表面と同じ進行波でz変位させ、接線方向にヨーを与えて一体感を出す。
    const waveZ = (xn: number) => amp * Math.pow(xn, p) * Math.sin(phase - k * xn);
    const waveYaw = (xn: number) => {
      const env = Math.pow(xn, p);
      const denv = p * Math.pow(xn, Math.max(0, p - 1));
      const dzdx = (amp / BL) * (denv * Math.sin(phase - k * xn) - env * k * Math.cos(phase - k * xn));
      return Math.atan2(-dzdx, 1);
    };
    for (const child of mesh.children) {
      const sw = child.userData.swim as
        | { baseX: number; baseZ: number; baseRotY: number; yaw: number }
        | undefined;
      if (!sw) continue;
      const xn = THREE.MathUtils.clamp((sw.baseX - headX) / BL, 0, 1);
      child.position.z = sw.baseZ + waveZ(xn);
      child.rotation.y = sw.baseRotY + waveYaw(xn) * sw.yaw;
    }
  }
}
