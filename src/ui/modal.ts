import { PIECE_DEFINITIONS } from '../core/pieces';
import { GameManager } from '../core/state';
import { PieceType } from '../core/types';
import { resolveBaseCombat } from '../core/combat';
import { sound } from '../audio/sound';

const COMBAT_TYPES: PieceType[] = [
  'taisho', 'chujo', 'shojo', 'taisa', 'chusa', 'shosa',
  'tai_i', 'chu_i', 'sho_i', 'hikoki', 'tank', 'kihei',
  'kohei', 'spy', 'jirai',
];

export class ModalManager {
  private activeModal: HTMLElement | null = null;
  private gameManager: GameManager;
  private selectedInspectType: PieceType = 'taisho';

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  public openRules(initialTab: 'matrix' | 'overview' = 'matrix'): void {
    this.close();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    modal.innerHTML = `
      <div class="modal-content rules-modal">
        <div class="modal-header">
          <h2 class="modal-title">📖 23枚型 軍人将棋 公式ルール・勝敗表</h2>
          <button id="btn-close-modal" class="btn btn-icon">✕</button>
        </div>

        <div class="rules-tab-bar">
          <button class="rules-tab-btn ${initialTab === 'matrix' ? 'active' : ''}" data-tab="matrix">
            📊 勝敗判定マトリクス表（相性早見）
          </button>
          <button class="rules-tab-btn ${initialTab === 'overview' ? 'active' : ''}" data-tab="overview">
            📜 基本ルール・特殊能力解説
          </button>
        </div>

        <div id="tab-content-matrix" style="display: ${initialTab === 'matrix' ? 'block' : 'none'};">
          <!-- 1-Click Interactive Inspector -->
          <div style="margin-bottom:12px;">
            <div style="font-size:0.85rem; font-weight:700; color:var(--text-gold); margin-bottom:6px;">
              🔍 駒をクリックして勝敗相性を確認:
            </div>
            <div class="piece-inspect-grid">
              ${COMBAT_TYPES.map(
                (t) => `
                <button class="piece-inspect-chip ${t === this.selectedInspectType ? 'active' : ''}" data-inspect-type="${t}">
                  ${PIECE_DEFINITIONS[t].name}
                </button>
              `
              ).join('')}
            </div>
            <div id="inspect-card-container"></div>
          </div>

          <!-- Full Matrix Table -->
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:16px; margin-bottom:6px;">
            <span style="font-size:0.85rem; font-weight:700; color:var(--text-gold);">
              ⚔️ 全駒 勝敗判定マトリクス表（横スクロール可）
            </span>
            <span style="font-size:0.75rem; color:var(--text-muted);">
              凡例: <span style="color:#4cd964; font-weight:bold;">○ 勝ち</span> ／ <span style="color:#ff4d4d; font-weight:bold;">× 負け</span> ／ <span style="color:#ffd700; font-weight:bold;">＝ 相打ち</span>
            </span>
          </div>

          <div class="combat-matrix-wrapper">
            <table class="combat-matrix-table">
              <thead>
                <tr>
                  <th style="min-width:70px;">攻撃＼防御</th>
                  ${COMBAT_TYPES.map((t) => `<th title="${PIECE_DEFINITIONS[t].name}">${PIECE_DEFINITIONS[t].shortName}</th>`).join('')}
                  <th style="background:#252532; color:#4cd964;">勝</th>
                  <th style="background:#252532; color:#ffd700;">分</th>
                  <th style="background:#252532; color:#ff4d4d;">負</th>
                </tr>
              </thead>
              <tbody>
                ${COMBAT_TYPES.map((atk) => {
                  let winCount = 0;
                  let drawCount = 0;
                  let loseCount = 0;

                  const cells = COMBAT_TYPES.map((def) => {
                    const res = resolveBaseCombat(atk, def);
                    let symbol = '×';
                    let cellClass = 'cell-lose';

                    if (res.winner === 'attacker') {
                      symbol = '○';
                      cellClass = 'cell-win';
                      winCount++;
                    } else if (res.winner === 'draw') {
                      symbol = '＝';
                      cellClass = 'cell-draw';
                      drawCount++;
                    } else {
                      loseCount++;
                    }

                    return `<td class="matrix-cell ${cellClass}" title="【攻撃】${PIECE_DEFINITIONS[atk].name} vs 【防御】${PIECE_DEFINITIONS[def].name}: ${res.reason}">${symbol}</td>`;
                  }).join('');

                  return `
                    <tr>
                      <th>${PIECE_DEFINITIONS[atk].name}</th>
                      ${cells}
                      <td style="font-weight:bold; color:#4cd964;">${winCount}</td>
                      <td style="font-weight:bold; color:#ffd700;">${drawCount}</td>
                      <td style="font-weight:bold; color:#ff6b6b;">${loseCount}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div id="tab-content-overview" style="display: ${initialTab === 'overview' ? 'block' : 'none'};">
          <div style="display:flex; flex-direction:column; gap:16px; font-size:0.9rem; line-height:1.6;">
            <div>
              <h3 style="color:var(--text-gold); font-size:1rem; margin-bottom:6px;">🎯 ゲームの目的・勝利条件</h3>
              <ul style="padding-left:20px;">
                <li><b>総司令部の占領</b>: 将官（大将・中将・少将）または佐官（大佐・中佐・少佐）が敵の総司令部（最奥列中央の2マス）に到達すると即座に勝利！</li>
                <li><b>動ける駒の全滅</b>: 相手の移動可能な駒をすべて倒せば勝利！</li>
              </ul>
            </div>

            <div>
              <h3 style="color:var(--text-gold); font-size:1rem; margin-bottom:6px;">🌊 川と突入口（進入制限）</h3>
              <ul style="padding-left:20px;">
                <li>地上部隊は、中央の川（前線）を越える際、<b>突入口（列1および列4の橋）</b>しか通過できません。</li>
                <li><b>飛行機のみ</b>、川を無視してどこからでも敵陣へ飛翔・侵入可能です。</li>
                <li>地雷および軍旗は突入口マスへの初期配置が禁止されています。</li>
              </ul>
            </div>

            <div>
              <h3 style="color:var(--text-gold); font-size:1rem; margin-bottom:6px;">⚔️ 駒の種類と特殊能力 (計23枚)</h3>
              <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap:8px;">
                ${Object.values(PIECE_DEFINITIONS)
                  .map(
                    (p) => `
                  <div style="background:var(--bg-surface-elevated); padding:8px 10px; border-radius:4px; border:1px solid rgba(255,255,255,0.06);">
                    <div style="display:flex; justify-content:space-between; font-weight:700; color:var(--text-gold);">
                      <span>${p.name}</span>
                      <span>${p.count}枚</span>
                    </div>
                    <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">${p.description}</div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>

            <div>
              <h3 style="color:var(--text-gold); font-size:1rem; margin-bottom:6px;">💡 重要相性・天敵ルール</h3>
              <div style="background:var(--bg-surface-elevated); padding:10px 12px; border-radius:6px; border-left:4px solid var(--accent-gold);">
                ・<b>大将 vs スパイ</b>: スパイが大将を暗殺（スパイの勝利）。<br>
                ・<b>地雷</b>: 突入した敵駒を相打ち爆破。ただし<b>工兵と飛行機</b>にのみ一方的に撤去される。<br>
                ・<b>飛行機</b>: 将官（大将・中将・少将）以外すべてに勝利（地雷・タンクも撃破）。将官にのみ撃墜される。<br>
                ・<b>タンク</b>: 佐官・尉官以下に勝利。将官・飛行機・工兵・地雷に敗北。<br>
                ・<b>軍旗</b>: すぐ後ろにある味方駒の強さになる。背後が空ならどの駒にも敗北。
              </div>
            </div>
          </div>
        </div>

        <div style="margin-top:20px; text-align:right;">
          <button id="btn-modal-ok" class="btn btn-gold" style="padding:8px 24px;">閉じる</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.activeModal = modal;

    // タブ切り替えイベント
    modal.querySelectorAll('.rules-tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const tab = target.dataset.tab;
        sound.playClick();

        modal.querySelectorAll('.rules-tab-btn').forEach((b) => b.classList.remove('active'));
        target.classList.add('active');

        const matrixContent = modal.querySelector('#tab-content-matrix') as HTMLElement;
        const overviewContent = modal.querySelector('#tab-content-overview') as HTMLElement;

        if (tab === 'matrix') {
          matrixContent.style.display = 'block';
          overviewContent.style.display = 'none';
        } else {
          matrixContent.style.display = 'none';
          overviewContent.style.display = 'block';
        }
      });
    });

    // 駒インスペクターのチップ切り替え
    const updateInspectCard = () => {
      const container = modal.querySelector('#inspect-card-container');
      if (!container) return;

      const piece = this.selectedInspectType;
      const info = PIECE_DEFINITIONS[piece];

      const wins: string[] = [];
      const loses: string[] = [];
      const draws: string[] = [];

      for (const def of COMBAT_TYPES) {
        const res = resolveBaseCombat(piece, def);
        const targetName = PIECE_DEFINITIONS[def].name;
        if (res.winner === 'attacker') {
          wins.push(targetName);
        } else if (res.winner === 'defender') {
          loses.push(targetName);
        } else {
          draws.push(targetName);
        }
      }

      container.innerHTML = `
        <div class="piece-inspect-card">
          <div style="display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:6px;">
            <div>
              <span style="font-family:var(--font-antique); font-size:1.2rem; font-weight:900; color:var(--text-gold); margin-right:8px;">
                ${info.name}
              </span>
              <span style="font-size:0.8rem; color:var(--text-muted);">${info.canCaptureHQ ? '👑 総司令部占領可能' : ''}</span>
            </div>
            <span style="font-size:0.8rem; color:var(--text-muted);">${info.description}</span>
          </div>

          <div>
            <div class="inspect-section-title" style="color:#4cd964;">
              <span>⭕ 勝てる相手 (${wins.length}種):</span>
            </div>
            <div class="inspect-pill-list" style="margin-top:4px;">
              ${wins.length > 0 ? wins.map((w) => `<span class="inspect-pill win">${w}</span>`).join('') : '<span style="color:var(--text-muted); font-size:0.8rem;">なし</span>'}
            </div>
          </div>

          <div>
            <div class="inspect-section-title" style="color:#ffd700;">
              <span>🤝 相打ち（両軍消滅） (${draws.length}種):</span>
            </div>
            <div class="inspect-pill-list" style="margin-top:4px;">
              ${draws.map((d) => `<span class="inspect-pill draw">${d}</span>`).join('')}
            </div>
          </div>

          <div>
            <div class="inspect-section-title" style="color:#ff6b6b;">
              <span>❌ 負ける相手 (${loses.length}種):</span>
            </div>
            <div class="inspect-pill-list" style="margin-top:4px;">
              ${loses.length > 0 ? loses.map((l) => `<span class="inspect-pill lose">${l}</span>`).join('') : '<span style="color:var(--text-muted); font-size:0.8rem;">なし</span>'}
            </div>
          </div>
        </div>
      `;
    };

    updateInspectCard();

    modal.querySelectorAll('.piece-inspect-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        this.selectedInspectType = target.dataset.inspectType as PieceType;
        sound.playClick();

        modal.querySelectorAll('.piece-inspect-chip').forEach((c) => c.classList.remove('active'));
        target.classList.add('active');
        updateInspectCard();
      });
    });

    modal.querySelector('#btn-close-modal')?.addEventListener('click', () => this.close());
    modal.querySelector('#btn-modal-ok')?.addEventListener('click', () => this.close());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });
  }

  public openSettings(): void {
    this.close();

    const state = this.gameManager.getState();
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    modal.innerHTML = `
      <div class="modal-content" style="max-width:440px;">
        <div class="modal-header">
          <h2 class="modal-title">⚙️ 対局・システム設定</h2>
          <button id="btn-close-modal" class="btn btn-icon">✕</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <label style="display:block; font-weight:700; color:var(--text-gold); margin-bottom:6px;">
              AIの思考難易度:
            </label>
            <select id="select-ai-diff" style="width:100%; padding:8px; background:var(--bg-surface-elevated); color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:4px; font-family:var(--font-mincho);">
              <option value="easy" ${state.settings.aiDifficulty === 'easy' ? 'selected' : ''}>初級（初心者向け・ランダム要素あり）</option>
              <option value="normal" ${state.settings.aiDifficulty === 'normal' ? 'selected' : ''}>中級（標準・索敵と司令部突撃）</option>
              <option value="hard" ${state.settings.aiDifficulty === 'hard' ? 'selected' : ''}>上級（本格推理・地雷撤去と連携）</option>
            </select>
          </div>

          <div>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="check-sound" ${state.settings.soundEnabled ? 'checked' : ''}>
              <span>効果音（Web Audio SE）を有効にする</span>
            </label>
          </div>

          <div>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="check-taisho-rule" ${state.settings.taishoLossRule ? 'checked' : ''}>
              <span>【ローカルルール】大将討ち取りで即敗北</span>
            </label>
          </div>
        </div>

        <div style="margin-top:24px; text-align:right;">
          <button id="btn-save-settings" class="btn btn-primary" style="padding:8px 24px;">設定を保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.activeModal = modal;

    modal.querySelector('#btn-close-modal')?.addEventListener('click', () => this.close());
    modal.querySelector('#btn-save-settings')?.addEventListener('click', () => {
      const diff = (modal.querySelector('#select-ai-diff') as HTMLSelectElement).value as any;
      const soundEnabled = (modal.querySelector('#check-sound') as HTMLInputElement).checked;
      const taishoRule = (modal.querySelector('#check-taisho-rule') as HTMLInputElement).checked;

      state.settings.aiDifficulty = diff;
      state.settings.soundEnabled = soundEnabled;
      state.settings.taishoLossRule = taishoRule;
      sound.setEnabled(soundEnabled);

      sound.playClick();
      this.close();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });
  }

  public close(): void {
    if (this.activeModal) {
      this.activeModal.remove();
      this.activeModal = null;
    }
  }
}
