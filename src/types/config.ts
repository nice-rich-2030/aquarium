import { CreatureSpawnConfig } from './creatures';
import { DecorationPlacementConfig } from './decorations';

// 水槽設定
export interface TankConfig {
  width: number;
  height: number;
  depth: number;
  glassColor: string;
  glassOpacity: number;
  sandColor: string;
  backgroundColor: string;
}

// ライティング設定
export interface LightingConfig {
  ambientColor: string;
  ambientIntensity: number;
  sunColor: string;
  sunIntensity: number;
  caustics: boolean;
  causticsIntensity: number;
}

// 水エフェクト設定
export interface WaterConfig {
  fogColor: string;
  fogNear: number;
  fogFar: number;
  surfaceWaves: boolean;
  waveSpeed: number;
  waveHeight: number;
}

// パーティクル設定
export interface ParticleConfig {
  bubbleCount: number;
  bubbleSpeed: number;
  bubbleSize: { min: number; max: number };
  dustCount: number;
  dustSpeed: number;
}

// カメラ設定
export interface CameraConfig {
  fov: number;
  near: number;
  far: number;
  initialPosition: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
  autoRotate: boolean;
  autoRotateSpeed: number;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
}

// プリセット視点
export interface CameraPreset {
  name: string;
  position: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
}

// アクアリウム全体の設定
export interface AquariumConfig {
  tank: TankConfig;
  lighting: LightingConfig;
  water: WaterConfig;
  particles: ParticleConfig;
  camera: CameraConfig;
  cameraPresets: CameraPreset[];
  creatures: CreatureSpawnConfig[];
  decorations: DecorationPlacementConfig[];
}

// デフォルトの水槽設定
export const DEFAULT_TANK_CONFIG: TankConfig = {
  width: 100,
  height: 60,
  depth: 50,
  glassColor: '#88ccff',
  glassOpacity: 0.1,
  sandColor: '#c4a35a',
  backgroundColor: '#001830',
};

// デフォルトのライティング設定
export const DEFAULT_LIGHTING_CONFIG: LightingConfig = {
  ambientColor: '#4488cc',
  ambientIntensity: 0.4,
  sunColor: '#ffffee',
  sunIntensity: 1.0,
  caustics: true,
  causticsIntensity: 0.3,
};

// デフォルトの水エフェクト設定
export const DEFAULT_WATER_CONFIG: WaterConfig = {
  fogColor: '#003355',
  fogNear: 10,
  fogFar: 150,
  surfaceWaves: true,
  waveSpeed: 0.5,
  waveHeight: 0.5,
};

// デフォルトのパーティクル設定
export const DEFAULT_PARTICLE_CONFIG: ParticleConfig = {
  bubbleCount: 50,
  bubbleSpeed: 5,
  bubbleSize: { min: 0.1, max: 0.5 },
  dustCount: 100,
  dustSpeed: 0.2,
};

// デフォルトのカメラ設定
export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  fov: 60,
  near: 0.1,
  far: 1000,
  initialPosition: { x: 0, y: 20, z: 80 },
  lookAt: { x: 0, y: 0, z: 0 },
  autoRotate: false,
  autoRotateSpeed: 0.5,
  minDistance: 30,
  maxDistance: 200,
  minPolarAngle: Math.PI * 0.1,
  maxPolarAngle: Math.PI * 0.8,
};

// デフォルトのカメラプリセット
export const DEFAULT_CAMERA_PRESETS: CameraPreset[] = [
  { name: '正面', position: { x: 0, y: 10, z: 80 }, lookAt: { x: 0, y: 0, z: 0 } },
  { name: '上から', position: { x: 0, y: 80, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } },
  { name: 'コーナー', position: { x: 60, y: 30, z: 60 }, lookAt: { x: 0, y: 0, z: 0 } },
  { name: '横から', position: { x: 100, y: 10, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } },
];

// デフォルトの全体設定
export const DEFAULT_AQUARIUM_CONFIG: AquariumConfig = {
  tank: DEFAULT_TANK_CONFIG,
  lighting: DEFAULT_LIGHTING_CONFIG,
  water: DEFAULT_WATER_CONFIG,
  particles: DEFAULT_PARTICLE_CONFIG,
  camera: DEFAULT_CAMERA_CONFIG,
  cameraPresets: DEFAULT_CAMERA_PRESETS,
  creatures: [],
  decorations: [],
};
