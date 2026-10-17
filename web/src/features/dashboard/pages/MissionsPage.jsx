import React, { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { 
  CheckCircle2,
  Trash2,
  MapPin,
  Droplets,
  Sparkles
} from "lucide-react";

export default function MissionsPage() {
  const navigate = useNavigate();
  const { openSidebar, userPoints: contextPoints, updateUserPoints } = useOutletContext() || {};
  const user = JSON.parse(localStorage.getItem("user_info") || "null");
  const userName = user?.name || user?.email?.split("@")[0] || "Eco-Explorer";
  const [userPoints, setUserPoints] = useState(() => contextPoints ?? user?.total_eco_points ?? 0);
  const [toastMessage, setToastMessage] = useState("");

  const [missions, setMissions] = useState([
    {
      id: 1,
      title: "Thu gom rác nhựa tại Bãi Nam",
      description: "Nhặt ít nhất 2kg rác nhựa trên tuyến bãi Nam Sơn Trà và chụp ảnh gửi báo cáo.",
      points: 100,
      icon: Trash2,
      status: "available", // 'available' | 'in_progress' | 'completed'
    },
    {
      id: 2,
      title: "Check-in GPS & Báo cáo tình trạng đường rừng",
      description: "Bật GPS tại trạm dừng Đỉnh Bàn Cờ và phản ánh thông tin an toàn tuyến trekking.",
      points: 50,
      icon: MapPin,
      status: "available",
    },
    {
      id: 3,
      title: "Không dùng chai nhựa một lần khi Trekking",
      description: "Mang theo bình nước cá nhân tái sử dụng và quét QR Code tại trạm tiếp nước BQL.",
      points: 30,
      icon: Droplets,
      status: "available",
    },
  ]);

  const handleClaimMission = (id) => {
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          if (m.status === "available") {
            setToastMessage(`Đã nhận nhiệm vụ "${m.title}"! Hãy hoàn thành để nhận +${m.points} RE-Points.`);
            return { ...m, status: "in_progress" };
          } else if (m.status === "in_progress") {
            setUserPoints((p) => p + m.points);
            setToastMessage(`Chúc mừng! Bạn đã hoàn thành nhiệm vụ và nhận +${m.points} RE-Points! 🎉`);
            return { ...m, status: "completed" };
          }
        }
        return m;
      })
    );
    setTimeout(() => setToastMessage(""), 4500);
  };

  const completedCount = missions.filter((m) => m.status === "completed" || m.status === "in_progress").length;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-[#2F3A35] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#4A6B5D] animate-fade-in font-be-vietnam">
          <CheckCircle2 className="w-5 h-5 text-[#8DA696] shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Content Body */}
        <main className="flex flex-col w-full max-w-7xl mx-auto p-6 sm:p-10 gap-8">
          
          {/* Weekly Mission Hero Banner */}
          <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#4A6B5D] py-8 px-8 sm:px-10 rounded-3xl text-white shadow-sm gap-6 relative overflow-hidden">
            <div className="flex flex-col max-w-lg gap-2 z-10">
              <h2 className="text-white text-2xl sm:text-3xl font-bold font-fraunces m-0">
                Hành động nhỏ - Tác động lớn
              </h2>
              <p className="text-emerald-50 text-sm leading-relaxed font-be-vietnam m-0">
                Hoàn thành nhiệm vụ tuần này để nhận thêm RE-Points &amp; đổi quà bảo tồn Sơn Trà.
              </p>
            </div>

            <div className="flex flex-col w-full sm:w-64 gap-2 z-10 shrink-0">
              <div className="flex justify-between items-center text-sm font-bold font-be-vietnam">
                <span>Nhiệm vụ tuần này:</span>
                <span className="text-emerald-200">{completedCount}/3</span>
              </div>
              <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-500"
                  style={{ width: `${(completedCount / 3) * 100}%` }}
                />
              </div>
            </div>
          </section>

          {/* Missions Cards Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {missions.map((m) => {
              const IconComp = m.icon;
              const isCompleted = m.status === "completed";
              const isInProgress = m.status === "in_progress";

              return (
                <div 
                  key={m.id}
                  className={`flex flex-col justify-between bg-white p-6 gap-6 rounded-3xl border transition-all ${
                    isCompleted
                      ? "border-emerald-300 bg-emerald-50/30"
                      : isInProgress
                      ? "border-[#E67E22] bg-amber-50/20 shadow-sm"
                      : "border-[#E2E8E4] hover:shadow-md"
                  }`}
                >
                  <div className="flex flex-col gap-4">
                    {/* Mission Icon Badge */}
                    <div className="w-12 h-12 bg-[#F7F5F0] rounded-2xl flex items-center justify-center text-[#4A6B5D] border border-[#E2E8E4]">
                      <IconComp className="w-6 h-6" />
                    </div>

                    <div className="flex flex-col gap-2">
                      <h3 className="text-[#2D3732] text-base font-bold font-fraunces m-0 line-clamp-2">
                        {m.title}
                      </h3>
                      <p className="text-[#6B7A72] text-xs leading-relaxed font-be-vietnam m-0">
                        {m.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#E67E22] font-bold text-xs font-be-vietnam">
                      <Sparkles className="w-4 h-4" />
                      <span>+{m.points} RE-Points</span>
                    </div>
                  </div>

                  {/* Mission Action Button */}
                  <button
                    type="button"
                    onClick={() => handleClaimMission(m.id)}
                    disabled={isCompleted}
                    className={`w-full py-2.5 px-4 rounded-full font-bold text-xs font-be-vietnam transition-all cursor-pointer border ${
                      isCompleted
                        ? "bg-emerald-600 text-white border-emerald-600 cursor-default"
                        : isInProgress
                        ? "bg-[#E67E22] text-white border-[#E67E22] hover:bg-[#d37019]"
                        : "bg-transparent text-[#4A6B5D] border-[#4A6B5D] hover:bg-[#4A6B5D] hover:text-white"
                    }`}
                  >
                    {isCompleted
                      ? "Đã hoàn thành ✓"
                      : isInProgress
                      ? "Xác nhận hoàn thành (+ points)"
                      : "Nhận nhiệm vụ"}
                  </button>
                </div>
              );
            })}
          </section>

        </main>
    </div>
  );
}
