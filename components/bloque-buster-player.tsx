"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerShell } from "@/components/player-shell";
import type { Game } from "@/lib/games";
import { START_LIVES } from "@/lib/games/bloque-buster/constants";
import {
  BloqueBusterEngine,
  type BloqueBusterSnapshot,
} from "@/lib/games/bloque-buster/engine";

const INITIAL_SNAPSHOT: BloqueBusterSnapshot = {
  phase: "ready",
  paused: false,
  score: 0,
  lives: START_LIVES,
  level: 1,
};

export function BloqueBusterPlayer({ game }: { game: Game }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BloqueBusterEngine | null>(null);
  const [snapshot, setSnapshot] =
    useState<BloqueBusterSnapshot>(INITIAL_SNAPSHOT);

  // Motor creado en el efecto: en Strict Mode, destroy() cancela el loop duplicado.
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new BloqueBusterEngine(canvasRef.current, setSnapshot);
    engineRef.current = engine;
    engine.mount();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const togglePause = () => {
    if (snapshot.paused) engineRef.current?.resume();
    else engineRef.current?.pause();
  };

  const end = () => engineRef.current?.end();

  const restart = () => engineRef.current?.restart();

  return (
    <PlayerShell
      game={game}
      score={snapshot.score}
      lives={snapshot.lives}
      level={snapshot.level}
      paused={snapshot.paused}
      over={snapshot.phase === "gameover"}
      onTogglePause={togglePause}
      onEnd={end}
      onRestart={restart}
    >
      <canvas ref={canvasRef} aria-label={`Partida de ${game.title}`} />
    </PlayerShell>
  );
}
