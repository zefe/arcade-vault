import { HallOfFame } from "@/components/hall-of-fame";
import { getLeaderboard, getRankedGames } from "@/lib/data";

export default async function SalonPage() {
  const games = await getRankedGames();
  const boards = await Promise.all(
    games.map(async (game) => ({
      game,
      rows: await getLeaderboard(game.id, 12),
    })),
  );
  return <HallOfFame boards={boards} />;
}
