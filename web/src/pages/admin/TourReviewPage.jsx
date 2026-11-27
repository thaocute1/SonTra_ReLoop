import React, { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, Search, X, XCircle } from "lucide-react";
import RouteMapPreview from "../../components/common/RouteMapPreview";
import { adminTourService } from "../../services/adminTourService";
import { extractErrorMessage } from "../../utils/apiError";
import { realtimeBus } from "../../lib/realtimeBus";
import { PageHeader } from "../../components/ui/SaasPrimitives";

const TABS = [
  ["pending_approval", "Chờ duyệt"],
  ["published", "Đã xuất bản"],
  ["rejected", "Đã từ chối"],
  ["all", "Tất cả"],
];

const STATUS_LABELS = {
  pending_approval: "Chờ BQL phê duyệt",
  published: "Đã xuất bản",
  rejected: "Đã từ chối",
  draft: "Bản nháp",
  need_info: "Cần bổ sung",
  approved: "Đã duyệt",
  suspended: "Tạm ngưng",
  closed: "Đã đóng",
};

const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;
const formatDate = (value) =>
  value ? new Date(value).toLocaleString("vi-VN") : "Chưa cập nhật";

function StatusBadge({ status }) {
  const tone =
    status === "published" ? "moss" : status === "rejected" ? "urgent" : "warn";
  return (
    <span className={`sr-badge sr-badge-${tone}`}>
      <span className="sr-badge-dot" aria-hidden="true" />
      <span>{STATUS_LABELS[status] || status}</span>
    </span>
  );
}

export default function TourReviewPage() {
  const [filter, setFilter] = useState("pending_approval");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [items, setItems] = useState([]);
  const [metrics, setMetrics] = useState({
    pending_approval: 0,
    published: 0,
    rejected: 0,
    all: 0,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    adminTourService
      .list({ status: filter, search, page }, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setItems(data.results);
        setMetrics(data.metrics);
        setTotalPages(data.total_pages);
        setCount(data.count);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setError(
          extractErrorMessage(err, "Không thể tải danh sách tour. Vui lòng thử lại.")
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filter, search, page, reload]);

  useEffect(() => {
    if (selectedId === null) return undefined;
    const controller = new AbortController();
    setDetail(null);
    setReason("");
    setDetailError("");
    setDetailLoading(true);
    adminTourService
      .detail(selectedId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setDetail(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setDetailError(extractErrorMessage(err, "Không thể tải chi tiết tour."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [selectedId]);

  useEffect(() => {
    if (selectedId === null) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) setSelectedId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, submitting]);

  const review = async (action) => {
    if (submitting || !detail || detail.status !== "pending_approval") return;
    if (action === "reject" && !reason.trim()) {
      setDetailError("Vui lòng nhập lý do từ chối tour.");
      return;
    }
    setSubmitting(true);
    setDetailError("");
    try {
      const result = await adminTourService.review(
        detail.id,
        action,
        action === "reject" ? reason.trim() : ""
      );
      setNotice(result.message);
      setSelectedId(null);
      setReload((value) => value + 1);
      realtimeBus.emit("TOUR_REVIEWED", {
        tourId: detail.id,
        status: result.data.status,
      });
      window.dispatchEvent(new Event("tour-reviews-updated"));
    } catch (err) {
      setDetailError(
        extractErrorMessage(err, "Không thể xử lý tour. Vui lòng thử lại.")
      );
      if (err.response?.status === 409) {
        setDetail(null);
        setReload((value) => value + 1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sr-page">
      <PageHeader
        title="Duyệt & xuất bản tour"
        subtitle="Kiểm tra thông tin trải nghiệm, tuyến GPS checkpoint và lịch khởi hành trước khi đưa tour đến du khách."
        actions={
          <button
            type="button"
            className="sr-btn sr-btn-sm sr-btn-secondary"
            disabled={loading}
            onClick={() => setReload((value) => value + 1)}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
            <span>Tải lại</span>
          </button>
        }
      />

      {/* Band 1: Asymmetric Queue Lead */}
      <section className="sr-grid-8-4" aria-label="Thống kê duyệt tour">
        <article className="sr-hero-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--sr-text-muted)]">
                Hàng đợi chờ BQL phê duyệt
              </span>
              <strong className="sr-metric-hero sr-tabular">
                {metrics.pending_approval} tuyến chờ xuất bản
              </strong>
            </div>
            <span className="sr-badge sr-badge-warn">
              <span className="sr-badge-dot" aria-hidden="true" />
              <span>Cần thẩm định GPS & sức chứa</span>
            </span>
          </div>
        </article>

        <article className="sr-card justify-between">
          <div className="sr-kv-row">
            <span className="text-[var(--sr-text-secondary)]">Đã xuất bản công khai</span>
            <strong className="sr-tabular text-[var(--sr-accent-ink)]">
              {metrics.published} tuyến
            </strong>
          </div>
          <div className="sr-kv-row">
            <span className="text-[var(--sr-text-secondary)]">Đã từ chối / Yêu cầu sửa</span>
            <strong className="sr-tabular text-[var(--sr-urgent-ink)]">
              {metrics.rejected} tuyến
            </strong>
          </div>
        </article>
      </section>

      {notice && (
        <p role="status" className="sr-callout sr-callout-moss m-0">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="sr-callout sr-callout-urgent m-0">
          {error}
        </p>
      )}

      {/* Band 2: Filter Toolbar + Tour Queue Table */}
      <section className="sr-table-card">
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sr-border)]">
          <div className="sr-segment-group" role="group" aria-label="Lọc trạng thái tour">
            {TABS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => {
                  setFilter(value);
                  setPage(1);
                }}
                className={`sr-segment-btn ${filter === value ? "is-selected" : ""}`}
              >
                {`${label} (${metrics[value]})`}
              </button>
            ))}
          </div>

          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(searchInput.trim());
              setPage(1);
            }}
          >
            <div className="sr-toolbar-search">
              <Search size={14} aria-hidden="true" />
              <input
                type="search"
                aria-label="Tìm tour hoặc đối tác"
                placeholder="Tên tour hoặc đối tác"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                maxLength={150}
              />
            </div>
            <button
              className="sr-btn sr-btn-sm sr-btn-secondary"
              type="submit"
              aria-label="Tìm kiếm"
            >
              <Search size={14} />
            </button>
          </form>
        </div>

        {loading ? (
          <p role="status" className="p-8 text-center text-sm text-[var(--sr-text-muted)]">
            Đang tải danh sách tour...
          </p>
        ) : !items.length ? (
          <p className="p-8 text-center text-sm text-[var(--sr-text-muted)]">
            {error ? "Chưa tải được dữ liệu tour." : "Không có tour phù hợp với bộ lọc."}
          </p>
        ) : (
          <div className="sr-table-scroll">
            <table className="sr-table">
              <caption className="sr-only">Danh sách tour chờ kiểm duyệt</caption>
              <thead>
                <tr>
                  <th scope="col">Tour / đối tác</th>
                  <th scope="col">Giá vé</th>
                  <th scope="col">Ngày gửi</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((tour) => (
                  <tr key={tour.id}>
                    <td>
                      <p className="font-semibold m-0">{tour.title}</p>
                      <p className="text-xs text-[var(--sr-text-muted)] mt-1 m-0">
                        {tour.vendor_name} · #{tour.id}
                      </p>
                    </td>
                    <td className="whitespace-nowrap font-semibold sr-tabular">
                      {money(tour.price)}
                    </td>
                    <td className="whitespace-nowrap text-xs text-[var(--sr-text-muted)]">
                      {formatDate(tour.created_at)}
                    </td>
                    <td>
                      <StatusBadge status={tour.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="sr-btn sr-btn-sm sr-btn-secondary whitespace-nowrap"
                        onClick={() => setSelectedId(tour.id)}
                      >
                        {tour.status === "pending_approval" ? "Xem & duyệt" : "Xem chi tiết"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="p-4 flex flex-wrap justify-between items-center gap-3 border-t border-[var(--sr-border)] text-xs text-[var(--sr-text-muted)]">
          <span>
            {count} tour · Trang {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="sr-btn sr-btn-sm sr-btn-secondary"
              disabled={loading || page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Trang trước
            </button>
            <button
              type="button"
              className="sr-btn sr-btn-sm sr-btn-secondary"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Trang sau
            </button>
          </div>
        </footer>
      </section>

      {selectedId !== null && (
        <div
          className="sr-modal-backdrop motion-backdrop-enter"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-review-title"
        >
          <section className="sr-modal-panel motion-modal-enter">
            <header className="shrink-0 bg-[var(--sr-bg-surface)] border-b border-[var(--sr-border)] p-5 flex justify-between items-center gap-4">
              <h2 id="tour-review-title" className="sr-h2 m-0">
                Chi tiết & kiểm duyệt tour
              </h2>
              <button
                type="button"
                aria-label="Đóng chi tiết tour"
                disabled={submitting}
                onClick={() => setSelectedId(null)}
                className="sr-btn sr-btn-sm sr-btn-ghost"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-5">
              {detailLoading && (
                <p role="status" className="text-sm text-[var(--sr-text-muted)]">
                  Đang tải chi tiết tour...
                </p>
              )}
              {detailError && (
                <p role="alert" className="sr-callout sr-callout-urgent m-0">
                  {detailError}
                </p>
              )}
              {detail && (
                <>
                  <div className="grid sm:grid-cols-[200px_1fr] gap-5">
                    <img
                      src={detail.cover_image_url}
                      alt={detail.title}
                      className="w-full h-40 object-cover rounded-lg border border-[var(--sr-border)]"
                    />
                    <div className="flex flex-col gap-2">
                      <div>
                        <StatusBadge status={detail.status} />
                      </div>
                      <h3 className="sr-h2 m-0">{detail.title}</h3>
                      <p className="text-xs text-[var(--sr-text-secondary)] m-0">
                        Đối tác: {detail.vendor_name} ·{" "}
                        {detail.vendor_status === "approved"
                          ? "Đã được duyệt"
                          : "Chưa đủ điều kiện xuất bản"}
                      </p>
                      <p className="text-xs text-[var(--sr-text-muted)] m-0">
                        Gửi ngày {formatDate(detail.created_at)}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-[var(--sr-text-secondary)] whitespace-pre-wrap m-0">
                    {detail.description || "Chưa có mô tả."}
                  </p>

                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--sr-bg-page)] border border-[var(--sr-border)] rounded-lg p-4 m-0">
                    {[
                      ["Giá vé", money(detail.price)],
                      ["Thời lượng", `${detail.duration_hours} giờ`],
                      ["Độ khó", detail.difficulty_label],
                      ["Sức chứa", `${detail.max_capacity} khách`],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs text-[var(--sr-text-muted)]">{label}</dt>
                        <dd className="mt-1 m-0 text-sm font-semibold">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <section className="flex flex-col gap-2">
                    <h4 className="text-sm font-semibold m-0">Tuyến GPS & điểm kiểm tra</h4>
                    {detail.route?.coordinates?.length > 1 ? (
                      <>
                        <p className="text-xs text-[var(--sr-text-secondary)] m-0">
                          {detail.route.start_point} đến {detail.route.end_point} ·{" "}
                          {detail.route.total_distance_km} km
                        </p>
                        <RouteMapPreview
                          coordinates={detail.route.coordinates}
                          checkpoints={detail.checkpoints || []}
                          tourTitle={detail.title}
                          height="16.25rem"
                          scrollWheelZoom={false}
                        />
                      </>
                    ) : (
                      <p className="text-xs text-[var(--sr-text-muted)] m-0">
                        Chưa có dữ liệu tuyến GPS.
                      </p>
                    )}
                    {(detail.checkpoints || []).length > 0 && (
                      <ol className="mt-2 text-xs flex flex-col gap-1 pl-4 m-0">
                        {detail.checkpoints.map((checkpoint, index) => (
                          <li key={checkpoint.id || index}>{checkpoint.name}</li>
                        ))}
                      </ol>
                    )}
                  </section>

                  <section className="flex flex-col gap-2">
                    <h4 className="text-sm font-semibold m-0">Lịch khởi hành sắp tới</h4>
                    {!(detail.schedules || []).length ? (
                      <p className="text-xs text-[var(--sr-text-muted)] m-0">
                        Chưa có lịch khởi hành sắp tới.
                      </p>
                    ) : (
                      <ul className="text-xs flex flex-col gap-2 list-none p-0 m-0">
                        {detail.schedules.map((schedule) => (
                          <li
                            key={schedule.id}
                            className="rounded-lg bg-[var(--sr-bg-page)] border border-[var(--sr-border)] p-3"
                          >
                            {schedule.formatted_date} · {schedule.time_slot} ·{" "}
                            {schedule.max_capacity} chỗ · {money(schedule.price)}
                            {schedule.guide_name && ` · HDV: ${schedule.guide_name}`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {detail.status === "published" && (
                    <p className="sr-callout sr-callout-moss m-0">
                      Đã xuất bản bởi {detail.approved_by_name || "BQL"} ·{" "}
                      {formatDate(detail.approved_at)}
                    </p>
                  )}
                  {detail.rejection_reason && (
                    <p className="sr-callout sr-callout-urgent m-0">
                      Lý do từ chối: {detail.rejection_reason}
                    </p>
                  )}

                  {detail.status === "pending_approval" && (
                    <section className="border-t border-[var(--sr-border)] pt-4 flex flex-col gap-3">
                      <p className="text-xs text-[var(--sr-text-secondary)] m-0">
                        Phê duyệt sẽ xuất bản tour cho du khách và cho phép đối tác đăng ký
                        Flash Sale. Đối tác phải có hồ sơ đã được duyệt và tài khoản đang
                        hoạt động.
                      </p>
                      <div className="sr-field">
                        <label htmlFor="tour-rejection-reason" className="sr-field-label">
                          Lý do từ chối (bắt buộc khi từ chối)
                        </label>
                        <textarea
                          id="tour-rejection-reason"
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          disabled={submitting}
                          rows={3}
                          maxLength={2000}
                          className="sr-textarea"
                          placeholder="Nội dung cần đối tác điều chỉnh..."
                        />
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={submitting || !reason.trim()}
                          onClick={() => review("reject")}
                          className="sr-btn sr-btn-sm sr-btn-destructive"
                        >
                          <XCircle size={15} aria-hidden="true" />
                          <span>Từ chối tour</span>
                        </button>
                        <button
                          type="button"
                          disabled={submitting || detail.vendor_status !== "approved"}
                          onClick={() => review("approve")}
                          className="sr-btn sr-btn-sm sr-btn-primary"
                        >
                          <CheckCircle2 size={15} aria-hidden="true" />
                          <span>
                            {submitting ? "Đang xử lý..." : "Phê duyệt & xuất bản"}
                          </span>
                        </button>
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
