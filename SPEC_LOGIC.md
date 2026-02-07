# デジタルアクアリウム ロジック・アルゴリズム詳細設計書 (SPEC_LOGIC.md)

本書では、システムの性能・品質を決める重要なロジックを詳細に設計する。

---

## 3.1 Boidsアルゴリズム（群泳AI）

### 背景
魚が自然な群れを形成して泳ぐ動きは、アクアリウムの美しさと没入感の核となる要素である。単純なランダム移動では機械的に見えてしまうため、Craig Reynoldsが1986年に発表したBoidsアルゴリズムを採用し、各個体が3つのルールに従うことで創発的に群れを形成する。

### 提案するアルゴリズム

#### 基本3ルール

```
+-------------------+     +-------------------+     +-------------------+
|    Separation     |     |    Alignment      |     |    Cohesion       |
|    （分離）        |     |    （整列）        |     |    （結合）        |
|                   |     |                   |     |                   |
|   ><>  →          |     |   ><> → → →      |     |       ●           |
|  ↙   ↗            |     |   ><> → → →      |     |     ↗   ↘         |
| ><>  ><>          |     |   ><> → → →      |     |   ><>   ><>       |
|                   |     |                   |     |                   |
| 近すぎる仲間から   |     | 仲間と同じ方向に   |     | 群れの中心に       |
| 離れる            |     | 向きを合わせる     |     | 向かう            |
+-------------------+     +-------------------+     +-------------------+
```

#### 拡張ルール

```
+-------------------+     +-------------------+
|  Boundary Avoid   |     |   Wander          |
|  （境界回避）      |     |  （ランダム探索）   |
|                   |     |                   |
|  |←  ><>          |     |   ><>  ?          |
|  |                |     |      ↗ → ↘        |
|  |WALL            |     |                   |
|                   |     |                   |
| 壁に近づいたら     |     | 微小なランダム成分  |
| 中心に戻る        |     | で動きに変化       |
+-------------------+     +-------------------+
```

#### 疑似コード

```
FUNCTION updateBoid(boid, allBoids, tankBounds, delta):
    // 視野範囲内の仲間を取得
    neighbors = getNeighborsInRadius(boid, allBoids, PERCEPTION_RADIUS)

    // 3つの基本力を計算
    separationForce = ZERO_VECTOR
    alignmentForce = ZERO_VECTOR
    cohesionForce = ZERO_VECTOR

    IF neighbors.length > 0:
        // 分離: 近い仲間から離れる方向
        FOR each neighbor in neighbors:
            distance = boid.position - neighbor.position
            IF distance.length < SEPARATION_RADIUS:
                separationForce += normalize(distance) / distance.length

        // 整列: 仲間の平均速度方向
        averageVelocity = average(neighbors.map(n => n.velocity))
        alignmentForce = averageVelocity - boid.velocity

        // 結合: 仲間の中心に向かう方向
        centerOfMass = average(neighbors.map(n => n.position))
        cohesionForce = centerOfMass - boid.position

    // 境界回避: 壁に近いほど強い反発力
    boundaryForce = calculateBoundaryAvoidance(boid.position, tankBounds)

    // ランダム探索: 微小なノイズ
    wanderForce = randomInsideUnitSphere() * WANDER_STRENGTH

    // 重み付け合成
    acceleration =
        separationForce * SEPARATION_WEIGHT +
        alignmentForce  * ALIGNMENT_WEIGHT +
        cohesionForce   * COHESION_WEIGHT +
        boundaryForce   * BOUNDARY_WEIGHT +
        wanderForce

    // 速度更新（最大速度制限）
    boid.velocity += acceleration * delta
    boid.velocity = clampMagnitude(boid.velocity, MAX_SPEED)

    // 位置更新
    boid.position += boid.velocity * delta

    // 向きを速度方向にスムーズに補間
    boid.rotation = lerpQuaternion(boid.rotation, lookAt(boid.velocity), TURN_SPEED * delta)
```

#### パラメータ設定（種類別）

| パラメータ | ネオンテトラ | カクレクマノミ | エンゼルフィッシュ |
|-----------|------------|--------------|------------------|
| PERCEPTION_RADIUS | 15 | 20 | 25 |
| SEPARATION_RADIUS | 3 | 5 | 8 |
| SEPARATION_WEIGHT | 1.5 | 1.2 | 1.0 |
| ALIGNMENT_WEIGHT | 1.0 | 0.8 | 0.5 |
| COHESION_WEIGHT | 1.0 | 0.6 | 0.3 |
| MAX_SPEED | 8 | 5 | 3 |
| TURN_SPEED | 5 | 3 | 2 |

### 特徴（洗練されたポイント）

1. **種類別パラメータ**: 群泳魚（ネオンテトラ）は群れ力が強く、単独魚（エンゼル）は弱い
2. **ソフト境界**: 壁に衝突ではなく、滑らかに方向転換
3. **視野角考慮**: 真後ろの仲間は無視（オプション）
4. **速度依存ターン**: 高速時は旋回半径が大きくなる

### パフォーマンス目標

| 項目 | 目標値 |
|------|--------|
| 処理対象個体数 | 100体でも60fps維持 |
| 近傍検索時間 | O(n) → O(1)に最適化（空間分割使用時） |
| メモリ使用量 | 1体あたり約200bytes |

---

## 3.2 空間分割による近傍検索最適化

### 背景
Boidsアルゴリズムでは各個体が周囲の仲間を検索する必要があり、素朴な実装では O(n²) の計算量となる。100体の魚がいると10,000回の距離計算が毎フレーム発生し、パフォーマンスが低下する。これを空間分割（Spatial Partitioning）で O(n) に削減する。

### 提案するアルゴリズム

#### 3Dグリッド分割

```
水槽を3Dグリッドに分割（セルサイズ = PERCEPTION_RADIUS）

+-------+-------+-------+-------+
|       |       |  ><>  |       |
|  ><>  |       |   ><> |       |
+-------+-------+-------+-------+
|       |  ><>  | [検索] |  ><>  |
|       |   ><> |   ><>  |       |
+-------+-------+-------+-------+
|  ><>  |       |  ><>  |       |
|       |       |       |       |
+-------+-------+-------+-------+

[検索]セルの魚は、自セル + 隣接26セルのみ検索すればよい
```

#### 疑似コード

```
CLASS SpatialGrid:
    cells: Map<string, Boid[]>  // "x,y,z" → 魚のリスト
    cellSize: number = PERCEPTION_RADIUS

    FUNCTION clear():
        cells.clear()

    FUNCTION insert(boid):
        key = getCellKey(boid.position)
        IF NOT cells.has(key):
            cells.set(key, [])
        cells.get(key).push(boid)

    FUNCTION getCellKey(position):
        x = floor(position.x / cellSize)
        y = floor(position.y / cellSize)
        z = floor(position.z / cellSize)
        RETURN `${x},${y},${z}`

    FUNCTION getNeighbors(boid, radius):
        neighbors = []
        centerCell = getCellCoords(boid.position)

        // 自セル + 隣接26セル（3x3x3）を検索
        FOR dx = -1 TO 1:
            FOR dy = -1 TO 1:
                FOR dz = -1 TO 1:
                    key = `${centerCell.x + dx},${centerCell.y + dy},${centerCell.z + dz}`
                    IF cells.has(key):
                        FOR each candidate in cells.get(key):
                            IF candidate != boid:
                                distance = length(candidate.position - boid.position)
                                IF distance < radius:
                                    neighbors.push(candidate)

        RETURN neighbors

// 毎フレームの更新フロー
FUNCTION updateAllBoids(allBoids):
    grid = new SpatialGrid()

    // フェーズ1: 全個体をグリッドに登録
    FOR each boid in allBoids:
        grid.insert(boid)

    // フェーズ2: 各個体を更新（高速な近傍検索）
    FOR each boid in allBoids:
        neighbors = grid.getNeighbors(boid, PERCEPTION_RADIUS)
        updateBoid(boid, neighbors)
```

### 特徴（洗練されたポイント）

1. **動的セルサイズ**: 視野範囲に合わせてセルサイズを自動調整
2. **ハッシュマップ使用**: 疎な分布でもメモリ効率が良い
3. **毎フレーム再構築**: 移動する対象に最適（静的オブジェクトには別手法）

### パフォーマンス目標

| 項目 | 素朴な実装 | 空間分割後 |
|------|-----------|-----------|
| 50体 | 2,500比較/frame | 約250比較/frame |
| 100体 | 10,000比較/frame | 約500比較/frame |
| 200体 | 40,000比較/frame | 約1,000比較/frame |

---

## 3.3 魚のプロシージャルメッシュ生成

### 背景
10種類の魚を外部モデルなしで表現するため、パラメトリックにメッシュを生成する。体の形状、ヒレの形、色パターンをパラメータで制御し、同じアルゴリズムから多様な魚を生成する。

### 提案するアルゴリズム

#### 体の形状生成

```
断面を楕円として、長軸方向に積み重ねて変形

     頭部         中央         尾部
      ◯           ◯           ◯
     /  \        /    \       /  \
    |    |      |      |     |    |
     \  /        \    /       \  /
      ◯           ◯           ◯

    ↓ パラメータ適用 ↓

     ◯◯            ◯◯◯◯            ◯
    ◯    ◯        ◯        ◯       ◯ ◯
    ◯    ◯        ◯        ◯      ◯   ◯
     ◯◯            ◯◯◯◯          ◯◯◯
```

#### 疑似コード

```
FUNCTION generateFishBody(params):
    segments = 20  // 長軸方向の分割数
    radialSegments = 12  // 円周方向の分割数

    vertices = []

    FOR i = 0 TO segments:
        t = i / segments  // 0.0 (頭) → 1.0 (尾)

        // 長軸方向の位置
        x = lerp(-params.length/2, params.length/2, t)

        // 断面の幅と高さ（ベジェ曲線で補間）
        width = evaluateBezier(params.widthCurve, t)
        height = evaluateBezier(params.heightCurve, t)

        // 円周方向に頂点生成
        FOR j = 0 TO radialSegments:
            angle = j / radialSegments * 2 * PI

            // 楕円断面
            y = sin(angle) * height
            z = cos(angle) * width

            vertices.push(new Vector3(x, y, z))

    // 頂点をつないで面を生成
    faces = generateQuadFaces(vertices, segments, radialSegments)

    RETURN new BufferGeometry(vertices, faces)

// 断面サイズを制御するベジェ曲線の例
widthCurve = {
    金魚: [0.3, 1.0, 1.0, 0.1],      // 丸い体
    ネオンテトラ: [0.2, 0.6, 0.5, 0.1], // 細長い
    エンゼル: [0.1, 0.3, 0.3, 0.05]    // 薄く平たい
}
```

#### ヒレの生成

```
FUNCTION generateFins(bodyMesh, params):
    fins = new Group()

    // 背ビレ
    IF params.dorsalFin:
        dorsalShape = generateFinShape(params.dorsalFin)
        dorsal = new Mesh(dorsalShape, finMaterial)
        dorsal.position.set(params.dorsalFin.x, bodyHeight, 0)
        dorsal.rotation.z = params.dorsalFin.angle
        fins.add(dorsal)

    // 尾ビレ（重要: 魚の種類を決定づける）
    tailShape = generateTailShape(params.tailFin)
    tail = new Mesh(tailShape, finMaterial)
    tail.position.set(bodyLength/2, 0, 0)
    fins.add(tail)

    // 胸ビレ（左右対称）
    FOR side in [-1, 1]:
        pectoralShape = generateFinShape(params.pectoralFin)
        pectoral = new Mesh(pectoralShape, finMaterial)
        pectoral.position.set(params.pectoralFin.x, 0, side * bodyWidth)
        pectoral.rotation.x = side * params.pectoralFin.angle
        fins.add(pectoral)

    RETURN fins

// ヒレ形状のパラメータ例
tailFin = {
    グッピー: { type: "fan", size: 1.5, segments: 8 },  // 扇形
    ベタ: { type: "flowing", size: 2.0, segments: 12 },  // ひらひら
    金魚: { type: "double", size: 1.2, segments: 6 }     // 二股
}
```

#### 色・模様の適用

```
FUNCTION applyFishColors(geometry, colorParams):
    colors = []
    positions = geometry.attributes.position.array

    FOR i = 0 TO positions.length / 3:
        x = positions[i * 3]
        y = positions[i * 3 + 1]
        z = positions[i * 3 + 2]

        // 長軸方向の位置で色をブレンド
        t = (x + length/2) / length

        // 模様タイプに応じた色計算
        SWITCH colorParams.pattern:
            CASE "gradient":
                color = lerpColor(colorParams.headColor, colorParams.tailColor, t)

            CASE "stripe":
                stripeIndex = floor(t * colorParams.stripeCount)
                color = stripeIndex % 2 == 0 ? colorParams.color1 : colorParams.color2

            CASE "spot":
                // Perlinノイズでスポット模様
                noise = perlin3D(x * 0.5, y * 0.5, z * 0.5)
                color = noise > 0.3 ? colorParams.spotColor : colorParams.baseColor

        colors.push(color.r, color.g, color.b)

    geometry.setAttribute('color', new BufferAttribute(colors, 3))
```

### 特徴（洗練されたポイント）

1. **ベジェ曲線制御**: 滑らかで自然な体のライン
2. **頂点カラー**: テクスチャ不要で軽量
3. **パラメータ化**: JSONで新種を簡単に定義
4. **LOD対応可能**: 距離に応じて頂点数を削減

### パフォーマンス目標

| 項目 | 目標値 |
|------|--------|
| 1体の生成時間 | < 10ms |
| 1体のポリゴン数 | 200-500 |
| メモリ使用量 | 1体あたり約50KB |

---

## 3.4 水草の揺れシェーダー

### 背景
静止した水草は不自然に見えるため、水流に揺れる動きを表現する。CPU側でボーン更新するとコストが高いため、頂点シェーダーで直接変形し、GPUの並列処理能力を活かす。

### 提案するアルゴリズム

#### 揺れの物理モデル

```
水草は根元が固定され、上に行くほど揺れる

   ~~~~>  ←水流
     ↗
    /   ← 上部: 大きく揺れる
   |
   |    ← 中部: 中程度
   |
   X    ← 根元: 固定

揺れ量 = sin(時間 + 位相) * 高さ比率^2
```

#### 頂点シェーダー（疑似GLSL）

```glsl
// uniforms
uniform float uTime;           // 経過時間
uniform float uWindStrength;   // 風（水流）の強さ
uniform vec2 uWindDirection;   // 風の方向
uniform float uFrequency;      // 揺れの周波数

// attributes
attribute float aHeightRatio;  // 0.0（根元）〜 1.0（先端）
attribute float aPhaseOffset;  // 個体ごとの位相ずれ

void main() {
    vec3 pos = position;

    // 高さに応じた揺れ係数（二乗で自然なカーブ）
    float swayFactor = aHeightRatio * aHeightRatio;

    // 複数の周波数を合成（自然な動きに）
    float wave1 = sin(uTime * uFrequency + aPhaseOffset) * 0.7;
    float wave2 = sin(uTime * uFrequency * 0.5 + aPhaseOffset * 1.3) * 0.3;
    float wave = wave1 + wave2;

    // 揺れを適用
    float swayAmount = wave * swayFactor * uWindStrength;
    pos.x += uWindDirection.x * swayAmount;
    pos.z += uWindDirection.y * swayAmount;

    // 根元に引っ張られる効果（長さ保存の近似）
    pos.y -= abs(swayAmount) * 0.1;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

#### aHeightRatioの設定

```
FUNCTION prepareSeaweedForShader(geometry):
    positions = geometry.attributes.position.array
    heightRatios = []
    phaseOffsets = []

    // 全頂点のY座標から最小・最大を取得
    minY = Infinity, maxY = -Infinity
    FOR i = 0 TO positions.length / 3:
        y = positions[i * 3 + 1]
        minY = min(minY, y)
        maxY = max(maxY, y)

    // 各頂点の高さ比率を計算
    FOR i = 0 TO positions.length / 3:
        y = positions[i * 3 + 1]
        heightRatio = (y - minY) / (maxY - minY)
        heightRatios.push(heightRatio)

        // 位相オフセット（X,Z座標からランダム的に）
        x = positions[i * 3]
        z = positions[i * 3 + 2]
        phaseOffsets.push((x * 0.1 + z * 0.1) % (2 * PI))

    geometry.setAttribute('aHeightRatio', new BufferAttribute(heightRatios, 1))
    geometry.setAttribute('aPhaseOffset', new BufferAttribute(phaseOffsets, 1))
```

### 特徴（洗練されたポイント）

1. **GPU処理**: 数百本の水草でもCPU負荷ゼロ
2. **複数周波数合成**: 単純なsin波より自然
3. **位相オフセット**: 同期せずにバラバラに揺れる
4. **長さ保存近似**: 伸び縮みしない自然な動き

### パフォーマンス目標

| 項目 | 目標値 |
|------|--------|
| 水草100本時のFPS影響 | < 1fps低下 |
| シェーダーコンパイル時間 | < 50ms |

---

## 3.5 コースティクス（水中の光の模様）

### 背景
水面の波による光の屈折で、底面や壁に揺らめく光の網目模様（コースティクス）が生じる。これはアクアリウムの没入感を大きく高める重要なエフェクトである。リアルタイムレイトレーシングはコストが高いため、テクスチャアニメーションで近似する。

### 提案するアルゴリズム

#### 方式: テクスチャ投影

```
         ☀️ 太陽光
          |
    ~~~~~~|~~~~~~  水面
          |
      [Projector]
        / | \
       /  |  \
      /   |   \
     ◇    ◇    ◇  コースティクステクスチャ
    _____________  底面
```

#### コースティクステクスチャ生成（プリベイク）

```
// 256x256のコースティクステクスチャを複数枚用意
// または、シェーダーで動的生成

FUNCTION generateCausticsTexture(frame):
    FOR x = 0 TO 256:
        FOR y = 0 TO 256:
            // Voronoiノイズでセル模様を生成
            value = voronoiNoise(x * 0.02, y * 0.02, frame * 0.01)

            // 境界部分を明るく（光の集中）
            brightness = pow(value, 3.0) * 2.0

            pixels[x][y] = clamp(brightness, 0.0, 1.0)

    RETURN new Texture(pixels)
```

#### フラグメントシェーダー（投影）

```glsl
uniform sampler2D uCausticsTexture;
uniform float uTime;
uniform float uIntensity;
uniform mat4 uProjectorMatrix;

varying vec3 vWorldPosition;

void main() {
    // ワールド座標をプロジェクター座標系に変換
    vec4 projCoord = uProjectorMatrix * vec4(vWorldPosition, 1.0);
    vec2 uv = projCoord.xy / projCoord.w * 0.5 + 0.5;

    // UVをスクロールさせてアニメーション
    vec2 animatedUV1 = uv + vec2(uTime * 0.02, uTime * 0.01);
    vec2 animatedUV2 = uv * 1.3 + vec2(-uTime * 0.015, uTime * 0.02);

    // 2層のコースティクスを合成
    float caustics1 = texture2D(uCausticsTexture, animatedUV1).r;
    float caustics2 = texture2D(uCausticsTexture, animatedUV2).r;
    float caustics = (caustics1 + caustics2) * 0.5;

    // 深さに応じて減衰（深いほど暗い）
    float depth = 1.0 - (vWorldPosition.y + tankHeight) / tankHeight;
    float attenuation = exp(-depth * 2.0);

    // 最終的な明るさ
    float finalCaustics = caustics * uIntensity * attenuation;

    // 基本色にコースティクスを加算
    vec3 finalColor = baseColor + vec3(finalCaustics);

    gl_FragColor = vec4(finalColor, 1.0);
}
```

### 特徴（洗練されたポイント）

1. **2層合成**: 単一テクスチャより複雑な模様
2. **深度減衰**: 深いほどコースティクスが弱まる自然な表現
3. **プロジェクター行列**: 底面だけでなく壁面にも投影可能
4. **低コスト**: テクスチャサンプリング2回のみ

### パフォーマンス目標

| 項目 | 目標値 |
|------|--------|
| テクスチャサイズ | 256x256（十分なクオリティ） |
| シェーダー負荷 | < 0.5ms/frame |

---

## 3.6 泳ぎアニメーション（頂点変形）

### 背景
魚が泳ぐ際の体のうねりを表現するため、スケルタルアニメーション（ボーン）ではなく頂点シェーダーで直接変形する。これによりスキニング計算のCPU負荷を削減し、多数の魚を描画可能にする。

### 提案するアルゴリズム

#### 体のうねり

```
静止時:    ><==========>
泳ぎ時:    ><====~~~===>  (sin波で変形)

変形量は尾に近いほど大きい
```

#### 頂点シェーダー

```glsl
uniform float uTime;
uniform float uSwimSpeed;      // 泳ぎ速度（0.0 = 静止, 1.0 = 最速）
uniform float uSwimFrequency;  // 周波数
uniform float uSwimAmplitude;  // 振幅

attribute float aTailRatio;    // 0.0（頭）〜 1.0（尾）

void main() {
    vec3 pos = position;

    // 尾に近いほど揺れが大きい（二乗カーブ）
    float waveFactor = aTailRatio * aTailRatio;

    // 横方向のうねり
    float wave = sin(uTime * uSwimFrequency + aTailRatio * 3.0) * uSwimAmplitude;
    pos.z += wave * waveFactor * uSwimSpeed;

    // 微小な上下動
    float verticalWave = sin(uTime * uSwimFrequency * 0.5) * uSwimAmplitude * 0.3;
    pos.y += verticalWave * waveFactor * uSwimSpeed;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

#### パラメータ設定例

| 魚種 | frequency | amplitude | 備考 |
|------|-----------|-----------|------|
| ネオンテトラ | 10.0 | 0.15 | 素早い動き |
| カクレクマノミ | 8.0 | 0.2 | 活発な動き |
| エンゼル | 3.0 | 0.1 | ゆったり優雅 |
| ベタ | 2.5 | 0.25 | ひらひらと |
| クラゲ | 1.5 | 0.4 | ふわふわ |

### 特徴（洗練されたポイント）

1. **速度連動**: 静止時は微動、移動時は大きく波打つ
2. **種類別調整**: 魚の性質に合わせたパラメータ
3. **GPU完結**: 100体でも1回のドローコール（インスタンシング）

### パフォーマンス目標

| 項目 | 目標値 |
|------|--------|
| 100体描画時のFPS | 60fps維持 |
| ドローコール数 | 種類数（10種なら10回） |

---

## 洗練度チェックリスト

- [x] **Boidsアルゴリズム**: 5つのルール（分離・整列・結合・境界・探索）で自然な群れ
- [x] **空間分割**: O(n²)→O(n)で100体でも高速
- [x] **プロシージャル魚生成**: ベジェ曲線と頂点カラーで多様な魚
- [x] **水草シェーダー**: GPUで揺れを処理、CPU負荷ゼロ
- [x] **コースティクス**: 2層テクスチャ合成で美しい光模様
- [x] **泳ぎアニメーション**: 頂点シェーダーで体のうねり

### 追加チェック項目

- [x] 例外処理: 設定JSONの不正値はデフォルト値で代替
- [x] パフォーマンス目標: 各アルゴリズムに明記
- [x] スケーラビリティ: 空間分割により個体数増加に対応
- [ ] ログ設計: 開発時のみconsole.logでトレース（本番は無効）

---

**このSPEC_LOGIC.mdの承認をお願いします。承認後、SPEC_VALIDATION.mdの作成（整合性確認）に進みます。**
