"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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

const TOUCH_QUERY = "(hover: none) and (pointer: coarse)";

function subscribeToTouch(onChange: () => void) {
  const query = window.matchMedia(TOUCH_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const getIsTouch = () => window.matchMedia(TOUCH_QUERY).matches;
const getIsTouchOnServer = () => false;

const CONTROLS = [
  { keys: ["←", "→"], action: "Mover la paleta" },
  { keys: ["Ratón"], action: "Mover la paleta" },
  { keys: ["P", "Esc"], action: "Pausar" },
];

// Sin esto, el botón conserva el foco y Espacio lo activaría de nuevo.
const blurFocused = () => {
  if (document.activeElement instanceof HTMLElement)
    document.activeElement.blur();
};

export function BloqueBusterPlayer({ game }: { game: Game }) {
  // Sin aviso en el servidor: el valor real llega tras hidratar, sin mismatch.
  const isTouch = useSyncExternalStore(
    subscribeToTouch,
    getIsTouch,
    getIsTouchOnServer,
  );
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
      lives={snapshot.lives}
      level={snapshot.level}
      paused={snapshot.paused}
      over={snapshot.phase === "gameover"}
      controlsDisabled={snapshot.phase === "ready"}
      pauseHint="PULSA P O REANUDAR PARA CONTINUAR"
      onTogglePause={togglePause}
      onEnd={end}
      onRestart={restart}
    >
      <canvas ref={canvasRef} aria-label={`Partida de ${game.title}`} />
      {snapshot.phase === "ready" && (
        <div className="crt-content bloque-buster-ready">
          <div>
            <dl className="bloque-buster-controls">
              {CONTROLS.map(({ keys, action }) => (
                <div key={keys.join("")}>
                  <dt>
                    {keys.map((key) => (
                      <kbd key={key}>{key}</kbd>
                    ))}
                  </dt>
                  <dd>{action}</dd>
                </div>
              ))}
            </dl>
            <div className="pixel neon-yellow bloque-buster-start">
              PULSA ESPACIO
            </div>
            {isTouch && (
              <div className="pixel neon-magenta bloque-buster-touch">
                REQUIERE TECLADO O RATÓN
              </div>
            )}
          </div>
        </div>
      )}
    </PlayerShell>
  );
}
