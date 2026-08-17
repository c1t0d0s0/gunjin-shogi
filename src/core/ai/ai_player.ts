import { AIDifficulty, Piece, Player, Position } from '../types';
import { getAllValidMovesForPlayer, getBoardGrid, isHQPosition } from '../board';
import { PIECE_DEFINITIONS } from '../pieces';
import { resolveBaseCombat } from '../combat';
import { DeductionTracker } from './deduction';
import { PIECE_VALUES } from './evaluator';

export interface AIMoveChoice {
  pieceId: string;
  to: Position;
  score: number;
}

export class AIPlayer {
  private player: Player;
  private difficulty: AIDifficulty;
  private deductionTracker: DeductionTracker;

  constructor(player: Player, difficulty: AIDifficulty, deductionTracker: DeductionTracker) {
    this.player = player;
    this.difficulty = difficulty;
    this.deductionTracker = deductionTracker;
  }

  public setDifficulty(difficulty: AIDifficulty): void {
    this.difficulty = difficulty;
  }

  /**
   * AIの次の一手を決定
   */
  public selectBestMove(pieces: Piece[]): AIMoveChoice | null {
    const allValid = getAllValidMovesForPlayer(this.player, pieces);
    if (allValid.length === 0) return null;

    const flatMoves: { piece: Piece; to: Position }[] = [];
    for (const item of allValid) {
      for (const to of item.moves) {
        flatMoves.push({ piece: item.piece, to });
      }
    }

    if (flatMoves.length === 0) return null;

    // 難易度: 初級 (Easy)
    if (this.difficulty === 'easy') {
      // 司令部占領可能なら即座に選択
      const enemyPlayer = this.player === 'sente' ? 'gote' : 'sente';
      const winMove = flatMoves.find(
        (m) =>
          isHQPosition(m.to, enemyPlayer) &&
          PIECE_DEFINITIONS[m.piece.type].canCaptureHQ
      );
      if (winMove) {
        return { pieceId: winMove.piece.id, to: winMove.to, score: 9999 };
      }

      // ランダムに選択（前進優先）
      const forwardDir = this.player === 'gote' ? 1 : -1;
      const forwardMoves = flatMoves.filter(
        (m) => (m.to.row - m.piece.position!.row) * forwardDir > 0
      );
      const candidates = forwardMoves.length > 0 && Math.random() < 0.7 ? forwardMoves : flatMoves;
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      return { pieceId: chosen.piece.id, to: chosen.to, score: 0 };
    }

    // 難易度: 中級 & 上級
    const grid = getBoardGrid(pieces);
    const enemyPlayer = this.player === 'sente' ? 'gote' : 'sente';
    const scoredMoves: AIMoveChoice[] = [];

    for (const move of flatMoves) {
      let moveScore = 0;
      const targetPiece = grid[move.to.row][move.to.col];

      // 1. 総司令部占領 (最優先)
      if (isHQPosition(move.to, enemyPlayer) && PIECE_DEFINITIONS[move.piece.type].canCaptureHQ) {
        if (!targetPiece) {
          moveScore += 10000;
        } else {
          // 敵司令部にいる駒との勝率推定
          moveScore += 5000;
        }
      }

      // 2. 敵駒への攻撃評価
      if (targetPiece) {
        const candidateTypes = this.deductionTracker.getCandidateTypesForPiece(targetPiece.id);
        let winProb = 0;
        for (const candType of candidateTypes) {
          const sim = resolveBaseCombat(move.piece.type, candType);
          if (sim.winner === 'attacker') winProb += 1;
          else if (sim.winner === 'draw') winProb += 0.4;
        }
        winProb = winProb / candidateTypes.length;

        const myVal = PIECE_VALUES[move.piece.type];
        const estimatedTargetVal = candidateTypes.reduce((acc, t) => acc + PIECE_VALUES[t], 0) / candidateTypes.length;

        if (winProb >= 0.7) {
          // 勝ちやすい戦闘
          moveScore += estimatedTargetVal * winProb + 200;
        } else if (winProb <= 0.3) {
          // 負けやすい無謀な突撃はペナルティ
          moveScore -= myVal * 0.8;
        } else {
          // 互角
          moveScore += (estimatedTargetVal - myVal) * 0.5;
        }

        // 工兵が未移動駒（地雷候補）を攻撃する場合は大幅ボーナス
        if (move.piece.type === 'kohei' && candidateTypes.includes('jirai')) {
          moveScore += 400;
        }

        // スパイが動いている強力な駒（大将候補）を攻撃する場合はボーナス
        if (move.piece.type === 'spy' && candidateTypes.includes('taisho')) {
          moveScore += 600;
        }
      }

      // 3. 移動による位置取りボーナス
      const forwardDir = this.player === 'gote' ? 1 : -1;
      const rowDelta = (move.to.row - move.piece.position!.row) * forwardDir;
      if (rowDelta > 0) {
        moveScore += rowDelta * 25; // 前進ボーナス
      }

      // 将官・佐官の司令部接近ボーナス
      if (PIECE_DEFINITIONS[move.piece.type].canCaptureHQ) {
        const distFromHQ = Math.min(
          ...[ { row: enemyPlayer === 'sente' ? 7 : 0, col: 2 }, { row: enemyPlayer === 'sente' ? 7 : 0, col: 3 } ].map(
            (hq) => Math.abs(move.to.row - hq.row) + Math.abs(move.to.col - hq.col)
          )
        );
        moveScore += (10 - distFromHQ) * 20;
      }

      // 上級 (Hard): ランダム揺らぎを小さくして最善手を徹底
      const randomJitter = this.difficulty === 'hard' ? Math.random() * 5 : Math.random() * 30;
      scoredMoves.push({
        pieceId: move.piece.id,
        to: move.to,
        score: moveScore + randomJitter,
      });
    }

    scoredMoves.sort((a, b) => b.score - a.score);
    return scoredMoves[0] || null;
  }
}
