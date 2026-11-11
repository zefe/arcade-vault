export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  controls: string | null; // null = "TECLADO / TÁCTIL"
  ranked: boolean;
  best: number | null;
  marks: number;
};

export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
};

export type RecentScore = {
  name: string;
  score: number;
  gameTitle: string;
  color: GameColor;
  ago: string; // "hace 5 min"
};

export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
