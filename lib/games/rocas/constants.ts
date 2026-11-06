// Mundo lógico
export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 600;
export const MAX_DT = 0.05; // segundos
export const MAX_DPR = 2;

// Rocas, indexado por tamaño: 1 pequeña, 2 mediana, 3 grande
export const RADII = [0, 16, 30, 50];
export const SPEEDS = [0, 85, 55, 32];
export const POINTS = [0, 100, 50, 20];
export const ASTEROID_SPEED_VARIANCE = 15;
export const ASTEROID_MAX_ROT_SPEED = 1.2;
export const ASTEROID_MIN_VERTS = 8;
export const ASTEROID_MAX_VERTS = 13;
export const ASTEROID_SPAWN_SAFE_DIST = 130;

// Nave
export const STARTING_LIVES = 3;
export const SHIP_RADIUS = 12;
export const SHIP_ROTATION_SPEED = 3.5; // rad/s
export const SHIP_THRUST = 260; // px/s²
export const SHIP_NOSE_OFFSET = 21;
export const INVINCIBILITY_TIME = 3;
export const RESPAWN_TIME = 2;
export const SHOOT_COOLDOWN = 0.2;
export const SHIP_COLLISION_FACTOR = 0.82;

// Rozamiento por tick: Math.pow(DRAG_BASE, dt * DRAG_REFERENCE_FPS)
export const DRAG_BASE = 0.987;
export const DRAG_REFERENCE_FPS = 60;

// Balas
export const BULLET_SPEED = 520;
export const BULLET_TTL = 1.1;
export const BULLET_RADIUS = 2;
export const TRIPLE_SPREAD = 0.18;

// Power-up
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_GUARANTEED_KILLS = 5;
export const POWERUP_DURATION = 5;
export const POWERUP_TTL = 12;
export const POWERUP_RADIUS = 12;
export const POWERUP_MIN_SPEED = 20;
export const POWERUP_MAX_SPEED = 40;

// Niveles: INITIAL_ASTEROIDS al inicio y LEVEL_ASTEROIDS_BASE + level al subir
export const INITIAL_ASTEROIDS = 4;
export const LEVEL_ASTEROIDS_BASE = 3;

// Partículas
export const PARTICLE_MIN_SPEED = 30;
export const PARTICLE_MAX_SPEED = 130;
export const PARTICLE_MIN_LIFE = 0.4;
export const PARTICLE_MAX_LIFE = 1.1;
export const PARTICLE_TAIL_TIME = 0.05;
export const SHIP_EXPLOSION_PARTICLES = 14;
export const ASTEROID_PARTICLES_PER_SIZE = 5;

// Colores: mismos valores que los tokens de globals.css
export const COLOR_SHIP = "#00f5ff"; // --cyan
export const COLOR_ASTEROID = "#f5ff00"; // --yellow
export const COLOR_BULLET = "#e6e9ff"; // --ink
export const COLOR_POWERUP = "#ff006e"; // --magenta
export const COLOR_THRUST = "#d97a3a"; // --bronze
export const COLOR_PARTICLE = "#f5ff00"; // --yellow, con alpha y sin glow

export const GLOW_BLUR = 10; // solo nave, rocas y power-up

export type Point = { x: number; y: number };

export const wrap = (v: number, max: number) => ((v % max) + max) % max;
export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const rand = (min: number, max: number) =>
  min + Math.random() * (max - min);
export const randInt = (min: number, max: number) =>
  Math.floor(rand(min, max + 1));
