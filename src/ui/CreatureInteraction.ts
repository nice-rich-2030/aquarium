import * as THREE from 'three';
import { CreatureManager, FeedingManager } from '../creatures';
import { DecorationManager } from '../decorations';
import { CreatureInstance } from '../types/creatures';
import { DecorationInstance } from '../types/decorations';

// ホバー対象の情報＋クリックで反応できる個体参照（魚 or 回遊する装飾）
interface HoverTarget {
  name: string;
  description: string;
  creature?: CreatureInstance;
  decoration?: DecorationInstance;
  reactable?: boolean; // クリック反応できるか（魚 or 亀・エイ）
}

/**
 * 生き物・装飾へのマウス操作（ホバー情報表示・クリックで反転）を担当する。
 *
 * - ホバー: レイキャストで対象を判定し、名前・説明をツールチップ表示
 * - クリック: 魚なら反転（Uターン）させる。カメラ回転のドラッグとは区別する。
 */
export class CreatureInteraction {
  private domElement: HTMLElement;
  private camera: THREE.Camera;
  private creatureManager: CreatureManager;
  private decorationManager: DecorationManager;
  private feedingManager: FeedingManager;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private tooltip: HTMLDivElement;

  // クリックとドラッグ（カメラ操作）を区別するための押下位置
  private downX = 0;
  private downY = 0;
  private moved = false;

  // ホバー判定の連続実行を避けるためのフレーム間引きフラグ
  private rafPending = false;

  constructor(
    domElement: HTMLElement,
    camera: THREE.Camera,
    creatureManager: CreatureManager,
    decorationManager: DecorationManager,
    feedingManager: FeedingManager
  ) {
    this.domElement = domElement;
    this.camera = camera;
    this.creatureManager = creatureManager;
    this.decorationManager = decorationManager;
    this.feedingManager = feedingManager;

    this.tooltip = this.createTooltip();

    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('pointerleave', this.onPointerLeave);
    this.domElement.addEventListener('dblclick', this.onDoubleClick);
  }

  /**
   * ツールチップ用のDOM要素を生成
   */
  private createTooltip(): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed',
      'pointer-events:none',
      'z-index:1000',
      'padding:8px 12px',
      'border-radius:8px',
      'background:rgba(10,20,30,0.82)',
      'color:#eaf6ff',
      'font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'box-shadow:0 4px 16px rgba(0,0,0,0.4)',
      'border:1px solid rgba(120,200,255,0.25)',
      'backdrop-filter:blur(4px)',
      'white-space:nowrap',
      'opacity:0',
      'transition:opacity 0.12s ease',
    ].join(';');
    document.body.appendChild(el);
    return el;
  }

  /**
   * マウス座標を正規化デバイス座標(NDC)に変換
   */
  private updatePointer(event: PointerEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * 現在のポインタ位置で生物・装飾を取得（なければ null）。
   *
   * 魚と装飾の両グループをまとめてレイキャストし、
   * カメラに最も近いヒットから対象を特定する。
   */
  private pickTarget(): HoverTarget | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(
      [
        ...this.creatureManager.getGroup().children,
        ...this.decorationManager.getGroup().children,
      ],
      true
    );
    for (const hit of hits) {
      const creature = this.creatureManager.findInstanceByObject(hit.object);
      if (creature) {
        const info = this.creatureManager.getDisplayInfo(creature);
        return { ...info, creature, reactable: true };
      }
      const decoration = this.decorationManager.findInstanceByObject(hit.object);
      if (decoration) {
        const info = this.decorationManager.getDisplayInfo(decoration);
        const reactable = this.decorationManager.canReact(decoration);
        return { ...info, decoration, reactable };
      }
    }
    return null;
  }

  private onPointerMove = (event: PointerEvent): void => {
    this.updatePointer(event);

    // ドラッグ判定（カメラ操作中はホバー処理を抑制）
    if (event.buttons !== 0) {
      this.moved = true;
      this.hideTooltip();
      return;
    }

    // ツールチップ位置はマウス追従
    this.tooltip.style.left = `${event.clientX + 14}px`;
    this.tooltip.style.top = `${event.clientY + 14}px`;

    // フレームに1回だけレイキャスト
    if (this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      this.updateHover();
    });
  };

  /**
   * ホバー対象を判定してツールチップを更新
   */
  private updateHover(): void {
    const target = this.pickTarget();
    if (target) {
      const desc = target.description
        ? `<div style="opacity:0.82;font-size:12px;max-width:220px;white-space:normal">${target.description}</div>`
        : '';
      this.tooltip.innerHTML =
        `<div style="font-weight:600;margin-bottom:2px">${target.name}</div>` + desc;
      this.tooltip.style.opacity = '1';
      // クリック反応できる対象（魚・亀・エイ）はポインタ、それ以外は通常カーソル
      this.domElement.style.cursor = target.reactable ? 'pointer' : '';
    } else {
      this.hideTooltip();
    }
  }

  private hideTooltip(): void {
    this.tooltip.style.opacity = '0';
    this.domElement.style.cursor = '';
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.downX = event.clientX;
    this.downY = event.clientY;
    this.moved = false;
  };

  private onPointerUp = (event: PointerEvent): void => {
    // ドラッグ（カメラ回転）なら反転させない
    const dist = Math.hypot(event.clientX - this.downX, event.clientY - this.downY);
    if (this.moved || dist > 5) return;

    this.updatePointer(event);
    const target = this.pickTarget();
    if (target?.creature) {
      this.creatureManager.triggerFlip(target.creature);
    } else if (target?.decoration && target.reactable) {
      this.decorationManager.triggerReaction(target.decoration);
    }
  };

  private onPointerLeave = (): void => {
    this.hideTooltip();
  };

  /**
   * ダブルクリックでその位置に餌を投下する。
   *
   * 2D座標から3D位置を得るため、カメラ正対・水槽中心を通る平面と
   * クリック光線の交点を投下位置とする（どのカメラ角度でも自然な奥行きになる）。
   */
  private onDoubleClick = (event: MouseEvent): void => {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const normal = this.camera.getWorldDirection(new THREE.Vector3());
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      normal,
      this.feedingManager.getCenter()
    );
    const point = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(plane, point)) {
      this.feedingManager.spawn(point);
    }
  };

  /**
   * 破棄
   */
  public dispose(): void {
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointerleave', this.onPointerLeave);
    this.domElement.removeEventListener('dblclick', this.onDoubleClick);
    this.tooltip.remove();
  }
}
