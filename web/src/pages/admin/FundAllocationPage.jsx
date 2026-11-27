import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronRight,
  ExternalLink,
  FileText,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { api } from "../../lib/axios";
import { PageHeader, SaasSelect } from "../../components/ui/SaasPrimitives";

const CATEGORY_OPTIONS = [
  { value: "wildlife_protection", label: "Cứu hộ & bảo vệ voọc chà vá chân nâu" },
  { value: "reforestation", label: "Trồng rừng và phục hồi sinh thái" },
  { value: "rescue_equipment", label: "Trang thiết bị cứu hộ & tuần tra" },
  { value: "eco_trash_program", label: "Thu gom & tái chế rác thải Eco-Trash" },
  { value: "community_support", label: "Hỗ trợ cộng đồng địa phương và tình nguyện" },
];

const CATEGORY_COLOR_MAP = {
  wildlife_protection: "#176B50",
  reforestation: "#286477",
  rescue_equipment: "#A66A16",
  patrol_equipment: "#A66A16",
  eco_trash_program: "#8FAE9B",
  clean_up: "#8FAE9B",
  community_support: "#515E57",
};

const FALLBACK_PALETTE = ["#176B50", "#286477", "#A66A16", "#8FAE9B", "#515E57"];

const PERIOD_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả thời gian" },
  { value: "30d", label: "30 ngày gần đây" },
  { value: "90d", label: "90 ngày gần đây" },
  { value: "year", label: "Trong năm nay" },
];

function parseDisbursedDate(dateStr) {
  if (!dateStr) return null;
  const parts = String(dateStr).trim().split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);
    if (day && month && year) return new Date(year, month - 1, day);
  }
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function FundAllocationPage() {
  const { globalSearch = "" } = useOutletContext() || {};
  const [loading, setLoading] = useState(false);
  const [fundData, setFundData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedAlloc, setSelectedAlloc] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    project_name: "",
    category: "wildlife_protection",
    allocated_amount: "",
    description: "",
  });

  const fetchFundData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/payments/conservation-funds/");
      setFundData(res.data);
    } catch {
      /* Keep fallback display when API is unavailable */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFundData();
  }, []);

  const handleCreateAllocation = async (e) => {
    e.preventDefault();
    if (!form.project_name || !form.allocated_amount) {
      alert("Vui lòng nhập tên hạng mục và số tiền giải ngân!");
      return;
    }

    const amountNum = parseFloat(form.allocated_amount.replace(/\D/g, ""));
    if (!amountNum || amountNum <= 0) {
      alert("Số tiền giải ngân không hợp lệ!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/payments/conservation-funds/allocate/", {
        project_name: form.project_name,
        category: form.category,
        amount: amountNum,
        allocated_amount: amountNum,
        notes: form.description,
        description: form.description,
      });

      const resData = res.data;
      if (resData?.status === "success" || resData?.success) {
        alert(`Đã duyệt giải ngân quỹ bảo tồn thành công!\n\n${resData.message}`);
        setShowModal(false);
        setForm({
          project_name: "",
          category: "wildlife_protection",
          allocated_amount: "",
          description: "",
        });
        fetchFundData();
      } else {
        alert(`Lỗi giải ngân: ${resData?.message || resData?.error || "Không thể thực hiện"}`);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error;
      alert(errMsg ? `Lỗi giải ngân: ${errMsg}` : "Không thể kết nối tới API backend!");
    } finally {
      setSubmitting(false);
    }
  };

  const allocations = useMemo(
    () => (Array.isArray(fundData?.allocations) ? fundData.allocations : []),
    [fundData]
  );

  const remainingFormatted = fundData?.remaining_fund_formatted || "0 đ";
  const accumulatedFormatted = fundData?.total_fund_accumulated_formatted || "0 đ";
  const disbursedFormatted = fundData?.total_disbursed_formatted || "0 đ";

  const categoryLabelMap = useMemo(
    () => Object.fromEntries(CATEGORY_OPTIONS.map((opt) => [opt.value, opt.label])),
    []
  );

  // Single source of truth shared between Allocation Progress & Donut Chart
  const shares = useMemo(() => {
    const totals = allocations.reduce((acc, alloc) => {
      const key = alloc.category || "other";
      if (!acc[key]) {
        acc[key] = {
          key,
          label: alloc.category_label || categoryLabelMap[key] || key,
          rawAmount: 0,
        };
      }
      acc[key].rawAmount += Number(alloc.allocated_amount || 0);
      return acc;
    }, {});

    const entries = Object.values(totals).sort((a, b) => b.rawAmount - a.rawAmount);
    const totalAllocatedSum = entries.reduce((sum, item) => sum + item.rawAmount, 0);

    return entries.map((item, index) => ({
      key: item.key,
      label: item.label,
      rawAmount: item.rawAmount,
      pct: totalAllocatedSum > 0 ? Number(((item.rawAmount / totalAllocatedSum) * 100).toFixed(1)) : 0,
      amount: `${Number(item.rawAmount).toLocaleString("vi-VN")} VNĐ`,
      color: CATEGORY_COLOR_MAP[item.key] || FALLBACK_PALETTE[index % FALLBACK_PALETTE.length],
    }));
  }, [allocations, categoryLabelMap]);

  const categoryFilterOptions = useMemo(() => {
    const seen = new Map();
    allocations.forEach((alloc) => {
      if (alloc.category && !seen.has(alloc.category)) {
        seen.set(alloc.category, alloc.category_label || categoryLabelMap[alloc.category] || alloc.category);
      }
    });
    return [
      { value: "all", label: "Tất cả chuyên đề" },
      ...Array.from(seen.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [allocations, categoryLabelMap]);

  const filteredAllocations = useMemo(() => {
    const now = new Date();
    const query = globalSearch.trim().toLowerCase();

    return allocations.filter((alloc) => {
      if (categoryFilter !== "all" && alloc.category !== categoryFilter) {
        return false;
      }

      if (periodFilter !== "all") {
        const dt = parseDisbursedDate(alloc.disbursed_at);
        if (!dt) return false;
        if (periodFilter === "year") {
          if (dt.getFullYear() !== now.getFullYear()) return false;
        } else {
          const days = periodFilter === "30d" ? 30 : 90;
          const cutoff = new Date(now);
          cutoff.setDate(cutoff.getDate() - days);
          if (dt < cutoff) return false;
        }
      }

      if (query) {
        const text = `${alloc.project_name || ""} ${alloc.category_label || ""} ${alloc.notes || ""} ${alloc.beneficiary_name || ""}`.toLowerCase();
        if (!text.includes(query)) return false;
      }

      return true;
    });
  }, [allocations, categoryFilter, periodFilter, globalSearch]);

  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let cumulativePct = 0;

  return (
    <div className="sr-page">
      <PageHeader
        title="Quỹ bảo tồn & Phân bổ"
        subtitle="Đối chiếu nguồn thu 10% từ mỗi vé tour và kiểm soát minh bạch các hạng mục giải ngân"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fetchFundData}
              disabled={loading}
              className="sr-btn sr-btn-sm sr-btn-secondary"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
              <span>Làm mới số liệu</span>
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="sr-btn sr-btn-sm sr-btn-primary"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Lập lệnh giải ngân</span>
            </button>
          </div>
        }
      />

      {/* Khu vực 1: Cân bằng 7/5 Tổng quan tài chính & Biểu đồ phân bổ */}
      <section className="sr-grid-7-5" aria-label="Tổng quan tài chính và cơ cấu phân bổ quỹ bảo tồn">
        {/* Bên trái: Financial Summary + Allocation Progress */}
        <article className="rounded-[14px] border border-[#E7EBE5] bg-white p-5 sm:p-6 shadow-[0_2px_10px_rgba(37,49,43,0.03)] flex flex-col justify-between gap-5">
          {/* Compact 3-metric Financial Summary */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="sr-h2 m-0 text-[#25312B]">Tổng quan tài chính quỹ</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#CFE2D7] bg-[#EDF5F0] px-2.5 py-1 text-xs font-medium text-[#176B50]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#176B50]" aria-hidden="true" />
                <span>10% trích từ split payment</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-[12px] border border-[#E7EBE5] bg-[#F7F8F4] p-4">
              <div className="flex flex-col gap-1 sm:pr-3 sm:border-r sm:border-[#E7EBE5]">
                <span className="text-xs font-medium text-[#78827B]">
                  Số dư khả dụng
                </span>
                <strong className="text-xl sm:text-[22px] font-bold tracking-tight text-[#176B50] sr-tabular leading-tight">
                  {remainingFormatted}
                </strong>
                <span className="text-[11px] text-[#78827B]">Sẵn sàng phân bổ</span>
              </div>

              <div className="flex flex-col gap-1 sm:px-2 sm:border-r sm:border-[#E7EBE5]">
                <span className="text-xs font-medium text-[#78827B]">
                  Tổng thu tích lũy
                </span>
                <strong className="text-lg sm:text-[19px] font-semibold tracking-tight text-[#25312B] sr-tabular leading-tight">
                  {accumulatedFormatted}
                </strong>
                <span className="text-[11px] text-[#78827B]">Nguồn thu bảo tồn</span>
              </div>

              <div className="flex flex-col gap-1 sm:pl-2">
                <span className="text-xs font-medium text-[#78827B]">
                  Tổng giải ngân
                </span>
                <strong className="text-lg sm:text-[19px] font-semibold tracking-tight text-[#25312B] sr-tabular leading-tight">
                  {disbursedFormatted}
                </strong>
                <span className="text-[11px] text-[#78827B] sr-tabular">
                  {allocations.length} lệnh đã duyệt
                </span>
              </div>
            </div>
          </div>

          {/* Allocation Progress */}
          <div className="flex flex-col gap-3.5 border-t border-[#E7EBE5] pt-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="m-0 text-sm font-semibold text-[#25312B]">
                Tiến trình phân bổ theo hạng mục
              </h3>
              <span className="text-xs text-[#78827B]">Tỷ lệ trên tổng giải ngân</span>
            </div>

            {shares.length === 0 ? (
              <p className="m-0 py-4 text-sm text-[#78827B]">
                {loading ? "Đang tải cơ cấu phân bổ quỹ..." : "Chưa có dữ liệu phân bổ theo hạng mục."}
              </p>
            ) : (
              <div className="flex flex-col gap-3.5">
                {shares.map((item) => {
                  const dimmed = hoveredCategory && hoveredCategory !== item.key;
                  return (
                    <div
                      key={item.key}
                      onMouseEnter={() => setHoveredCategory(item.key)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      className={`flex flex-col gap-1.5 transition-opacity duration-150 ${
                        dimmed ? "opacity-45" : "opacity-100"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="flex items-center gap-2 font-medium text-[#25312B] min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                            aria-hidden="true"
                          />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <span className="shrink-0 sr-tabular text-right">
                          <strong className="font-semibold text-[#25312B]">{item.amount}</strong>
                          <span className="ml-1.5 text-xs font-medium text-[#78827B]">
                            ({item.pct}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#EDF1EB]">
                        <div
                          className="h-full rounded-full transition-[width] duration-300"
                          style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </article>

        {/* Bên phải: Biểu đồ phân bổ + Xác nhận minh bạch */}
        <article className="rounded-[14px] border border-[#E7EBE5] bg-white p-5 sm:p-6 shadow-[0_2px_10px_rgba(37,49,43,0.03)] flex flex-col justify-between gap-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="sr-h2 m-0 text-[#25312B]">Tỷ trọng giải ngân</h2>
            <span className="text-xs text-[#78827B]">Theo chuyên đề</span>
          </div>

          {shares.length === 0 ? (
            <p className="m-0 py-10 text-center text-sm text-[#78827B]">
              {loading ? "Đang tải biểu đồ phân bổ..." : "Chưa có dữ liệu tỷ trọng giải ngân."}
            </p>
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              <div className="relative h-44 w-44 sm:h-48 sm:w-48 shrink-0">
                <svg
                  viewBox="0 0 180 180"
                  className="h-full w-full"
                  role="img"
                  aria-label="Biểu đồ tỷ trọng giải ngân quỹ bảo tồn"
                >
                  <circle
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="none"
                    stroke="#EDF1EB"
                    strokeWidth="22"
                  />
                  {shares.map((slice) => {
                    const dashLen = (slice.pct / 100) * circumference;
                    const dashOffset = -((cumulativePct / 100) * circumference);
                    cumulativePct += slice.pct;
                    const dimmed = hoveredCategory && hoveredCategory !== slice.key;
                    return (
                      <circle
                        key={slice.key}
                        cx="90"
                        cy="90"
                        r={radius}
                        fill="none"
                        stroke={slice.color}
                        strokeWidth="22"
                        strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                        strokeDashoffset={dashOffset}
                        transform="rotate(-90 90 90)"
                        className="cursor-pointer transition-opacity duration-150"
                        style={{ opacity: dimmed ? 0.35 : 1 }}
                        onMouseEnter={() => setHoveredCategory(slice.key)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      />
                    );
                  })}
                </svg>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
                  <span className="text-[11px] font-medium text-[#78827B]">
                    Tổng giải ngân
                  </span>
                  <strong className="mt-0.5 text-[14px] font-bold leading-tight text-[#25312B] sr-tabular">
                    {disbursedFormatted}
                  </strong>
                </div>
              </div>

              <div className="flex w-full flex-1 flex-col gap-2.5 min-w-0">
                {shares.map((slice) => {
                  const dimmed = hoveredCategory && hoveredCategory !== slice.key;
                  return (
                    <div
                      key={slice.key}
                      onMouseEnter={() => setHoveredCategory(slice.key)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      className={`flex items-center justify-between gap-2.5 rounded-[8px] px-2 py-1.5 text-[13px] transition-colors cursor-default ${
                        hoveredCategory === slice.key ? "bg-[#F7F8F4]" : ""
                      } ${dimmed ? "opacity-45" : "opacity-100"}`}
                    >
                      <span className="flex items-center gap-2 text-[#515E57] min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: slice.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{slice.label}</span>
                      </span>
                      <strong className="shrink-0 font-semibold text-[#25312B] sr-tabular">
                        {slice.pct}%
                      </strong>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Khu vực xác nhận minh bạch */}
          <div className="flex items-center gap-2.5 rounded-[10px] border border-[#CFE2D7] bg-[#EDF5F0] px-3.5 py-2.5 text-[13px] text-[#176B50]">
            <ShieldCheck size={17} className="shrink-0 text-[#176B50]" aria-hidden="true" />
            <span className="font-medium leading-snug">
              100% lệnh giải ngân kèm chứng từ nghiệm thu BQL Sơn Trà.
            </span>
          </div>
        </article>
      </section>

      {/* Khu vực 2: Sổ cái phân bổ & giải ngân */}
      <section className="flex flex-col gap-3" aria-label="Sổ cái giải ngân quỹ bảo tồn">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h2 className="sr-h2 m-0 text-[#25312B]">
              Sổ cái phân bổ & giải ngân ({filteredAllocations.length})
            </h2>
            <span className="text-xs text-[#78827B]">
              Đồng bộ thời gian thực từ cơ sở dữ liệu
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SaasSelect
              label="Chuyên đề"
              value={categoryFilter}
              options={categoryFilterOptions}
              onChange={setCategoryFilter}
            />
            <SaasSelect
              label="Thời gian"
              value={periodFilter}
              options={PERIOD_FILTER_OPTIONS}
              onChange={setPeriodFilter}
            />
          </div>
        </div>

        <div className="rounded-[14px] border border-[#E7EBE5] bg-white shadow-[0_2px_10px_rgba(37,49,43,0.03)] overflow-hidden">
          <div className="sr-table-scroll">
            <table className="w-full border-collapse text-left text-[13.5px]">
              <caption className="sr-only">Danh sách các hạng mục giải ngân quỹ bảo tồn</caption>
              <thead>
                <tr className="border-b border-[#E7EBE5] bg-[#F9FAF8]">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-[#78827B] whitespace-nowrap">
                    Hạng mục dự án bảo tồn
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-[#78827B] whitespace-nowrap">
                    Chuyên đề
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-[#78827B] whitespace-nowrap">
                    Số tiền duyệt
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-[#78827B] whitespace-nowrap">
                    Ngày giải ngân
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-[#78827B] whitespace-nowrap">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-[#78827B] whitespace-nowrap">
                    Chi tiết
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EBE5]">
                {filteredAllocations.length > 0 ? (
                  filteredAllocations.map((alloc) => {
                    const catColor = CATEGORY_COLOR_MAP[alloc.category] || "#176B50";
                    return (
                      <tr
                        key={alloc.id}
                        tabIndex={0}
                        onClick={() => setSelectedAlloc(alloc)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedAlloc(alloc);
                          }
                        }}
                        className="cursor-pointer transition-colors hover:bg-[#F3F6F2] focus-visible:bg-[#F3F6F2] focus-visible:outline-none"
                      >
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-[#25312B]">
                              {alloc.project_name}
                            </span>
                            {(alloc.notes || alloc.description) && (
                              <span className="text-xs text-[#78827B] line-clamp-1">
                                {alloc.notes || alloc.description}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-[#515E57]">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: catColor }}
                              aria-hidden="true"
                            />
                            <span>{alloc.category_label}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 align-middle text-right font-semibold text-[#25312B] sr-tabular whitespace-nowrap">
                          {alloc.allocated_amount_formatted}
                        </td>
                        <td className="px-4 py-3.5 align-middle text-xs text-[#78827B] sr-tabular whitespace-nowrap">
                          {alloc.disbursed_at}
                        </td>
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#CFE2D7] bg-[#EDF5F0] px-2.5 py-0.5 text-xs font-medium text-[#176B50]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#176B50]" aria-hidden="true" />
                            <span>Đã giải ngân</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 align-middle text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#176B50]">
                            <span>Xem</span>
                            <ChevronRight size={14} aria-hidden="true" />
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#78827B]">
                      {loading
                        ? "Đang tải sổ cái quỹ bảo tồn..."
                        : allocations.length > 0
                        ? "Không có lệnh giải ngân phù hợp với bộ lọc hiện tại."
                        : "Chưa có lệnh giải ngân nào."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Modal chi tiết lệnh giải ngân (chỉ hiển thị dữ liệu thật từ API) */}
      {selectedAlloc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="alloc-detail-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedAlloc(null);
          }}
          className="sr-modal-backdrop motion-backdrop-enter"
        >
          <div className="sr-modal-panel p-6 gap-4 motion-modal-enter" style={{ maxWidth: "36rem" }}>
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E7EBE5]">
              <div className="min-w-0">
                <span className="text-xs font-medium text-[#78827B] sr-tabular">
                  Mã lệnh #QBT-{String(selectedAlloc.id).padStart(4, "0")}
                </span>
                <h2 id="alloc-detail-title" className="sr-h2 m-0 mt-0.5 text-[#25312B]">
                  {selectedAlloc.project_name}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Đóng chi tiết lệnh giải ngân"
                onClick={() => setSelectedAlloc(null)}
                className="sr-btn sr-btn-sm sr-btn-ghost shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-[12px] border border-[#E7EBE5] bg-[#F7F8F4] p-4">
              <div>
                <span className="text-xs text-[#78827B]">Số tiền duyệt chi</span>
                <p className="m-0 mt-1 text-lg font-bold text-[#176B50] sr-tabular">
                  {selectedAlloc.allocated_amount_formatted}
                </p>
              </div>
              <div>
                <span className="text-xs text-[#78827B]">Trạng thái</span>
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#CFE2D7] bg-[#EDF5F0] px-2.5 py-0.5 text-xs font-medium text-[#176B50]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#176B50]" aria-hidden="true" />
                    <span>Đã giải ngân</span>
                  </span>
                </div>
              </div>
              <div>
                <span className="flex items-center gap-1 text-xs text-[#78827B]">
                  <Calendar size={12} aria-hidden="true" />
                  <span>Ngày giải ngân</span>
                </span>
                <p className="m-0 mt-1 text-sm font-medium text-[#25312B] sr-tabular">
                  {selectedAlloc.disbursed_at}
                </p>
              </div>
              <div>
                <span className="flex items-center gap-1 text-xs text-[#78827B]">
                  <UserCheck size={12} aria-hidden="true" />
                  <span>Đơn vị thụ hưởng</span>
                </span>
                <p className="m-0 mt-1 text-sm font-medium text-[#25312B]">
                  {selectedAlloc.beneficiary_name || "Đội Tuần Tra & Cứu Hộ BQL"}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[#78827B]">Chuyên đề bảo tồn</span>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-[#25312B]">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: CATEGORY_COLOR_MAP[selectedAlloc.category] || "#176B50",
                  }}
                  aria-hidden="true"
                />
                <span>{selectedAlloc.category_label}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs font-medium text-[#78827B]">
                <FileText size={12} aria-hidden="true" />
                <span>Thuyết minh / Ghi chú nghiệm thu</span>
              </span>
              <p className="m-0 rounded-[10px] border border-[#E7EBE5] bg-white p-3 text-sm text-[#25312B] leading-relaxed">
                {selectedAlloc.notes || selectedAlloc.description || "Không có ghi chú bổ sung."}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E7EBE5]">
              {selectedAlloc.evidence_url ? (
                <a
                  href={selectedAlloc.evidence_url}
                  target="_blank"
                  rel="noreferrer"
                  className="sr-btn sr-btn-sm sr-btn-secondary"
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  <span>Xem chứng từ nghiệm thu</span>
                </a>
              ) : (
                <span className="text-xs text-[#78827B]">
                  Chứng từ bản cứng lưu tại văn phòng BQL Sơn Trà
                </span>
              )}

              <button
                type="button"
                onClick={() => setSelectedAlloc(null)}
                className="sr-btn sr-btn-sm sr-btn-primary"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal lập lệnh giải ngân */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Phân bổ quỹ bảo tồn"
          className="sr-modal-backdrop motion-backdrop-enter"
        >
          <div className="sr-modal-panel p-6 gap-4 motion-modal-enter">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--sr-border)]">
              <h2 className="sr-h2 m-0">Tạo đề xuất giải ngân quỹ bảo tồn</h2>
              <button
                type="button"
                aria-label="Đóng biểu mẫu giải ngân"
                onClick={() => setShowModal(false)}
                className="sr-btn sr-btn-sm sr-btn-ghost"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAllocation} className="flex flex-col gap-4">
              <div className="sr-field">
                <label htmlFor="fund-proj" className="sr-field-label">
                  Tên dự án / hạng mục giải ngân *
                </label>
                <input
                  id="fund-proj"
                  type="text"
                  required
                  value={form.project_name}
                  onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                  placeholder="VD: Mua sắm máy định vị tuần tra kiểm lâm..."
                  className="sr-input"
                />
              </div>

              <div className="sr-field">
                <span className="sr-field-label">Danh mục bảo tồn *</span>
                <SaasSelect
                  value={form.category}
                  options={CATEGORY_OPTIONS}
                  onChange={(val) => setForm({ ...form, category: val })}
                  className="w-full"
                />
              </div>

              <div className="sr-field">
                <label htmlFor="fund-amt" className="sr-field-label">
                  Số tiền giải ngân (VNĐ) *
                </label>
                <input
                  id="fund-amt"
                  type="text"
                  required
                  value={form.allocated_amount}
                  onChange={(e) => setForm({ ...form, allocated_amount: e.target.value })}
                  placeholder="VD: 35000000"
                  className="sr-input"
                />
                <span className="text-xs text-[var(--sr-text-muted)]">
                  Số dư khả dụng hiện tại: {remainingFormatted}
                </span>
              </div>

              <div className="sr-field">
                <label htmlFor="fund-desc" className="sr-field-label">
                  Thuyết minh / mô tả mục đích chi tiết
                </label>
                <textarea
                  id="fund-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Thuyết minh giải trình mục đích và kế hoạch nghiệm thu thực địa..."
                  className="sr-textarea"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--sr-border)]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="sr-btn sr-btn-sm sr-btn-secondary"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="sr-btn sr-btn-sm sr-btn-primary"
                >
                  {submitting && <RefreshCw size={14} className="animate-spin" aria-hidden="true" />}
                  <span>{submitting ? "Đang duyệt..." : "Phê duyệt và giải ngân"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
