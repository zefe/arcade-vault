// Mundo lógico: CRT 4:3 con el tablero centrado
export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 600;
export const MAX_DT = 0.05; // segundos
export const MAX_DPR = 2;

// Tablero, como game.js
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30; // px por celda
export const BOARD_X = (WORLD_WIDTH - COLS * BLOCK) / 2; // 250
export const BOARD_Y = 0;

// Vista previa SIGUIENTE: rejilla 4×4 de celdas de 30 px, a la derecha del tablero
export const PREVIEW_BLOCK = 30;
export const PREVIEW_SIZE = 4 * PREVIEW_BLOCK; // 120
export const PREVIEW_X =
  BOARD_X +
  COLS * BLOCK +
  (WORLD_WIDTH - BOARD_X - COLS * BLOCK - PREVIEW_SIZE) / 2; // 615
export const PREVIEW_Y = 60;
export const PREVIEW_LABEL = "SIGUIENTE";

// Piezas, indexadas por tipo 1–8 (matrices de game.js)
export const PIECES: readonly (readonly (readonly number[])[])[] = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // Tuerca
];
export const PIECE_TYPES = 8;

// Wall kicks: desplazamientos de columna probados al rotar
export const WALL_KICKS = [0, -1, 1, -2, 2];

// Puntuación
export const LINE_SCORES = [0, 100, 300, 500, 800]; // × nivel previo a la limpieza
export const HARD_DROP_POINTS = 2; // por celda recorrida
export const SOFT_DROP_POINTS = 1; // por fila bajada

// Niveles: floor(lines / LINES_PER_LEVEL) + 1
export const LINES_PER_LEVEL = 10;

// Intervalo de caída en segundos: max(0.1, 1 - (level - 1) * 0.09).
// Se calcula en ms enteros, como game.js, para que los valores sean exactos (0.91, 0.1).
export const dropIntervalFor = (level: number) =>
  Math.max(100, 1000 - (level - 1) * 90) / 1000;

// Colores por tipo: mismos valores que los tokens de globals.css, más 3 derivados
export const PIECE_COLORS = [
  "",
  "#00f5ff", // I --cyan
  "#f5ff00", // O --yellow
  "#ff006e", // T --magenta
  "#00ff88", // S --green
  "#ff3b3b", // Z rojo neón
  "#3d7bff", // J azul
  "#ff8a00", // L naranja
  "#e6e9ff", // Tuerca --ink
];
export const COLOR_GRID = "rgba(0, 245, 255, 0.08)"; // --cyan con alpha
export const COLOR_FRAME = "rgba(0, 245, 255, 0.35)"; // borde del tablero y caja SIGUIENTE
export const COLOR_LABEL = "rgba(0, 245, 255, 0.7)";
export const COLOR_HIGHLIGHT = "rgba(255,255,255,0.12)";

export const HIGHLIGHT_HEIGHT = 4; // px de brillo superior en cada bloque
export const GHOST_ALPHA = 0.2;
export const GLOW_BLUR = 10; // solo pieza actual y vista previa
