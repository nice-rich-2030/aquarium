# Digital Aquarium

Three.js を使用した観賞用デジタルアクアリウム。ブラウザ上で美しい水槽をリアルタイム描画します。

![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Three.js](https://img.shields.io/badge/Three.js-r160-green)
![Vite](https://img.shields.io/badge/Vite-5.4-purple)

## Features

- **プロシージャル生成** - 魚・岩・水草を外部モデルなしでコード生成
- **群泳AI (Boids)** - 分離・整列・結合ルールによる自然な群れの動き
- **衝突回避** - サイズベースのハードコリジョンで魚同士の重なりを防止
- **水中エフェクト** - コースティクス(光の模様)、泡パーティクル、水草の揺れ
- **自由視点カメラ** - マウスドラッグで360度回転、スクロールでズーム
- **カスタマイズ** - GUI から生き物・装飾の追加/削除が可能

## Default Creatures (5 species)

| Species | Count | Behavior |
|---------|-------|----------|
| Neon Tetra | 15 | Fast schooling fish |
| Clownfish | 3 | Active swimmers |
| Angelfish | 2 | Slow, elegant movement |
| Guppy | 8 | Small, colorful |
| Goldfish | 2 | Round, gentle swimming |

## Getting Started

```bash
# Clone
git clone https://github.com/<your-username>/digital-aquarium.git
cd digital-aquarium

# Install
npm install

# Dev server
npm run dev

# Build
npm run build
```

Open http://localhost:5173 in your browser.

## Controls

| Input | Action |
|-------|--------|
| Left drag | Rotate camera |
| Scroll | Zoom in/out |
| Settings panel (top-right) | Add/remove creatures and decorations |

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Language | TypeScript | 5.3.3 |
| 3D Engine | Three.js | r160 (0.160.0) |
| Build Tool | Vite | 5.4.2 |
| UI | lil-gui | 0.19.2 |

### TypeScript Configuration

- **Target**: ES2020
- **Module**: ESNext (latest ES modules)
- **Strict Mode**: Enabled (type-safe development)
- **Unused Variables/Parameters**: Detection enabled
- **DOM API**: Enabled

### Three.js Features Used

| Category | APIs |
|----------|------|
| **Core** | Scene, PerspectiveCamera, WebGLRenderer |
| **Controls** | OrbitControls (mouse interaction) |
| **Geometry** | BufferGeometry, PlaneGeometry, IcosahedronGeometry, ShapeGeometry, TubeGeometry |
| **Materials** | MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial |
| **Lighting** | AmbientLight, DirectionalLight |
| **Optimization** | InstancedMesh (fast particle rendering) |
| **Math** | Vector3, Quaternion, Matrix4, Box3 |
| **Curves** | CatmullRomCurve3 (plant stems) |

### Project Statistics

```
TypeScript Files: 27 files
Total Lines of Code: 4,179 lines
Average File Size: ~155 lines/file
Max File Size: <800 lines (maintainability constraint)
```

### Performance Targets

| Feature | Complexity | Target FPS |
|---------|-----------|-----------|
| Boids AI | O(n) with spatial grid | 60 FPS @ 100 fish |
| Collision Detection | O(n) hard collision | 60 FPS |
| Procedural Generation | O(1) per mesh | <10ms per fish |

### Browser Requirements

- **WebGL**: 1.0 or higher
- **ES2020**: Chrome 80+, Firefox 72+, Safari 13.1+, Edge 80+

## Project Structure

```
src/
├── main.ts              # Entry point
├── types/               # Type definitions
├── core/                # Scene, Renderer, Camera, Loop
├── environment/         # Tank, Lighting, Particles
├── creatures/           # FishGenerator, BoidsBehavior, CreatureManager
├── decorations/         # RockGenerator, PlantGenerator, DecorationManager
├── ui/                  # Settings panel (lil-gui)
└── utils/               # Math, Noise, Color utilities
```

## Architecture

```
main.ts
  ├── Core: Scene → Renderer → Camera → AnimationLoop
  ├── Environment: Tank + Lighting + Particles
  ├── Creatures: CreatureManager → BoidsBehavior → FishGenerator
  ├── Decorations: DecorationManager → Rock/Plant generators
  └── UI: SettingsPanel (lil-gui)
```

### Key Algorithms

- **Boids** - Craig Reynolds' flocking algorithm with spatial grid optimization (O(n))
- **Procedural fish** - Bezier curve body shapes with vertex color patterns
- **Caustics** - Voronoi-based texture projection animated on the tank floor
- **Plant sway** - Vertex shader displacement with multi-frequency sine waves

## License

MIT
