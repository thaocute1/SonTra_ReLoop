import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Download, Info, RefreshCw, Search } from "lucide-react";
import { api } from "../../lib/axios";
import { PageHeader, SaasSelect } from "../../components/ui/SaasPrimitives";

const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;
const formatDate = (value) =>
  value ? new Date(value).toLocaleString("vi-VN") : "Chưa thực hiện";

const ORDER_STATUS = {
  confirmed: "Đã xác nhận",
  completed: "Đã hoàn thành",
  ongoing: "Đang diễn ra",
  waiting_payment: "Chờ thanh toán",
  cancelled: "Đã hủy",
};

const BATCH_STATUS_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "completed", label: "Đã ghi nhận hoàn tất" },
  { value: "processing", label: "Đang xử lý" },
  { value: "failed", label: "Thất bại" },
  { value: "cancelled", label: "Đã hủy" },
];

export default function BusinessPayoutsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setExpanded(null);
    api
      .get("/payments/payouts/", { signal: controller.signal })
      .then((response) => setData(response.data))
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(
            err.response?.data?.detail ||
              "Không tải được dữ liệu đối soát. Vui lòng thử lại."
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  const pending = data?.pending_payouts || [];
  const history = data?.batches_history || [];
  const needle = search.trim().toLocaleLowerCase("vi");

  const rows = (tab === "pending" ? pending : history).filter((row) => {
    const text =
      tab === "pending"
        ? `${row.vendor_name} ${row.vendor_id} ${row.orders.map((o) => o.order_code).join(" ")}`
        : `${row.batch_code} ${row.transactions.map((tx) => tx.vendor_name).join(" ")}`;
    return (
      text.toLocaleLowerCase("vi").includes(needle) &&
      (tab === "pending" || status === "all" || row.status === status)
    );
  });

  const summary = data?.summary || {};
  const unpaidOrdersTotal = pending.reduce((sum, row) => sum + row.unpaid_orders_count, 0);

  function exportCSV() {
    const header =
      tab === "pending"
        ? ["Đối tác", "Số đơn đối tác", "Doanh thu gộp", "Phí nền tảng", "Quỹ bảo tồn", "Đối tác nhận"]
        : ["Mã đợt", "Ngày tạo", "Ngày thực hiện", "Tổng tiền", "Trạng thái"];
    const body = rows.map((row) =>
      tab === "pending"
        ? [
            row.vendor_name,
            row.unpaid_orders_count,
            row.gross_amount,
            row.platform_fee,
            row.conservation_fund,
            row.vendor_net_amount,
          ]
        : [
            row.batch_code,
            formatDate(row.created_at),
            formatDate(row.executed_at),
            row.total_amount,
            row.status_label,
          ]
    );
    const csv =
      "\ufeff" +
      [header, ...body]
        .map((row) =>
          row
            .map((value) => `"${String(value ?? "").replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`)
            .join(",")
        )
        .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `doi-soat-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function changeTab(value) {
    setTab(value);
    setExpanded(null);
    setSearch("");
    setStatus("all");
  }

  return (
    <div className="sr-page" aria-busy={loading}>
      <PageHeader
        title="Đối soát sổ cái & Quyết toán đối tác"
        subtitle="Tổng hợp bút toán đơn đặt đã thanh toán, khấu trừ quỹ bảo tồn 10% và phí nền tảng trước giải ngân"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => setRevision((value) => value + 1)}
              aria-label="Làm mới đối soát"
              className="sr-btn sr-btn-sm sr-btn-secondary"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
              <span>Làm mới</span>
            </button>
            <button
              type="button"
              disabled={!data || loading || Boolean(error) || !rows.length}
              onClick={exportCSV}
              className="sr-btn sr-btn-sm sr-btn-primary"
            >
              <Download size={14} aria-hidden="true" />
              <span>Xuất CSV</span>
            </button>
          </div>
        }
      />

      {error && (
        <div role="alert" className="sr-callout sr-callout-urgent justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
            className="sr-btn sr-btn-sm sr-btn-secondary"
          >
            Thử lại
          </button>
        </div>
      )}

      {loading && (
        <p role="status" className="p-8 text-center text-sm text-[var(--sr-text-muted)]">
          Đang tổng hợp dữ liệu đối soát...
        </p>
      )}

      {!loading && !error && data && (
        <>
          {/* Band 1: 8/4 Settlement Lead + Ledger Deductions */}
          <section className="sr-grid-8-4" aria-label="Tổng quan quyết toán đối tác">
            <article className="sr-hero-card">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-[var(--sr-text-muted)]">
                  Chờ quyết toán cho đối tác (chưa ghép đợt)
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <strong className="sr-metric-hero sr-tabular">
                    {money(summary.vendor_net_amount)}
                  </strong>
                  <span className="sr-badge sr-badge-moss">
                    <span className="sr-badge-dot" aria-hidden="true" />
                    <span>
                      {data.pending_vendors_count || 0} đối tác · {unpaidOrdersTotal} đơn hợp lệ
                    </span>
                  </span>
                </div>
              </div>

              <div className="sr-callout sr-callout-moss items-center justify-between">
                <div className="flex items-start gap-2">
                  <Info size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">Đối soát trước khi giải ngân</span>
                    <span>{data.capabilities.reason}</span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  title={data.capabilities.reason}
                  className="sr-btn sr-btn-sm sr-btn-secondary shrink-0"
                >
                  Tạo lệnh giải ngân
                </button>
              </div>
            </article>

            <article className="sr-card justify-between">
              <h2 className="sr-h2 m-0">Khấu trừ trên bút toán chờ</h2>
              <div className="flex flex-col">
                <div className="sr-kv-row">
                  <span className="text-[var(--sr-text-secondary)]">Quỹ bảo tồn liên quan</span>
                  <strong className="sr-tabular text-[var(--sr-accent-ink)]">
                    {money(summary.conservation_fund)}
                  </strong>
                </div>
                <div className="sr-kv-row">
                  <span className="text-[var(--sr-text-secondary)]">Phí nền tảng liên quan</span>
                  <strong className="sr-tabular">{money(summary.platform_fee)}</strong>
                </div>
                <div className="sr-kv-row">
                  <span className="text-[var(--sr-text-secondary)]">Đối tác chờ quyết toán</span>
                  <strong className="sr-tabular">{data.pending_vendors_count || 0} đơn vị</strong>
                </div>
              </div>
              <span className="text-xs text-[var(--sr-text-muted)]">
                Nguồn: sổ cái đơn đã thanh toán, loại trừ đơn đã hủy.
              </span>
            </article>
          </section>

          {/* Band 2: Filter Toolbar + Expandable Payout Ledger Table */}
          <section className="sr-table-card">
            <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sr-border)]">
              <div className="sr-segment-group" role="group" aria-label="Chế độ xem đối soát">
                <button
                  type="button"
                  aria-pressed={tab === "pending"}
                  onClick={() => changeTab("pending")}
                  className={`sr-segment-btn ${tab === "pending" ? "is-selected" : ""}`}
                >
                  Chờ quyết toán ({pending.length})
                </button>
                <button
                  type="button"
                  aria-pressed={tab === "history"}
                  onClick={() => changeTab("history")}
                  className={`sr-segment-btn ${tab === "history" ? "is-selected" : ""}`}
                >
                  Lịch sử đợt ({history.length})
                </button>
              </div>

              <div className="sr-toolbar-group">
                <div className="sr-toolbar-search">
                  <Search size={14} aria-hidden="true" />
                  <input
                    type="text"
                    aria-label="Tìm đối tác hoặc mã đơn, mã đợt"
                    placeholder="Tìm đối tác, mã đơn, mã đợt..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                {tab === "history" && (
                  <SaasSelect
                    label="Trạng thái"
                    value={status}
                    options={BATCH_STATUS_OPTIONS}
                    onChange={setStatus}
                  />
                )}
              </div>
            </div>

            <div className="px-4 py-2.5 border-b border-[var(--sr-border)] text-xs text-[var(--sr-text-muted)]">
              {rows.length} kết quả ·{" "}
              {tab === "pending"
                ? "Tổng tiền chờ quyết toán, không giới hạn theo tháng."
                : "Trạng thái được ghi nhận trong hệ thống; cần đối chiếu chứng từ ngân hàng."}
            </div>

            <div className="sr-table-scroll">
              <table className="sr-table">
                <caption className="sr-only">Sổ cái đối soát và giải ngân đối tác</caption>
                <thead>
                  <tr>
                    {(tab === "pending"
                      ? [
                          "Đối tác",
                          "Số đơn",
                          "Doanh thu gộp",
                          "Phí nền tảng",
                          "Quỹ bảo tồn",
                          "Đối tác nhận",
                          "Chi tiết",
                        ]
                      : ["Mã đợt", "Ngày tạo", "Ngày thực hiện", "Tổng tiền", "Trạng thái", "Chi tiết"]
                    ).map((label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const key = tab === "pending" ? row.vendor_id : row.id;
                    const open = expanded === key;
                    return (
                      <React.Fragment key={key}>
                        <tr className={open ? "is-selected" : ""}>
                          {tab === "pending" ? (
                            <>
                              <td>
                                <div className="flex flex-col">
                                  <span className="font-semibold">{row.vendor_name}</span>
                                  <span className="text-xs text-[var(--sr-text-muted)]">
                                    Đối tác #{row.vendor_id}
                                  </span>
                                </div>
                              </td>
                              <td className="sr-tabular">{row.unpaid_orders_count}</td>
                              <td className="sr-tabular">{money(row.gross_amount)}</td>
                              <td className="sr-tabular">{money(row.platform_fee)}</td>
                              <td className="sr-tabular text-[var(--sr-accent-ink)] font-medium">
                                {money(row.conservation_fund)}
                              </td>
                              <td className="sr-tabular font-semibold">
                                {money(row.vendor_net_amount)}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="font-semibold">{row.batch_code}</td>
                              <td className="text-xs">{formatDate(row.created_at)}</td>
                              <td className="text-xs">{formatDate(row.executed_at)}</td>
                              <td className="sr-tabular font-semibold">{money(row.total_amount)}</td>
                              <td>
                                <span
                                  className={`sr-badge sr-badge-${
                                    row.status === "completed"
                                      ? "moss"
                                      : row.status === "failed" || row.status === "cancelled"
                                        ? "urgent"
                                        : "warn"
                                  }`}
                                >
                                  <span className="sr-badge-dot" aria-hidden="true" />
                                  <span>{row.status_label}</span>
                                </span>
                              </td>
                            </>
                          )}
                          <td>
                            <button
                              type="button"
                              aria-expanded={open}
                              aria-controls={`payout-detail-${key}`}
                              onClick={() => setExpanded(open ? null : key)}
                              className="sr-btn sr-btn-sm sr-btn-secondary"
                            >
                              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              <span>{open ? "Thu gọn" : "Xem"}</span>
                            </button>
                          </td>
                        </tr>

                        {open && (
                          <tr id={`payout-detail-${key}`}>
                            <td colSpan={tab === "pending" ? 7 : 6}>
                              <div className="sr-subledger-box">
                                <h3 className="text-xs font-semibold m-0 mb-2">
                                  {tab === "pending"
                                    ? "Các bút toán chờ quyết toán"
                                    : "Giao dịch trong đợt"}
                                </h3>
                                <div className="sr-table-scroll">
                                  <table className="sr-table">
                                    <thead>
                                      <tr>
                                        {(tab === "pending"
                                          ? [
                                              "Mã đơn",
                                              "Ngày ghi sổ",
                                              "Trạng thái tour",
                                              "Gộp",
                                              "Phí",
                                              "Quỹ",
                                              "Thuần",
                                            ]
                                          : [
                                              "Đối tác",
                                              "Ngân hàng",
                                              "Tài khoản",
                                              "Số tiền",
                                              "Trạng thái",
                                              "Mã tham chiếu",
                                            ]
                                        ).map((label) => (
                                          <th key={label} scope="col">
                                            {label}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(tab === "pending" ? row.orders : row.transactions).map(
                                        (detail) => (
                                          <tr key={detail.id}>
                                            {tab === "pending" ? (
                                              <>
                                                <td className="font-medium">{detail.order_code}</td>
                                                <td className="text-xs">
                                                  {formatDate(detail.recorded_at)}
                                                </td>
                                                <td className="text-xs">
                                                  {ORDER_STATUS[detail.status] || detail.status}
                                                </td>
                                                <td className="sr-tabular">
                                                  {money(detail.gross_amount)}
                                                </td>
                                                <td className="sr-tabular">
                                                  {money(detail.platform_fee)}
                                                </td>
                                                <td className="sr-tabular">
                                                  {money(detail.conservation_fund)}
                                                </td>
                                                <td className="sr-tabular font-semibold">
                                                  {money(detail.vendor_net_amount)}
                                                </td>
                                              </>
                                            ) : (
                                              <>
                                                <td className="font-medium">
                                                  {detail.vendor_name}
                                                </td>
                                                <td>{detail.bank_name || "Chưa có"}</td>
                                                <td>{detail.bank_account_number || "Chưa có"}</td>
                                                <td className="sr-tabular font-semibold">
                                                  {money(detail.amount)}
                                                </td>
                                                <td>{detail.status}</td>
                                                <td>{detail.reference || "Chưa có"}</td>
                                              </>
                                            )}
                                          </tr>
                                        )
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                                {tab === "history" && !row.transactions.length && (
                                  <p className="text-xs text-[var(--sr-text-muted)] mt-2 mb-0">
                                    Đợt này chưa có bản ghi giao dịch chi tiết. Chưa đủ cơ sở xác
                                    nhận tiền đã đến tài khoản đối tác.
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {!rows.length && (
                    <tr>
                      <td
                        colSpan={tab === "pending" ? 7 : 6}
                        className="text-center text-sm text-[var(--sr-text-muted)] py-8"
                      >
                        {search || status !== "all"
                          ? "Không có kết quả phù hợp bộ lọc."
                          : tab === "pending"
                            ? "Không có bút toán chờ quyết toán."
                            : "Chưa có đợt giải ngân được ghi nhận."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="text-xs text-[var(--sr-text-muted)]">
            Nguồn: sổ cái của đơn đã thanh toán, chưa hủy và có trạng thái chờ quyết toán. Doanh
            thu gộp = đối tác nhận + phí nền tảng + quỹ bảo tồn. Cập nhật:{" "}
            {formatDate(data.generated_at)}.
          </footer>
        </>
      )}
    </div>
  );
}
