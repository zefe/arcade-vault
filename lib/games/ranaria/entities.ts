import {
  BODY_STROKE,
  BUOY_RADIUS,
  CELL,
  DEATH_TIME,
  GRID_X,
  PAD_COLS,
  ROW_GOAL,
  ROW_MEDIAN,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  ROW_ROAD_BOT,
  ROW_ROAD_TOP,
  ROW_START,
  TIME_BAR_H,
  TIME_BAR_W,
  TIME_BAR_Y,
  TIME_DANGER,
  TIME_PER_FROG,
  TIME_WARN,
  WORLD_WIDTH,
  WRAP,
  WRAP_OFFSCREEN,
  colCenter,
  mod,
} from "./constants";
import type { RanariaPalette } from "./skins";

export type Dir = "up" | "down" | "left" | "right";
export type LaneKind = "safe" | "road" | "river" | "goal";
export type MoverKind =
  "moto" | "coche" | "camion" | "bolido" | "tronco" | "boyas";

export type LaneDef = {
  row: number; // 0–11
  kind: LaneKind;
  mover?: MoverKind;
  dir?: 1 | -1; // 1 = hacia la derecha
  speed?: number; // px/s a nivel 1
  length?: number; // casillas por entidad
  count?: number; // entidades por carril
};

export type Lane = LaneDef & { offset: number }; // px, avanza con speed × dir × factor × dt

export type FrogState = "idle" | "hopping" | "dying";

export type Frog = {
  x: number; // borde izquierdo en px (continuo en el río)
  row: number; // fila lógica 0–11
  facing: Dir;
  state: FrogState;
  hopT: number; // s transcurridos del salto
  fromX: number;
  fromRow: number;
  deathT: number; // s transcurridos de la animación de muerte
};

// Borde izquierdo de la entidad i del carril
export function moverX(lane: Lane, i: number): number {
  const count = lane.count ?? 1;
  const spacing = WRAP / count;
  return mod(lane.offset + i * spacing, WRAP) - WRAP_OFFSCREEN;
}

// Relleno de cuerpo con la opacidad del skin (fillStyle = color de la entidad).
function fillBody(ctx: CanvasRenderingContext2D, p: RanariaPalette) {
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * p.bodyAlpha;
  ctx.fill();
  ctx.globalAlpha = a;
}

// Fondo por zonas: meta (seto), río, mediana, carretera y acera.
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  p: RanariaPalette,
) {
  ctx.save();

  // Seto de la meta
  ctx.fillStyle = p.hedge;
  ctx.fillRect(0, ROW_GOAL * CELL, WORLD_WIDTH, CELL);

  // Río
  const riverY = ROW_RIVER_TOP * CELL;
  const riverH = (ROW_RIVER_BOT - ROW_RIVER_TOP + 1) * CELL;
  ctx.fillStyle = p.water;
  ctx.fillRect(0, riverY, WORLD_WIDTH, riverH);
  ctx.strokeStyle = p.current;
  ctx.lineWidth = 1;
  for (let r = ROW_RIVER_TOP; r <= ROW_RIVER_BOT; r++) {
    const y = r * CELL + CELL / 2 + 0.5;
    const shift = (r * 37) % 60;
    ctx.beginPath();
    for (let x = -60 + shift; x < WORLD_WIDTH; x += 120) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 40, y);
    }
    ctx.stroke();
  }

  // Carretera con líneas discontinuas entre carriles
  const roadY = ROW_ROAD_TOP * CELL;
  const roadH = (ROW_ROAD_BOT - ROW_ROAD_TOP + 1) * CELL;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, roadY, WORLD_WIDTH, roadH);
  ctx.strokeStyle = p.roadDash;
  ctx.setLineDash([20, 20]);
  for (let r = ROW_ROAD_TOP + 1; r <= ROW_ROAD_BOT; r++) {
    const y = r * CELL + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_WIDTH, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Mediana y acera de salida
  for (const r of [ROW_MEDIAN, ROW_START]) {
    const y = r * CELL;
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, y, WORLD_WIDTH, CELL);
    ctx.fillStyle = p.safe;
    ctx.fillRect(0, y, WORLD_WIDTH, CELL);
    ctx.strokeStyle = p.safeEdge;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(WORLD_WIDTH, y + 0.5);
    ctx.moveTo(0, y + CELL - 0.5);
    ctx.lineTo(WORLD_WIDTH, y + CELL - 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

// Dibuja todas las entidades de un carril con movimiento.
export function drawLane(
  ctx: CanvasRenderingContext2D,
  p: RanariaPalette,
  lane: Lane,
) {
  if (!lane.mover || !lane.count) return;
  const y = lane.row * CELL;
  for (let i = 0; i < lane.count; i++) {
    drawMover(
      ctx,
      p,
      lane.mover,
      moverX(lane, i),
      y,
      lane.length ?? 1,
      lane.dir ?? 1,
    );
  }
}

// Una entidad: vehículo, tronco o cadena de boyas, con borde izquierdo x y fila en y.
export function drawMover(
  ctx: CanvasRenderingContext2D,
  p: RanariaPalette,
  kind: MoverKind,
  x: number,
  y: number,
  length: number,
  dir: 1 | -1,
) {
  const w = length * CELL;
  if (x > WORLD_WIDTH || x + w < 0) return;
  if (kind === "tronco") drawLog(ctx, p, x, y, w);
  else if (kind === "boyas") drawBuoys(ctx, p, x, y, length);
  else drawVehicle(ctx, p, kind, x, y, w, dir);
}

function drawLog(
  ctx: CanvasRenderingContext2D,
  p: RanariaPalette,
  x: number,
  y: number,
  w: number,
) {
  const top = y + 8;
  const h = CELL - 16;
  ctx.save();
  ctx.fillStyle = p.logFill;
  ctx.strokeStyle = p.log;
  ctx.lineWidth = BODY_STROKE;
  ctx.beginPath();
  ctx.roundRect(x + 3, top, w - 6, h, h / 2);
  ctx.fill();
  ctx.stroke();
  // Vetas de 1 px
  ctx.strokeStyle = p.detail ?? p.log;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let vx = x + 22; vx < x + w - 22; vx += 26) {
    ctx.moveTo(vx, top + 8);
    ctx.lineTo(vx + 14, top + 8);
    ctx.moveTo(vx + 8, top + h - 8);
    ctx.lineTo(vx + 20, top + h - 8);
  }
  ctx.stroke();
  // Anillos de los extremos
  ctx.beginPath();
  ctx.ellipse(x + w - 3 - h / 2, top + h / 2, 5, h / 2 - 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBuoys(
  ctx: CanvasRenderingContext2D,
  p: RanariaPalette,
  x: number,
  y: number,
  length: number,
) {
  const cy = y + CELL / 2;
  ctx.save();
  ctx.fillStyle = p.buoyFill;
  ctx.strokeStyle = p.buoy;
  ctx.lineWidth = BODY_STROKE;
  // Cable entre boyas
  ctx.beginPath();
  ctx.moveTo(x + CELL / 2, cy);
  ctx.lineTo(x + length * CELL - CELL / 2, cy);
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (let i = 0; i < length; i++) {
    const cx = x + i * CELL + CELL / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, BUOY_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Banda central
    ctx.beginPath();
    ctx.moveTo(cx - BUOY_RADIUS + 4, cy);
    ctx.lineTo(cx + BUOY_RADIUS - 4, cy);
    ctx.strokeStyle = p.detail ?? p.buoy;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = p.buoy;
    ctx.lineWidth = BODY_STROKE;
  }
  ctx.restore();
}

function drawVehicle(
  ctx: CanvasRenderingContext2D,
  p: RanariaPalette,
  kind: "moto" | "coche" | "camion" | "bolido",
  x: number,
  y: number,
  w: number,
  dir: 1 | -1,
) {
  const color = p[kind];
  ctx.save();
  // Se dibuja mirando a la derecha y se refleja si va a la izquierda
  ctx.translate(x + w / 2, y + CELL / 2);
  if (dir < 0) ctx.scale(-1, 1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = BODY_STROKE;
  ctx.lineJoin = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = p.glow;
  const hw = w / 2;

  ctx.beginPath();
  if (kind === "moto") {
    // Cuerpo estrecho con dos ruedas
    ctx.roundRect(-16, -6, 32, 12, 6);
    fillBody(ctx, p);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-14, 0, 7, 0, Math.PI * 2);
    ctx.moveTo(21, 0);
    ctx.arc(14, 0, 7, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === "coche") {
    ctx.roundRect(-hw + 4, -15, w - 8, 30, 6);
    fillBody(ctx, p);
    ctx.stroke();
    // Parabrisas
    ctx.strokeStyle = p.detail ?? color;
    ctx.beginPath();
    ctx.moveTo(6, -10);
    ctx.lineTo(12, -10);
    ctx.lineTo(12, 10);
    ctx.lineTo(6, 10);
    ctx.closePath();
    ctx.stroke();
  } else if (kind === "camion") {
    // Remolque y cabina separados
    ctx.rect(-hw + 4, -17, w - 30, 34);
    fillBody(ctx, p);
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(hw - 22, -14, 18, 28, 4);
    fillBody(ctx, p);
    ctx.stroke();
  } else {
    // Bólido: cuña afilada hacia delante
    ctx.moveTo(-hw + 4, -14);
    ctx.lineTo(hw - 14, -10);
    ctx.lineTo(hw - 3, 0);
    ctx.lineTo(hw - 14, 10);
    ctx.lineTo(-hw + 4, 14);
    ctx.closePath();
    fillBody(ctx, p);
    ctx.stroke();
    ctx.strokeStyle = p.detail ?? color;
    ctx.beginPath();
    ctx.moveTo(-hw + 10, -6);
    ctx.lineTo(4, -4);
    ctx.moveTo(-hw + 10, 6);
    ctx.lineTo(4, 4);
    ctx.stroke();
  }
  ctx.restore();
}

// Meta: seto en bloques, nenúfares libres y ranas en los ocupados.
export function drawBays(
  ctx: CanvasRenderingContext2D,
  p: RanariaPalette,
  occupied: readonly boolean[],
) {
  const y = ROW_GOAL * CELL;
  ctx.save();
  ctx.strokeStyle = p.hedgeEdge;
  ctx.lineWidth = 1;
  // Bloques del seto: todas las casillas que no son nenúfar
  for (let c = 0; c < 15; c++) {
    if (PAD_COLS.includes(c)) continue;
    ctx.strokeRect(GRID_X + c * CELL + 4.5, y + 6.5, CELL - 9, CELL - 13);
  }
  // Márgenes laterales
  ctx.strokeRect(4.5, y + 6.5, GRID_X - 9, CELL - 13);
  ctx.strokeRect(WORLD_WIDTH - GRID_X + 4.5, y + 6.5, GRID_X - 9, CELL - 13);

  PAD_COLS.forEach((c, i) => {
    const cx = colCenter(c);
    const cy = y + CELL / 2;
    // Agua bajo el nenúfar
    ctx.fillStyle = p.water;
    ctx.fillRect(GRID_X + c * CELL, y, CELL, CELL);
    if (occupied[i]) {
      drawFrog(ctx, p, GRID_X + c * CELL, y, "up", 0, false);
      return;
    }
    // Nenúfar libre: círculo con muesca
    ctx.strokeStyle = p.pad;
    ctx.lineWidth = BODY_STROKE;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 17, -Math.PI / 2 + 0.35, -Math.PI / 2 - 0.35 + Math.PI * 2);
    ctx.closePath();
    ctx.stroke();
  });
  ctx.restore();
}

const FACING_ANGLE: Record<Dir, number> = {
  up: 0,
  right: Math.PI / 2,
  down: Math.PI,
  left: -Math.PI / 2,
};

// Rana con borde izquierdo x y fila en y; hop ∈ [0, 1] estira las patas en el salto.
export function drawFrog(
  ctx: CanvasRenderingContext2D,
  p: RanariaPalette,
  x: number,
  y: number,
  facing: Dir,
  hop: number,
  glow = true,
) {
  const stretch = Math.sin(hop * Math.PI) * 6;
  ctx.save();
  ctx.translate(x + CELL / 2, y + CELL / 2);
  ctx.rotate(FACING_ANGLE[facing]);
  ctx.strokeStyle = p.frog;
  ctx.fillStyle = p.frog;
  ctx.lineWidth = BODY_STROKE;
  ctx.lineCap = "round";
  if (glow) {
    ctx.shadowColor = p.frog;
    ctx.shadowBlur = p.glow;
  }
  // Patas
  ctx.beginPath();
  ctx.moveTo(-9, -6);
  ctx.lineTo(-15, -13 - stretch);
  ctx.moveTo(9, -6);
  ctx.lineTo(15, -13 - stretch);
  ctx.moveTo(-9, 7);
  ctx.lineTo(-16, 15 + stretch);
  ctx.moveTo(9, 7);
  ctx.lineTo(16, 15 + stretch);
  ctx.stroke();
  // Cuerpo
  ctx.beginPath();
  ctx.ellipse(0, 1, 11, 13, 0, 0, Math.PI * 2);
  fillBody(ctx, p);
  ctx.stroke();
  // Ojos
  ctx.shadowBlur = 0;
  ctx.fillStyle = p.frogEyes;
  ctx.beginPath();
  ctx.arc(-5, -9, 3, 0, Math.PI * 2);
  ctx.arc(5, -9, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Muerte: aspa y 8 rayos que crecen y se desvanecen en DEATH_TIME.
export function drawDeath(
  ctx: CanvasRenderingContext2D,
  p: RanariaPalette,
  cx: number,
  cy: number,
  t: number,
) {
  const k = Math.min(1, t / DEATH_TIME);
  ctx.save();
  ctx.globalAlpha = 1 - k;
  ctx.strokeStyle = p.death;
  ctx.lineWidth = BODY_STROKE;
  ctx.lineCap = "round";
  ctx.shadowColor = p.death;
  ctx.shadowBlur = p.glow;
  const s = 10;
  ctx.beginPath();
  ctx.moveTo(cx - s, cy - s);
  ctx.lineTo(cx + s, cy + s);
  ctx.moveTo(cx + s, cy - s);
  ctx.lineTo(cx - s, cy + s);
  const inner = 12 + k * 10;
  const outer = 18 + k * 22;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
  }
  ctx.stroke();
  ctx.restore();
}

// Barra de tiempo: verde > 10 s, amarilla 5–10 s, magenta < 5 s (con glow).
export function drawTimeBar(
  ctx: CanvasRenderingContext2D,
  p: RanariaPalette,
  time: number,
) {
  const t = Math.max(0, Math.min(TIME_PER_FROG, time));
  const color =
    t < TIME_DANGER ? p.timeDanger : t < TIME_WARN ? p.timeWarn : p.timeOk;
  ctx.save();
  ctx.fillStyle = color;
  if (t < TIME_DANGER) {
    ctx.shadowColor = color;
    ctx.shadowBlur = p.glow;
  }
  ctx.fillRect(
    GRID_X,
    TIME_BAR_Y,
    (TIME_BAR_W * t) / TIME_PER_FROG,
    TIME_BAR_H,
  );
  ctx.restore();
}
