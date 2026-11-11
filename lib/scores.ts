import { createClient } from "@/lib/supabase/client";

const NAME_MAX_LENGTH = 10;

// Deja el nombre en el formato que exige el check de `scores.name`.
export function normalizeName(raw: string): string {
  return raw.trim().toUpperCase().slice(0, NAME_MAX_LENGTH).trim();
}

export async function submitScore(entry: {
  gameId: string;
  name: string;
  score: number;
}): Promise<{ ok: true } | { ok: false }> {
  try {
    const { error } = await createClient()
      .from("scores")
      .insert({
        game_id: entry.gameId,
        name: normalizeName(entry.name),
        score: entry.score,
      });
    if (error) {
      console.error("No se pudo guardar la puntuación:", error.message);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("No se pudo guardar la puntuación:", err);
    return { ok: false };
  }
}
