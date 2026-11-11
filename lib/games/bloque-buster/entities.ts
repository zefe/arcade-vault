import {
  BLOCK_COLORS,
  COLOR_BALL,
  COLOR_BLOCK_BORDER,
  COLOR_HIGHLIGHT,
  COLOR_PADDLE,
  EXPLOSION_DURATION,
  EXPLOSION_GROW,
  EXPLOSION_STEPS,
  GLOW_BLUR,
  HIGHLIGHT_HEIGHT,
} from "./constants";

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

// Paleta: rectángulo redondeado cyan con glow.
export function drawPaddle(ctx: CanvasRenderingContext2D, p: Paddle) {
  ctx.save();
  ctx.fillStyle = COLOR_PADDLE;
  ctx.shadowColor = COLOR_PADDLE;
  ctx.shadowBlur = GLOW_BLUR;
  ctx.beginPath();
  ctx.roundRect(p.x, p.y, p.w, p.h, p.h / 2);
  ctx.fill();
  ctx.restore();
}

// Pelota: círculo inscrito en su caja de 16×16, con glow.
export function drawBall(ctx: CanvasRenderingContext2D, b: Ball) {
  ctx.save();
  ctx.fillStyle = COLOR_BALL;
  ctx.shadowColor = COLOR_BALL;
  ctx.shadowBlur = GLOW_BLUR;
  ctx.beginPath();
  ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Bloque: relleno de su color, borde interior oscuro de 1 px y brillo superior, sin glow.
export function drawBlock(ctx: CanvasRenderingContext2D, b: Block) {
  ctx.fillStyle = BLOCK_COLORS[b.color];
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = COLOR_HIGHLIGHT;
  ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, HIGHLIGHT_HEIGHT);
  ctx.strokeStyle = COLOR_BLOCK_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
}

// Explosión: 4 pasos en 150 ms; crece 2 px por lado y se desvanece, sin glow.
export function drawExplosion(ctx: CanvasRenderingContext2D, e: Explosion) {
  const step = Math.min(
    Math.floor((e.elapsed / EXPLOSION_DURATION) * EXPLOSION_STEPS),
    EXPLOSION_STEPS - 1,
  );
  const grow = step * EXPLOSION_GROW;
  ctx.save();
  ctx.globalAlpha = (EXPLOSION_STEPS - step) / EXPLOSION_STEPS;
  ctx.fillStyle = BLOCK_COLORS[e.color];
  ctx.fillRect(e.x - grow, e.y - grow, e.w + grow * 2, e.h + grow * 2);
  ctx.restore();
}
