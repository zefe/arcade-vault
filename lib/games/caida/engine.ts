import {
  BLOCK,
  BOARD_X,
  BOARD_Y,
  COLOR_FRAME,
  COLOR_GRID,
  COLOR_LABEL,
  COLS,
  GHOST_ALPHA,
  GLOW_BLUR,
  HARD_DROP_POINTS,
  LINE_SCORES,
  LINES_PER_LEVEL,
  MAX_DPR,
  PIECE_COLORS,
  PREVIEW_BLOCK,
  PREVIEW_LABEL,
  PREVIEW_SIZE,
  PREVIEW_X,
  PREVIEW_Y,
  ROWS,
  SOFT_DROP_POINTS,
  WALL_KICKS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  dropIntervalFor,
} from "./constants";
import {
  type Board,
  type Piece,
  clearFullRows,
  collide,
  createBoard,
  drawBlock,
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
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
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
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("CaidaEngine: canvas 2D no disponible");
    this.ctx = ctx;
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

  // Solo mundo y caja SIGUIENTE: score, líneas, nivel y game over los pinta React.
  private draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.drawGrid();

    // Bloques fijados, sin glow
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        drawBlock(ctx, BOARD_X, BOARD_Y, c, r, this.board[r][c], BLOCK);

    // En "gameover" la pieza que no cupo se oculta para no solaparse con el tablero.
    if (this.phase !== "gameover") {
      const { shape, x, y } = this.current;
      const gy = this.ghostY();
      this.drawShape(shape, x, gy, GHOST_ALPHA, false);
      this.drawShape(shape, x, y, 1, true);
    }

    this.drawPreview();
  }

  private drawGrid() {
    const ctx = this.ctx;
    const w = COLS * BLOCK;
    const h = ROWS * BLOCK;
    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(BOARD_X + c * BLOCK, BOARD_Y);
      ctx.lineTo(BOARD_X + c * BLOCK, BOARD_Y + h);
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK);
      ctx.lineTo(BOARD_X + w, BOARD_Y + r * BLOCK);
    }
    ctx.stroke();

    ctx.strokeStyle = COLOR_FRAME;
    ctx.lineWidth = 1;
    ctx.strokeRect(BOARD_X - 0.5, BOARD_Y - 0.5, w + 1, h + 1);
  }

  private drawShape(
    shape: number[][],
    x: number,
    y: number,
    alpha: number,
    glow: boolean,
  ) {
    const ctx = this.ctx;
    if (glow) {
      ctx.shadowColor = PIECE_COLORS[this.current.type];
      ctx.shadowBlur = GLOW_BLUR;
    }
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(
          ctx,
          BOARD_X,
          BOARD_Y,
          x + c,
          y + r,
          shape[r][c],
          BLOCK,
          alpha,
        );
    ctx.shadowBlur = 0;
  }

  // Rejilla 4×4 con la pieza centrada, como drawNext() de game.js.
  private drawPreview() {
    const ctx = this.ctx;
    ctx.fillStyle = COLOR_LABEL;
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(PREVIEW_LABEL, PREVIEW_X + PREVIEW_SIZE / 2, PREVIEW_Y - 12);

    ctx.strokeStyle = COLOR_FRAME;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      PREVIEW_X - 0.5,
      PREVIEW_Y - 0.5,
      PREVIEW_SIZE + 1,
      PREVIEW_SIZE + 1,
    );

    const { shape, type } = this.next;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    ctx.shadowColor = PIECE_COLORS[type];
    ctx.shadowBlur = GLOW_BLUR;
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(
          ctx,
          PREVIEW_X,
          PREVIEW_Y,
          offX + c,
          offY + r,
          shape[r][c],
          PREVIEW_BLOCK,
        );
    ctx.shadowBlur = 0;
  }
}
