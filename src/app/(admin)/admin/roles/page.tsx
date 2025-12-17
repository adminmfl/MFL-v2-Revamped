import { RolesTable } from "@/components/admin/roles-table";
import rolesData from "../data/roles.json";

// ============================================================================
// Roles Page
// ============================================================================

export default function RolesPage() {
  return <RolesTable data={rolesData} />;
}
