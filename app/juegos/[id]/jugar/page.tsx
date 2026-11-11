import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/game-player";
import { GAME_PLAYERS } from "@/components/game-players";
import { getGame } from "@/lib/data";

export default async function GamePlayerPage({
  params,
}: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  const Player = GAME_PLAYERS[game.id] ?? GamePlayer;

  return <Player game={game} />;
}
