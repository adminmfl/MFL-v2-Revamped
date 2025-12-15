import { ActivitiesTable } from "@/components/admin/activities-table";
import activitiesData from "../data/activities.json";

// ============================================================================
// Activities Page
// ============================================================================

export default function ActivitiesPage() {
  return <ActivitiesTable data={activitiesData} />;
}
