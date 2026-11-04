import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Compass, 
  MapPin, 
  ShieldCheck, 
  Award, 
  Users, 
  CheckCircle2, 
  Clock, 
  Plus, 
  FileText, 
  LogOut, 
  DollarSign, 
  TrendingUp, 
  Phone, 
  Mail, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Calendar,
  Layers,
  HeartHandshake
} from 'lucide-react';
import { vendorApplicationService, formatDisplayId } from '../../services/vendorApplicationService';

export const PartnerDashboardPage = () => {
  const navigate = useNavigate();
  const [vendorData, setVendorData] = useState(null);
  const [activeTab, setActiveTab] = useState('tours'); // 'tours' | 'guides' | 'profile'

  useEffect(() => {
    // 1. Kiểm tra session đăng nhập
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/partner/login', { replace: true });
      return;
    }

    // 2. Lấy dữ liệu profile đối tác
    const cachedProfile = localStorage.getItem('current_vendor_profile');
    if (cachedProfile) {
      try {
        setVendorData(JSON.parse(cachedProfile));
        return;
      } catch (err) {
        console.warn('Lỗi đọc cache vendor:', err);
      }
    }

    // 3. Fallback lấy đối tác đầu tiên đã duyệt
    const loadDefaultVendor = async () => {
      try {
        const list = await vendorApplicationService.getAll();
        const approved = list.find(v => v.status === 'approved') || list[0];
        if (approved) {
          setVendorData(approved);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadDefaultVendor();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('current_vendor_profile');
    navigate('/partner/login', { replace: true });
  };

  // Dữ liệu mô phỏng tour trekking của đối tác
  const toursList = [
    {
      id: 'TOUR-ST-01',
      name: 'Chinh phục Đỉnh Bàn Cờ & Ngắm Voọc Chà Vá',
      duration: '4 - 5 giờ',
      distance: '6.5 km',
      difficulty: 'Trung bình',
      price: '450.000 đ',
      esg_contribution: '45.000 đ',
      bql_status: 'approved',
      bql_code: 'GP-BQLST-2026/01',
      checkpoints_count: 5,
      active_guides: 3
    },
    {
      id: 'TOUR-ST-02',
      name: 'Khám Phá Cây Đa Ngàn Năm & Hệ Sinh Thái Rừng Già',
      duration: '3.5 giờ',
      distance: '4.8 km',
      difficulty: 'Dễ',
      price: '380.000 đ',
      esg_contribution: '38.000 đ',
      bql_status: 'approved',
      bql_code: 'GP-BQLST-2026/02',
      checkpoints_count: 4,
      active_guides: 2
    },
    {
      id: 'TOUR-ST-03',
      name: 'Trekking Mũi Nghê - Điểm Đón Bình Minh Đầu Tiên',
      duration: '6 giờ',
      distance: '8.2 km',
      difficulty: 'Thử thách',
      price: '650.000 đ',
      esg_contribution: '65.000 đ',
      bql_status: 'approved',
      bql_code: 'GP-BQLST-2026/03',
      checkpoints_count: 6,
      active_guides: 2
    },
    {
      id: 'TOUR-ST-04',
      name: 'Hành Trình Bãi Bụt & Lặn Ngắm Rạn San Hô Sinh Thái',
      duration: '3 giờ',
      distance: '3.0 km',
      difficulty: 'Dễ',
      price: '420.000 đ',
      esg_contribution: '42.000 đ',
      bql_status: 'pending_review',
      bql_code: 'Đang thẩm định tuyến GPS',
      checkpoints_count: 3,
      active_guides: 1
    }
  ];

  // Danh sách hướng dẫn viên cấp thẻ sinh thái
  const guidesList = [
    {
      name: 'Trần Minh Quân',
      code: 'GUIDE-BQL-042',
      role: 'Lead Guide & Chuyên gia sinh thái rừng',
      first_aid: 'Chứng chỉ Hội Chữ Thập Đỏ Quốc Tế (2025-2027)',
      experience: '5 năm dẫn tuyến Sơn Trà',
      status: 'active'
    },
    {
      name: 'Nguyễn Thị Hải Yến',
      code: 'GUIDE-BQL-058',
      role: 'Guide Hướng dẫn sinh vật & Loài Voọc',
      first_aid: 'Chứng chỉ Sơ cấp cứu Wilderness First Aid',
      experience: '3 năm kinh nghiệm',
      status: 'active'
    },
    {
      name: 'Lê Hoàng Nam',
      code: 'GUIDE-BQL-071',
      role: 'Guide Kỹ thuật & Định vị Checkpoint GPS',
      first_aid: 'Chứng chỉ Cứu nạn cứu hộ đường mòn BQL',
      experience: '4 năm kinh nghiệm',
      status: 'active'
    }
  ];

  const brandName = vendorData?.brand_name || 'Sơn Trà Trekking Adventure';
  const displayId = formatDisplayId(vendorData?.display_id || vendorData?.id || 'VAPP-2026-001');

  return (
    <div className="min-h-screen bg-[#f7f5f0] font-be-vietnam flex flex-col justify-between">
      {/* 1. TOP B2B PORTAL HEADER */}
      <header className="h-[72px] bg-white border-b border-[#e2e8e4] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#24563d] !text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {brandName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-[#18211c] font-fraunces">
                {brandName}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>BQL Xác Thực</span>
              </span>
            </div>
            <p className="text-[11px] text-[#5d6861] font-mono mt-0.5">
              Mã đối tác: <strong className="text-[#24563d]">{displayId}</strong> · Cổng Quản Trị Lữ Hành B2B
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/partner"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e2e8e4] bg-white hover:bg-gray-50 !text-[#18211c] text-xs font-semibold transition-all cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-gray-500" />
            <span>Trang Cổng Đối Tác</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        
        {/* WELCOME BANNER */}
        <div className="bg-white border border-[#e2e8e4] rounded-3xl p-6 sm:p-8 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#eaf2eb] text-[#24563d] text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Chương trình Đối tác Du lịch Sinh thái Tuần hoàn Sơn Trà</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-fraunces text-[#18211c]">
              Xin chào, {vendorData?.legal_representative || brandName}!
            </h1>
            <p className="text-xs sm:text-sm text-[#5d6861] max-w-2xl leading-relaxed">
              Tài khoản đối tác của Quý đơn vị đã được Ban Quản Lý Bán đảo Sơn Trà phê duyệt chính thức. Các tuyến tour trekking và chứng nhận hướng dẫn viên được kiểm định định kỳ đảm bảo tiêu chuẩn bảo tồn đa dạng sinh học.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* NÚT XANH -> CHỮ TRẮNG */}
            <button
              type="button"
              onClick={() => alert('Chức năng gửi hồ sơ Tuyến Tour Mới lên BQL Sơn Trà thẩm định')}
              className="px-5 py-3 rounded-2xl bg-[#24563d] hover:bg-[#1b3d2b] !text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4 text-white" />
              <span className="!text-white">Đăng ký Tour Mới</span>
            </button>

            {/* NÚT TRẮNG -> CHỮ ĐEN */}
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="px-4 py-3 rounded-2xl bg-white border border-[#d2ded5] hover:bg-gray-50 !text-[#18211c] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="!text-[#18211c]">Hồ sơ Doanh nghiệp</span>
            </button>
          </div>
        </div>

        {/* 3. 4 KPI METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Tuyến Tour */}
          <div className="p-5 rounded-2xl bg-white border border-[#e2e8e4] shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>Tuyến Tour Cấp Phép</span>
              <Compass className="w-4 h-4 text-[#24563d]" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-fraunces text-[#18211c]">
              4 <span className="text-xs font-sans text-gray-500 font-normal">tuyến</span>
            </p>
            <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>3 tuyến đang mở bán</span>
            </p>
          </div>

          {/* Card 2: Quỹ Bảo tồn ESG (10%) */}
          <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
              <span>Đóng góp Quỹ ESG (10%)</span>
              <HeartHandshake className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-fraunces text-[#24563d]">
              14.250.000 <span className="text-xs font-sans text-emerald-800 font-normal">VNĐ</span>
            </p>
            <p className="text-[11px] text-emerald-700 font-semibold">
              Trích nộp tự động qua Split-Payment
            </p>
          </div>

          {/* Card 3: Guide Cấp Thẻ */}
          <div className="p-5 rounded-2xl bg-white border border-[#e2e8e4] shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>Hướng Dẫn Viên (Guide)</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-fraunces text-[#18211c]">
              {vendorData?.guides_count || 6} <span className="text-xs font-sans text-gray-500 font-normal">nhân sự</span>
            </p>
            <p className="text-[11px] text-blue-700 font-semibold">
              100% đạt chứng chỉ Sơ cấp cứu
            </p>
          </div>

          {/* Card 4: Lượt Khách */}
          <div className="p-5 rounded-2xl bg-white border border-[#e2e8e4] shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>Du Khách Đặt Tour</span>
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-fraunces text-[#18211c]">
              128 <span className="text-xs font-sans text-gray-500 font-normal">lượt</span>
            </p>
            <p className="text-[11px] text-amber-700 font-semibold">
              100% hoàn thành Checkpoint GPS
            </p>
          </div>
        </div>

        {/* 4. TABS NAVIGATION */}
        <div className="flex items-center gap-3 border-b border-[#e2e8e4] pt-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('tours')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'tours'
                ? 'border-[#24563d] text-[#24563d]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Danh Mục Tour Trekking ({toursList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guides')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'guides'
                ? 'border-[#24563d] text-[#24563d]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Đội Ngũ Hướng Dẫn Viên ({guidesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#24563d] text-[#24563d]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Pháp Nhân & Chứng Nhận ESG</span>
          </button>
        </div>

        {/* 5. TAB CONTENT */}
        {activeTab === 'tours' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-fraunces text-[#18211c]">
                  Các Tuyến Tour Trekking Sinh Thái Được BQL Cấp Phép
                </h3>
                <p className="text-xs text-[#5d6861]">
                  Mỗi vé tour thành công tự động trích nộp 10% Quỹ Bảo Tồn & Cứu Hộ Bán Đảo Sơn Trà.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {toursList.map((t) => (
                <div 
                  key={t.id} 
                  className="bg-white border border-[#e2e8e4] rounded-2xl p-5 hover:border-[#24563d] transition-all shadow-2xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#24563d] bg-[#eaf2eb] px-2 py-0.5 rounded-md">
                        {t.id}
                      </span>
                      {t.bql_status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Đã duyệt mở bán</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Chờ kiểm duyệt BQL</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-[#18211c] leading-snug">
                      {t.name}
                    </h4>

                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#f0f3f1] text-[11px]">
                      <div>
                        <span className="text-gray-400 block">Thời lượng:</span>
                        <strong className="text-[#18211c]">{t.duration}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Độ dài tuyến:</span>
                        <strong className="text-[#18211c]">{t.distance}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Độ khó:</span>
                        <strong className="text-[#18211c]">{t.difficulty}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-[11px] text-gray-500 block">Giá vé tour:</span>
                      <p className="text-base font-bold font-fraunces text-[#24563d]">
                        {t.price}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-emerald-700 block font-bold uppercase tracking-wider">
                        Trích Quỹ ESG (10%):
                      </span>
                      <p className="text-xs font-bold text-emerald-800">
                        {t.esg_contribution} / vé
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'guides' && (
          <div className="bg-white border border-[#e2e8e4] rounded-2xl p-6 shadow-2xs space-y-4">
            <div>
              <h3 className="text-base font-bold font-fraunces text-[#18211c]">
                Danh Sách Hướng Dẫn Viên Được Cấp Thẻ BQL Sơn Trà
              </h3>
              <p className="text-xs text-[#5d6861]">
                Đội ngũ guide được huấn luyện nghiệp vụ an toàn rừng, sơ cấp cứu và bảo tồn loài Voọc Chà Vá chân nâu.
              </p>
            </div>

            <div className="divide-y divide-[#e8ece9]">
              {guidesList.map((g, idx) => (
                <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#18211c]">{g.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#eaf2eb] text-[#24563d]">
                        {g.code}
                      </span>
                    </div>
                    <p className="text-xs text-[#5d6861]">{g.role}</p>
                    <p className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{g.first_aid}</span>
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Thẻ BQL còn hiệu lực</span>
                    </span>
                    <p className="text-[11px] text-gray-400 mt-1">{g.experience}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white border border-[#e2e8e4] rounded-2xl p-6 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8ece9] pb-4">
              <div>
                <h3 className="text-base font-bold font-fraunces text-[#18211c]">
                  Thông Tin Pháp Lý & Thẩm Định Doanh Nghiệp
                </h3>
                <p className="text-xs text-[#5d6861]">
                  Hồ sơ lưu trữ trên Cơ sở Dữ liệu Quản lý Đối tác BQL Sơn Trà ReLoop.
                </p>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>ĐÃ PHÊ DUYỆT CHÍNH THỨC</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#e8ece9] space-y-2">
                <span className="text-gray-400 font-bold uppercase text-[10px]">Tên đơn vị lữ hành</span>
                <p className="text-sm font-bold text-[#18211c]">{brandName}</p>
                <p className="text-gray-500">Người đại diện: <strong>{vendorData?.legal_representative || 'Nguyễn Văn Hùng'}</strong></p>
                <p className="text-gray-500">Mã số thuế: <strong>{vendorData?.business_license_code || 'GPKD-DN-0408892101'}</strong></p>
              </div>

              <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#e8ece9] space-y-2">
                <span className="text-gray-400 font-bold uppercase text-[10px]">Cam kết ESG & Bảo tồn</span>
                <p className="text-sm font-bold text-[#24563d]">Trích nộp 10% Quỹ Bảo Tồn Bán Đảo Sơn Trà</p>
                <p className="text-gray-500">Cơ quan cấp phép: <strong>Sở Kế hoạch & Đầu tư TP. Đà Nẵng</strong></p>
                <p className="text-gray-500">Địa bàn hoạt động: <strong>Bán đảo Sơn Trà & Biển Đà Nẵng</strong></p>
              </div>
            </div>

            {/* Electronic Stamp */}
            <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  BQL
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-950">Chứng nhận Đối tác Du lịch Sinh thái Tuần hoàn</p>
                  <p className="text-[11px] text-emerald-800">Xác thực điện tử bới Ban Quản Lý Bán đảo Sơn Trà · Mã số: {displayId}</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg bg-emerald-200 text-emerald-900 font-mono font-bold text-[11px]">
                VERIFIED 2026
              </span>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="py-4 px-6 text-center text-xs text-gray-500 border-t border-[#e2e8e4] bg-white">
        © 2026 Cổng Quản Trị Đối Tác Lữ Hành · Ban Quản Lý Bán Đảo Sơn Trà · PBL6 Son Tra ReLoop
      </footer>
    </div>
  );
};

export default PartnerDashboardPage;

