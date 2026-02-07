import * as THREE from 'three';

// 色パレット
export interface ColorPalette {
  primary: string;
  secondary: string;
  accent?: string;
  pattern?: 'gradient' | 'stripe' | 'spot';
  stripeCount?: number;
}

// 体の形状パラメータ
export interface BodyParams {
  length: number;
  widthCurve: number[]; // ベジェ曲線制御点
  heightCurve: number[];
  segments?: number;
}

// ヒレの形状パラメータ
export interface FinParams {
  dorsal?: { x: number; size: number; angle: number };
  tail: { type: 'fan' | 'flowing' | 'double' | 'forked'; size: number };
  pectoral?: { x: number; size: number; angle: number };
  anal?: { x: number; size: number };
}

// 行動パラメータ（Boids用）
export interface BehaviorParams {
  perceptionRadius: number;
  separationRadius: number;
  separationWeight: number;
  alignmentWeight: number;
  cohesionWeight: number;
  maxSpeed: number;
  turnSpeed: number;
  wanderStrength: number;
}

// アニメーションパラメータ
export interface AnimationParams {
  swimFrequency: number;
  swimAmplitude: number;
  finSpeed: number;
}

// 生き物定義（JSONから読み込み）
export interface CreatureDefinition {
  id: string;
  name: string;
  category: 'fish' | 'crustacean' | 'other';
  size: { min: number; max: number };
  colors: ColorPalette;
  bodyShape: BodyParams;
  finShape: FinParams;
  behavior: BehaviorParams;
  animation: AnimationParams;
}

// 生き物インスタンス（シーン上の個体）
export interface CreatureInstance {
  id: string;
  definitionId: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Quaternion;
  size: number;
  swimPhase: number;
  behaviorParams: BehaviorParams;
  animationParams: AnimationParams;
}

// 生き物スポーン設定
export interface CreatureSpawnConfig {
  definitionId: string;
  count: number;
  spawnArea?: THREE.Box3;
}

// デフォルトの行動パラメータ
export const DEFAULT_BEHAVIOR: BehaviorParams = {
  perceptionRadius: 20,
  separationRadius: 5,
  separationWeight: 1.2,
  alignmentWeight: 1.0,
  cohesionWeight: 0.8,
  maxSpeed: 5,
  turnSpeed: 3,
  wanderStrength: 0.5,
};

// デフォルトのアニメーションパラメータ
export const DEFAULT_ANIMATION: AnimationParams = {
  swimFrequency: 6,
  swimAmplitude: 0.2,
  finSpeed: 4,
};
