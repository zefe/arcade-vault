"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerShell } from "@/components/player-shell";
import type { Game } from "@/lib/games";
import { START_LIVES } from "@/lib/games/bloque-buster/constants";
import {
  BloqueBusterEngine,
  type BloqueBusterSnapshot,
} from "@/lib/games/bloque-buster/engine";
import { SKINS } from "@/lib/games/bloque-buster/skins";
import { useIsTouch } from "@/lib/use-is-touch";
import { useSkin } from "@/lib/use-skin";

const INITIAL_SNAPSHOT: BloqueBusterSnapshot = {
  phase: "ready",
  paused: false,
  score: 0,
  lives: START_LIVES,
  level: 1,
};

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
  const isTouch = useIsTouch();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BloqueBusterEngine | null>(null);
  const [snapshot, setSnapshot] =
    useState<BloqueBusterSnapshot>(INITIAL_SNAPSHOT);
  const [skin, setSkin] = useSkin(game.id);
  // El engine se crea una vez; el skin vigente se lee del ref y luego se cambia en caliente.
  const skinRef = useRef(skin);

  // Motor creado en el efecto: en Strict Mode, destroy() cancela el loop duplicado.
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new BloqueBusterEngine(
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

  return (
    <PlayerShell
      game={game}
      score={snapshot.score}
      lives={snapshot.lives}
      level={snapshot.level}
      paused={snapshot.paused}
      over={snapshot.phase === "gameover"}
      controlsDisabled={snapshot.phase === "ready"}
      crtClassName="bloque-buster-crt"
      skin={skin}
      onSkinChange={setSkin}
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
