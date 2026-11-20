import React, { useEffect, useState } from "react";
import { Download, Search, TrendingUp } from "lucide-react";
import { api } from "../../lib/axios";
import { PageHeader } from "../../components/ui/SaasPrimitives";

const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;
const formatDate = (value) => new Date(value).toLocaleDateString("vi-VN");
const toInputDate = (value) => {
  const local = new Date(value);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, "0");
  const day = String(local.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function BusinessReportsPage() {
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      start: toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      end: toInputDate(now),
    };
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    api
      .get("/payments/reports/revenue/", {
        params: { start_date: dateRange.start, end_date: dateRange.end },
        signal: controller.signal,
      })
      .then((response) => setData(response.data))
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(
            err.response?.data?.detail || "Không tải được báo cáo. Vui lòng thử lại."
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [dateRange.start, dateRange.end, refresh]);

  const business = data?.business || {};
  const tours = (data?.tours_breakdown || []).filter((row) =>
    row.tour_name.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))
  );

  const ratio = (value) =>
    data?.gross_total
      ? `${((Number(value || 0) * 100) / data.gross_total).toLocaleString("vi-VN", {
          maximumFractionDigits: 2,
        })}%`
      : "Chưa theo dõi";

  const deductions = Number(data?.platform_fee || 0) + Number(data?.bql_fund || 0);
  const allocationData = data
    ? [
        { name: "Đối tác nhận", value: Number(data.net_vendor || 0), color: "var(--sr-accent)" },
        { name: "Quỹ bảo tồn", value: Number(data.bql_fund || 0), color: "var(--coastal-slate)" },
        { name: "Phí nền tảng", value: Number(data.platform_fee || 0), color: "var(--sr-warn)" },
      ].filter((row) => row.value > 0)
    : [];

  const feeRows = [
    ["Doanh thu gộp ghi nhận", data?.gross_total, "Cơ sở phân bổ theo sổ cái."],
    [
      "Phí nền tảng",
      data?.platform_fee,
      "Khoản phí nền tảng được hưởng; chưa trừ chi phí vận hành.",
    ],
    [
      "Khoản trích quỹ bảo tồn",
      data?.bql_fund,
      "Khoản phân bổ cho bảo tồn, không phải doanh thu phí của nền tảng.",
    ],
    [
      "Tổng khấu trừ / phân bổ",
      deductions,
      "Phí nền tảng + quỹ bảo tồn; không cộng thêm lần nữa vào tổng doanh thu.",
    ],
    [
      "Đối tác nhận theo sổ cái",
      data?.net_vendor,
      "Quyền lợi đối tác được ghi nhận, chưa khẳng định đã giải ngân.",
    ],
  ];

  function exportCSV() {
    const rows = [
      ["Báo cáo kinh doanh", `${formatDate(data.range.start)} - ${formatDate(data.range.end)}`],
      ["Doanh thu ghi nhận", data.gross_total],
      ["Đơn đã thanh toán", business.paid_orders],
      ["Giá trị đơn trung bình", business.average_order_value],
      ["Phí nền tảng", data.platform_fee],
      ["Quỹ bảo tồn", data.bql_fund],
      ["Đối tác nhận", data.net_vendor],
      [],
      ["Tour", "Số đơn đối tác", "Doanh thu", "Tỷ trọng (%)"],
      ...tours.map((row) => [row.tour_name, row.bookings_count, row.revenue, row.pct]),
    ];
    rows.push(
      [],
      ["Chi tiết phí và phân bổ", "Số tiền (VND)", "Tỷ lệ doanh thu gộp", "Diễn giải"],
      ...feeRows.map(([label, amount, note]) => [label, amount, ratio(amount), note]),
      ["Phí cổng thanh toán / PayOS", "Chưa theo dõi riêng"],
      ["Phí ngân hàng / chuyển tiền", "Chưa theo dõi riêng"],
      ["Thuế / VAT", "Chưa theo dõi riêng"],
      ["Chi phí vận hành", "Chưa theo dõi riêng"]
    );
    const csv =
      "\ufeff" +
      rows
        .map((row) =>
          row
            .map((value) => `"${String(value ?? "").replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`)
            .join(",")
        )
        .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-kinh-doanh-${dateRange.start}_${dateRange.end}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const change = business.revenue_change_pct;
  const timeline = data?.timeline_chart || [];
  const maxRevenue = Math.max(1, ...timeline.map((item) => Number(item.revenue || 0)));
  const totalAlloc = Math.max(
    1,
    allocationData.reduce((sum, item) => sum + item.value, 0)
  );
  const circumference = 2 * Math.PI * 52;
  let cumulativePct = 0;

  return (
    <div className="sr-page" aria-busy={loading}>
      <PageHeader
        title="Báo cáo kinh doanh & doanh thu"
        subtitle="Tổng hợp từ sổ cái đơn đã thanh toán trong kỳ, loại trừ đơn đối tác đã hủy"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-select-trigger gap-2">
              <span className="text-xs text-[var(--sr-text-muted)]">Từ</span>
              <input
                type="date"
                value={dateRange.start}
                max={dateRange.end}
                onChange={(event) =>
                  setDateRange((current) => ({ ...current, start: event.target.value }))
                }
                className="bg-transparent border-0 text-xs text-[var(--sr-text-primary)] focus:outline-none"
              />
            </label>
            <label className="sr-select-trigger gap-2">
              <span className="text-xs text-[var(--sr-text-muted)]">Đến</span>
              <input
                type="date"
                value={dateRange.end}
                min={dateRange.start}
                max={toInputDate(new Date())}
                onChange={(event) =>
                  setDateRange((current) => ({ ...current, end: event.target.value }))
                }
                className="bg-transparent border-0 text-xs text-[var(--sr-text-primary)] focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={exportCSV}
              disabled={!data || loading}
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
            onClick={() => setRefresh((value) => value + 1)}
            className="sr-btn sr-btn-sm sr-btn-secondary"
          >
            Thử lại
          </button>
        </div>
      )}

      {loading && (
        <p role="status" className="p-8 text-center text-sm text-[var(--sr-text-muted)]">
          Đang tổng hợp dữ liệu kinh doanh...
        </p>
      )}

      {!loading && data && (
        <>
          {/* Band 1: 8/4 Gross Revenue Lead + Stacked Secondary Figures */}
          <section className="sr-grid-8-4" aria-label="Tổng quan doanh thu trong kỳ">
            <article className="sr-hero-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-[var(--sr-text-muted)]">
                    Doanh thu gộp đã ghi nhận
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <strong className="sr-metric-hero sr-tabular">
                      {money(data.gross_total)}
                    </strong>
                    {change !== null && change !== undefined && (
                      <span
                        className={`sr-badge ${
                          change >= 0 ? "sr-badge-moss" : "sr-badge-urgent"
                        }`}
                      >
                        <TrendingUp size={12} aria-hidden="true" />
                        <span>
                          {change >= 0 ? `+${change}%` : `${change}%`} kỳ liền trước
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-[var(--sr-text-secondary)]">
                  Kỳ liền trước: {money(business.previous_revenue)}
                </span>
              </div>

              {timeline.length ? (
                <div
                  role="img"
                  aria-label={`Biểu đồ doanh thu theo tháng gồm ${timeline.length} mốc thời gian`}
                >
                  <div className="sr-chart-grid">
                    {timeline.map((item, idx) => {
                      const hPct = Math.max(
                        10,
                        Math.round((Number(item.revenue || 0) / maxRevenue) * 100)
                      );
                      const isLatest = idx === timeline.length - 1;
                      return (
                        <div
                          key={item.label}
                          className={`sr-chart-col ${isLatest ? "is-active" : ""}`}
                        >
                          <span className="text-xs text-[var(--sr-text-muted)] sr-tabular">
                            {(Number(item.revenue || 0) / 1_000_000).toLocaleString("vi-VN", {
                              maximumFractionDigits: 1,
                            })}
                            tr
                          </span>
                          <div className="sr-chart-bar" style={{ height: `${hPct}%` }} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="sr-chart-axis">
                    {timeline.map((item) => (
                      <span key={item.label} className="sr-chart-axis-item">
                        {item.label.replace("Tháng ", "T")}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--sr-text-muted)] py-6 m-0">
                  Chưa có dữ liệu doanh thu trong khoảng thời gian này.
                </p>
              )}
            </article>

            <article className="sr-card justify-between">
              <h2 className="sr-h2 m-0">Chỉ số vận hành đơn hàng</h2>
              <div className="flex flex-col">
                <div className="sr-kv-row">
                  <div className="flex flex-col">
                    <span className="font-semibold">Đơn đã thanh toán</span>
                    <span className="text-xs text-[var(--sr-text-muted)]">
                      Đếm theo đơn hàng duy nhất
                    </span>
                  </div>
                  <strong className="sr-tabular text-base text-[var(--sr-accent-ink)]">
                    {business.paid_orders ?? 0} đơn
                  </strong>
                </div>
                <div className="sr-kv-row">
                  <div className="flex flex-col">
                    <span className="font-semibold">Giá trị đơn trung bình</span>
                    <span className="text-xs text-[var(--sr-text-muted)]">
                      Doanh thu / đơn đã thanh toán
                    </span>
                  </div>
                  <strong className="sr-tabular text-base">
                    {money(business.average_order_value)}
                  </strong>
                </div>
                <div className="sr-kv-row">
                  <div className="flex flex-col">
                    <span className="font-semibold">Đối tác có doanh thu</span>
                    <span className="text-xs text-[var(--sr-text-muted)]">
                      Phát sinh trong kỳ báo cáo
                    </span>
                  </div>
                  <strong className="sr-tabular text-base">
                    {business.active_vendors ?? 0} đơn vị
                  </strong>
                </div>
              </div>
              <span className="text-xs text-[var(--sr-text-muted)]">
                Đơn chờ thanh toán chưa được tính vào doanh thu ghi nhận.
              </span>
            </article>
          </section>

          {/* Band 2: 7/5 Allocation Donut + Top Performing Tours */}
          <section className="sr-grid-7-5" aria-label="Phân bổ doanh thu và hiệu quả tour">
            <article className="sr-card justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="sr-h2 m-0">Phân bổ doanh thu theo sổ cái</h2>
                <span className="text-xs text-[var(--sr-text-muted)]">
                  Theo bút toán thực tế, không áp tỷ lệ cố định.
                </span>
              </div>

              {allocationData.length ? (
                <div className="sr-donut-wrap">
                  <svg
                    viewBox="0 0 140 140"
                    className="sr-donut-svg"
                    role="img"
                    aria-label={`Biểu đồ phân bổ doanh thu gồm ${allocationData
                      .map((i) => `${i.name} ${ratio(i.value)}`)
                      .join(", ")}`}
                  >
                    {allocationData.map((item) => {
                      const pct = (item.value / totalAlloc) * 100;
                      const dashLen = (pct / 100) * circumference;
                      const dashOffset = -((cumulativePct / 100) * circumference);
                      cumulativePct += pct;
                      return (
                        <circle
                          key={item.name}
                          cx="70"
                          cy="70"
                          r="52"
                          fill="none"
                          stroke={item.color}
                          strokeWidth="20"
                          strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                          strokeDashoffset={dashOffset}
                          transform="rotate(-90 70 70)"
                        />
                      );
                    })}
                  </svg>

                  <div className="sr-legend-list">
                    {allocationData.map((item) => (
                      <div key={item.name} className="sr-legend-row">
                        <span className="sr-legend-label">
                          <span
                            className="sr-legend-swatch"
                            style={{ backgroundColor: item.color }}
                            aria-hidden="true"
                          />
                          <span>{item.name}</span>
                        </span>
                        <div className="flex flex-col items-end">
                          <strong className="sr-tabular">{money(item.value)}</strong>
                          <span className="text-xs text-[var(--sr-text-muted)]">
                            {ratio(item.value)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--sr-text-muted)] m-0">
                  Chưa có số liệu phân bổ trong khoảng thời gian này.
                </p>
              )}

              <div className="sr-callout sr-callout-moss">
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="font-semibold">
                    Đối chiếu: {money(data.gross_total)} = {money(data.net_vendor)} đối tác +{" "}
                    {money(data.bql_fund)} quỹ bảo tồn + {money(data.platform_fee)} phí nền tảng.
                  </span>
                  <span>Phí nền tảng chưa trừ chi phí vận hành, không phải lợi nhuận.</span>
                </div>
              </div>
            </article>

            <article className="sr-table-card flex flex-col justify-between">
              <div>
                <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--sr-border)]">
                  <h2 className="sr-h2 m-0">Hiệu quả từng tour</h2>
                  <div className="sr-toolbar-search">
                    <Search size={14} aria-hidden="true" />
                    <input
                      aria-label="Tìm tour trong báo cáo"
                      placeholder="Tìm tên tour..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </div>

                <div className="sr-table-scroll">
                  <table className="sr-table">
                    <caption className="sr-only">Doanh thu theo từng tour</caption>
                    <thead>
                      <tr>
                        <th scope="col">Tour / trải nghiệm</th>
                        <th scope="col">Đơn đối tác</th>
                        <th scope="col">Doanh thu</th>
                        <th scope="col">Đóng góp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tours.map((row, index) => (
                        <tr key={index}>
                          <td className="font-medium">{row.tour_name}</td>
                          <td className="sr-tabular">{row.bookings_count}</td>
                          <td className="sr-tabular font-semibold">{money(row.revenue)}</td>
                          <td className="sr-tabular text-[var(--sr-accent-ink)] font-semibold">
                            {row.pct}%
                          </td>
                        </tr>
                      ))}
                      {!tours.length && (
                        <tr>
                          <td
                            colSpan={4}
                            className="text-center text-xs text-[var(--sr-text-muted)] py-6"
                          >
                            {search
                              ? "Không tìm thấy tour phù hợp."
                              : "Chưa có doanh thu trong kỳ này."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </article>
          </section>

          {/* Band 3: Fee Audit & Partner Contribution Tables */}
          <section className="sr-table-card">
            <div className="p-4 border-b border-[var(--sr-border)]">
              <h2 className="sr-h2 m-0">Chi tiết phí & phân bổ doanh thu</h2>
            </div>
            <div className="sr-table-scroll">
              <table className="sr-table">
                <caption className="sr-only">Chi tiết các khoản mục phí và phân bổ</caption>
                <thead>
                  <tr>
                    <th scope="col">Khoản mục</th>
                    <th scope="col">Số tiền</th>
                    <th scope="col">Tỷ lệ trên doanh thu gộp</th>
                    <th scope="col">Diễn giải</th>
                  </tr>
                </thead>
                <tbody>
                  {feeRows.map(([label, amount, note]) => (
                    <tr key={label}>
                      <td className="font-semibold">{label}</td>
                      <td className="sr-tabular">{money(amount)}</td>
                      <td className="sr-tabular">{ratio(amount)}</td>
                      <td className="text-xs text-[var(--sr-text-secondary)]">{note}</td>
                    </tr>
                  ))}
                  {[
                    "Phí cổng thanh toán / PayOS",
                    "Phí ngân hàng / chuyển tiền",
                    "Thuế / VAT",
                    "Chi phí vận hành",
                  ].map((label) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td>Chưa theo dõi riêng</td>
                      <td>Chưa theo dõi</td>
                      <td className="text-xs text-[var(--sr-text-muted)]">
                        Chưa có số liệu tách riêng trong sổ cái; không đồng nghĩa không phát sinh.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="sr-table-card">
            <div className="p-4 border-b border-[var(--sr-border)]">
              <h2 className="sr-h2 m-0">Đóng góp của đối tác</h2>
            </div>
            <div className="sr-table-scroll">
              <table className="sr-table">
                <caption className="sr-only">Đóng góp doanh thu theo đối tác</caption>
                <thead>
                  <tr>
                    <th scope="col">Đối tác</th>
                    <th scope="col">Đơn đối tác</th>
                    <th scope="col">Doanh thu gộp</th>
                    <th scope="col">Đối tác nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.vendors || []).map((row) => (
                    <tr key={row.id}>
                      <td className="font-medium">{row.name}</td>
                      <td className="sr-tabular">{row.orders}</td>
                      <td className="sr-tabular">{money(row.revenue)}</td>
                      <td className="sr-tabular font-semibold">{money(row.net)}</td>
                    </tr>
                  ))}
                  {!data.vendors?.length && (
                    <tr>
                      <td colSpan={4} className="text-center text-xs text-[var(--sr-text-muted)] py-6">
                        Chưa có đối tác phát sinh doanh thu trong kỳ.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="text-xs text-[var(--sr-text-muted)]">
            Nguồn: sổ cái của đơn đã thanh toán, loại trừ đơn đối tác đã hủy. Kỳ báo cáo theo thời
            điểm ghi sổ. Cập nhật: {new Date(data.generated_at).toLocaleString("vi-VN")}.
          </footer>
        </>
      )}
    </div>
  );
}
