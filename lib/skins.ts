// Skins visuales de los juegos reales. Solo cambian colores y glow:
// nunca gameplay, física ni puntuación.
export type SkinId = "clasico" | "neon" | "retro";

export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];

export const DEFAULT_SKIN: SkinId = "clasico";

export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};

export type BaseSkin = {
  bg: string; // fondo del mundo (canvas)
  ink: string; // texto/labels en canvas
  glow: number; // shadowBlur; 0 en clásico
  scanlines: boolean; // overlay CRT extra (lo pinta `.crt.skin-retro`)
};

export function isSkinId(v: unknown): v is SkinId {
  return typeof v === "string" && (SKIN_IDS as readonly string[]).includes(v);
}
