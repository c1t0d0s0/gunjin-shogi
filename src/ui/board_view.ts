import {
  BOARD_COLS,
  BOARD_ROWS,
  ENTRY_COLS,
  getBoardGrid,
  getValidMovesForPiece,
  isHQPosition,
  isSamePosition,
} from '../core/board';
import { PIECE_DEFINITIONS } from '../core/pieces';
import { GameManager, GameState } from '../core/state';
import { Piece, PieceType, Position } from '../core/types';
import { sound } from '../audio/sound';

export interface BoardViewCallbacks {
  onPieceSelect?: (piece: Piece | null) => void;
  onMoveExecute?: (pieceId: string, to: Position) => void;
  onOpenDeduction?: (piece: Piece, clientX: number, clientY: number) => void;
}

export class BoardView {
  private container: HTMLElement;
  private gameManager: GameManager;
  private callbacks: BoardViewCallbacks;
  private selectedPiece: Piece | null = null;
  private deductionMarks = new Map<string, PieceType>(); // プレイヤーがつけた推理マーク

  constructor(
    container: HTMLElement,
    gameManager: GameManager,
    callbacks: BoardViewCallbacks = {}
  ) {
    this.container = container;
    this.gameManager = gameManager;
    this.callbacks = callbacks;
  }

  public setSelectedPiece(piece: Piece | null): void {
    this.selectedPiece = piece;
    this.render();
  }

  public getSelectedPiece(): Piece | null {
    return this.selectedPiece;
  }

  public setDeductionMark(pieceId: string, type?: PieceType): void {
    if (type) {
      this.deductionMarks.set(pieceId, type);
    } else {
      this.deductionMarks.delete(pieceId);
    }
    this.render();
  }

  public render(): void {
    const state = this.gameManager.getState();
    const grid = getBoardGrid(state.pieces);

    this.container.innerHTML = '';

    const boardFrame = document.createElement('div');
    boardFrame.className = 'shogi-board-frame';

    const boardEl = document.createElement('div');
    boardEl.className = 'shogi-board';

    // 川（境界線）
    const river = document.createElement('div');
    river.className = 'river-boundary';
    boardEl.appendChild(river);

    // 突入口（橋）マーカー
    for (const col of ENTRY_COLS) {
      const marker = document.createElement('div');
      marker.className = `entry-marker col-${col}`;
      marker.textContent = '突入口';
      boardEl.appendChild(marker);
    }

    // 有効移動先マスリストの算出
    const validMoves: Position[] =
      this.selectedPiece && state.phase === 'playing'
        ? getValidMovesForPiece(this.selectedPiece, state.pieces)
        : [];

    // マス目の描画 (8行 x 6列)
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const cellPos: Position = { row: r, col: c };
        const cell = document.createElement('div');
        cell.className = 'board-cell';
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);

        // 総司令部判定
        if (isHQPosition(cellPos)) {
          cell.classList.add('hq-cell');
        }

        // 選択中のマス
        if (
          this.selectedPiece &&
          isSamePosition(this.selectedPiece.position, cellPos)
        ) {
          cell.classList.add('selected-piece-cell');
        }

        // 直前の移動ハイライト
        if (state.lastMove) {
          if (isSamePosition(state.lastMove.from, cellPos)) {
            cell.classList.add('last-move-from');
          }
          if (isSamePosition(state.lastMove.to, cellPos)) {
            cell.classList.add('last-move-to');
          }
        }

        // 移動可能先ハイライト
        const isValidMove = validMoves.some((m) => isSamePosition(m, cellPos));
        if (isValidMove) {
          const targetPiece = grid[r][c];
          if (targetPiece) {
            cell.classList.add('valid-attack-target');
          } else {
            cell.classList.add('valid-move-target');
          }
        }

        // 駒の描画
        const piece = grid[r][c];
        if (piece) {
          const pieceEl = this.createPieceElement(piece, state);
          cell.appendChild(pieceEl);
        }

        // マスクリックイベント
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleCellClick(cellPos, piece, isValidMove);
        });

        // 敵駒への右クリック（推理メモ用）
        if (piece && piece.owner === 'gote' && state.phase === 'playing') {
          cell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.callbacks.onOpenDeduction) {
              this.callbacks.onOpenDeduction(piece, e.clientX, e.clientY);
            }
          });
        }

        boardEl.appendChild(cell);
      }
    }

    boardFrame.appendChild(boardEl);
    this.container.appendChild(boardFrame);
  }

  private createPieceElement(piece: Piece, state: GameState): HTMLElement {
    const pieceEl = document.createElement('div');
    pieceEl.className = `shogi-piece ${piece.owner}`;
    pieceEl.dataset.pieceId = piece.id;

    if (this.selectedPiece?.id === piece.id) {
      pieceEl.classList.add('selected');
    }

    // フォグ・オブ・ウォー（裏向き判定）
    // 先手駒は常に表向き、後手(AI/敵)駒は終局時またはrevealフラグが立っている場合のみ表向き
    const isFaceDown =
      piece.owner === 'gote' &&
      state.phase !== 'ended' &&
      !piece.revealedToOpponent;

    if (isFaceDown) {
      pieceEl.classList.add('face-down');
    }

    const body = document.createElement('div');
    body.className = 'piece-body';

    const info = PIECE_DEFINITIONS[piece.type];
    const kanji = document.createElement('span');
    kanji.className = `piece-kanji length-${info.kanji.length}`;
    kanji.textContent = info.kanji;
    body.appendChild(kanji);

    const badge = document.createElement('span');
    badge.className = 'piece-owner-badge';
    badge.textContent = piece.owner === 'sente' ? '先手' : '後手';
    body.appendChild(badge);

    pieceEl.appendChild(body);

    // 推理メモバッジ（プレイヤーが敵の裏向き駒にマークをつけた場合）
    if (isFaceDown && this.deductionMarks.has(piece.id)) {
      const guessedType = this.deductionMarks.get(piece.id)!;
      const guessInfo = PIECE_DEFINITIONS[guessedType];
      const memoBadge = document.createElement('div');
      memoBadge.className = 'deduction-badge';
      memoBadge.textContent = `推: ${guessInfo.shortName}`;
      pieceEl.appendChild(memoBadge);
    }

    return pieceEl;
  }

  private handleCellClick(
    pos: Position,
    clickedPiece: Piece | null,
    isValidMove: boolean
  ): void {
    const state = this.gameManager.getState();

    // 1. 配置フェーズでの処理
    if (state.phase === 'setup') {
      if (this.selectedPiece) {
        if (clickedPiece && clickedPiece.id === this.selectedPiece.id) {
          // 選択解除
          this.selectedPiece = null;
          this.render();
          return;
        }
        // 配置またはスワップ実行
        sound.playPieceMove();
        this.gameManager.placePiece(this.selectedPiece.id, pos);
        this.selectedPiece = null;
        this.render();
        return;
      }

      if (clickedPiece && clickedPiece.owner === 'sente') {
        this.selectedPiece = clickedPiece;
        sound.playClick();
        this.render();
      }
      return;
    }

    // 2. 対局フェーズでの処理
    if (state.phase === 'playing') {
      // 有効移動先をクリックした場合
      if (this.selectedPiece && isValidMove) {
        if (this.callbacks.onMoveExecute) {
          this.callbacks.onMoveExecute(this.selectedPiece.id, pos);
        }
        this.selectedPiece = null;
        return;
      }

      // 自分の駒をクリックして選択
      if (clickedPiece && clickedPiece.owner === state.turn) {
        this.selectedPiece = clickedPiece;
        sound.playClick();
        if (this.callbacks.onPieceSelect) {
          this.callbacks.onPieceSelect(clickedPiece);
        }
        this.render();
        return;
      }

      // 敵駒をクリック（選択中でなければ推理メモを開く）
      if (clickedPiece && clickedPiece.owner !== state.turn) {
        if (this.callbacks.onOpenDeduction) {
          // 画面中央またはマス位置でメモを開く
          this.callbacks.onOpenDeduction(clickedPiece, window.innerWidth / 2, window.innerHeight / 2);
        }
      }

      // 空白マスをクリックして選択解除
      this.selectedPiece = null;
      this.render();
    }
  }
}
