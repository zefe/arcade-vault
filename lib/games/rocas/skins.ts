import type { BaseSkin, SkinId } from "@/lib/skins";

export type RocasPalette = BaseSkin & {
  ship: string;
  thrust: string;
  asteroid: string;
  bullet: string;
  powerup: string;
  particle: string;
  hudText: string; // contador "3x  N.Ns"
};

export const SKINS: Record<SkinId, RocasPalette> = {
  // Vector arcade 80s: trazo plano, sin glow, nave blanca cálida.
  clasico: {
    bg: "#000000",
    ink: "#f5f0dc",
    glow: 0,
    scanlines: false,
    ship: "#f5f0dc",
    thrust: "#ff8c1a",
    asteroid: "#a8a89a",
    bullet: "#ffd23f",
    powerup: "#ff4040",
    particle: "#a8a89a",
    hudText: "#ff4040",
  },
  // Paleta original de la plataforma (tokens de globals.css) con glow.
  neon: {
    bg: "#0a0a0f", // --bg
    ink: "#e6e9ff", // --ink
    glow: 10,
    scanlines: false,
    ship: "#00f5ff", // --cyan
    thrust: "#d97a3a", // --bronze
    asteroid: "#f5ff00", // --yellow
    bullet: "#e6e9ff", // --ink
    powerup: "#ff006e", // --magenta
    particle: "#f5ff00", // --yellow
    hudText: "#ff006e", // --magenta
  },
  // Fósforo ámbar: niveles de luminancia 100 % / ~70 % / ~50 %.
  retro: {
    bg: "#0a0600",
    ink: "#ffb000",
    glow: 6,
    scanlines: true,
    ship: "#ffb000", // 100 %, trazo
    thrust: "#b37b00", // 70 %
    asteroid: "#b37b00", // 70 %, trazo
    bullet: "#ffe0a0", // núcleo caliente, punto relleno
    powerup: "#ffb000", // 100 %, rombo + "3x"
    particle: "#805800", // 50 %, decoración
    hudText: "#ffb000",
  },
};
