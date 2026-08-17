import { GameManager } from './core/state';
import { DeductionTracker } from './core/ai/deduction';
import { AIPlayer } from './core/ai/ai_player';
import { BoardView } from './ui/board_view';
import { SetupView } from './ui/setup_view';
import { HistoryPanel } from './ui/history_panel';
import { RefereeDialog } from './ui/referee_dialog';
import { DeductionMemo } from './ui/deduction_memo';
import { ModalManager } from './ui/modal';
import { ReplayView } from './ui/replay_view';
import { sound } from './audio/sound';
import { Position } from './core/types';

class App {
  private gameManager: GameManager;
  private deductionTracker: DeductionTracker;
  private aiPlayer: AIPlayer;
  private boardView!: BoardView;
  private setupView!: SetupView;
  private historyPanel!: HistoryPanel;
  private refereeDialog!: RefereeDialog;
  private deductionMemo!: DeductionMemo;
  private modalManager!: ModalManager;
  private replayView!: ReplayView;

  private isAIThinking = false;

  constructor() {
    this.gameManager = new GameManager();
    this.deductionTracker = new DeductionTracker(this.gameManager.getState().pieces);
    this.aiPlayer = new AIPlayer('gote', 'normal', this.deductionTracker);

    this.initUI();
    this.bindEvents();

    // デフォルトで先手・後手にバランス型を配置
    this.gameManager.applyPreset('sente', 'balanced');
    this.gameManager.applyPreset('gote', 'balanced');
  }

  private initUI(): void {
    const boardContainer = document.getElementById('board-container')!;
    const setupContainer = document.getElementById('setup-container')!;
    const historyContainer = document.getElementById('history-container')!;

    this.refereeDialog = new RefereeDialog();
    this.modalManager = new ModalManager(this.gameManager);

    this.deductionMemo = new DeductionMemo(this.deductionTracker, {
      onSetMark: (pieceId, type) => {
        this.boardView.setDeductionMark(pieceId, type);
      },
    });

    this.replayView = new ReplayView(this.gameManager, {
      onNewGame: () => this.handleNewGame(),
    });

    this.boardView = new BoardView(boardContainer, this.gameManager, {
      onMoveExecute: (pieceId, to) => this.handlePlayerMove(pieceId, to),
      onOpenDeduction: (piece, x, y) => {
        this.deductionMemo.open(piece, x, y);
      },
    });

    this.setupView = new SetupView(setupContainer, this.gameManager, {
      onStartGame: () => {
        this.renderAll();
      },
      onOpenRules: () => this.modalManager.openRules(),
    });

    this.historyPanel = new HistoryPanel(historyContainer, this.gameManager, {
      onResign: () => {
        this.renderAll();
        this.replayView.show();
      },
      onOpenRules: () => this.modalManager.openRules(),
      onOpenSettings: () => this.modalManager.openSettings(),
    });

    this.gameManager.subscribe(() => {
      this.renderAll();
    });

    this.renderAll();
  }

  private renderAll(): void {
    const state = this.gameManager.getState();
    this.boardView.render();
    this.setupView.render();
    this.historyPanel.render();

    // AI難易度の同期
    this.aiPlayer.setDifficulty(state.settings.aiDifficulty);
  }

  private bindEvents(): void {
    document.getElementById('btn-rules')?.addEventListener('click', () => {
      sound.playClick();
      this.modalManager.openRules();
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => {
      sound.playClick();
      this.modalManager.openSettings();
    });

    document.getElementById('btn-new-game')?.addEventListener('click', () => {
      sound.playTaiko();
      this.handleNewGame();
    });

    const soundBtn = document.getElementById('btn-sound-toggle');
    soundBtn?.addEventListener('click', () => {
      const enabled = !sound.isEnabled();
      sound.setEnabled(enabled);
      soundBtn.textContent = enabled ? '🔊' : '🔇';
      sound.playClick();
    });
  }

  private handleNewGame(): void {
    this.gameManager.reset();
    this.gameManager.applyPreset('sente', 'balanced');
    this.deductionTracker = new DeductionTracker(this.gameManager.getState().pieces);
    this.aiPlayer = new AIPlayer(
      'gote',
      this.gameManager.getState().settings.aiDifficulty,
      this.deductionTracker
    );
    this.renderAll();
  }

  /**
   * プレイヤー（先手）の手番実行
   */
  private async handlePlayerMove(pieceId: string, to: Position): Promise<void> {
    if (this.isAIThinking) return;

    sound.playPieceMove();

    const result = this.gameManager.makeMove(pieceId, to);
    if (!result.success) return;

    // 戦闘演出
    if (result.combat) {
      this.deductionTracker.recordMove(
        this.gameManager.getState().lastMove!,
        this.gameManager.getState().pieces
      );
      await this.refereeDialog.showCombat(result.combat, !!result.gameOver);
    }

    if (result.gameOver) {
      this.replayView.show();
      return;
    }

    // AIの手番
    if (this.gameManager.getState().turn === 'gote' && this.gameManager.getState().settings.mode === 'vs_ai') {
      this.runAITurn();
    }
  }

  /**
   * AI（後手）の手番実行
   */
  private async runAITurn(): Promise<void> {
    this.isAIThinking = true;

    // 人間らしい思考間隔 (500〜800ms)
    await new Promise((r) => setTimeout(r, 600));

    const state = this.gameManager.getState();
    if (state.phase !== 'playing' || state.turn !== 'gote') {
      this.isAIThinking = false;
      return;
    }

    const aiChoice = this.aiPlayer.selectBestMove(state.pieces);
    if (!aiChoice) {
      // 合法手なし -> 投了
      this.gameManager.resign('gote');
      this.replayView.show();
      this.isAIThinking = false;
      return;
    }

    sound.playPieceMove();
    const result = this.gameManager.makeMove(aiChoice.pieceId, aiChoice.to);

    if (result.combat) {
      this.deductionTracker.recordMove(
        this.gameManager.getState().lastMove!,
        this.gameManager.getState().pieces
      );
      await this.refereeDialog.showCombat(result.combat, !!result.gameOver);
    }

    if (result.gameOver) {
      this.replayView.show();
    }

    this.isAIThinking = false;
  }
}

// 起動
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
