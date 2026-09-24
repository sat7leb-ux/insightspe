import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canWriteEvents, type UserRole } from "@/lib/types";

/**
 * POST /api/social/youtube  { url }
 * Fetches public video metrics (title, channel, published date, views, likes,
 * comments) from the YouTube Data API using the server-side YOUTUBE_API_KEY.
 * The key is never exposed to the browser. No OAuth needed — public stats only.
 */
export async function POST(req: NextRequest) {
  try {
    // auth: any signed-in user with write rights
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !canWriteEvents(profile.role as UserRole)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { url } = (await req.json()) as { url?: string };
    const videoId = extractVideoId(String(url ?? ""));
    if (!videoId) {
      return NextResponse.json({ error: "Not a valid YouTube video URL." }, { status: 400 });
    }

    const key = process.env.YOUTUBE_API_KEY;
    if (!key) {
      return NextResponse.json(
        {
          error: "YouTube auto-sync is not configured. An administrator must add YOUTUBE_API_KEY to the environment variables (Google Cloud → Enable YouTube Data API v3 → Create API key).",
          notConfigured: true,
        },
        { status: 501 },
      );
    }

    const api = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${key}`;
    const r = await fetch(api, { cache: "no-store" });
    const data = await r.json();
    if (!r.ok) {
      const msg = data?.error?.message ?? "YouTube API error";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const v = data.items?.[0];
    if (!v) {
      return NextResponse.json({ error: "Video not found — it may be private or deleted." }, { status: 404 });
    }

    return NextResponse.json({
      videoId,
      title: v.snippet?.title ?? "",
      channelTitle: v.snippet?.channelTitle ?? "",
      publishedAt: v.snippet?.publishedAt ?? null,
      views: Number(v.statistics?.viewCount ?? 0),
      likes: Number(v.statistics?.likeCount ?? 0),
      comments: Number(v.statistics?.commentCount ?? 0),
    });
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?[^#]*v=)([\w-]{11})/i,
    /(?:youtu\.be\/)([\w-]{11})/i,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/i,
    /(?:youtube\.com\/embed\/)([\w-]{11})/i,
    /(?:youtube\.com\/live\/)([\w-]{11})/i,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}
