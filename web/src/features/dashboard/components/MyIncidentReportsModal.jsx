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

  const displayReports = reports || [];

  return (
    <div className="fixed inset-0 z-50 bg-[#191C1A]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto motion-backdrop-enter font-be-vietnam">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="incident-history-dialog-title"
        className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-[#C5CCC7] relative space-y-5 motion-modal-enter"
      >
        
        {/* Close Button */}
        <button
          type="button"
          aria-label="Đóng lịch sử báo cáo sự cố"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#F2F5F1] hover:bg-[#C5CCC7] text-[#4A514C] border-0 cursor-pointer transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 pr-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            Lịch sử phản ánh môi trường
          </div>
          <h3 id="incident-history-dialog-title" className="text-xl font-bold font-fraunces text-[#191C1A]">
            Các sự cố bạn đã báo cáo
          </h3>
          <p className="text-xs text-[#4A514C]">
            Theo dõi tiến độ đội kiểm lâm và ban quản lý bán đảo Sơn Trà tiếp nhận, xử lý và trao điểm thưởng bảo tồn cho bạn.
          </p>
        </div>

        {/* Reports List */}
        <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
          {displayReports.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#4A514C] flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <span className="font-bold text-sm text-[#191C1A]">Bạn chưa gửi phản ánh sự cố nào</span>
              <p className="max-w-xs text-center text-[11px] leading-relaxed m-0">
                Khi tham gia trekking nếu phát hiện rác thải ô nhiễm hoặc nguy cơ sạt lở, hãy bấm "Báo cáo sự cố môi trường" để chung tay bảo vệ rừng và nhận RE-Points.
              </p>
            </div>
          ) : displayReports.map((rep) => {
            const isResolved = rep.status === "resolved";
            return (
              <div 
                key={rep.id}
                className="p-4 rounded-2xl border border-[#C5CCC7] bg-[#F2F5F1]/60 space-y-2.5 transition-all hover:bg-white hover:shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#191C1A] bg-white px-2.5 py-0.5 rounded-lg border border-[#C5CCC7]">
                      #{rep.id}
                    </span>
                    <span className="text-xs font-bold text-[#191C1A] font-fraunces">
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

                <div className="flex items-center gap-2 text-xs text-[#4A514C]">
                  <span className="flex items-center gap-1 text-[#2F5D4A] font-bold">
                    <MapPin className="w-3.5 h-3.5" />
                    {rep.location_name}
                  </span>
                  <span>•</span>
                  <span>Ngày gửi: {rep.created_at}</span>
                </div>

                <p className="text-xs text-[#191C1A] leading-relaxed m-0 bg-white p-2.5 rounded-xl border border-[#C5CCC7]/60">
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
        <div className="flex items-center justify-between pt-2 border-t border-[#C5CCC7]">
          <span className="text-xs text-[#4A514C]">
            Tổng số phản ánh: <strong>{displayReports.length} vụ</strong>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-[#2F5D4A] hover:bg-[#254B3C] !text-white text-xs font-bold cursor-pointer transition-all border-0 shadow-xs"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}

