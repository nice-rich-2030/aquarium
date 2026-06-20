import * as THREE from 'three';
import { CreatureModelParams, DEFAULT_TURTLE_PARAMS } from '../types/decorations';

/**
 * ヒトデのプロシージャルジェネレーター
 *
 * 中央のドーム＋放射状の5本腕（先端をやや下げて砂に沿わせる）。
 * flatShading で素朴な質感に。色は params.color で指定。
 */
export class StarfishGenerator {
  public static generate(params: Partial<CreatureModelParams> = {}): THREE.Group {
    const { size, color } = { ...DEFAULT_TURTLE_PARAMS, color: '#e8643c', ...params };
    const s = size;
    const group = new THREE.Group();
    group.name = 'starfish';

    const mat = new THREE.MeshStandardMaterial({
      color, roughness: 0.85, metalness: 0.0, flatShading: true, envMapIntensity: 0.4,
    });

    // 中央のドーム
    const domeGeo = new THREE.SphereGeometry(0.8 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    domeGeo.scale(1, 0.6, 1);
    const dome = new THREE.Mesh(domeGeo, mat);
    dome.position.y = 0.05 * s;
    dome.castShadow = true;
    dome.receiveShadow = true;
    group.add(dome);

    // 5本の腕（先端は尖らせず丸みを残す）
    const arms = 5;
    const tipR = 0.16 * s; // 腕先の半径（球キャップと一致させる）
    const flat = (g: THREE.BufferGeometry) => g.scale(1, 0.42, 0.9); // 平たくする
    for (let i = 0; i < arms; i++) {
      const pivot = new THREE.Group();
      pivot.rotation.y = (i / arms) * Math.PI * 2;
      pivot.rotation.z = -0.12; // 先端をやや下げる

      // 先細りシリンダー（先端を太めに残してとんがりを抑える）
      const armGeo = new THREE.CylinderGeometry(tipR, 0.44 * s, 2.4 * s, 10);
      armGeo.rotateZ(-Math.PI / 2);     // 先端(+y→+x)を外向きに
      armGeo.translate(1.2 * s, 0, 0);  // 根元を中心へ
      flat(armGeo);
      const arm = new THREE.Mesh(armGeo, mat);
      arm.position.y = 0.18 * s;
      arm.castShadow = true;
      arm.receiveShadow = true;
      pivot.add(arm);

      // 丸い腕先（球キャップ）
      const tipGeo = new THREE.SphereGeometry(tipR, 10, 8);
      tipGeo.translate(2.4 * s, 0, 0);
      flat(tipGeo);
      const tip = new THREE.Mesh(tipGeo, mat);
      tip.position.y = 0.18 * s;
      tip.castShadow = true;
      pivot.add(tip);

      group.add(pivot);
    }

    return group;
  }
}
