import * as THREE from 'three';
import { BodyParams, FinParams, ColorPalette } from '../types/creatures';
import { evaluateBezier } from '../utils/math';
import { lerpColor } from '../utils/color';

/**
 * 魚のプロシージャルメッシュジェネレーター
 */
export class FishGenerator {
  /**
   * 魚のメッシュを生成
   */
  public static generate(
    bodyParams: BodyParams,
    finParams: FinParams,
    colors: ColorPalette,
    size: number = 1
  ): THREE.Group {
    const group = new THREE.Group();

    // 体を生成
    const body = this.generateBody(bodyParams, colors, size);
    group.add(body);

    // ヒレを生成
    const fins = this.generateFins(finParams, colors, size, bodyParams.length);
    group.add(fins);

    // 目を生成
    const eyes = this.generateEyes(bodyParams, size);
    group.add(eyes);

    return group;
  }

  /**
   * 体のメッシュを生成
   */
  private static generateBody(
    params: BodyParams,
    colors: ColorPalette,
    size: number
  ): THREE.Mesh {
    const segments = params.segments || 20;
    const radialSegments = 16;
    const length = params.length * size;

    const vertices: number[] = [];
    const indices: number[] = [];
    const vertexColors: number[] = [];

    const primaryColor = new THREE.Color(colors.primary);
    const secondaryColor = new THREE.Color(colors.secondary);
    const white = new THREE.Color(0xffffff);

    // 各セグメントについて断面を生成
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = (t - 0.5) * length;

      // ベジェ曲線で幅と高さを計算
      const width = evaluateBezier(params.widthCurve, t) * size;
      const height = evaluateBezier(params.heightCurve, t) * size;

      // 円周方向に頂点を生成
      for (let j = 0; j <= radialSegments; j++) {
        const angle = (j / radialSegments) * Math.PI * 2;
        const ny = Math.sin(angle); // -1(腹)〜+1(背)
        const y = ny * height;
        const z = Math.cos(angle) * width;

        vertices.push(x, y, z);

        // ベースの模様（縞 or 体軸グラデーション）
        const colorT = colors.pattern === 'stripe'
          ? Math.floor(t * (colors.stripeCount || 3)) % 2
          : t;
        const color = lerpColor(primaryColor, secondaryColor, colorT).clone();

        // カウンターシェーディング: 背側を濃く、腹側を明るく（魚特有の陰影）
        color.multiplyScalar(1.0 - ny * 0.28);

        // 腹側を白っぽく（多くの魚に見られる明色の腹部）
        if (ny < 0) {
          color.lerp(white, -ny * 0.45);
        }

        vertexColors.push(color.r, color.g, color.b);
      }
    }

    // インデックスを生成（四角形を三角形に分割）
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * (radialSegments + 1) + j;
        const b = a + 1;
        const c = a + (radialSegments + 1);
        const d = c + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // 魚体: clearcoatで濡れた光沢、iridescenceで鱗の虹色反射を表現
    const material = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.25,
      metalness: 0.15,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
      iridescence: 0.4,
      iridescenceIOR: 1.3,
      envMapIntensity: 0.6,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'body';

    return mesh;
  }

  /**
   * ヒレを生成
   */
  private static generateFins(
    params: FinParams,
    colors: ColorPalette,
    size: number,
    bodyLength: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'fins';

    // ヒレは胴体と同質の不透明マテリアルにして「ひとつの体」に見せる
    // （半透明だと背景が透けて胴体から分離して見えるため）
    const finColor = colors.accent || colors.secondary;
    const finMaterial = new THREE.MeshPhysicalMaterial({
      color: finColor,
      roughness: 0.3,
      metalness: 0.1,
      clearcoat: 0.5,
      clearcoatRoughness: 0.25,
      iridescence: 0.3,
      iridescenceIOR: 1.3,
      envMapIntensity: 0.55,
      side: THREE.DoubleSide,
    });

    // 尾ビレ（根元を胴体後端にめり込ませて接続部の隙間をなくす）
    const tail = this.generateTailFin(params.tail, size, finMaterial);
    tail.position.x = (bodyLength * size) / 2 - size * 0.4;
    group.add(tail);

    // 背ビレ
    if (params.dorsal) {
      const dorsal = this.generateDorsalFin(params.dorsal, size, finMaterial);
      group.add(dorsal);
    }

    // 胸ビレ（左右）
    if (params.pectoral) {
      const pectoralLeft = this.generatePectoralFin(params.pectoral, size, finMaterial);
      pectoralLeft.position.z = evaluateBezier([0.2, 0.6, 0.5, 0.1], 0.3) * size;
      pectoralLeft.rotation.x = -params.pectoral.angle;

      const pectoralRight = pectoralLeft.clone();
      pectoralRight.position.z = -pectoralLeft.position.z;
      pectoralRight.rotation.x = params.pectoral.angle;

      group.add(pectoralLeft);
      group.add(pectoralRight);
    }

    return group;
  }

  /**
   * 尾ビレを生成
   */
  private static generateTailFin(
    params: FinParams['tail'],
    size: number,
    material: THREE.Material
  ): THREE.Mesh {
    const finSize = params.size * size;
    let geometry: THREE.BufferGeometry;

    switch (params.type) {
      case 'fan':
        geometry = this.createFanTailGeometry(finSize);
        break;
      case 'flowing':
        geometry = this.createFlowingTailGeometry(finSize);
        break;
      case 'double':
        geometry = this.createDoubleTailGeometry(finSize);
        break;
      case 'forked':
      default:
        geometry = this.createForkedTailGeometry(finSize);
        break;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'tail';

    return mesh;
  }

  /**
   * 扇形の尾ビレ
   */
  private static createFanTailGeometry(size: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(size, size * 0.8);
    shape.quadraticCurveTo(size * 0.5, 0, size, -size * 0.8);
    shape.lineTo(0, 0);

    const geometry = new THREE.ShapeGeometry(shape);
    return geometry;
  }

  /**
   * ひらひらした尾ビレ
   */
  private static createFlowingTailGeometry(size: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(size * 0.3, size * 0.5, size * 0.7, size, size * 1.2, size);
    shape.bezierCurveTo(size * 0.8, 0, size * 0.8, 0, size * 1.2, -size);
    shape.bezierCurveTo(size * 0.7, -size, size * 0.3, -size * 0.5, 0, 0);

    const geometry = new THREE.ShapeGeometry(shape);
    return geometry;
  }

  /**
   * 二股の尾ビレ
   */
  private static createDoubleTailGeometry(size: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(size * 0.8, size);
    shape.lineTo(size * 0.4, size * 0.3);
    shape.lineTo(size * 0.4, -size * 0.3);
    shape.lineTo(size * 0.8, -size);
    shape.lineTo(0, 0);

    const geometry = new THREE.ShapeGeometry(shape);
    return geometry;
  }

  /**
   * フォーク型の尾ビレ
   */
  private static createForkedTailGeometry(size: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(size, size * 0.6);
    shape.lineTo(size * 0.6, 0);
    shape.lineTo(size, -size * 0.6);
    shape.lineTo(0, 0);

    const geometry = new THREE.ShapeGeometry(shape);
    return geometry;
  }

  /**
   * 背ビレを生成
   */
  private static generateDorsalFin(
    params: NonNullable<FinParams['dorsal']>,
    size: number,
    material: THREE.Material
  ): THREE.Mesh {
    const finSize = params.size * size;
    const shape = new THREE.Shape();

    // 背中に立つ縦の板（xy平面・法線z）。底辺が体軸前後、頂点が上方向
    shape.moveTo(-finSize * 0.5, 0);
    shape.quadraticCurveTo(0, finSize * 1.2, finSize * 0.5, 0);
    shape.lineTo(-finSize * 0.5, 0);

    const geometry = new THREE.ShapeGeometry(shape);

    const mesh = new THREE.Mesh(geometry, material);
    // 根元を胴体上面に少し埋めて一体化（係数0.75で胴体側へ沈める）
    mesh.position.set(params.x * size, evaluateBezier([0.3, 1.0, 1.0, 0.1], 0.4) * size * 0.75, 0);
    mesh.rotation.z = params.angle;
    mesh.name = 'dorsal';

    return mesh;
  }

  /**
   * 胸ビレを生成
   */
  private static generatePectoralFin(
    params: NonNullable<FinParams['pectoral']>,
    size: number,
    material: THREE.Material
  ): THREE.Mesh {
    const finSize = params.size * size;
    const shape = new THREE.Shape();

    shape.moveTo(0, 0);
    shape.quadraticCurveTo(finSize * 0.3, finSize * 0.8, finSize, finSize * 0.3);
    shape.quadraticCurveTo(finSize * 0.5, 0, 0, 0);

    const geometry = new THREE.ShapeGeometry(shape);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = params.x * size;
    mesh.name = 'pectoral';

    return mesh;
  }

  /**
   * 目を生成
   */
  private static generateEyes(params: BodyParams, size: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'eyes';

    const eyeRadius = size * 0.12;
    const eyeGeometry = new THREE.SphereGeometry(eyeRadius, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.2,
      metalness: 0.3,
    });

    // 目の位置（頭部の横）
    const headWidth = evaluateBezier(params.widthCurve, 0.15) * size;
    const headHeight = evaluateBezier(params.heightCurve, 0.15) * size;
    const eyeX = -params.length * size * 0.35;

    // 左目
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(eyeX, headHeight * 0.5, headWidth * 0.8);
    group.add(leftEye);

    // 右目
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(eyeX, headHeight * 0.5, -headWidth * 0.8);
    group.add(rightEye);

    // 目のハイライト
    const highlightGeometry = new THREE.SphereGeometry(eyeRadius * 0.3, 4, 4);
    const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const leftHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
    leftHighlight.position.set(eyeX - eyeRadius * 0.3, headHeight * 0.5 + eyeRadius * 0.3, headWidth * 0.8 + eyeRadius * 0.3);
    group.add(leftHighlight);

    const rightHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
    rightHighlight.position.set(eyeX - eyeRadius * 0.3, headHeight * 0.5 + eyeRadius * 0.3, -headWidth * 0.8 - eyeRadius * 0.3);
    group.add(rightHighlight);

    return group;
  }
}
