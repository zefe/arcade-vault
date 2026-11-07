import type { GameCategory, GameColor, ScoreRow } from "@/lib/games";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

// Temporal hasta el paso 18: `Game` de lib/games.ts aún lleva `best` y `plays` estáticos.
export type CatalogGame = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  controls: string | null;
  ranked: boolean;
  best: number | null;
  marks: number;
};

// Temporal hasta el paso 18: pasa a lib/games.ts.
export type RecentScore = {
  name: string;
  score: number;
  gameTitle: string;
  color: GameColor;
  ago: string;
};

const CATEGORIES: readonly string[] = ["ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
const COLORS: readonly string[] = ["cyan", "magenta", "yellow", "green"];

function isCategory(value: string | null): value is GameCategory {
  return value !== null && CATEGORIES.includes(value);
}

function isColor(value: string | null): value is GameColor {
  return value !== null && COLORS.includes(value);
}

function toGame(row: Tables<"games_with_stats">): CatalogGame {
  const { id, title, short, long, cat, cover, color, ranked } = row;
  if (
    id === null ||
    title === null ||
    short === null ||
    long === null ||
    cover === null ||
    ranked === null ||
    !isCategory(cat) ||
    !isColor(color)
  ) {
    throw new Error(`Fila inválida en games_with_stats: ${id ?? "sin id"}`);
  }
  return {
    id,
    title,
    short,
    long,
    cat,
    cover,
    color,
    controls: row.controls,
    ranked,
    best: row.best,
    marks: row.marks ?? 0,
  };
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

function timeAgo(iso: string, now: number): string {
  const minutes = Math.max(
    1,
    Math.floor((now - new Date(iso).getTime()) / 60_000),
  );
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

function toScoreRow(row: Tables<"leaderboard">, rank: number): ScoreRow {
  const { name, score, created_at: createdAt } = row;
  if (name === null || score === null || createdAt === null) {
    throw new Error("Fila inválida en leaderboard");
  }
  return { rank, name, score, date: formatDate(createdAt) };
}

export async function getGames(): Promise<CatalogGame[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games_with_stats")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(`No se pudo leer el catálogo: ${error.message}`);
  return data.map(toGame);
}

export async function getRankedGames(): Promise<CatalogGame[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games_with_stats")
    .select("*")
    .eq("ranked", true)
    .order("sort_order");
  if (error)
    throw new Error(`No se pudieron leer los juegos ranked: ${error.message}`);
  return data.map(toGame);
}

export async function getGame(id: string): Promise<CatalogGame | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games_with_stats")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer el juego: ${error.message}`);
  return data ? toGame(data) : null;
}

export async function getLeaderboard(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .eq("game_id", gameId)
    .order("rank")
    .limit(limit);
  if (error) throw new Error(`No se pudo leer el ranking: ${error.message}`);
  return data.map((row, i) => toScoreRow(row, i + 1));
}

export async function getRecentScores(limit: number): Promise<RecentScore[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at, games(title, color)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error)
    throw new Error(`No se pudieron leer las últimas marcas: ${error.message}`);
  const now = Date.now();
  return data.map((row) => {
    const { title, color } = row.games;
    if (!isColor(color)) throw new Error(`Color inválido en games: ${color}`);
    return {
      name: row.name,
      score: row.score,
      gameTitle: title,
      color,
      ago: timeAgo(row.created_at, now),
    };
  });
}

export async function getTopPlayers(limit: number): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .order("score", { ascending: false })
    .order("created_at")
    .limit(limit);
  if (error)
    throw new Error(`No se pudo leer el top de jugadores: ${error.message}`);
  return data.map((row, i) => toScoreRow(row, i + 1));
}
