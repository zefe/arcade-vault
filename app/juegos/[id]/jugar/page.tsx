import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/game-player";
import { RocasPlayer } from "@/components/rocas-player";
import { getGame } from "@/lib/data";

export default async function GamePlayerPage({
  params,
}: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  if (game.id === "rocas") return <RocasPlayer game={game} />;

  return <GamePlayer game={game} />;
}
