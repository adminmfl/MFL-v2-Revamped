import { LeaguesTable } from "@/components/admin/leagues-table";
import leaguesData from "../data/leagues.json";

// ============================================================================
// Leagues Page
// ============================================================================

export default function LeaguesPage() {
  return <LeaguesTable data={leaguesData} />;
}
