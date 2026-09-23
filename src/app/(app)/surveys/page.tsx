import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { safe } from "@/lib/queries";
import { SurveysClient } from "@/components/surveys/surveys-client";
import type { EventSurvey } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SurveysPage() {
  await requireUser();
  const sb = createClient();
  const surveys = await safe(async () => {
    const { data } = await sb
      .from("event_surveys")
      .select("*, events(id, name)")
      .order("submitted_at", { ascending: false })
      .limit(300);
    return (data ?? []) as (EventSurvey & { events?: { id: string; name: string } | null })[];
  }, []);
  return <SurveysClient surveys={surveys} />;
}
