import type { BaseSkin, SkinId } from "@/lib/skins";

export type RanariaPalette = BaseSkin & {
  bodyAlpha: number; // opacidad del relleno de rana y carrocerías (1 = plano sólido)
  detail: string | null; // trazos interiores (parabrisas, vetas, banda); null = color de la entidad
  frog: string;
  frogEyes: string;
  moto: string;
  coche: string;
  camion: string;
  bolido: string;
  log: string;
  logFill: string;
  buoy: string;
  buoyFill: string;
  water: string;
  current: string; // líneas de corriente del río
  roadDash: string; // discontinuas entre carriles (la carretera es `bg`)
  safe: string; // mediana y acera
  safeEdge: string;
  hedge: string; // seto de la meta
  hedgeEdge: string;
  pad: string; // nenúfar libre
  timeOk: string;
  timeWarn: string;
  timeDanger: string;
  death: string;
};

export const SKINS: Record<SkinId, RanariaPalette> = {
  // Arcade 80s plano: río azul, carretera negra, aceras violeta, cuerpos sólidos con detalle negro.
  clasico: {
    bg: "#000000",
    ink: "#f5f0dc",
    glow: 0,
    scanlines: false,
    bodyAlpha: 1,
    detail: "#000000",
    frog: "#40c040",
    frogEyes: "#000000",
    moto: "#f0d040",
    coche: "#e04040",
    camion: "#f08020",
    bolido: "#4a80f0",
    log: "#c08040",
    logFill: "#c08040",
    buoy: "#e04040",
    buoyFill: "#e04040",
    water: "#0a1850",
    current: "#22388a",
    roadDash: "#3a3a3a",
    safe: "#2a1440",
    safeEdge: "#6a3aa0",
    hedge: "#123a12",
    hedgeEdge: "#2f7a2f",
    pad: "#40c040",
    timeOk: "#40c040",
    timeWarn: "#f0d040",
    timeDanger: "#e04040",
    death: "#f5f0dc",
  },
  // Paleta original de la spec (tokens de globals.css + 4 derivados) con glow.
  neon: {
    bg: "#0a0a0f", // --bg (carretera)
    ink: "#e6e9ff", // --ink
    glow: 12,
    scanlines: false,
    bodyAlpha: 0.25,
    detail: null,
    frog: "#00ff88", // --green
    frogEyes: "#e6e9ff", // --ink
    moto: "#f5ff00", // --yellow
    coche: "#ff006e", // --magenta
    camion: "#ff8a00", // derivado
    bolido: "#ff3b3b", // derivado
    log: "#ffcf3a", // --gold
    logFill: "rgba(255,207,58,0.15)",
    buoy: "#00f5ff", // --cyan
    buoyFill: "rgba(0,245,255,0.15)",
    water: "#001f2a", // derivado (cover-rana)
    current: "rgba(0,245,255,0.18)",
    roadDash: "rgba(230,233,255,0.15)",
    safe: "rgba(0,255,136,0.08)",
    safeEdge: "rgba(0,255,136,0.4)",
    hedge: "#0b2a1e", // derivado
    hedgeEdge: "rgba(0,255,136,0.5)",
    pad: "#00ff88",
    timeOk: "#00ff88",
    timeWarn: "#f5ff00",
    timeDanger: "#ff006e",
    death: "#ff006e",
  },
  // Fósforo ámbar: rana y muerte en núcleo caliente, peligros 100 %, plataformas 70 %, decoración 45 %.
  retro: {
    bg: "#0a0600",
    ink: "#ffb000",
    glow: 6,
    scanlines: true,
    bodyAlpha: 0.25,
    detail: null,
    frog: "#ffe6b3", // núcleo caliente
    frogEyes: "#ffe6b3",
    moto: "#ffb000", // 100 %
    coche: "#ffb000", // 100 %
    camion: "#b37b00", // 70 %
    bolido: "#ffb000", // 100 %
    log: "#b37b00", // 70 %
    logFill: "rgba(179,123,0,0.15)",
    buoy: "#ffb000", // 100 %
    buoyFill: "rgba(255,176,0,0.15)",
    water: "#150d00",
    current: "rgba(255,176,0,0.18)",
    roadDash: "rgba(255,176,0,0.2)",
    safe: "rgba(255,176,0,0.06)",
    safeEdge: "#735000", // 45 %
    hedge: "#1f1400",
    hedgeEdge: "#735000", // 45 %
    pad: "#b37b00", // 70 %
    timeOk: "#b37b00", // 70 %
    timeWarn: "#ffb000", // 100 %
    timeDanger: "#ffe6b3", // núcleo caliente + glow
    death: "#ffe6b3",
  },
};
