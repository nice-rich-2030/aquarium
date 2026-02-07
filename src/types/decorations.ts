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

// サンゴの生成パラメータ
export interface CoralParams {
  branchDepth: number;
  branchAngle: number;
  thickness: number;
  length: number;
  color: string;
}

// 貝殻の生成パラメータ
export interface ShellParams {
  spiralTurns: number;
  size: number;
  color: string;
}

// ジェネレータパラメータ（共用体）
export type GeneratorParams = RockParams | PlantParams | CoralParams | ShellParams;

// アニメーションパラメータ（揺れなど）
export interface DecorationAnimationParams {
  type: 'sway' | 'rotate' | 'none';
  speed?: number;
  amount?: number;
}

// 装飾定義（JSONから読み込み）
export interface DecorationDefinition {
  id: string;
  name: string;
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
}

// 装飾配置設定
export interface DecorationPlacementConfig {
  definitionId: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: number;
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

// デフォルトのサンゴパラメータ
export const DEFAULT_CORAL_PARAMS: CoralParams = {
  branchDepth: 4,
  branchAngle: 0.5,
  thickness: 0.3,
  length: 1.5,
  color: '#ff6b9d',
};
