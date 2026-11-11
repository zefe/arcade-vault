import {
  HARD_DROP_POINTS,
  LINE_SCORES,
  LINES_PER_LEVEL,
  SOFT_DROP_POINTS,
  WALL_KICKS,
  dropIntervalFor,
} from "./constants";
import {
  type Board,
  type Piece,
  clearFullRows,
  collide,
  createBoard,
  randomPiece,
  rotateCW,
} from "./entities";

export type CaidaPhase = "ready" | "playing" | "gameover";

export type CaidaSnapshot = {
  phase: CaidaPhase;
  paused: boolean;
  score: number;
  lines: number;
  level: number;
};

export class CaidaEngine {
  private canvas: HTMLCanvasElement;
  private onChange: (s: CaidaSnapshot) => void;

  private board: Board = createBoard();
  private current!: Piece;
  private next!: Piece;

  private phase: CaidaPhase = "ready";
  private paused = false;
  private score = 0;
  private lines = 0;
  private level = 1;
  private dropInterval = dropIntervalFor(1); // segundos
  private dropAccum = 0; // segundos

  private lastSnapshot: CaidaSnapshot | null = null;

  constructor(canvas: HTMLCanvasElement, onChange: (s: CaidaSnapshot) => void) {
    this.canvas = canvas;
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
    this.emit();
  }

  restart() {
    this.initGame("playing");
    this.emit();
  }

  private emit() {
    const { phase, paused, score, lines, level, lastSnapshot: last } = this;
    if (
      last &&
      last.phase === phase &&
      last.paused === paused &&
      last.score === score &&
      last.lines === lines &&
      last.level === level
    ) {
      return;
    }
    this.lastSnapshot = { phase, paused, score, lines, level };
    this.onChange(this.lastSnapshot);
  }

  // En "ready" ya existen la primera pieza y la siguiente, quietas tras el overlay.
  private initGame(phase: CaidaPhase) {
    this.board = createBoard();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropInterval = dropIntervalFor(1);
    this.dropAccum = 0;
    this.paused = false;
    this.phase = phase;
    this.next = randomPiece();
    this.spawn();
  }

  // La siguiente pasa a ser la actual; si ya colisiona al aparecer, fin de partida.
  private spawn() {
    this.current = this.next;
    this.next = randomPiece();
    if (
      collide(this.board, this.current.shape, this.current.x, this.current.y)
    ) {
      this.phase = "gameover";
    }
  }

  private fits(shape: number[][], x: number, y: number) {
    return !collide(this.board, shape, x, y);
  }

  private move(dx: number) {
    const { shape, x, y } = this.current;
    if (this.fits(shape, x + dx, y)) this.current.x += dx;
  }

  // Rotación horaria con wall kicks; si ninguno encaja, no rota.
  private rotate() {
    const rotated = rotateCW(this.current.shape);
    for (const kick of WALL_KICKS) {
      if (this.fits(rotated, this.current.x + kick, this.current.y)) {
        this.current.shape = rotated;
        this.current.x += kick;
        return;
      }
    }
  }

  // Baja una fila (+1); si no puede, fija la pieza sin puntos.
  private softDrop() {
    const { shape, x, y } = this.current;
    if (this.fits(shape, x, y + 1)) {
      this.current.y++;
      this.score += SOFT_DROP_POINTS;
    } else {
      this.lockPiece();
    }
  }

  // Cae hasta el fantasma (+2 por celda) y se fija.
  private hardDrop() {
    const gy = this.ghostY();
    this.score += (gy - this.current.y) * HARD_DROP_POINTS;
    this.current.y = gy;
    this.lockPiece();
  }

  private ghostY() {
    const { shape, x } = this.current;
    let gy = this.current.y;
    while (this.fits(shape, x, gy + 1)) gy++;
    return gy;
  }

  private merge() {
    const { shape, x, y } = this.current;
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c]) this.board[y + r][x + c] = shape[r][c];
  }

  private lockPiece() {
    this.merge();
    const cleared = clearFullRows(this.board);
    if (cleared) {
      this.lines += cleared;
      // Puntos con el nivel previo a la limpieza, como game.js.
      this.score += (LINE_SCORES[cleared] ?? 0) * this.level;
      this.level = Math.floor(this.lines / LINES_PER_LEVEL) + 1;
      this.dropInterval = dropIntervalFor(this.level);
    }
    this.spawn();
  }

  // Gravedad por tiempo: al superar el intervalo, el acumulador vuelve a 0 (no se resta).
  private update(dt: number) {
    if (this.phase !== "playing") return;
    this.dropAccum += dt;
    if (this.dropAccum >= this.dropInterval) {
      this.dropAccum = 0;
      const { shape, x, y } = this.current;
      if (this.fits(shape, x, y + 1)) this.current.y++;
      else this.lockPiece();
    }
  }
}
