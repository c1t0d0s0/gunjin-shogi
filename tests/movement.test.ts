import { describe, it, expect } from 'vitest';
import { getValidMovesForPiece } from '../src/core/board';
import { GameManager } from '../src/core/state';
import { Piece } from '../src/core/types';

describe('Gunjin Shogi Movement and Rules Tests', () => {
  it('Non-flying pieces can only cross river at entry points (col 1, col 4)', () => {
    // Sente Taisho at (4, 0) - NOT an entry point (cols 1, 4 only)
    const taishoAtCol0: Piece = {
      id: 'sente_taisho_0',
      type: 'taisho',
      owner: 'sente',
      isAlive: true,
      position: { row: 4, col: 0 },
    };

    const moves0 = getValidMovesForPiece(taishoAtCol0, [taishoAtCol0]);
    // Cannot move to (3, 0) across river, but can move to (5,0) and (4,1)
    expect(moves0.some((m) => m.row === 3 && m.col === 0)).toBe(false);
    expect(moves0.some((m) => m.row === 4 && m.col === 1)).toBe(true);
    expect(moves0.some((m) => m.row === 5 && m.col === 0)).toBe(true);

    // Sente Taisho at (4, 1) - IS an entry point
    const taishoAtCol1: Piece = {
      id: 'sente_taisho_0',
      type: 'taisho',
      owner: 'sente',
      isAlive: true,
      position: { row: 4, col: 1 },
    };
    const moves1 = getValidMovesForPiece(taishoAtCol1, [taishoAtCol1]);
    expect(moves1.some((m) => m.row === 3 && m.col === 1)).toBe(true);
  });

  it('飛行機 (Airplane) can cross river at any column and jump over pieces', () => {
    const airplane: Piece = {
      id: 'sente_hikoki_0',
      type: 'hikoki',
      owner: 'sente',
      isAlive: true,
      position: { row: 4, col: 2 }, // col 2 is not a bridge
    };

    const obstacle: Piece = {
      id: 'sente_sho_i_0',
      type: 'sho_i',
      owner: 'sente',
      isAlive: true,
      position: { row: 3, col: 2 },
    };

    const moves = getValidMovesForPiece(airplane, [airplane, obstacle]);
    // Can jump over obstacle at (3,2) and reach (0,2), (1,2), (2,2)
    expect(moves.some((m) => m.row === 0 && m.col === 2)).toBe(true);
    expect(moves.some((m) => m.row === 1 && m.col === 2)).toBe(true);
    expect(moves.some((m) => m.row === 2 && m.col === 2)).toBe(true);
    // Cannot land on friendly piece at (3,2)
    expect(moves.some((m) => m.row === 3 && m.col === 2)).toBe(false);
  });

  it('工兵 (Engineer) moves straight in 4 directions without jumping', () => {
    const engineer: Piece = {
      id: 'sente_kohei_0',
      type: 'kohei',
      owner: 'sente',
      isAlive: true,
      position: { row: 6, col: 1 },
    };

    const enemy: Piece = {
      id: 'gote_sho_i_0',
      type: 'sho_i',
      owner: 'gote',
      isAlive: true,
      position: { row: 3, col: 1 },
    };

    const moves = getValidMovesForPiece(engineer, [engineer, enemy]);
    // Since col 1 is an entry point, can move forward across river up to enemy at (3,1)
    expect(moves.some((m) => m.row === 5 && m.col === 1)).toBe(true);
    expect(moves.some((m) => m.row === 4 && m.col === 1)).toBe(true);
    expect(moves.some((m) => m.row === 3 && m.col === 1)).toBe(true);
    // Cannot move beyond enemy to (2,1)
    expect(moves.some((m) => m.row === 2 && m.col === 1)).toBe(false);
  });

  it('HQ Capture: Only 将官/佐官 triggers victory upon entering enemy HQ', () => {
    const gm = new GameManager();
    gm.applyPreset('sente', 'balanced');
    gm.applyPreset('gote', 'balanced');
    gm.startPlaying();

    // Sente Taisa enters enemy HQ at (0, 2)
    const senteTaisa = gm.getState().pieces.find((p) => p.owner === 'sente' && p.type === 'taisa')!;
    senteTaisa.position = { row: 1, col: 2 };

    // Clear defender at (0,2) if any
    const def = gm.getState().pieces.find((p) => p.isAlive && p.position?.row === 0 && p.position?.col === 2);
    if (def) def.position = { row: 0, col: 0 };

    const moveResult = gm.makeMove(senteTaisa.id, { row: 0, col: 2 });
    expect(moveResult.success).toBe(true);
    expect(moveResult.gameOver).toBe(true);
    expect(moveResult.winner).toBe('sente');
    expect(gm.getState().winReason).toContain('敵総司令部を完全制圧');
  });
});
