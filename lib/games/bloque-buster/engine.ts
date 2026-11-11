import {
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCK_H,
  BLOCK_POINTS,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  EXPLOSION_DURATION,
  MAX_DPR,
  MAX_DT,
  PADDLE_BOUNCE_TOLERANCE,
  PADDLE_H,
  PADDLE_MAX_X,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  START_LIVES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  clamp,
} from "./constants";
import {
  type Ball,
  type Block,
  type Explosion,
  type Paddle,
  collideAABB,
  drawBall,
  drawBlock,
  drawExplosion,
  drawPaddle,
} from "./entities";
import { LEVELS } from "./levels";

export type BloqueBusterPhase = "ready" | "playing" | "gameover";

export type BloqueBusterSnapshot = {
  phase: BloqueBusterPhase;
  paused: boolean;
  score: number;
  lives: number;
  level: number; // 1–5
};

const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "KeyP",
  "Escape",
]);
const PADDLE_KEYS = new Set(["ArrowLeft", "ArrowRight"]);

export class BloqueBusterEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private onChange: (s: BloqueBusterSnapshot) => void;

  private paddle: Paddle = { x: 0, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
  private ball: Ball = {
    x: 0,
    y: 0,
    w: BALL_SIZE,
    h: BALL_SIZE,
    vx: BASE_BALL_VX,
    vy: BASE_BALL_VY,
  };
  private blocks: Block[] = [];
  private explosions: Explosion[] = [];

  private phase: BloqueBusterPhase = "ready";
  private paused = false;
  private score = 0;
  private lives = START_LIVES;
  private level = 1;

  // Teclas mantenidas: movimiento continuo de la paleta.
  private keys: Record<string, boolean> = {};

  private rafId = 0;
  private lastTime: number | null = null;
  private lastSnapshot: BloqueBusterSnapshot | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    onChange: (s: BloqueBusterSnapshot) => void,
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("BloqueBusterEngine: canvas 2D no disponible");
    this.ctx = ctx;
    // Backing store 800·dpr × 600·dpr; se dibuja en coordenadas del mundo lógico.
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = WORLD_WIDTH * this.dpr;
    canvas.height = WORLD_HEIGHT * this.dpr;
    this.onChange = onChange;
    this.initGame("ready");
  }

  mount() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("blur", this.handleBlur);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.emit();
    this.rafId = requestAnimationFrame(this.loop);
  }

  start() {
    if (this.phase !== "ready") return;
    this.phase = "playing";
    this.emit();
  }

  pause() {
    // Se limpia en cualquier fase: una tecla soltada sin foco no debe quedar activa.
    this.keys = {};
    if (this.phase !== "playing") return;
    this.paused = true;
    this.emit();
  }

  resume() {
    this.paused = false;
    this.emit();
  }

  end() {
    this.phase = "gameover";
    this.paused = false;
    this.emit();
  }

  restart() {
    this.initGame("playing");
    this.emit();
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("blur", this.handleBlur);
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
  }

  // En "gameover" no se toca el teclado: el modal necesita espacios y flechas.
  private capturesKeys() {
    return this.phase !== "gameover";
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.capturesKeys() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();

    if (this.phase === "ready") {
      if (e.code === "Space" && !e.repeat) this.start();
      return;
    }

    // "playing"
    if (e.code === "KeyP" || e.code === "Escape") {
      if (e.repeat) return;
      if (this.paused) this.resume();
      else this.pause();
      return;
    }
    if (this.paused || !PADDLE_KEYS.has(e.code)) return;
    // El autorepeat solo cuenta si la tecla se pulsó tras la última limpieza de keys.
    if (e.repeat && !this.keys[e.code]) return;
    this.keys[e.code] = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (this.capturesKeys() && GAME_KEYS.has(e.code)) e.preventDefault();
    this.keys[e.code] = false;
  };

  // Coordenada del cursor convertida al mundo lógico, sea cual sea el tamaño de la CRT.
  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const mouseX = ((e.clientX - rect.left) * WORLD_WIDTH) / rect.width;
    this.movePaddleTo(mouseX);
  };

  private handleBlur = () => this.pause();

  private handleVisibilityChange = () => {
    if (document.hidden) this.pause();
  };

  // En pausa se dibuja sin actualizar: la pelota no avanza.
  private loop = (ts: number) => {
    const dt =
      this.lastTime === null
        ? 0
        : Math.min((ts - this.lastTime) / 1000, MAX_DT);
    this.lastTime = ts;
    if (!this.paused) this.update(dt);
    this.draw();
    this.emit();
    this.rafId = requestAnimationFrame(this.loop);
  };

  // Solo se emite si cambia el snapshot: evita un render de React por frame.
  private emit() {
    const { phase, paused, score, lives, level, lastSnapshot: last } = this;
    if (
      last &&
      last.phase === phase &&
      last.paused === paused &&
      last.score === score &&
      last.lives === lives &&
      last.level === level
    ) {
      return;
    }
    this.lastSnapshot = { phase, paused, score, lives, level };
    this.onChange(this.lastSnapshot);
  }

  // En "ready" ya se ven los bloques del nivel 1, la paleta centrada y la pelota encima.
  private initGame(phase: BloqueBusterPhase) {
    this.score = 0;
    this.lives = START_LIVES;
    this.keys = {};
    this.paused = false;
    this.phase = phase;
    this.paddle.x = (WORLD_WIDTH - PADDLE_W) / 2;
    this.loadLevel(1);
  }

  // Como loadLevel() de game.js: la paleta no se recoloca.
  private loadLevel(n: number) {
    this.level = n;
    this.blocks = LEVELS[n - 1].blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    this.explosions = [];
    this.resetBall();
  }

  // Pelota centrada encima de la paleta con la velocidad del nivel; sale al instante.
  private resetBall() {
    const speed = LEVELS[this.level - 1].speed;
    const { ball, paddle } = this;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }

  // Ratón: x del cursor ya convertida al mundo lógico. Solo en "playing" sin pausa.
  private movePaddleTo(mouseX: number) {
    if (this.phase !== "playing" || this.paused) return;
    this.paddle.x = clamp(mouseX - PADDLE_W / 2, 0, PADDLE_MAX_X);
  }

  private update(dt: number) {
    if (this.phase !== "playing") return;
    const { ball, paddle } = this;

    // Paleta
    if (this.keys.ArrowLeft)
      paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (this.keys.ArrowRight)
      paddle.x = Math.min(PADDLE_MAX_X, paddle.x + PADDLE_SPEED * dt);

    // Movimiento de la pelota
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Paredes izquierda, derecha y techo: recoloca y fuerza el signo
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.w >= WORLD_WIDTH) {
      ball.x = WORLD_WIDTH - ball.w;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    }

    // Paleta: vx no cambia
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + PADDLE_BOUNCE_TOLERANCE
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
    }

    // Bloques: solo uno por frame
    for (const block of this.blocks) {
      if (!block.alive || !collideAABB(ball, block)) continue;
      block.alive = false;
      const { x, y, w, h, color } = block;
      this.explosions.push({ x, y, w, h, color, elapsed: 0 });
      this.score += BLOCK_POINTS;
      ball.vy = -ball.vy;
      if (this.blocks.every((b) => !b.alive)) {
        if (this.level < LEVELS.length) this.loadLevel(this.level + 1);
        else this.phase = "gameover";
      }
      break;
    }
    if (this.phase !== "playing") return; // nivel 5 completado

    // Explosiones
    for (const exp of this.explosions) exp.elapsed += dt;
    this.explosions = this.explosions.filter(
      (exp) => exp.elapsed < EXPLOSION_DURATION,
    );

    // Pelota perdida
    if (ball.y > WORLD_HEIGHT) {
      this.lives--;
      if (this.lives <= 0) {
        this.lives = 0;
        this.phase = "gameover";
      } else {
        this.resetBall();
      }
    }
  }

  // Solo el mundo: score, vidas, nivel, pausa y game over los pinta React.
  private draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    for (const block of this.blocks) if (block.alive) drawBlock(ctx, block);
    for (const exp of this.explosions) drawExplosion(ctx, exp);
    drawPaddle(ctx, this.paddle);
    drawBall(ctx, this.ball);
  }
}
