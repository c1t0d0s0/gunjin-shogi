import { Piece, PieceType, Player } from '../types';
import { SENTE_HQ_POSITIONS, GOTE_HQ_POSITIONS } from '../board';
import { PIECE_DEFINITIONS } from '../pieces';

export const PIECE_VALUES: Record<PieceType, number> = {
  taisho: 1200,
  chujo: 950,
  shojo: 800,
  taisa: 600,
  chusa: 500,
  shosa: 420,
  tai_i: 250,
  chu_i: 200,
  sho_i: 160,
  hikoki: 750,
  tank: 400,
  kohei: 380,
  kihei: 180,
  spy: 350,
  jirai: 300,
  gunki: 200,
};

/**
 * 局面評価関数（AI / Gote視点: 正の値が大きいほどGote優勢）
 */
export function evaluateBoard(pieces: Piece[], player: Player): number {
  let score = 0;
  const myPlayer = player;
  const targetHQs = myPlayer === 'gote' ? SENTE_HQ_POSITIONS : GOTE_HQ_POSITIONS;

  for (const p of pieces) {
    if (!p.isAlive || !p.position) continue;

    const val = PIECE_VALUES[p.type];
    const isMine = p.owner === myPlayer;
    const sign = isMine ? 1 : -1;

    // 1. 駒の価値
    score += sign * val;

    // 2. 敵総司令部への近さ（将官・佐官は司令部へ近づくほど高加点）
    if (PIECE_DEFINITIONS[p.type].canCaptureHQ) {
      const minDistanceToTargetHQ = Math.min(
        ...targetHQs.map(
          (hq) => Math.abs(p.position!.row - hq.row) + Math.abs(p.position!.col - hq.col)
        )
      );
      // 司令部に近いほどボーナス（最大 +300）
      const hqProximityBonus = (10 - minDistanceToTargetHQ) * 30;
      score += sign * hqProximityBonus;
    }

    // 3. 前線進出・突入口制圧ボーナス
    if (isMine) {
      if (myPlayer === 'gote' && p.position.row >= 4) {
        score += 40; // 敵陣侵入
      } else if (myPlayer === 'sente' && p.position.row <= 3) {
        score += 40;
      }
    }
  }

  return score;
}
