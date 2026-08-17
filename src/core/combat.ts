import { CombatResult, Piece, PieceType, Position } from './types';
import { PIECE_DEFINITIONS } from './pieces';
import { getBoardGrid } from './board';

// 軍人の階級順位 (数字が小さいほど階級が上)
const RANK_ORDER: Record<string, number> = {
  taisho: 1,
  chujo: 2,
  shojo: 3,
  taisa: 4,
  chusa: 5,
  shosa: 6,
  tai_i: 7,
  chu_i: 8,
  sho_i: 9,
};

/**
 * 2つの駒種同士の基本直接対決判定 (軍旗のプロキシ解決後)
 */
export function resolveBaseCombat(
  attackerType: PieceType,
  defenderType: PieceType
): { winner: 'attacker' | 'defender' | 'draw'; reason: string } {
  // 1. 同種同士の対決 -> 相打ち
  if (attackerType === defenderType) {
    const name = PIECE_DEFINITIONS[attackerType].name;
    return {
      winner: 'draw',
      reason: `同種相打ち（${name}同士）`,
    };
  }

  // 2. 地雷との対決 (地雷は防衛側のみ)
  if (defenderType === 'jirai') {
    if (attackerType === 'kohei') {
      return {
        winner: 'attacker',
        reason: '工兵が地雷を爆破解体・撤去',
      };
    }
    if (attackerType === 'hikoki') {
      return {
        winner: 'attacker',
        reason: '飛行機が地雷を空爆・撃破',
      };
    }
    // それ以外の全駒は地雷と相打ち（自爆）
    return {
      winner: 'draw',
      reason: '地雷爆発による相打ち（両軍消滅）',
    };
  }

  // 3. スパイの判定
  if (attackerType === 'spy') {
    if (defenderType === 'taisho') {
      return {
        winner: 'attacker',
        reason: 'スパイが大将を暗殺！',
      };
    }
    return {
      winner: 'defender',
      reason: `スパイが${PIECE_DEFINITIONS[defenderType].name}に敗北`,
    };
  }
  if (defenderType === 'spy') {
    if (attackerType === 'taisho') {
      return {
        winner: 'defender',
        reason: 'スパイが大将の急襲を阻止・暗殺！',
      };
    }
    return {
      winner: 'attacker',
      reason: `${PIECE_DEFINITIONS[attackerType].name}がスパイを捕縛・撃破`,
    };
  }

  // 4. 飛行機の判定
  if (attackerType === 'hikoki') {
    if (['taisho', 'chujo', 'shojo'].includes(defenderType)) {
      return {
        winner: 'defender',
        reason: `${PIECE_DEFINITIONS[defenderType].name}（将官）に対空迎撃・撃墜される`,
      };
    }
    return {
      winner: 'attacker',
      reason: `飛行機が${PIECE_DEFINITIONS[defenderType].name}を空襲・撃破`,
    };
  }
  if (defenderType === 'hikoki') {
    if (['taisho', 'chujo', 'shojo'].includes(attackerType)) {
      return {
        winner: 'attacker',
        reason: `${PIECE_DEFINITIONS[attackerType].name}（将官）が飛行機を撃墜`,
      };
    }
    return {
      winner: 'defender',
      reason: `飛行機が${PIECE_DEFINITIONS[attackerType].name}の攻撃を返り討ち`,
    };
  }

  // 5. タンクの判定
  if (attackerType === 'tank') {
    if (['taisho', 'chujo', 'shojo'].includes(defenderType)) {
      return {
        winner: 'defender',
        reason: `タンクが${PIECE_DEFINITIONS[defenderType].name}（将官）に敗北`,
      };
    }
    if (defenderType === 'kohei') {
      return {
        winner: 'defender',
        reason: '工兵がタンクの装甲を破壊・無力化',
      };
    }
    // 佐官・尉官・騎兵に勝利
    return {
      winner: 'attacker',
      reason: `タンクが${PIECE_DEFINITIONS[defenderType].name}を突破・撃破`,
    };
  }
  if (defenderType === 'tank') {
    if (['taisho', 'chujo', 'shojo'].includes(attackerType)) {
      return {
        winner: 'attacker',
        reason: `${PIECE_DEFINITIONS[attackerType].name}（将官）がタンクを撃破`,
      };
    }
    if (attackerType === 'kohei') {
      return {
        winner: 'attacker',
        reason: '工兵がタンクを解体・撃破',
      };
    }
    // 佐官・尉官・騎兵を返り討ち
    return {
      winner: 'defender',
      reason: `タンクが${PIECE_DEFINITIONS[attackerType].name}を返り討ち`,
    };
  }

  // 6. 工兵の判定
  if (attackerType === 'kohei') {
    // タンクには既に上で判定済
    return {
      winner: 'defender',
      reason: `工兵が${PIECE_DEFINITIONS[defenderType].name}に敗北`,
    };
  }
  if (defenderType === 'kohei') {
    if (attackerType === 'kihei') {
      return {
        winner: 'attacker',
        reason: '騎兵が工兵を急襲・撃破',
      };
    }
    if (attackerType in RANK_ORDER) {
      return {
        winner: 'attacker',
        reason: `${PIECE_DEFINITIONS[attackerType].name}が工兵を撃破`,
      };
    }
  }

  // 7. 騎兵の判定
  if (attackerType === 'kihei') {
    if (defenderType === 'kohei') {
      return {
        winner: 'attacker',
        reason: '騎兵が工兵を撃破',
      };
    }
    return {
      winner: 'defender',
      reason: `騎兵が${PIECE_DEFINITIONS[defenderType].name}に敗北`,
    };
  }
  if (defenderType === 'kihei') {
    if (attackerType in RANK_ORDER) {
      return {
        winner: 'attacker',
        reason: `${PIECE_DEFINITIONS[attackerType].name}が騎兵を撃破`,
      };
    }
  }

  // 8. 基本階級同士の判定 (大将〜少尉)
  if (attackerType in RANK_ORDER && defenderType in RANK_ORDER) {
    const atkRank = RANK_ORDER[attackerType];
    const defRank = RANK_ORDER[defenderType];

    if (atkRank < defRank) {
      return {
        winner: 'attacker',
        reason: `階級上位（${PIECE_DEFINITIONS[attackerType].name} ＞ ${PIECE_DEFINITIONS[defenderType].name}）`,
      };
    } else {
      return {
        winner: 'defender',
        reason: `階級下位（${PIECE_DEFINITIONS[attackerType].name} ＜ ${PIECE_DEFINITIONS[defenderType].name}）`,
      };
    }
  }

  // デフォルト（念のためのフォールバック）
  return {
    winner: 'defender',
    reason: `${PIECE_DEFINITIONS[attackerType].name}が${PIECE_DEFINITIONS[defenderType].name}に敗北`,
  };
}

/**
 * 審判（レフェリー）による戦闘判定
 * 軍旗の背後連動や生存フラグ・メッセージを総合算出
 */
export function resolveCombat(
  attacker: Piece,
  defender: Piece,
  allPieces: Piece[]
): CombatResult {
  let effectiveDefenderType = defender.type;
  let flagProxyType: PieceType | undefined;

  // 軍旗の背後判定
  if (defender.type === 'gunki' && defender.position) {
    const backRowDir = defender.owner === 'sente' ? 1 : -1; // 自陣の奥方向
    const backPos: Position = {
      row: defender.position.row + backRowDir,
      col: defender.position.col,
    };

    const grid = getBoardGrid(allPieces);
    let pieceBehind: Piece | null = null;

    if (
      backPos.row >= 0 &&
      backPos.row <= 7 &&
      backPos.col >= 0 &&
      backPos.col <= 5
    ) {
      const p = grid[backPos.row][backPos.col];
      if (p && p.owner === defender.owner && p.isAlive) {
        pieceBehind = p;
      }
    }

    if (pieceBehind && pieceBehind.type !== 'gunki') {
      effectiveDefenderType = pieceBehind.type;
      flagProxyType = pieceBehind.type;
    } else {
      // 背後に味方の駒がない軍旗は、あらゆる攻撃に負ける
      return {
        winner: 'attacker',
        attackerDestroyed: false,
        defenderDestroyed: true,
        message: '先攻勝利（軍旗奪取）',
        reason: '軍旗の背後に守備駒がなく、無力化された',
        attackerType: attacker.type,
        defenderType: defender.type,
      };
    }
  }

  // 戦闘解決
  const { winner, reason } = resolveBaseCombat(attacker.type, effectiveDefenderType);

  let attackerDestroyed = false;
  let defenderDestroyed = false;
  let message = '';

  if (winner === 'attacker') {
    defenderDestroyed = true;
    message = `攻撃側勝利（${attacker.owner === 'sente' ? '先手' : '後手'}）`;
  } else if (winner === 'defender') {
    attackerDestroyed = true;
    message = `防衛側勝利（${defender.owner === 'sente' ? '先手' : '後手'}）`;
  } else {
    attackerDestroyed = true;
    defenderDestroyed = true;
    message = '相打ち（両軍消滅）';
  }

  // 軍旗が絡む場合の理由追記
  let finalReason = reason;
  if (defender.type === 'gunki' && flagProxyType) {
    finalReason = `軍旗連動（背後の${PIECE_DEFINITIONS[flagProxyType].name}の武力）: ${reason}`;
  }

  return {
    winner,
    attackerDestroyed,
    defenderDestroyed,
    message,
    reason: finalReason,
    attackerType: attacker.type,
    defenderType: defender.type,
    flagProxyType,
  };
}
