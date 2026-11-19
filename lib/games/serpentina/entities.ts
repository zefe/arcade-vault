import {
  BORDER_WIDTH,
  CELL,
  COLS,
  ROWS,
  SNAKE_INSET,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./constants";
import type { SerpentinaPalette } from "./skins";

export type Cell = { col: number; row: number };
export type Dir = "up" | "down" | "left" | "right";
export type FruitKind = "apple" | "cherry" | "lemon" | "grape";
export type Fruit = Cell & { kind: FruitKind };
// snake: Cell[] con la cabeza en el índice 0
// drawGrid, drawSnake, drawFruit(ctx, palette, …): la paleta llega por parámetro, sin globals

export const FRUIT_KINDS: readonly FruitKind[] = [
  "apple",
  "cherry",
  "lemon",
  "grape",
];

export const DIR_VECTORS: Record<Dir, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

export const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

// Glow solo si el skin lo pide; con glow = 0 no se toca shadow*.
function setGlow(
  ctx: CanvasRenderingContext2D,
  palette: SerpentinaPalette,
  color: string,
) {
  if (palette.glow <= 0) return;
  ctx.shadowColor = color;
  ctx.shadowBlur = palette.glow;
}

// Rejilla: puntos tenues en las intersecciones interiores y borde de 2 px.
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  palette: SerpentinaPalette,
) {
  ctx.save();
  ctx.fillStyle = palette.grid;
  for (let c = 1; c < COLS; c++) {
    for (let r = 1; r < ROWS; r++) {
      ctx.fillRect(c * CELL - 1, r * CELL - 1, 2, 2);
    }
  }
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = BORDER_WIDTH;
  const half = BORDER_WIDTH / 2;
  ctx.strokeRect(
    half,
    half,
    WORLD_WIDTH - BORDER_WIDTH,
    WORLD_HEIGHT - BORDER_WIDTH,
  );
  ctx.restore();
}

// Serpiente: cuerpo sin glow con 2 px de margen; cabeza con glow del skin y ojos según la dirección.
export function drawSnake(
  ctx: CanvasRenderingContext2D,
  palette: SerpentinaPalette,
  snake: readonly Cell[],
  dir: Dir,
) {
  if (snake.length === 0) return;
  const size = CELL - SNAKE_INSET * 2;
  ctx.save();
  ctx.fillStyle = palette.body;
  for (let i = snake.length - 1; i >= 1; i--) {
    const s = snake[i];
    ctx.fillRect(
      s.col * CELL + SNAKE_INSET,
      s.row * CELL + SNAKE_INSET,
      size,
      size,
    );
  }

  const head = snake[0];
  const hx = head.col * CELL + SNAKE_INSET;
  const hy = head.row * CELL + SNAKE_INSET;
  ctx.fillStyle = palette.head;
  setGlow(ctx, palette, palette.head);
  ctx.beginPath();
  ctx.roundRect(hx, hy, size, size, 4);
  ctx.fill();

  // Ojos: dos puntos desplazados hacia el frente de la cabeza.
  if (palette.glow > 0) ctx.shadowBlur = 0;
  ctx.fillStyle = palette.eye;
  const cx = hx + size / 2;
  const cy = hy + size / 2;
  const v = DIR_VECTORS[dir];
  const forward = 4; // px hacia la dirección de avance
  const spread = 5; // px de separación lateral
  const ex = cx + v.col * forward;
  const ey = cy + v.row * forward;
  const px = -v.row * spread; // perpendicular
  const py = v.col * spread;
  ctx.beginPath();
  ctx.arc(ex + px, ey + py, 2.5, 0, Math.PI * 2);
  ctx.arc(ex - px, ey - py, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Frutas vectoriales originales, centradas en su casilla; glow según el skin.
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  palette: SerpentinaPalette,
  fruit: Fruit,
) {
  const cx = fruit.col * CELL + CELL / 2;
  const cy = fruit.row * CELL + CELL / 2;
  ctx.save();
  switch (fruit.kind) {
    case "apple":
      drawApple(ctx, palette, cx, cy);
      break;
    case "cherry":
      drawCherry(ctx, palette, cx, cy);
      break;
    case "lemon":
      drawLemon(ctx, palette, cx, cy);
      break;
    case "grape":
      drawGrape(ctx, palette, cx, cy);
      break;
  }
  ctx.restore();
}

// Manzana: círculo `apple` con hoja `appleLeaf`.
function drawApple(
  ctx: CanvasRenderingContext2D,
  palette: SerpentinaPalette,
  cx: number,
  cy: number,
) {
  setGlow(ctx, palette, palette.apple);
  ctx.fillStyle = palette.apple;
  ctx.beginPath();
  ctx.arc(cx, cy + 1.5, 8, 0, Math.PI * 2);
  ctx.fill();
  setGlow(ctx, palette, palette.appleLeaf);
  ctx.fillStyle = palette.appleLeaf;
  ctx.beginPath();
  ctx.ellipse(cx + 3, cy - 8, 4, 2, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
}

// Cereza: dos círculos `cherry` unidos por un rabito `cherryStem`.
function drawCherry(
  ctx: CanvasRenderingContext2D,
  palette: SerpentinaPalette,
  cx: number,
  cy: number,
) {
  setGlow(ctx, palette, palette.cherryStem);
  ctx.strokeStyle = palette.cherryStem;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy + 3);
  ctx.quadraticCurveTo(cx - 3, cy - 6, cx + 2, cy - 9);
  ctx.moveTo(cx + 5, cy + 3);
  ctx.quadraticCurveTo(cx + 4, cy - 5, cx + 2, cy - 9);
  ctx.stroke();
  setGlow(ctx, palette, palette.cherry);
  ctx.fillStyle = palette.cherry;
  ctx.beginPath();
  ctx.arc(cx - 5, cy + 5, 4.5, 0, Math.PI * 2);
  ctx.arc(cx + 5, cy + 5, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

// Limón: elipse `lemon` ligeramente inclinada.
function drawLemon(
  ctx: CanvasRenderingContext2D,
  palette: SerpentinaPalette,
  cx: number,
  cy: number,
) {
  setGlow(ctx, palette, palette.lemon);
  ctx.fillStyle = palette.lemon;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 9.5, 6.5, -Math.PI / 8, 0, Math.PI * 2);
  ctx.fill();
}

// Uva: racimo triangular de 6 círculos `grape` (3 + 2 + 1).
const GRAPE_OFFSETS: readonly [number, number][] = [
  [-5, -5],
  [0, -5],
  [5, -5],
  [-2.5, 0],
  [2.5, 0],
  [0, 5],
];
function drawGrape(
  ctx: CanvasRenderingContext2D,
  palette: SerpentinaPalette,
  cx: number,
  cy: number,
) {
  setGlow(ctx, palette, palette.grape);
  ctx.fillStyle = palette.grape;
  ctx.beginPath();
  for (const [dx, dy] of GRAPE_OFFSETS) {
    ctx.moveTo(cx + dx + 3, cy + dy + 1);
    ctx.arc(cx + dx, cy + dy + 1, 3, 0, Math.PI * 2);
  }
  ctx.fill();
}
