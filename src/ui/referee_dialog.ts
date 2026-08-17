import { CombatResult } from '../core/types';
import { PIECE_DEFINITIONS } from '../core/pieces';
import { sound } from '../audio/sound';

export class RefereeDialog {
  private overlay: HTMLElement | null = null;

  public showCombat(combat: CombatResult, _isGameOver: boolean = false): Promise<void> {
    return new Promise((resolve) => {
      // 効果音の再生
      if (combat.defenderType === 'jirai' && combat.attackerType !== 'kohei' && combat.attackerType !== 'hikoki') {
        sound.playExplosion();
      } else if (combat.winner === 'draw') {
        sound.playClash();
      } else {
        sound.playClash();
      }

      this.overlay = document.createElement('div');
      this.overlay.className = 'referee-modal-overlay';

      const attackerInfo = PIECE_DEFINITIONS[combat.attackerType];
      const defenderInfo = PIECE_DEFINITIONS[combat.defenderType];

      this.overlay.innerHTML = `
        <div class="referee-card">
          <div class="referee-badge">⚖️ 審判判定</div>
          
          <div class="referee-combat-display">
            <div class="referee-piece-box">
              <span style="font-size:0.85rem; color:var(--text-muted);">攻撃側</span>
              <div style="font-size:1.3rem; font-weight:900; font-family:var(--font-antique);">
                ${attackerInfo.kanji}
              </div>
            </div>

            <div class="referee-vs-symbol">VS</div>

            <div class="referee-piece-box">
              <span style="font-size:0.85rem; color:var(--text-muted);">防衛側</span>
              <div style="font-size:1.3rem; font-weight:900; font-family:var(--font-antique);">
                ${defenderInfo.kanji}
              </div>
            </div>
          </div>

          <h2 class="referee-result-title">${combat.message}</h2>
          <p class="referee-result-reason">${combat.reason}</p>

          <button id="btn-close-referee" class="btn btn-gold" style="padding:8px 24px; font-size:1rem;">
            確認
          </button>
        </div>
      `;

      document.body.appendChild(this.overlay);

      const close = () => {
        if (this.overlay) {
          this.overlay.remove();
          this.overlay = null;
        }
        resolve();
      };

      const btn = this.overlay.querySelector('#btn-close-referee');
      btn?.addEventListener('click', close);
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) close();
      });

      // 1.8秒後に自動クローズ
      setTimeout(() => {
        if (this.overlay) {
          close();
        }
      }, 1800);
    });
  }
}
