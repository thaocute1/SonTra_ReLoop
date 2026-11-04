import React, { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { 
  Clock, 
  Ticket, 
  Settings, 
  LogOut, 
  ChevronRight, 
  ShieldCheck, 
  TrendingUp, 
  Plus,
  Award,
  User,
  Phone,
  Mail,
  HeartHandshake,
  Activity,
  Edit3,
  AlertTriangle
} from "lucide-react";
import authService from "../../auth/api/authService";
import ProfileEditModal from "../components/ProfileEditModal";
import MyTrekkingBookingsModal from "../components/MyTrekkingBookingsModal";

export default function ProfilePage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const { userPoints, updateUserPoints, currentUser: contextUser, setCurrentUser } = outletContext;

  const [user, setUser] = useState(() => {
    return contextUser || JSON.parse(localStorage.getItem("user_info") || "null");
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync with backend API on mount
  useEffect(() => {
    async function fetchFreshProfile() {
      try {
        setLoading(true);
        const data = await authService.getProfile();
        if (data) {
          setUser(data);
          if (setCurrentUser) setCurrentUser(data);
          if (updateUserPoints && data.total_eco_points !== undefined) {
            updateUserPoints(data.total_eco_points);
          }
        }
      } catch (err) {
        console.error("Could not fetch user profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchFreshProfile();
  }, []);

  const userName = user?.name || user?.email?.split("@")[0] || "Du Khách Sơn Trà";
  const userInitials = userName.substring(0, 2).toUpperCase();
  const userAvatar = user?.avatar_url;
  const currentPoints = user?.total_eco_points ?? userPoints ?? 0;

  const handleLogout = () => {
    authService.logout();
    window.location.href = "/login";
  };

  const handleMenuClick = (actionName) => {
    setToastMessage(`Đã chọn: ${actionName}`);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleProfileUpdated = (updatedUser) => {
    setUser(updatedUser);
    if (setCurrentUser) setCurrentUser(updatedUser);
    if (updateUserPoints && updatedUser.total_eco_points !== undefined) {
      updateUserPoints(updatedUser.total_eco_points);
    }
    setToastMessage("Hồ sơ đã được cập nhật thành công!");
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Convert fitness level code to Vietnamese
  const getFitnessBadge = (level) => {
    switch (level) {
      case "beginner":
        return { label: "Mới Bắt Đầu", color: "bg-blue-50 text-blue-700 border-blue-200" };
      case "advanced":
        return { label: "Dày Dặn Kinh Nghiệm", color: "bg-purple-50 text-purple-700 border-purple-200" };
      case "expert":
        return { label: "Chuyên Gia Sinh Tồn", color: "bg-amber-50 text-amber-800 border-amber-200" };
      case "moderate":
      default:
        return { label: "Thể Lực Trung Bình", color: "bg-[#E9EFEC] text-[#4A6B5D] border-[#DCE5DF]" };
    }
  };

  const fitnessInfo = getFitnessBadge(user?.fitness_level || user?.raw_user_meta_data?.fitness_level);
  const emergencyName = user?.emergency_contact_name || user?.raw_user_meta_data?.emergency_contact_name;
  const emergencyPhone = user?.emergency_contact_phone || user?.raw_user_meta_data?.emergency_contact_phone;
  const medicalNotes = user?.medical_notes || user?.raw_user_meta_data?.medical_notes;

  return (
    <div className="flex flex-col min-h-screen bg-white font-be-vietnam">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 bg-[#2F3A35] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#4A6B5D] animate-fade-in">
          <Award className="w-5 h-5 text-[#8DA696] shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex flex-col w-full max-w-7xl mx-auto p-6 sm:p-10 gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: User Identity Card */}
          <section className="lg:col-span-4 flex flex-col items-center bg-white p-7 gap-5 rounded-3xl border border-[#E2E8E4] shadow-xs text-center">
            {/* Circular Avatar */}
            <div className="relative group">
              <div className="w-28 h-28 bg-[#E9EFEC] text-[#4A6B5D] rounded-full flex items-center justify-center font-bold text-3xl font-fraunces border-3 border-[#4A6B5D] overflow-hidden shadow-sm">
                {userAvatar ? (
                  <img 
                    src={userAvatar} 
                    alt={userName} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  userInitials
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                title="Thay đổi ảnh đại diện"
                className="absolute bottom-0 right-0 p-2 bg-[#4A6B5D] hover:bg-[#3B5A45] text-white rounded-full shadow-md cursor-pointer border-2 border-white transition-transform hover:scale-110"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* User Name & Role Badge */}
            <div className="flex flex-col items-center gap-1.5">
              <h2 className="text-[#2D3732] text-2xl font-bold font-fraunces m-0">
                {userName}
              </h2>
              <div className="flex items-center gap-2">
                <span className="bg-[#E9EFEC] text-[#4A6B5D] text-xs font-bold px-3 py-1 rounded-full border border-[#DCE5DF]">
                  Trekker Bảo Tồn
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${fitnessInfo.color}`}>
                  {fitnessInfo.label}
                </span>
              </div>
            </div>

            {/* User Contact Details */}
            <div className="w-full flex flex-col gap-2.5 pt-4 border-t border-[#E2E8E4] text-left text-xs">
              <div className="flex items-center gap-2.5 text-[#6B7A72]">
                <Mail className="w-4 h-4 text-[#4A6B5D] shrink-0" />
                <span className="truncate">{user?.email || "Chưa có email"}</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#6B7A72]">
                <Phone className="w-4 h-4 text-[#4A6B5D] shrink-0" />
                <span>{user?.phone || "Chưa cập nhật số điện thoại"}</span>
              </div>
            </div>

            {/* Edit Profile Button */}
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="w-full bg-[#4A6B5D] hover:bg-[#3B5A45] text-white text-xs font-bold py-3 px-6 rounded-2xl transition-all cursor-pointer shadow-xs border-0 flex items-center justify-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>Chỉnh sửa hồ sơ & Bảo mật</span>
            </button>
          </section>

          {/* RIGHT COLUMN: Impact Stats, Safety Notes, Badges, and Navigation */}
          <section className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Impact Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col items-center justify-center bg-[#F7F5F0] p-5 rounded-2xl border border-[#E2E8E4] gap-1 text-center">
                <span className="text-[#2D3732] text-xl font-bold font-fraunces">
                  12.5 km
                </span>
                <span className="text-[#6B7A72] text-xs font-medium">
                  Chiều dài Trekking
                </span>
              </div>

              <div className="flex flex-col items-center justify-center bg-[#F7F5F0] p-5 rounded-2xl border border-[#E2E8E4] gap-1 text-center">
                <span className="text-[#2D3732] text-xl font-bold font-fraunces">
                  4.8 kg
                </span>
                <span className="text-[#6B7A72] text-xs font-medium">
                  Rác nhựa đã thu gom
                </span>
              </div>

              <div className="flex flex-col items-center justify-center bg-[#E9EFEC] p-5 rounded-2xl border border-[#DCE5DF] gap-1 text-center">
                <span className="text-[#4A6B5D] text-xl font-bold font-fraunces">
                  {currentPoints}
                </span>
                <span className="text-[#4A6B5D] text-xs font-bold">
                  RE-Points khả dụng
                </span>
              </div>
            </div>

            {/* Trekking Safety & Emergency Information Card */}
            <div className="bg-white p-6 rounded-3xl border border-[#E2E8E4] shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[#2D3732] text-base font-bold font-fraunces m-0">
                      Hồ Sơ An Toàn & Khẩn Cấp Rừng Sơn Trà
                    </h3>
                    <p className="text-xs text-[#6B7A72] m-0">
                      Dữ liệu phục vụ công tác cứu hộ, y tế khi đi trekking
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-xs text-[#4A6B5D] hover:underline font-bold bg-transparent border-0 cursor-pointer"
                >
                  Cập nhật
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F7F5F0] p-4 rounded-2xl border border-[#E2E8E4]">
                <div>
                  <span className="text-[11px] text-[#6B7A72] block">Người thân liên hệ khẩn cấp</span>
                  <span className="text-xs font-bold text-[#2D3732]">
                    {emergencyName ? `${emergencyName} (${emergencyPhone || "Chưa có SĐT"})` : "Chưa thiết lập người thân"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6B7A72] block">Cấp độ thể lực dã ngoại</span>
                  <span className="text-xs font-bold text-[#2D3732]">
                    {fitnessInfo.label}
                  </span>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-[#E2E8E4]">
                  <span className="text-[11px] text-[#6B7A72] block">Lưu ý y tế / Dị ứng / Bệnh nền</span>
                  <span className="text-xs text-[#2D3732] font-medium">
                    {medicalNotes || "Không có ghi chú bệnh nền hoặc dị ứng đặc biệt."}
                  </span>
                </div>
              </div>
            </div>

            {/* Badges Collection Section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[#2D3732] text-base font-bold font-fraunces m-0">
                Bộ sưu tập Huy hiệu Sơn Trà
              </h3>

              <div className="flex items-center gap-4 sm:gap-6">
                {/* Badge 1 */}
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <div className="w-14 h-14 bg-[#E9EFEC] text-[#4A6B5D] rounded-full flex items-center justify-center border border-[#DCE5DF] shadow-xs">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="text-[#6B7A72] text-xs font-medium">
                    Bảo vệ Voọc
                  </span>
                </div>

                {/* Badge 2 */}
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <div className="w-14 h-14 bg-[#E9EFEC] text-[#4A6B5D] rounded-full flex items-center justify-center border border-[#DCE5DF] shadow-xs">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <span className="text-[#6B7A72] text-xs font-medium">
                    Trekker Kiên Cường
                  </span>
                </div>

                {/* Badge 3 (Locked) */}
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <div className="w-14 h-14 bg-[#F7F5F0] text-[#A0AEC0] rounded-full flex items-center justify-center border border-[#E2E8E4] border-dashed">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-[#A0AEC0] text-xs font-medium">
                    Chưa mở khoá
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Navigation Links */}
            <div className="flex flex-col border-t border-[#E2E8E4] pt-2">
              <button
                type="button"
                onClick={() => setIsBookingsModalOpen(true)}
                className="flex items-center justify-between py-3.5 border-b border-[#E2E8E4] text-left hover:bg-[#F7F5F0]/60 px-3 rounded-2xl transition-colors border-x-0 border-t-0 bg-transparent cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#6B7A72] group-hover:text-[#4A6B5D]" />
                  <span className="text-[#2D3732] text-sm font-bold font-fraunces">
                    Lịch sử chuyến đi & Trekking
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#A0AEC0] group-hover:text-[#2D3732]" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/dashboard/marketplace")}
                className="flex items-center justify-between py-3.5 border-b border-[#E2E8E4] text-left hover:bg-[#F7F5F0]/60 px-3 rounded-2xl transition-colors border-x-0 border-t-0 bg-transparent cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Ticket className="w-4 h-4 text-[#6B7A72] group-hover:text-[#4A6B5D]" />
                  <span className="text-[#2D3732] text-sm font-bold font-fraunces">
                    Voucher quà tặng sinh thái của tôi
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#A0AEC0] group-hover:text-[#2D3732]" />
              </button>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center justify-between py-3.5 border-b border-[#E2E8E4] text-left hover:bg-[#F7F5F0]/60 px-3 rounded-2xl transition-colors border-x-0 border-t-0 bg-transparent cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-[#6B7A72] group-hover:text-[#4A6B5D]" />
                  <span className="text-[#2D3732] text-sm font-bold font-fraunces">
                    Cài đặt tài khoản & Mật khẩu
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#A0AEC0] group-hover:text-[#2D3732]" />
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 py-3.5 text-left hover:bg-[#FAF3EB] px-3 rounded-2xl transition-colors border-0 bg-transparent cursor-pointer mt-2 text-[#E67E22] hover:text-[#B8442C]"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-bold font-fraunces">
                  Đăng xuất tài khoản
                </span>
              </button>
            </div>

          </section>

        </div>
      </main>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentUser={user}
        onProfileUpdated={handleProfileUpdated}
      />

      {/* Trekking Bookings & E-Tickets Modal */}
      <MyTrekkingBookingsModal
        isOpen={isBookingsModalOpen}
        onClose={() => setIsBookingsModalOpen(false)}
      />
    </div>
  );
}

