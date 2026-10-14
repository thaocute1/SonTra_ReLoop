import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Heart, 
  Menu, 
  Sparkles, 
  Share2, 
  Image as ImageIcon,
  Send,
  MessageCircle
} from "lucide-react";

export default function CommunityPage() {
  const { openSidebar } = useOutletContext() || {};

  // Mock state for interactive likes
  const [posts, setPosts] = useState([
    {
      id: 1,
      authorInitials: "TH",
      authorName: "Thảo Trần",
      location: "Đỉnh Bàn Cờ",
      timeAgo: "2 giờ trước",
      image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80",
      imageCaption: "Ảnh check-in cảnh đẹp",
      content: "Cung đường sáng nay tuyệt đẹp, đã dọn thêm được ít rác ở trạm nghỉ!",
      likes: 24,
      isLiked: false,
      pointsReward: "+20 RE-Points",
    },
    {
      id: 2,
      authorInitials: "TD",
      authorName: "Thành Dương",
      location: "Bãi Nam",
      timeAgo: "5 giờ trước",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      imageCaption: "Ảnh nhặt rác",
      content: "Hoàn thành nhiệm vụ thu gom rác nhựa tại Bãi Nam cùng nhóm bạn.",
      likes: 41,
      isLiked: false,
      pointsReward: "+100 RE-Points",
    },
  ]);

  // Leaderboard data matching image design
  const leaderboard = [
    {
      rank: 1,
      rankBadgeBg: "bg-[#E67E22]",
      initials: "TR",
      name: "Trí",
      stats: "18.2 km · 6.4 kg rác",
    },
    {
      rank: 2,
      rankBadgeBg: "bg-[#2D3732]",
      initials: "AN",
      name: "An",
      stats: "15.7 km · 5.1 kg rác",
    },
    {
      rank: 3,
      rankBadgeBg: "bg-[#3B5A45]",
      initials: "PH",
      name: "Phong",
      stats: "14.3 km · 4.6 kg rác",
    },
    {
      rank: 4,
      rankBadgeBg: "bg-[#8DA696]",
      initials: "LI",
      name: "Linh",
      stats: "12.1 km · 3.8 kg rác",
    },
  ];

  const handleToggleLike = (postId) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            isLiked: !post.isLiked,
            likes: post.isLiked ? post.likes - 1 : post.likes + 1,
          };
        }
        return post;
      })
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Top Header Bar */}
      <header className="w-full border-b border-[#E9EFEC] bg-white sticky top-0 z-30">
        <div className="flex justify-between items-center w-full max-w-7xl mx-auto py-6 px-6 sm:px-10 gap-4">
          <div className="flex items-center gap-3">
            {openSidebar && (
              <button
                type="button"
                className="lg:hidden p-2 bg-[#F7F5F0] text-[#2D3732] rounded-xl border-0 cursor-pointer"
                onClick={openSidebar}
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-[#2D3732] text-xl sm:text-[22px] font-bold tracking-tight font-fraunces m-0">
              Cộng đồng Xanh
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex flex-col w-full max-w-7xl mx-auto p-6 sm:p-10 gap-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Bảng xếp hạng Eco-Hero */}
          <section className="lg:col-span-5 flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-[#2D3732] text-xl sm:text-[22px] font-bold tracking-tight font-fraunces m-0">
                Bảng xếp hạng Eco-Hero
              </h2>
              <p className="text-[#6B7A72] text-xs sm:text-sm font-be-vietnam m-0">
                Top thành viên gom rác / trekking nhiều nhất tháng này.
              </p>
            </div>

            <div className="flex flex-col gap-3.5">
              {leaderboard.map((item) => (
                <div
                  key={item.rank}
                  className="flex items-center bg-white p-4 gap-4 rounded-3xl border border-[#E2E8E4] hover:shadow-sm transition-shadow"
                >
                  {/* Rank Badge */}
                  <span
                    className={`w-7 h-7 ${item.rankBadgeBg} text-white rounded-full flex items-center justify-center font-bold text-xs font-fraunces shrink-0`}
                  >
                    #{item.rank}
                  </span>

                  {/* Avatar */}
                  <div className="w-11 h-11 bg-[#F7F5F0] text-[#4A6B5D] rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border border-[#E2E8E4] font-fraunces">
                    {item.initials}
                  </div>

                  {/* Name & Stats */}
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <span className="text-[#2D3732] text-base font-bold font-fraunces truncate">
                      {item.name}
                    </span>
                    <span className="text-[#6B7A72] text-xs font-be-vietnam truncate mt-0.5">
                      {item.stats}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* RIGHT COLUMN: Bảng tin cộng đồng */}
          <section className="lg:col-span-7 flex flex-col gap-6">
            <h2 className="text-[#2D3732] text-xl sm:text-[22px] font-bold tracking-tight font-fraunces m-0">
              Bảng tin cộng đồng
            </h2>

            {/* Posts List */}
            <div className="flex flex-col gap-6">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="flex flex-col bg-white p-6 gap-4 rounded-3xl border border-[#E2E8E4] shadow-xs hover:shadow-sm transition-shadow"
                >
                  {/* Author Info Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F7F5F0] text-[#4A6B5D] rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 border border-[#E2E8E4] font-fraunces">
                      {post.authorInitials}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#2D3732] text-sm font-bold font-fraunces">
                        {post.authorName}
                      </span>
                      <span className="text-[#6B7A72] text-xs font-be-vietnam">
                        {post.location} · {post.timeAgo}
                      </span>
                    </div>
                  </div>

                  {/* Post Image Container */}
                  <div className="w-full h-64 sm:h-80 bg-[#F7F5F0] rounded-2xl border border-[#E2E8E4] overflow-hidden relative group flex flex-col items-center justify-center">
                    <img
                      src={post.image}
                      alt={post.imageCaption}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                    <span className="absolute text-[#6B7A72] text-xs font-medium font-be-vietnam bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/40">
                      {post.imageCaption}
                    </span>
                  </div>

                  {/* Post Caption */}
                  <p className="text-[#2D3732] text-sm leading-relaxed font-be-vietnam m-0">
                    {post.content}
                  </p>

                  {/* Post Footer Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(post.id)}
                      className="flex items-center gap-2 text-xs font-bold font-be-vietnam text-[#6B7A72] hover:text-[#E74C3C] transition-colors border-0 bg-transparent cursor-pointer"
                    >
                      <Heart
                        className={`w-4 h-4 transition-transform ${
                          post.isLiked
                            ? "fill-[#E74C3C] text-[#E74C3C] scale-110"
                            : "text-[#6B7A72]"
                        }`}
                      />
                      <span>{post.likes}</span>
                    </button>

                    <span className="text-[#B8442C] text-xs font-bold font-be-vietnam">
                      {post.pointsReward}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
