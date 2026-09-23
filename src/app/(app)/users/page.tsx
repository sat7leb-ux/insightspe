import { requireRole } from "@/lib/auth";
import { getProfiles } from "@/lib/queries";
import { UsersClient } from "@/components/users/users-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await requireRole("super_admin", "admin");
  const profiles = await getProfiles();
  return <UsersClient profiles={profiles} currentUserId={user.id} currentRole={user.role} />;
}
