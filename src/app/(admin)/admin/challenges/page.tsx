import { ChallengesTable } from "@/components/admin/challenges-table";
import challengesData from "../data/challenges.json";

// ============================================================================
// Challenges Page
// ============================================================================

export default function ChallengesPage() {
  return <ChallengesTable data={challengesData} />;
}
