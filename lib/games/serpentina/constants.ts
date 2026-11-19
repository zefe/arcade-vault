import type { Cell, Dir } from "./entities";

// Mundo lógico 800×600
export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 600;
export const MAX_DT = 0.05; // segundos
export const MAX_DPR = 2;

// Rejilla: 32×24 casillas de 25 px = 768 casillas
export const CELL = 25; // px
export const COLS = 32;
export const ROWS = 24;
export const TOTAL_CELLS = COLS * ROWS; // 768

// Serpiente inicial: cabeza en el índice 0
export const START_SNAKE: readonly Cell[] = [
  { col: 16, row: 12 },
  { col: 15, row: 12 },
  { col: 14, row: 12 },
];
export const START_DIR: Dir = "right";

// Ritmo
export const BASE_STEP = 0.15; // s, nivel 1
export const STEP_DECREMENT = 0.01; // s por nivel
export const MIN_STEP = 0.06; // s, nivel 10

// Progresión
export const FRUITS_PER_LEVEL = 5;
export const MAX_LEVEL = 10;
export const FRUIT_POINTS = 10; // × nivel
export const MAX_QUEUED_TURNS = 2;

// Dibujo (los colores salen de la paleta del skin, ver skins.ts)
export const SNAKE_INSET = 2; // px de margen dentro de la casilla
export const BORDER_WIDTH = 2; // px

// Paso por nivel: 150 ms en nivel 1 → 60 ms en nivel 10
export const stepForLevel = (level: number) =>
  Math.max(MIN_STEP, BASE_STEP - (level - 1) * STEP_DECREMENT);

// Entero aleatorio en [0, max)
export const randInt = (max: number) => Math.floor(Math.random() * max);
