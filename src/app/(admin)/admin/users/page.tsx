import { UsersTable } from "@/components/admin/users-table";
import usersData from "../data/users.json";

// ============================================================================
// Users Page
// ============================================================================

/**
 * UsersPage - Admin page for managing users.
 *
 * Features:
 * - Data table with sorting, filtering, pagination
 * - Add new user dialog
 * - Edit user dialog
 * - Delete user confirmation
 * - Search and filter by role/status
 */
export default function UsersPage() {
  return <UsersTable data={usersData} />;
}
