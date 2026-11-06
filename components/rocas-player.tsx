"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PlayerShell } from "@/components/player-shell";
import type { Game } from "@/lib/games";
import { STARTING_LIVES } from "@/lib/games/rocas/constants";
import { RocasEngine, type RocasSnapshot } from "@/lib/games/rocas/engine";

const INITIAL_SNAPSHOT: RocasSnapshot = {
  phase: "ready",
  paused: false,
  score: 0,
  lives: STARTING_LIVES,
  level: 1,
};

const TOUCH_QUERY = "(hover: none) and (pointer: coarse)";

function subscribeToTouch(onChange: () => void) {
  const query = window.matchMedia(TOUCH_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const getIsTouch = () => window.matchMedia(TOUCH_QUERY).matches;
const getIsTouchOnServer = () => false;

const CONTROLS = [
  { keys: ["←", "→"], action: "Rotar" },
  { keys: ["↑"], action: "Propulsar" },
  { keys: ["Espacio"], action: "Disparar" },
  { keys: ["P"], action: "Pausar" },
];

export function RocasPlayer({ game }: { game: Game }) {
  const isTouch = useSyncExternalStore(
    subscribeToTouch,
    getIsTouch,
    getIsTouchOnServer,
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RocasEngine | null>(null);
  const [snapshot, setSnapshot] = useState<RocasSnapshot>(INITIAL_SNAPSHOT);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new RocasEngine(canvasRef.current, setSnapshot);
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

  return (
    <PlayerShell
      game={game}
      score={snapshot.score}
      lives={snapshot.lives}
      level={snapshot.level}
      paused={snapshot.paused}
      over={snapshot.phase === "gameover"}
      crtClassName="rocas-crt"
      onTogglePause={togglePause}
      onEnd={() => engineRef.current?.end()}
      onRestart={() => engineRef.current?.restart()}
    >
      <canvas ref={canvasRef} aria-label={`Partida de ${game.title}`} />
      {snapshot.phase === "ready" && (
        <div className="crt-content rocas-ready">
          <div>
            <dl className="rocas-controls">
              {CONTROLS.map(({ keys, action }) => (
                <div key={action}>
                  <dt>
                    {keys.map((key) => (
                      <kbd key={key}>{key}</kbd>
                    ))}
                  </dt>
                  <dd>{action}</dd>
                </div>
              ))}
            </dl>
            <div className="pixel neon-yellow rocas-start">PULSA ESPACIO</div>
            {isTouch && (
              <div className="pixel neon-magenta rocas-touch">
                REQUIERE TECLADO
              </div>
            )}
          </div>
        </div>
      )}
    </PlayerShell>
  );
}
