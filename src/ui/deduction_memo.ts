import { DeductionTracker } from '../core/ai/deduction';
import { PIECE_DEFINITIONS } from '../core/pieces';
import { Piece, PieceType } from '../core/types';
import { sound } from '../audio/sound';

export interface DeductionMemoCallbacks {
  onSetMark: (pieceId: string, type?: PieceType) => void;
}

export class DeductionMemo {
  private activePopover: HTMLElement | null = null;
  private tracker: DeductionTracker;
  private callbacks: DeductionMemoCallbacks;

  constructor(tracker: DeductionTracker, callbacks: DeductionMemoCallbacks) {
    this.tracker = tracker;
    this.callbacks = callbacks;
  }

  public open(piece: Piece, x: number, y: number, currentMark?: PieceType): void {
    this.close();

    const candidates = this.tracker.getCandidateTypesForPiece(piece.id);
    const popover = document.createElement('div');
    popover.className = 'deduction-popover';

    // 画面外はみ出し防止
    const posX = Math.min(x, window.innerWidth - 280);
    const posY = Math.min(y, window.innerHeight - 340);
    popover.style.left = `${Math.max(10, posX)}px`;
    popover.style.top = `${Math.max(10, posY)}px`;

    const majorTypes: PieceType[] = [
      'taisho', 'chujo', 'shojo', 'hikoki',
      'tank', 'kohei', 'spy', 'jirai',
      'taisa', 'chusa', 'shosa', 'gunki',
      'tai_i', 'chu_i', 'sho_i', 'kihei',
    ];

    popover.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:6px;">
        <span style="font-size:0.85rem; font-weight:700; color:var(--text-gold);">敵駒 推理メモ</span>
        <button id="btn-close-memo" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1rem;">×</button>
      </div>

      <div style="margin-top:8px; font-size:0.75rem; color:var(--text-muted);">
        推定候補 (${candidates.length}種): <br>
        <span style="color:var(--text-main); font-weight:700;">
          ${candidates.map((c) => PIECE_DEFINITIONS[c].shortName).join('・')}
        </span>
      </div>

      <div class="deduction-grid">
        ${majorTypes.map(
          (t) => `
          <button class="deduction-btn ${currentMark === t ? 'active' : ''}" data-type="${t}">
            ${PIECE_DEFINITIONS[t].shortName}
          </button>
        `
        ).join('')}
      </div>

      <div style="margin-top:8px; display:flex; justify-content:space-between;">
        <button id="btn-clear-mark" class="btn" style="font-size:0.75rem; padding:4px 8px;">クリア</button>
      </div>
    `;

    document.body.appendChild(popover);
    this.activePopover = popover;

    // タイプ選択
    popover.querySelectorAll('.deduction-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const type = target.dataset.type as PieceType;
        sound.playClick();
        this.callbacks.onSetMark(piece.id, type);
        this.close();
      });
    });

    popover.querySelector('#btn-clear-mark')?.addEventListener('click', () => {
      sound.playClick();
      this.callbacks.onSetMark(piece.id, undefined);
      this.close();
    });

    popover.querySelector('#btn-close-memo')?.addEventListener('click', () => {
      this.close();
    });

    // 外部クリックでクローズ
    setTimeout(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (this.activePopover && !this.activePopover.contains(e.target as Node)) {
          this.close();
          document.removeEventListener('click', handleOutsideClick);
        }
      };
      document.addEventListener('click', handleOutsideClick);
    }, 10);
  }

  public close(): void {
    if (this.activePopover) {
      this.activePopover.remove();
      this.activePopover = null;
    }
  }
}
