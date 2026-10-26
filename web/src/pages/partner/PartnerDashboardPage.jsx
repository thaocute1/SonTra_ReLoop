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
      name: 'Chinh phục đỉnh Bàn Cờ và ngắm voọc chà vá',
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
      name: 'Khám phá cây đa ngàn năm và hệ sinh thái rừng già',
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
      name: 'Trekking Mũi Nghê - điểm đón bình minh đầu tiên',
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
      name: 'Hành trình Bãi Bụt và lặn ngắm rạn san hô sinh thái',
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
      role: 'Lead guide và chuyên gia sinh thái rừng',
      first_aid: 'Chứng chỉ Hội Chữ thập đỏ Quốc tế (2025-2027)',
      experience: '5 năm dẫn tuyến Sơn Trà',
      status: 'active'
    },
    {
      name: 'Nguyễn Thị Hải Yến',
      code: 'GUIDE-BQL-058',
      role: 'Guide hướng dẫn sinh vật và loài voọc',
      first_aid: 'Chứng chỉ Sơ cấp cứu Wilderness First Aid',
      experience: '3 năm kinh nghiệm',
      status: 'active'
    },
    {
      name: 'Lê Hoàng Nam',
      code: 'GUIDE-BQL-071',
      role: 'Guide kỹ thuật và định vị checkpoint GPS',
      first_aid: 'Chứng chỉ cứu nạn cứu hộ đường mòn BQL',
      experience: '4 năm kinh nghiệm',
      status: 'active'
    }
  ];

  const brandName = vendorData?.brand_name || 'Sơn Trà Trekking Adventure';
  const displayId = formatDisplayId(vendorData?.display_id || vendorData?.id || 'VAPP-2026-001');

  return (
    <div className="m3-partner-page min-h-screen bg-[#F8FAF7] font-be-vietnam flex flex-col justify-between motion-page-enter">
      {/* 1. TOP B2B PORTAL HEADER */}
      <header className="h-[72px] bg-white border-b border-[#C5CCC7] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#2F5D4A] !text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {brandName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-[#191C1A] font-fraunces">
                {brandName}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>BQL xác thực</span>
              </span>
            </div>
            <p className="text-[11px] text-[#4A514C] font-mono mt-0.5">
              Mã đối tác: <strong className="text-[#2F5D4A]">{displayId}</strong> · Cổng quản trị lữ hành B2B
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/partner"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#C5CCC7] bg-white hover:bg-[#F2F5F1] !text-[#191C1A] text-xs font-semibold transition-all cursor-pointer motion-press"
          >
            <Compass className="w-3.5 h-3.5 text-[#4A514C]" />
            <span>Trang cổng đối tác</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-all cursor-pointer motion-press"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6 motion-stagger">
        
        {/* WELCOME BANNER */}
        <div className="bg-white border border-[#C5CCC7] rounded-3xl p-6 sm:p-8 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#DCEBE3] text-[#2F5D4A] text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Chương trình đối tác du lịch sinh thái tuần hoàn Sơn Trà</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-fraunces text-[#191C1A]">
              Xin chào, {vendorData?.legal_representative || brandName}!
            </h1>
            <p className="text-xs sm:text-sm text-[#4A514C] max-w-2xl leading-relaxed">
              Tài khoản đối tác của quý đơn vị đã được ban quản lý bán đảo Sơn Trà phê duyệt chính thức. Các tuyến tour trekking và chứng nhận hướng dẫn viên được kiểm định định kỳ, đảm bảo tiêu chuẩn bảo tồn đa dạng sinh học.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* NÚT XANH -> CHỮ TRẮNG */}
            <button
              type="button"
              onClick={() => alert('Chức năng gửi hồ sơ tuyến tour mới lên BQL Sơn Trà thẩm định')}
              className="px-5 py-3 rounded-2xl bg-[#2F5D4A] hover:bg-[#254B3C] !text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4 text-white" />
              <span className="!text-white">Đăng ký tour mới</span>
            </button>

            {/* NÚT TRẮNG -> CHỮ ĐEN */}
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="px-4 py-3 rounded-2xl bg-white border border-[#C5CCC7] hover:bg-[#F2F5F1] !text-[#191C1A] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#4A514C]" />
              <span className="!text-[#191C1A]">Hồ sơ doanh nghiệp</span>
            </button>
          </div>
        </div>

        {/* 3. 4 KPI METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Tuyến Tour */}
          <div className="p-5 rounded-2xl bg-white border border-[#C5CCC7] shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#4A514C]">
              <span>Tuyến tour cấp phép</span>
              <Compass className="w-4 h-4 text-[#2F5D4A]" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-fraunces text-[#191C1A]">
              4 <span className="text-xs font-sans text-[#4A514C] font-normal">tuyến</span>
            </p>
            <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>3 tuyến đang mở bán</span>
            </p>
          </div>

          {/* Card 2: Quỹ Bảo tồn ESG (10%) */}
          <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
              <span>Đóng góp quỹ ESG (10%)</span>
              <HeartHandshake className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-fraunces text-[#2F5D4A]">
              14.250.000 <span className="text-xs font-sans text-emerald-800 font-normal">VNĐ</span>
            </p>
            <p className="text-[11px] text-emerald-700 font-semibold">
              Trích nộp tự động qua split payment
            </p>
          </div>

          {/* Card 3: Guide Cấp Thẻ */}
          <div className="p-5 rounded-2xl bg-white border border-[#C5CCC7] shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#4A514C]">
              <span>Hướng dẫn viên (guide)</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-fraunces text-[#191C1A]">
              {vendorData?.guides_count || 6} <span className="text-xs font-sans text-[#4A514C] font-normal">nhân sự</span>
            </p>
            <p className="text-[11px] text-blue-700 font-semibold">
              100% đạt chứng chỉ sơ cấp cứu
            </p>
          </div>

          {/* Card 4: Lượt Khách */}
          <div className="p-5 rounded-2xl bg-white border border-[#C5CCC7] shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#4A514C]">
              <span>Du khách đặt tour</span>
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-fraunces text-[#191C1A]">
              128 <span className="text-xs font-sans text-[#4A514C] font-normal">lượt</span>
            </p>
            <p className="text-[11px] text-amber-700 font-semibold">
              100% hoàn thành checkpoint GPS
            </p>
          </div>
        </div>

        {/* 4. TABS NAVIGATION */}
        <div className="flex items-center gap-3 border-b border-[#C5CCC7] pt-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('tours')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'tours'
                ? 'border-[#2F5D4A] text-[#2F5D4A]'
                : 'border-transparent text-[#4A514C] hover:text-[#191C1A]'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Danh mục tour trekking ({toursList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guides')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'guides'
                ? 'border-[#2F5D4A] text-[#2F5D4A]'
                : 'border-transparent text-[#4A514C] hover:text-[#191C1A]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Đội ngũ hướng dẫn viên ({guidesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#2F5D4A] text-[#2F5D4A]'
                : 'border-transparent text-[#4A514C] hover:text-[#191C1A]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Pháp nhân và chứng nhận ESG</span>
          </button>
        </div>

        {/* 5. TAB CONTENT */}
        {activeTab === 'tours' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-fraunces text-[#191C1A]">
                  Các tuyến tour trekking sinh thái được BQL cấp phép
                </h3>
                <p className="text-xs text-[#4A514C]">
                Mỗi vé tour thành công tự động trích nộp 10% quỹ bảo tồn và cứu hộ bán đảo Sơn Trà.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {toursList.map((t) => (
                <div 
                  key={t.id} 
                  className="bg-white border border-[#C5CCC7] rounded-2xl p-5 hover:border-[#2F5D4A] transition-all shadow-2xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#2F5D4A] bg-[#DCEBE3] px-2 py-0.5 rounded-md">
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

                    <h4 className="text-sm font-bold text-[#191C1A] leading-snug">
                      {t.name}
                    </h4>

                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#C5CCC7] text-[11px]">
                      <div>
                        <span className="text-[#4A514C] block">Thời lượng:</span>
                        <strong className="text-[#191C1A]">{t.duration}</strong>
                      </div>
                      <div>
                        <span className="text-[#4A514C] block">Độ dài tuyến:</span>
                        <strong className="text-[#191C1A]">{t.distance}</strong>
                      </div>
                      <div>
                        <span className="text-[#4A514C] block">Độ khó:</span>
                        <strong className="text-[#191C1A]">{t.difficulty}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-[11px] text-[#4A514C] block">Giá vé tour:</span>
                      <p className="text-base font-bold font-fraunces text-[#2F5D4A]">
                        {t.price}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-emerald-700 block font-bold tracking-wider">
                        Trích quỹ ESG (10%):
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
          <div className="bg-white border border-[#C5CCC7] rounded-2xl p-6 shadow-2xs space-y-4">
            <div>
              <h3 className="text-base font-bold font-fraunces text-[#191C1A]">
                Danh sách hướng dẫn viên được cấp thẻ BQL Sơn Trà
              </h3>
              <p className="text-xs text-[#4A514C]">
                Đội ngũ guide được huấn luyện nghiệp vụ an toàn rừng, sơ cấp cứu và bảo tồn loài voọc chà vá chân nâu.
              </p>
            </div>

            <div className="divide-y divide-[#C5CCC7]">
              {guidesList.map((g, idx) => (
                <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#191C1A]">{g.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#DCEBE3] text-[#2F5D4A]">
                        {g.code}
                      </span>
                    </div>
                    <p className="text-xs text-[#4A514C]">{g.role}</p>
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
                    <p className="text-[11px] text-[#4A514C] mt-1">{g.experience}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white border border-[#C5CCC7] rounded-2xl p-6 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#C5CCC7] pb-4">
              <div>
                <h3 className="text-base font-bold font-fraunces text-[#191C1A]">
                  Thông tin pháp lý và thẩm định doanh nghiệp
                </h3>
                <p className="text-xs text-[#4A514C]">
                  Hồ sơ lưu trữ trên cơ sở dữ liệu quản lý đối tác BQL Sơn Trà REloop.
                </p>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Đã phê duyệt chính thức</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#F2F5F1] border border-[#C5CCC7] space-y-2">
                <span className="text-[#4A514C] font-bold text-[10px]">Tên đơn vị lữ hành</span>
                <p className="text-sm font-bold text-[#191C1A]">{brandName}</p>
                <p className="text-[#4A514C]">Người đại diện: <strong>{vendorData?.legal_representative || 'Nguyễn Văn Hùng'}</strong></p>
                <p className="text-[#4A514C]">Mã số thuế: <strong>{vendorData?.business_license_code || 'GPKD-DN-0408892101'}</strong></p>
              </div>

              <div className="p-4 rounded-xl bg-[#F2F5F1] border border-[#C5CCC7] space-y-2">
                <span className="text-[#4A514C] font-bold text-[10px]">Cam kết ESG và bảo tồn</span>
                <p className="text-sm font-bold text-[#2F5D4A]">Trích nộp 10% quỹ bảo tồn bán đảo Sơn Trà</p>
                <p className="text-[#4A514C]">Cơ quan cấp phép: <strong>Sở Kế hoạch và Đầu tư TP. Đà Nẵng</strong></p>
                <p className="text-[#4A514C]">Địa bàn hoạt động: <strong>bán đảo Sơn Trà và biển Đà Nẵng</strong></p>
              </div>
            </div>

            {/* Electronic Stamp */}
            <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  BQL
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-950">Chứng nhận đối tác du lịch sinh thái tuần hoàn</p>
                  <p className="text-[11px] text-emerald-800">Xác thực điện tử bởi ban quản lý bán đảo Sơn Trà · Mã số: {displayId}</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg bg-emerald-200 text-emerald-900 font-mono font-bold text-[11px]">
                Đã xác thực 2026
              </span>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="py-4 px-6 text-center text-xs text-[#4A514C] border-t border-[#C5CCC7] bg-white">
        © 2026 Cổng quản trị đối tác lữ hành · Ban quản lý bán đảo Sơn Trà · PBL6 Son Tra REloop
      </footer>
    </div>
  );
};

export default PartnerDashboardPage;

