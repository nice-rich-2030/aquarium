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
    const radialSegments = 12;
    const length = params.length * size;

    const vertices: number[] = [];
    const indices: number[] = [];
    const vertexColors: number[] = [];

    const primaryColor = new THREE.Color(colors.primary);
    const secondaryColor = new THREE.Color(colors.secondary);

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
        const y = Math.sin(angle) * height;
        const z = Math.cos(angle) * width;

        vertices.push(x, y, z);

        // 頂点カラー（グラデーション）
        const colorT = colors.pattern === 'stripe'
          ? Math.floor(t * (colors.stripeCount || 3)) % 2
          : t;
        const color = lerpColor(primaryColor, secondaryColor, colorT);
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

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.3,
      metalness: 0.1,
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

    const finColor = colors.accent || colors.secondary;
    const finMaterial = new THREE.MeshStandardMaterial({
      color: finColor,
      roughness: 0.4,
      metalness: 0.0,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });

    // 尾ビレ
    const tail = this.generateTailFin(params.tail, size, finMaterial);
    tail.position.x = (bodyLength * size) / 2;
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
    mesh.rotation.y = Math.PI / 2;

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
    geometry.rotateZ(-Math.PI / 2);
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
    geometry.rotateZ(-Math.PI / 2);
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
    geometry.rotateZ(-Math.PI / 2);
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
    geometry.rotateZ(-Math.PI / 2);
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

    shape.moveTo(-finSize * 0.5, 0);
    shape.quadraticCurveTo(0, finSize * 1.2, finSize * 0.5, 0);
    shape.lineTo(-finSize * 0.5, 0);

    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(params.x * size, evaluateBezier([0.3, 1.0, 1.0, 0.1], 0.4) * size, 0);
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
