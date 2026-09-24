import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { safe, getEvents, getEventTypes } from "@/lib/queries";
import { GalleryClient } from "@/components/gallery/gallery-client";
import type { GalleryImage, GallerySection } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const user = await requireUser();
  const sb = await createClient();

  const [images, sections, events, eventTypes] = await Promise.all([
    safe(async () => {
      const { data } = await sb
        .from("event_gallery")
        .select("*, events(id, name, event_type)")
        .order("created_at", { ascending: false })
        .limit(400);
      return (data ?? []) as (GalleryImage & { events?: { id: string; name: string; event_type: string } | null })[];
    }, []),
    safe(async () => {
      const { data } = await sb
        .from("event_gallery_sections")
        .select("*, events(id, name, event_type)")
        .order("sort_order")
        .order("created_at")
        .limit(300);
      return (data ?? []) as (GallerySection & { events?: { id: string; name: string; event_type: string } | null })[];
    }, []),
    getEvents({}),
    getEventTypes(),
  ]);

  return (
    <GalleryClient
      images={images}
      sections={sections}
      events={events}
      eventTypes={eventTypes}
      role={user.role}
    />
  );
}
