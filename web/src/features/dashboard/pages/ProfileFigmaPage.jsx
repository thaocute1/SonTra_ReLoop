import React, { useEffect, useState } from "react";
import { Award, ChevronRight, Clock3, LogOut, Plus, Settings, Ticket, TrendingUp } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import authService from "../../auth/api/authService";
import ProfileEditModal from "../components/ProfileEditModal";
import MyTrekkingBookingsModal from "../components/MyTrekkingBookingsModal";
import rewardService from "../../../services/rewardService";
import { useUserEco } from "../../../context/UserEcoContext";

export default function ProfileFigmaPage() {
  const outlet = useOutletContext() || {};
  const { totalKm, totalTrashKg } = useUserEco();
  const [user, setUser] = useState(() => outlet.currentUser || JSON.parse(localStorage.getItem("user_info") || "null"));
  const [editOpen, setEditOpen] = useState(false);
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [vouchersOpen, setVouchersOpen] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);

  useEffect(() => {
    authService.getProfile().then((data) => {
      if (!data) return;
      setUser(data);
      outlet.setCurrentUser?.(data);
      if (data.total_eco_points !== undefined) outlet.updateUserPoints?.(data.total_eco_points);
    }).catch(() => {});
  }, []);

  const name = user?.name || user?.full_name || user?.email?.split("@")[0] || "Phương Thảo";
  const initials = user?.avatarText || name.split(" ").map((part) => part[0]).slice(-2).join("").toUpperCase();
  const points = user?.total_eco_points ?? outlet.userPoints ?? 450;
  const logout = () => { authService.logout(); window.location.href = "/login"; };
  const updated = (next) => { setUser(next); outlet.setCurrentUser?.(next); };
  const openVouchers = async () => {
    setVouchersOpen(true);
    setVouchersLoading(true);
    const data = await rewardService.fetchMyVouchers();
    setVouchers(Array.isArray(data) ? data : []);
    setVouchersLoading(false);
  };

  return <div className="figma-screen figma-profile-screen">
    <main className="figma-screen-content figma-profile-layout">
      <section className="figma-profile-card">
        <div className="figma-profile-avatar">{user?.avatar_url ? <img src={user.avatar_url} alt="" /> : initials}</div>
        <h2>{name}</h2>
        <span>Xanh Enthusiast</span>
        <button type="button" onClick={() => setEditOpen(true)}>Chỉnh sửa hồ sơ</button>
      </section>

      <section className="figma-profile-main">
        <div className="figma-profile-stats">
          <article><b>{totalKm} km</b><span>Chiều dài trekking</span></article>
          <article><b>{totalTrashKg} kg</b><span>Rác nhựa đã thu gom</span></article>
          <article><b>{points}</b><span>RE-Points hiện có</span></article>
        </div>
        <h2>Bộ sưu tập huy hiệu</h2>
        <div className="figma-badges">
          <article><span><Award /></span><small>Người bảo vệ Voọc</small></article>
          <article><span><TrendingUp /></span><small>Trekker kiên cường</small></article>
          <article><span className="locked"><Plus /></span><small>Chưa mở khóa</small></article>
        </div>
        <nav className="figma-profile-links">
          <button type="button" onClick={() => setBookingsOpen(true)}><Clock3 /><span>Lịch sử chuyến đi</span><ChevronRight /></button>
          <button type="button" onClick={openVouchers}><Ticket /><span>Voucher của tôi</span><ChevronRight /></button>
          <button type="button" onClick={() => setEditOpen(true)}><Settings /><span>Cài đặt tài khoản</span><ChevronRight /></button>
          <button type="button" className="logout" onClick={logout}><LogOut /><span>Đăng xuất</span></button>
        </nav>
      </section>
    </main>
    <ProfileEditModal isOpen={editOpen} onClose={() => setEditOpen(false)} currentUser={user} onProfileUpdated={updated} />
    <MyTrekkingBookingsModal isOpen={bookingsOpen} onClose={() => setBookingsOpen(false)} />
    {vouchersOpen && <div className="figma-simple-modal" role="dialog" aria-modal="true" aria-labelledby="voucher-dialog-title" onClick={() => setVouchersOpen(false)}>
      <section onClick={(event) => event.stopPropagation()}>
        <header><h2 id="voucher-dialog-title">Voucher của tôi</h2><button type="button" aria-label="Đóng" onClick={() => setVouchersOpen(false)}>×</button></header>
        {vouchersLoading ? <p>Đang tải voucher...</p> : vouchers.length ? <div className="figma-owned-vouchers">{vouchers.map((voucher) => <article key={voucher.id}><span>{voucher.discount_badge || "Voucher"}</span><div><h3>{voucher.title}</h3><p>Mã: <b>{voucher.code}</b> · {voucher.status === "unused" ? "Chưa sử dụng" : voucher.status}</p>{voucher.expires_at && <small>Hạn dùng: {voucher.expires_at}</small>}</div></article>)}</div> : <p>Bạn chưa có voucher nào. Hãy đổi thưởng bằng RE-Points tại Marketplace.</p>}
      </section>
    </div>}
  </div>;
}
