import type { BaseSkin, SkinId } from "@/lib/skins";
import type { BlockColor } from "./entities";

// Cómo se rellena un bloque: en RETRO monocromo distingue colores sin tono.
export type BlockPattern = "solid" | "outline" | "stripe";

export type BloqueBusterPalette = BaseSkin & {
  paddle: string;
  ball: string;
  blocks: Record<BlockColor, string>;
  blockPatterns: Record<BlockColor, BlockPattern>;
  blockBorder: string; // borde interior de 1 px
  highlight: string; // brillo superior de cada bloque
};

const ALL_SOLID: Record<BlockColor, BlockPattern> = {
  red: "solid",
  yellow: "solid",
  cyan: "solid",
  magenta: "solid",
  hotpink: "solid",
  green: "solid",
  gray: "solid",
};

export const SKINS: Record<SkinId, BloqueBusterPalette> = {
  // Arcade 80s: ladrillos planos de colores sólidos, sin glow ni brillo.
  clasico: {
    bg: "#000000",
    ink: "#f5f0dc",
    glow: 0,
    scanlines: false,
    paddle: "#d8d8d0",
    ball: "#f5f0dc",
    blocks: {
      red: "#e04040",
      yellow: "#f0d040",
      cyan: "#4a80f0", // azul
      magenta: "#c050e0", // violeta
      hotpink: "#f08020", // naranja
      green: "#40c040",
      gray: "#a0a0a0",
    },
    blockPatterns: ALL_SOLID,
    blockBorder: "rgba(0, 0, 0, 0.7)",
    highlight: "rgba(0, 0, 0, 0)",
  },
  // Paleta original de la plataforma (tokens de globals.css) con glow.
  neon: {
    bg: "#0a0a0f", // --bg
    ink: "#e6e9ff", // --ink
    glow: 12,
    scanlines: false,
    paddle: "#00f5ff", // --cyan
    ball: "#e6e9ff", // --ink
    blocks: {
      cyan: "#00f5ff", // --cyan
      yellow: "#f5ff00", // --yellow
      magenta: "#ff006e", // --magenta
      green: "#00ff88", // --green
      red: "#ff3b3b", // rojo neón
      hotpink: "#ff4fd8", // rosa neón
      gray: "#8a8fb8", // gris azulado
    },
    blockPatterns: ALL_SOLID,
    blockBorder: "rgba(10, 10, 15, 0.6)",
    highlight: "rgba(255, 255, 255, 0.12)",
  },
  // Fósforo verde: 3 niveles de luminancia (100 % / 70 % / 45 %) × patrón.
  retro: {
    bg: "#020a04",
    ink: "#33ff66",
    glow: 6,
    scanlines: true,
    paddle: "#33ff66", // 100 %, relleno
    ball: "#ccffd9", // núcleo caliente
    blocks: {
      red: "#33ff66", // 100 % sólido
      yellow: "#24b347", // 70 % sólido
      green: "#17732e", // 45 % sólido
      cyan: "#33ff66", // 100 % contorno
      hotpink: "#24b347", // 70 % contorno
      gray: "#24b347", // 70 % franja
      magenta: "#33ff66", // 100 % franja
    },
    blockPatterns: {
      red: "solid",
      yellow: "solid",
      green: "solid",
      cyan: "outline",
      hotpink: "outline",
      gray: "stripe",
      magenta: "stripe",
    },
    blockBorder: "rgba(2, 10, 4, 0.6)",
    highlight: "rgba(204, 255, 217, 0.15)",
  },
};
