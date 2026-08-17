import { GameManager } from '../core/state';
import { sound } from '../audio/sound';

export interface ReplayViewCallbacks {
  onNewGame: () => void;
}

export class ReplayView {
  private overlay: HTMLElement | null = null;
  private gameManager: GameManager;
  private callbacks: ReplayViewCallbacks;

  constructor(gameManager: GameManager, callbacks: ReplayViewCallbacks) {
    this.gameManager = gameManager;
    this.callbacks = callbacks;
  }

  public show(): void {
    this.close();

    const state = this.gameManager.getState();
    const isWinnerSente = state.winner === 'sente';
    const isDraw = state.winner === 'draw';

    if (isWinnerSente) {
      sound.playVictory();
    } else {
      sound.playDefeat();
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal-content" style="max-width:520px; text-align:center; border:2px solid var(--accent-gold);">
        <div style="font-family:var(--font-antique); font-size:2.2rem; font-weight:900; color:${isWinnerSente ? 'var(--text-gold)' : isDraw ? '#fff' : '#ff6b6b'}; margin-bottom:8px;">
          ${isDraw ? '⚖️ 相討ち（引き分け）' : isWinnerSente ? '🏆 先手（あなた）の勝利！' : '⚔️ 後手（敵軍/AI）の勝利'}
        </div>

        <div style="font-size:1.05rem; color:var(--text-main); line-height:1.6; margin-bottom:16px;">
          ${state.winReason}
        </div>

        <div style="background:var(--bg-surface-elevated); border-radius:var(--radius-sm); padding:12px; margin-bottom:20px; font-size:0.85rem; color:var(--text-muted);">
          ✨ <b>種明かし＆感想戦モード</b> ✨<br>
          敵軍の裏向きの駒がすべて開示されました。<br>
          盤面上で敵の初期配置や進軍ルートをご確認いただけます。
        </div>

        <div style="display:flex; justify-content:center; gap:12px;">
          <button id="btn-close-and-review" class="btn" style="padding:10px 20px;">
            盤面をじっくり確認する
          </button>
          <button id="btn-restart-game" class="btn btn-primary" style="padding:10px 24px;">
            🔄 再戦する（新しい対局）
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;

    overlay.querySelector('#btn-close-and-review')?.addEventListener('click', () => {
      sound.playClick();
      this.close();
    });

    overlay.querySelector('#btn-restart-game')?.addEventListener('click', () => {
      sound.playTaiko();
      this.close();
      this.callbacks.onNewGame();
    });
  }

  public close(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
