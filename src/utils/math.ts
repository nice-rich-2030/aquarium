import * as THREE from 'three';

/**
 * 値を範囲内に制限
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 線形補間
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * スムーズな補間（Hermite補間）
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * より滑らかな補間
 */
export function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * 範囲内のランダム値
 */
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * 球内のランダムな点
 */
export function randomInSphere(radius: number): THREE.Vector3 {
  const u = Math.random();
  const v = Math.random();
  const theta = u * 2 * Math.PI;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;

  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}

/**
 * ボックス内のランダムな点
 */
export function randomInBox(bounds: THREE.Box3): THREE.Vector3 {
  return new THREE.Vector3(
    randomRange(bounds.min.x, bounds.max.x),
    randomRange(bounds.min.y, bounds.max.y),
    randomRange(bounds.min.z, bounds.max.z)
  );
}

/**
 * ベクトルの長さを制限
 */
export function clampMagnitude(vector: THREE.Vector3, maxLength: number): THREE.Vector3 {
  const length = vector.length();
  if (length > maxLength) {
    return vector.clone().multiplyScalar(maxLength / length);
  }
  return vector.clone();
}

/**
 * ベジェ曲線を評価
 */
export function evaluateBezier(points: number[], t: number): number {
  const n = points.length - 1;
  let result = 0;

  for (let i = 0; i <= n; i++) {
    const binomial = factorial(n) / (factorial(i) * factorial(n - i));
    result += binomial * Math.pow(1 - t, n - i) * Math.pow(t, i) * points[i];
  }

  return result;
}

/**
 * 階乗
 */
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

/**
 * 角度を-PIからPIの範囲に正規化
 */
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

/**
 * 2つのクォータニオンを球面線形補間
 */
export function slerpQuaternion(
  qa: THREE.Quaternion,
  qb: THREE.Quaternion,
  t: number
): THREE.Quaternion {
  return qa.clone().slerp(qb, t);
}

/**
 * 進行方向から魚の姿勢クォータニオンを作成する。
 *
 * 魚モデルは頭部がローカル -X 方向を向いて生成される（口・目が -X、尾が +X）。
 * Three.js の Matrix4.lookAt は -Z を対象へ向ける仕様のため、そのまま使うと
 * 魚が体側（横）を進行方向に向けて泳いでしまう。
 * ここでは頭（-X）が direction を向き、かつ背（+Y）が概ね上を向くような
 * 正規直交基底を組んで姿勢を決める。
 */
export function headingToQuaternion(direction: THREE.Vector3): THREE.Quaternion {
  const fwd = direction.clone().normalize();
  // ローカル +X のワールド方向（頭が -X なので +X は後方を指す）
  const xAxis = fwd.clone().multiplyScalar(-1);
  const worldUp = new THREE.Vector3(0, 1, 0);

  let zAxis = new THREE.Vector3().crossVectors(xAxis, worldUp);
  if (zAxis.lengthSq() < 1e-6) {
    // 真上・真下を向く場合は別の基準軸で代用してロール不定を避ける
    zAxis = new THREE.Vector3().crossVectors(xAxis, new THREE.Vector3(0, 0, 1));
  }
  zAxis.normalize();
  const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();

  const matrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  return new THREE.Quaternion().setFromRotationMatrix(matrix);
}
