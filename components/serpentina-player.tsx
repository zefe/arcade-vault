"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerShell } from "@/components/player-shell";
import type { Game } from "@/lib/games";
import {
  SerpentinaEngine,
  type SerpentinaSnapshot,
} from "@/lib/games/serpentina/engine";
import { SKINS } from "@/lib/games/serpentina/skins";
import { useIsTouch } from "@/lib/use-is-touch";
import { useSkin } from "@/lib/use-skin";

const INITIAL_SNAPSHOT: SerpentinaSnapshot = {
  phase: "ready",
  paused: false,
  score: 0,
  level: 1,
};

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
  const isTouch = useIsTouch();
  const [skin, setSkin] = useSkin(game.id);
  // El engine se crea una vez; el skin vigente se lee del ref y luego se cambia en caliente.
  const skinRef = useRef(skin);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SerpentinaEngine | null>(null);
  const [snapshot, setSnapshot] =
    useState<SerpentinaSnapshot>(INITIAL_SNAPSHOT);

  // Motor creado en el efecto: en Strict Mode, destroy() cancela el loop duplicado.
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new SerpentinaEngine(
      canvasRef.current,
      setSnapshot,
      SKINS[skinRef.current],
    );
    engineRef.current = engine;
    engine.mount();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Cambio de skin sin recrear el motor: misma partida, nueva paleta.
  useEffect(() => {
    skinRef.current = skin;
    engineRef.current?.setSkin(SKINS[skin]);
  }, [skin]);

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
      skin={skin}
      onSkinChange={setSkin}
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
