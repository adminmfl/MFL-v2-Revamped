import { SubmissionsTable } from "@/components/admin/submissions-table";
import submissionsData from "../data/submissions.json";

// ============================================================================
// Submissions Page
// ============================================================================

export default function SubmissionsPage() {
  return <SubmissionsTable data={submissionsData} />;
}
