import {
  EXPLOSION_DURATION,
  EXPLOSION_GROW,
  EXPLOSION_STEPS,
  HIGHLIGHT_HEIGHT,
  STRIPE_HEIGHT,
} from "./constants";
import type { BloqueBusterPalette } from "./skins";

export type BlockColor =
  "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";
export type Paddle = { x: number; y: number; w: number; h: number };
export type Ball = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
};
export type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
};
export type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number; // segundos
};

type Rect = { x: number; y: number; w: number; h: number };

// Solape estricto de dos rectángulos, como collideAABB de game.js.
export function collideAABB(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

// Paleta: rectángulo redondeado con glow del skin.
export function drawPaddle(
  ctx: CanvasRenderingContext2D,
  p: Paddle,
  palette: BloqueBusterPalette,
) {
  ctx.save();
  ctx.fillStyle = palette.paddle;
  ctx.shadowColor = palette.paddle;
  ctx.shadowBlur = palette.glow;
  ctx.beginPath();
  ctx.roundRect(p.x, p.y, p.w, p.h, p.h / 2);
  ctx.fill();
  ctx.restore();
}

// Pelota: círculo inscrito en su caja de 16×16, con glow del skin.
export function drawBall(
  ctx: CanvasRenderingContext2D,
  b: Ball,
  palette: BloqueBusterPalette,
) {
  ctx.save();
  ctx.fillStyle = palette.ball;
  ctx.shadowColor = palette.ball;
  ctx.shadowBlur = palette.glow;
  ctx.beginPath();
  ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Bloque, sin glow. "solid": relleno, borde interior oscuro de 1 px y brillo
// superior. "outline": contorno de 2 px sobre relleno tenue. "stripe": sólido
// con franja central del color de fondo.
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  b: Block,
  palette: BloqueBusterPalette,
) {
  const color = palette.blocks[b.color];
  const pattern = palette.blockPatterns[b.color];
  if (pattern === "outline") {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = color;
    ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
    ctx.restore();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
    return;
  }
  ctx.fillStyle = color;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = palette.highlight;
  ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, HIGHLIGHT_HEIGHT);
  if (pattern === "stripe") {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(
      b.x + 4,
      b.y + (b.h - STRIPE_HEIGHT) / 2,
      b.w - 8,
      STRIPE_HEIGHT,
    );
  }
  ctx.strokeStyle = palette.blockBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
}

// Explosión: 4 pasos en 150 ms; crece 2 px por lado y se desvanece, sin glow.
export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  e: Explosion,
  palette: BloqueBusterPalette,
) {
  const step = Math.min(
    Math.floor((e.elapsed / EXPLOSION_DURATION) * EXPLOSION_STEPS),
    EXPLOSION_STEPS - 1,
  );
  const grow = step * EXPLOSION_GROW;
  ctx.save();
  ctx.globalAlpha = (EXPLOSION_STEPS - step) / EXPLOSION_STEPS;
  ctx.fillStyle = palette.blocks[e.color];
  ctx.fillRect(e.x - grow, e.y - grow, e.w + grow * 2, e.h + grow * 2);
  ctx.restore();
}
