"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerShell } from "@/components/player-shell";
import type { Game } from "@/lib/games";
import { CaidaEngine, type CaidaSnapshot } from "@/lib/games/caida/engine";
import { useIsTouch } from "@/lib/use-is-touch";

const INITIAL_SNAPSHOT: CaidaSnapshot = {
  phase: "ready",
  paused: false,
  score: 0,
  lines: 0,
  level: 1,
};

const CONTROLS = [
  { keys: ["←", "→"], action: "Mover" },
  { keys: ["↑", "X"], action: "Rotar" },
  { keys: ["↓"], action: "Bajar" },
  { keys: ["Espacio"], action: "Caída" },
  { keys: ["P"], action: "Pausar" },
];

// Sin esto, el botón conserva el foco y Espacio lo activaría en vez de soltar la pieza.
const blurFocused = () => {
  if (document.activeElement instanceof HTMLElement)
    document.activeElement.blur();
};

export function CaidaPlayer({ game }: { game: Game }) {
  const isTouch = useIsTouch();
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
    blurFocused();
    if (snapshot.paused) engineRef.current?.resume();
    else engineRef.current?.pause();
  };

  const end = () => {
    blurFocused();
    engineRef.current?.end();
  };

  const restart = () => {
    blurFocused();
    engineRef.current?.restart();
  };

  return (
    <PlayerShell
      game={game}
      score={snapshot.score}
      lines={snapshot.lines}
      level={snapshot.level}
      paused={snapshot.paused}
      over={snapshot.phase === "gameover"}
      controlsDisabled={snapshot.phase === "ready"}
      crtClassName="caida-crt"
      pauseHint="PULSA P O REANUDAR PARA CONTINUAR"
      onTogglePause={togglePause}
      onEnd={end}
      onRestart={restart}
    >
      <canvas ref={canvasRef} aria-label={`Partida de ${game.title}`} />
      {snapshot.phase === "ready" && (
        <div className="crt-content caida-ready">
          <div>
            <dl className="caida-controls">
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
            <div className="pixel neon-magenta caida-start">PULSA ESPACIO</div>
            {isTouch && (
              <div className="pixel neon-yellow caida-touch">
                REQUIERE TECLADO
              </div>
            )}
          </div>
        </div>
      )}
    </PlayerShell>
  );
}
