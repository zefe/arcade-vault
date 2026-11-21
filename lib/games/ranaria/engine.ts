import {
  ADVANCE_POINTS,
  CELL,
  COLS,
  DEATH_TIME,
  DRIFT_MAX_CX,
  DRIFT_MIN_CX,
  FROG_INSET,
  HOP_TIME,
  LANES,
  LANE_OFFSET_STEP,
  MAX_CX,
  MIN_CX,
  PAD_COLS,
  PAD_POINTS,
  PAD_TOLERANCE,
  ROUND_BONUS,
  ROW_GOAL,
  ROW_MEDIAN,
  ROW_START,
  START_COL,
  START_LIVES,
  TIME_PER_FROG,
  TIME_POINTS,
  clamp,
  colCenter,
  speedFactor,
} from "./constants";
import { type Dir, type Frog, type Lane, moverX } from "./entities";

export type RanariaPhase = "ready" | "playing" | "gameover";

export type RanariaSnapshot = {
  phase: RanariaPhase;
  paused: boolean;
  score: number;
  lives: number; // 0–3
  level: number; // 1, 2, 3…
};

const START_X = colCenter(START_COL) - CELL / 2; // 375

export class RanariaEngine {
  private canvas: HTMLCanvasElement;
  private onChange: (s: RanariaSnapshot) => void;

  private lanes: Lane[] = [];
  private frog: Frog = RanariaEngine.newFrogState();
  private bestRow = ROW_START; // fila más alta alcanzada por esta rana
  private bufferedHop: Dir | null = null; // búfer de 1 durante un salto
  private time = TIME_PER_FROG; // s restantes de esta rana
  private occupied: boolean[] = PAD_COLS.map(() => false);

  private phase: RanariaPhase = "ready";
  private paused = false;
  private score = 0;
  private lives = START_LIVES;
  private level = 1;

  private lastSnapshot: RanariaSnapshot | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    onChange: (s: RanariaSnapshot) => void,
  ) {
    this.canvas = canvas;
    this.onChange = onChange;
    this.initGame("ready");
  }

  start() {
    if (this.phase !== "ready") return;
    this.phase = "playing";
    this.emit();
  }

  // Se vacía el búfer en cualquier fase: un salto pulsado antes de pausar no se aplica al reanudar.
  pause() {
    this.bufferedHop = null;
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
    this.bufferedHop = null;
    this.emit();
  }

  restart() {
    this.initGame("playing");
    this.emit();
  }

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

  private static newFrogState(): Frog {
    return {
      x: START_X,
      row: ROW_START,
      facing: "up",
      state: "idle",
      hopT: 0,
      fromX: START_X,
      fromRow: ROW_START,
      deathT: 0,
    };
  }

  // En "ready" se ven los carriles quietos en su offset inicial y la rana en la salida.
  private initGame(phase: RanariaPhase) {
    this.lanes = LANES.map((def) => ({
      ...def,
      offset: def.row * LANE_OFFSET_STEP,
    }));
    this.occupied = PAD_COLS.map(() => false);
    this.score = 0;
    this.lives = START_LIVES;
    this.level = 1;
    this.paused = false;
    this.phase = phase;
    this.newFrog();
  }

  // Rana nueva en la salida con el tiempo lleno; el avance vuelve a puntuar desde la fila 10.
  private newFrog() {
    this.frog = RanariaEngine.newFrogState();
    this.bestRow = ROW_START;
    this.bufferedHop = null;
    this.time = TIME_PER_FROG;
  }

  private frogCx() {
    return this.frog.x + CELL / 2;
  }

  private laneAt(row: number): Lane {
    return this.lanes[row];
  }

  // Acción de salto: ignorada fuera de "playing", en pausa o durante la muerte.
  // Durante un salto se guarda una sola pulsación; las siguientes se ignoran.
  private hop(dir: Dir) {
    if (this.phase !== "playing" || this.paused) return;
    const frog = this.frog;
    if (frog.state === "dying") return;
    if (frog.state === "hopping") {
      if (this.bufferedHop === null) this.bufferedHop = dir;
      return;
    }
    this.startHop(dir);
  }

  private startHop(dir: Dir) {
    const frog = this.frog;
    let x = frog.x;
    let row = frog.row;
    if (dir === "up") row -= 1;
    else if (dir === "down") {
      if (row >= ROW_START) return;
      row += 1;
    } else {
      x += dir === "left" ? -CELL : CELL;
      const cx = x + CELL / 2;
      if (cx < MIN_CX || cx > MAX_CX) return;
    }
    if (row < ROW_GOAL) return;
    frog.fromX = frog.x;
    frog.fromRow = frog.row;
    frog.x = x;
    frog.row = row;
    frog.facing = dir;
    frog.state = "hopping";
    frog.hopT = 0;
  }

  private update(dt: number) {
    if (this.phase !== "playing") return;

    // Carriles: siguen moviéndose también durante la animación de muerte.
    const factor = speedFactor(this.level);
    for (const lane of this.lanes) {
      if (!lane.mover) continue;
      lane.offset += (lane.speed ?? 0) * (lane.dir ?? 1) * factor * dt;
    }

    const frog = this.frog;
    if (frog.state === "dying") {
      // El tiempo se congela durante la muerte.
      frog.deathT += dt;
      if (frog.deathT >= DEATH_TIME) {
        if (this.lives <= 0) {
          this.phase = "gameover";
          this.bufferedHop = null;
        } else {
          this.newFrog();
        }
      }
      return;
    }

    if (frog.state === "hopping") {
      frog.hopT += dt;
      if (frog.hopT >= HOP_TIME) this.land();
    } else {
      this.checkGround(dt);
    }
    if (this.frog.state === "dying" || this.phase !== "playing") return;
    // El aterrizaje en un nenúfar crea una rana nueva con el tiempo lleno.
    if (this.frog !== frog) return;

    this.time -= dt;
    if (this.time <= 0) {
      this.time = 0;
      this.kill();
    }
  }

  // Rana quieta: arrastre y soporte en el río, choques en la carretera.
  private checkGround(dt: number) {
    const frog = this.frog;
    const lane = this.laneAt(frog.row);
    if (lane.kind === "river") {
      frog.x +=
        (lane.speed ?? 0) * (lane.dir ?? 1) * speedFactor(this.level) * dt;
      const cx = this.frogCx();
      if (cx < DRIFT_MIN_CX || cx > DRIFT_MAX_CX) {
        this.kill();
        return;
      }
      if (!this.hasSupport(lane)) this.kill();
    } else if (lane.kind === "road") {
      if (this.hitsVehicle(lane)) this.kill();
    }
  }

  private land() {
    const frog = this.frog;
    frog.state = "idle";
    frog.hopT = 0;

    // En tierra la x se ajusta a la columna más cercana.
    if (frog.row >= ROW_MEDIAN) {
      const c = clamp(
        Math.round((this.frogCx() - colCenter(0)) / CELL),
        0,
        COLS - 1,
      );
      frog.x = colCenter(c) - CELL / 2;
    }

    if (frog.row === ROW_GOAL) {
      this.landOnGoal();
      return;
    }

    const lane = this.laneAt(frog.row);
    if (lane.kind === "river") {
      const cx = this.frogCx();
      if (cx < DRIFT_MIN_CX || cx > DRIFT_MAX_CX || !this.hasSupport(lane)) {
        this.kill();
        return;
      }
    } else if (lane.kind === "road" && this.hitsVehicle(lane)) {
      this.kill();
      return;
    }

    if (frog.row < this.bestRow) {
      this.bestRow = frog.row;
      this.score += ADVANCE_POINTS;
    }

    const next = this.bufferedHop;
    this.bufferedHop = null;
    if (next) this.startHop(next);
  }

  // Nenúfar libre a ≤ 25 px: ocupado + puntos; seto o nenúfar ocupado: muerte.
  private landOnGoal() {
    const cx = this.frogCx();
    const pad = PAD_COLS.findIndex(
      (c) => Math.abs(cx - colCenter(c)) <= PAD_TOLERANCE,
    );
    if (pad < 0 || this.occupied[pad]) {
      this.kill();
      return;
    }
    this.occupied[pad] = true;
    this.score += PAD_POINTS + TIME_POINTS * Math.floor(this.time);

    if (this.occupied.every(Boolean)) {
      // Ronda completa: bonus, nenúfares vacíos y nivel +1; los carriles no se recolocan.
      this.score += ROUND_BONUS;
      this.occupied = PAD_COLS.map(() => false);
      this.level += 1;
    }
    this.newFrog();
  }

  // A salvo si el centro de la rana cae sobre alguna entidad del carril.
  private hasSupport(lane: Lane): boolean {
    const cx = this.frogCx();
    const w = (lane.length ?? 1) * CELL;
    for (let i = 0; i < (lane.count ?? 0); i++) {
      const mx = moverX(lane, i);
      if (cx >= mx && cx <= mx + w) return true;
    }
    return false;
  }

  // Caja de la rana (34×34) contra la casilla del vehículo (mismo carril: solo eje x).
  private hitsVehicle(lane: Lane): boolean {
    const left = this.frog.x + FROG_INSET;
    const right = this.frog.x + CELL - FROG_INSET;
    const w = (lane.length ?? 1) * CELL;
    for (let i = 0; i < (lane.count ?? 0); i++) {
      const mx = moverX(lane, i);
      if (left < mx + w && right > mx) return true;
    }
    return false;
  }

  // La animación dura DEATH_TIME; la vida se resta al empezar.
  private kill() {
    const frog = this.frog;
    frog.state = "dying";
    frog.deathT = 0;
    frog.hopT = 0;
    this.bufferedHop = null;
    this.lives = Math.max(0, this.lives - 1);
  }
}
