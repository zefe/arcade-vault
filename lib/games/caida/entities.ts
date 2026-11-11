import {
  COLOR_HIGHLIGHT,
  COLS,
  HIGHLIGHT_HEIGHT,
  PIECE_COLORS,
  PIECE_TYPES,
  PIECES,
  ROWS,
} from "./constants";

export type Board = number[][]; // ROWS × COLS; 0 = vacía, 1–8 = tipo de pieza
export type Piece = { type: number; shape: number[][]; x: number; y: number };

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

// Tipo uniforme entre las 8 piezas; aparece centrada en la fila 0.
export function randomPiece(): Piece {
  const type = Math.floor(Math.random() * PIECE_TYPES) + 1;
  const shape = PIECES[type].map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

// true si alguna celda sale por los lados o el fondo, o pisa un bloque fijado.
export function collide(
  board: Board,
  shape: number[][],
  ox: number,
  oy: number,
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

// Rotación horaria: trasponer e invertir filas.
export function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

// Elimina las filas completas (de abajo arriba) y devuelve cuántas había.
export function clearFullRows(board: Board): number {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array<number>(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  return cleared;
}

// Bloque en la celda (x, y) de una rejilla con origen en (originX, originY).
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  x: number,
  y: number,
  type: number,
  size: number,
  alpha = 1,
): void {
  if (!type) return;
  const px = originX + x * size;
  const py = originY + y * size;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PIECE_COLORS[type];
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
  ctx.fillStyle = COLOR_HIGHLIGHT;
  ctx.fillRect(px + 1, py + 1, size - 2, HIGHLIGHT_HEIGHT);
  ctx.globalAlpha = 1;
}
