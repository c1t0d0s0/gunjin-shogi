import { Piece, PieceType, Player, Position } from './types';
import { isSamePosition } from './pieces';

export { isSamePosition };

export const BOARD_COLS = 6;
export const BOARD_ROWS = 8;

// 突入口の列定義 (Col 1, Col 4)
export const ENTRY_COLS = [1, 4];

// 総司令部のマス定義
export const SENTE_HQ_POSITIONS: Position[] = [
  { row: 7, col: 2 },
  { row: 7, col: 3 },
];

export const GOTE_HQ_POSITIONS: Position[] = [
  { row: 0, col: 2 },
  { row: 0, col: 3 },
];

/**
 * 座標が盤面内にあるか判定
 */
export function isInsideBoard(pos: Position): boolean {
  return pos.row >= 0 && pos.row < BOARD_ROWS && pos.col >= 0 && pos.col < BOARD_COLS;
}

/**
 * 座標が先手陣地内か判定 (Row 4..7)
 */
export function isSenteTerritory(pos: Position): boolean {
  return pos.row >= 4 && pos.row <= 7 && pos.col >= 0 && pos.col < BOARD_COLS;
}

/**
 * 座標が後手陣地内か判定 (Row 0..3)
 */
export function isGoteTerritory(pos: Position): boolean {
  return pos.row >= 0 && pos.row <= 3 && pos.col >= 0 && pos.col < BOARD_COLS;
}

/**
 * 突入口（前線境界）マスか判定
 */
export function isEntryPoint(pos: Position): boolean {
  return (pos.row === 3 || pos.row === 4) && ENTRY_COLS.includes(pos.col);
}

/**
 * 総司令部マスか判定
 */
export function isHQPosition(pos: Position, player?: Player): boolean {
  if (player === 'sente') {
    return SENTE_HQ_POSITIONS.some((p) => isSamePosition(p, pos));
  }
  if (player === 'gote') {
    return GOTE_HQ_POSITIONS.some((p) => isSamePosition(p, pos));
  }
  return (
    SENTE_HQ_POSITIONS.some((p) => isSamePosition(p, pos)) ||
    GOTE_HQ_POSITIONS.some((p) => isSamePosition(p, pos))
  );
}

/**
 * 2マス間の縦移動において、川（Row 3 ↔ Row 4）を通過可能か判定
 * 飛行機以外は列が1または4の場合のみ通過可能
 */
export function canCrossRiver(from: Position, to: Position, pieceType: PieceType): boolean {
  if (pieceType === 'hikoki') {
    return true; // 飛行機はどこからでも川を越えられる
  }

  // Row 3とRow 4の境界を跨ぐかチェック
  const minRow = Math.min(from.row, to.row);
  const maxRow = Math.max(from.row, to.row);

  if (minRow <= 3 && maxRow >= 4) {
    return ENTRY_COLS.includes(from.col) && ENTRY_COLS.includes(to.col);
  }

  return true;
}

/**
 * 盤面配列 (8行 x 6列) を作成・取得
 */
export function getBoardGrid(pieces: Piece[]): (Piece | null)[][] {
  const grid: (Piece | null)[][] = Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => null)
  );

  for (const piece of pieces) {
    if (piece.isAlive && piece.position) {
      grid[piece.position.row][piece.position.col] = piece;
    }
  }

  return grid;
}

/**
 * 特定の駒の合法手（移動可能マス）をすべて計算
 */
export function getValidMovesForPiece(
  piece: Piece,
  pieces: Piece[]
): Position[] {
  if (!piece.isAlive || !piece.position) return [];
  if (piece.type === 'jirai' || piece.type === 'gunki') return []; // 地雷と軍旗は動けない

  const grid = getBoardGrid(pieces);
  const validMoves: Position[] = [];
  const { row, col } = piece.position;
  const forwardDir = piece.owner === 'sente' ? -1 : 1; // 先手は上(-1)、後手は下(+1)

  const checkAndAdd = (targetRow: number, targetCol: number): boolean => {
    const targetPos = { row: targetRow, col: targetCol };
    if (!isInsideBoard(targetPos)) return false;

    // 川越えチェック
    if (!canCrossRiver(piece.position!, targetPos, piece.type)) {
      return false;
    }

    const targetPiece = grid[targetRow][targetCol];
    if (targetPiece) {
      if (targetPiece.owner !== piece.owner) {
        validMoves.push(targetPos); // 敵駒は攻撃可能
      }
      return false; // 味方でも敵でもそれ以上奥には進めない（飛行機以外）
    }

    validMoves.push(targetPos);
    return true; // 空マスなら直進可能
  };

  switch (piece.type) {
    case 'taisho':
    case 'chujo':
    case 'shojo':
    case 'taisa':
    case 'chusa':
    case 'shosa':
    case 'tai_i':
    case 'chu_i':
    case 'sho_i':
    case 'spy': {
      // 前後左右1マス
      const dirs = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      for (const [dr, dc] of dirs) {
        checkAndAdd(row + dr, col + dc);
      }
      break;
    }

    case 'tank':
    case 'kihei': {
      // 後ろ1マス、横1マス
      const standardDirs = [
        [-forwardDir, 0], // 後ろ
        [0, -1],          // 左
        [0, 1],           // 右
      ];
      for (const [dr, dc] of standardDirs) {
        checkAndAdd(row + dr, col + dc);
      }

      // 前方1マス
      const forward1Pos = { row: row + forwardDir, col };
      checkAndAdd(forward1Pos.row, forward1Pos.col);

      // 前方2マス (前方1マスが空マスで、かつ川越えルールを満たす場合のみ)
      if (canInsideGrid(forward1Pos) && grid[forward1Pos.row][forward1Pos.col] === null) {
        const forward2Pos = { row: row + forwardDir * 2, col };
        if (isInsideBoard(forward2Pos) && canCrossRiver(piece.position, forward2Pos, piece.type)) {
          const target2 = grid[forward2Pos.row][forward2Pos.col];
          if (!target2 || target2.owner !== piece.owner) {
            validMoves.push(forward2Pos);
          }
        }
      }
      break;
    }

    case 'kohei': {
      // 飛車のように前後左右何マスでも（跳躍不可）
      const dirs = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      for (const [dr, dc] of dirs) {
        let step = 1;
        while (true) {
          const tr = row + dr * step;
          const tc = col + dc * step;
          const targetPos = { row: tr, col: tc };
          if (!isInsideBoard(targetPos)) break;

          // 川越えチェック（1マスずつ遷移）
          const prevPos = { row: row + dr * (step - 1), col: col + dc * (step - 1) };
          if (!canCrossRiver(prevPos, targetPos, piece.type)) {
            break;
          }

          const targetPiece = grid[tr][tc];
          if (targetPiece) {
            if (targetPiece.owner !== piece.owner) {
              validMoves.push(targetPos);
            }
            break; // 駒にぶつかったらこれ以上進めない
          }

          validMoves.push(targetPos);
          step++;
        }
      }
      break;
    }

    case 'hikoki': {
      // 左右1マス (跳躍不可)
      checkAndAdd(row, col - 1);
      checkAndAdd(row, col + 1);

      // 縦方向に何マスでも（他の駒を飛び越えて進める！）
      for (let tr = 0; tr < BOARD_ROWS; tr++) {
        if (tr === row) continue;
        const targetPos = { row: tr, col };
        const targetPiece = grid[tr][col];
        if (!targetPiece || targetPiece.owner !== piece.owner) {
          validMoves.push(targetPos);
        }
      }
      break;
    }
  }

  return validMoves;
}

function canInsideGrid(pos: Position): boolean {
  return pos.row >= 0 && pos.row < BOARD_ROWS && pos.col >= 0 && pos.col < BOARD_COLS;
}

/**
 * プレイヤーの全合法手を取得
 */
export function getAllValidMovesForPlayer(
  player: Player,
  pieces: Piece[]
): { piece: Piece; moves: Position[] }[] {
  const playerPieces = pieces.filter((p) => p.isAlive && p.owner === player);
  const result: { piece: Piece; moves: Position[] }[] = [];

  for (const piece of playerPieces) {
    const moves = getValidMovesForPiece(piece, pieces);
    if (moves.length > 0) {
      result.push({ piece, moves });
    }
  }

  return result;
}

/**
 * プレイヤーが動かせる駒が残っているか判定
 */
export function hasMovablePieces(player: Player, pieces: Piece[]): boolean {
  const allMoves = getAllValidMovesForPlayer(player, pieces);
  return allMoves.some((m) => m.moves.length > 0);
}
