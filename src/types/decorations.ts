import * as THREE from 'three';

// 装飾カテゴリ
export type DecorationCategory = 'rock' | 'plant' | 'coral' | 'shell' | 'other';

// 岩の生成パラメータ
export interface RockParams {
  baseRadius: number;
  noiseScale: number;
  noiseIntensity: number;
  subdivisions: number;
  color: string;
  roughness: number;
}

// 水草の生成パラメータ
export interface PlantParams {
  stemCount: number;
  stemHeight: { min: number; max: number };
  stemCurve: number;
  leafCount: number;
  leafSize: number;
  color: string;
  swaySpeed: number;
  swayAmount: number;
}

// サンゴの形状タイプ（樹状・テーブル状・塊状/脳状）
export type CoralShape = 'branching' | 'table' | 'brain';

// サンゴの生成パラメータ
export interface CoralParams {
  branchDepth: number;
  branchAngle: number;
  thickness: number;
  length: number;
  color: string;
  shape?: CoralShape; // 省略時は 'branching'
}

// 貝殻の生成パラメータ
export interface ShellParams {
  spiralTurns: number;
  size: number;
  color: string;
}

// 水車の生成パラメータ
export interface WaterWheelParams {
  radius: number;       // 車輪の半径
  width: number;        // 奥行き（羽根の幅）
  paddleCount: number;  // 羽根の枚数
  woodColor: string;    // 木部の色
  frameColor: string;   // 支柱の色
  hubColor: string;     // 軸の色
}

// 水中生物（亀・エイ）の生成パラメータ
export interface CreatureModelParams {
  size: number; // 全体スケール
}

// ジェネレータパラメータ（共用体）
export type GeneratorParams =
  | RockParams
  | PlantParams
  | CoralParams
  | ShellParams
  | WaterWheelParams
  | CreatureModelParams;

// アニメーションパラメータ（揺れ・回転・遊泳など）
export interface DecorationAnimationParams {
  type: 'sway' | 'rotate' | 'turtle' | 'ray' | 'none';
  speed?: number;
  amount?: number;
}

// 装飾定義（JSONから読み込み）
export interface DecorationDefinition {
  id: string;
  name: string;
  description?: string; // ツールチップに表示する一言の特徴
  category: DecorationCategory;
  generatorType: string;
  params: GeneratorParams;
  animation?: DecorationAnimationParams;
}

// 装飾インスタンス（シーン上の配置）
export interface DecorationInstance {
  id: string;
  definitionId: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  animation?: DecorationAnimationParams;
  // 回遊する生物（亀・エイ）の状態
  roamDir?: THREE.Vector3;      // 水平な前進方向（単位ベクトル）
  roamSpeed?: number;          // 巡航速度(units/sec)
  reactionTimer?: number;      // クリック反応（驚いて逃げる）の残り時間(秒)
  reactionDir?: THREE.Vector3; // 反応時の逃避方向
  satietyTimer?: number;       // 餌を食べた後の満腹の残り時間(秒)。>0 の間は餌に反応しない
}

// 装飾配置設定
export interface DecorationPlacementConfig {
  definitionId: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: number;
  castShadow?: boolean; // 省略時は定義側の既定（草以外は影を落とす）
}

// デフォルトの岩パラメータ
export const DEFAULT_ROCK_PARAMS: RockParams = {
  baseRadius: 3,
  noiseScale: 0.3,
  noiseIntensity: 0.5,
  subdivisions: 3,
  color: '#5a5a5a',
  roughness: 0.9,
};

// デフォルトの水草パラメータ
export const DEFAULT_PLANT_PARAMS: PlantParams = {
  stemCount: 5,
  stemHeight: { min: 4, max: 8 },
  stemCurve: 0.3,
  leafCount: 8,
  leafSize: 1.5,
  color: '#2d8c4e',
  swaySpeed: 1.0,
  swayAmount: 0.3,
};

// デフォルトの水車パラメータ
export const DEFAULT_WATERWHEEL_PARAMS: WaterWheelParams = {
  radius: 16,
  width: 10,
  paddleCount: 12,
  woodColor: '#8a5a2b',
  frameColor: '#5c3d1e',
  hubColor: '#3a3a3a',
};

// デフォルトの水中生物パラメータ
export const DEFAULT_TURTLE_PARAMS: CreatureModelParams = { size: 1 };
export const DEFAULT_RAY_PARAMS: CreatureModelParams = { size: 1 };

// デフォルトのサンゴパラメータ
export const DEFAULT_CORAL_PARAMS: CoralParams = {
  branchDepth: 4,
  branchAngle: 0.5,
  thickness: 0.3,
  length: 1.5,
  color: '#ff6b9d',
};
