"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerShell } from "@/components/player-shell";
import type { Game } from "@/lib/games";
import { START_LIVES } from "@/lib/games/ranaria/constants";
import {
  RanariaEngine,
  type RanariaSnapshot,
} from "@/lib/games/ranaria/engine";
import { SKINS } from "@/lib/games/ranaria/skins";
import { useIsTouch } from "@/lib/use-is-touch";
import { useSkin } from "@/lib/use-skin";

const INITIAL_SNAPSHOT: RanariaSnapshot = {
  phase: "ready",
  paused: false,
  score: 0,
  lives: START_LIVES,
  level: 1,
};

const CONTROLS = [
  { keys: ["↑", "↓", "←", "→"], action: "Saltar" },
  { keys: ["W", "A", "S", "D"], action: "Saltar" },
  { keys: ["P", "Esc"], action: "Pausar" },
];

// Sin esto, el botón conserva el foco y Espacio lo activaría de nuevo.
const blurFocused = () => {
  if (document.activeElement instanceof HTMLElement)
    document.activeElement.blur();
};

export function RanariaPlayer({ game }: { game: Game }) {
  // useSyncExternalStore: false en el servidor, valor real tras hidratar, sin mismatch.
  const isTouch = useIsTouch();
  const [skin, setSkin] = useSkin(game.id);
  // El engine se crea una vez; el skin vigente se lee del ref y luego se cambia en caliente.
  const skinRef = useRef(skin);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RanariaEngine | null>(null);
  const [snapshot, setSnapshot] = useState<RanariaSnapshot>(INITIAL_SNAPSHOT);

  // Motor creado en el efecto: en Strict Mode, destroy() cancela el loop duplicado.
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new RanariaEngine(
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

  return (
    <PlayerShell
      game={game}
      score={snapshot.score}
      lives={snapshot.lives}
      level={snapshot.level}
      paused={snapshot.paused}
      over={snapshot.phase === "gameover"}
      controlsDisabled={snapshot.phase === "ready"}
      crtClassName="ranaria-crt"
      pauseHint={
        isTouch
          ? "PULSA REANUDAR PARA CONTINUAR"
          : "PULSA P O REANUDAR PARA CONTINUAR"
      }
      onTogglePause={togglePause}
      onEnd={end}
      onRestart={restart}
      skin={skin}
      onSkinChange={setSkin}
    >
      <canvas ref={canvasRef} aria-label={`Partida de ${game.title}`} />
      {snapshot.phase === "ready" && (
        <div className="crt-content ranaria-ready">
          <div>
            <dl className="ranaria-controls">
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
            <div className="pixel ranaria-start">PULSA ESPACIO</div>
            {isTouch && <p className="pixel ranaria-touch">REQUIERE TECLADO</p>}
          </div>
        </div>
      )}
    </PlayerShell>
  );
}
