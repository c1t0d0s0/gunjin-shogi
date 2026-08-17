import { MoveRecord, Piece, PieceType } from '../types';
import { resolveBaseCombat } from '../combat';

export interface PieceDeduction {
  pieceId: string;
  hasMoved: boolean;
  canBeMineOrFlag: boolean;
  possibleMovesDistance: number;
  possibleTypes: PieceType[];
  revealedType?: PieceType;
  combatHistory: {
    enemyType: PieceType;
    result: 'won' | 'lost' | 'drew';
  }[];
}

const ALL_PIECE_TYPES: PieceType[] = [
  'taisho', 'chujo', 'shojo', 'taisa', 'chusa', 'shosa',
  'tai_i', 'chu_i', 'sho_i', 'hikoki', 'tank', 'kihei',
  'kohei', 'spy', 'jirai', 'gunki',
];

export class DeductionTracker {
  private deductions = new Map<string, PieceDeduction>();

  constructor(pieces: Piece[]) {
    for (const piece of pieces) {
      this.deductions.set(piece.id, {
        pieceId: piece.id,
        hasMoved: false,
        canBeMineOrFlag: true,
        possibleMovesDistance: 0,
        possibleTypes: [...ALL_PIECE_TYPES],
        combatHistory: [],
      });
    }
  }

  public getDeduction(pieceId: string): PieceDeduction | undefined {
    return this.deductions.get(pieceId);
  }

  /**
   * 着手履歴に基づいて推論を更新
   */
  public recordMove(record: MoveRecord, _boardPieces?: Piece[]): void {
    const d = this.deductions.get(record.pieceId);
    if (!d) return;

    d.hasMoved = true;
    d.canBeMineOrFlag = false;

    // 移動した駒は地雷・軍旗ではない
    d.possibleTypes = d.possibleTypes.filter((t) => t !== 'jirai' && t !== 'gunki');

    const dr = Math.abs(record.to.row - record.from.row);
    const dc = Math.abs(record.to.col - record.from.col);

    // 縦に3マス以上、または横に2マス以上動いた場合
    if (dc >= 2) {
      // 横に2マス以上動けるのは工兵のみ！
      d.possibleTypes = ['kohei'];
    } else if (dr >= 3) {
      // 縦に3マス以上動けるのは工兵または飛行機
      d.possibleTypes = d.possibleTypes.filter((t) => t === 'kohei' || t === 'hikoki');
    } else if (dr === 2 && dc === 0) {
      // 前方に2マス動いた（タンク、騎兵、工兵、飛行機）
      d.possibleTypes = d.possibleTypes.filter(
        (t) => t === 'tank' || t === 'kihei' || t === 'kohei' || t === 'hikoki'
      );
    }

    // 戦闘があった場合の推論
    if (record.combat) {
      const isAttacker = record.combat.attackerType === record.pieceType;
      const enemyType = isAttacker ? record.combat.defenderType : record.combat.attackerType;
      const myResult = isAttacker
        ? record.combat.winner === 'attacker'
          ? 'won'
          : record.combat.winner === 'defender'
          ? 'lost'
          : 'drew'
        : record.combat.winner === 'defender'
        ? 'won'
        : record.combat.winner === 'attacker'
        ? 'lost'
        : 'drew';

      d.combatHistory.push({ enemyType, result: myResult });

      // 可能な駒種を戦闘ルールと照合してフィルタリング
      d.possibleTypes = d.possibleTypes.filter((type) => {
        const combatSim = resolveBaseCombat(
          isAttacker ? type : enemyType,
          isAttacker ? enemyType : type
        );
        const expectedWinner = isAttacker
          ? combatSim.winner
          : combatSim.winner === 'attacker'
          ? 'defender'
          : combatSim.winner === 'defender'
          ? 'attacker'
          : 'draw';

        if (myResult === 'won') return expectedWinner === 'attacker';
        if (myResult === 'lost') return expectedWinner === 'defender';
        return expectedWinner === 'draw';
      });
    }
  }

  /**
   * 敵の裏向きの駒に対する候補リストを取得
   */
  public getCandidateTypesForPiece(pieceId: string): PieceType[] {
    const d = this.deductions.get(pieceId);
    if (!d) return [...ALL_PIECE_TYPES];
    return d.possibleTypes.length > 0 ? d.possibleTypes : [...ALL_PIECE_TYPES];
  }
}
