import { PieceInfo, PieceType, Player, Piece, Position } from './types';

export const PIECE_DEFINITIONS: Record<PieceType, PieceInfo> = {
  taisho: {
    type: 'taisho',
    name: '大将',
    shortName: '大',
    kanji: '大将',
    count: 1,
    rankTier: 'general',
    canCaptureHQ: true,
    canMove: true,
    description: '全軍最高司令官。中将以下全ての軍人・飛行機・タンク等に勝利するが、スパイと地雷に敗北する。総司令部を占領可能。',
  },
  chujo: {
    type: 'chujo',
    name: '中将',
    shortName: '中',
    kanji: '中将',
    count: 1,
    rankTier: 'general',
    canCaptureHQ: true,
    canMove: true,
    description: '大将に次ぐ強さ。少将以下・スパイ・飛行機・タンク等に勝利。大将と地雷に敗北。総司令部を占領可能。',
  },
  shojo: {
    type: 'shojo',
    name: '少将',
    shortName: '少',
    kanji: '少将',
    count: 1,
    rankTier: 'general',
    canCaptureHQ: true,
    canMove: true,
    description: '大佐以下・スパイ・飛行機・タンク等に勝利。大将・中将・地雷に敗北。総司令部を占領可能。',
  },
  taisa: {
    type: 'taisa',
    name: '大佐',
    shortName: '佐',
    kanji: '大佐',
    count: 1,
    rankTier: 'officer',
    canCaptureHQ: true,
    canMove: true,
    description: '中佐以下・騎兵・工兵・スパイに勝利。将官・飛行機・タンク・地雷に敗北。総司令部を占領可能。',
  },
  chusa: {
    type: 'chusa',
    name: '中佐',
    shortName: '中佐',
    kanji: '中佐',
    count: 1,
    rankTier: 'officer',
    canCaptureHQ: true,
    canMove: true,
    description: '少佐以下・騎兵・工兵・スパイに勝利。大佐以上・飛行機・タンク・地雷に敗北。総司令部を占領可能。',
  },
  shosa: {
    type: 'shosa',
    name: '少佐',
    shortName: '少佐',
    kanji: '少佐',
    count: 1,
    rankTier: 'officer',
    canCaptureHQ: true,
    canMove: true,
    description: '尉官・騎兵・工兵・スパイに勝利。中佐以上・飛行機・タンク・地雷に敗北。総司令部を占領可能。',
  },
  tai_i: {
    type: 'tai_i',
    name: '大尉',
    shortName: '尉',
    kanji: '大尉',
    count: 2,
    rankTier: 'junior',
    canCaptureHQ: false,
    canMove: true,
    description: '中尉・少尉・騎兵・工兵・スパイに勝利。佐官以上に敗北。',
  },
  chu_i: {
    type: 'chu_i',
    name: '中尉',
    shortName: '中尉',
    kanji: '中尉',
    count: 2,
    rankTier: 'junior',
    canCaptureHQ: false,
    canMove: true,
    description: '少尉・騎兵・工兵・スパイに勝利。大尉以上に敗北。',
  },
  sho_i: {
    type: 'sho_i',
    name: '少尉',
    shortName: '少尉',
    kanji: '少尉',
    count: 2,
    rankTier: 'junior',
    canCaptureHQ: false,
    canMove: true,
    description: '騎兵・工兵・スパイに勝利。中尉以上に敗北。',
  },
  hikoki: {
    type: 'hikoki',
    name: '飛行機',
    shortName: '飛',
    kanji: '飛行機',
    count: 2,
    rankTier: 'special',
    canCaptureHQ: false,
    canMove: true,
    description: '前後に何マスでも移動（駒の跳躍可）、左右に1マス。突入口を無視して川を越えられる。佐官以下・タンク・地雷に勝利。将官にのみ撃墜される。',
  },
  tank: {
    type: 'tank',
    name: 'タンク',
    shortName: '戦',
    kanji: 'タンク',
    count: 2,
    rankTier: 'special',
    canCaptureHQ: false,
    canMove: true,
    description: '前に2マス、後・横に1マス進める。佐官・尉官・騎兵・スパイに勝利。将官・飛行機・工兵・地雷に敗北。',
  },
  kihei: {
    type: 'kihei',
    name: '騎兵',
    shortName: '騎',
    kanji: '騎兵',
    count: 1,
    rankTier: 'special',
    canCaptureHQ: false,
    canMove: true,
    description: '前に2マス、後・横に1マス進める。工兵・スパイに勝利。その他の駒に敗北。',
  },
  kohei: {
    type: 'kohei',
    name: '工兵',
    shortName: '工',
    kanji: '工兵',
    count: 2,
    rankTier: 'special',
    canCaptureHQ: false,
    canMove: true,
    description: '飛車と同じく前後左右に何マスでも進める（跳躍不可）。地雷を安全に解体・撤去できる唯一の駒。タンク・スパイにも勝利。',
  },
  spy: {
    type: 'spy',
    name: 'スパイ',
    shortName: '忍',
    kanji: 'スパイ',
    count: 1,
    rankTier: 'special',
    canCaptureHQ: false,
    canMove: true,
    description: '最強の大将を唯一暗殺できる特殊兵。大将以外のすべての駒に敗北する。',
  },
  jirai: {
    type: 'jirai',
    name: '地雷',
    shortName: '雷',
    kanji: '地雷',
    count: 2,
    rankTier: 'special',
    canCaptureHQ: false,
    canMove: false,
    description: '移動不可。接触した敵駒を爆破して相打ちとなる。ただし工兵と飛行機には一方的に撤去される。突入口には配置禁止。',
  },
  gunki: {
    type: 'gunki',
    name: '軍旗',
    shortName: '旗',
    kanji: '軍旗',
    count: 1,
    rankTier: 'special',
    canCaptureHQ: false,
    canMove: false,
    description: '移動不可。直後（自陣側）にある味方駒と同じ戦闘力を持つ。背後に味方駒がなければ全敗。突入口には配置禁止。',
  },
};

/**
 * 23枚の初期駒セットを生成
 */
export function createPlayerPieceSet(owner: Player): Piece[] {
  const pieces: Piece[] = [];
  let index = 0;

  for (const [type, info] of Object.entries(PIECE_DEFINITIONS) as [PieceType, PieceInfo][]) {
    for (let i = 0; i < info.count; i++) {
      pieces.push({
        id: `${owner}_${type}_${i}`,
        type,
        owner,
        isAlive: true,
        revealedToOpponent: false,
      });
      index++;
    }
  }

  return pieces;
}

export function isSamePosition(a?: Position, b?: Position): boolean {
  if (!a || !b) return false;
  return a.row === b.row && a.col === b.col;
}
