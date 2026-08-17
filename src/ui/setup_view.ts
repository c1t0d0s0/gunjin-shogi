import { FORMATION_PRESETS } from '../core/presets';
import { GameManager } from '../core/state';
import { Piece, PieceType } from '../core/types';
import { PIECE_DEFINITIONS } from '../core/pieces';
import { sound } from '../audio/sound';

export interface SetupViewCallbacks {
  onStartGame?: () => void;
  onSelectBenchPiece?: (piece: Piece) => void;
  onOpenRules?: () => void;
}

export class SetupView {
  private container: HTMLElement;
  private gameManager: GameManager;
  private callbacks: SetupViewCallbacks;

  constructor(
    container: HTMLElement,
    gameManager: GameManager,
    callbacks: SetupViewCallbacks = {}
  ) {
    this.container = container;
    this.gameManager = gameManager;
    this.callbacks = callbacks;
  }

  public render(): void {
    const state = this.gameManager.getState();

    // 1. 配置フェーズ (Setup Phase)
    if (state.phase === 'setup') {
      this.container.innerHTML = `
        <div class="side-panel setup-panel">
          <h3 class="panel-title">
            <span>駒の布陣・配置</span>
            <span style="font-size:0.8rem; color:var(--text-gold);">23枚配置</span>
          </h3>

          <div style="font-size:0.82rem; color:var(--text-muted); line-height:1.4;">
            自陣（下部4行）に駒を配置してください。<br>
            盤上の駒をクリックすると配置位置を変更できます。<br>
            <span style="color:var(--text-gold);">※突入口に地雷・軍旗は配置禁止</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:0.8rem; font-weight:700; color:var(--text-gold);">定石陣形プリセット:</label>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
              ${FORMATION_PRESETS.map(
                (p) => `
                <button class="btn preset-btn" data-preset-id="${p.id}" style="font-size:0.78rem; padding:6px 6px; text-align:center; justify-content:center;">
                  ${p.name.split('（')[0]}
                </button>
              `
              ).join('')}
              <button class="btn preset-btn" data-preset-id="random" style="grid-column: span 2; font-size:0.8rem; padding:6px 8px; justify-content:center;">
                🎲 完全ランダム配置
              </button>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <button id="btn-reset-setup" class="btn" style="font-size:0.8rem;">全クリア</button>
            <button id="btn-start-game" class="btn btn-primary" style="padding:8px 18px;">
              ⚔️ 対局開始
            </button>
          </div>
        </div>
      `;

      // プリセットボタン
      this.container.querySelectorAll('.preset-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const target = e.currentTarget as HTMLElement;
          const presetId = target.dataset.presetId!;
          sound.playTaiko();
          this.gameManager.applyPreset('sente', presetId);
        });
      });

      // リセットボタン
      const resetBtn = this.container.querySelector('#btn-reset-setup');
      resetBtn?.addEventListener('click', () => {
        const sentePieces = this.gameManager
          .getState()
          .pieces.filter((p) => p.owner === 'sente');
        for (const p of sentePieces) {
          p.position = undefined;
        }
        sound.playClick();
        this.gameManager.reset();
      });

      // 対局開始ボタン
      const startBtn = this.container.querySelector('#btn-start-game');
      startBtn?.addEventListener('click', () => {
        const result = this.gameManager.startPlaying();
        if (result.success) {
          sound.playTaiko();
          if (this.callbacks.onStartGame) {
            this.callbacks.onStartGame();
          }
        } else {
          alert(result.error || '駒が正しく配置されていません');
        }
      });
      return;
    }

    // 2. 対局中 / 終局後 (Playing / Ended Phase) -> 自軍残存部隊リスト & 役職早見表
    const sentePieces = state.pieces.filter((p) => p.owner === 'sente');
    const pieceCountMap = new Map<PieceType, { total: number; alive: number }>();

    for (const p of sentePieces) {
      if (!pieceCountMap.has(p.type)) {
        pieceCountMap.set(p.type, { total: 0, alive: 0 });
      }
      const item = pieceCountMap.get(p.type)!;
      item.total++;
      if (p.isAlive) item.alive++;
    }

    const order: PieceType[] = [
      'taisho', 'chujo', 'shojo', 'taisa', 'chusa', 'shosa',
      'tai_i', 'chu_i', 'sho_i', 'hikoki', 'tank', 'kihei',
      'kohei', 'spy', 'jirai', 'gunki',
    ];

    this.container.innerHTML = `
      <div class="side-panel">
        <h3 class="panel-title">
          <span>自軍 残存部隊</span>
          <span style="font-size:0.8rem; color:var(--text-sente);">先手軍</span>
        </h3>

        <div style="font-size:0.78rem; color:var(--text-muted);">
          味方の生存部隊と能力の早見表です。
        </div>

        <div style="display:flex; flex-direction:column; gap:4px; max-height:420px; overflow-y:auto; padding-right:4px;">
          ${order
            .map((type) => {
              const info = PIECE_DEFINITIONS[type];
              const stat = pieceCountMap.get(type) || { total: info.count, alive: 0 };
              const isAllDead = stat.alive === 0;
              return `
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:4px 8px; border-radius:4px; border-left:3px solid ${isAllDead ? 'rgba(255,255,255,0.1)' : 'var(--accent-sente)'}; opacity:${isAllDead ? 0.4 : 1};">
                  <div style="display:flex; align-items:baseline; gap:6px;">
                    <span style="font-weight:700; font-size:0.85rem; color:${isAllDead ? 'var(--text-muted)' : 'var(--text-main)'};">${info.name}</span>
                    <span style="font-size:0.7rem; color:var(--text-muted);">${info.canCaptureHQ ? '👑' : ''}</span>
                  </div>
                  <span style="font-size:0.85rem; font-weight:700; font-family:var(--font-antique); color:${isAllDead ? 'var(--text-muted)' : 'var(--text-gold)'};">
                    ${stat.alive} / ${stat.total}
                  </span>
                </div>
              `;
            })
            .join('')}
        </div>

        <button id="btn-quick-rules" class="btn" style="font-size:0.8rem; margin-top:auto;">
          📖 全相性表・ルール詳細
        </button>
      </div>
    `;

    this.container.querySelector('#btn-quick-rules')?.addEventListener('click', () => {
      sound.playClick();
      if (this.callbacks.onOpenRules) {
        this.callbacks.onOpenRules();
      }
    });
  }
}
