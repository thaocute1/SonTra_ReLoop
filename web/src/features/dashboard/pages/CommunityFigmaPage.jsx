import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Heart,
  MapPin,
  MessageCircle,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "../../../lib/axios";
import { realtimeBus } from "../../../lib/realtimeBus";
import { PageHeader } from "../../../components/ui/SaasPrimitives";
import { extractErrorMessage } from "../../../utils/apiError";
import IncidentReportModal from "../components/IncidentReportModal";

const DEFAULT_POST_IMAGE =
  "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80";

const FEED_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "bql", label: "Thông báo BQL" },
  { id: "user", label: "Nhật ký Du khách" },
  { id: "events", label: "Chiến dịch Dọn rác" },
];

export default function CommunityFigmaPage() {
  const [feedType, setFeedType] = useState("all");
  const [leaders, setLeaders] = useState([]);
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  // Create Post modal
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    collected_kg: "",
    location_tag: "Đỉnh Bàn Cờ",
    thumbnail_url: DEFAULT_POST_IMAGE,
  });

  // Incident modal
  const [incidentOpen, setIncidentOpen] = useState(false);

  // Comments state
  const [openCommentPostId, setOpenCommentPostId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [submittingCommentId, setSubmittingCommentId] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 4000);
  };

  const loadCommunity = useCallback(async (activeTab = feedType) => {
    setLoading(true);
    const queryFeed = activeTab === "events" ? "all" : activeTab;
    const [leaderResult, postResult, eventResult] = await Promise.allSettled([
      api.get("/cms-chatbot/community/leaderboard/"),
      api.get(`/cms-chatbot/community/posts/?feed_type=${queryFeed}&location=all`),
      api.get("/cms-chatbot/community/events/"),
    ]);

    if (leaderResult.status === "fulfilled" && Array.isArray(leaderResult.value.data?.data)) {
      setLeaders(leaderResult.value.data.data.slice(0, 5));
    }
    if (postResult.status === "fulfilled" && Array.isArray(postResult.value.data?.data)) {
      setPosts(postResult.value.data.data);
    }
    if (eventResult.status === "fulfilled" && Array.isArray(eventResult.value.data?.data)) {
      setEvents(eventResult.value.data.data);
    }
    setLoading(false);
  }, [feedType]);

  useEffect(() => {
    loadCommunity(feedType);
    const unsubscribe = realtimeBus.subscribe((event) => {
      if (event.type === "POST_STATUS_CHANGED" || event.type === "POST_CREATED") {
        loadCommunity(feedType);
      }
    });
    return () => unsubscribe();
  }, [feedType, loadCommunity]);

  const handleLike = async (postId) => {
    const previous = posts;
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              is_liked: !post.is_liked,
              likes_count: Math.max(0, Number(post.likes_count || 0) + (post.is_liked ? -1 : 1)),
            }
          : post
      )
    );
    try {
      const response = await api.post(`/cms-chatbot/community/posts/${postId}/like/`);
      const updated = response.data?.data || response.data;
      if (updated && typeof updated.likes_count === "number") {
        setPosts((current) =>
          current.map((post) => (post.id === postId ? { ...post, ...updated } : post))
        );
      }
    } catch {
      setPosts(previous);
    }
  };

  const handleAddComment = async (e, postId) => {
    e.preventDefault();
    const content = (commentDrafts[postId] || "").trim();
    if (!content || submittingCommentId === postId) return;
    setSubmittingCommentId(postId);
    try {
      const res = await api.post(`/cms-chatbot/community/posts/${postId}/comments/`, { content });
      const created = res.data?.data;
      if (created) {
        setPosts((current) =>
          current.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments_count: Number(p.comments_count || 0) + 1,
                  comments: [...(Array.isArray(p.comments) ? p.comments : []), created],
                }
              : p
          )
        );
        setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      }
    } catch (err) {
      showToast(extractErrorMessage(err, "Vui lòng đăng nhập để bình luận bài viết."));
    } finally {
      setSubmittingCommentId(null);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.content.trim() || submittingPost) return;
    setSubmittingPost(true);
    try {
      const res = await api.post("/cms-chatbot/community/posts/create/", {
        post_type: "user_story",
        title: newPost.title.trim() || `Nhật ký xanh tại ${newPost.location_tag}`,
        content: newPost.content.trim(),
        collected_kg: Number(newPost.collected_kg || 0),
        location_tag: newPost.location_tag,
        thumbnail_url: newPost.thumbnail_url.trim() || DEFAULT_POST_IMAGE,
      });
      setPostModalOpen(false);
      setNewPost({
        title: "",
        content: "",
        collected_kg: "",
        location_tag: "Đỉnh Bàn Cờ",
        thumbnail_url: DEFAULT_POST_IMAGE,
      });
      realtimeBus.emit("POST_CREATED", res.data?.data || {});
      showToast(
        "Đã gửi bài viết! Bài đăng sẽ hiển thị sau khi BQL duyệt (thưởng +10 RE-Points/kg rác)."
      );
      loadCommunity(feedType);
    } catch (err) {
      showToast(extractErrorMessage(err, "Không thể đăng bài viết lúc này."));
    } finally {
      setSubmittingPost(false);
    }
  };

  return (
    <div className="sr-page">
      <PageHeader
        title="Cộng đồng Sơn Trà ReLoop"
        subtitle="Chia sẻ nhật ký trekking xanh, theo dõi thông báo từ Ban Quản Lý và phản ánh sự cố thực địa"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIncidentOpen(true)}
              className="sr-btn sr-btn-secondary"
            >
              <AlertTriangle size={15} aria-hidden="true" />
              <span>Báo cáo sự cố</span>
            </button>
            <button
              type="button"
              onClick={() => setPostModalOpen(true)}
              className="sr-btn sr-btn-primary"
            >
              <Plus size={15} aria-hidden="true" />
              <span>Đăng bài chia sẻ</span>
            </button>
          </div>
        }
      />

      {toast && (
        <div role="status" className="sr-callout sr-callout-moss justify-between">
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast("")}
            className="sr-btn sr-btn-sm sr-btn-ghost"
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="sr-tabs" role="tablist" aria-label="Lọc bảng tin cộng đồng">
        {FEED_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={feedType === t.id}
            onClick={() => setFeedType(t.id)}
            className={`sr-tab ${feedType === t.id ? "is-selected" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="sr-split-detail">
        {/* Main Feed / Cleanup Events */}
        <section className="flex flex-col gap-4 min-w-0">
          {loading ? (
            <div className="sr-surface text-sm text-[var(--sr-text-muted)]" role="status">
              Đang tải bảng tin cộng đồng Sơn Trà...
            </div>
          ) : feedType === "events" ? (
            events.length === 0 ? (
              <div className="sr-surface text-sm text-[var(--sr-text-muted)]">
                Hiện chưa có chiến dịch dọn rác cộng đồng nào đang mở.
              </div>
            ) : (
              events.map((ev) => (
                <article key={ev.id} className="sr-surface flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="sr-badge sr-badge-moss">Chiến dịch BQL</span>
                      <h2 className="sr-h2 mt-2">{ev.title}</h2>
                      <p className="text-xs text-[var(--sr-text-muted)] mt-1 m-0">
                        {ev.organizer}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[var(--sr-accent)] shrink-0">
                      {ev.reward_points}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-[var(--sr-text-secondary)]">
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={13} aria-hidden="true" />
                      {ev.event_date}
                    </span>
                    <span>Mục tiêu: {ev.target_kg}</span>
                    <span>
                      Tham gia: {ev.participants_count} / {ev.max_participants} người
                    </span>
                  </div>
                </article>
              ))
            )
          ) : posts.length === 0 ? (
            <div className="sr-surface text-sm text-[var(--sr-text-muted)]">
              Chưa có bài viết nào trong mục này. Hãy là người đầu tiên chia sẻ hành trình!
            </div>
          ) : (
            posts.map((post) => {
              const commentsOpen = openCommentPostId === post.id;
              const postComments = Array.isArray(post.comments) ? post.comments : [];
              return (
                <article key={post.id} className="sr-surface flex flex-col gap-3">
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full bg-[var(--sr-accent-soft)] text-[var(--sr-accent)] text-xs font-bold flex items-center justify-center shrink-0">
                        {post.author_initials || "ST"}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm text-[var(--sr-text-primary)]">
                            {post.author_name || "Du khách Sơn Trà"}
                          </strong>
                          <span className="sr-badge sr-badge-neutral">{post.role_badge}</span>
                          {post.is_pinned && (
                            <span className="sr-badge sr-badge-warn">
                              <ShieldAlert size={11} aria-hidden="true" />
                              <span>Ghim BQL</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--sr-text-muted)] m-0">
                          {post.location_tag || "Bán đảo Sơn Trà"} · {post.created_at || post.time_ago}
                        </p>
                      </div>
                    </div>
                    {post.points_reward && (
                      <span className="text-xs font-semibold text-[var(--sr-accent)] shrink-0">
                        {post.points_reward}
                      </span>
                    )}
                  </header>

                  {post.title && <h3 className="sr-h2 m-0">{post.title}</h3>}
                  <p className="text-sm text-[var(--sr-text-secondary)] m-0 whitespace-pre-line">
                    {post.content}
                  </p>

                  {post.thumbnail_url && (
                    <img
                      src={post.thumbnail_url}
                      alt={post.title || "Ảnh cộng đồng Sơn Trà"}
                      className="w-full max-h-72 object-cover rounded-xl bg-[var(--sr-bg-subtle)]"
                    />
                  )}

                  <footer className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--sr-border)]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleLike(post.id)}
                        className={`sr-btn sr-btn-sm ${
                          post.is_liked ? "sr-btn-primary" : "sr-btn-secondary"
                        }`}
                      >
                        <Heart size={13} aria-hidden="true" />
                        <span>{post.likes_count || 0}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenCommentPostId(commentsOpen ? null : post.id)}
                        className="sr-btn sr-btn-sm sr-btn-secondary"
                      >
                        <MessageCircle size={13} aria-hidden="true" />
                        <span>{post.comments_count || postComments.length || 0} bình luận</span>
                      </button>
                    </div>
                    {Number(post.collected_kg || 0) > 0 && (
                      <span className="text-xs font-medium text-[var(--sr-accent)]">
                        Thu gom {post.collected_kg} kg rác
                      </span>
                    )}
                  </footer>

                  {commentsOpen && (
                    <div className="pt-2 border-t border-[var(--sr-border)] flex flex-col gap-2.5">
                      {postComments.length === 0 ? (
                        <p className="text-xs text-[var(--sr-text-muted)] m-0">
                          Chưa có bình luận nào. Hãy để lại lời động viên đầu tiên!
                        </p>
                      ) : (
                        postComments.map((c) => (
                          <div
                            key={c.id}
                            className="rounded-lg bg-[var(--sr-bg-page)] px-3 py-2 text-xs flex flex-col gap-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <strong className="text-[var(--sr-text-primary)]">{c.author_name}</strong>
                              <span className="text-[var(--sr-text-muted)]">{c.created_at}</span>
                            </div>
                            <p className="text-[var(--sr-text-secondary)] m-0">{c.content}</p>
                          </div>
                        ))
                      )}
                      <form
                        onSubmit={(e) => handleAddComment(e, post.id)}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={commentDrafts[post.id] || ""}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          placeholder="Viết bình luận..."
                          className="sr-input flex-1 text-xs"
                        />
                        <button
                          type="submit"
                          disabled={submittingCommentId === post.id}
                          className="sr-btn sr-btn-primary sr-btn-sm"
                        >
                          <Send size={13} aria-hidden="true" />
                          <span>Gửi</span>
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>

        {/* Right Sidebar: Eco-Hero Leaderboard */}
        <aside className="sr-surface flex flex-col gap-4" aria-label="Bảng xếp hạng Eco-Hero">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--sr-accent)]" aria-hidden="true" />
            <h2 className="sr-h2 m-0">Bảng xếp hạng Eco-Hero</h2>
          </div>
          <p className="text-xs text-[var(--sr-text-muted)] m-0">
            Top thành viên tích lũy RE-Points bảo tồn bán đảo Sơn Trà.
          </p>
          {leaders.length === 0 ? (
            <p className="text-xs text-[var(--sr-text-muted)] m-0">Chưa có dữ liệu xếp hạng.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {leaders.map((leader, index) => (
                <div
                  key={leader.id || leader.rank || index}
                  className="flex items-center justify-between gap-3 py-2 border-b border-[var(--sr-border)] last:border-b-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-bold text-[var(--sr-accent)] w-5 sr-tabular">
                      #{leader.rank || index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--sr-text-primary)] truncate">
                        {leader.name || leader.user_name}
                      </div>
                      <div className="text-[11px] text-[var(--sr-text-muted)] truncate">
                        {leader.stats}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[var(--sr-accent)] sr-tabular shrink-0">
                    {Number(leader.points || 0).toLocaleString("vi-VN")} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Modal: Create Post */}
      {postModalOpen && (
        <div
          className="sr-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-post-title"
        >
          <form onSubmit={handleCreatePost} className="sr-modal-panel max-w-lg">
            <header className="flex items-center justify-between border-b border-[var(--sr-border)] px-5 py-4">
              <div>
                <h2 id="create-post-title" className="sr-h2">
                  Chia sẻ nhật ký xanh
                </h2>
                <p className="text-xs text-[var(--sr-text-muted)]">
                  Bài viết sẽ được BQL duyệt và cộng +10 RE-Points cho mỗi kg rác thu gom
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPostModalOpen(false)}
                aria-label="Đóng hộp thoại đăng bài"
                className="sr-btn sr-btn-sm sr-btn-secondary"
              >
                <X size={16} />
              </button>
            </header>

            <div className="p-5 flex flex-col gap-3">
              <div className="sr-field">
                <label className="sr-field-label" htmlFor="post-title">
                  Tiêu đề bài viết
                </label>
                <input
                  id="post-title"
                  className="sr-input"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="Ví dụ: Dọn sạch 3kg rác nhựa ven tuyến Đỉnh Bàn Cờ"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sr-field">
                  <label className="sr-field-label" htmlFor="post-loc">
                    Khu vực
                  </label>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-[var(--sr-text-muted)]" aria-hidden="true" />
                    <input
                      id="post-loc"
                      className="sr-input flex-1"
                      value={newPost.location_tag}
                      onChange={(e) => setNewPost({ ...newPost, location_tag: e.target.value })}
                    />
                  </div>
                </div>
                <div className="sr-field">
                  <label className="sr-field-label" htmlFor="post-kg">
                    Số kg rác thu gom (tùy chọn)
                  </label>
                  <input
                    id="post-kg"
                    type="number"
                    step="0.1"
                    min="0"
                    className="sr-input"
                    value={newPost.collected_kg}
                    onChange={(e) => setNewPost({ ...newPost, collected_kg: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="sr-field">
                <label className="sr-field-label" htmlFor="post-img">
                  Link ảnh minh họa
                </label>
                <input
                  id="post-img"
                  className="sr-input"
                  value={newPost.thumbnail_url}
                  onChange={(e) => setNewPost({ ...newPost, thumbnail_url: e.target.value })}
                />
              </div>
              <div className="sr-field">
                <label className="sr-field-label" htmlFor="post-content">
                  Nội dung chia sẻ *
                </label>
                <textarea
                  id="post-content"
                  rows={4}
                  required
                  className="sr-textarea"
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="Kể lại trải nghiệm cung đường, cảnh báo thiên nhiên hoặc thành quả dọn rác của bạn..."
                />
              </div>
            </div>

            <footer className="flex justify-end gap-2 border-t border-[var(--sr-border)] bg-[var(--sr-bg-page)] px-5 py-3">
              <button
                type="button"
                onClick={() => setPostModalOpen(false)}
                className="sr-btn sr-btn-secondary"
              >
                Hủy
              </button>
              <button type="submit" disabled={submittingPost} className="sr-btn sr-btn-primary">
                {submittingPost ? "Đang gửi..." : "Gửi BQL duyệt"}
              </button>
            </footer>
          </form>
        </div>
      )}

      <IncidentReportModal
        isOpen={incidentOpen}
        onClose={() => setIncidentOpen(false)}
        onSuccess={(inc) => {
          showToast(`Đã gửi báo cáo sự cố #${inc?.id || ""} tới Ban Quản Lý Sơn Trà!`);
        }}
      />
    </div>
  );
}
