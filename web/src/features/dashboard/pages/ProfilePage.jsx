import React, { useState } from "react";
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
  Award
} from "lucide-react";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { openSidebar } = useOutletContext() || {};

  const user = JSON.parse(localStorage.getItem("user_info") || "null");
  const userName = user?.name || user?.email?.split("@")[0] || "Phương Thảo";
  const userInitials = userName.substring(0, 2).toUpperCase();

  const [toastMessage, setToastMessage] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_info");
    window.location.href = "/login";
  };

  const handleMenuClick = (actionName) => {
    setToastMessage(`Đã chọn: ${actionName}`);
    setTimeout(() => setToastMessage(""), 3500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-[#2F3A35] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#4A6B5D] animate-fade-in font-be-vietnam">
          <Award className="w-5 h-5 text-[#8DA696] shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex flex-col w-full max-w-7xl mx-auto p-6 sm:p-10 gap-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: User Card */}
          <section className="lg:col-span-4 flex flex-col items-center bg-white p-8 gap-4 rounded-3xl border border-[#E2E8E4] shadow-xs text-center">
            {/* Circular Avatar */}
            <div className="w-28 h-28 bg-[#E9EFEC] text-[#4A6B5D] rounded-full flex items-center justify-center font-bold text-3xl font-fraunces border-2 border-[#DCE5DF]">
              {userInitials}
            </div>

            {/* User Name */}
            <div className="flex flex-col items-center gap-1.5 mt-2">
              <h2 className="text-[#2D3732] text-2xl font-bold font-fraunces m-0">
                {userName}
              </h2>
              <span className="bg-[#E9EFEC] text-[#4A6B5D] text-xs font-bold font-be-vietnam px-3 py-1 rounded-full">
                Xanh Enthusiast
              </span>
            </div>

            {/* Edit Profile Button */}
            <button
              type="button"
              onClick={() => handleMenuClick("Chỉnh sửa hồ sơ")}
              className="w-full border border-[#4A6B5D] text-[#4A6B5D] hover:bg-[#4A6B5D] hover:text-white text-xs font-bold font-be-vietnam py-2.5 px-6 rounded-full transition-colors cursor-pointer bg-white mt-4"
            >
              Chỉnh sửa hồ sơ
            </button>
          </section>

          {/* RIGHT COLUMN: Impact Stats, Badges, and Options */}
          <section className="lg:col-span-8 flex flex-col gap-8">
            
            {/* Impact Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col items-center justify-center bg-[#F7F5F0] p-5 rounded-2xl border border-[#E2E8E4] gap-1 text-center">
                <span className="text-[#2D3732] text-lg font-bold font-fraunces">
                  12.5 km
                </span>
                <span className="text-[#6B7A72] text-xs font-be-vietnam">
                  Chiều dài Trekking
                </span>
              </div>

              <div className="flex flex-col items-center justify-center bg-[#F7F5F0] p-5 rounded-2xl border border-[#E2E8E4] gap-1 text-center">
                <span className="text-[#2D3732] text-lg font-bold font-fraunces">
                  4.8 kg
                </span>
                <span className="text-[#6B7A72] text-xs font-be-vietnam">
                  Rác nhựa đã thu gom
                </span>
              </div>

              <div className="flex flex-col items-center justify-center bg-[#F7F5F0] p-5 rounded-2xl border border-[#E2E8E4] gap-1 text-center">
                <span className="text-[#2D3732] text-lg font-bold font-fraunces">
                  450
                </span>
                <span className="text-[#6B7A72] text-xs font-be-vietnam">
                  RE-Points hiện có
                </span>
              </div>
            </div>

            {/* Badges Collection Section */}
            <div className="flex flex-col gap-4">
              <h3 className="text-[#2D3732] text-lg font-bold font-fraunces m-0">
                Bộ sưu tập Huy hiệu
              </h3>

              <div className="flex items-center gap-6 sm:gap-8">
                {/* Badge 1 */}
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-16 h-16 bg-[#E9EFEC] text-[#4A6B5D] rounded-full flex items-center justify-center border border-[#DCE5DF] shadow-xs">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <span className="text-[#6B7A72] text-xs font-medium font-be-vietnam">
                    Người bảo vệ Voọc
                  </span>
                </div>

                {/* Badge 2 */}
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-16 h-16 bg-[#E9EFEC] text-[#4A6B5D] rounded-full flex items-center justify-center border border-[#DCE5DF] shadow-xs">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                  <span className="text-[#6B7A72] text-xs font-medium font-be-vietnam">
                    Trekker kiên cường
                  </span>
                </div>

                {/* Badge 3 (Locked) */}
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-16 h-16 bg-[#F7F5F0] text-[#A0AEC0] rounded-full flex items-center justify-center border border-[#E2E8E4] border-dashed">
                    <Plus className="w-7 h-7" />
                  </div>
                  <span className="text-[#A0AEC0] text-xs font-medium font-be-vietnam">
                    Chưa mở khoá
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Navigation Links */}
            <div className="flex flex-col border-t border-[#E2E8E4] pt-2">
              <button
                type="button"
                onClick={() => handleMenuClick("Lịch sử chuyến đi")}
                className="flex items-center justify-between py-4 border-b border-[#E2E8E4] text-left hover:bg-[#F7F5F0]/50 px-2 rounded-xl transition-colors border-x-0 border-t-0 bg-transparent cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#6B7A72] group-hover:text-[#4A6B5D]" />
                  <span className="text-[#2D3732] text-sm font-bold font-fraunces">
                    Lịch sử chuyến đi
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-[#A0AEC0] group-hover:text-[#2D3732]" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/dashboard/marketplace")}
                className="flex items-center justify-between py-4 border-b border-[#E2E8E4] text-left hover:bg-[#F7F5F0]/50 px-2 rounded-xl transition-colors border-x-0 border-t-0 bg-transparent cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Ticket className="w-5 h-5 text-[#6B7A72] group-hover:text-[#4A6B5D]" />
                  <span className="text-[#2D3732] text-sm font-bold font-fraunces">
                    Voucher của tôi
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-[#A0AEC0] group-hover:text-[#2D3732]" />
              </button>

              <button
                type="button"
                onClick={() => handleMenuClick("Cài đặt tài khoản")}
                className="flex items-center justify-between py-4 border-b border-[#E2E8E4] text-left hover:bg-[#F7F5F0]/50 px-2 rounded-xl transition-colors border-x-0 border-t-0 bg-transparent cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-[#6B7A72] group-hover:text-[#4A6B5D]" />
                  <span className="text-[#2D3732] text-sm font-bold font-fraunces">
                    Cài đặt tài khoản
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-[#A0AEC0] group-hover:text-[#2D3732]" />
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 py-4 text-left hover:bg-[#FAF3EB] px-2 rounded-xl transition-colors border-0 bg-transparent cursor-pointer mt-2 text-[#E67E22] hover:text-[#B8442C]"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-bold font-fraunces">
                  Đăng xuất
                </span>
              </button>
            </div>

          </section>

        </div>
      </main>
    </div>
  );
}
