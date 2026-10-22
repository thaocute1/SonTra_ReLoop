import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { 
  Heart, 
  Menu, 
  Sparkles, 
  Send, 
  MessageCircle, 
  AlertTriangle, 
  Award, 
  Calendar, 
  Users, 
  MapPin, 
  ShieldAlert, 
  ShieldCheck, 
  Compass, 
  ArrowRight, 
  TrendingUp, 
  Flame, 
  CheckCircle2, 
  Trash2, 
  Camera, 
  FileText,
  ChevronDown,
  X
} from "lucide-react";
import { api } from "../../../lib/axios";
import IncidentReportModal from "../components/IncidentReportModal";
import MyIncidentReportsModal from "../components/MyIncidentReportsModal";

export default function CommunityPage() {
  const navigate = useNavigate();
  const { openSidebar, userPoints } = useOutletContext() || {};
  const user = JSON.parse(localStorage.getItem("user_info") || "null");
  const userName = user?.name || user?.email?.split("@")[0] || "Eco-Explorer";
  const userInitials = userName.substring(0, 2).toUpperCase();

  // State
  const [feedType, setFeedType] = useState("all"); // 'all' | 'user' | 'vendor' | 'bql'
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [cleanupEvents, setCleanupEvents] = useState([]);
  const [impactStats, setImpactStats] = useState({
    total_trash_collected_kg: 1420.5,
    total_green_distance_km: 12580,
    total_doucs_protected_checkins: 945,
    total_incidents_resolved: 38
  });

  // Modal State
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isMyReportsModalOpen, setIsMyReportsModalOpen] = useState(false);
  const [myReportsList, setMyReportsList] = useState([]);
  const [toastMessage, setToastMessage] = useState("");

  // Collapsible Post Box State
  const [isPostBoxExpanded, setIsPostBoxExpanded] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostKg, setNewPostKg] = useState("");
  const [newPostLocation, setNewPostLocation] = useState("Đỉnh Bàn Cờ");
  const [newPostImage, setNewPostImage] = useState("https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80");
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Active Comment Box State: { [postId]: string }
  const [commentInputs, setCommentInputs] = useState({});
  const [openCommentPostId, setOpenCommentPostId] = useState(null);

  // Load Feed Data from API
  const fetchCommunityData = async (currentTab = feedType, loc = selectedLocation) => {
    setLoading(true);
    try {
      // 1. Fetch Posts
      const resPosts = await api.get(`/cms-chatbot/community/posts/?feed_type=${currentTab}&location=${loc}`);
      if (resPosts.data?.data) {
        setPosts(resPosts.data.data);
      }

      // 2. Fetch Leaderboard
      const resLb = await api.get("/cms-chatbot/community/leaderboard/");
      if (resLb.data?.data) {
        setLeaderboard(resLb.data.data);
      }

      // 3. Fetch Cleanup Events
      const resEvents = await api.get("/cms-chatbot/community/events/");
      if (resEvents.data?.data) {
        setCleanupEvents(resEvents.data.data);
      }

      // 4. Fetch Impact Counter
      const resImpact = await api.get("/cms-chatbot/community/impact-counter/");
      if (resImpact.data?.data) {
        setImpactStats(resImpact.data.data);
      }
    } catch (err) {
      console.warn("API error, keeping fallback data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityData(feedType, selectedLocation);
  }, [feedType, selectedLocation]);

  // Handle Tab Switch
  const handleTabChange = (tabId) => {
    setFeedType(tabId);
  };

  // Handle Like Toggle
  const handleToggleLike = async (postId) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const nextLiked = !p.is_liked;
        return {
          ...p,
          is_liked: nextLiked,
          likes_count: nextLiked ? p.likes_count + 1 : p.likes_count - 1
        };
      }
      return p;
    }));

    try {
      await api.post(`/cms-chatbot/community/posts/${postId}/like/`);
    } catch (err) {
      console.warn("Error toggling like:", err);
    }
  };

  // Handle Comment Submit
  const handleAddComment = async (postId) => {
    const text = (commentInputs[postId] || "").trim();
    if (!text) return;

    try {
      const res = await api.post(`/cms-chatbot/community/posts/${postId}/comments/`, {
        content: text,
        author_name: userName
      });

      const newCmt = res.data?.data || {
        id: "c" + Date.now(),
        post_id: postId,
        author_name: userName,
        author_initials: userInitials,
        content: text,
        created_at: "Vừa xong"
      };

      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments_count: (p.comments_count || 0) + 1,
            comments: [...(p.comments || []), newCmt]
          };
        }
        return p;
      }));

      setCommentInputs(prev => ({ ...prev, [postId]: "" }));
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  // Handle Create New Post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) {
      alert("Vui lòng nhập nội dung chia sẻ!");
      return;
    }

    setIsSubmittingPost(true);
    const kg = parseFloat(newPostKg) || 0.0;
    const payload = {
      post_type: "user_story",
      content: newPostContent,
      thumbnail_url: newPostImage,
      collected_kg: kg,
      location_tag: newPostLocation
    };

    try {
      const res = await api.post("/cms-chatbot/community/posts/create/", payload);
      const createdPost = res.data?.data;
      if (createdPost) {
        setPosts(prev => [createdPost, ...prev]);
      }
      
      const points = kg > 0 ? kg * 10 : 10;
      setToastMessage(`Đã đăng bài thành công! Bạn nhận được +${points} RE-Points vì hành động đẹp.`);
      setNewPostContent("");
      setNewPostKg("");
      setIsPostBoxExpanded(false);
      setTimeout(() => setToastMessage(""), 4500);
    } catch (err) {
      console.warn("Fallback post creation:", err);
      const fallbackPost = {
        id: Date.now(),
        author_name: userName,
        author_initials: userInitials,
        author_role: "tourist",
        role_badge: "🏅 Top 3 Eco-Hero",
        post_type: "user_story",
        content: newPostContent,
        thumbnail_url: newPostImage,
        collected_kg: kg,
        location_tag: newPostLocation,
        points_reward: kg > 0 ? `+${kg * 10} RE-Points` : "+10 RE-Points",
        likes_count: 0,
        is_liked: false,
        comments_count: 0,
        comments: [],
        created_at: "Vừa xong",
        time_ago: "Vừa xong"
      };
      setPosts(prev => [fallbackPost, ...prev]);
      setToastMessage(`Đã chia sẻ thành công! Nhận được ${fallbackPost.points_reward}.`);
      setNewPostContent("");
      setNewPostKg("");
      setIsPostBoxExpanded(false);
      setTimeout(() => setToastMessage(""), 4500);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const tabs = [
    { id: "all", label: "Tất Cả Luồng Tin" },
    { id: "user", label: "🌱 Nhật Ký Du Khách", icon: Sparkles },
    { id: "vendor", label: "🧭 Ưu Đãi Đối Tác", icon: Compass },
    { id: "bql", label: "📢 Cảnh Báo & Tin BQL", icon: ShieldAlert },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-[#2D3732] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#4A6B5D] animate-fade-in font-be-vietnam">
          <CheckCircle2 className="w-5 h-5 text-[#8DA696] shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage("")} 
            className="text-white/60 hover:text-white ml-2 text-xs border-0 bg-transparent cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex flex-col w-full max-w-7xl mx-auto p-6 sm:p-10 gap-6">
        
        {/* ================= COMPACT BANNER: ĐỒNG HỒ TÁC ĐỘNG SINH THÁI (NỀN TRẮNG ĐỒNG NHẤT) ================= */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E2E8E4] shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A6B5D] bg-[#E9EFEC] px-3 py-1 rounded-full font-be-vietnam border border-[#DCE5DF]">
                🌱 Tác Động Sinh Thái Toàn Bán Đảo
              </span>
              <span className="text-xs text-[#6B7A72] font-be-vietnam hidden md:inline">
                • Dữ liệu thời gian thực được đồng bộ từ cộng đồng
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#F7F5F0] rounded-2xl p-4 border border-[#E2E8E4] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white text-emerald-700 flex items-center justify-center shrink-0 border border-[#E2E8E4] shadow-xs">
            <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#EFF6F2] text-[#2F5244] flex items-center justify-center shrink-0 border border-[#D4E2D9] shadow-2xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold font-fraunces text-[#2D3732] leading-tight">
                <div className="text-lg sm:text-xl font-bold font-fraunces text-[#1E293B] leading-tight">
                  {impactStats.total_trash_collected_kg.toLocaleString('vi-VN')} kg
                </div>
                <div className="text-xs text-[#6B7A72] font-be-vietnam font-medium mt-0.5">Rác đã thu gom</div>
                <div className="text-xs text-[#64748B] font-be-vietnam font-medium mt-0.5">Rác đã thu gom</div>
              </div>
            </div>

            <div className="bg-[#F7F5F0] rounded-2xl p-4 border border-[#E2E8E4] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white text-amber-700 flex items-center justify-center shrink-0 border border-[#E2E8E4] shadow-xs">
            <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#EFF6F2] text-[#2F5244] flex items-center justify-center shrink-0 border border-[#D4E2D9] shadow-2xs">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold font-fraunces text-[#2D3732] leading-tight">
                <div className="text-lg sm:text-xl font-bold font-fraunces text-[#1E293B] leading-tight">
                  {impactStats.total_green_distance_km.toLocaleString('vi-VN')} km
                </div>
                <div className="text-xs text-[#6B7A72] font-be-vietnam font-medium mt-0.5">Trekking xanh</div>
                <div className="text-xs text-[#64748B] font-be-vietnam font-medium mt-0.5">Trekking xanh</div>
              </div>
            </div>

            <div className="bg-[#F7F5F0] rounded-2xl p-4 border border-[#E2E8E4] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white text-[#4A6B5D] flex items-center justify-center shrink-0 border border-[#E2E8E4] shadow-xs">
            <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#EFF6F2] text-[#2F5244] flex items-center justify-center shrink-0 border border-[#D4E2D9] shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold font-fraunces text-[#2D3732] leading-tight">
                <div className="text-lg sm:text-xl font-bold font-fraunces text-[#1E293B] leading-tight">
                  {impactStats.total_doucs_protected_checkins.toLocaleString('vi-VN')} lượt
                </div>
                <div className="text-xs text-[#6B7A72] font-be-vietnam font-medium mt-0.5">Bảo vệ đàn Voọc</div>
                <div className="text-xs text-[#64748B] font-be-vietnam font-medium mt-0.5">Bảo vệ đàn Voọc</div>
              </div>
            </div>

            <div className="bg-[#F7F5F0] rounded-2xl p-4 border border-[#E2E8E4] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white text-[#B8442C] flex items-center justify-center shrink-0 border border-[#E2E8E4] shadow-xs">
            <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#EFF6F2] text-[#2F5244] flex items-center justify-center shrink-0 border border-[#D4E2D9] shadow-2xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold font-fraunces text-[#2D3732] leading-tight">
                <div className="text-lg sm:text-xl font-bold font-fraunces text-[#1E293B] leading-tight">
                  {impactStats.total_incidents_resolved} / 42 vụ
                </div>
                <div className="text-xs text-[#6B7A72] font-be-vietnam font-medium mt-0.5">Sự cố đã xử lý</div>
                <div className="text-xs text-[#64748B] font-be-vietnam font-medium mt-0.5">Sự cố đã xử lý</div>
              </div>
            </div>
          </div>
        </section>


        {/* ================= BỐ CỤC 3 CỘT (THREE-COLUMN COMMUNITY LAYOUT) ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ================= CỘT TRÁI (3 COLS): THẺ TÁC ĐỘNG CÁ NHÂN ================= */}
          <aside className="lg:col-span-3 space-y-6">
            
            {/* THẺ THỐNG KÊ SINH THÁI CÁ NHÂN (MY ECO STATS) - KHÔNG LẶP AVATAR & TÊN */}
            <div className="bg-white rounded-3xl p-5 border border-[#E2E8E4] shadow-xs space-y-4 font-be-vietnam">
              <div className="flex items-center justify-between border-b border-[#E2E8E4] pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4A6B5D]">
                  <Award className="w-4 h-4 text-[#4A6B5D]" />
            <div className="bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-2xs space-y-4 font-be-vietnam">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2F5244]">
                  <Award className="w-4 h-4 text-[#2F5244]" />
                  <span>Đóng Góp Của Bạn</span>
                </div>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  #3 Eco-Hero
                </span>
              </div>

              {/* Bố Cục Dọc: Số Điểm Lớn Ở Giữa (Không Gãy Dòng) */}
              <div className="p-4 bg-gradient-to-b from-[#F7F5F0] to-[#FAF3EB] rounded-2xl border border-[#F0DCC6] text-center space-y-1">
                <div className="text-3xl font-bold font-fraunces text-[#B8442C]">
              {/* Bố Cục Dọc: Số Điểm Lớn Ở Giữa (Màu Hổ Phách Sang Trọng) */}
              <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] text-center space-y-1">
                <div className="text-3xl font-bold font-fraunces text-[#D97706]">
                  {userPoints ?? user?.total_eco_points ?? 0}
                </div>
                <div className="text-[11px] uppercase tracking-wider font-bold text-[#6B7A72]">
                <div className="text-[11px] uppercase tracking-wider font-bold text-[#64748B]">
                  RE-Points Tích Lũy
                </div>
              </div>

              {/* 2 Chỉ Số Cá Nhân */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-[#F7F5F0] rounded-xl border border-[#E2E8E4] text-center">
                  <div className="font-bold text-[#2D3732] font-fraunces text-sm">14.3 km</div>
                  <div className="text-[11px] text-[#6B7A72] mt-0.5">Trekking an toàn</div>
                <div className="p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-center">
                  <div className="font-bold text-[#1E293B] font-fraunces text-sm">14.3 km</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">Trekking an toàn</div>
                </div>
                <div className="p-2.5 bg-[#F7F5F0] rounded-xl border border-[#E2E8E4] text-center">
                  <div className="font-bold text-emerald-700 font-fraunces text-sm">4.6 kg</div>
                  <div className="text-[11px] text-[#6B7A72] mt-0.5">Rác đã nhặt</div>
                <div className="p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-center">
                  <div className="font-bold text-[#2F5244] font-fraunces text-sm">4.6 kg</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">Rác đã nhặt</div>
                </div>
              </div>

              {/* NÚT THỨ HAI ĐỔI THÀNH: LỊCH SỬ BÁO CÁO CỦA TÔI */}
              {/* NÚT THỨ HAI: LỊCH SỬ BÁO CÁO CỦA TÔI */}
              <button
                type="button"
                onClick={() => setIsMyReportsModalOpen(true)}
                className="w-full py-2.5 rounded-2xl bg-white hover:bg-[#F7F5F0] text-[#2D3732] border border-[#E2E8E4] text-xs font-bold font-be-vietnam cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs"
                className="w-full py-2.5 rounded-2xl bg-white hover:bg-[#F8FAFC] text-[#1E293B] border border-[#E2E8F0] text-xs font-bold font-be-vietnam cursor-pointer transition-all flex items-center justify-center gap-2 shadow-2xs"
              >
                <FileText className="w-4 h-4 text-[#4A6B5D]" />
                <FileText className="w-4 h-4 text-[#2F5244]" />
                <span>📋 Lịch Sử Báo Cáo Của Tôi (2 vụ)</span>
              </button>
            </div>

            {/* QUY ĐỔI QUÀ TẶNG XANH */}
            <div className="p-5 bg-gradient-to-br from-[#FAF3EB] to-[#F7F5F0] rounded-3xl border border-[#F0DCC6] space-y-3 font-be-vietnam">
              <div className="flex items-center gap-2 text-[#B8442C] font-bold text-xs">
            <div className="p-5 bg-[#F8FAFC] rounded-3xl border border-[#E2E8F0] space-y-3 font-be-vietnam shadow-2xs">
              <div className="flex items-center gap-2 text-[#2F5244] font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>Quy Đổi RE-Points</span>
              </div>
              <p className="text-xs text-[#4A5568] leading-relaxed m-0">
              <p className="text-xs text-[#64748B] leading-relaxed m-0">
                Tích lũy từ <strong>100 điểm</strong> để quy đổi lấy Voucher giảm 15% vé tour trekking hoặc nhận quà lưu niệm gỗ tái chế Sơn Trà.
              </p>
              <button
                type="button"
                onClick={() => navigate("/dashboard/trekking")}
                className="w-full py-2 rounded-xl bg-[#4A6B5D] hover:bg-[#3B5A45] !text-white text-xs font-bold cursor-pointer transition-all border-0 shadow-xs flex items-center justify-center gap-1.5"
                className="w-full py-2 rounded-xl bg-[#2F5244] hover:bg-[#243E33] !text-white text-xs font-bold cursor-pointer transition-all border-0 shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>Xem Tour Để Sử Dụng Điểm</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>
            </div>


          </aside>

          {/* ================= CỘT GIỮA (6 COLS): BẢNG TIN CHÍNH ================= */}
          <section className="lg:col-span-6 space-y-5">
            
            {/* ================= KHUNG ĐĂNG BÀI THU GỌN (COLLAPSIBLE POST BOX) ================= */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2E8E4] shadow-xs font-be-vietnam transition-all">
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs font-be-vietnam transition-all">
              {!isPostBoxExpanded ? (
                /* TRẠNG THÁI THU GỌN: 1 DÒNG GỌN GÀNG */
                <div 
                  onClick={() => setIsPostBoxExpanded(true)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-9 h-9 bg-[#4A6B5D] text-white rounded-2xl flex items-center justify-center font-bold text-xs shadow-xs font-fraunces shrink-0">
                  <div className="w-9 h-9 bg-[#2F5244] text-white rounded-2xl flex items-center justify-center font-bold text-xs shadow-xs font-fraunces shrink-0">
                    {userInitials}
                  </div>
                  <div className="flex-1 bg-[#F7F5F0] hover:bg-[#E9EFEC] text-[#6B7A72] text-xs px-4 py-2.5 rounded-2xl transition-colors flex items-center justify-between border border-[#E2E8E4]/60">
                  <div className="flex-1 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#64748B] text-xs px-4 py-2.5 rounded-2xl transition-colors flex items-center justify-between border border-[#E2E8F0]">
                    <span>Hôm nay bạn đã làm điều gì cho Sơn Trà? Chia sẻ ảnh, nhặt rác...</span>
                    <div className="flex items-center gap-2 text-[#4A6B5D]">
                    <div className="flex items-center gap-2 text-[#2F5244]">
                      <Camera className="w-4 h-4" />
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ) : (
                /* TRẠNG THÁI MỞ RỘNG ĐẦY ĐỦ */
                <form onSubmit={handleCreatePost} className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2E8E4]/60">
                    <span className="text-xs font-bold text-[#2D3732] font-fraunces">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                    <span className="text-xs font-bold text-[#1E293B] font-fraunces">
                      Chia Sẻ Hành Động Sinh Thái Mới
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPostBoxExpanded(false)}
                      className="text-[#6B7A72] hover:text-[#2D3732] p-1 border-0 bg-transparent cursor-pointer"
                      className="text-[#64748B] hover:text-[#1E293B] p-1 border-0 bg-transparent cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    autoFocus
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Chia sẻ khoảnh khắc trekking, thành tích nhặt rác, hoặc lời nhắn nhủ bảo tồn..."
                    className="w-full p-3 rounded-2xl border border-[#E2E8E4] text-xs focus:border-[#4A6B5D] outline-none resize-none bg-[#F7F5F0]/60"
                    className="w-full p-3 rounded-2xl border border-[#E2E8F0] text-xs focus:border-[#2F5244] outline-none resize-none bg-[#F8FAFC] text-[#1E293B]"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#4A5568] mb-1">
                      <label className="block text-[11px] font-bold text-[#475569] mb-1">
                        Số kg rác nhặt được (+10 điểm/kg):
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={newPostKg}
                        onChange={(e) => setNewPostKg(e.target.value)}
                        placeholder="Ví dụ: 2.5 kg (+25 RE-Points)"
                        className="w-full p-2 rounded-xl border border-[#E2E8E4] text-xs focus:border-[#4A6B5D] outline-none bg-white"
                        className="w-full p-2.5 rounded-xl border border-[#E2E8F0] text-xs focus:border-[#2F5244] outline-none bg-white text-[#1E293B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#4A5568] mb-1">
                      <label className="block text-[11px] font-bold text-[#475569] mb-1">
                        Địa điểm check-in:
                      </label>
                      <select
                        value={newPostLocation}
                        onChange={(e) => setNewPostLocation(e.target.value)}
                        className="w-full p-2 rounded-xl border border-[#E2E8E4] text-xs focus:border-[#4A6B5D] outline-none bg-white"
                        className="w-full p-2.5 rounded-xl border border-[#E2E8F0] text-xs focus:border-[#2F5244] outline-none bg-white text-[#1E293B]"
                      >
                        <option value="Đỉnh Bàn Cờ">Đỉnh Bàn Cờ</option>
                        <option value="Rừng Cây Đa Ngàn Năm">Rừng Cây Đa Ngàn Năm</option>
                        <option value="Bãi Nam">Bãi Nam</option>
                        <option value="Mũi Nghê">Mũi Nghê</option>
                        <option value="Bãi Rạng">Bãi Rạng</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8E4]/60">
                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                    <button
                      type="button"
                      onClick={() => setIsPostBoxExpanded(false)}
                      className="px-4 py-2 text-xs font-bold text-[#6B7A72] hover:text-[#2D3732] border-0 bg-transparent cursor-pointer"
                      className="px-4 py-2 text-xs font-bold text-[#64748B] hover:text-[#1E293B] border-0 bg-transparent cursor-pointer"
                    >
                      Hủy bỏ
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmittingPost}
                      className="px-5 py-2.5 rounded-2xl bg-[#4A6B5D] hover:bg-[#3B5A45] !text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 border-0 disabled:opacity-60"
                      className="px-5 py-2.5 rounded-2xl bg-[#2F5244] hover:bg-[#243E33] !text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 border-0 disabled:opacity-60"
                    >
                      {isSubmittingPost ? (
                        <span>Đang đăng bài...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-white" />
                          <span className="!text-white">Đăng Lên Cộng Đồng</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* ================= THANH TABS TÁC NHÂN + DROPDOWN LỌC ĐỊA ĐIỂM ================= */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-be-vietnam">
              {/* 4 Tabs Tác Nhân */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
                {tabs.map((tab) => {
                  const isSelected = feedType === tab.id;
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabChange(tab.id)}
                      className={`flex items-center shrink-0 py-2 px-3.5 gap-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                        isSelected
                          ? "bg-[#4A6B5D] !text-white border-[#4A6B5D] shadow-xs"
                          : "bg-white text-[#4A5568] border-[#E2E8E4] hover:bg-[#F7F5F0] hover:text-[#2D3732]"
                          ? "bg-[#2F5244] !text-white border-[#2F5244] shadow-xs"
                          : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC] hover:text-[#1E293B]"
                      }`}
                    >
                      {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* BỘ LỌC ĐỊA ĐIỂM DẠNG DROPDOWN NẰM CẠNH TAB (HỢP NHẤT KHÔNG PHÂN MẢNH) */}
              <div className="relative shrink-0">
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="appearance-none bg-white border border-[#E2E8E4] text-[#4A5568] hover:text-[#2D3732] text-xs font-bold py-2 pl-3 pr-8 rounded-full cursor-pointer outline-none focus:border-[#4A6B5D] shadow-xs"
                  className="appearance-none bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#1E293B] text-xs font-bold py-2 pl-3 pr-8 rounded-full cursor-pointer outline-none focus:border-[#2F5244] shadow-xs"
                >
                  <option value="all">📍 Tất cả địa điểm</option>
                  <option value="Đỉnh Bàn Cờ">📍 Đỉnh Bàn Cờ</option>
                  <option value="Cây Đa">📍 Rừng Cây Đa Di Sản</option>
                  <option value="Bãi Nam">📍 Bãi Nam</option>
                  <option value="Mũi Nghê">📍 Mũi Nghê</option>
                  <option value="Bãi Rạng">📍 Bãi Rạng</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#6B7A72] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Dòng Thời Gian Các Bài Đăng (Feed Posts) */}
            {loading ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-[#E2E8E4]">
                <div className="w-8 h-8 border-4 border-[#4A6B5D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-[#6B7A72] font-be-vietnam">Đang tải bảng tin cộng đồng...</p>
              <div className="text-center py-16 bg-white rounded-3xl border border-[#E2E8F0]">
                <div className="w-8 h-8 border-4 border-[#2F5244] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-[#64748B] font-be-vietnam">Đang tải bảng tin cộng đồng...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-[#E2E8E4] space-y-3">
                <Compass className="w-10 h-10 text-[#6B7A72] mx-auto opacity-40" />
                <p className="text-sm font-bold text-[#2D3732] font-fraunces">Chưa có bài viết nào trong danh mục này</p>
                <p className="text-xs text-[#4A5568] font-be-vietnam">Hãy là người đầu tiên chia sẻ hành trình xanh tại địa điểm này!</p>
              <div className="text-center py-16 bg-white rounded-3xl border border-[#E2E8F0] space-y-3">
                <Compass className="w-10 h-10 text-[#64748B] mx-auto opacity-40" />
                <p className="text-sm font-bold text-[#1E293B] font-fraunces">Chưa có bài viết nào trong danh mục này</p>
                <p className="text-xs text-[#64748B] font-be-vietnam">Hãy là người đầu tiên chia sẻ hành trình xanh tại địa điểm này!</p>
              </div>
            ) : (
              <div className="space-y-5">
                {posts.map((post) => {
                  const isBQL = post.author_role === "admin";
                  const isVendor = post.author_role === "vendor";
                  const isCommentOpen = openCommentPostId === post.id;

                  return (
                    <article
                      key={post.id}
                      className={`bg-white rounded-3xl border transition-shadow overflow-hidden shadow-xs hover:shadow-md ${
                        post.is_pinned 
                          ? "border-amber-400 ring-2 ring-amber-400/20" 
                          : isBQL 
                          ? "border-amber-300" 
                          : isVendor 
                          ? "border-emerald-200" 
                          : "border-[#E2E8E4]"
                          ? "border-[#D1E2D9]" 
                          : "border-[#E2E8F0]"
                      }`}
                    >
                      {/* Banner Pinned của BQL */}
                      {post.is_pinned && (
                        <div className="bg-amber-500 text-white px-5 py-2 text-xs font-bold font-be-vietnam flex items-center justify-between">
                        <div className="bg-amber-600 text-white px-5 py-2 text-xs font-bold font-be-vietnam flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4" />
                            THÔNG BÁO KHẨN CẤP TỪ BAN QUẢN LÝ BÁN ĐẢO SƠN TRÀ
                          </span>
                          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Được ghim</span>
                        </div>
                      )}

                      <div className="p-5 sm:p-6 space-y-4">
                        {/* Author Header */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs shadow-xs font-fraunces ${
                              isBQL 
                                ? "bg-amber-600 text-white" 
                                : isVendor 
                                ? "bg-[#3B5A45] text-white" 
                                : "bg-[#F7F5F0] text-[#4A6B5D] border border-[#E2E8E4]"
                                ? "bg-[#2F5244] text-white" 
                                : "bg-[#EFF6F2] text-[#2F5244] border border-[#E2E8F0]"
                            }`}>
                              {post.author_initials || "EE"}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm font-fraunces text-[#2D3732]">
                                <span className="font-bold text-sm font-fraunces text-[#1E293B]">
                                  {post.author_name}
                                </span>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-be-vietnam ${
                                  isBQL 
                                    ? "bg-amber-100 text-amber-800" 
                                    : isVendor 
                                    ? "bg-emerald-100 text-emerald-800" 
                                    : "bg-[#F7F5F0] text-[#4A6B5D]"
                                    : "bg-[#EFF6F2] text-[#2F5244]"
                                }`}>
                                  {post.role_badge || "Du Khách"}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-[#4A5568] font-be-vietnam mt-0.5">
                              <div className="flex items-center gap-2 text-xs text-[#64748B] font-be-vietnam mt-0.5">
                                <span>{post.time_ago || post.created_at}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-[#4A6B5D] font-medium">
                                <span className="flex items-center gap-1 text-[#2F5244] font-medium">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {post.location_tag}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Badge Số kg rác / RE-Points (Nếu là bài User) */}
                          {post.collected_kg > 0 && (
                            <div className="bg-[#FAF3EB] border border-[#F0DCC6] px-3 py-1 rounded-full text-right shrink-0">
                              <span className="text-xs font-bold text-[#B8442C] font-be-vietnam block">
                            <div className="bg-[#FEF3C7] border border-[#FDE68A] px-3 py-1 rounded-full text-right shrink-0">
                              <span className="text-xs font-bold text-[#D97706] font-be-vietnam block">
                                +{post.collected_kg} kg rác
                              </span>
                              <span className="text-[11px] text-amber-800 font-bold font-be-vietnam">
                              <span className="text-[11px] text-[#B45309] font-bold font-fraunces">
                                {post.points_reward}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Title (nếu có) */}
                        {post.title && (
                          <h3 className="font-bold text-base font-fraunces text-[#2D3732] m-0">
                          <h3 className="font-bold text-base font-fraunces text-[#1E293B] m-0">
                            {post.title}
                          </h3>
                        )}

                        {/* Post Content */}
                        <p className="text-xs sm:text-sm text-[#2D3732] leading-relaxed font-be-vietnam m-0">
                        <p className="text-xs sm:text-sm text-[#334155] leading-relaxed font-be-vietnam m-0">
                          {post.content}
                        </p>

                        {/* Post Image */}
                        {post.thumbnail_url && (
                          <div className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden bg-slate-100 border border-[#E2E8E4]">
                          <div className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden bg-slate-100 border border-[#E2E8F0]">
                            <img
                              src={post.thumbnail_url}
                              alt={post.title || "Ảnh bài đăng"}
                              className="w-full h-full object-cover hover:scale-102 transition-transform duration-500"
                            />
                          </div>
                        )}

                        {/* CTA Card Dành Riêng Cho Bài Vendor */}
                        {isVendor && post.tour_id && (
                          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-be-vietnam">
                          <div className="p-4 bg-[#EFF6F2] rounded-2xl border border-[#D1E2D9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-be-vietnam">
                            <div>
                              <div className="text-xs text-emerald-800 font-bold">Chuyến Trekking Sinh Thái Gợi Ý</div>
                              <div className="text-sm font-bold text-[#2D3732] font-fraunces">{post.tour_title}</div>
                              <div className="text-xs text-[#B8442C] font-bold mt-0.5">{post.tour_price}</div>
                              <div className="text-xs text-[#2F5244] font-bold">Chuyến Trekking Sinh Thái Gợi Ý</div>
                              <div className="text-sm font-bold text-[#1E293B] font-fraunces">{post.tour_title}</div>
                              <div className="text-xs text-[#D97706] font-bold mt-0.5">{post.tour_price}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate("/dashboard/trekking")}
                              className="px-4 py-2 rounded-xl bg-[#4A6B5D] hover:bg-[#3B5A45] !text-white text-xs font-bold cursor-pointer transition-all border-0 shadow-xs flex items-center gap-1.5"
                              className="px-4 py-2 rounded-xl bg-[#2F5244] hover:bg-[#243E33] !text-white text-xs font-bold cursor-pointer transition-all border-0 shadow-xs flex items-center gap-1.5"
                            >
                              <span>Đặt Tour Này</span>
                              <ArrowRight className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>
                        )}

                        {/* Post Actions (Like & Comment) */}
                        <div className="flex items-center justify-between pt-3 border-t border-[#E2E8E4]/60 font-be-vietnam text-xs">
                        <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0] font-be-vietnam text-xs">
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() => handleToggleLike(post.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border-0 cursor-pointer ${
                                post.is_liked
                                  ? "bg-rose-50 text-rose-600 font-bold"
                                  : "bg-[#F7F5F0] text-[#4A5568] hover:text-rose-600"
                                    ? "bg-rose-50 text-rose-600 font-bold"
                                  : "bg-[#F8FAFC] text-[#64748B] hover:text-rose-600"
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${post.is_liked ? "fill-rose-500 text-rose-500" : ""}`} />
                              <span>{post.likes_count}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setOpenCommentPostId(isCommentOpen ? null : post.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F7F5F0] text-[#4A5568] hover:text-[#4A6B5D] transition-all border-0 cursor-pointer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F8FAFC] text-[#64748B] hover:text-[#2F5244] transition-all border-0 cursor-pointer"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>{post.comments_count || 0} bình luận</span>
                            </button>
                          </div>

                          <div className="text-xs text-[#4A5568]">
                          <div className="text-xs text-[#64748B]">
                            {isBQL ? "Thông báo từ BQL" : isVendor ? "Đối tác được BQL duyệt" : "Cộng đồng Sơn Trà"}
                          </div>
                        </div>

                        {/* Comment Section (Mở rộng khi click) */}
                        {isCommentOpen && (
                          <div className="pt-3 border-t border-[#E2E8E4]/60 space-y-3 font-be-vietnam animate-fade-in">
                          <div className="pt-3 border-t border-[#E2E8F0] space-y-3 font-be-vietnam animate-fade-in">
                            {/* Danh sách bình luận */}
                            {post.comments && post.comments.length > 0 ? (
                              <div className="space-y-2">
                                {post.comments.map((cmt) => (
                                  <div key={cmt.id} className="p-3 bg-[#F7F5F0] rounded-2xl flex items-start gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-[#4A6B5D] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                  <div key={cmt.id} className="p-3 bg-[#F8FAFC] rounded-2xl flex items-start gap-2.5 border border-[#E2E8F0]">
                                    <div className="w-7 h-7 rounded-full bg-[#2F5244] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                      {cmt.author_initials || "CM"}
                                    </div>
                                    <div className="flex-1 text-xs">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-[#2D3732]">{cmt.author_name}</span>
                                        <span className="text-[10px] text-[#6B7A72]">{cmt.created_at}</span>
                                        <span className="font-bold text-[#1E293B]">{cmt.author_name}</span>
                                        <span className="text-[10px] text-[#94A3B8]">{cmt.created_at}</span>
                                      </div>
                                      <p className="text-[#2D3732] mt-0.5 m-0 leading-relaxed">{cmt.content}</p>
                                      <p className="text-[#334155] mt-0.5 m-0 leading-relaxed">{cmt.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-[#4A5568] text-center py-2">Chưa có bình luận nào. Hãy gửi bình luận đầu tiên!</p>
                              <p className="text-xs text-[#64748B] text-center py-2">Chưa có bình luận nào. Hãy gửi bình luận đầu tiên!</p>
                            )}

                            {/* Ô nhập bình luận */}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={commentInputs[post.id] || ""}
                                onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                                onKeyDown={(e) => e.key === "Enter" && handleAddComment(post.id)}
                                placeholder="Viết bình luận trao đổi kinh nghiệm..."
                                className="flex-1 p-2.5 rounded-xl border border-[#E2E8E4] text-xs outline-none focus:border-[#4A6B5D] bg-[#F7F5F0]/60"
                                className="flex-1 p-2.5 rounded-xl border border-[#E2E8F0] text-xs outline-none focus:border-[#2F5244] bg-[#F8FAFC] text-[#1E293B]"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddComment(post.id)}
                                className="px-4 py-2.5 rounded-xl bg-[#4A6B5D] hover:bg-[#3B5A45] !text-white text-xs font-bold cursor-pointer transition-all border-0 shadow-xs"
                                className="px-4 py-2.5 rounded-xl bg-[#2F5244] hover:bg-[#243E33] !text-white text-xs font-bold cursor-pointer transition-all border-0 shadow-xs"
                              >
                                Gửi
                              </button>
                            </div>
                          </div>
                        )}

                      </div>
                    </article>
                  );
                })}
              </div>
            )}

          </section>

          {/* ================= CỘT PHẢI (3 COLS): BẢNG XẾP HẠNG & SỰ KIỆN ================= */}
          <aside className="lg:col-span-3 space-y-6">
            
            {/* 1. BẢNG XẾP HẠNG ECO-HERO (BỐ CỤC 2 DÒNG - TUYỆT ĐỐI KHÔNG CẮT CHỮ) */}
            <div className="bg-white rounded-3xl p-5 border border-[#E2E8E4] shadow-xs space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm font-fraunces text-[#2D3732] m-0">
                  <h3 className="font-bold text-sm font-fraunces text-[#1E293B] m-0">
                    Bảng Xếp Hạng Eco-Hero
                  </h3>
                  <p className="text-xs text-[#4A5568] font-be-vietnam mt-0.5">
                  <p className="text-xs text-[#64748B] font-be-vietnam mt-0.5">
                    Thành viên dọn rác & trekking nhiều nhất tháng
                  </p>
                </div>
                <Flame className="w-5 h-5 text-[#B8442C]" />
                <Flame className="w-5 h-5 text-[#D97706]" />
              </div>

              <div className="space-y-3 font-be-vietnam">
                {leaderboard.map((item) => (
                  <div
                    key={item.rank}
                    className="p-3 rounded-2xl border border-[#E2E8E4]/80 hover:bg-[#F7F5F0] transition-colors space-y-1.5"
                    className="p-3 rounded-2xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors space-y-1.5"
                  >
                    {/* DÒNG 1: TÊN ĐẦY ĐỦ + SỐ ĐIỂM (KHÔNG BỊ TRUNCATE) */}
                    {/* DÒNG 1: TÊN ĐẦY ĐỦ + SỐ ĐIỂM */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 ${item.rankBadgeBg || "bg-[#8DA696]"} text-white rounded-full flex items-center justify-center font-bold text-[10px] font-fraunces shrink-0`}>
                        <span className="w-5 h-5 bg-[#2F5244] text-white rounded-full flex items-center justify-center font-bold text-[10px] font-fraunces shrink-0">
                          #{item.rank}
                        </span>
                        <span className="text-xs font-bold text-[#2D3732] font-fraunces">
                        <span className="text-xs font-bold text-[#1E293B] font-fraunces">
                          {item.name}
                        </span>
                      </div>

                      <span className="text-xs font-bold text-[#B8442C] shrink-0 font-mono">
                      <span className="text-xs font-bold text-[#D97706] shrink-0 font-fraunces">
                        {item.points} pts
                      </span>
                    </div>

                    {/* DÒNG 2: THỐNG KÊ (KM • KG RÁC) VÀ HUY HIỆU */}
                    <div className="flex items-center justify-between text-xs text-[#4A5568] pl-7">
                      <span className="font-medium text-[11px] text-[#4A5568]">
                    <div className="flex items-center justify-between text-xs text-[#64748B] pl-7">
                      <span className="font-medium text-[11px] text-[#64748B]">
                        {item.stats}
                      </span>
                      {item.badge && (
                        <span className="text-[10px] bg-[#E9EFEC] text-[#4A6B5D] px-2 py-0.5 rounded-full font-bold">
                        <span className="text-[10px] bg-[#EFF6F2] text-[#2F5244] px-2 py-0.5 rounded-full font-bold">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. CHIẾN DỊCH "CHỦ NHẬT XANH" SẮP DIỄN RA */}
            <div className="bg-white rounded-3xl p-5 border border-[#E2E8E4] shadow-xs space-y-4 font-be-vietnam">
            <div className="bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-xs space-y-4 font-be-vietnam">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm font-fraunces text-[#2D3732] m-0">
                  <h3 className="font-bold text-sm font-fraunces text-[#1E293B] m-0">
                    Chiến Dịch Tình Nguyện
                  </h3>
                  <p className="text-xs text-[#4A5568] mt-0.5">
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Chung tay dọn rác cùng BQL
                  </p>
                </div>
                <Calendar className="w-4 h-4 text-[#4A6B5D]" />
                <Calendar className="w-4 h-4 text-[#2F5244]" />
              </div>

              <div className="space-y-3">
                {cleanupEvents.map((evt) => (
                  <div key={evt.id} className="p-3 bg-[#F7F5F0] rounded-2xl border border-[#E2E8E4] space-y-2">
                    <div className="text-xs font-bold text-[#2D3732] font-fraunces">
                  <div key={evt.id} className="p-3 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-2">
                    <div className="text-xs font-bold text-[#1E293B] font-fraunces">
                      {evt.title}
                    </div>
                    <div className="text-xs text-[#4A5568] space-y-1">
                    <div className="text-xs text-[#64748B] space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#4A6B5D]" />
                        <Calendar className="w-3.5 h-3.5 text-[#2F5244]" />
                        <span>{evt.event_date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#4A6B5D]" />
                        <Users className="w-3.5 h-3.5 text-[#2F5244]" />
                        <span>Đã đăng ký: {evt.participants_count}/{evt.max_participants} người</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <span className="text-[11px] font-bold text-[#D97706] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded-full">
                        {evt.reward_points}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setToastMessage(`Đã đăng ký tham gia "${evt.title}" thành công! BQL sẽ gửi thông báo hẹn.`);
                          setTimeout(() => setToastMessage(""), 4000);
                        }}
                        className="px-3 py-1 rounded-xl bg-[#4A6B5D] hover:bg-[#3B5A45] !text-white text-xs font-bold cursor-pointer transition-all border-0 shadow-xs"
                        className="px-3 py-1 rounded-xl bg-[#2F5244] hover:bg-[#243E33] !text-white text-xs font-bold cursor-pointer transition-all border-0 shadow-xs"
                      >
                        Tham Gia
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </aside>

        </div>

      </main>

      {/* Modal Báo Cáo Sự Cố Môi Trường (KH-12) */}
      <IncidentReportModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        onSuccess={(inc) => {
          setMyReportsList(prev => [inc, ...prev]);
          setToastMessage(`Đã gửi phản ánh sự cố #${inc.id} đến Ban Quản Lý Sơn Trà! Cảm ơn bạn đã bảo vệ thiên nhiên.`);
          setTimeout(() => setToastMessage(""), 5000);
        }}
      />

      {/* Modal Lịch Sử Báo Cáo Sự Cố Của Tôi */}
      <MyIncidentReportsModal
        isOpen={isMyReportsModalOpen}
        onClose={() => setIsMyReportsModalOpen(false)}
        reports={myReportsList}
      />

    </div>
  );
}
