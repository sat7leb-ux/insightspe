"use client";

import { createClient } from "@/lib/supabase/client";

export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url ?? "");
}

export interface YouTubeMetrics {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string | null;
  views: number;
  likes: number;
  comments: number;
}

/** Fetch public metrics for a YouTube video via our server route (key stays server-side). */
export async function fetchYouTubeMetrics(url: string): Promise<YouTubeMetrics> {
  const res = await fetch("/api/social/youtube", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch YouTube data");
  return json as YouTubeMetrics;
}

/** Fetch fresh metrics and persist them onto an existing post row. */
export async function syncYouTubePost(post: { id: string; post_url: string }): Promise<YouTubeMetrics> {
  const m = await fetchYouTubeMetrics(post.post_url);
  const sb = createClient();
  const { error } = await sb
    .from("social_posts")
    .update({ views: m.views, likes: m.likes, comments_count: m.comments })
    .eq("id", post.id);
  if (error) throw new Error(error.message);
  return m;
}

/** ISO string -> value usable by <input type="datetime-local"> */
export function isoToLocalInput(iso: string | null): string {
  return iso ? iso.slice(0, 16) : "";
}
