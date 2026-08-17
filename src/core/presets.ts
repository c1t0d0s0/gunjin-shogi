import { PieceType, Player, Position } from './types';
import { ENTRY_COLS } from './board';

export interface FormationPreset {
  id: string;
  name: string;
  description: string;
  // 4行 x 6列の配置 (null は空マス)
  // row 0 が前線 (Sente なら Row 4, Gote なら Row 3), row 3 が最奥 (Sente なら Row 7, Gote なら Row 0)
  layout: (PieceType | null)[][];
}

// 1. バランス型（標準配置）
const BALANCED_LAYOUT: (PieceType | null)[][] = [
  // 前線 (Row 4 for Sente)
  ['kohei', 'tai_i', 'sho_i', 'chu_i', 'tai_i', 'kohei'],
  // 第2列 (Row 5 for Sente)
  ['chusa', 'jirai', 'hikoki', 'hikoki', 'jirai', 'shosa'],
  // 第3列 (Row 6 for Sente)
  ['kihei', 'chujo', 'gunki', 'spy', 'tank', 'tank'],
  // 最奥列 (Row 7 for Sente: col 2,3 は総司令部)
  ['sho_i', 'chu_i', 'taisho', 'taisa', 'shojo', null],
];

// 2. 司令部要塞型（防衛特化）
const FORTRESS_LAYOUT: (PieceType | null)[][] = [
  ['chu_i', 'tai_i', 'tank', 'tank', 'tai_i', 'chu_i'],
  ['kohei', 'sho_i', 'hikoki', 'hikoki', 'sho_i', 'kohei'],
  ['kihei', 'jirai', 'gunki', 'jirai', 'spy', 'chusa'],
  ['shosa', 'chujo', 'taisho', 'shojo', 'taisa', null],
];

// 3. 電撃電波型（速攻・航空強襲）
const BLITZ_LAYOUT: (PieceType | null)[][] = [
  ['kohei', 'tank', 'hikoki', 'hikoki', 'tank', 'kohei'],
  ['tai_i', 'chujo', 'sho_i', 'chu_i', 'shojo', 'tai_i'],
  ['chusa', 'jirai', 'gunki', 'jirai', 'kihei', 'shosa'],
  ['sho_i', 'chu_i', 'taisho', 'taisa', 'spy', null],
];

// 4. 地雷伏兵型（トラップ・誘引）
const TRAP_LAYOUT: (PieceType | null)[][] = [
  ['sho_i', 'chu_i', 'tai_i', 'tai_i', 'chu_i', 'sho_i'],
  ['kihei', 'jirai', 'gunki', 'spy', 'jirai', 'kohei'],
  ['tank', 'chujo', 'hikoki', 'hikoki', 'shojo', 'tank'],
  ['kohei', 'chusa', 'taisho', 'taisa', 'shosa', null],
];

export const FORMATION_PRESETS: FormationPreset[] = [
  {
    id: 'balanced',
    name: 'バランス型（標準・堅守速攻）',
    description: '突入口に地雷を潜ませ、中央から飛行機と将官で反撃する定石陣形。',
    layout: BALANCED_LAYOUT,
  },
  {
    id: 'fortress',
    name: '要塞防衛型（司令部鉄壁）',
    description: '総司令部周辺を大将・地雷・軍旗で重厚に固めた守備重視の陣形。',
    layout: FORTRESS_LAYOUT,
  },
  {
    id: 'blitz',
    name: '電撃速攻型（航空・機甲突撃）',
    description: '前線に飛行機とタンクを配し、序盤から一気に敵陣深くに切り込む速攻陣形。',
    layout: BLITZ_LAYOUT,
  },
  {
    id: 'trap',
    name: '地雷伏兵型（誘引トラップ）',
    description: '突入口に地雷を配置して敵主力を誘い込み、スパイと工兵で仕留める奇襲陣形。',
    layout: TRAP_LAYOUT,
  },
];

/**
 * 陣形レイアウトから各駒の盤面座標（Position）マップを生成
 */
export function layoutToPositions(
  layout: (PieceType | null)[][],
  player: Player
): Map<PieceType, Position[]> {
  const result = new Map<PieceType, Position[]>();

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      const type = layout[r][c];
      if (!type) continue;

      let boardRow: number;
      let boardCol: number;

      if (player === 'sente') {
        // 先手: 前線が Row 4, 最奥が Row 7
        boardRow = 4 + r;
        boardCol = c;
      } else {
        // 後手: 前線が Row 3, 最奥が Row 0 (180度反転)
        boardRow = 3 - r;
        boardCol = 5 - c;
      }

      if (!result.has(type)) {
        result.set(type, []);
      }
      result.get(type)!.push({ row: boardRow, col: boardCol });
    }
  }

  return result;
}

/**
 * ランダムな合法配置を生成（突入口への地雷・軍旗禁止ルールを順守）
 */
export function generateRandomLayout(): (PieceType | null)[][] {
  const allPieceTypes: PieceType[] = [
    'taisho', 'chujo', 'shojo',
    'taisa', 'chusa', 'shosa',
    'tai_i', 'tai_i', 'chu_i', 'chu_i', 'sho_i', 'sho_i',
    'hikoki', 'hikoki', 'tank', 'tank', 'kihei', 'kohei', 'kohei',
    'spy', 'jirai', 'jirai', 'gunki',
  ];

  // シャッフル
  for (let i = allPieceTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allPieceTypes[i], allPieceTypes[j]] = [allPieceTypes[j], allPieceTypes[i]];
  }

  const layout: (PieceType | null)[][] = Array.from({ length: 4 }, () =>
    Array.from({ length: 6 }, () => null)
  );

  // 24マスの中から1マス空きマスを選択 (突入口以外が望ましい)
  const emptyIndex = Math.floor(Math.random() * 24);
  const squares: { r: number; c: number }[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      if (r * 6 + c !== emptyIndex) {
        squares.push({ r, c });
      }
    }
  }

  let pieceIdx = 0;
  for (const { r, c } of squares) {
    layout[r][c] = allPieceTypes[pieceIdx++];
  }

  // 突入口 (r=0, c=1 または c=4) に地雷または軍旗があれば、他の安全なマスと交換
  const forbiddenRow = 0;
  for (const forbiddenCol of ENTRY_COLS) {
    const type = layout[forbiddenRow][forbiddenCol];
    if (type === 'jirai' || type === 'gunki') {
      // 交換先を探す
      for (let r = 1; r < 4; r++) {
        for (let c = 0; c < 6; c++) {
          const swapType = layout[r][c];
          if (swapType && swapType !== 'jirai' && swapType !== 'gunki') {
            layout[forbiddenRow][forbiddenCol] = swapType;
            layout[r][c] = type;
            break;
          }
        }
      }
    }
  }

  return layout;
}
