import React, { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { api } from "../../../lib/axios";

export default function CommunityFigmaPage() {
  const [leaders, setLeaders] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      api.get("/cms-chatbot/community/leaderboard/"),
      api.get("/cms-chatbot/community/posts/?feed_type=all&location=all"),
    ]).then(([leaderResult, postResult]) => {
      if (!mounted) return;
      const leaderData = leaderResult.status === "fulfilled" ? leaderResult.value.data?.data : null;
      const postData = postResult.status === "fulfilled" ? postResult.value.data?.data : null;
      if (Array.isArray(leaderData)) setLeaders(leaderData.slice(0, 3));
      if (Array.isArray(postData)) setPosts(postData.slice(0, 4));
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const like = async (id) => {
    const previous = posts;
    setPosts((current) => current.map((post) => post.id === id ? { ...post, is_liked: !post.is_liked, likes_count: Math.max(0, Number(post.likes_count || 0) + (post.is_liked ? -1 : 1)) } : post));
    try {
      const response = await api.post(`/cms-chatbot/community/posts/${id}/like/`);
      const updated = response.data?.data || response.data;
      if (updated && typeof updated.likes_count === "number") {
        setPosts((current) => current.map((post) => post.id === id ? { ...post, ...updated } : post));
      }
    } catch {
      setPosts(previous);
    }
  };

  return <div className="figma-screen figma-community-screen">
    <main className="figma-screen-content figma-community-layout">
      <aside>
        <h2>Bảng xếp hạng Eco-Hero</h2>
        <p>Top thành viên gom rác / trekking nhiều nhất tháng này.</p>
        <div className="figma-leader-list">
          {loading && [0, 1, 2].map((item) => <article key={item} className="figma-skeleton-line" aria-hidden="true"><span /><div><span /><span /></div></article>)}
          {!loading && leaders.length === 0 && <p className="figma-data-state">Chưa có dữ liệu xếp hạng.</p>}
          {leaders.map((leader, index) => <article key={leader.id || leader.rank || index}>
            <b className={`rank rank-${index + 1}`}>#{leader.rank || index + 1}</b>
            <span>{leader.initials || leader.avatar_text || leader.name?.slice(0, 2).toUpperCase()}</span>
            <div><h3>{leader.name || leader.user_name}</h3><p>{leader.stats || `${leader.total_distance_km || 0} km · ${leader.total_trash_kg || 0} kg rác`}</p></div>
          </article>)}
        </div>
      </aside>
      <section>
        <h2>Bảng tin cộng đồng</h2>
        <div className="figma-feed">
          {loading && [0, 1].map((item) => <article key={item} className="figma-skeleton-post" aria-hidden="true"><span /><span /><span /></article>)}
          {!loading && posts.length === 0 && <p className="figma-data-state">Chưa có bài viết cộng đồng.</p>}
          {posts.map((post) => <article key={post.id}>
            <header><span>{post.author_initials || "EE"}</span><div><h3>{post.author_name || "Eco-Explorer"}</h3><p>{post.location_tag || "Sơn Trà"} · {post.created_at || post.time_ago || "Vừa xong"}</p></div></header>
            <div className="figma-post-image">{post.thumbnail_url ? <img src={post.thumbnail_url} alt="" /> : <span>Ảnh check-in cảnh đẹp</span>}</div>
            <p>{post.content}</p>
            <footer><button type="button" onClick={() => like(post.id)} className={post.is_liked ? "liked" : ""}><Heart /> {post.likes_count || 0}</button><b>+{post.points_reward || 20} RE-Points</b></footer>
          </article>)}
        </div>
      </section>
    </main>
  </div>;
}
