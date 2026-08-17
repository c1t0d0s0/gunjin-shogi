/**
 * 23枚型 軍人将棋 型定義
 */

export type PieceType =
  | 'taisho'   // 大将 (1)
  | 'chujo'    // 中将 (1)
  | 'shojo'    // 少将 (1)
  | 'taisa'    // 大佐 (1)
  | 'chusa'    // 中佐 (1)
  | 'shosa'    // 少佐 (1)
  | 'tai_i'    // 大尉 (2)
  | 'chu_i'    // 中尉 (2)
  | 'sho_i'    // 少尉 (2)
  | 'hikoki'   // 飛行機 (2)
  | 'tank'     // タンク (2)
  | 'kihei'    // 騎兵 (1)
  | 'kohei'    // 工兵 (2)
  | 'spy'      // スパイ (1)
  | 'jirai'    // 地雷 (2)
  | 'gunki';   // 軍旗 (1)

export type Player = 'sente' | 'gote'; // sente = 先手(プレイヤー・下側), gote = 後手(敵/AI・上側)

export interface Position {
  row: number; // 0..7 (0が後手最奥, 7が先手最奥)
  col: number; // 0..5 (左から0..5)
}

export interface PieceInfo {
  type: PieceType;
  name: string;
  shortName: string;
  kanji: string;
  count: number; // 23枚型での枚数
  rankTier: 'general' | 'officer' | 'junior' | 'special';
  canCaptureHQ: boolean;
  canMove: boolean;
  description: string;
}

export interface Piece {
  id: string;
  type: PieceType;
  owner: Player;
  position?: Position;
  isAlive: boolean;
  revealedToOpponent?: boolean; // 終局時または特定条件で相手に開示
}

export interface CombatResult {
  winner: 'attacker' | 'defender' | 'draw';
  attackerDestroyed: boolean;
  defenderDestroyed: boolean;
  message: string;
  reason: string;
  attackerType: PieceType;
  defenderType: PieceType;
  flagProxyType?: PieceType; // 軍旗が身代わりにした背後の駒種
}

export interface MoveRecord {
  moveNumber: number;
  player: Player;
  pieceId: string;
  pieceType: PieceType;
  from: Position;
  to: Position;
  combat?: CombatResult;
  isHQOccupied?: boolean;
  timestamp: number;
}

export type GamePhase = 'setup' | 'playing' | 'ended';

export type GameMode = 'vs_ai' | 'pass_and_play';

export type AIDifficulty = 'easy' | 'normal' | 'hard';

export interface GameSettings {
  mode: GameMode;
  aiDifficulty: AIDifficulty;
  taishoLossRule: boolean; // 大将が討ち取られたら敗北とするローカルルール
  soundEnabled: boolean;
  bgmEnabled: boolean;
}

export interface GameStats {
  winner?: Player | 'draw';
  winReason?: string;
  totalTurns: number;
  sentePiecesLeft: number;
  gotePiecesLeft: number;
  elapsedSeconds: number;
}
