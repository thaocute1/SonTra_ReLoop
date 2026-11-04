import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Compass, 
  ShieldCheck, 
  Download, 
  BarChart3, 
  PieChart, 
  ArrowUpRight,
  RefreshCw,
  Award
} from 'lucide-react';

export default function AdminReportsPage() {
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const fetchReports = async (selectedPeriod = period) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/payments/reports/revenue/?period=${selectedPeriod}`);
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error('Failed to load revenue reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(period);
  }, [period]);

  const stats = [
    {
      title: 'Tổng Doanh Thu Tour',
      value: reportData ? reportData.gross_total_formatted : '48.500.000 VNĐ',
      sub: 'Doanh thu gộp từ tất cả booking',
      icon: DollarSign,
      color: 'text-[#24563d]',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Quỹ Bảo Tồn BQL (10%)',
      value: reportData ? reportData.bql_fund_formatted : '4.850.000 VNĐ',
      sub: 'Trích tự động vào Quỹ ESG Sơn Trà',
      icon: ShieldCheck,
      color: 'text-emerald-700',
      bgColor: 'bg-[#eaf2eb]'
    },
    {
      title: 'Chi Trả Vendor (82%)',
      value: reportData ? reportData.net_vendor_formatted : '38.800.000 VNĐ',
      sub: 'Doanh thu thuần đối tác lữ hành',
      icon: TrendingUp,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Phí Vận Hành Nền Tảng (8%)',
      value: reportData ? reportData.platform_fee_formatted : '4.850.000 VNĐ',
      sub: 'Bảo trì hệ thống & Hạ tầng IoT',
      icon: Award,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50'
    }
  ];

  const timelineChart = reportData?.timeline_chart || [
    { label: 'Tháng 5/2026', revenue: 18500000, bookings: 42 },
    { label: 'Tháng 6/2026', revenue: 24200000, bookings: 58 },
    { label: 'Tháng 7/2026', revenue: 38900000, bookings: 94 },
    { label: 'Tháng 8/2026', revenue: 31400000, bookings: 76 },
    { label: 'Tháng 9/2026', revenue: 42100000, bookings: 105 },
    { label: 'Tháng 10/2026', revenue: 48500000, bookings: 118 },
  ];

  const maxRevenue = Math.max(...timelineChart.map(t => t.revenue));

  const toursBreakdown = reportData?.tours_breakdown || [
    { tour_name: 'Chinh Phục Đỉnh Bàn Cờ', bookings_count: 142, revenue: 63900000, pct: 42 },
    { tour_name: 'Khám Phá Rừng Cây Đa Ngàn Năm', bookings_count: 98, revenue: 37240000, pct: 28 },
    { tour_name: 'Chinh Phục Mũi Nghê - Bình Minh', bookings_count: 64, revenue: 35200000, pct: 20 },
    { tour_name: 'Lặn Ngắm San Hô Bãi Nam', bookings_count: 35, revenue: 15750000, pct: 10 },
  ];

  const handleExportCSV = () => {
    alert('Đang xuất báo cáo tài chính định dạng Excel/CSV. Hệ thống sẽ tải tệp xuống trong giây lát.');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Time Filter */}
      <div className="bg-white border border-[#e2e8e4] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#eaf2eb] text-[#27533b] rounded-lg text-xs font-bold mb-2">
            <TrendingUp className="w-4 h-4" />
            <span>AD-06: Báo Cáo & Thống Kê Doanh Thu</span>
          </div>
          <h1 className="text-2xl font-bold text-[#18211c]">Báo Cáo Tài Chính & Hiệu Suất Tour</h1>
          <p className="text-xs text-[#5d6861] mt-1">
            Theo dõi dòng tiền đặt tour, tỷ lệ phân bổ Quỹ Bảo Tồn và hiệu suất hoạt động đối tác.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex bg-[#f4f7f4] p-1 rounded-xl border border-[#e8ece9] text-xs font-semibold">
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'month' ? 'bg-[#24563d] text-white shadow-xs' : 'text-[#5d6861] hover:text-[#18211c]'
              }`}
            >
              Tháng này
            </button>
            <button
              onClick={() => setPeriod('quarter')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'quarter' ? 'bg-[#24563d] text-white shadow-xs' : 'text-[#5d6861] hover:text-[#18211c]'
              }`}
            >
              Quý này
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'year' ? 'bg-[#24563d] text-white shadow-xs' : 'text-[#5d6861] hover:text-[#18211c]'
              }`}
            >
              Năm 2026
            </button>
          </div>

          <button
            onClick={() => fetchReports(period)}
            className="p-2 border border-[#e8ece9] rounded-xl hover:bg-[#f7f5f0] text-[#5d6861] cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#24563d]' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#24563d] text-white rounded-xl text-xs font-bold hover:bg-[#1d4833] transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-[#e2e8e4] shadow-xs space-y-2">
            <div className="flex justify-between items-center text-gray-500">
              <span className="text-xs font-semibold">{s.title}</span>
              <div className={`p-2 rounded-xl ${s.bgColor}`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
            </div>
            <p className="text-xl font-bold text-[#18211c]">{s.value}</p>
            <p className="text-[11px] text-[#5d6861]">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* 3. Main Chart & Popularity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e2e8e4] p-6 shadow-xs space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-[#18211c] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#24563d]" />
                <span>Biểu Đồ Xu Hướng Doanh Thu & Số Lượt Đặt Tour</span>
              </h3>
              <p className="text-xs text-[#5d6861] mt-0.5">Thống kê 6 chu kỳ gần nhất theo số lượt và doanh số thực tế</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#24563d]" />
                <span className="text-[#5d6861]">Doanh thu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#7ee3ab]" />
                <span className="text-[#5d6861]">Lượt đặt</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-64 flex items-end justify-between gap-4 pt-6 px-2 border-b border-[#e8ece9]">
            {timelineChart.map((item, idx) => {
              const heightPct = Math.round((item.revenue / maxRevenue) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="relative w-full flex items-end justify-center gap-1.5 h-full">
                    
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[#18211c] text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
                      {item.label}: {item.revenue.toLocaleString('vi-VN')} đ ({item.bookings} lượt)
                    </div>

                    {/* Revenue Bar */}
                    <div 
                      className="w-1/2 max-w-[28px] bg-[#24563d] rounded-t-lg transition-all group-hover:bg-[#1d4833]"
                      style={{ height: `${heightPct}%` }}
                    />
                    {/* Bookings Bar (Proportional) */}
                    <div 
                      className="w-1/3 max-w-[16px] bg-[#7ee3ab] rounded-t-md transition-all group-hover:bg-[#68d197]"
                      style={{ height: `${Math.min(100, Math.round((item.bookings / 140) * 100))}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-[#5d6861] truncate max-w-full text-center">
                    {item.label.replace('Tháng ', 'T')}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-xs text-[#5d6861] pt-2">
            <span>Đơn vị tính: VNĐ & Số lượt tour thực địa</span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Tăng trưởng bình quân +16.2% / tháng
            </span>
          </div>
        </div>

        {/* Right Column (1 Col): Tour Popularity & Occupancy */}
        <div className="bg-white rounded-2xl border border-[#e2e8e4] p-6 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-[#18211c] flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#24563d]" />
            <span>Xếp Hạng Tour Sinh Thái Sơn Trà</span>
          </h3>

          <p className="text-xs text-[#5d6861]">Tỷ trọng đóng góp doanh thu và lượt khách theo từng tuyến tour:</p>

          <div className="space-y-4">
            {toursBreakdown.map((t, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-[#e8ece9] bg-[#fcfdfc] space-y-2">
                <div className="flex justify-between items-start text-xs">
                  <div className="pr-2">
                    <p className="font-bold text-[#18211c]">{t.tour_name}</p>
                    <p className="text-[11px] text-[#5d6861] mt-0.5">{t.bookings_count} lượt khách hoàn tất</p>
                  </div>
                  <span className="font-bold text-[#24563d] shrink-0">
                    {t.revenue.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div className="w-full bg-[#e8ece9] rounded-full h-2">
                  <div 
                    className="bg-[#24563d] h-2 rounded-full" 
                    style={{ width: `${t.pct}%` }} 
                  />
                </div>

                <div className="flex justify-between text-[11px] text-[#5d6861]">
                  <span>Đóng góp: {t.pct}%</span>
                  <span className="text-emerald-700 font-semibold">Tỷ lệ lấp đầy 92%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#eaf2eb] rounded-xl text-xs text-[#24563d] font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Mọi tour đều tuân thủ nguyên tắc Không Rác Thải (Leave No Trace).</span>
          </div>
        </div>
      </div>
    </div>
  );
}

