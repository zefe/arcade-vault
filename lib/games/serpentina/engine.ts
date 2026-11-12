import {
  COLS,
  FRUIT_POINTS,
  FRUITS_PER_LEVEL,
  MAX_DPR,
  MAX_LEVEL,
  MAX_QUEUED_TURNS,
  ROWS,
  START_DIR,
  START_SNAKE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  randInt,
  stepForLevel,
} from "./constants";
import {
  type Cell,
  type Dir,
  type Fruit,
  DIR_VECTORS,
  FRUIT_KINDS,
  OPPOSITE,
  drawFruit,
  drawGrid,
  drawSnake,
} from "./entities";

export type SerpentinaPhase = "ready" | "playing" | "gameover";

export type SerpentinaSnapshot = {
  phase: SerpentinaPhase;
  paused: boolean;
  score: number;
  level: number; // 1–10
};

export class SerpentinaEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private onChange: (s: SerpentinaSnapshot) => void;

  // Cabeza en el índice 0.
  private snake: Cell[] = [];
  private dir: Dir = START_DIR;
  private turns: Dir[] = [];
  private fruit: Fruit | null = null;
  private fruitsEaten = 0;
  private acc = 0; // segundos acumulados hacia el próximo paso

  private phase: SerpentinaPhase = "ready";
  private paused = false;
  private score = 0;
  private level = 1;

  constructor(
    canvas: HTMLCanvasElement,
    onChange: (s: SerpentinaSnapshot) => void,
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("SerpentinaEngine: canvas 2D no disponible");
    this.ctx = ctx;
    // Backing store 800·dpr × 600·dpr; se dibuja en coordenadas del mundo lógico.
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = WORLD_WIDTH * this.dpr;
    canvas.height = WORLD_HEIGHT * this.dpr;
    this.onChange = onChange;
    this.initGame("ready");
  }

  start() {
    if (this.phase !== "ready") return;
    this.phase = "playing";
    this.emit();
  }

  end() {
    this.phase = "gameover";
    this.paused = false;
    this.turns = [];
    this.emit();
  }

  restart() {
    this.initGame("playing");
    this.emit();
  }

  private emit() {
    const { phase, paused, score, level } = this;
    this.onChange({ phase, paused, score, level });
  }

  // En "ready" ya se ven la serpiente inicial y la primera fruta, sin avanzar.
  private initGame(phase: SerpentinaPhase) {
    this.snake = START_SNAKE.map((c) => ({ ...c }));
    this.dir = START_DIR;
    this.turns = [];
    this.fruitsEaten = 0;
    this.acc = 0;
    this.score = 0;
    this.level = 1;
    this.paused = false;
    this.phase = phase;
    this.spawnFruit();
  }

  // Se valida contra el último giro en cola (o la dirección actual): sin 180° encubierto.
  private queueTurn(next: Dir) {
    if (this.turns.length >= MAX_QUEUED_TURNS) return;
    const last =
      this.turns.length > 0 ? this.turns[this.turns.length - 1] : this.dir;
    if (next === last || next === OPPOSITE[last]) return;
    this.turns.push(next);
  }

  // Acumulador de dt: con MAX_DT 50 ms y MIN_STEP 60 ms, como mucho un paso por frame.
  private update(dt: number) {
    if (this.phase !== "playing") return;
    this.acc += dt;
    const step = stepForLevel(this.level);
    if (this.acc < step) return;
    this.acc -= step;
    this.advance();
  }

  private advance() {
    const turn = this.turns.shift();
    if (turn) this.dir = turn;

    const head = this.snake[0];
    const v = DIR_VECTORS[this.dir];
    const next: Cell = { col: head.col + v.col, row: head.row + v.row };

    // Muro
    if (next.col < 0 || next.col >= COLS || next.row < 0 || next.row >= ROWS) {
      this.phase = "gameover";
      return;
    }

    const eats =
      this.fruit !== null &&
      next.col === this.fruit.col &&
      next.row === this.fruit.row;

    // Sin fruta, la cola se retira antes del choque: seguir la propia cola es válido.
    if (!eats) this.snake.pop();

    // Cuerpo
    if (this.snake.some((c) => c.col === next.col && c.row === next.row)) {
      this.phase = "gameover";
      return;
    }

    this.snake.unshift(next);

    if (eats) {
      this.score += FRUIT_POINTS * this.level; // nivel antes de recalcular
      this.fruitsEaten++;
      this.level = Math.min(
        1 + Math.floor(this.fruitsEaten / FRUITS_PER_LEVEL),
        MAX_LEVEL,
      );
      this.spawnFruit();
    }
  }

  // Casilla libre al azar entre la lista de libres; rejilla llena → gameover.
  private spawnFruit() {
    const occupied = new Set(this.snake.map((c) => c.row * COLS + c.col));
    const free: number[] = [];
    for (let i = 0; i < COLS * ROWS; i++) if (!occupied.has(i)) free.push(i);
    if (free.length === 0) {
      this.fruit = null;
      this.phase = "gameover";
      return;
    }
    const idx = free[randInt(free.length)];
    this.fruit = {
      col: idx % COLS,
      row: Math.floor(idx / COLS),
      kind: FRUIT_KINDS[randInt(FRUIT_KINDS.length)],
    };
  }

  // Solo el mundo: score, nivel, pausa y game over los pinta React.
  private draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    drawGrid(ctx);
    if (this.fruit) drawFruit(ctx, this.fruit);
    drawSnake(ctx, this.snake, this.dir);
  }
}
