import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle2,
  Trash2,
  MapPin,
  Droplets,
  Sparkles,
  Award,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Camera,
  Check
} from "lucide-react";
import { useUserEco } from "../../../context/UserEcoContext";

export default function MissionsPage() {
  const navigate = useNavigate();
  const { 
    points, 
    tasks, 
    completedTasksCount, 
    totalTasksCount, 
    completeTask 
  } = useUserEco();

  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'in_progress' | 'completed'
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const handleTaskAction = (task) => {
    if (task.status === "completed") return;
    completeTask(task.id);
    showToast(`Chúc mừng! Bạn đã hoàn thành "${task.title}" và nhận +${task.points} RE-Points! 🎉`);
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === "in_progress") return t.status === "in_progress";
    if (activeTab === "completed") return t.status === "completed";
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-white font-be-vietnam text-[#1E293B]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-[#1E293B] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#334155] animate-fade-in font-be-vietnam">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area - max-w-6xl aligned with header */}
      <main className="flex flex-col w-full max-w-6xl mx-auto px-6 py-8 gap-8">
        
        {/* Weekly Mission Hero Banner - Tinh gọn đỡ chiếm chỗ */}
        <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-forest-800 to-forest-700 py-5 px-6 sm:px-8 rounded-3xl text-white shadow-xs gap-5 relative overflow-hidden">
          <div className="flex flex-col max-w-lg gap-1.5 z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold text-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              Nhiệm Vụ Tuần Này (Đợt 3)
            </div>
            <h2 className="text-white text-xl sm:text-2xl font-bold font-fraunces m-0">
              Hành Động Nhỏ — Tác Động Lớn
            </h2>
            <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed m-0 font-normal font-be-vietnam">
              Hoàn thành thử thách bảo tồn tại Bán đảo Sơn Trà để tích lũy RE-Points và mở khóa huy hiệu sinh thái.
            </p>
          </div>

          <div className="flex flex-col w-full sm:w-64 gap-2 z-10 shrink-0 bg-white/10 p-3.5 rounded-2xl border border-white/15 font-be-vietnam">
            <div className="flex justify-between items-center text-xs font-bold">
              <span>Tiến độ tuần:</span>
              <span className="text-emerald-300 text-xs font-fraunces">
                {completedTasksCount}/{totalTasksCount} hoàn thành
              </span>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${(completedTasksCount / totalTasksCount) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-white/70 block text-right">
              {completedTasksCount >= totalTasksCount ? "Đã hoàn thành xuất sắc!" : `Còn ${totalTasksCount - completedTasksCount} nhiệm vụ nhận thưởng`}
            </span>
          </div>
        </section>

        {/* Tab Filters */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2">
            {[
              { id: "all", label: `Tất cả (${tasks.length})` },
              { id: "in_progress", label: `Đang làm (${tasks.filter(t => t.status === "in_progress").length})` },
              { id: "completed", label: `Đã hoàn thành (${completedTasksCount})` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-1.5 px-3.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#2F5244] text-white border-[#2F5244] shadow-2xs"
                    : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC] hover:text-[#1E293B]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-[#64748B] font-medium hidden sm:inline">
            Tổng tích lũy: <strong className="text-emerald-800">{points} RE-Points</strong>
          </span>
        </div>

        {/* Missions Cards Grid - Equal Height & Beautiful Spacing */}
        {filteredTasks.length === 0 ? (
          <div className="p-10 rounded-3xl bg-cream-50 border border-dashed border-slate-300 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-forest-700 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800 font-fraunces m-0">Không có nhiệm vụ nào trong mục này</h4>
            <p className="text-xs text-slate-500 font-be-vietnam m-0">Hãy chuyển sang tab "Tất cả" để khám phá thêm thử thách sinh thái.</p>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {filteredTasks.map((t) => {
              const isCompleted = t.status === "completed";
              const isInProgress = t.status === "in_progress";

              return (
                <div 
                  key={t.id}
                  className={`flex flex-col justify-between h-full bg-white p-6 rounded-3xl border transition-all ${
                    isCompleted
                      ? "border-emerald-200 bg-emerald-50/20"
                      : "border-slate-200 hover:shadow-md"
                  }`}
                >
                  <div className="flex flex-col gap-4">
                    {/* Category tag & Points */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-forest-700 bg-forest-50 px-2.5 py-0.5 rounded-full border border-forest-200">
                        {t.tag}
                      </span>
                      <div className="flex items-center gap-1 text-amber-600 font-bold text-xs font-fraunces">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>+{t.points} RE-Points</span>
                      </div>
                    </div>

                    {/* Title & Description with uniform min-height */}
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-slate-900 text-base font-bold font-fraunces m-0 line-clamp-2 min-h-[48px]">
                        {t.title}
                      </h3>
                      <p className="text-slate-500 text-xs leading-relaxed m-0 min-h-[50px] font-be-vietnam">
                        {t.desc}
                      </p>
                    </div>

                    {/* Progress Status with Clear Badges */}
                    <div className="p-3 bg-cream-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs font-be-vietnam">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-[11px]">Trạng thái:</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          isCompleted
                            ? "text-emerald-800 bg-emerald-50 border border-emerald-200"
                            : isInProgress
                            ? "text-amber-800 bg-amber-50 border border-amber-200"
                            : "text-slate-600 bg-slate-100"
                        }`}>
                          {isCompleted ? "✓ Đã hoàn thành" : isInProgress ? "⚡ Đang làm (50%)" : "Chưa nhận"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${isCompleted ? "bg-emerald-600" : "bg-amber-500"}`}
                          style={{ width: `${t.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mission Action Button - Pinned to bottom with mt-auto */}
                  <div className="pt-4 mt-auto">
                    <button
                      type="button"
                      onClick={() => handleTaskAction(t)}
                      disabled={isCompleted}
                      className={`w-full py-2.5 px-4 rounded-2xl font-bold text-xs font-be-vietnam transition-all border flex items-center justify-center gap-2 ${
                        isCompleted
                          ? "bg-emerald-700 text-white border-emerald-700 cursor-default"
                          : "bg-forest-700 hover:bg-forest-800 text-white border-forest-700 shadow-xs cursor-pointer"
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <Check className="w-4 h-4 text-white" />
                          <span>Đã Hoàn Thành</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-white" />
                          <span>Xác Nhận Hoàn Thành (+{t.points} pts)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ================= KHU VỰC DƯỚI: NHẬT KÝ ĐÓNG GÓP & MINH CHỨNG (LẤP ĐẦY NỬA DƯỚI TRANG) ================= */}
        <section className="bg-[#F8FAFC] p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
            <div>
              <h3 className="text-base font-bold text-[#1E293B] font-fraunces m-0 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-800" />
                Nhật Ký Hành Động Sinh Thái Gần Đây
              </h3>
              <p className="text-xs text-[#64748B] m-0 mt-0.5">
                Các nhiệm vụ đã được hệ thống và Kiểm lâm xác nhận tích điểm thành công.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard/marketplace")}
              className="text-xs font-bold text-[#2F5244] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0"
            >
              <span>Dùng điểm đổi quà</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.filter(t => t.status === "completed").map((item) => (
              <div 
                key={item.id}
                className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex items-center gap-4 shadow-2xs"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-emerald-50 border border-emerald-200 shrink-0">
                  <img 
                    src={item.proofUrl || "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=200&q=80"}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#1E293B] truncate font-fraunces">
                      {item.title}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                      +{item.points} pts
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#64748B] mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#2F5244]" />
                      {item.completedDate || "21/10/2026"}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Đã xác thực GPS
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
