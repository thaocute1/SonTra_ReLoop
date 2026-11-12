import { useState } from 'react';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 });
const axisNumber = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 });
const dateTime = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
});

export const vendorMoney = value => currency.format(Number(value));

const periods = [
  ['7d', '7 ngày'],
  ['30d', '30 ngày'],
  ['3m', '3 tháng'],
  ['12m', '12 tháng'],
];

export function VendorRevenueChart({ chart, period, onPeriodChange }) {
  const [selection, setSelection] = useState(null);
  const loaded = chart?.period === period;
  const points = loaded ? chart.data : [];
  const peak = Math.max(0, ...points.map(point => Number(point.revenue)));
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, peak / 3)));
  const step = Math.ceil(peak / (3 * magnitude)) * magnitude;
  const ticks = peak ? [3 * step, 2 * step, step, 0] : [0];
  const maximum = ticks[0] || 1;
  const coords = points.map((point, index) => ({
    ...point,
    x: 100 * (index + 0.5) / points.length,
    y: 100 * (1 - Number(point.revenue) / maximum),
  }));
  const firstPoint = coords[0];
  const lastPoint = coords.at(-1);
  const selectedPoint = (selection?.period === period && coords.find(point => point.date === selection.date)) || lastPoint;
  const line = coords.map(({ x, y }) => `${x},${y}`).join(' ');
  const last = coords.length - 1;
  const labelIndices = [0, Math.round(last / 3), Math.round(last * 2 / 3), last];

  return (
    <section className="bg-white border border-[#C5CCC7] rounded-3xl p-6 sm:p-7 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="font-bold text-base font-be-vietnam text-[#191C1A]">Biểu đồ doanh thu</h3>
          <p className="text-xs text-[#4A514C] font-be-vietnam">Doanh thu gộp theo {period.endsWith('m') ? 'tháng' : 'ngày'} ghi sổ (VND)</p>
        </div>
        <div className="flex flex-wrap gap-1 bg-[#F2F5F1] p-1 rounded-2xl border border-[#C5CCC7]" role="group" aria-label="Khoảng thời gian">
          {periods.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onPeriodChange(value)}
              aria-pressed={period === value}
              className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer ${
                period === value ? 'bg-[#2F5D4A] !text-white shadow-xs' : 'text-[#4A514C]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {!loaded ? (
        <p className="h-48 grid place-items-center text-sm text-[#4A514C]" role="status">Đang tải biểu đồ doanh thu…</p>
      ) : !selectedPoint ? (
        <p className="h-48 grid place-items-center text-sm text-[#4A514C]">Chưa có dữ liệu trong kỳ này.</p>
      ) : (
        <div>
          <p className="mb-4 text-sm text-[#4A514C]" aria-live="polite">
            {selectedPoint.label} · <strong className="text-[#2F5D4A]">{vendorMoney(selectedPoint.revenue)}</strong>
          </p>
          <div className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-2">
            <div className="relative h-36 text-right text-xs tabular-nums text-[#4A514C]" aria-hidden="true">
              {ticks.map(amount => (
                <span key={amount} className="absolute right-0 -translate-y-1/2 whitespace-nowrap"
                  style={{ top: `${100 * (1 - amount / maximum)}%` }}>
                  {axisNumber.format(amount)}
                </span>
              ))}
              <span className="invisible whitespace-nowrap">{axisNumber.format(maximum)}</span>
            </div>
            <div className="relative h-36">
              <svg className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none"
                viewBox="0 0 100 100" aria-hidden="true">
                {ticks.map(amount => {
                  const y = 100 * (1 - amount / maximum);
                  return <line key={amount} x1="0" x2="100" y1={y} y2={y} stroke="#E4E9E4" vectorEffect="non-scaling-stroke" />;
                })}
                <polygon points={`${firstPoint.x},100 ${line} ${lastPoint.x},100`} fill="#DCEBE3" />
                <polyline points={line} fill="none" stroke="#2F5D4A" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
              <span className="absolute pointer-events-none h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2F5D4A] ring-2 ring-white"
                style={{ left: `${selectedPoint.x}%`, top: `${selectedPoint.y}%` }} aria-hidden="true" />
              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${coords.length}, minmax(0, 1fr))` }}>
                {coords.map(({ date, label, revenue }) => {
                  const selectPoint = () => setSelection({ period, date });
                  return (
                    <button key={date} type="button" aria-label={`${label}: ${vendorMoney(revenue)}`}
                      className="min-w-0 cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-[#2F5D4A]"
                      onPointerEnter={selectPoint} onFocus={selectPoint} onClick={selectPoint} />
                  );
                })}
              </div>
            </div>
            <div className="relative col-start-2 h-6 text-[10px] sm:text-xs text-[#4A514C]" aria-hidden="true">
              {coords.map(({ date, label, x }, index) => labelIndices.includes(index) && (
                <span key={date} className="absolute -translate-x-1/2 whitespace-nowrap"
                  style={{ left: `clamp(1.4rem, ${x}%, calc(100% - 1.4rem))` }}>{label}</span>
              ))}
            </div>
          </div>
          {!peak && (
            <p className="mt-2 text-center text-xs text-[#4A514C]">Chưa ghi nhận doanh thu trong kỳ này.</p>
          )}
        </div>
      )}
    </section>
  );
}

const summaryFields = [
  ['gross_amount', 'Doanh thu gộp'],
  ['platform_fee', 'Phí nền tảng'],
  ['conservation_fund', 'Quỹ bảo tồn'],
  ['vendor_net_amount', 'Doanh thu thuần'],
  ['pending_amount', 'Chờ đối soát hoặc chi trả'],
  ['on_hold_amount', 'Tạm giữ'],
  ['paid_amount', 'Đã chi theo sổ cái'],
];

const statusLabels = {
  recorded: 'Chờ đối soát',
  reconciled: 'Đã đối soát',
  on_hold: 'Tạm giữ',
  pending_payout: 'Chờ chi trả',
  paid: 'Đã chi trả',
  processing: 'Đang xử lý',
  completed: 'Hoàn tất',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
};

const statusLabel = status => statusLabels[status] || status;
const formatDate = value => value ? dateTime.format(new Date(value)) : '—';

function FinanceTable({ title, description, columns, rows, empty }) {
  return (
    <section className="bg-white border border-[#C5CCC7] rounded-3xl p-6 sm:p-7 shadow-xs">
      <h3 className="font-bold text-base">{title}</h3>
      <p className="text-xs text-[#4A514C] mt-1">{description}</p>
      {rows.length ? (
        <div className="overflow-x-auto mt-4" tabIndex={0} aria-label={title}>
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-[#F2F5F1] text-[#4A514C]">
              <tr>{columns.map(column => <th key={column} scope="col" className="p-3">{column}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#C5CCC7]/60">
              {rows.map(({ id, cells }) => (
                <tr key={id}>{cells.map((cell, index) => <td key={columns[index]} className="p-3">{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-[#4A514C]">{empty}</p>
      )}
    </section>
  );
}

export function VendorReconciliation({ reconciliation }) {
  const { summary, entries, payouts, history_limit: limit } = reconciliation;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryFields.map(([key, label]) => (
          <div key={key} className="p-5 rounded-3xl bg-white border border-[#C5CCC7] shadow-xs">
            <h3 className="text-xs font-bold text-[#4A514C]">{label}</h3>
            <p className="text-xl font-bold mt-2">{vendorMoney(summary[key])}</p>
          </div>
        ))}
      </div>
      <FinanceTable
        title="Bút toán đối soát"
        description={`Tối đa ${limit} bút toán mới nhất của các đơn đã thanh toán, còn hiệu lực.`}
        columns={['Mã đơn', 'Ngày ghi sổ', 'Doanh thu gộp', 'Phí nền tảng', 'Quỹ bảo tồn', 'Doanh thu thuần', 'Trạng thái']}
        rows={entries.map(entry => ({
          id: entry.id,
          cells: [
            entry.order_code, formatDate(entry.recorded_at), vendorMoney(entry.gross_amount),
            vendorMoney(entry.platform_fee), vendorMoney(entry.conservation_fund),
            vendorMoney(entry.vendor_net_amount), statusLabel(entry.status),
          ],
        }))}
        empty="Chưa có bút toán đối soát."
      />
      <FinanceTable
        title="Lịch sử chi trả"
        description={`Tối đa ${limit} giao dịch chi trả mới nhất của đối tác.`}
        columns={['Mã đợt', 'Ngày tạo', 'Ngày thực hiện đợt', 'Số tiền', 'Trạng thái', 'Mã tham chiếu']}
        rows={payouts.map(payout => ({
          id: payout.id,
          cells: [
            payout.batch_code, formatDate(payout.created_at), formatDate(payout.executed_at),
            vendorMoney(payout.amount), statusLabel(payout.status), payout.reference || '—',
          ],
        }))}
        empty="Chưa có giao dịch chi trả."
      />
    </>
  );
}
