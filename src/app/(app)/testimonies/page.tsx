import { requireUser } from "@/lib/auth";
import { getTestimonies, getChannels } from "@/lib/queries";
import { TestimoniesClient } from "@/components/testimonies/testimonies-client";

export const dynamic = "force-dynamic";

export default async function TestimoniesPage() {
  await requireUser();
  const [testimonies, channels] = await Promise.all([getTestimonies(), getChannels()]);
  return <TestimoniesClient testimonies={testimonies} channels={channels} />;
}
