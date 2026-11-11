import type { ComponentType } from "react";
import { CaidaPlayer } from "@/components/caida-player";
import { RocasPlayer } from "@/components/rocas-player";
import type { Game } from "@/lib/games";

// Juegos con motor real. Los demás usan la simulación de `GamePlayer`.
export const GAME_PLAYERS: Record<string, ComponentType<{ game: Game }>> = {
  rocas: RocasPlayer,
  caida: CaidaPlayer,
};
