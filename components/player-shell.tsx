"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { CatalogGame } from "@/lib/data";
import { useUser } from "@/lib/user-context";

type PlayerShellProps = {
  game: CatalogGame;
  score: number;
  lives: number;
  level: number;
  paused: boolean;
  over: boolean;
  controlsDisabled?: boolean; // desactiva PAUSA y FIN
  crtClassName?: string; // clase extra para `.crt`
  pauseHint?: string; // texto bajo EN PAUSA
  onTogglePause: () => void;
  onEnd: () => void;
  onRestart: () => void;
  children: ReactNode; // contenido de `.crt-screen`
};

export function PlayerShell({
  game,
  score,
  lives,
  level,
  paused,
  over,
  controlsDisabled = false,
  crtClassName,
  pauseHint = "PULSA REANUDAR PARA CONTINUAR",
  onTogglePause,
  onEnd,
  onRestart,
  children,
}: PlayerShellProps) {
  const { user, saveScore } = useUser();
  // null = not edited yet; falls back to the logged-in user (hydrated after mount) or INVITADO.
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const name = nameInput ?? user?.name ?? "INVITADO";

  const restart = () => {
    setSaved(false);
    onRestart();
  };

  const onSave = () => {
    saveScore({ game: game.id, score, name });
    setSaved(true);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button
            className="btn yellow"
            onClick={onTogglePause}
            disabled={controlsDisabled}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button
            className="btn magenta"
            onClick={onEnd}
            disabled={controlsDisabled}
          >
            FIN
          </button>
          <Link href={`/juegos/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className={crtClassName ? `crt ${crtClassName}` : "crt"}>
        <div className="crt-screen">
          {children}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  {pauseHint}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-over-title"
          >
            <h2 id="game-over-title">FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setNameInput(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                  aria-label="Tus iniciales"
                />
                <button className="btn yellow" onClick={onSave}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/juegos" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
