import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { safe } from "@/lib/queries";
import { GalleryClient } from "@/components/gallery/gallery-client";
import type { GalleryImage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  await requireUser();
  const sb = createClient();
  const images = await safe(async () => {
    const { data } = await sb
      .from("event_gallery")
      .select("*, events(id, name)")
      .order("created_at", { ascending: false })
      .limit(200);
    return (data ?? []) as (GalleryImage & { events?: { id: string; name: string } | null })[];
  }, []);
  return <GalleryClient images={images} />;
}
