"use client";

import Link from "next/link";
import { useState } from "react";
import type { Game, ScoreRow } from "@/lib/games";

const TOP_CLASS = [" top1", " top2", " top3"];

type Board = { game: Game; rows: ScoreRow[] };

export function HallOfFame({ boards }: { boards: Board[] }) {
  const [tab, setTab] = useState(boards[0]?.game.id);
  const board = boards.find((b) => b.game.id === tab);
  const rows = board?.rows ?? [];

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {boards.map(({ game }) => (
          <button
            key={game.id}
            className={"chip" + (tab === game.id ? " active" : "")}
            onClick={() => setTab(game.id)}
          >
            {game.title}
          </button>
        ))}
      </div>

      {board && rows.length === 0 ? (
        <div className="leaderboard lb-empty">
          <div className="pixel lb-empty-title neon-yellow">SÉ EL PRIMERO</div>
          <p>Todavía no hay marcas en {board.game.title}.</p>
          <Link href={`/juegos/${board.game.id}/jugar`} className="btn yellow">
            JUGAR AHORA
          </Link>
        </div>
      ) : (
        <>
          <div className="podium">
            <div className="podium-slot silver">
              <div className="rank-num">02</div>
              <div className="name">{rows[1]?.name ?? "—"}</div>
              <div className="score">
                {rows[1]?.score.toLocaleString("es-ES") ?? "—"}
              </div>
              <div className="date">{rows[1]?.date ?? "—"}</div>
            </div>
            <div className="podium-slot gold">
              <div
                className="pixel"
                style={{
                  fontSize: 9,
                  color: "var(--gold)",
                  letterSpacing: "0.18em",
                }}
              >
                CAMPEÓN
              </div>
              <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
                01
              </div>
              <div className="name">{rows[0]?.name ?? "—"}</div>
              <div className="score" style={{ fontSize: 20 }}>
                {rows[0]?.score.toLocaleString("es-ES") ?? "—"}
              </div>
              <div className="date">{rows[0]?.date ?? "—"}</div>
            </div>
            <div className="podium-slot bronze">
              <div className="rank-num">03</div>
              <div className="name">{rows[2]?.name ?? "—"}</div>
              <div className="score">
                {rows[2]?.score.toLocaleString("es-ES") ?? "—"}
              </div>
              <div className="date">{rows[2]?.date ?? "—"}</div>
            </div>
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.name}
                className={"tr" + (TOP_CLASS[i] ?? "")}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/juegos" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
