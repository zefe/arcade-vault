import { Home } from "@/components/home";
import { getGames, getRecentScores, getTopPlayers } from "@/lib/data";

export default async function HomePage() {
  const [games, recentScores, topPlayers] = await Promise.all([
    getGames(),
    getRecentScores(5),
    getTopPlayers(5),
  ]);
  return (
    <Home games={games} recentScores={recentScores} topPlayers={topPlayers} />
  );
}
