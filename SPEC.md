# デジタルアクアリウム 仕様書 (SPEC.md)

## 1.1 課題分析・機能提案

### 課題
- 本物の水槽は維持コスト（餌、水質管理、電気代）が高い
- 生き物の世話ができない環境（オフィス、旅行中など）でも癒しが欲しい
- 既存のデジタルアクアリウムはカスタマイズ性が低い

### 解決策
- Three.jsを使用したWebブラウザで動作する美しいデジタルアクアリウム
- プロシージャル生成による軽量かつ多様な生き物・装飾
- JSON設定ファイルによる簡単なカスタマイズ機能

### 潜在的課題の提案
- **パフォーマンス最適化**: 多数のオブジェクトを描画しつつ60fps維持
- **拡張性**: 新しい生き物や装飾を追加しやすいアーキテクチャ
- **没入感**: ライティング、コースティクス、パーティクル効果による水中表現

### 主要機能
| 区分 | 機能 |
|------|------|
| 入力 | マウス/タッチによるカメラ操作、設定ファイル読込 |
| 処理 | 生き物AI移動、プロシージャルモデル生成、物理シミュレーション |
| 出力 | 3Dレンダリング、水中エフェクト |
| 外部連携 | 設定ファイル(JSON)の読込・保存 |
| メンテナンス | デバッグUI（dat.GUI）、FPS表示 |

---

## 1.2 技術スタック選定・選定根拠

| 区分 | 技術 | 選定根拠 |
|------|------|----------|
| 言語 | TypeScript | 型安全性、IDE補完、大規模プロジェクト向け |
| 3Dライブラリ | Three.js (r160+) | Webブラウザ標準、豊富なエコシステム |
| ビルドツール | Vite | 高速HMR、TypeScript標準対応 |
| カメラ操作 | OrbitControls | Three.js標準、使いやすい自由視点 |
| デバッグUI | lil-gui | 軽量、Three.js公式推奨（dat.GUI後継） |
| シェーダー | GLSL (Three.js ShaderMaterial) | 水中エフェクト、コースティクス表現 |

---

## 1.3 機能詳細化 (ブレイクダウン)

### 主要機能 1: 水槽環境描画
- 1.1 水槽本体（ガラス、底砂、背景）
- 1.2 水面エフェクト（揺らぎ、反射）
- 1.3 水中ライティング（コースティクス、ゴッドレイ）
- 1.4 パーティクル（泡、浮遊物）

### 主要機能 2: 生き物システム
- 2.1 プロシージャル魚モデル生成
- 2.2 群泳AIアルゴリズム（Boids）
- 2.3 個体別行動パターン（巡回、休憩、逃避）
- 2.4 生き物種定義（JSON設定）
- 2.5 アニメーション（泳ぎ、ヒレの動き）

### 主要機能 3: 装飾システム
- 3.1 岩・石のプロシージャル生成
- 3.2 水草のプロシージャル生成（揺れアニメーション付き）
- 3.3 サンゴ・貝殻などのアクセント
- 3.4 装飾配置設定（JSON）

### 主要機能 4: カメラ・UI操作
- 4.1 OrbitControlsによる自由視点
- 4.2 プリセット視点切り替え
- 4.3 設定パネル（lil-gui）
- 4.4 フルスクリーンモード

### 主要機能 5: 設定・カスタマイズ
- 5.1 水槽サイズ設定
- 5.2 生き物追加・削除
- 5.3 装飾追加・削除
- 5.4 ライティング・色調設定
- 5.5 設定のエクスポート/インポート

---

## 1.4 データモデル・データ構造定義

### 生き物定義 (CreatureDefinition)
```
CreatureDefinition {
  id: string              // 一意識別子 (例: "clownfish")
  name: string            // 表示名 (例: "カクレクマノミ")
  category: "fish" | "crustacean" | "other"
  size: { min: number, max: number }  // サイズ範囲
  colors: ColorPalette    // カラーパレット
  bodyShape: BodyParams   // 体の形状パラメータ
  finShape: FinParams     // ヒレの形状パラメータ
  behavior: BehaviorParams // 行動パラメータ
  animation: AnimationParams // アニメーション設定
}
```

### 装飾定義 (DecorationDefinition)
```
DecorationDefinition {
  id: string              // 一意識別子
  name: string            // 表示名
  category: "rock" | "plant" | "coral" | "shell" | "other"
  generatorType: string   // 生成アルゴリズム名
  params: GeneratorParams // 生成パラメータ
  animation?: AnimationParams // 揺れなどのアニメーション
}
```

### 水槽設定 (AquariumConfig)
```
AquariumConfig {
  tank: {
    width: number, height: number, depth: number
    glassColor: string, sandColor: string
  }
  lighting: {
    ambientColor: string, ambientIntensity: number
    sunColor: string, sunIntensity: number
    caustics: boolean
  }
  creatures: CreatureInstance[]
  decorations: DecorationInstance[]
  camera: CameraSettings
}
```

### インスタンス配置
```
CreatureInstance {
  definitionId: string    // 参照する定義ID
  count: number           // 個体数
  spawnArea: BoundingBox  // 出現エリア
}

DecorationInstance {
  definitionId: string
  position: Vector3
  rotation: Vector3
  scale: number
}
```

---

## 1.5 ユーザー操作シナリオ

### インストール・起動
1. プロジェクトをclone: `git clone [repository]`
2. 依存関係インストール: `npm install`
3. 開発サーバー起動: `npm run dev`
4. ブラウザで `http://localhost:5173` を開く

### 通常利用
1. ページを開くとデフォルト水槽が表示される
2. マウスドラッグでカメラを回転、スクロールでズーム
3. 右上の設定アイコンで設定パネル表示
4. 生き物や装飾を追加・削除

### カスタマイズ
1. `src/data/creatures/` に新しい生き物JSONを追加
2. `src/data/decorations/` に新しい装飾JSONを追加
3. 再読込で新しいアイテムが選択可能に

### 終了
- ブラウザタブを閉じる（状態は自動保存オプション有り）

---

## 1.6 UI分析・提案

### 画面レイアウト
```
+--------------------------------------------------+
|  [フルスクリーン] [設定] [リセット]    FPS: 60   |
+--------------------------------------------------+
|                                                  |
|                                                  |
|              3D アクアリウム描画領域               |
|                                                  |
|                                                  |
|                                                  |
+--------------------------------------------------+
```

### 設定パネル（lil-gui）
```
+------------------------+
| ▼ 水槽設定              |
|   サイズ: [====o====]   |
|   ライト: [====o====]   |
+------------------------+
| ▼ 生き物                |
|   [+追加] [一覧...]     |
|   カクレクマノミ x5     |
|   ネオンテトラ x20      |
+------------------------+
| ▼ 装飾                  |
|   [+追加] [一覧...]     |
|   岩 x3                 |
|   水草 x8               |
+------------------------+
| ▼ カメラ                |
|   [正面] [上から] [自動] |
+------------------------+
```

### エラーハンドリング
| シナリオ | 表示 |
|---------|------|
| WebGL非対応 | 「お使いのブラウザはWebGLに対応していません」+ 対応ブラウザ案内 |
| 設定ファイル読込失敗 | コンソール警告 + デフォルト値使用 |
| パフォーマンス低下 | FPS表示が赤くなる + 品質設定の提案 |

---

## 1.7 フォルダ・ファイル構成

```
digital-aquarium/
├── index.html                    # エントリーポイント
├── package.json                  # 依存関係
├── tsconfig.json                 # TypeScript設定
├── vite.config.ts                # Vite設定
├── src/
│   ├── main.ts                   # アプリケーション初期化 (~200行)
│   ├── types/                    # 型定義
│   │   ├── creatures.ts          # 生き物関連型 (~100行)
│   │   ├── decorations.ts        # 装飾関連型 (~80行)
│   │   └── config.ts             # 設定関連型 (~100行)
│   ├── core/                     # コアシステム
│   │   ├── Scene.ts              # シーン管理 (~300行)
│   │   ├── Renderer.ts           # レンダラー設定 (~200行)
│   │   ├── Camera.ts             # カメラ制御 (~250行)
│   │   └── Loop.ts               # アニメーションループ (~150行)
│   ├── environment/              # 環境描画
│   │   ├── Tank.ts               # 水槽本体 (~300行)
│   │   ├── Water.ts              # 水面・水中エフェクト (~400行)
│   │   ├── Lighting.ts           # ライティング (~300行)
│   │   └── Particles.ts          # 泡・浮遊物 (~250行)
│   ├── creatures/                # 生き物システム
│   │   ├── CreatureManager.ts    # 生き物管理 (~300行)
│   │   ├── CreatureFactory.ts    # 生き物生成 (~400行)
│   │   ├── FishGenerator.ts      # 魚モデル生成 (~500行)
│   │   ├── BoidsBehavior.ts      # 群泳AI (~400行)
│   │   └── Animation.ts          # アニメーション (~300行)
│   ├── decorations/              # 装飾システム
│   │   ├── DecorationManager.ts  # 装飾管理 (~250行)
│   │   ├── RockGenerator.ts      # 岩生成 (~350行)
│   │   ├── PlantGenerator.ts     # 水草生成 (~400行)
│   │   └── CoralGenerator.ts     # サンゴ生成 (~350行)
│   ├── shaders/                  # シェーダー
│   │   ├── water.vert            # 水面頂点シェーダー
│   │   ├── water.frag            # 水面フラグメントシェーダー
│   │   ├── caustics.frag         # コースティクス
│   │   └── fish.vert             # 魚アニメーション
│   ├── ui/                       # UI
│   │   ├── SettingsPanel.ts      # 設定パネル (~400行)
│   │   └── DebugUI.ts            # デバッグUI (~200行)
│   ├── utils/                    # ユーティリティ
│   │   ├── math.ts               # 数学関数 (~150行)
│   │   ├── color.ts              # 色操作 (~100行)
│   │   └── noise.ts              # ノイズ関数 (~200行)
│   └── data/                     # データ定義
│       ├── creatures/            # 生き物定義JSON
│       │   ├── clownfish.json
│       │   ├── neontetra.json
│       │   ├── angelfish.json
│       │   ├── bettafish.json
│       │   ├── goldfish.json
│       │   ├── guppy.json
│       │   ├── discus.json
│       │   ├── shrimp.json
│       │   ├── snail.json
│       │   └── jellyfish.json
│       ├── decorations/          # 装飾定義JSON
│       │   ├── rocks.json
│       │   ├── plants.json
│       │   └── corals.json
│       └── presets/              # プリセット設定
│           └── default.json
└── public/
    └── textures/                 # テクスチャ（必要時のみ）
        └── caustics.png
```

**ファイル行数目安**: 各ファイル800行以下を厳守。複雑化した場合は分割。

---

## 1.8 実装概要

### core/ - コアシステム
| ファイル | 役割 |
|---------|------|
| Scene.ts | Three.jsシーン作成・管理。全オブジェクトの親 |
| Renderer.ts | WebGLRenderer設定、リサイズ対応、後処理 |
| Camera.ts | PerspectiveCamera + OrbitControls、プリセット視点 |
| Loop.ts | requestAnimationFrame管理、delta時間計算 |

### environment/ - 環境描画
| ファイル | 役割 |
|---------|------|
| Tank.ts | 水槽のガラス壁、底砂、背景のメッシュ生成 |
| Water.ts | 水面の波、水中の霧、屈折表現 |
| Lighting.ts | 環境光、太陽光、コースティクス投影 |
| Particles.ts | 泡パーティクル、浮遊物のインスタンス描画 |

### creatures/ - 生き物システム
| ファイル | 役割 |
|---------|------|
| CreatureManager.ts | 生き物のライフサイクル管理、追加・削除 |
| CreatureFactory.ts | JSON定義から生き物インスタンス生成 |
| FishGenerator.ts | 魚のプロシージャルメッシュ生成 |
| BoidsBehavior.ts | Craig ReynoldsのBoidsアルゴリズム実装 |
| Animation.ts | 泳ぎアニメーション、頂点シェーダー制御 |

### decorations/ - 装飾システム
| ファイル | 役割 |
|---------|------|
| DecorationManager.ts | 装飾のライフサイクル管理 |
| RockGenerator.ts | Perlinノイズベースの岩メッシュ生成 |
| PlantGenerator.ts | L-System的な水草生成、揺れシェーダー |
| CoralGenerator.ts | 分岐構造によるサンゴ生成 |

---

## 1.9 メンテナンス・セキュリティ

### メンテナンスモード
- lil-guiによるリアルタイムパラメータ調整
- FPS/メモリ表示（stats.js統合オプション）
- シーンオブジェクト一覧表示

### ログ出力
- 開発時: console.log でオブジェクト生成・破棄をトレース
- 本番時: エラーのみ出力

### デバッグ機能
- ワイヤーフレーム表示切替
- バウンディングボックス表示
- AI行動可視化（移動ベクトル表示）

### セキュリティ
- 外部入力: 設定JSONのバリデーション（不正値は無視）
- XSS対策: ユーザー入力は文字列としてのみ使用
- 依存関係: npm audit による脆弱性チェック

---

## デフォルト生き物一覧（10種）

| ID | 名前 | カテゴリ | 特徴 |
|----|------|---------|------|
| clownfish | カクレクマノミ | fish | オレンジと白の縞模様 |
| neontetra | ネオンテトラ | fish | 青と赤のライン、群泳 |
| angelfish | エンゼルフィッシュ | fish | 三角形の体、優雅な動き |
| bettafish | ベタ | fish | 大きなヒレ、華やかな色 |
| goldfish | 金魚 | fish | 丸い体、ふんわり泳ぐ |
| guppy | グッピー | fish | カラフルな尾ビレ、小型 |
| discus | ディスカス | fish | 円盤形、縞模様 |
| shrimp | エビ | crustacean | 透明感、底を歩く |
| snail | 巻貝 | other | ゆっくり移動、壁を這う |
| jellyfish | クラゲ | other | 透明、ふわふわ浮遊 |

---

**このSPEC.mdの承認をお願いします。承認後、SPEC_DETAIL.mdの作成に進みます。**
