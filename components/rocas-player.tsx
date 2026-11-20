"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerShell } from "@/components/player-shell";
import type { Game } from "@/lib/games";
import { STARTING_LIVES } from "@/lib/games/rocas/constants";
import { RocasEngine, type RocasSnapshot } from "@/lib/games/rocas/engine";
import { SKINS } from "@/lib/games/rocas/skins";
import { useIsTouch } from "@/lib/use-is-touch";
import { useSkin } from "@/lib/use-skin";

const INITIAL_SNAPSHOT: RocasSnapshot = {
  phase: "ready",
  paused: false,
  score: 0,
  lives: STARTING_LIVES,
  level: 1,
};

const CONTROLS = [
  { keys: ["←", "→"], action: "Rotar" },
  { keys: ["↑"], action: "Propulsar" },
  { keys: ["Espacio"], action: "Disparar" },
  { keys: ["P"], action: "Pausar" },
];

// Sin esto, el botón conserva el foco y Espacio lo activaría en vez de disparar.
const blurFocused = () => {
  if (document.activeElement instanceof HTMLElement)
    document.activeElement.blur();
};

export function RocasPlayer({ game }: { game: Game }) {
  const isTouch = useIsTouch();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RocasEngine | null>(null);
  const [snapshot, setSnapshot] = useState<RocasSnapshot>(INITIAL_SNAPSHOT);
  const [skin, setSkin] = useSkin(game.id);
  // El engine se crea una vez; el skin vigente se lee del ref y luego se cambia en caliente.
  const skinRef = useRef(skin);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new RocasEngine(
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
      crtClassName="rocas-crt"
      skin={skin}
      onSkinChange={setSkin}
      pauseHint="PULSA P O REANUDAR PARA CONTINUAR"
      onTogglePause={togglePause}
      onEnd={end}
      onRestart={restart}
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
