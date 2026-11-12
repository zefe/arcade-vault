"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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

const TOUCH_QUERY = "(hover: none) and (pointer: coarse)";

function subscribeToTouch(onChange: () => void) {
  const query = window.matchMedia(TOUCH_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const getIsTouch = () => window.matchMedia(TOUCH_QUERY).matches;
const getIsTouchOnServer = () => false;

const CONTROLS = [
  { keys: ["↑", "↓", "←", "→"], action: "Girar" },
  { keys: ["W", "A", "S", "D"], action: "Girar" },
  { keys: ["P", "Esc"], action: "Pausar" },
];

// Sin esto, el botón conserva el foco y Espacio lo activaría de nuevo.
const blurFocused = () => {
  if (document.activeElement instanceof HTMLElement)
    document.activeElement.blur();
};

export function SerpentinaPlayer({ game }: { game: Game }) {
  // Sin aviso en el servidor: el valor real llega tras hidratar, sin mismatch.
  const isTouch = useSyncExternalStore(
    subscribeToTouch,
    getIsTouch,
    getIsTouchOnServer,
  );
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

  // Sin `lives`: PlayerShell no pinta Vidas.
  return (
    <PlayerShell
      game={game}
      score={snapshot.score}
      level={snapshot.level}
      paused={snapshot.paused}
      over={snapshot.phase === "gameover"}
      controlsDisabled={snapshot.phase === "ready"}
      crtClassName="serpentina-crt"
      pauseHint="PULSA P O REANUDAR PARA CONTINUAR"
      onTogglePause={togglePause}
      onEnd={end}
      onRestart={restart}
    >
      <canvas ref={canvasRef} aria-label={`Partida de ${game.title}`} />
      {snapshot.phase === "ready" && (
        <div className="crt-content serpentina-ready">
          <div>
            <dl className="serpentina-controls">
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
            <div className="pixel neon-yellow serpentina-start">
              PULSA ESPACIO
            </div>
            {isTouch && (
              <div className="pixel neon-magenta serpentina-touch">
                REQUIERE TECLADO
              </div>
            )}
          </div>
        </div>
      )}
    </PlayerShell>
  );
}
