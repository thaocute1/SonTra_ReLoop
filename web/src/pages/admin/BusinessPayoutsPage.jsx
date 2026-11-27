import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Download, Info, RefreshCw, RotateCcw, Search, X } from "lucide-react";
import { api } from "../../lib/axios";
import { PageHeader, SaasSelect } from "../../components/ui/SaasPrimitives";
import { extractErrorMessage } from "../../utils/apiError";

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

const REFUND_STATUS_OPTIONS = [
  { value: "all", label: "Tất cả yêu cầu" },
  { value: "requested", label: "Chờ duyệt hoàn tiền" },
  { value: "refunded", label: "Đã hoàn tiền" },
  { value: "rejected", label: "Từ chối hoàn tiền" },
];

const BATCH_STATUS_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "completed", label: "Đã ghi nhận hoàn tất" },
  { value: "processing", label: "Đang xử lý" },
  { value: "failed", label: "Thất bại" },
  { value: "cancelled", label: "Đã hủy" },
];

export default function BusinessPayoutsPage() {
  const [data, setData] = useState(null);
  const [refundsData, setRefundsData] = useState({ results: [], pending_count: 0, refunded_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [actionError, setActionError] = useState("");
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [refundModal, setRefundModal] = useState(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [processingRefund, setProcessingRefund] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setExpanded(null);
    Promise.allSettled([
      api.get("/payments/payouts/", { signal: controller.signal }),
      api.get("/payments/refunds/", { signal: controller.signal }),
    ])
      .then(([payoutRes, refundRes]) => {
        if (controller.signal.aborted) return;
        if (payoutRes.status === "fulfilled") {
          setData(payoutRes.value.data);
        } else {
          setError(
            payoutRes.reason?.response?.data?.detail ||
              "Không tải được dữ liệu đối soát. Vui lòng thử lại."
          );
        }
        if (refundRes.status === "fulfilled" && refundRes.value.data) {
          setRefundsData(refundRes.value.data);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  const pending = data?.pending_payouts || [];
  const history = data?.batches_history || [];
  const refunds = refundsData?.results || [];
  const needle = search.trim().toLocaleLowerCase("vi");

  const rows = (tab === "pending" ? pending : tab === "history" ? history : refunds).filter((row) => {
    const text =
      tab === "pending"
        ? `${row.vendor_name} ${row.vendor_id} ${row.orders.map((o) => o.order_code).join(" ")}`
        : tab === "history"
          ? `${row.batch_code} ${row.transactions.map((tx) => tx.vendor_name).join(" ")}`
          : `${row.order_code} ${row.customer_name} ${row.tour_title} ${row.vendor_name}`;
    const rowStatus = tab === "refunds" ? row.refund_status : row.status;
    return (
      text.toLocaleLowerCase("vi").includes(needle) &&
      (tab === "pending" || status === "all" || rowStatus === status)
    );
  });

  const openRefundDecision = (row, decision) => {
    setActionMsg("");
    setActionError("");
    setRefundModal({ row, decision });
    setRefundAmount(String(row.subtotal || ""));
    setRefundNote("");
  };

  const submitRefundDecision = async (e) => {
    e.preventDefault();
    if (!refundModal || processingRefund) return;
    setProcessingRefund(true);
    setActionMsg("");
    setActionError("");
    try {
      const { row, decision } = refundModal;
      const payload = {
        decision,
        admin_note: refundNote.trim(),
        ...(decision === "approve" && refundAmount.trim() ? { amount: refundAmount.trim() } : {}),
      };
      const res = await api.post(`/payments/refunds/${row.order_vendor_id}/process/`, payload);
      setActionMsg(res.data?.provider_mode?.endsWith("_mock")
        ? "Đã ghi nhận hoàn tiền mô phỏng. Chưa chuyển tiền."
        : res.data?.message || "Đã xử lý hoàn tiền thành công.");
      setRefundModal(null);
      setRevision((v) => v + 1);
    } catch (err) {
      setActionError(extractErrorMessage(err, "Không thể xử lý yêu cầu hoàn tiền."));
      setRefundModal(null);
    } finally {
      setProcessingRefund(false);
    }
  };

  const summary = data?.summary || {};
  const unpaidOrdersTotal = pending.reduce((sum, row) => sum + row.unpaid_orders_count, 0);

  function exportCSV() {
    const header =
      tab === "pending"
        ? ["Đối tác", "Số đơn đối tác", "Doanh thu gộp", "Phí nền tảng", "Quỹ bảo tồn", "Đối tác nhận"]
        : tab === "history"
          ? ["Mã đợt", "Ngày tạo", "Ngày thực hiện", "Tổng tiền", "Trạng thái"]
          : ["Mã đơn", "Khách hàng", "Tour", "Cổng", "Số tiền", "Trạng thái hoàn"];
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
        : tab === "history"
          ? [
              row.batch_code,
              formatDate(row.created_at),
              formatDate(row.executed_at),
              row.total_amount,
              row.status_label,
            ]
          : [
              row.order_code,
              row.customer_name,
              row.tour_title,
              row.payment_gateway,
              row.refunded_amount || row.subtotal,
              row.refund_status_label,
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

      {actionError && (
        <div role="alert" className="sr-callout sr-callout-urgent justify-between items-center">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError("")}
            className="sr-btn sr-btn-sm sr-btn-ghost"
            aria-label="Đóng thông báo lỗi"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {actionMsg && (
        <div role="status" className="sr-callout sr-callout-moss justify-between items-center">
          <span>{actionMsg}</span>
          <button
            type="button"
            onClick={() => setActionMsg("")}
            className="sr-btn sr-btn-sm sr-btn-ghost"
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
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
                <button
                  type="button"
                  aria-pressed={tab === "refunds"}
                  onClick={() => changeTab("refunds")}
                  className={`sr-segment-btn ${tab === "refunds" ? "is-selected" : ""}`}
                >
                  Yêu cầu hoàn tiền ({refundsData?.pending_count || 0})
                </button>
              </div>

              <div className="sr-toolbar-group">
                <div className="sr-toolbar-search">
                  <Search size={14} aria-hidden="true" />
                  <input
                    type="text"
                    aria-label="Tìm đối tác hoặc mã đơn, mã đợt"
                    placeholder="Tìm đối tác, mã đơn, khách hàng..."
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
                {tab === "refunds" && (
                  <SaasSelect
                    label="Trạng thái"
                    value={status}
                    options={REFUND_STATUS_OPTIONS}
                    onChange={setStatus}
                  />
                )}
              </div>
            </div>

            <div className="px-4 py-2.5 border-b border-[var(--sr-border)] text-xs text-[var(--sr-text-muted)]">
              {rows.length} kết quả ·{" "}
              {tab === "pending"
                ? "Tổng tiền chờ quyết toán, không giới hạn theo tháng."
                : tab === "history"
                  ? "Trạng thái được ghi nhận trong hệ thống; cần đối chiếu chứng từ ngân hàng."
                  : "Duyệt hoàn tiền sẽ tự động trả chỗ tour, hoàn điểm/voucher và trừ sổ cái quỹ."}
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
                      : tab === "history"
                        ? ["Mã đợt", "Ngày tạo", "Ngày thực hiện", "Tổng tiền", "Trạng thái", "Chi tiết"]
                        : ["Mã đơn & Tour", "Khách hàng", "Cổng & STK hoàn", "Số tiền", "Trạng thái", "Thao tác"]
                    ).map((label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const key = tab === "pending" ? row.vendor_id : tab === "history" ? row.id : `refund-${row.order_vendor_id}`;
                    const open = expanded === key;
                    const canProcessRefund =
                      tab === "refunds" &&
                      (["requested", "in_review", "approved"].includes(row.refund_status) ||
                        Boolean(row.needs_review));
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
                          ) : tab === "history" ? (
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
                          ) : (
                            <>
                              <td>
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-semibold">
                                    #{row.order_code} · {row.tour_title}
                                  </span>
                                  <span className="text-xs text-[var(--sr-text-muted)]">
                                    {row.vendor_name}
                                    {row.refund_reason ? ` · ${row.refund_reason}` : ""}
                                  </span>
                                  {row.needs_review && (
                                    <span className="text-xs text-[var(--sr-urgent-ink)]">
                                      {row.needs_review}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className="flex flex-col text-xs">
                                  <span className="font-medium text-[var(--sr-text-primary)]">
                                    {row.customer_name}
                                  </span>
                                  <span className="text-[var(--sr-text-muted)]">
                                    {row.customer_phone || row.customer_email || "—"}
                                  </span>
                                </div>
                              </td>
                              <td className="text-xs">
                                {row.payment_gateway === "paypal" ? (
                                  <span>PayPal Sandbox</span>
                                ) : row.payment_gateway === "vnpay" ? (
                                  <span>VNPAY Sandbox</span>
                                ) : row.refund_bank_info ? (
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {row.refund_bank_info.bank_name || row.refund_bank_info.bank_bin}
                                    </span>
                                    <span className="text-[var(--sr-text-muted)] sr-tabular">
                                      {row.refund_bank_info.account_number} · {row.refund_bank_info.account_holder}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[var(--sr-text-muted)]">PayOS / Chưa có STK</span>
                                )}
                              </td>
                              <td className="sr-tabular font-semibold">
                                {money(row.refund_status === "refunded" ? row.refunded_amount : row.subtotal)}
                              </td>
                              <td>
                                <span
                                  className={`sr-badge sr-badge-${
                                    row.refund_status === "refunded"
                                      ? "moss"
                                      : row.refund_status === "rejected"
                                        ? "urgent"
                                        : "warn"
                                  }`}
                                >
                                  <span className="sr-badge-dot" aria-hidden="true" />
                                  <span>{row.refund_status === "refunded" && row.refund_provider_mode?.endsWith("_mock")
                                    ? "Đã hoàn tiền mô phỏng"
                                    : row.refund_status_label}</span>
                                </span>
                                {row.refund_reference && (
                                  <div className="text-[11px] text-[var(--sr-text-muted)] mt-1 sr-tabular">
                                    {row.refund_reference}
                                  </div>
                                )}
                              </td>
                            </>
                          )}
                          <td>
                            {tab === "refunds" ? (
                              canProcessRefund ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openRefundDecision(row, "approve")}
                                    className="sr-btn sr-btn-sm sr-btn-primary"
                                  >
                                    <RotateCcw size={13} aria-hidden="true" />
                                    <span>Duyệt hoàn</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openRefundDecision(row, "reject")}
                                    className="sr-btn sr-btn-sm sr-btn-secondary"
                                  >
                                    Từ chối
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-[var(--sr-text-muted)]">Đã xử lý</span>
                              )
                            ) : (
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
                            )}
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
                            : tab === "history"
                              ? "Chưa có đợt giải ngân được ghi nhận."
                              : "Chưa có yêu cầu hoàn tiền nào."}
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

      {refundModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="refund-process-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !processingRefund) setRefundModal(null);
          }}
          className="sr-modal-backdrop motion-backdrop-enter"
        >
          <div className="sr-modal-panel p-6 gap-4 motion-modal-enter" style={{ maxWidth: "32rem" }}>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--sr-border)]">
              <h2 id="refund-process-title" className="sr-h2 m-0">
                {refundModal.decision === "approve"
                  ? `Duyệt hoàn tiền #${refundModal.row.order_code}`
                  : `Từ chối hoàn tiền #${refundModal.row.order_code}`}
              </h2>
              <button
                type="button"
                disabled={processingRefund}
                onClick={() => setRefundModal(null)}
                aria-label="Đóng hộp thoại xử lý hoàn tiền"
                className="sr-btn sr-btn-sm sr-btn-ghost"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={submitRefundDecision} className="flex flex-col gap-4">
              <div className="rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-page)] p-3 text-xs space-y-1">
                <div>
                  <strong>Khách hàng:</strong> {refundModal.row.customer_name}
                </div>
                <div>
                  <strong>Tour:</strong> {refundModal.row.tour_title}
                </div>
                <div>
                  <strong>Cổng thanh toán:</strong>{" "}
                  {refundModal.row.payment_gateway === "paypal"
                    ? "PayPal Sandbox"
                    : refundModal.row.payment_gateway === "vnpay"
                      ? "VNPAY Sandbox"
                      : "PayOS"}
                </div>
                {refundModal.row.refund_reason && (
                  <div>
                    <strong>Lý do khách gửi:</strong> {refundModal.row.refund_reason}
                  </div>
                )}
              </div>

              {refundModal.decision === "approve" && (
                <div className="sr-field">
                  <label htmlFor="refund-amount-input" className="sr-field-label">
                    Số tiền hoàn (VNĐ)
                  </label>
                  <input
                    id="refund-amount-input"
                    type="number"
                    min="1"
                    max={refundModal.row.subtotal}
                    required
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="sr-input"
                  />
                  <span className="text-xs text-[var(--sr-text-muted)]">
                    Tối đa: {money(refundModal.row.subtotal)}
                  </span>
                </div>
              )}

              <div className="sr-field">
                <label htmlFor="refund-note-input" className="sr-field-label">
                  Ghi chú xử lý {refundModal.decision === "reject" ? "*" : "(tùy chọn)"}
                </label>
                <textarea
                  id="refund-note-input"
                  rows={3}
                  required={refundModal.decision === "reject"}
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  placeholder={
                    refundModal.decision === "approve"
                      ? "VD: Đã xác minh điều kiện hoàn vé..."
                      : "Nhập lý do từ chối yêu cầu hoàn tiền..."
                  }
                  className="sr-textarea"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--sr-border)]">
                <button
                  type="button"
                  disabled={processingRefund}
                  onClick={() => setRefundModal(null)}
                  className="sr-btn sr-btn-sm sr-btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={processingRefund}
                  className={`sr-btn sr-btn-sm ${
                    refundModal.decision === "approve" ? "sr-btn-primary" : "sr-btn-destructive"
                  }`}
                >
                  {processingRefund
                    ? "Đang xử lý..."
                    : refundModal.decision === "approve"
                      ? "Xác nhận hoàn tiền"
                      : "Xác nhận từ chối"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
