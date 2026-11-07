"use client";

import { useEffect, useState } from "react";
import { PlayerShell } from "@/components/player-shell";
import type { Game } from "@/lib/games";

type Run = { score: number; level: number };
const FRESH_RUN: Run = { score: 0, level: 1 };

export function GamePlayer({ game }: { game: Game }) {
  const [run, setRun] = useState<Run>(FRESH_RUN);
  const [lives, setLives] = useState(3);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const { score, level } = run;

  useEffect(() => {
    if (over || paused) return;
    const t = setInterval(() => {
      setRun((r) => {
        const s = r.score + Math.floor(10 + Math.random() * 90);
        return {
          score: s,
          level: s > 0 && s % 2500 < 100 ? r.level + 1 : r.level,
        };
      });
    }, 220);
    return () => clearInterval(t);
  }, [over, paused]);

  const restart = () => {
    setRun(FRESH_RUN);
    setLives(3);
    setPaused(false);
    setOver(false);
  };

  return (
    <PlayerShell
      game={game}
      score={score}
      lives={lives}
      level={level}
      paused={paused}
      over={over}
      onTogglePause={() => setPaused((p) => !p)}
      onEnd={() => setOver(true)}
      onRestart={restart}
    >
      <div className="game-arena">
        <div className="grid-floor"></div>
        <div className="enemy e1"></div>
        <div className="enemy e2"></div>
        <div className="enemy e3"></div>
        <div className="player-ship"></div>
      </div>
    </PlayerShell>
  );
}
