import type { BaseSkin, SkinId } from "@/lib/skins";

export type SerpentinaPalette = BaseSkin & {
  grid: string; // puntos de la rejilla
  border: string; // marco del mundo, 2 px
  head: string;
  body: string;
  eye: string; // ojos de la cabeza
  apple: string;
  appleLeaf: string;
  cherry: string;
  cherryStem: string;
  lemon: string;
  grape: string;
};

export const SKINS: Record<SkinId, SerpentinaPalette> = {
  // Arcade 80s plano: sin glow ni gradientes; cabeza más clara que el cuerpo.
  clasico: {
    bg: "#000000",
    ink: "#f5f0dc",
    glow: 0,
    scanlines: false,
    grid: "rgba(255,255,255,0.12)",
    border: "#5a5a5a",
    head: "#9be564",
    body: "#3fae3f",
    eye: "#000000",
    apple: "#e8392b",
    appleLeaf: "#3fae3f",
    cherry: "#d81e5b",
    cherryStem: "#a0703c",
    lemon: "#f8d838",
    grape: "#8a63ff",
  },
  // Paleta original de la plataforma (tokens de globals.css) con glow.
  neon: {
    bg: "#0a0a0f", // --bg
    ink: "#e6e9ff", // --ink
    glow: 10,
    scanlines: false,
    grid: "rgba(230,233,255,0.08)",
    border: "#00f5ff", // --cyan
    head: "#00ff88", // --green
    body: "#00ff88", // --green
    eye: "#0a0a0f", // --bg (contraste 14,73 con la cabeza)
    apple: "#ff006e", // --magenta
    appleLeaf: "#00ff88", // --green
    cherry: "#ff006e", // --magenta
    cherryStem: "#00ff88", // --green
    lemon: "#f5ff00", // --yellow
    grape: "#00f5ff", // --cyan
  },
  // Fósforo verde: cabeza 100 %, cuerpo 70 %, decoración 45 %, frutas núcleo caliente o 100 %.
  retro: {
    bg: "#020a04",
    ink: "#33ff66",
    glow: 6,
    scanlines: true,
    grid: "rgba(51,255,102,0.14)",
    border: "#177330", // 45 %
    head: "#33ff66", // 100 %
    body: "#24b347", // 70 %
    eye: "#020a04", // bg
    apple: "#ccffd9", // núcleo caliente
    appleLeaf: "#177330", // 45 %
    cherry: "#ccffd9", // núcleo caliente
    cherryStem: "#177330", // 45 %
    lemon: "#33ff66", // 100 %
    grape: "#33ff66", // 100 %
  },
};
