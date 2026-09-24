import { requireUser } from "@/lib/auth";
import { getPartners } from "@/lib/queries";
import { PartnersClient } from "@/components/partners/partners-client";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const user = await requireUser();
  const partners = await getPartners();
  return <PartnersClient partners={partners} role={user.role} />;
}
