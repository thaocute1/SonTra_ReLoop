import React from "react";
import { 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  AlertTriangle,
  Award,
  Sparkles
} from "lucide-react";

export default function MyIncidentReportsModal({ isOpen, onClose, reports = [] }) {
  if (!isOpen) return null;

  // Mock initial reports nếu props rỗng
  const displayReports = reports.length > 0 ? reports : [
    {
      id: "REP104",
      incident_type: "Bãi rác tự phát lớn",
      location_name: "Bờ đá Bãi Rạng",
      description: "Rác chai nhựa và túi nilon do du khách cắm trại tự do để lại bốc mùi khó chịu.",
      status: "resolved",
      status_label: "Đã dọn dẹp xong",
      points_awarded: 50,
      created_at: "16/10/2026",
      bql_note: "Kiểm lâm BQL đã phối hợp đoàn thanh niên thu gom 45kg rác."
    },
    {
      id: "REP105",
      incident_type: "Dấu hiệu bẫy thú rừng",
      location_name: "Đoạn dốc gần Mũi Nghê",
      description: "Phát hiện dây bẫy thép buộc vào gốc cây gần lối đi mòn.",
      status: "investigating",
      status_label: "Kiểm lâm đang xử lý",
      points_awarded: 0,
      created_at: "17/10/2026",
      bql_note: "Tổ tuần tra số 2 đang kiểm tra và tháo dỡ bẫy thực địa."
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#2D3732]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-be-vietnam">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-[#E2E8E4] relative space-y-5">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#F7F5F0] hover:bg-[#E2E8E4] text-[#6B7A72] border-0 cursor-pointer transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 pr-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            Lịch Sử Phản Ánh Môi Trường
          </div>
          <h3 className="text-xl font-bold font-fraunces text-[#2D3732]">
            Các Sự Cố Bạn Đã Báo Cáo
          </h3>
          <p className="text-xs text-[#6B7A72]">
            Theo dõi tiến độ Đội Kiểm Lâm & Ban Quản Lý Bán Đảo Sơn Trà tiếp nhận xử lý và điểm thưởng bảo tồn của bạn.
          </p>
        </div>

        {/* Reports List */}
        <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
          {displayReports.map((rep) => {
            const isResolved = rep.status === "resolved";
            return (
              <div 
                key={rep.id}
                className="p-4 rounded-2xl border border-[#E2E8E4] bg-[#F7F5F0]/60 space-y-2.5 transition-all hover:bg-white hover:shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#2D3732] bg-white px-2.5 py-0.5 rounded-lg border border-[#E2E8E4]">
                      #{rep.id}
                    </span>
                    <span className="text-xs font-bold text-[#2D3732] font-fraunces">
                      {rep.incident_type}
                    </span>
                  </div>

                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    isResolved 
                      ? "bg-emerald-100 text-emerald-800" 
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {isResolved ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Đã dọn dẹp xong</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>Đang xử lý</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#6B7A72]">
                  <span className="flex items-center gap-1 text-[#4A6B5D] font-bold">
                    <MapPin className="w-3.5 h-3.5" />
                    {rep.location_name}
                  </span>
                  <span>•</span>
                  <span>Ngày gửi: {rep.created_at}</span>
                </div>

                <p className="text-xs text-[#2D3732] leading-relaxed m-0 bg-white p-2.5 rounded-xl border border-[#E2E8E4]/60">
                  {rep.description}
                </p>

                {rep.bql_note && (
                  <div className="text-[11px] text-emerald-800 bg-emerald-50/80 p-2 rounded-xl flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                    <span><strong>Phản hồi từ BQL:</strong> {rep.bql_note}</span>
                  </div>
                )}

                {rep.points_awarded > 0 && (
                  <div className="text-right text-[11px] font-bold text-emerald-700">
                    +{rep.points_awarded} RE-Points đã cộng vào tài khoản
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#E2E8E4]">
          <span className="text-xs text-[#6B7A72]">
            Tổng số phản ánh: <strong>{displayReports.length} vụ</strong>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-[#4A6B5D] hover:bg-[#3B5A45] !text-white text-xs font-bold cursor-pointer transition-all border-0 shadow-xs"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}

