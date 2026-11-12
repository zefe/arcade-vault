"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerShell } from "@/components/player-shell";
import type { Game } from "@/lib/games";
import {
  SerpentinaEngine,
  type SerpentinaSnapshot,
} from "@/lib/games/serpentina/engine";

const INITIAL_SNAPSHOT: SerpentinaSnapshot = {
  phase: "ready",
  paused: false,
  score: 0,
  level: 1,
};

export function SerpentinaPlayer({ game }: { game: Game }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SerpentinaEngine | null>(null);
  const [snapshot, setSnapshot] =
    useState<SerpentinaSnapshot>(INITIAL_SNAPSHOT);

  // Motor creado en el efecto: en Strict Mode, destroy() cancela el loop duplicado.
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new SerpentinaEngine(canvasRef.current, setSnapshot);
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

  // Sin `lives`: PlayerShell no pinta Vidas.
  return (
    <PlayerShell
      game={game}
      score={snapshot.score}
      level={snapshot.level}
      paused={snapshot.paused}
      over={snapshot.phase === "gameover"}
      crtClassName="serpentina-crt"
      onTogglePause={togglePause}
      onEnd={end}
      onRestart={restart}
    >
      <canvas ref={canvasRef} aria-label={`Partida de ${game.title}`} />
    </PlayerShell>
  );
}
