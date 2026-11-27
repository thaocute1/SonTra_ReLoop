import React, { useState } from "react";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const axisNumber = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const dateTime = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

export const vendorMoney = (value) => currency.format(Number(value || 0));

const periods = [
  ["7d", "7 ngày"],
  ["30d", "30 ngày"],
  ["3m", "3 tháng"],
  ["12m", "12 tháng"],
];

export function VendorRevenueChart({ chart, period, onPeriodChange, compact = false }) {
  const [selection, setSelection] = useState(null);
  const loaded = chart?.period === period;
  const points = loaded ? chart.data || [] : [];
  const peak = Math.max(0, ...points.map((point) => Number(point.revenue || 0)));
  const maximum = peak || 1;
  const selectedPoint =
    (selection?.period === period &&
      points.find((point) => point.date === selection.date)) ||
    points.at(-1);

  return (
    <section className={compact ? "flex flex-col gap-4" : "sr-surface flex flex-col gap-5"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="sr-h2">Biểu đồ doanh thu</h3>
          <p className="text-xs text-[var(--sr-text-muted)] mt-0.5">
            Doanh thu gộp theo {period.endsWith("m") ? "tháng" : "ngày"} ghi sổ (VND)
          </p>
        </div>

        <div className="sr-tabs" role="group" aria-label="Khoảng thời gian">
          {periods.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onPeriodChange(value)}
              aria-pressed={period === value}
              className={`sr-tab ${period === value ? "is-selected" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!loaded ? (
        <p className="py-10 text-center text-sm text-[var(--sr-text-muted)]" role="status">
          Đang tải biểu đồ doanh thu...
        </p>
      ) : !selectedPoint ? (
        <p className="py-10 text-center text-sm text-[var(--sr-text-muted)]">
          Chưa có dữ liệu trong kỳ này.
        </p>
      ) : (
        <div>
          <p className="mb-3 text-sm text-[var(--sr-text-secondary)]" aria-live="polite">
            {selectedPoint.label}:{" "}
            <strong className="sr-tabular text-[var(--sr-accent-ink)]">
              {vendorMoney(selectedPoint.revenue)}
            </strong>
          </p>

          <div className="sr-chart-grid">
            {points.map((point) => {
              const rev = Number(point.revenue || 0);
              const pct = peak > 0 ? Math.max(8, Math.round((rev / maximum) * 100)) : 8;
              const isSelected = selectedPoint?.date === point.date;
              return (
                <button
                  key={point.date}
                  type="button"
                  aria-label={`${point.label}: ${vendorMoney(rev)}`}
                  onPointerEnter={() => setSelection({ period, date: point.date })}
                  onFocus={() => setSelection({ period, date: point.date })}
                  onClick={() => setSelection({ period, date: point.date })}
                  className={`sr-chart-col ${isSelected ? "is-active" : ""}`}
                >
                  <span className="sr-tabular text-[var(--text-xs)] text-[var(--sr-text-muted)]">
                    {axisNumber.format(rev)}
                  </span>
                  <span
                    className="sr-chart-bar"
                    style={{ height: `${pct}%` }}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>

          <div className="sr-chart-axis" aria-hidden="true">
            {points.map((point, idx) => {
              const step = points.length > 8 ? Math.ceil(points.length / 6) : 1;
              const showLabel = idx === 0 || idx === points.length - 1 || idx % step === 0;
              return (
                <span key={point.date} className="sr-chart-axis-item">
                  {showLabel ? point.label : ""}
                </span>
              );
            })}
          </div>

          {!peak && (
            <p className="mt-2 text-center text-xs text-[var(--sr-text-muted)]">
              Chưa ghi nhận doanh thu trong kỳ này.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

const statusBadges = {
  recorded: ["Chờ đối soát", "sr-badge-warn"],
  reconciled: ["Đã đối soát", "sr-badge-moss"],
  on_hold: ["Tạm giữ", "sr-badge-warn"],
  pending_payout: ["Chờ chi trả", "sr-badge-warn"],
  paid: ["Đã chi trả", "sr-badge-moss"],
  processing: ["Đang xử lý", "sr-badge-neutral"],
  completed: ["Hoàn tất", "sr-badge-moss"],
  failed: ["Thất bại", "sr-badge-urgent"],
  cancelled: ["Đã hủy", "sr-badge-urgent"],
};

const formatDate = (value) => (value ? dateTime.format(new Date(value)) : "Chưa cập nhật");

function FinanceTable({ title, description, columns, rows, empty }) {
  return (
    <section className="sr-surface flex flex-col gap-4">
      <div>
        <h3 className="sr-h2">{title}</h3>
        <p className="text-xs text-[var(--sr-text-muted)] mt-1">{description}</p>
      </div>
      {rows.length ? (
        <div className="sr-table-wrap" tabIndex={0} aria-label={title}>
          <table className="sr-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ id, cells }) => (
                <tr key={id}>
                  {cells.map((cell, index) => (
                    <td key={columns[index]}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-[var(--sr-text-muted)]">{empty}</p>
      )}
    </section>
  );
}

export function VendorReconciliation({ reconciliation }) {
  const { summary = {}, entries = [], payouts = [], history_limit: limit = 20 } = reconciliation || {};

  const renderBadge = (status) => {
    const [label, cls] = statusBadges[status] || [status || "Chưa rõ", "sr-badge-neutral"];
    return (
      <span className={`sr-badge ${cls}`}>
        <span className="sr-badge-dot" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="sr-surface flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="sr-eyebrow">Thực nhận đối tác theo sổ cái</span>
            <p className="sr-metric-big sr-tabular">{vendorMoney(summary.vendor_net_amount)}</p>
          </div>
          <span className="sr-badge sr-badge-moss">
            <span className="sr-badge-dot" aria-hidden="true" />
            <span>Đã chi theo sổ cái: {vendorMoney(summary.paid_amount)}</span>
          </span>
        </div>

        <div className="flex flex-col">
          <div className="sr-kv-row">
            <span className="text-[var(--sr-text-secondary)]">Doanh thu gộp từ đơn hợp lệ</span>
            <strong className="sr-tabular text-[var(--sr-text-primary)]">
              {vendorMoney(summary.gross_amount)}
            </strong>
          </div>
          <div className="sr-kv-row">
            <span className="text-[var(--sr-text-secondary)]">
              Trích Quỹ Bảo tồn &amp; Cứu hộ Sơn Trà (ESG)
            </span>
            <strong className="sr-tabular text-[var(--sr-accent-ink)]">
              - {vendorMoney(summary.conservation_fund)}
            </strong>
          </div>
          <div className="sr-kv-row">
            <span className="text-[var(--sr-text-secondary)]">
              Phí hạ tầng &amp; cổng thanh toán VNPay / Stripe
            </span>
            <strong className="sr-tabular text-[var(--sr-text-secondary)]">
              - {vendorMoney(summary.platform_fee)}
            </strong>
          </div>
          <div className="sr-kv-row">
            <span className="text-[var(--sr-text-secondary)]">Chờ đối soát hoặc chi trả</span>
            <strong className="sr-tabular text-[var(--sr-warn)]">
              {vendorMoney(summary.pending_amount)}
            </strong>
          </div>
          <div className="sr-kv-row">
            <span className="text-[var(--sr-text-secondary)]">Khoản đang tạm giữ</span>
            <strong className="sr-tabular text-[var(--sr-text-primary)]">
              {vendorMoney(summary.on_hold_amount)}
            </strong>
          </div>
        </div>
      </section>

      <FinanceTable
        title="Bút toán đối soát"
        description={`Tối đa ${limit} bút toán mới nhất của các đơn đã thanh toán, còn hiệu lực.`}
        columns={[
          "Mã đơn",
          "Ngày ghi sổ",
          "Doanh thu gộp",
          "Phí nền tảng",
          "Quỹ bảo tồn",
          "Doanh thu thuần",
          "Trạng thái",
        ]}
        rows={entries.map((entry) => ({
          id: entry.id,
          cells: [
            <span key="code" className="font-semibold text-[var(--sr-accent-ink)]">
              {entry.order_code}
            </span>,
            <span key="date" className="sr-tabular">
              {formatDate(entry.recorded_at)}
            </span>,
            <span key="gross" className="sr-tabular font-medium">
              {vendorMoney(entry.gross_amount)}
            </span>,
            <span key="fee" className="sr-tabular">
              {vendorMoney(entry.platform_fee)}
            </span>,
            <span key="esg" className="sr-tabular font-semibold text-[var(--sr-accent-ink)]">
              {vendorMoney(entry.conservation_fund)}
            </span>,
            <span key="net" className="sr-tabular font-semibold text-[var(--sr-text-primary)]">
              {vendorMoney(entry.vendor_net_amount)}
            </span>,
            renderBadge(entry.status),
          ],
        }))}
        empty="Chưa có bút toán đối soát."
      />

      <FinanceTable
        title="Lịch sử chi trả"
        description={`Tối đa ${limit} giao dịch chi trả mới nhất của đối tác.`}
        columns={["Mã đợt", "Ngày tạo", "Ngày thực hiện đợt", "Số tiền", "Trạng thái", "Mã tham chiếu"]}
        rows={payouts.map((payout) => ({
          id: payout.id,
          cells: [
            <span key="batch" className="font-semibold text-[var(--sr-text-primary)]">
              {payout.batch_code}
            </span>,
            <span key="created" className="sr-tabular">
              {formatDate(payout.created_at)}
            </span>,
            <span key="exec" className="sr-tabular">
              {formatDate(payout.executed_at)}
            </span>,
            <span key="amt" className="sr-tabular font-semibold text-[var(--sr-text-primary)]">
              {vendorMoney(payout.amount)}
            </span>,
            renderBadge(payout.status),
            <span key="ref" className="text-[var(--sr-text-muted)]">
              {payout.reference || "Chưa có"}
            </span>,
          ],
        }))}
        empty="Chưa có giao dịch chi trả."
      />
    </div>
  );
}
