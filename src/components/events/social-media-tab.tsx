"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SocialAccount, SocialPost, EventRow } from "@/lib/types";
import { PLATFORM_NAMES } from "@/lib/types";
import { EmptyState, Tag, StatusBadge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { formatNumber, formatDate, formatDateTime } from "@/lib/utils";
import { isYouTubeUrl, fetchYouTubeMetrics, isoToLocalInput } from "@/lib/social-sync";
import {
  Share2, Plus, Link2, Unlink, Pencil, Trash2, ExternalLink, Eye, ThumbsUp,
  MessageSquare, Repeat2, Loader2, Instagram, Youtube, Facebook, Globe, Music2, Sparkles,
} from "lucide-react";

const POST_TYPES = ["Post", "Video", "Reel", "Story", "Live", "Article", "Other"] as const;

const PLATFORM_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Facebook: Facebook,
  Instagram: Instagram,
  YouTube: Youtube,
  TikTok: Music2,
  Website: Globe,
  Other: Globe,
};

export function SocialMediaTab({
  event, accounts, allAccounts, posts, canWrite,
}: {
  event: EventRow;
  accounts: SocialAccount[];          // accounts linked to this event
  allAccounts: SocialAccount[];       // registry for linking
  posts: (SocialPost & { social_accounts?: SocialPost["social_accounts"] })[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [linkOpen, setLinkOpen] = useState(false);
  const [postModal, setPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [ytBusy, setYtBusy] = useState(false);
  const [ytHint, setYtHint] = useState<string | null>(null);
  const [ytError, setYtError] = useState<string | null>(null);

  // link modal state
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  // post form state
  const [form, setForm] = useState({
    account_id: "", post_type: "Post" as (typeof POST_TYPES)[number],
    post_url: "", content_summary: "", campaign_tag: event.campaign_tag,
    posted_at: "", views: "0", likes: "0", comments_count: "0", shares: "0",
  });

  const linkedIds = useMemo(() => new Set(accounts.map((a) => a.id)), [accounts]);
  const linkable = useMemo(
    () => allAccounts.filter((a) => a.is_active && !linkedIds.has(a.id)),
    [allAccounts, linkedIds],
  );

  const totals = useMemo(() => ({
    views: posts.reduce((s, p) => s + p.views, 0),
    likes: posts.reduce((s, p) => s + p.likes, 0),
    comments: posts.reduce((s, p) => s + p.comments_count, 0),
    shares: posts.reduce((s, p) => s + p.shares, 0),
  }), [posts]);

  const filteredPosts = useMemo(() => {
    if (!q.trim()) return posts;
    const t = q.toLowerCase();
    return posts.filter((p) =>
      p.content_summary.toLowerCase().includes(t) ||
      (p.social_accounts?.handle ?? "").toLowerCase().includes(t) ||
      p.campaign_tag.toLowerCase().includes(t));
  }, [posts, q]);

  const openLinkModal = () => {
    setSelectedAccounts([]);
    setLinkOpen(true);
  };

  const linkAccounts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAccounts.length === 0) { toast("Select at least one account.", "error"); return; }
    setBusy(true);
    try {
      const sb = createClient();
      const rows = selectedAccounts.map((id) => ({ event_id: event.id, account_id: id }));
      const { error } = await sb.from("event_social_accounts").insert(rows);
      if (error) throw error;
      toast(`${selectedAccounts.length} account${selectedAccounts.length === 1 ? "" : "s"} linked`);
      setLinkOpen(false);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to link accounts", "error");
    } finally { setBusy(false); }
  };

  const unlink = async (account: SocialAccount) => {
    if (!confirm(`Unlink ${account.display_name} (${account.platform}) from this event? Its posts stay linked to the event.`)) return;
    setBusy(true);
    try {
      const sb = createClient();
      const { error } = await sb.from("event_social_accounts")
        .delete()
        .eq("event_id", event.id)
        .eq("account_id", account.id);
      if (error) throw error;
      toast("Account unlinked");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to unlink", "error");
    } finally { setBusy(false); }
  };

  const openNewPost = () => {
    setEditingPost(null);
    setForm({
      account_id: accounts[0]?.id ?? allAccounts[0]?.id ?? "",
      post_type: "Post", post_url: "", content_summary: "",
      campaign_tag: event.campaign_tag, posted_at: "",
      views: "0", likes: "0", comments_count: "0", shares: "0",
    });
    setError(null);
    setPostModal(true);
  };

  const openEditPost = (p: SocialPost) => {
    setEditingPost(p);
    setForm({
      account_id: p.account_id,
      post_type: p.post_type,
      post_url: p.post_url,
      content_summary: p.content_summary,
      campaign_tag: p.campaign_tag,
      posted_at: p.posted_at ? p.posted_at.slice(0, 16) : "",
      views: String(p.views), likes: String(p.likes),
      comments_count: String(p.comments_count), shares: String(p.shares),
    });
    setError(null);
    setPostModal(true);
  };

  const savePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.account_id) { setError("Select an account."); return; }
    setBusy(true);
    try {
      const sb = createClient();
      const payload = {
        account_id: form.account_id,
        event_id: event.id,
        campaign_tag: form.campaign_tag,
        post_url: form.post_url,
        content_summary: form.content_summary,
        post_type: form.post_type,
        posted_at: form.posted_at ? new Date(form.posted_at).toISOString() : null,
        views: Number(form.views || 0),
        likes: Number(form.likes || 0),
        comments_count: Number(form.comments_count || 0),
        shares: Number(form.shares || 0),
      };
      const { error } = editingPost
        ? await sb.from("social_posts").update(payload).eq("id", editingPost.id)
        : await sb.from("social_posts").insert(payload);
      if (error) throw error;

      // ensure the account is linked to this event
      await sb.from("event_social_accounts")
        .upsert({ event_id: event.id, account_id: form.account_id }, { onConflict: "event_id,account_id" });

      toast(editingPost ? "Post updated" : "Post added");
      setPostModal(false);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save post";
      setError(msg.includes("row-level security") ? "Permission denied." : msg);
    } finally { setBusy(false); }
  };

  const deletePost = async (p: SocialPost) => {
    if (!confirm("Delete this post record?")) return;
    const { error } = await createClient().from("social_posts").delete().eq("id", p.id);
    if (error) { toast(error.message, "error"); return; }
    toast("Post deleted");
    router.refresh();
  };

  // ---- YouTube auto-fill ----
  const autofillYouTube = async () => {
    setYtError(null);
    setYtHint(null);
    setYtBusy(true);
    try {
      const m = await fetchYouTubeMetrics(form.post_url);
      setForm((f) => ({
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

  const platformIcon = (platform: string, size = 16) => {
    const Icon = PLATFORM_ICONS[platform] ?? Globe;
    return <Icon size={size} />;
  };

  return (
    <div className="space-y-6">
      {/* summary */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 150px), 1fr))" }}>
        {([
          { label: "Accounts", value: accounts.length, Icon: Share2 },
          { label: "Posts", value: posts.length, Icon: ExternalLink },
          { label: "Views", value: totals.views, Icon: Eye },
          { label: "Likes", value: totals.likes, Icon: ThumbsUp },
          { label: "Comments", value: totals.comments, Icon: MessageSquare },
          { label: "Shares", value: totals.shares, Icon: Repeat2 },
        ] as const).map(({ label, value, Icon }) => (
          <div key={label} className="rounded-xl border p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500"><Icon size={12} /> {label}</p>
            <p className="text-[19px] font-bold mt-1 tabular-nums">{formatNumber(value)}</p>
          </div>
        ))}
      </div>

      {/* linked accounts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[14px]">Social Media Accounts Used ({accounts.length})</h3>
          {canWrite && (
            <button className="btn btn-primary btn-sm" onClick={openLinkModal}>
              <Link2 size={14} /> Link Accounts
            </button>
          )}
        </div>
        {accounts.length === 0 ? (
          <EmptyState
            icon={Share2}
            title="No social accounts linked"
            description={canWrite
              ? "Link the Facebook pages, Instagram profiles, YouTube channels or TikTok accounts used to promote this event."
              : "Social accounts used for this event will appear here."}
            action={canWrite ? <button onClick={openLinkModal} className="btn btn-primary btn-sm"><Link2 size={14} /> Link Accounts</button> : undefined}
          />
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" }}>
            {accounts.map((a) => (
              <div key={a.id} className="card card-hover p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: "var(--brand-soft)", color: "#1e40af" }}>
                      {platformIcon(a.platform)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-[13.5px] truncate">{a.display_name}</p>
                      <p className="text-[11.5px] text-slate-500 truncate">{a.platform} · {a.handle}</p>
                    </div>
                  </div>
                  {canWrite && (
                    <button className="btn btn-ghost btn-sm hover:!text-red-600" title="Unlink" onClick={() => unlink(a)}><Unlink size={13} /></button>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-[12px] text-slate-500">{formatNumber(a.followers)} followers</span>
                  {a.channels && <Tag color={a.channels.color}>{a.channels.name}</Tag>}
                </div>
                {a.account_url && (
                  <a href={a.account_url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-blue-700 hover:underline mt-1 inline-flex items-center gap-1">
                    <ExternalLink size={11} /> Open profile
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* posts */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-semibold text-[14px]">Posts ({posts.length})</h3>
          <div className="flex items-center gap-2">
            {posts.length > 0 && (
              <input
                className="input" style={{ width: 220 }} placeholder="Search posts…"
                value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search posts"
              />
            )}
            {canWrite && (
              <button className="btn btn-primary btn-sm" onClick={openNewPost} disabled={allAccounts.length === 0}>
                <Plus size={14} /> Add Post
              </button>
            )}
          </div>
        </div>

        {allAccounts.length === 0 && canWrite && (
          <p className="text-[12.5px] text-slate-400 -mt-1 mb-3">
            No social accounts exist yet — an administrator must add them first (Settings → Social Accounts registry).
          </p>
        )}

        {filteredPosts.length === 0 ? (
          <EmptyState
            icon={ExternalLink}
            title={posts.length === 0 ? "No posts recorded" : "No posts match your search"}
            description={posts.length === 0 && canWrite
              ? "Add the posts published for this event with their link and performance metrics."
              : undefined}
            action={posts.length === 0 && canWrite && allAccounts.length > 0 ? (
              <button onClick={openNewPost} className="btn btn-primary btn-sm"><Plus size={14} /> Add Post</button>
            ) : undefined}
          />
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
                      {p.post_url && (
                        <a href={p.post_url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-blue-700 hover:underline inline-flex items-center gap-1 mt-0.5">
                          <ExternalLink size={11} /> View post
                        </a>
                      )}
                    </div>
                  </div>
                  {canWrite && (
                    <div className="flex items-center gap-1">
                      <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => openEditPost(p)}><Pencil size={13} /></button>
                      <button className="btn btn-ghost btn-sm hover:!text-red-600" title="Delete" onClick={() => deletePost(p)}><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[
                    ["Views", p.views], ["Likes", p.likes],
                    ["Comments", p.comments_count], ["Shares", p.shares],
                  ].map(([l, v]) => (
                    <div key={l as string} className="rounded-lg p-2 text-center" style={{ background: "var(--surface-2)" }}>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">{l as string}</p>
                      <p className="font-bold text-[14px] tabular-nums">{formatNumber(v as number)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* link accounts modal */}
      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title="Link Social Media Accounts" wide>
        <form onSubmit={linkAccounts} className="space-y-4">
          <p className="text-[13px] text-slate-500">
            Select the accounts that were used to promote or cover this event. Accounts belong to SAT-7 channels.
          </p>
          {linkable.length === 0 ? (
            <p className="text-[13px] text-slate-400">All active accounts are already linked to this event.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {linkable.map((a) => {
                const checked = selectedAccounts.includes(a.id);
                return (
                  <label
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors"
                    style={checked ? { borderColor: "var(--brand-ink)", background: "var(--brand-soft)" } : undefined}
                  >
                    <input
                      type="checkbox" className="accent-blue-700"
                      checked={checked}
                      onChange={() => setSelectedAccounts((s) => checked ? s.filter((x) => x !== a.id) : [...s, a.id])}
                    />
                    <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                      {platformIcon(a.platform, 14)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold truncate">{a.display_name}</span>
                      <span className="block text-[11.5px] text-slate-500 truncate">{a.platform} · {a.handle} · {formatNumber(a.followers)} followers</span>
                    </span>
                    {a.channels && <Tag color={a.channels.color}>{a.channels.name}</Tag>}
                  </label>
                );
              })}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" className="btn btn-secondary" onClick={() => setLinkOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy || selectedAccounts.length === 0}>
              {busy && <Loader2 size={15} className="animate-spin" />}
              Link {selectedAccounts.length > 0 ? `(${selectedAccounts.length})` : ""}
            </button>
          </div>
        </form>
      </Modal>

      {/* post modal */}
      <Modal open={postModal} onClose={() => setPostModal(false)} title={editingPost ? "Edit Post" : "Add Post"} wide>
        <form onSubmit={savePost} className="space-y-3" noValidate>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="sp-account">Account *</label>
              <select id="sp-account" className="select" required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
                <option value="">— Select —</option>
                {allAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.display_name} ({a.platform}{linkedIds.has(a.id) ? "" : " · not linked"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="sp-type">Post Type</label>
              <select id="sp-type" className="select" value={form.post_type} onChange={(e) => setForm({ ...form, post_type: e.target.value as (typeof POST_TYPES)[number] })}>
                {POST_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="sp-summary">Content Summary</label>
            <input id="sp-summary" className="input" value={form.content_summary} onChange={(e) => setForm({ ...form, content_summary: e.target.value })} placeholder="e.g. Day 1 highlights video" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="sp-url">Post URL</label>
              <div className="flex gap-2">
                <input
                  id="sp-url" className="input" type="url"
                  value={form.post_url}
                  onChange={(e) => { setForm({ ...form, post_url: e.target.value }); setYtHint(null); }}
                  placeholder="https://youtube.com/watch?v=… or facebook.com/…"
                />
                {isYouTubeUrl(form.post_url) && (
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
              <label className="label" htmlFor="sp-date">Posted At</label>
              <input id="sp-date" className="input" type="datetime-local" value={form.posted_at} onChange={(e) => setForm({ ...form, posted_at: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="sp-campaign">Campaign Tag</label>
            <input id="sp-campaign" className="input" value={form.campaign_tag} onChange={(e) => setForm({ ...form, campaign_tag: e.target.value })} placeholder="#DaysOfTheDiocese2026" />
          </div>
          <div>
            <p className="label">Metrics</p>
            <div className="grid grid-cols-4 gap-2">
              <div><label className="label !text-[10.5px]" htmlFor="sp-views">Views</label><input id="sp-views" className="input" type="number" min={0} value={form.views} onChange={(e) => setForm({ ...form, views: e.target.value })} /></div>
              <div><label className="label !text-[10.5px]" htmlFor="sp-likes">Likes</label><input id="sp-likes" className="input" type="number" min={0} value={form.likes} onChange={(e) => setForm({ ...form, likes: e.target.value })} /></div>
              <div><label className="label !text-[10.5px]" htmlFor="sp-comments">Comments</label><input id="sp-comments" className="input" type="number" min={0} value={form.comments_count} onChange={(e) => setForm({ ...form, comments_count: e.target.value })} /></div>
              <div><label className="label !text-[10.5px]" htmlFor="sp-shares">Shares</label><input id="sp-shares" className="input" type="number" min={0} value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} /></div>
            </div>
          </div>
          {error && <p className="rounded-xl px-4 py-2.5 text-[13px]" style={{ background: "var(--red-soft)", color: "#b91c1c" }} role="alert">{error}</p>}
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
