"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SocialAccount, SocialPost, EventRow, Channel } from "@/lib/types";
import { PLATFORM_NAMES, canWriteEvents, type UserRole } from "@/lib/types";
import { PageHeader, Tag, EmptyState, StatCard } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { formatNumber, formatDate, downloadCsv } from "@/lib/utils";
import { isYouTubeUrl, fetchYouTubeMetrics, isoToLocalInput, syncYouTubePost } from "@/lib/social-sync";
import { Sparkles, RefreshCw } from "lucide-react";
import {
  Share2, Plus, Pencil, Trash2, ExternalLink, Eye, ThumbsUp, MessageSquare,
  Repeat2, Loader2, Link2, Search, Download, Facebook, Instagram, Youtube, Globe, Music2,
  CalendarDays, Filter,
} from "lucide-react";

const POST_TYPES = ["Post", "Video", "Reel", "Story", "Live", "Article", "Other"] as const;

const PLATFORM_ICONS: Record<string, typeof Globe> = {
  Facebook: Facebook,
  Instagram: Instagram,
  YouTube: Youtube,
  TikTok: Music2,
  Website: Globe,
  Other: Globe,
};

const platformIcon = (platform: string, size = 16) => {
  const Icon = PLATFORM_ICONS[platform] ?? Globe;
  return <Icon size={size} />;
};

export function SocialMediaClient({
  accounts, posts, events, channels, role,
}: {
  accounts: SocialAccount[];
  posts: (SocialPost & { social_accounts?: SocialPost["social_accounts"] })[];
  events: EventRow[];
  channels: Channel[];
  role: UserRole;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const canWrite = canWriteEvents(role);

  // ---- state ----
  const [view, setView] = useState<"accounts" | "posts">("accounts");
  const [q, setQ] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [busy, setBusy] = useState(false);

  // account modal
  const [accountModal, setAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SocialAccount | null>(null);
  const [accountForm, setAccountForm] = useState({
    platform: "Facebook", handle: "", display_name: "", account_url: "",
    channel_id: "", followers: "0", notes: "",
  });
  const [accountError, setAccountError] = useState<string | null>(null);

  // post modal
  const [postModal, setPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState<(SocialPost & { social_accounts?: SocialPost["social_accounts"] }) | null>(null);
  const [postForm, setPostForm] = useState({
    account_id: "", event_id: "", post_type: "Post" as (typeof POST_TYPES)[number],
    post_url: "", content_summary: "", campaign_tag: "",
    posted_at: "", views: "0", likes: "0", comments_count: "0", shares: "0",
  });
  const [postError, setPostError] = useState<string | null>(null);
  const [ytBusy, setYtBusy] = useState(false);
  const [ytHint, setYtHint] = useState<string | null>(null);
  const [ytError, setYtError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // link account -> events modal
  const [linkModal, setLinkModal] = useState(false);
  const [linkAccount, setLinkAccount] = useState<SocialAccount | null>(null);
  const [linkEventIds, setLinkEventIds] = useState<string[]>([]);
  // events already linked to each account (fetched with posts data)
  const [accountEventLinks, setAccountEventLinks] = useState<Record<string, string[]>>({});

  // ---- derived ----
  const totals = useMemo(() => ({
    views: posts.reduce((s, p) => s + p.views, 0),
    likes: posts.reduce((s, p) => s + p.likes, 0),
    comments: posts.reduce((s, p) => s + p.comments_count, 0),
    shares: posts.reduce((s, p) => s + p.shares, 0),
  }), [posts]);

  const accountsByChannel = useMemo(() => {
    const map = new Map<string, SocialAccount[]>();
    for (const a of accounts) {
      const key = a.channels?.name ?? "Unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return [...map.entries()];
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    let list = accounts;
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter((a) => a.display_name.toLowerCase().includes(t) || a.handle.toLowerCase().includes(t) || a.platform.toLowerCase().includes(t));
    }
    if (platformFilter) list = list.filter((a) => a.platform === platformFilter);
    return list;
  }, [accounts, q, platformFilter]);

  const filteredPosts = useMemo(() => {
    let list = posts;
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter((p) =>
        p.content_summary.toLowerCase().includes(t) ||
        (p.social_accounts?.handle ?? "").toLowerCase().includes(t) ||
        (p.social_accounts?.display_name ?? "").toLowerCase().includes(t) ||
        p.campaign_tag.toLowerCase().includes(t));
    }
    if (platformFilter) list = list.filter((p) => p.social_accounts?.platform === platformFilter);
    if (eventFilter) list = list.filter((p) => p.event_id === eventFilter);
    return list;
  }, [posts, q, platformFilter, eventFilter]);

  const platforms = useMemo(() => [...new Set(accounts.map((a) => a.platform))].sort(), [accounts]);

  // load account-event links lazily (placeholder kept for API shape)
  const loadAccountEventLinks = async (_accountId: string): Promise<string[]> => {
    return [];
  };

  // ---- account CRUD ----
  const openNewAccount = () => {
    setEditingAccount(null);
    setAccountForm({ platform: "Facebook", handle: "", display_name: "", account_url: "", channel_id: "", followers: "0", notes: "" });
    setAccountError(null);
    setAccountModal(true);
  };

  const openEditAccount = (a: SocialAccount) => {
    setEditingAccount(a);
    setAccountForm({
      platform: a.platform, handle: a.handle, display_name: a.display_name,
      account_url: a.account_url, channel_id: a.channel_id ?? "",
      followers: String(a.followers), notes: a.notes,
    });
    setAccountError(null);
    setAccountModal(true);
  };

  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError(null);
    if (!accountForm.display_name.trim()) { setAccountError("Display name is required."); return; }
    setBusy(true);
    try {
      const sb = createClient();
      const payload = {
        platform: accountForm.platform,
        handle: accountForm.handle.trim() || `@${accountForm.display_name.trim().toLowerCase().replace(/\s+/g, "")}`,
        display_name: accountForm.display_name.trim(),
        account_url: accountForm.account_url,
        channel_id: accountForm.channel_id || null,
        followers: Number(accountForm.followers || 0),
        notes: accountForm.notes,
      };
      const { error } = editingAccount
        ? await sb.from("social_accounts").update(payload).eq("id", editingAccount.id)
        : await sb.from("social_accounts").insert(payload);
      if (error) throw error;
      toast(editingAccount ? "Account updated" : "Account added");
      setAccountModal(false);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save account";
      setAccountError(msg.includes("duplicate key") ? "This platform + handle combination already exists." : msg);
    } finally { setBusy(false); }
  };

  const removeAccount = async (a: SocialAccount) => {
    if (!confirm(`Delete ${a.display_name}? Its posts will also be removed.`)) return;
    setBusy(true);
    try {
      const { error } = await createClient().from("social_accounts").delete().eq("id", a.id);
      if (error) throw error;
      toast("Account deleted");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete", "error");
    } finally { setBusy(false); }
  };

  // ---- account <-> event linking ----
  const openLinkModal = async (a: SocialAccount) => {
    setLinkAccount(a);
    setLinkEventIds([]);
    setLinkModal(true);
    // fetch current links
    try {
      const sb = createClient();
      const { data } = await sb.from("event_social_accounts").select("event_id").eq("account_id", a.id);
      setLinkEventIds((data ?? []).map((r: { event_id: string }) => r.event_id));
      setAccountEventLinks((prev) => ({ ...prev, [a.id]: (data ?? []).map((r: { event_id: string }) => r.event_id) }));
    } catch { /* ignore */ }
  };

  const toggleEventLink = (eventId: string) => {
    setLinkEventIds((s) => s.includes(eventId) ? s.filter((x) => x !== eventId) : [...s, eventId]);
  };

  const saveLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkAccount) return;
    setBusy(true);
    try {
      const sb = createClient();
      const before = accountEventLinks[linkAccount.id] ?? [];
      const toAdd = linkEventIds.filter((id) => !before.includes(id));
      const toRemove = before.filter((id) => !linkEventIds.includes(id));

      if (toAdd.length > 0) {
        const { error } = await sb.from("event_social_accounts")
          .insert(toAdd.map((event_id) => ({ event_id, account_id: linkAccount.id })));
        if (error) throw error;
      }
      for (const eid of toRemove) {
        await sb.from("event_social_accounts")
          .delete()
          .eq("account_id", linkAccount.id)
          .eq("event_id", eid);
      }
      toast(`${linkAccount.display_name} linked to ${linkEventIds.length} event${linkEventIds.length === 1 ? "" : "s"}`);
      setLinkModal(false);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update links", "error");
    } finally { setBusy(false); }
  };

  // ---- YouTube auto-fill ----
  const autofillYouTube = async () => {
    setYtError(null);
    setYtHint(null);
    setYtBusy(true);
    try {
      const m = await fetchYouTubeMetrics(postForm.post_url);
      setPostForm((f) => ({
        ...f,
        content_summary: f.content_summary || m.title,
        posted_at: f.posted_at || isoToLocalInput(m.publishedAt),
        views: String(m.views),
        likes: String(m.likes),
        comments_count: String(m.comments),
      }));
      setYtHint(`Fetched “${m.title}” — ${m.channelTitle}`);
    } catch (err) {
      setYtError(err instanceof Error ? err.message : "Could not fetch YouTube data");
    } finally {
      setYtBusy(false);
    }
  };

  // refresh metrics of an existing YouTube post from the API
  const syncPost = async (p: SocialPost) => {
    setSyncingId(p.id);
    try {
      const m = await syncYouTubePost({ id: p.id, post_url: p.post_url });
      toast(`Synced — ${formatNumber(m.views)} views, ${formatNumber(m.likes)} likes`);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Sync failed", "error");
    } finally {
      setSyncingId(null);
    }
  };

  // ---- post CRUD ----
  const openNewPost = () => {
    setEditingPost(null);
    setPostForm({
      account_id: accounts[0]?.id ?? "", event_id: "", post_type: "Post",
      post_url: "", content_summary: "", campaign_tag: "",
      posted_at: "", views: "0", likes: "0", comments_count: "0", shares: "0",
    });
    setPostError(null);
    setPostModal(true);
  };

  const openEditPost = (p: SocialPost & { social_accounts?: SocialPost["social_accounts"] }) => {
    setEditingPost(p);
    setPostForm({
      account_id: p.account_id,
      event_id: p.event_id ?? "",
      post_type: p.post_type,
      post_url: p.post_url,
      content_summary: p.content_summary,
      campaign_tag: p.campaign_tag,
      posted_at: p.posted_at ? p.posted_at.slice(0, 16) : "",
      views: String(p.views), likes: String(p.likes),
      comments_count: String(p.comments_count), shares: String(p.shares),
    });
    setPostError(null);
    setPostModal(true);
  };

  const savePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError(null);
    if (!postForm.account_id) { setPostError("Select an account."); return; }
    setBusy(true);
    try {
      const sb = createClient();
      const payload = {
        account_id: postForm.account_id,
        event_id: postForm.event_id || null,
        campaign_tag: postForm.campaign_tag,
        post_url: postForm.post_url,
        content_summary: postForm.content_summary,
        post_type: postForm.post_type,
        posted_at: postForm.posted_at ? new Date(postForm.posted_at).toISOString() : null,
        views: Number(postForm.views || 0),
        likes: Number(postForm.likes || 0),
        comments_count: Number(postForm.comments_count || 0),
        shares: Number(postForm.shares || 0),
      };
      const { error } = editingPost
        ? await sb.from("social_posts").update(payload).eq("id", editingPost.id)
        : await sb.from("social_posts").insert(payload);
      if (error) throw error;

      // keep the account-event link in sync
      if (postForm.event_id) {
        await sb.from("event_social_accounts")
          .upsert({ event_id: postForm.event_id, account_id: postForm.account_id }, { onConflict: "event_id,account_id" });
      }

      toast(editingPost ? "Post updated" : "Post added");
      setPostModal(false);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save post";
      setPostError(msg.includes("row-level security") ? "Permission denied." : msg);
    } finally { setBusy(false); }
  };

  const deletePost = async (p: SocialPost) => {
    if (!confirm("Delete this post record?")) return;
    const { error } = await createClient().from("social_posts").delete().eq("id", p.id);
    if (error) { toast(error.message, "error"); return; }
    toast("Post deleted");
    router.refresh();
  };

  const exportCsv = () => {
    downloadCsv("social-posts.csv", filteredPosts.map((p) => ({
      Account: p.social_accounts?.display_name ?? "", Platform: p.social_accounts?.platform ?? "",
      Event: p.events?.name ?? "", Campaign: p.campaign_tag, Type: p.post_type,
      Summary: p.content_summary, Posted: p.posted_at ?? "",
      Views: p.views, Likes: p.likes, Comments: p.comments_count, Shares: p.shares,
    })));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Social Media"
        description="SAT-7 social accounts, the events they support, and post performance."
        actions={
          <>
            {view === "posts" && posts.length > 0 && (
              <button onClick={exportCsv} className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
            )}
            {canWrite && view === "accounts" && (
              <button onClick={openNewAccount} className="btn btn-primary btn-sm"><Plus size={15} /> Add Account</button>
            )}
            {canWrite && view === "posts" && (
              <button onClick={openNewPost} className="btn btn-primary btn-sm" disabled={accounts.length === 0}><Plus size={15} /> Add Post</button>
            )}
          </>
        }
      />

      {/* stats */}
      <div className="grid gap-4 stagger" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 170px), 1fr))" }}>
        <StatCard label="Accounts" value={accounts.length} icon={Share2} tone="brand" hint={`${platforms.length} platform${platforms.length === 1 ? "" : "s"}`} />
        <StatCard label="Posts" value={posts.length} icon={ExternalLink} tone="violet" />
        <StatCard label="Total Views" value={formatNumber(totals.views)} icon={Eye} tone="sky" />
        <StatCard label="Likes" value={formatNumber(totals.likes)} icon={ThumbsUp} tone="red" />
        <StatCard label="Comments" value={formatNumber(totals.comments)} icon={MessageSquare} tone="green" />
        <StatCard label="Shares" value={formatNumber(totals.shares)} icon={Repeat2} tone="gold" />
      </div>

      {/* view switch + filters */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-[10px] border overflow-hidden shrink-0">
          {(["accounts", "posts"] as const).map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); setEventFilter(""); }}
              className="px-4 py-1.5 text-[12.5px] font-semibold capitalize transition-colors"
              style={{ background: view === v ? "var(--brand)" : "var(--surface)", color: view === v ? "#fff" : "var(--muted)" }}
            >
              {v} ({v === "accounts" ? accounts.length : posts.length})
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder={view === "accounts" ? "Search accounts…" : "Search posts…"} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        </div>
        <select className="select" style={{ width: "auto" }} value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} aria-label="Filter by platform">
          <option value="">All Platforms</option>
          {PLATFORM_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {view === "posts" && (
          <select className="select" style={{ width: "auto" }} value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} aria-label="Filter by event">
            <option value="">All Events</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        )}
      </div>

      {/* ACCOUNTS VIEW */}
      {view === "accounts" && (
        filteredAccounts.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Share2}
              title={q || platformFilter ? "No accounts match your filters" : "No social accounts yet"}
              description={canWrite
                ? "Add the SAT-7 Facebook pages, Instagram profiles, YouTube channels and TikTok accounts, then link them to the events they support."
                : "Social accounts will appear here once added."}
              action={canWrite && !q && !platformFilter ? <button onClick={openNewAccount} className="btn btn-primary btn-sm"><Plus size={15} /> Add Account</button> : undefined}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {accountsByChannel.map(([channelName, list]) => {
              const visible = list.filter((a) => filteredAccounts.includes(a));
              if (visible.length === 0) return null;
              const ch = channels.find((c) => c.name === channelName);
              return (
                <div key={channelName}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: ch?.color ?? "#94a3b8" }} aria-hidden />
                    <h2 className="font-bold text-[15px] tracking-tight">{channelName}</h2>
                    <span className="badge" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                      {visible.length} account{visible.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 290px), 1fr))" }}>
                    {visible.map((a) => {
                      const eventCount = accountEventLinks[a.id]?.length
                        ?? posts.filter((p) => p.account_id === a.id && p.event_id).length;
                      return (
                        <div key={a.id} className="card card-hover p-4 flex flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: "var(--brand-soft)", color: "#1e40af" }}>
                                {platformIcon(a.platform, 18)}
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-[14px] truncate">{a.display_name}</p>
                                <p className="text-[11.5px] text-slate-500 truncate">{a.platform} · {a.handle}</p>
                              </div>
                            </div>
                            {canWrite && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button className="btn btn-ghost btn-sm !p-1.5" title="Edit" onClick={() => openEditAccount(a)}><Pencil size={13} /></button>
                                <button className="btn btn-ghost btn-sm !p-1.5 hover:!text-red-600" title="Delete" onClick={() => removeAccount(a)}><Trash2 size={13} /></button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <span className="text-[12.5px] text-slate-500">{formatNumber(a.followers)} followers</span>
                            {a.channels && <Tag color={a.channels.color}>{a.channels.name}</Tag>}
                          </div>

                          <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                            {a.account_url && (
                              <a href={a.account_url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-blue-700 hover:underline inline-flex items-center gap-1">
                                <ExternalLink size={11} /> Profile
                              </a>
                            )}
                            <span className="text-[12px] text-slate-400 inline-flex items-center gap-1 ml-auto">
                              <CalendarDays size={11} /> {posts.filter((p) => p.account_id === a.id).length} posts
                            </span>
                          </div>

                          {canWrite && (
                            <button className="btn btn-secondary btn-sm mt-3" onClick={() => openLinkModal(a)}>
                              <Link2 size={13} /> Link to Events
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* POSTS VIEW */}
      {view === "posts" && (
        filteredPosts.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={ExternalLink}
              title={q || platformFilter || eventFilter ? "No posts match your filters" : "No posts recorded"}
              description={canWrite && !q && !platformFilter && !eventFilter
                ? "Add the posts published by SAT-7 accounts, link each to its event, and record performance metrics."
                : undefined}
              action={canWrite && !q && !platformFilter && !eventFilter && accounts.length > 0 ? (
                <button onClick={openNewPost} className="btn btn-primary btn-sm"><Plus size={15} /> Add Post</button>
              ) : undefined}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((p) => (
              <div key={p.id} className="card card-hover p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                      {platformIcon(p.social_accounts?.platform ?? "Other")}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[13.5px]">{p.content_summary || "Untitled post"}</p>
                        <Tag>{p.post_type}</Tag>
                        {p.campaign_tag && <Tag color="#ec4899">{p.campaign_tag}</Tag>}
                      </div>
                      <p className="text-[11.5px] text-slate-500 mt-0.5">
                        {p.social_accounts?.display_name} · {p.social_accounts?.platform}
                        {p.posted_at && ` · ${formatDate(p.posted_at)}`}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {p.events?.id ? (
                          <Link href={`/events/${p.events.id}`} className="text-[12px] font-medium text-blue-700 hover:underline inline-flex items-center gap-1">
                            <CalendarDays size={11} /> {p.events.name}
                          </Link>
                        ) : (
                          <span className="text-[12px] text-slate-400 inline-flex items-center gap-1"><CalendarDays size={11} /> No event linked</span>
                        )}
                        {p.post_url && (
                          <a href={p.post_url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-blue-700 hover:underline inline-flex items-center gap-1">
                            <ExternalLink size={11} /> View post
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  {canWrite && (
                    <div className="flex items-center gap-1">
                      {isYouTubeUrl(p.post_url) && (
                        <button
                          className="btn btn-ghost btn-sm" title="Sync metrics from YouTube"
                          onClick={() => syncPost(p)} disabled={syncingId === p.id}
                        >
                          {syncingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => openEditPost(p)}><Pencil size={13} /></button>
                      <button className="btn btn-ghost btn-sm hover:!text-red-600" title="Delete" onClick={() => deletePost(p)}><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {([["Views", p.views], ["Likes", p.likes], ["Comments", p.comments_count], ["Shares", p.shares]] as const).map(([l, v]) => (
                    <div key={l} className="rounded-lg p-2 text-center" style={{ background: "var(--surface-2)" }}>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">{l}</p>
                      <p className="font-bold text-[14px] tabular-nums">{formatNumber(v)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ACCOUNT MODAL */}
      <Modal open={accountModal} onClose={() => setAccountModal(false)} title={editingAccount ? `Edit ${editingAccount.display_name}` : "Add Social Account"}>
        <form onSubmit={saveAccount} className="space-y-3" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="sm-platform">Platform *</label>
              <select id="sm-platform" className="select" value={accountForm.platform} onChange={(e) => setAccountForm({ ...accountForm, platform: e.target.value })}>
                {PLATFORM_NAMES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="sm-channel">SAT-7 Channel</label>
              <select id="sm-channel" className="select" value={accountForm.channel_id} onChange={(e) => setAccountForm({ ...accountForm, channel_id: e.target.value })}>
                <option value="">— Unassigned —</option>
                {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="sm-name">Display Name *</label>
            <input id="sm-name" className="input" required value={accountForm.display_name} onChange={(e) => setAccountForm({ ...accountForm, display_name: e.target.value })} placeholder="SAT-7 KIDS" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="sm-handle">Handle</label>
              <input id="sm-handle" className="input" value={accountForm.handle} onChange={(e) => setAccountForm({ ...accountForm, handle: e.target.value })} placeholder="@SAT7Kids" />
            </div>
            <div>
              <label className="label" htmlFor="sm-followers">Followers</label>
              <input id="sm-followers" className="input" type="number" min={0} value={accountForm.followers} onChange={(e) => setAccountForm({ ...accountForm, followers: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="sm-url">Account URL</label>
            <input id="sm-url" className="input" type="url" value={accountForm.account_url} onChange={(e) => setAccountForm({ ...accountForm, account_url: e.target.value })} placeholder="https://facebook.com/SAT7Kids" />
          </div>
          <div>
            <label className="label" htmlFor="sm-notes">Notes</label>
            <input id="sm-notes" className="input" value={accountForm.notes} onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })} />
          </div>
          {accountError && <p className="rounded-xl px-4 py-2.5 text-[13px]" style={{ background: "var(--red-soft)", color: "#b91c1c" }} role="alert">{accountError}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" className="btn btn-secondary" onClick={() => setAccountModal(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy}>
              {busy && <Loader2 size={15} className="animate-spin" />}
              {editingAccount ? "Save Changes" : "Add Account"}
            </button>
          </div>
        </form>
      </Modal>

      {/* LINK ACCOUNT TO EVENTS MODAL */}
      <Modal open={linkModal} onClose={() => setLinkModal(false)} title={`Link ${linkAccount?.display_name ?? ""} to Events`} wide>
        <form onSubmit={saveLinks} className="space-y-4">
          <p className="text-[13px] text-slate-500">
            Select the events this account was used for. Links appear in each event&apos;s Social Media tab.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 max-h-[50vh] overflow-y-auto thin-scroll pr-1">
            {events.map((e) => {
              const checked = linkEventIds.includes(e.id);
              return (
                <label
                  key={e.id}
                  className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors"
                  style={checked ? { borderColor: "var(--brand-ink)", background: "var(--brand-soft)" } : undefined}
                >
                  <input
                    type="checkbox" className="accent-blue-700"
                    checked={checked}
                    onChange={() => toggleEventLink(e.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold truncate">{e.name}</span>
                    <span className="block text-[11.5px] text-slate-500 truncate">
                      {formatDate(e.start_date)} · {e.event_type}{e.country ? ` · ${e.country}` : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" className="btn btn-secondary" onClick={() => setLinkModal(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy}>
              {busy && <Loader2 size={15} className="animate-spin" />}
              Save Links ({linkEventIds.length})
            </button>
          </div>
        </form>
      </Modal>

      {/* POST MODAL */}
      <Modal open={postModal} onClose={() => setPostModal(false)} title={editingPost ? "Edit Post" : "Add Post"} wide>
        <form onSubmit={savePost} className="space-y-3" noValidate>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="pm-account">Account *</label>
              <select id="pm-account" className="select" required value={postForm.account_id} onChange={(e) => setPostForm({ ...postForm, account_id: e.target.value })}>
                <option value="">— Select —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.display_name} ({a.platform})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="pm-event">Linked Event</label>
              <select id="pm-event" className="select" value={postForm.event_id} onChange={(e) => setPostForm({ ...postForm, event_id: e.target.value })}>
                <option value="">— None —</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="pm-type">Post Type</label>
              <select id="pm-type" className="select" value={postForm.post_type} onChange={(e) => setPostForm({ ...postForm, post_type: e.target.value as (typeof POST_TYPES)[number] })}>
                {POST_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="pm-date">Posted At</label>
              <input id="pm-date" className="input" type="datetime-local" value={postForm.posted_at} onChange={(e) => setPostForm({ ...postForm, posted_at: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="pm-summary">Content Summary</label>
            <input id="pm-summary" className="input" value={postForm.content_summary} onChange={(e) => setPostForm({ ...postForm, content_summary: e.target.value })} placeholder="e.g. Day 1 highlights video" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="pm-url">Post URL</label>
              <div className="flex gap-2">
                <input
                  id="pm-url" className="input" type="url"
                  value={postForm.post_url}
                  onChange={(e) => { setPostForm({ ...postForm, post_url: e.target.value }); setYtHint(null); }}
                  placeholder="https://youtube.com/watch?v=… or facebook.com/…"
                />
                {isYouTubeUrl(postForm.post_url) && (
                  <button
                    type="button" className="btn btn-secondary shrink-0"
                    onClick={() => autofillYouTube()}
                    disabled={ytBusy}
                    title="Fetch title, date and metrics from YouTube"
                  >
                    {ytBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    <span className="hidden sm:inline">{ytBusy ? "Fetching…" : "Auto-fill"}</span>
                  </button>
                )}
              </div>
              {ytHint && <p className="text-[12px] text-emerald-700 mt-1.5 flex items-center gap-1"><Sparkles size={12} /> {ytHint}</p>}
              {ytError && <p className="text-[12px] text-amber-700 mt-1.5">{ytError}</p>}
            </div>
            <div>
              <label className="label" htmlFor="pm-campaign">Campaign Tag</label>
              <input id="pm-campaign" className="input" value={postForm.campaign_tag} onChange={(e) => setPostForm({ ...postForm, campaign_tag: e.target.value })} placeholder="#DaysOfTheDiocese2026" />
            </div>
          </div>
          <div>
            <p className="label">Metrics</p>
            <div className="grid grid-cols-4 gap-2">
              <div><label className="label !text-[10.5px]" htmlFor="pm-views">Views</label><input id="pm-views" className="input" type="number" min={0} value={postForm.views} onChange={(e) => setPostForm({ ...postForm, views: e.target.value })} /></div>
              <div><label className="label !text-[10.5px]" htmlFor="pm-likes">Likes</label><input id="pm-likes" className="input" type="number" min={0} value={postForm.likes} onChange={(e) => setPostForm({ ...postForm, likes: e.target.value })} /></div>
              <div><label className="label !text-[10.5px]" htmlFor="pm-comments">Comments</label><input id="pm-comments" className="input" type="number" min={0} value={postForm.comments_count} onChange={(e) => setPostForm({ ...postForm, comments_count: e.target.value })} /></div>
              <div><label className="label !text-[10.5px]" htmlFor="pm-shares">Shares</label><input id="pm-shares" className="input" type="number" min={0} value={postForm.shares} onChange={(e) => setPostForm({ ...postForm, shares: e.target.value })} /></div>
            </div>
          </div>
          {postError && <p className="rounded-xl px-4 py-2.5 text-[13px]" style={{ background: "var(--red-soft)", color: "#b91c1c" }} role="alert">{postError}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" className="btn btn-secondary" onClick={() => setPostModal(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy}>
              {busy && <Loader2 size={15} className="animate-spin" />}
              {editingPost ? "Save Post" : "Add Post"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
