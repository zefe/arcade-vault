"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerShell } from "@/components/player-shell";
import type { Game } from "@/lib/games";
import { CaidaEngine, type CaidaSnapshot } from "@/lib/games/caida/engine";

const INITIAL_SNAPSHOT: CaidaSnapshot = {
  phase: "ready",
  paused: false,
  score: 0,
  lines: 0,
  level: 1,
};

export function CaidaPlayer({ game }: { game: Game }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CaidaEngine | null>(null);
  const [snapshot, setSnapshot] = useState<CaidaSnapshot>(INITIAL_SNAPSHOT);

  // Creado en el efecto y destruido en el cleanup: aguanta el doble montaje de Strict Mode.
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new CaidaEngine(canvasRef.current, setSnapshot);
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
      lines={snapshot.lines}
      level={snapshot.level}
      paused={snapshot.paused}
      over={snapshot.phase === "gameover"}
      crtClassName="caida-crt"
      onTogglePause={togglePause}
      onEnd={end}
      onRestart={restart}
    >
      <canvas ref={canvasRef} aria-label={`Partida de ${game.title}`} />
    </PlayerShell>
  );
}
