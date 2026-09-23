import { requireUser } from "@/lib/auth";
import { getConversations, getChannels } from "@/lib/queries";
import { ConversationsClient } from "@/components/conversations/conversations-client";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  await requireUser();
  const [conversations, channels] = await Promise.all([getConversations(), getChannels()]);
  return <ConversationsClient conversations={conversations} channels={channels} />;
}
