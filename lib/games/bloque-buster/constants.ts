import type { BlockColor } from "./entities";

// Mundo lógico: canvas 800×600 de game.js
export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 600;
export const MAX_DT = 0.05; // segundos
export const MAX_DPR = 2;

// Paleta, como game.js
export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;
export const PADDLE_SPEED = 400; // px/s
export const PADDLE_MAX_X = WORLD_WIDTH - PADDLE_W; // 719
export const PADDLE_BOUNCE_TOLERANCE = 8; // px bajo la paleta que aún rebotan

// Pelota
export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200; // px/s, × LEVELS[n].speed
export const BASE_BALL_VY = -300;

// Bloques: rejilla 10×6 centrada en x
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (WORLD_WIDTH - BLOCK_COLS * BLOCK_W) / 2; // 80
export const BLOCKS_ORIGIN_Y = 80;

// Partida
export const BLOCK_POINTS = 10;
export const START_LIVES = 3;

// Explosión: 4 pasos en 150 ms
export const EXPLOSION_DURATION = 0.15; // segundos
export const EXPLOSION_STEPS = 4;
export const EXPLOSION_GROW = 2; // px por lado en cada paso

// Colores: mismos valores que los tokens de globals.css, más 3 derivados
export const COLOR_BG = "#0a0a0f"; // --bg
export const COLOR_PADDLE = "#00f5ff"; // --cyan
export const COLOR_BALL = "#e6e9ff"; // --ink
export const BLOCK_COLORS: Record<BlockColor, string> = {
  cyan: "#00f5ff", // --cyan
  yellow: "#f5ff00", // --yellow
  magenta: "#ff006e", // --magenta
  green: "#00ff88", // --green
  red: "#ff3b3b", // rojo neón
  hotpink: "#ff4fd8", // rosa neón
  gray: "#8a8fb8", // gris azulado
};
export const COLOR_BLOCK_BORDER = "rgba(10, 10, 15, 0.6)"; // borde interior oscuro
export const COLOR_HIGHLIGHT = "rgba(255,255,255,0.12)";
export const HIGHLIGHT_HEIGHT = 4; // px de brillo superior en cada bloque
export const GLOW_BLUR = 12; // solo paleta y pelota

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
