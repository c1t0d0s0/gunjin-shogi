import { describe, it, expect } from 'vitest';
import { resolveBaseCombat, resolveCombat } from '../src/core/combat';
import { Piece } from '../src/core/types';

describe('Gunjin Shogi Combat Matrix Tests', () => {
  it('大将 beats 中将 and other officers', () => {
    const res1 = resolveBaseCombat('taisho', 'chujo');
    expect(res1.winner).toBe('attacker');

    const res2 = resolveBaseCombat('taisho', 'shojo');
    expect(res2.winner).toBe('attacker');

    const res3 = resolveBaseCombat('taisho', 'sho_i');
    expect(res3.winner).toBe('attacker');
  });

  it('スパイ beats 大将 (assassination)', () => {
    const res1 = resolveBaseCombat('spy', 'taisho');
    expect(res1.winner).toBe('attacker');

    const res2 = resolveBaseCombat('taisho', 'spy');
    expect(res2.winner).toBe('defender'); // Defender spy assassinates attacking taisho
  });

  it('スパイ loses to other pieces', () => {
    const res1 = resolveBaseCombat('spy', 'chujo');
    expect(res1.winner).toBe('defender');

    const res2 = resolveBaseCombat('spy', 'sho_i');
    expect(res2.winner).toBe('defender');

    const res3 = resolveBaseCombat('sho_i', 'spy');
    expect(res3.winner).toBe('attacker');
  });

  it('地雷: 工兵 and 飛行機 win, others draw (explode)', () => {
    // 工兵 disarms mine
    const res1 = resolveBaseCombat('kohei', 'jirai');
    expect(res1.winner).toBe('attacker');

    // 飛行機 bombs mine
    const res2 = resolveBaseCombat('hikoki', 'jirai');
    expect(res2.winner).toBe('attacker');

    // 大将 draws with mine (mutual destruction)
    const res3 = resolveBaseCombat('taisho', 'jirai');
    expect(res3.winner).toBe('draw');

    // タンク draws with mine
    const res4 = resolveBaseCombat('tank', 'jirai');
    expect(res4.winner).toBe('draw');
  });

  it('飛行機: beats non-generals and mine, loses to 将官 (taisho, chujo, shojo)', () => {
    // Beats taisa, tank, kohei, etc.
    expect(resolveBaseCombat('hikoki', 'taisa').winner).toBe('attacker');
    expect(resolveBaseCombat('hikoki', 'tank').winner).toBe('attacker');
    expect(resolveBaseCombat('hikoki', 'kohei').winner).toBe('attacker');

    // Loses to 将官
    expect(resolveBaseCombat('hikoki', 'taisho').winner).toBe('defender');
    expect(resolveBaseCombat('hikoki', 'chujo').winner).toBe('defender');
    expect(resolveBaseCombat('hikoki', 'shojo').winner).toBe('defender');
  });

  it('タンク: beats officers up to taisa, loses to 将官, 飛行機, and 工兵', () => {
    // Beats taisa, chusa, sho_i, kihei
    expect(resolveBaseCombat('tank', 'taisa').winner).toBe('attacker');
    expect(resolveBaseCombat('tank', 'sho_i').winner).toBe('attacker');
    expect(resolveBaseCombat('tank', 'kihei').winner).toBe('attacker');

    // Loses to 将官, 飛行機, 工兵
    expect(resolveBaseCombat('tank', 'taisho').winner).toBe('defender');
    expect(resolveBaseCombat('tank', 'hikoki').winner).toBe('defender');
    expect(resolveBaseCombat('tank', 'kohei').winner).toBe('defender');
    expect(resolveBaseCombat('kohei', 'tank').winner).toBe('attacker');
  });

  it('Same pieces result in相打ち (Draw)', () => {
    expect(resolveBaseCombat('taisho', 'taisho').winner).toBe('draw');
    expect(resolveBaseCombat('hikoki', 'hikoki').winner).toBe('draw');
    expect(resolveBaseCombat('spy', 'spy').winner).toBe('draw');
    expect(resolveBaseCombat('tank', 'tank').winner).toBe('draw');
  });

  it('軍旗 proxy strength logic', () => {
    // Sente flag at (5,2) with shojo behind at (6,2)
    const attacker: Piece = {
      id: 'gote_tank_0',
      type: 'tank',
      owner: 'gote',
      isAlive: true,
      position: { row: 4, col: 2 },
    };

    const flag: Piece = {
      id: 'sente_gunki_0',
      type: 'gunki',
      owner: 'sente',
      isAlive: true,
      position: { row: 5, col: 2 },
    };

    const shojoBehind: Piece = {
      id: 'sente_shojo_0',
      type: 'shojo',
      owner: 'sente',
      isAlive: true,
      position: { row: 6, col: 2 },
    };

    // Tank attacks Flag backed by Shojo -> Shojo beats Tank -> Defender (Flag) wins!
    const result1 = resolveCombat(attacker, flag, [attacker, flag, shojoBehind]);
    expect(result1.winner).toBe('defender');
    expect(result1.attackerDestroyed).toBe(true);
    expect(result1.defenderDestroyed).toBe(false);
    expect(result1.flagProxyType).toBe('shojo');

    // Attacker is Taisho -> Taisho beats Shojo -> Attacker (Taisho) wins and captures Flag!
    const taishoAttacker: Piece = {
      id: 'gote_taisho_0',
      type: 'taisho',
      owner: 'gote',
      isAlive: true,
      position: { row: 4, col: 2 },
    };
    const result2 = resolveCombat(taishoAttacker, flag, [taishoAttacker, flag, shojoBehind]);
    expect(result2.winner).toBe('attacker');
    expect(result2.attackerDestroyed).toBe(false);
    expect(result2.defenderDestroyed).toBe(true);

    // Flag with NO piece behind -> Loses to any attack
    const result3 = resolveCombat(attacker, flag, [attacker, flag]);
    expect(result3.winner).toBe('attacker');
  });
});
