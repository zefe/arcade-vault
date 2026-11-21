import type { LaneDef } from "./entities";

// Mundo lógico 800×600
export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 600;
export const MAX_DT = 0.05; // segundos
export const MAX_DPR = 2;

// Rejilla: 15 columnas × 12 filas de 50 px, con 25 px de margen lateral
export const CELL = 50; // px
export const COLS = 15;
export const ROWS = 12;
export const GRID_X = 25; // px
export const GRID_RIGHT = GRID_X + COLS * CELL; // 775

// Filas por zona (0 = arriba)
export const ROW_GOAL = 0;
export const ROW_RIVER_TOP = 1;
export const ROW_RIVER_BOT = 5;
export const ROW_MEDIAN = 6;
export const ROW_ROAD_TOP = 7;
export const ROW_ROAD_BOT = 10;
export const ROW_START = 11;

// Rana
export const START_COL = 7; // centro x = 400
export const HOP_TIME = 0.1; // s en el aire
export const FROG_INSET = 8; // px de margen de la caja de choque (34×34)
export const CAR_INSET_Y = 4; // px de margen vertical de la caja de un vehículo
export const MIN_CX = 50; // centro mínimo de un salto lateral
export const MAX_CX = 750; // centro máximo de un salto lateral
export const DRIFT_MIN_CX = GRID_X; // 25: fuera de aquí muere arrastrada
export const DRIFT_MAX_CX = GRID_RIGHT; // 775

// Meta: nenúfares en las columnas 1, 4, 7, 10 y 13
export const PAD_COLS: readonly number[] = [1, 4, 7, 10, 13];
export const PAD_TOLERANCE = 25; // px entre el centro de la rana y el del nenúfar

// Tiempo y muerte
export const TIME_PER_FROG = 30; // s
export const DEATH_TIME = 0.6; // s
export const START_LIVES = 3;

// Puntuación
export const ADVANCE_POINTS = 10;
export const PAD_POINTS = 50;
export const TIME_POINTS = 10; // por segundo entero sobrante
export const ROUND_BONUS = 500;

// Carriles
export const WRAP = 1000; // px de recorrido antes de dar la vuelta
export const WRAP_OFFSCREEN = 200; // px fuera de pantalla por la izquierda
export const LANE_OFFSET_STEP = 137; // offset inicial = fila × 137
export const SPEED_STEP = 0.1; // +10 % por nivel
export const MAX_SPEED_FACTOR = 1.5;

// Tabla de carriles de nivel 1
export const LANES: readonly LaneDef[] = [
  { row: 0, kind: "goal" },
  {
    row: 1,
    kind: "river",
    mover: "boyas",
    dir: 1,
    speed: 80,
    length: 2,
    count: 4,
  },
  {
    row: 2,
    kind: "river",
    mover: "tronco",
    dir: -1,
    speed: 50,
    length: 3,
    count: 3,
  },
  {
    row: 3,
    kind: "river",
    mover: "tronco",
    dir: 1,
    speed: 90,
    length: 4,
    count: 3,
  },
  {
    row: 4,
    kind: "river",
    mover: "boyas",
    dir: -1,
    speed: 70,
    length: 3,
    count: 3,
  },
  {
    row: 5,
    kind: "river",
    mover: "tronco",
    dir: 1,
    speed: 60,
    length: 2,
    count: 3,
  },
  { row: 6, kind: "safe" },
  {
    row: 7,
    kind: "road",
    mover: "bolido",
    dir: -1,
    speed: 150,
    length: 1,
    count: 2,
  },
  {
    row: 8,
    kind: "road",
    mover: "camion",
    dir: 1,
    speed: 55,
    length: 2,
    count: 3,
  },
  {
    row: 9,
    kind: "road",
    mover: "coche",
    dir: -1,
    speed: 90,
    length: 1,
    count: 4,
  },
  {
    row: 10,
    kind: "road",
    mover: "moto",
    dir: 1,
    speed: 70,
    length: 1,
    count: 3,
  },
  { row: 11, kind: "safe" },
];

// Barra de tiempo
export const TIME_BAR_Y = 590;
export const TIME_BAR_H = 6;
export const TIME_BAR_W = 750;
export const TIME_WARN = 10; // s: amarillo por debajo
export const TIME_DANGER = 5; // s: magenta por debajo

// Colores y glow: SKINS en ./skins.ts
export const BODY_STROKE = 2; // px
export const BUOY_RADIUS = 18; // px

// Factor de velocidad: 1× en nivel 1, +10 % por nivel, tope 1,5× (nivel 6+)
export const speedFactor = (level: number) =>
  Math.min(1 + SPEED_STEP * (level - 1), MAX_SPEED_FACTOR);

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

// Módulo siempre positivo
export const mod = (a: number, n: number) => ((a % n) + n) % n;

// Centro x de la columna c
export const colCenter = (c: number) => GRID_X + CELL * c + CELL / 2;
