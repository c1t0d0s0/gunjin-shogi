import { GameManager } from '../core/state';
import { sound } from '../audio/sound';

export interface HistoryPanelCallbacks {
  onResign?: () => void;
  onOpenRules?: () => void;
  onOpenSettings?: () => void;
}

export class HistoryPanel {
  private container: HTMLElement;
  private gameManager: GameManager;
  private callbacks: HistoryPanelCallbacks;

  constructor(
    container: HTMLElement,
    gameManager: GameManager,
    callbacks: HistoryPanelCallbacks = {}
  ) {
    this.container = container;
    this.gameManager = gameManager;
    this.callbacks = callbacks;
  }

  public render(): void {
    const state = this.gameManager.getState();
    const senteAlive = state.pieces.filter((p) => p.owner === 'sente' && p.isAlive).length;
    const goteAlive = state.pieces.filter((p) => p.owner === 'gote' && p.isAlive).length;

    const isSenteTurn = state.turn === 'sente';

    this.container.innerHTML = `
      <div class="side-panel">
        <h3 class="panel-title">
          <span>戦況・棋譜記録</span>
          <span style="font-size:0.8rem; color:var(--text-muted);">${state.currentMoveNumber - 1}手経過</span>
        </h3>

        ${
          state.phase === 'playing'
            ? `
          <div class="turn-banner ${isSenteTurn ? '' : 'gote-turn'}">
            <div>
              <span style="font-size:0.75rem; color:var(--text-muted);">手番</span>
              <div class="turn-player-name" style="color:${isSenteTurn ? 'var(--text-sente)' : 'var(--text-gote)'}">
                ${isSenteTurn ? '▲ 先手（あなた）' : '▽ 後手（敵軍/AI）'}
              </div>
            </div>
            <div class="turn-number">第${state.currentMoveNumber}手</div>
          </div>
        `
            : ''
        }

        <div style="display:flex; justify-content:space-around; background:var(--bg-surface-elevated); padding:8px; border-radius:var(--radius-sm);">
          <div style="text-align:center;">
            <div style="font-size:0.75rem; color:var(--text-sente);">先手 残存</div>
            <div style="font-size:1.2rem; font-weight:900; font-family:var(--font-antique);">${senteAlive} / 23</div>
          </div>
          <div style="width:1px; background:rgba(255,255,255,0.1);"></div>
          <div style="text-align:center;">
            <div style="font-size:0.75rem; color:var(--text-gote);">後手 残存</div>
            <div style="font-size:1.2rem; font-weight:900; font-family:var(--font-antique);">${goteAlive} / 23</div>
          </div>
        </div>

        <div style="font-size:0.85rem; font-weight:700; color:var(--text-gold); margin-top:4px;">着手履歴:</div>
        <div class="history-list">
          ${
            state.moveHistory.length === 0
              ? '<div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:12px;">対局開始待ち</div>'
              : state.moveHistory
                  .slice()
                  .reverse()
                  .map((m) => {
                    const isSente = m.player === 'sente';
                    const symbol = isSente ? '▲' : '▽';
                    const posStr = `(${m.from.row},${m.from.col}) → (${m.to.row},${m.to.col})`;

                    let combatHtml = '';
                    if (m.combat) {
                      combatHtml = `<div class="history-item-combat">⚔️ ${m.combat.message} (${m.combat.reason})</div>`;
                    }
                    if (m.isHQOccupied) {
                      combatHtml += `<div style="color:#ffd700; font-weight:900;">👑 総司令部制圧！</div>`;
                    }

                    return `
                      <div class="history-item ${isSente ? 'sente-move' : 'gote-move'}">
                        <div class="history-item-header">
                          <span>${symbol} 第${m.moveNumber}手: ${isSente ? '先手' : '後手'}</span>
                          <span style="color:var(--text-muted); font-size:0.75rem;">${posStr}</span>
                        </div>
                        ${combatHtml}
                      </div>
                    `;
                  })
                  .join('')
          }
        </div>

        ${
          state.phase === 'playing'
            ? `
          <div style="display:flex; gap:6px; margin-top:auto;">
            <button id="btn-resign" class="btn" style="font-size:0.8rem; color:#ff6b6b; border-color:rgba(255,107,107,0.3);">
              投了
            </button>
            <button id="btn-open-rules" class="btn" style="font-size:0.8rem; flex:1;">
              📖 勝敗表・役職
            </button>
          </div>
        `
            : ''
        }
      </div>
    `;

    this.container.querySelector('#btn-resign')?.addEventListener('click', () => {
      if (confirm('本当に投了しますか？')) {
        sound.playDefeat();
        this.gameManager.resign('sente');
        if (this.callbacks.onResign) this.callbacks.onResign();
      }
    });

    this.container.querySelector('#btn-open-rules')?.addEventListener('click', () => {
      sound.playClick();
      if (this.callbacks.onOpenRules) this.callbacks.onOpenRules();
    });
  }
}
