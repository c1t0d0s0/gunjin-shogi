import {
  CombatResult,
  GamePhase,
  GameSettings,
  MoveRecord,
  Piece,
  PieceType,
  Player,
  Position,
} from './types';
import { createPlayerPieceSet, isSamePosition, PIECE_DEFINITIONS } from './pieces';
import {
  ENTRY_COLS,
  getBoardGrid,
  getValidMovesForPiece,
  hasMovablePieces,
  isHQPosition,
} from './board';
import { resolveCombat } from './combat';
import { FORMATION_PRESETS, generateRandomLayout, layoutToPositions } from './presets';

export interface GameState {
  phase: GamePhase;
  turn: Player;
  pieces: Piece[];
  settings: GameSettings;
  moveHistory: MoveRecord[];
  currentMoveNumber: number;
  winner: Player | 'draw' | null;
  winReason: string;
  lastMove: MoveRecord | null;
  lastCombat: CombatResult | null;
  senteSetupComplete: boolean;
  goteSetupComplete: boolean;
  startTime: number;
}

export class GameManager {
  private state: GameState;
  private listeners: ((state: GameState) => void)[] = [];

  constructor(settings?: Partial<GameSettings>) {
    this.state = this.createInitialState(settings);
  }

  public getState(): GameState {
    return this.state;
  }

  public subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public createInitialState(customSettings?: Partial<GameSettings>): GameState {
    const settings: GameSettings = {
      mode: 'vs_ai',
      aiDifficulty: 'normal',
      taishoLossRule: false,
      soundEnabled: true,
      bgmEnabled: false,
      ...customSettings,
    };

    const sentePieces = createPlayerPieceSet('sente');
    const gotePieces = createPlayerPieceSet('gote');

    return {
      phase: 'setup',
      turn: 'sente',
      pieces: [...sentePieces, ...gotePieces],
      settings,
      moveHistory: [],
      currentMoveNumber: 1,
      winner: null,
      winReason: '',
      lastMove: null,
      lastCombat: null,
      senteSetupComplete: false,
      goteSetupComplete: false,
      startTime: Date.now(),
    };
  }

  public reset(customSettings?: Partial<GameSettings>): void {
    this.state = this.createInitialState(customSettings);
    // デフォルトで後手(AI)にランダムまたは定石陣形を適用
    this.applyPreset('gote', 'balanced');
    this.notify();
  }

  /**
   * 陣形プリセットを一括適用
   */
  public applyPreset(player: Player, presetId: string): void {
    let layout: (PieceType | null)[][];

    if (presetId === 'random') {
      layout = generateRandomLayout();
    } else {
      const preset = FORMATION_PRESETS.find((p) => p.id === presetId);
      layout = preset ? preset.layout : FORMATION_PRESETS[0].layout;
    }

    const posMap = layoutToPositions(layout, player);
    const playerPieces = this.state.pieces.filter((p) => p.owner === player);

    // リセット
    for (const p of playerPieces) {
      p.position = undefined;
    }

    // 駒種ごとに配置
    for (const [type, positions] of posMap.entries()) {
      const targetPieces = playerPieces.filter((p) => p.type === type);
      for (let i = 0; i < positions.length && i < targetPieces.length; i++) {
        targetPieces[i].position = positions[i];
      }
    }

    if (player === 'sente') {
      this.state.senteSetupComplete = true;
    } else {
      this.state.goteSetupComplete = true;
    }

    this.notify();
  }

  /**
   * 単一の駒の配置位置を変更 (配置フェーズ)
   */
  public placePiece(pieceId: string, targetPos?: Position): { success: boolean; error?: string } {
    if (this.state.phase !== 'setup') {
      return { success: false, error: '配置フェーズではありません' };
    }

    const piece = this.state.pieces.find((p) => p.id === pieceId);
    if (!piece) {
      return { success: false, error: '指定の駒が見つかりません' };
    }

    // 取り外し
    if (!targetPos) {
      piece.position = undefined;
      this.checkSetupCompleteness();
      this.notify();
      return { success: true };
    }

    // 自陣エリア内か判定
    if (piece.owner === 'sente' && (targetPos.row < 4 || targetPos.row > 7)) {
      return { success: false, error: '先手陣地外には配置できません' };
    }
    if (piece.owner === 'gote' && (targetPos.row < 0 || targetPos.row > 3)) {
      return { success: false, error: '後手陣地外には配置できません' };
    }

    // 突入口ルール判定（地雷・軍旗は禁止）
    const isEntry = (targetPos.row === 3 || targetPos.row === 4) && ENTRY_COLS.includes(targetPos.col);
    if (isEntry && (piece.type === 'jirai' || piece.type === 'gunki')) {
      return { success: false, error: '突入口に地雷や軍旗を配置することは禁止されています' };
    }

    // 既に駒があるマスなら、その駒と位置をスワップ
    const existingPiece = this.state.pieces.find(
      (p) => p.isAlive && p.position && isSamePosition(p.position, targetPos)
    );

    if (existingPiece) {
      const oldPos = piece.position;
      existingPiece.position = oldPos;
    }

    piece.position = targetPos;
    this.checkSetupCompleteness();
    this.notify();
    return { success: true };
  }

  private checkSetupCompleteness(): void {
    const sentePlaced = this.state.pieces.filter((p) => p.owner === 'sente' && p.position);
    this.state.senteSetupComplete = sentePlaced.length === 23;

    const gotePlaced = this.state.pieces.filter((p) => p.owner === 'gote' && p.position);
    this.state.goteSetupComplete = gotePlaced.length === 23;
  }

  /**
   * 対局開始
   */
  public startPlaying(): { success: boolean; error?: string } {
    this.checkSetupCompleteness();

    if (!this.state.senteSetupComplete) {
      return { success: false, error: '先手の駒（23枚）がすべて配置されていません' };
    }
    if (!this.state.goteSetupComplete) {
      // 後手が未配置なら自動でバランス型をセット
      this.applyPreset('gote', 'balanced');
    }

    this.state.phase = 'playing';
    this.state.turn = 'sente';
    this.state.startTime = Date.now();
    this.notify();
    return { success: true };
  }

  /**
   * 駒を移動する
   */
  public makeMove(
    pieceId: string,
    toPos: Position
  ): {
    success: boolean;
    error?: string;
    combat?: CombatResult;
    gameOver?: boolean;
    winner?: Player | 'draw';
    winReason?: string;
  } {
    if (this.state.phase !== 'playing') {
      return { success: false, error: '対局中ではありません' };
    }

    const piece = this.state.pieces.find((p) => p.id === pieceId);
    if (!piece || !piece.isAlive || !piece.position) {
      return { success: false, error: '駒が存在しないか、既に倒されています' };
    }

    if (piece.owner !== this.state.turn) {
      return { success: false, error: '手番ではないプレイヤーの駒です' };
    }

    // 合法手チェック
    const validMoves = getValidMovesForPiece(piece, this.state.pieces);
    const isValid = validMoves.some((m) => isSamePosition(m, toPos));
    if (!isValid) {
      return { success: false, error: 'そのマスには移動できません' };
    }

    const fromPos = { ...piece.position };
    const grid = getBoardGrid(this.state.pieces);
    const targetPiece = grid[toPos.row][toPos.col];

    let combatResult: CombatResult | undefined;
    let isHQOccupied = false;

    // 1. 戦闘判定
    if (targetPiece) {
      combatResult = resolveCombat(piece, targetPiece, this.state.pieces);

      if (combatResult.winner === 'attacker') {
        // 防衛側死亡、攻撃側がそのマスへ進出
        targetPiece.isAlive = false;
        targetPiece.position = undefined;
        piece.position = toPos;
      } else if (combatResult.winner === 'defender') {
        // 攻撃側死亡
        piece.isAlive = false;
        piece.position = undefined;
      } else {
        // 相打ち（両方死亡）
        piece.isAlive = false;
        piece.position = undefined;
        targetPiece.isAlive = false;
        targetPiece.position = undefined;
      }
    } else {
      // 移動（空マス）
      piece.position = toPos;
    }

    // 2. 総司令部占領判定
    const enemyPlayer = piece.owner === 'sente' ? 'gote' : 'sente';
    if (
      piece.isAlive &&
      piece.position &&
      isHQPosition(piece.position, enemyPlayer)
    ) {
      const pieceInfo = PIECE_DEFINITIONS[piece.type];
      if (pieceInfo.canCaptureHQ) {
        isHQOccupied = true;
      }
    }

    // 棋譜記録
    const moveRecord: MoveRecord = {
      moveNumber: this.state.currentMoveNumber,
      player: this.state.turn,
      pieceId: piece.id,
      pieceType: piece.type,
      from: fromPos,
      to: toPos,
      combat: combatResult,
      isHQOccupied,
      timestamp: Date.now(),
    };

    this.state.moveHistory.push(moveRecord);
    this.state.lastMove = moveRecord;
    this.state.lastCombat = combatResult || null;
    this.state.currentMoveNumber++;

    // 3. 勝利判定チェック
    const victory = this.checkVictory(isHQOccupied, piece.owner);
    if (victory.isOver) {
      this.state.phase = 'ended';
      this.state.winner = victory.winner || null;
      this.state.winReason = victory.reason || '';
      this.revealAllPieces();
      this.notify();
      return {
        success: true,
        combat: combatResult,
        gameOver: true,
        winner: this.state.winner || undefined,
        winReason: this.state.winReason,
      };
    }

    // 手番交代
    this.state.turn = this.state.turn === 'sente' ? 'gote' : 'sente';
    this.notify();

    return {
      success: true,
      combat: combatResult,
      gameOver: false,
    };
  }

  /**
   * 勝利条件の総合判定
   */
  public checkVictory(
    isHQOccupied: boolean,
    currentPlayer: Player
  ): { isOver: boolean; winner?: Player | 'draw'; reason?: string } {
    const enemyPlayer = currentPlayer === 'sente' ? 'gote' : 'sente';

    // 1. 総司令部の占領
    if (isHQOccupied) {
      const pName = currentPlayer === 'sente' ? '先手' : '後手';
      return {
        isOver: true,
        winner: currentPlayer,
        reason: `${pName}が敵総司令部を完全制圧・占領！`,
      };
    }

    // 2. （オプション）大将討ち取りルール
    if (this.state.settings.taishoLossRule) {
      const senteTaisho = this.state.pieces.find(
        (p) => p.owner === 'sente' && p.type === 'taisho' && p.isAlive
      );
      const goteTaisho = this.state.pieces.find(
        (p) => p.owner === 'gote' && p.type === 'taisho' && p.isAlive
      );

      if (!senteTaisho && !goteTaisho) {
        return { isOver: true, winner: 'draw', reason: '両軍の大将が相討ち・討死' };
      }
      if (!senteTaisho) {
        return { isOver: true, winner: 'gote', reason: '先手の大将が討ち取られ全軍崩壊' };
      }
      if (!goteTaisho) {
        return { isOver: true, winner: 'sente', reason: '後手の大将が討ち取られ全軍崩壊' };
      }
    }

    // 3. 動かせる駒の全滅判定
    const nextPlayer = currentPlayer === 'sente' ? 'gote' : 'sente';
    const nextCanMove = hasMovablePieces(nextPlayer, this.state.pieces);
    const currCanMove = hasMovablePieces(currentPlayer, this.state.pieces);

    if (!nextCanMove && !currCanMove) {
      return { isOver: true, winner: 'draw', reason: '両軍ともに動かせる駒が全滅（引き分け）' };
    }
    if (!nextCanMove) {
      const pName = currentPlayer === 'sente' ? '先手' : '後手';
      const enemyName = enemyPlayer === 'sente' ? '先手' : '後手';
      return {
        isOver: true,
        winner: currentPlayer,
        reason: `${enemyName}の動かせる駒が全滅したため、${pName}の勝利！`,
      };
    }

    return { isOver: false };
  }

  /**
   * 終局時にすべての駒を開示
   */
  public revealAllPieces(): void {
    for (const piece of this.state.pieces) {
      piece.revealedToOpponent = true;
    }
  }

  /**
   * 投了
   */
  public resign(player: Player): void {
    if (this.state.phase !== 'playing') return;
    this.state.phase = 'ended';
    this.state.winner = player === 'sente' ? 'gote' : 'sente';
    const pName = player === 'sente' ? '先手' : '後手';
    const winnerName = this.state.winner === 'sente' ? '先手' : '後手';
    this.state.winReason = `${pName}の投了により、${winnerName}の勝利`;
    this.revealAllPieces();
    this.notify();
  }
}
