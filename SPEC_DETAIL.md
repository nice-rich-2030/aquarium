# デジタルアクアリウム 詳細設計書 (SPEC_DETAIL.md)

## 2.1 ファイルごとの実装概要

---

### main.ts
- **役割**: アプリケーションのエントリーポイント。全モジュールの初期化と起動
- **処理フロー**:
```
[DOMContentLoaded]
    ↓
[設定ファイル読込] → ConfigLoader
    ↓
[コアシステム初期化] → Scene, Renderer, Camera, Loop
    ↓
[環境構築] → Tank, Water, Lighting, Particles
    ↓
[生き物配置] → CreatureManager.spawn()
    ↓
[装飾配置] → DecorationManager.spawn()
    ↓
[UI初期化] → SettingsPanel
    ↓
[アニメーションループ開始] → Loop.start()
```
- **主要な関数**:
  - `init()`: 全システム初期化
  - `loadConfig()`: 設定JSON読込
  - `setupEventListeners()`: リサイズ等のイベント登録
- **他ファイルとの連携**: 全モジュールを統括
- **実装時の注意点**: 非同期処理（設定読込）のエラーハンドリング

---

### core/Scene.ts
- **役割**: Three.jsシーンの作成・管理。全3Dオブジェクトの親
- **処理フロー**:
```
[constructor]
    ↓
[THREE.Scene作成]
    ↓
[背景色・霧設定] → 水中の青みがかった霧
    ↓
[add/remove API提供]
```
- **主要な関数**:
  - `constructor()`: シーン作成、霧設定
  - `add(object: THREE.Object3D)`: オブジェクト追加
  - `remove(object: THREE.Object3D)`: オブジェクト削除
  - `getScene()`: THREE.Sceneインスタンス取得
- **他ファイルとの連携**:
  - → Renderer: 描画対象として渡す
  - ← Tank, Creatures, Decorations: 各オブジェクトがaddされる
- **実装時の注意点**: 霧のパラメータは水槽サイズに応じて調整

---

### core/Renderer.ts
- **役割**: WebGLRendererの設定、画面リサイズ対応、後処理エフェクト
- **処理フロー**:
```
[constructor]
    ↓
[WebGLRenderer作成] → アンチエイリアス、HDR対応
    ↓
[DOM追加] → canvas要素をbodyに追加
    ↓
[リサイズリスナー登録]
    ↓
[後処理パイプライン設定] → EffectComposer (optional)
```
- **主要な関数**:
  - `constructor(container: HTMLElement)`: レンダラー初期化
  - `render(scene, camera)`: 1フレーム描画
  - `resize()`: ウィンドウサイズに合わせて調整
  - `setPixelRatio(ratio)`: デバイスピクセル比設定
- **他ファイルとの連携**:
  - ← Scene: シーンを受け取る
  - ← Camera: カメラを受け取る
  - ← Loop: 毎フレームrender()呼び出し
- **実装時の注意点**: モバイル対応のためピクセル比は2までに制限

---

### core/Camera.ts
- **役割**: PerspectiveCameraの管理、OrbitControlsによる自由視点操作
- **処理フロー**:
```
[constructor]
    ↓
[PerspectiveCamera作成] → FOV 60°, 水槽が収まる位置
    ↓
[OrbitControls設定] → 回転・ズーム・パン制限
    ↓
[プリセット視点定義] → 正面、上面、コーナーなど
```
- **主要な関数**:
  - `constructor(renderer)`: カメラ・コントロール初期化
  - `setPreset(name)`: プリセット視点に移動（アニメーション付き）
  - `update()`: コントロール更新（毎フレーム）
  - `enableAutoRotate(speed)`: 自動回転モード
- **他ファイルとの連携**:
  - ← Renderer: DOM要素を受け取る
  - → Loop: 毎フレームupdate()
  - ← SettingsPanel: プリセット切替
- **実装時の注意点**:
  - ズーム範囲を水槽内に制限
  - 自動回転時はユーザー操作で停止

---

### core/Loop.ts
- **役割**: requestAnimationFrameループ管理、delta時間計算
- **処理フロー**:
```
[start()]
    ↓
[requestAnimationFrame]
    ↓
[delta計算] → 前フレームからの経過時間
    ↓
[全更新処理呼び出し] → creatures, decorations, camera
    ↓
[render呼び出し]
    ↓
[次フレームへ]
```
- **主要な関数**:
  - `start()`: ループ開始
  - `stop()`: ループ停止
  - `addUpdateCallback(fn)`: 更新処理を登録
  - `removeUpdateCallback(fn)`: 更新処理を削除
- **他ファイルとの連携**:
  - → 全更新対象: delta時間を渡してupdate呼び出し
  - → Renderer: render()呼び出し
- **実装時の注意点**: delta時間の上限設定（タブ非アクティブ時対策）

---

### environment/Tank.ts
- **役割**: 水槽本体（ガラス壁、底砂、背景）のメッシュ生成
- **処理フロー**:
```
[constructor(config)]
    ↓
[底面メッシュ作成] → PlaneGeometry + 砂テクスチャ
    ↓
[ガラス壁作成] → 半透明マテリアル、4面
    ↓
[背景作成] → グラデーションシェーダー
    ↓
[Sceneに追加]
```
- **主要な関数**:
  - `constructor(config)`: 水槽サイズ・色設定で生成
  - `getBounds()`: 水槽の境界ボックス取得
  - `dispose()`: メモリ解放
- **他ファイルとの連携**:
  - → Scene: メッシュ追加
  - → Creatures/Decorations: 境界情報提供
- **実装時の注意点**: ガラスの反射はCubeCamera不要でFresnel効果で代用

---

### environment/Water.ts
- **役割**: 水面エフェクト（波、反射）、水中の霧・屈折表現
- **処理フロー**:
```
[constructor]
    ↓
[水面メッシュ作成] → PlaneGeometry
    ↓
[水面シェーダー設定] → 波、反射、屈折
    ↓
[水中フォグ設定] → Scene.fogへ反映
    ↓
[update()] → 波アニメーション
```
- **主要な関数**:
  - `constructor(tankBounds)`: 水槽サイズに合わせて生成
  - `update(time)`: 波のアニメーション更新
  - `setVisibility(visible)`: 水面表示切替
- **他ファイルとの連携**:
  - ← Tank: 境界情報
  - → Scene: メッシュ追加、fog設定
  - ← shaders/water.*: シェーダーコード
- **実装時の注意点**:
  - 波の高さは控えめに（揺れすぎると酔う）
  - 屈折は近似でOK

---

### environment/Lighting.ts
- **役割**: 環境光、太陽光（上からの光）、コースティクス投影
- **処理フロー**:
```
[constructor(config)]
    ↓
[AmbientLight作成] → 柔らかい環境光
    ↓
[DirectionalLight作成] → 上からの主光源
    ↓
[コースティクス設定] → プロジェクターテクスチャまたはシェーダー
    ↓
[update()] → コースティクスアニメーション
```
- **主要な関数**:
  - `constructor(config)`: 光源初期化
  - `update(time)`: コースティクスアニメーション
  - `setIntensity(ambient, sun)`: 明るさ調整
- **他ファイルとの連携**:
  - → Scene: ライト追加
  - ← shaders/caustics.frag: コースティクスシェーダー
- **実装時の注意点**: コースティクスはテクスチャ投影が軽量でおすすめ

---

### environment/Particles.ts
- **役割**: 泡、浮遊物のパーティクル描画
- **処理フロー**:
```
[constructor(config)]
    ↓
[泡パーティクル作成] → InstancedMesh、上昇運動
    ↓
[浮遊物作成] → 小さな白い粒子、ブラウン運動
    ↓
[update()] → 位置更新、リサイクル
```
- **主要な関数**:
  - `constructor(config)`: パーティクル初期化
  - `update(delta)`: 位置更新
  - `setBubbleRate(rate)`: 泡発生頻度設定
- **他ファイルとの連携**:
  - ← Tank: 境界情報（泡の発生・消滅位置）
  - → Scene: メッシュ追加
- **実装時の注意点**: InstancedMeshで描画コスト削減

---

### creatures/CreatureManager.ts
- **役割**: 生き物のライフサイクル管理、追加・削除API
- **処理フロー**:
```
[constructor]
    ↓
[生き物定義読込] → data/creatures/*.json
    ↓
[spawn(definitionId, count)]
    ↓
[CreatureFactory呼び出し] → インスタンス生成
    ↓
[update()] → 全生き物のAI・アニメーション更新
```
- **主要な関数**:
  - `loadDefinitions()`: 生き物定義JSON読込
  - `spawn(definitionId, count, area)`: 生き物追加
  - `remove(definitionId)`: 種類指定で削除
  - `update(delta)`: 毎フレーム更新
  - `getCreatureList()`: 現在の生き物一覧取得
- **他ファイルとの連携**:
  - → CreatureFactory: 生成依頼
  - → BoidsBehavior: AI更新
  - → Animation: アニメーション更新
  - ← SettingsPanel: spawn/remove呼び出し
- **実装時の注意点**: 種類ごとにグループ化して管理

---

### creatures/CreatureFactory.ts
- **役割**: JSON定義から生き物の3Dオブジェクト生成
- **処理フロー**:
```
[create(definition, position)]
    ↓
[カテゴリ判定] → fish / crustacean / other
    ↓
[適切なGenerator呼び出し]
    ↓
[行動パラメータ設定]
    ↓
[生き物オブジェクト返却]
```
- **主要な関数**:
  - `create(definition, position)`: 1体生成
  - `createBatch(definition, count, area)`: 複数体生成
- **他ファイルとの連携**:
  - ← CreatureManager: 生成依頼
  - → FishGenerator: 魚メッシュ生成
  - ← data/creatures/*.json: 定義読込
- **実装時の注意点**: 各Generatorは差し替え可能な設計に

---

### creatures/FishGenerator.ts
- **役割**: 魚のプロシージャルメッシュ生成
- **処理フロー**:
```
[generate(params)]
    ↓
[体のジオメトリ生成] → 楕円体ベース、カーブ変形
    ↓
[ヒレ生成] → 背ビレ、尾ビレ、胸ビレ
    ↓
[目の追加] → 球体
    ↓
[マテリアル設定] → 色、グラデーション
    ↓
[Mesh返却]
```
- **主要な関数**:
  - `generate(bodyParams, finParams, colors)`: 魚メッシュ生成
  - `generateBody(params)`: 体の形状生成
  - `generateFins(params)`: ヒレ生成
  - `applyColors(mesh, palette)`: 色適用
- **他ファイルとの連携**:
  - ← CreatureFactory: 生成呼び出し
  - → shaders/fish.vert: アニメーション用頂点シェーダー
- **実装時の注意点**:
  - BufferGeometryで効率的に
  - 頂点カラーでグラデーション表現

---

### creatures/BoidsBehavior.ts
- **役割**: Craig ReynoldsのBoidsアルゴリズムによる群泳AI
- **処理フロー**:
```
[update(creatures, delta)]
    ↓
[各個体について]
    ↓
[分離 (Separation)] → 近くの仲間から離れる
    ↓
[整列 (Alignment)] → 近くの仲間と同じ方向へ
    ↓
[結合 (Cohesion)] → 群れの中心へ
    ↓
[境界回避] → 水槽の壁から離れる
    ↓
[速度適用] → 位置・向き更新
```
- **主要な関数**:
  - `update(creatures, delta)`: 全個体の行動更新
  - `separation(creature, neighbors)`: 分離計算
  - `alignment(creature, neighbors)`: 整列計算
  - `cohesion(creature, neighbors)`: 結合計算
  - `avoidBounds(creature, bounds)`: 境界回避
- **他ファイルとの連携**:
  - ← CreatureManager: 毎フレーム呼び出し
  - ← Tank: 境界情報
- **実装時の注意点**:
  - 空間分割で近傍検索を高速化
  - 重みパラメータは種類ごとに調整可能に

---

### creatures/Animation.ts
- **役割**: 泳ぎアニメーション、ヒレの動きの制御
- **処理フロー**:
```
[update(creature, delta)]
    ↓
[泳ぎサイクル計算] → sin波
    ↓
[体の曲げ] → 頂点シェーダーへuniform送信
    ↓
[ヒレの動き] → 回転・揺れ
    ↓
[向き補間] → 移動方向へスムーズに回転
```
- **主要な関数**:
  - `update(creature, delta)`: アニメーション更新
  - `setSwimSpeed(creature, speed)`: 泳ぎ速度設定
  - `applyBend(mesh, amount)`: 体の曲げ適用
- **他ファイルとの連携**:
  - ← CreatureManager: 毎フレーム呼び出し
  - → shaders/fish.vert: uniform値送信
- **実装時の注意点**:
  - 速度に応じて泳ぎ周期を変化
  - 静止時は微動のみ

---

### decorations/DecorationManager.ts
- **役割**: 装飾のライフサイクル管理
- **処理フロー**:
```
[constructor]
    ↓
[装飾定義読込] → data/decorations/*.json
    ↓
[place(definitionId, position, rotation, scale)]
    ↓
[適切なGenerator呼び出し]
    ↓
[update()] → 水草の揺れなど
```
- **主要な関数**:
  - `loadDefinitions()`: 装飾定義読込
  - `place(definitionId, position, rotation, scale)`: 装飾配置
  - `remove(id)`: 装飾削除
  - `update(delta)`: アニメーション更新
- **他ファイルとの連携**:
  - → RockGenerator, PlantGenerator, CoralGenerator: 生成依頼
  - → Scene: メッシュ追加
  - ← SettingsPanel: place/remove呼び出し
- **実装時の注意点**: 配置時に他オブジェクトとの重なりチェック

---

### decorations/RockGenerator.ts
- **役割**: Perlinノイズベースの岩メッシュ生成
- **処理フロー**:
```
[generate(params)]
    ↓
[基本形状作成] → IcosahedronGeometry
    ↓
[ノイズ変形] → 各頂点をPerlinノイズで凸凹に
    ↓
[法線再計算]
    ↓
[マテリアル設定] → 岩の色、質感
    ↓
[Mesh返却]
```
- **主要な関数**:
  - `generate(params)`: 岩メッシュ生成
  - `applyNoise(geometry, scale, intensity)`: ノイズ変形
- **他ファイルとの連携**:
  - ← DecorationManager: 生成呼び出し
  - ← utils/noise.ts: ノイズ関数
- **実装時の注意点**: 頂点数が多いとメモリ消費増

---

### decorations/PlantGenerator.ts
- **役割**: L-System的な水草生成、揺れアニメーション
- **処理フロー**:
```
[generate(params)]
    ↓
[茎の生成] → 複数の曲線
    ↓
[葉の生成] → 茎に沿って配置
    ↓
[揺れシェーダー設定] → 頂点シェーダーでsin波変形
    ↓
[Group返却]
```
- **主要な関数**:
  - `generate(params)`: 水草生成
  - `generateStem(curve)`: 茎メッシュ生成
  - `generateLeaf(position, rotation)`: 葉メッシュ生成
  - `update(time)`: 揺れアニメーション
- **他ファイルとの連携**:
  - ← DecorationManager: 生成・更新呼び出し
  - → shaders/plant.vert: 揺れシェーダー
- **実装時の注意点**: 葉の向きにランダム性を

---

### decorations/CoralGenerator.ts
- **役割**: 分岐構造によるサンゴ生成
- **処理フロー**:
```
[generate(params)]
    ↓
[再帰的分岐生成] → 枝分かれ構造
    ↓
[各枝の太さ計算] → 先端ほど細く
    ↓
[色設定] → ピンク、オレンジなど鮮やか系
    ↓
[Group返却]
```
- **主要な関数**:
  - `generate(params)`: サンゴ生成
  - `branch(position, direction, depth, thickness)`: 再帰的枝生成
- **他ファイルとの連携**:
  - ← DecorationManager: 生成呼び出し
- **実装時の注意点**: 分岐深度の上限設定（描画負荷対策）

---

### ui/SettingsPanel.ts
- **役割**: lil-guiによる設定UI
- **処理フロー**:
```
[constructor(managers)]
    ↓
[GUI作成]
    ↓
[水槽設定フォルダ] → サイズ、ライト
    ↓
[生き物フォルダ] → 追加・削除ボタン
    ↓
[装飾フォルダ] → 追加・削除ボタン
    ↓
[カメラフォルダ] → プリセット、自動回転
```
- **主要な関数**:
  - `constructor(managers)`: UI構築
  - `addCreatureFolder()`: 生き物設定UI
  - `addDecorationFolder()`: 装飾設定UI
  - `exportConfig()`: 設定エクスポート
  - `importConfig(json)`: 設定インポート
- **他ファイルとの連携**:
  - → CreatureManager: spawn/remove
  - → DecorationManager: place/remove
  - → Camera: setPreset, enableAutoRotate
  - → Lighting: setIntensity
- **実装時の注意点**:
  - UIは右上に配置、折りたたみ可能
  - モバイルでは自動で閉じる

---

### ui/DebugUI.ts
- **役割**: 開発用デバッグ機能
- **処理フロー**:
```
[constructor(scene, managers)]
    ↓
[FPS表示] → stats.js統合
    ↓
[ワイヤーフレーム切替]
    ↓
[バウンディングボックス表示]
    ↓
[AI可視化] → 移動ベクトル表示
```
- **主要な関数**:
  - `constructor(scene, managers)`: デバッグUI初期化
  - `toggleWireframe()`: ワイヤーフレーム切替
  - `showBoundingBoxes(visible)`: バウンディングボックス表示
  - `showAIVectors(visible)`: AI可視化
- **他ファイルとの連携**:
  - ← Scene: 全オブジェクトアクセス
  - ← CreatureManager: AI情報取得
- **実装時の注意点**: 本番ビルドでは無効化オプション

---

### utils/math.ts
- **役割**: 数学ユーティリティ関数
- **主要な関数**:
  - `clamp(value, min, max)`: 値を範囲内に制限
  - `lerp(a, b, t)`: 線形補間
  - `smoothstep(edge0, edge1, x)`: スムーズな補間
  - `randomRange(min, max)`: 範囲内ランダム
  - `randomInSphere(radius)`: 球内のランダム点
  - `randomInBox(bounds)`: ボックス内のランダム点

---

### utils/color.ts
- **役割**: 色操作ユーティリティ
- **主要な関数**:
  - `hexToRgb(hex)`: HEX→RGB変換
  - `hslToRgb(h, s, l)`: HSL→RGB変換
  - `lerpColor(color1, color2, t)`: 色の補間
  - `adjustSaturation(color, amount)`: 彩度調整

---

### utils/noise.ts
- **役割**: ノイズ関数（プロシージャル生成用）
- **主要な関数**:
  - `perlin2D(x, y)`: 2Dパーリンノイズ
  - `perlin3D(x, y, z)`: 3Dパーリンノイズ
  - `fbm(x, y, octaves)`: フラクタルブラウン運動
  - `turbulence(x, y, octaves)`: タービュランスノイズ

---

## 2.2 ソフトウェア画面構成の概要

### 画面 1: メイン画面（アクアリウム表示）

- **目的**: デジタルアクアリウムの観賞

- **レイアウト**:
```
+==================================================================+
|  [Fullscreen]  [Settings]  [Reset]              FPS: 60  Mem: 45MB |
+==================================================================+
|                                                                    |
|                                                                    |
|                     .  . . .    . .   .                            |
|              ><>           ><>        .   .                        |
|                    ><>                   ><>    .                  |
|           /|   ><>    ~~~~    ><>                                  |
|    ~~~/|  ||        ~~~~            ><>                            |
|   ~~~~||  ||   ><>       ~~~~  ><>     .                           |
|   ~~~~||  ||      ><>                       ><>                    |
|   ~~~~    ||  /\      /\   ><>   /\    /\                          |
|          /\\ //\\    //\\      //\\  //\\   /\                     |
|   ~~~~~~~ O   O       O   O       O    O  ~~~~~~                   |
|   _______________________________________________________________  |
|   :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::  |
+====================================================================+
```

- **各要素の説明**:
| 要素 | 説明 |
|------|------|
| Fullscreen | フルスクリーンモード切替ボタン |
| Settings | 設定パネル表示/非表示ボタン |
| Reset | カメラ位置リセットボタン |
| FPS/Mem | パフォーマンス情報（開発時のみ） |
| ><> | 魚（各種） |
| . | 泡パーティクル |
| ~~~~ | 水草（揺れアニメーション） |
| /\ | 岩 |
| O | 貝殻・装飾 |
| ::: | 底砂 |

- **ナビゲーション**:
  - マウスドラッグ: カメラ回転
  - スクロール: ズームイン/アウト
  - 右クリックドラッグ: カメラパン

---

### 画面 2: 設定パネル（lil-gui）

- **目的**: アクアリウムのカスタマイズ

- **レイアウト**:
```
                              +================================+
                              | Settings                    [x]|
                              +================================+
                              | ▼ Tank                         |
                              |   Width   [====o====] 100      |
                              |   Height  [====o====] 60       |
                              |   Depth   [====o====] 50       |
                              +--------------------------------+
                              | ▼ Lighting                     |
                              |   Ambient [====o====] 0.4      |
                              |   Sun     [====o====] 1.0      |
                              |   Caustics [✓]                 |
                              +--------------------------------+
                              | ▼ Creatures                    |
                              |   [+ Add Creature]             |
                              |   -------------------------    |
                              |   Clownfish      x5  [Delete]  |
                              |   Neon Tetra     x20 [Delete]  |
                              |   Angelfish      x3  [Delete]  |
                              +--------------------------------+
                              | ▼ Decorations                  |
                              |   [+ Add Decoration]           |
                              |   -------------------------    |
                              |   Rock (Large)   x2  [Delete]  |
                              |   Seagrass       x8  [Delete]  |
                              |   Coral (Pink)   x1  [Delete]  |
                              +--------------------------------+
                              | ▼ Camera                       |
                              |   [Front] [Top] [Corner]       |
                              |   Auto-rotate [✓]              |
                              |   Speed [====o====] 0.5        |
                              +--------------------------------+
                              | ▼ Export/Import                |
                              |   [Export JSON] [Import JSON]  |
                              +================================+
```

- **各要素の説明**:
| 要素 | 説明 |
|------|------|
| Tank | 水槽サイズ設定（幅・高さ・奥行き） |
| Lighting | ライティング設定（環境光・太陽光・コースティクス） |
| Creatures | 生き物の追加・削除・個体数調整 |
| Decorations | 装飾の追加・削除・配置調整 |
| Camera | カメラプリセット、自動回転設定 |
| Export/Import | 設定のJSON出力・読込 |

---

### 画面 3: 生き物追加ダイアログ

- **目的**: 新しい生き物を水槽に追加

- **レイアウト**:
```
+======================================+
|  Add Creature                     [x]|
+======================================+
|  Category: [ Fish          ▼]        |
+--------------------------------------+
|  +------------+  +------------+      |
|  | ><>        |  | ><>        |      |
|  | Clownfish  |  | Neon Tetra |      |
|  | [Add]      |  | [Add]      |      |
|  +------------+  +------------+      |
|  +------------+  +------------+      |
|  | ><>        |  | ><>        |      |
|  | Angelfish  |  | Betta      |      |
|  | [Add]      |  | [Add]      |      |
|  +------------+  +------------+      |
+--------------------------------------+
|  Count: [=====o=====] 5              |
|                      [Cancel] [OK]   |
+======================================+
```

- **操作フロー**:
  1. カテゴリ選択（Fish / Crustacean / Other）
  2. 生き物を選択
  3. 個体数を設定
  4. OKで追加

---

### 画面 4: 装飾追加ダイアログ

- **目的**: 新しい装飾を水槽に配置

- **レイアウト**:
```
+======================================+
|  Add Decoration                   [x]|
+======================================+
|  Category: [ Plants        ▼]        |
+--------------------------------------+
|  +------------+  +------------+      |
|  | ~~~~       |  | ~~~~       |      |
|  | Seagrass   |  | Kelp       |      |
|  | [Select]   |  | [Select]   |      |
|  +------------+  +------------+      |
|  +------------+  +------------+      |
|  | ~~~~       |  | ~~~~       |      |
|  | Fern       |  | Moss Ball  |      |
|  | [Select]   |  | [Select]   |      |
|  +------------+  +------------+      |
+--------------------------------------+
|  Position: X[===] Y[===] Z[===]      |
|  Scale:    [=====o=====] 1.0         |
|                      [Cancel] [OK]   |
+======================================+
```

- **操作フロー**:
  1. カテゴリ選択（Rock / Plant / Coral / Other）
  2. 装飾を選択
  3. 配置位置・スケール設定
  4. OKで配置

---

### 画面間遷移図

```
+------------------+
|  メイン画面       |
|  (アクアリウム)   |
+--------+---------+
         |
         | [Settings]クリック
         v
+------------------+      [+ Add Creature]     +------------------+
|  設定パネル       |------------------------->|  生き物追加       |
|  (右側に表示)     |<-------------------------|  ダイアログ       |
+--------+---------+      [OK] or [Cancel]     +------------------+
         |
         | [+ Add Decoration]
         v
+------------------+
|  装飾追加         |
|  ダイアログ       |
+------------------+
```

---

**このSPEC_DETAIL.mdの承認をお願いします。承認後、SPEC_LOGIC.mdの作成に進みます。**
