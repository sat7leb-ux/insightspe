import { requireUser } from "@/lib/auth";
import { SettingsClient } from "@/components/settings/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  return <SettingsClient user={user} />;
}
