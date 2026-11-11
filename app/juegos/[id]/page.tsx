import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame, getLeaderboard } from "@/lib/data";

const TOP_CLASS = [" top1", " top2", " top3"];

export default async function GameDetailPage({
  params,
}: PageProps<"/juegos/[id]">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  const scores = game.ranked ? await getLeaderboard(id, 10) : [];

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>{game.controls ?? "TECLADO / TÁCTIL"}</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Marcas</div>
              <div className="v">{game.marks.toLocaleString("es-ES")}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{
                  color: "var(--magenta)",
                  textShadow: "0 0 6px rgba(255,0,110,0.5)",
                }}
              >
                {game.best?.toLocaleString("es-ES") ?? "—"}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/juegos/${game.id}/jugar`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/juegos" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
          {!game.ranked && (
            <div className="lb-empty">
              <div className="pixel lb-empty-title muted">
                RANKING NO DISPONIBLE
              </div>
              <p>Este juego es una simulación y no guarda puntuaciones.</p>
            </div>
          )}
          {game.ranked && scores.length === 0 && (
            <div className="lb-empty">
              <div className="pixel lb-empty-title neon-yellow">
                SÉ EL PRIMERO
              </div>
              <p>Todavía no hay marcas en {game.title}.</p>
              <Link href={`/juegos/${game.id}/jugar`} className="btn yellow">
                JUGAR AHORA
              </Link>
            </div>
          )}
          {scores.map((r, i) => (
            <div key={r.name} className={"lb-row" + (TOP_CLASS[i] ?? "")}>
              <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
              <div className="pl">
                {r.name}
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--ink-faint)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {r.date}
                </div>
              </div>
              <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
