// Medidor de FPS y tiempo de frame solo para desarrollo (SPEC JAM ranaria 04).
// Sin React ni globals: cada motor crea su instancia y lo pinta en su canvas.

const WINDOW_MS = 1000;

// true solo si NODE_ENV !== "production" y la URL lleva ?perf=1. false en el servidor.
export function isPerfEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("perf") === "1";
}

export class PerfMeter {
  private windowStart: number | null = null;
  private frameStart = 0;
  private samples: number[] = []; // duraciones begin→end de la ventana actual (ms)
  private fps = 0;
  private avgMs = 0;
  private p95Ms = 0;

  // Marca el inicio del trabajo del frame (performance.now()).
  begin() {
    this.frameStart = performance.now();
    if (this.windowStart === null) this.windowStart = this.frameStart;
  }

  // Marca el final; acumula duración y cuenta el frame.
  end() {
    const now = performance.now();
    this.samples.push(now - this.frameStart);
    const start = this.windowStart ?? now;
    const elapsed = now - start;
    if (elapsed < WINDOW_MS) return;

    // Cierre de ventana: FPS = frames / s, media y p95 de begin→end.
    const n = this.samples.length;
    const sorted = [...this.samples].sort((a, b) => a - b);
    this.fps = (n * 1000) / elapsed;
    this.avgMs = sorted.reduce((sum, ms) => sum + ms, 0) / n;
    this.p95Ms = sorted[Math.min(n - 1, Math.ceil(n * 0.95) - 1)];
    this.samples = [];
    this.windowStart = now;
  }

  // Pinta el panel en la esquina superior izquierda del mundo lógico (800×600).
  // Texto monoespaciado sobre caja negra translúcida: "FPS 58 · 4.2 ms · p95 7.9 ms".
  draw(ctx: CanvasRenderingContext2D) {
    const text = `FPS ${Math.round(this.fps)} · ${this.avgMs.toFixed(1)} ms · p95 ${this.p95Ms.toFixed(1)} ms`;
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const w = ctx.measureText(text).width + 12;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(4, 4, w, 20);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, 10, 8);
    ctx.restore();
  }
}
