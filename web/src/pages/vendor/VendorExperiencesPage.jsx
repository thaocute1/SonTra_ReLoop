import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import RouteMapPicker from '../../components/common/RouteMapPicker';
import RouteMapPreview from '../../components/common/RouteMapPreview';
import { 
  Compass, 
  MapPin, 
  CalendarDays, 
  Users, 
  Gift, 
  TrendingUp, 
  MessageSquare, 
  Bell, 
  Settings, 
  Search, 
  Info, 
  Plus, 
  Check, 
  Eye, 
  ArrowUpRight,
  Sparkles,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Award,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  Upload,
  CheckCircle,
  ChevronRight,
  Layers
} from 'lucide-react';
import logoImg from '../../assets/logo.jpg';
import { api } from '../../lib/axios';

export const VendorExperiencesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isRoutesView = location.search.includes('view=routes') || location.pathname.includes('/routes');
  const [selectedRouteForView, setSelectedRouteForView] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [addScheduleModalOpen, setAddScheduleModalOpen] = useState(false);
  const [selectedTourForSchedule, setSelectedTourForSchedule] = useState(null);
  const [detailTourModal, setDetailTourModal] = useState(null);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  // Danh sách tour của Vendor
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form tạo Tour mới (Wizard 3 bước)
  const [wizardStep, setWizardStep] = useState(1);
  const [newTourForm, setNewTourForm] = useState({
    title: '',
    description: '',
    price: 450000,
    max_capacity: 15,
    difficulty_level: 'moderate',
    duration_hours: 4.5,
    cover_image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
    start_point: 'Chân dốc Hoàng Sa, Thọ Quang, Đà Nẵng',
    end_point: 'Đỉnh Bàn Cờ (Độ cao 700m)',
    total_distance_km: 4.5,
    elevation_gain_m: 350,
    checkpoints: [],
    coordinates: [],
    // Chuyến khởi hành đầu tiên
    initial_date: '2026-10-24',
    initial_time: '06:00 - 10:30',
    guide_name: 'Nguyễn Tuấn Anh (Thẻ BQL #G08)'
  });

  // Form mở thêm chuyến khởi hành
  const [newScheduleForm, setNewScheduleForm] = useState({
    departure_date: '2026-10-31',
    time_slot: '06:00 - 10:30',
    max_capacity: 15,
    price: 450000,
    guide_name: 'Nguyễn Tuấn Anh (Thẻ BQL #G08)'
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchTours = async () => {
    try {
      const res = await api.get('/vendors/tours/');
      if (res.data && res.data.status === 'success') {
        setTours(res.data.data);
      }
    } catch (e) {
      console.warn('Fallback to local tours:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi Cổng Đối Tác?')) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_info');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_name');
      localStorage.removeItem('current_vendor_profile');
      navigate('/partner/login', { replace: true });
    }
  };

  // Submit tạo Tour mới
  const handleCreateTourSubmit = async (e) => {
    e.preventDefault();
    if (!newTourForm.title.trim()) {
      alert('Vui lòng nhập tên trải nghiệm trekking!');
      return;
    }

    const payload = {
      title: newTourForm.title,
      description: newTourForm.description || 'Trải nghiệm trekking sinh thái bán đảo Sơn Trà cùng Hướng dẫn viên địa phương.',
      price: Number(newTourForm.price),
      max_capacity: Number(newTourForm.max_capacity),
      difficulty_level: newTourForm.difficulty_level,
      duration_hours: Number(newTourForm.duration_hours),
      cover_image_url: newTourForm.cover_image_url,
      start_point: newTourForm.start_point,
      end_point: newTourForm.end_point,
      total_distance_km: Number(newTourForm.total_distance_km),
      elevation_gain_m: Number(newTourForm.elevation_gain_m),
      checkpoints: newTourForm.checkpoints || [],
      coordinates: newTourForm.coordinates || [],
      initial_schedule: {
        departure_date: newTourForm.initial_date.split('-').reverse().join('/'),
        time_slot: newTourForm.initial_time,
        guide_name: newTourForm.guide_name
      }
    };

    try {
      const res = await api.post('/vendors/tours/', payload);
      if (res.data && res.data.status === 'success') {
        showToast(`🎉 Đã tạo trải nghiệm "${payload.title}" thành công!`);
        fetchTours();
      }
    } catch (err) {
      // Fallback local update
      const newLocal = {
        id: tours.length + 1,
        title: payload.title,
        price: payload.price,
        price_formatted: `${payload.price.toLocaleString('vi-VN')} đ`,
        max_capacity: payload.max_capacity,
        difficulty_level: payload.difficulty_level,
        difficulty_label: payload.difficulty_level === 'moderate' ? 'Trung bình' : (payload.difficulty_level === 'easy' ? 'Dễ' : 'Thử thách'),
        duration_hours: payload.duration_hours,
        cover_image_url: payload.cover_image_url,
        status: 'published',
        route: {
          start_point: payload.start_point,
          end_point: payload.end_point,
          total_distance_km: payload.total_distance_km,
          elevation_gain_m: payload.elevation_gain_m,
          coordinates: payload.coordinates || []
        },
        checkpoints: payload.checkpoints || [],
        schedules: [
          {
            id: `SCH-${tours.length + 1}01`,
            departure_date: payload.initial_schedule.departure_date,
            time_slot: payload.initial_schedule.time_slot,
            max_capacity: payload.max_capacity,
            booked_count: 0,
            remaining_slots: payload.max_capacity,
            status: 'open',
            status_label: `Còn ${payload.max_capacity} chỗ`,
            guide_name: payload.initial_schedule.guide_name
          }
        ]
      };
      setTours([newLocal, ...tours]);
      showToast(`🎉 Đã tạo trải nghiệm "${payload.title}" thành công!`);
    }

    setCreateModalOpen(false);
    setWizardStep(1);
    setNewTourForm({
      title: '',
      description: '',
      price: 450000,
      max_capacity: 15,
      difficulty_level: 'moderate',
      duration_hours: 4.5,
      cover_image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
      start_point: 'Chân dốc Hoàng Sa, Thọ Quang, Đà Nẵng',
      end_point: 'Đỉnh Bàn Cờ (Độ cao 700m)',
      total_distance_km: 4.5,
      elevation_gain_m: 350,
      checkpoints: [],
      coordinates: [],
      initial_date: '2026-10-24',
      initial_time: '06:00 - 10:30',
      guide_name: 'Nguyễn Tuấn Anh (Thẻ BQL #G08)'
    });
  };

  // Submit mở thêm chuyến khởi hành
  const handleAddScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTourForSchedule) return;

    const formattedDate = newScheduleForm.departure_date.split('-').reverse().join('/');
    const payload = {
      departure_date: formattedDate,
      time_slot: newScheduleForm.time_slot,
      max_capacity: Number(newScheduleForm.max_capacity),
      price: Number(newScheduleForm.price),
      guide_name: newScheduleForm.guide_name
    };

    try {
      await api.post(`/vendors/tours/${selectedTourForSchedule.id}/schedules/`, payload);
      showToast(`Đã mở thêm chuyến khởi hành ngày ${formattedDate}!`);
      fetchTours();
    } catch (err) {
      // Local fallback
      setTours((prev) =>
        prev.map((t) => {
          if (t.id === selectedTourForSchedule.id) {
            const updatedScheds = t.schedules || [];
            return {
              ...t,
              schedules: [
                ...updatedScheds,
                {
                  id: `SCH-${t.id}${Math.floor(10 + Math.random() * 89)}`,
                  departure_date: formattedDate,
                  time_slot: payload.time_slot,
                  max_capacity: payload.max_capacity,
                  booked_count: 0,
                  remaining_slots: payload.max_capacity,
                  status: 'open',
                  status_label: `Còn ${payload.max_capacity} chỗ`,
                  guide_name: payload.guide_name
                }
              ]
            };
          }
          return t;
        })
      );
      showToast(`Đã mở thêm chuyến khởi hành ngày ${formattedDate}!`);
    }

    setAddScheduleModalOpen(false);
  };

  // Lọc tour
  const filteredTours = tours.filter((t) => {
    if (selectedDifficulty !== 'all' && t.difficulty_level !== selectedDifficulty) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return t.title?.toLowerCase().includes(term) || t.description?.toLowerCase().includes(term);
    }
    return true;
  });

  const navGroups = [
    {
      title: null,
      items: [
        { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard, path: '/vendor/dashboard' }
      ]
    },
    {
      title: 'KINH DOANH',
      items: [
        { id: 'experiences', label: 'Trải nghiệm', icon: Compass, path: '/vendor/experiences' },
        { id: 'routes', label: 'Tuyến & GPS', icon: MapPin, path: '/vendor/experiences?view=routes' },
        { id: 'bookings', label: 'Lịch & Đơn đặt', icon: CalendarDays, path: '/vendor/bookings' },
        { id: 'customers', label: 'Khách hàng', icon: Users, path: '/vendor/dashboard' },
        { id: 'rewards', label: 'Ưu đãi & Đổi rác', icon: Gift, path: '/vendor/dashboard' }
      ]
    },
    {
      title: 'PHÂN TÍCH',
      items: [
        { id: 'revenue', label: 'Báo cáo doanh thu', icon: TrendingUp, path: '/vendor/dashboard' }
      ]
    },
    {
      title: 'GIAO TIẾP & TÀI KHOẢN',
      items: [
        { id: 'chat', label: 'Trò chuyện & Hỗ trợ', icon: MessageSquare, path: '/vendor/dashboard' },
        { id: 'notifications', label: 'Thông báo', icon: Bell, path: '/vendor/dashboard' },
        { id: 'profile', label: 'Hồ sơ doanh nghiệp', icon: Settings, path: '/vendor/dashboard' }
      ]
    }
  ];

  return (
    <div className="flex min-h-screen bg-white font-sans text-[#2D3732] relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-[#2D3732] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#4A6B5D] animate-fade-in font-be-vietnam text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ================= FIXED LEFT SIDEBAR (100% USER STYLE) ================= */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[248px] bg-[#F7F5F0] p-5 flex flex-col justify-between border-r border-[#E2E8E4] transition-transform duration-300 shrink-0 select-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col gap-6 overflow-y-auto pr-1">
          {/* Logo & Brand Title */}
          <div className="flex items-center justify-between">
            <Link to="/vendor/dashboard" className="flex items-center gap-2.5 no-underline">
              <img
                src={logoImg}
                alt="Sơn Trà REloop Logo"
                className="w-10 h-10 rounded-xl object-cover border border-[#E2E8E4]"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=120&q=80";
                }}
              />
              <div className="flex flex-col">
                <span className="text-[#2D3732] text-base font-bold tracking-tight font-fraunces leading-tight">
                  Sơn Trà REloop
                </span>
                <span className="text-[10px] text-[#6B7A72] font-semibold tracking-wide uppercase font-be-vietnam mt-0.5">
                  Vendor Portal
                </span>
              </div>
            </Link>
            <button
              type="button"
              className="lg:hidden p-1 text-[#6B7A72] hover:text-[#2D3732] border-0 bg-transparent cursor-pointer"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="flex flex-col gap-3">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {group.title && (
                  <p className="px-3.5 text-[10px] uppercase font-bold text-[#86928b] tracking-wider mb-1 mt-2 font-be-vietnam">
                    {group.title}
                  </p>
                )}
                {group.items.map((item) => {
                  const IconComp = item.icon;
                  const active = isRoutesView ? item.id === 'routes' : item.id === 'experiences';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        navigate(item.path);
                        setSidebarOpen(false);
                      }}
                      className={`flex items-center w-full py-2.5 px-3.5 gap-3 rounded-2xl text-xs font-bold transition-all border-0 text-left cursor-pointer ${
                        active
                          ? "bg-[#E9EFEC] text-[#4A6B5D]"
                          : "text-[#6B7A72] hover:bg-[#E9EFEC]/50 hover:text-[#2D3732]"
                      }`}
                    >
                      <IconComp className={`w-4 h-4 shrink-0 ${active ? "text-[#4A6B5D]" : "text-[#6B7A72]"}`} />
                      <span className="flex-1 font-be-vietnam font-semibold truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center w-full py-2.5 px-3.5 gap-3 rounded-2xl text-xs font-bold text-[#B8442C] hover:bg-rose-50 transition-all border-0 text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0 text-[#B8442C]" />
                <span className="flex-1 font-be-vietnam font-semibold">Đăng xuất</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Profile Card */}
        <div 
          onClick={() => {
            navigate('/vendor/dashboard');
            setSidebarOpen(false);
          }}
          className="flex items-center p-3 rounded-2xl border transition-all gap-3 cursor-pointer group bg-white border-[#E2E8E4] hover:bg-[#E9EFEC]/40 shadow-xs mt-4"
        >
          <div className="w-9 h-9 bg-[#E9EFEC] group-hover:bg-[#4A6B5D] group-hover:text-white text-[#4A6B5D] rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-fraunces transition-colors">
            ST
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[#2D3732] text-xs font-bold truncate font-fraunces">
              Sơn Trà Trekking
            </span>
            <span className="text-[#6B7A72] text-[11px] font-be-vietnam truncate">
              Đối tác chính thức
            </span>
          </div>
          <button
            type="button"
            title="Đăng xuất"
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }}
            className="text-[#6B7A72] hover:text-[#B8442C] p-1.5 transition-colors border-0 bg-transparent cursor-pointer rounded-lg hover:bg-rose-50 shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ================= RIGHT MAIN CONTENT CONTAINER ================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f7f5f0]/40 min-h-screen">
        
        {/* Mobile Header Bar */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-[#E2E8E4] bg-[#F7F5F0] sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="p-2 bg-white text-[#2D3732] rounded-xl border border-[#E2E8E4] cursor-pointer"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-[#2D3732] text-base font-bold font-fraunces">
              Sơn Trà REloop
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#4A6B5D] text-white flex items-center justify-center font-bold text-xs font-fraunces">
            ST
          </div>
        </div>

        {/* Top Header Bar */}
        <header className="h-[70px] bg-white border-b border-[#E9EFEC] px-6 sm:px-10 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-[#2D3732] text-lg sm:text-[20px] font-bold tracking-tight font-fraunces">
              {isRoutesView ? 'Bản Đồ Tuyến Đường & GPS Sơn Trà' : 'Quản Lý Trải Nghiệm Trekking'}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-[#E9EFEC] text-[#4A6B5D] text-xs font-bold px-3 py-1 rounded-full border border-[#DCE5DF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A6B5D]" />
              {tours.length} Tour đang vận hành
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-40 sm:w-60">
              <input
                type="text"
                placeholder="Tìm trải nghiệm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-9 py-2 rounded-2xl border border-[#E2E8E4] bg-white text-xs text-[#2D3732] placeholder-[#6B7A72] focus:outline-hidden focus:border-[#4A6B5D] transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-[#6B7A72] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="bg-[#4A6B5D] hover:bg-[#3B5A45] !text-white text-xs font-bold py-2.5 px-4 rounded-2xl shadow-sm transition-all flex items-center gap-2 cursor-pointer border-0 shrink-0"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ Tạo Tour Mới</span>
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="p-6 sm:p-10 space-y-8 max-w-7xl w-full mx-auto">
          {isRoutesView ? (
            /* ========================================================================= */
            /* VIEW TUYẾN ĐƯỜNG & GOOGLE MAPS DESIGNER                                  */
            /* ========================================================================= */
            <div className="space-y-6 animate-fade-in font-be-vietnam">
              {/* Banner Tiêu Đề Tuyến & GPS */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-[#E2E8E4] shadow-xs">
                <div>
                  <span className="text-[11px] font-bold text-[#6B7A72] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#4A6B5D]" /> Bản đồ vệ tinh &amp; định tuyến GPS
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold font-fraunces text-[#2D3732] tracking-tight mt-1 m-0">
                    Bản Đồ Tuyến Đường Trekking Google Maps
                  </h2>
                  <p className="text-xs text-[#6B7A72] mt-0.5 m-0">
                    Thiết kế và chấm các trạm Checkpoint GPS trên nền bản đồ Google Maps (Bản đồ đường, Vệ tinh, Địa hình).
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalOpen(true);
                      setWizardStep(2);
                    }}
                    className="px-5 py-3 rounded-2xl bg-[#4A6B5D] hover:bg-[#3B5A45] !text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer border-0"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>+ Vẽ Tuyến Mới Ngay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/vendor/experiences')}
                    className="px-4 py-3 rounded-2xl bg-[#E9EFEC] hover:bg-[#DCE5DF] text-[#4A6B5D] text-xs font-bold transition-all cursor-pointer border border-[#DCE5DF] flex items-center gap-1.5"
                  >
                    <Compass className="w-4 h-4 text-[#4A6B5D]" />
                    <span>Danh sách Tour</span>
                  </button>
                </div>
              </div>

              {/* Lưới 2 cột: Cột trái Bản đồ Google Maps, Cột phải Danh sách các tuyến */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Cột trái: Khung bản đồ Google Maps tương tác */}
                <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-[#E2E8E4] shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E2E8E4]">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#4A6B5D]" />
                      <span className="font-bold font-fraunces text-base text-[#2D3732]">
                        {selectedRouteForView ? selectedRouteForView.title : 'Khung Bản Đồ Tuyến Đường Sơn Trà'}
                      </span>
                    </div>
                    {selectedRouteForView && (
                      <span className="text-xs font-bold text-[#4A6B5D] bg-[#E9EFEC] px-3 py-1 rounded-full border border-[#DCE5DF]">
                        {selectedRouteForView.route?.total_distance_km || selectedRouteForView.total_distance_km || 4.2} km
                      </span>
                    )}
                  </div>

                  {selectedRouteForView ? (
                    <RouteMapPreview
                      coordinates={selectedRouteForView.route?.coordinates || (selectedRouteForView.checkpoints || []).map(cp => [cp.lat || cp.latitude, cp.lng || cp.longitude])}
                      checkpoints={selectedRouteForView.checkpoints || []}
                      height="460px"
                      tourTitle={selectedRouteForView.title}
                    />
                  ) : (
                    <RouteMapPicker
                      checkpoints={tours[0]?.checkpoints || []}
                      onChange={() => {}}
                      height="460px"
                    />
                  )}

                  <div className="flex items-center justify-between text-xs text-[#6B7A72] pt-2">
                    <span>💡 Nhấp vào bất kỳ tuyến nào ở cột bên phải để xem chi tiết lộ trình trên bản đồ.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCreateModalOpen(true);
                        setWizardStep(2);
                      }}
                      className="font-bold text-[#4A6B5D] hover:underline bg-transparent border-0 cursor-pointer p-0"
                    >
                      Mở cửa sổ vẽ tuyến →
                    </button>
                  </div>
                </div>

                {/* Cột phải: Danh sách các tuyến trekking */}
                <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-[#E2E8E4] shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E2E8E4]">
                    <span className="font-bold font-fraunces text-sm text-[#2D3732]">
                      Tuyến Đã Thiết Lập ({tours.length})
                    </span>
                    <span className="text-[11px] text-[#4A6B5D] font-bold">Google Maps</span>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {tours.map((t) => {
                      const isSelected = selectedRouteForView?.id === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedRouteForView(t)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                            isSelected
                              ? 'border-[#4A6B5D] bg-[#E9EFEC]/60 shadow-xs ring-1 ring-[#4A6B5D]/30'
                              : 'border-[#E2E8E4] bg-white hover:border-[#4A6B5D]/50 hover:bg-[#F7F5F0]/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-xs text-[#2D3732] line-clamp-1 font-fraunces">
                              {t.title}
                            </span>
                            <span className="text-[10px] font-bold bg-[#E9EFEC] text-[#4A6B5D] px-2 py-0.5 rounded-full shrink-0">
                              {t.difficulty_label || 'Trung bình'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[#6B7A72]">
                            <span>Cự ly: <strong className="text-[#2D3732]">{t.route?.total_distance_km || t.total_distance_km || 4.5} km</strong></span>
                            <span>•</span>
                            <span>Trạm GPS: <strong className="text-[#4A6B5D]">{t.checkpoints?.length || 2} trạm</strong></span>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-gray-400">
                              {t.route?.start_point ? t.route.start_point.split(',')[0] : 'Sơn Trà'}
                            </span>
                            <span className="text-xs font-bold text-[#4A6B5D]">
                              {isSelected ? '✓ Đang xem' : 'Xem bản đồ →'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
          <>
          {/* Header Action Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-[#E2E8E4] shadow-xs">
            <div>
              <span className="text-[11px] font-bold text-[#6B7A72] uppercase tracking-wider font-be-vietnam flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#4A6B5D]" /> Danh mục sản phẩm đối tác
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-fraunces text-[#2D3732] tracking-tight mt-1">
                Các Tuyến Trekking &amp; Lịch Khởi Hành
              </h2>
              <p className="text-xs text-[#6B7A72] font-be-vietnam mt-0.5">
                Thiết lập thông tin tour, lộ trình GPS và mở các Chuyến Khởi Hành (Slots) cho du khách đặt chỗ.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="px-5 py-3 rounded-2xl bg-[#4A6B5D] hover:bg-[#3B5A45] !text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer border-0"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>+ Đăng ký Tour Mới</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/vendor/bookings')}
                className="px-5 py-3 rounded-2xl bg-[#E9EFEC] hover:bg-[#DCE5DF] text-[#4A6B5D] text-xs font-bold transition-all cursor-pointer border border-[#DCE5DF] flex items-center gap-2"
              >
                <CalendarDays className="w-4 h-4 text-[#4A6B5D]" />
                <span>Xem Lịch Đặt Chỗ</span>
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'Tất cả cấp độ' },
              { id: 'easy', label: 'Dễ (Gia đình)' },
              { id: 'moderate', label: 'Trung bình' },
              { id: 'challenging', label: 'Thử thách' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedDifficulty(f.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  selectedDifficulty === f.id
                    ? 'bg-[#4A6B5D] text-white shadow-xs'
                    : 'bg-white text-[#6B7A72] border border-[#E2E8E4] hover:bg-[#F7F5F0]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Grid Danh sách các Tour */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredTours.map((tour) => {
              const schedules = tour.schedules || [];
              const openSchedules = schedules.filter((s) => s.status === 'open');

              return (
                <div
                  key={tour.id}
                  className="p-6 rounded-3xl bg-white border border-[#E2E8E4] shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-5"
                >
                  {/* Top Tour Info */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={tour.cover_image_url}
                        alt={tour.title}
                        className="w-24 h-24 rounded-2xl object-cover shrink-0 border border-[#E2E8E4]"
                      />
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            tour.difficulty_level === 'easy'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : tour.difficulty_level === 'moderate'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {tour.difficulty_label || 'Trung bình'}
                          </span>
                          <span className="text-xs font-bold font-fraunces text-[#4A6B5D]">
                            {tour.price_formatted || `${tour.price?.toLocaleString('vi-VN')} đ`}
                          </span>
                        </div>

                        <h3 className="font-bold font-fraunces text-base text-[#2D3732] line-clamp-1">
                          {tour.title}
                        </h3>

                        <p className="text-xs text-[#6B7A72] line-clamp-2 font-be-vietnam">
                          {tour.description}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-[#6B7A72] pt-1">
                          <span>⏱ {tour.duration_hours} giờ</span>
                          <span>•</span>
                          <span>👥 Tối đa {tour.max_capacity} khách/đoàn</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">Trích 10% Quỹ ESG</span>
                        </div>
                      </div>
                    </div>

                    {/* Section: Lịch khởi hành của tour */}
                    <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#E2E8E4] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#2D3732] font-be-vietnam flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#4A6B5D]" />
                          Các Chuyến Khởi Hành Đang Mở ({openSchedules.length})
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTourForSchedule(tour);
                            setAddScheduleModalOpen(true);
                          }}
                          className="text-xs font-bold text-[#4A6B5D] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Mở thêm chuyến
                        </button>
                      </div>

                      {schedules.length === 0 ? (
                        <p className="text-xs text-[#86928b] italic py-2 text-center">
                          Chưa có chuyến khởi hành nào. Bấm "Mở thêm chuyến" để nhận khách.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {schedules.map((sch, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-2.5 rounded-xl bg-white border border-[#E2E8E4] flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-[#2D3732] block">
                                  {sch.departure_date} ({sch.time_slot})
                                </span>
                                <span className="text-[11px] text-[#6B7A72]">
                                  HDV: {sch.guide_name}
                                </span>
                              </div>

                              <div className="text-right">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  sch.status === 'open'
                                    ? 'bg-[#E9EFEC] text-[#4A6B5D] border-[#DCE5DF]'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  {sch.status === 'open' ? `Còn ${sch.remaining_slots}/${sch.max_capacity} chỗ` : 'Đã đủ đoàn'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bottom */}
                  <div className="pt-3 border-t border-[#E2E8E4] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setDetailTourModal(tour)}
                      className="text-xs font-bold text-[#6B7A72] hover:text-[#2D3732] flex items-center gap-1 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" /> Xem chi tiết lộ trình
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTourForSchedule(tour);
                          setAddScheduleModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#E9EFEC] text-[#4A6B5D] hover:bg-[#DCE5DF] font-bold text-xs transition-colors cursor-pointer border border-[#DCE5DF]"
                      >
                        + Mở Chuyến Đi
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate('/vendor/bookings')}
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#E2E8E4] hover:bg-[#F7F5F0] text-[#2D3732] font-bold text-xs transition-colors cursor-pointer"
                      >
                        Xem Đơn Đặt
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        ) }
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: FORM WIZARD TẠO TOUR MỚI CHO VENDOR                              */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className={`bg-white rounded-3xl w-full p-6 sm:p-8 shadow-2xl border border-[#E2E8E4] space-y-6 max-h-[92vh] overflow-y-auto font-be-vietnam ${wizardStep === 2 ? 'max-w-4xl' : 'max-w-2xl'}`}>
            
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8E4]">
              <div>
                <span className="text-[10px] font-bold text-[#4A6B5D] uppercase tracking-wider block">
                  Đăng Ký Sản Phẩm Lữ Hành Mới
                </span>
                <h3 className="text-xl font-bold font-fraunces text-[#2D3732] mt-0.5">
                  Tạo Trải Nghiệm Trekking Sơn Trà
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Stepper Progress */}
            <div className="flex items-center justify-between px-2 text-xs font-bold text-[#6B7A72]">
              <span className={wizardStep >= 1 ? 'text-[#4A6B5D]' : ''}>1. Thông tin chung</span>
              <span>→</span>
              <span className={wizardStep >= 2 ? 'text-[#4A6B5D]' : ''}>2. Lộ trình &amp; GPS</span>
              <span>→</span>
              <span className={wizardStep >= 3 ? 'text-[#4A6B5D]' : ''}>3. Chuyến đầu &amp; ESG</span>
            </div>

            <form onSubmit={handleCreateTourSubmit} className="space-y-5">
              
              {/* BƯỚC 1: THÔNG TIN TOUR */}
              {wizardStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="text-xs font-bold text-[#2D3732] block mb-1">Tên trải nghiệm trekking *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Chinh phục Mũi Nghê - Đón Bình Minh Sớm"
                      value={newTourForm.title}
                      onChange={(e) => setNewTourForm({ ...newTourForm, title: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border border-[#E2E8E4] text-xs text-[#2D3732] focus:outline-hidden focus:border-[#4A6B5D]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#2D3732] block mb-1">Mô tả trải nghiệm sinh thái</label>
                    <textarea
                      rows={3}
                      placeholder="Giới thiệu điểm độc đáo, sinh cảnh rừng nguyên sinh, điểm ngắm Voọc..."
                      value={newTourForm.description}
                      onChange={(e) => setNewTourForm({ ...newTourForm, description: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border border-[#E2E8E4] text-xs text-[#2D3732] focus:outline-hidden focus:border-[#4A6B5D]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-[#2D3732] block mb-1">Giá vé gốc / khách (VNĐ) *</label>
                      <input
                        type="number"
                        required
                        step="10000"
                        value={newTourForm.price}
                        onChange={(e) => setNewTourForm({ ...newTourForm, price: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-2xl border border-[#E2E8E4] text-xs text-[#2D3732] focus:outline-hidden focus:border-[#4A6B5D]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#2D3732] block mb-1">Số khách tối đa / đoàn *</label>
                      <input
                        type="number"
                        required
                        min="5"
                        max="30"
                        value={newTourForm.max_capacity}
                        onChange={(e) => setNewTourForm({ ...newTourForm, max_capacity: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-2xl border border-[#E2E8E4] text-xs text-[#2D3732] focus:outline-hidden focus:border-[#4A6B5D]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-[#2D3732] block mb-1">Cấp độ khó</label>
                      <select
                        value={newTourForm.difficulty_level}
                        onChange={(e) => setNewTourForm({ ...newTourForm, difficulty_level: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-2xl border border-[#E2E8E4] text-xs text-[#2D3732] focus:outline-hidden focus:border-[#4A6B5D]"
                      >
                        <option value="easy">Dễ (Phù hợp gia đình & trẻ em)</option>
                        <option value="moderate">Trung bình (Có dốc đá nhẹ)</option>
                        <option value="challenging">Thử thách (Đòi hỏi thể lực cao)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#2D3732] block mb-1">Thời lượng (giờ)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={newTourForm.duration_hours}
                        onChange={(e) => setNewTourForm({ ...newTourForm, duration_hours: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-2xl border border-[#E2E8E4] text-xs text-[#2D3732] focus:outline-hidden focus:border-[#4A6B5D]"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-5 py-2.5 rounded-2xl bg-[#4A6B5D] text-white font-bold text-xs hover:bg-[#3B5A45] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      Tiếp theo: Lộ trình GPS →
                    </button>
                  </div>
                </div>
              )}

              {/* BƯỚC 2: LỘ TRÌNH & CHECKPOINT GPS (TÍCH HỢP GOOGLE MAPS) */}
              {wizardStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-[#2D3732] flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#4A6B5D]" />
                        <span>Vẽ Tuyến Đường Trên Google Maps (Nhấp chuột để đặt trạm):</span>
                      </label>
                      <span className="text-[11px] text-[#6B7A72]">
                        Hỗ trợ Google Maps, Vệ tinh &amp; Địa hình
                      </span>
                    </div>

                    <RouteMapPicker
                      checkpoints={newTourForm.checkpoints || []}
                      onChange={(cps) => {
                        setNewTourForm(prev => ({
                          ...prev,
                          checkpoints: cps,
                          start_point: cps.length > 0 ? cps[0].name : prev.start_point,
                          end_point: cps.length > 1 ? cps[cps.length - 1].name : prev.end_point
                        }));
                      }}
                      onDistanceChange={(dist) => {
                        setNewTourForm(prev => ({ ...prev, total_distance_km: dist }));
                      }}
                      onDetailedRoute={(coords) => {
                        setNewTourForm(prev => ({ ...prev, coordinates: coords }));
                      }}
                      height="360px"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-[#2D3732] block mb-1">Điểm xuất phát tập kết</label>
                      <input
                        type="text"
                        value={newTourForm.start_point}
                        onChange={(e) => setNewTourForm({ ...newTourForm, start_point: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-2xl border border-[#E2E8E4] text-xs text-[#2D3732] focus:outline-hidden focus:border-[#4A6B5D]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#2D3732] block mb-1">Điểm đích hoàn thành</label>
                      <input
                        type="text"
                        value={newTourForm.end_point}
                        onChange={(e) => setNewTourForm({ ...newTourForm, end_point: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-2xl border border-[#E2E8E4] text-xs text-[#2D3732] focus:outline-hidden focus:border-[#4A6B5D]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-[#2D3732] block mb-1">Tổng cự ly (km) - Tự động tính</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newTourForm.total_distance_km}
                        onChange={(e) => setNewTourForm({ ...newTourForm, total_distance_km: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-2xl border border-[#E2E8E4] text-xs text-[#2D3732] focus:outline-hidden focus:border-[#4A6B5D]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#2D3732] block mb-1">Độ cao tăng dần (mét)</label>
                      <input
                        type="number"
                        value={newTourForm.elevation_gain_m}
                        onChange={(e) => setNewTourForm({ ...newTourForm, elevation_gain_m: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-2xl border border-[#E2E8E4] text-xs text-[#2D3732] focus:outline-hidden focus:border-[#4A6B5D]"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B7A72] hover:text-[#2D3732]"
                    >
                      ← Quay lại
                    </button>
                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      className="px-5 py-2.5 rounded-2xl bg-[#4A6B5D] text-white font-bold text-xs hover:bg-[#3B5A45] transition-colors cursor-pointer"
                    >
                      Tiếp theo: Chuyến Khởi Hành →
                    </button>
                  </div>
                </div>
              )}

              {/* BƯỚC 3: MỞ CHUYẾN KHỞI HÀNH ĐẦU TIÊN & CAM KẾT 10% ESG */}
              {wizardStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-[#E9EFEC] border border-[#DCE5DF] space-y-2">
                    <span className="font-bold font-fraunces text-xs text-[#4A6B5D] block">
                      Thiết Lập Chuyến Khởi Hành Đầu Tiên Cho Tour:
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[11px] text-[#2D3732] font-semibold block mb-1">Ngày đi cụ thể</label>
                        <input
                          type="date"
                          value={newTourForm.initial_date}
                          onChange={(e) => setNewTourForm({ ...newTourForm, initial_date: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2E8E4] text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-[#2D3732] font-semibold block mb-1">Khung giờ đón</label>
                        <select
                          value={newTourForm.initial_time}
                          onChange={(e) => setNewTourForm({ ...newTourForm, initial_time: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2E8E4] text-xs"
                        >
                          <option value="06:00 - 10:30">06:00 - 10:30 (Sáng sớm)</option>
                          <option value="07:30 - 11:30">07:30 - 11:30 (Ban mai)</option>
                          <option value="14:30 - 18:30">14:30 - 18:30 (Hoàng hôn)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Cam kết trích 10% Quỹ Bảo Tồn */}
                  <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold font-fraunces">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Cam Kết Trích 10% Quỹ Bảo Tồn Bán Đảo Sơn Trà</span>
                    </div>
                    <p className="text-emerald-700 text-[11px] leading-relaxed">
                      Đối tác đồng ý trích 10% từ mỗi vé tour bán ra ({((Number(newTourForm.price) * 0.1)).toLocaleString('vi-VN')} đ/vé) đóng góp trực tiếp vào Quỹ Bảo Tồn & Cứu Hộ Voọc Chà Vá Chân Nâu do Ban Quản Lý Sơn Trà giám sát.
                    </p>
                  </div>

                  <div className="pt-3 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B7A72] hover:text-[#2D3732]"
                    >
                      ← Quay lại
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-2xl bg-[#4A6B5D] text-white font-bold text-xs hover:bg-[#3B5A45] transition-colors cursor-pointer shadow-md flex items-center gap-2"
                    >
                      <Check className="w-4 h-4 text-white" />
                      <span>Xác Nhận &amp; Xuất Bản Tour</span>
                    </button>
                  </div>
                </div>
              )}

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MỞ THÊM CHUYẾN KHỞI HÀNH (DEPARTURE SLOT) CHO TOUR CÓ SẴN          */}
      {/* ========================================================================= */}
      {addScheduleModalOpen && selectedTourForSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#E2E8E4] space-y-5 font-be-vietnam">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8E4]">
              <div>
                <span className="text-[10px] font-bold text-[#4A6B5D] uppercase tracking-wider block">
                  Mở Thêm Lịch Khởi Hành
                </span>
                <h3 className="text-base font-bold font-fraunces text-[#2D3732] mt-0.5 line-clamp-1">
                  {selectedTourForSchedule.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddScheduleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddScheduleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#2D3732] block mb-1">Ngày khởi hành cụ thể *</label>
                <input
                  type="date"
                  required
                  value={newScheduleForm.departure_date}
                  onChange={(e) => setNewScheduleForm({ ...newScheduleForm, departure_date: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#E2E8E4] text-xs text-[#2D3732] focus:outline-hidden focus:border-[#4A6B5D]"
                />
              </div>

              <div>
                <label className="font-bold text-[#2D3732] block mb-1">Khung giờ tập kết &amp; xuất phát</label>
                <select
                  value={newScheduleForm.time_slot}
                  onChange={(e) => setNewScheduleForm({ ...newScheduleForm, time_slot: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#E2E8E4] text-xs text-[#2D3732] focus:outline-hidden focus:border-[#4A6B5D]"
                >
                  <option value="06:00 - 10:30">06:00 - 10:30 (Sáng sớm đón bình minh)</option>
                  <option value="07:30 - 11:30">07:30 - 11:30 (Ban mai dưới tán rừng già)</option>
                  <option value="14:30 - 18:30">14:30 - 18:30 (Chiều ngắm hoàng hôn)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#2D3732] block mb-1">Số chỗ tối đa</label>
                  <input
                    type="number"
                    min="5"
                    max="30"
                    value={newScheduleForm.max_capacity}
                    onChange={(e) => setNewScheduleForm({ ...newScheduleForm, max_capacity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8E4]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2D3732] block mb-1">Giá vé chuyến (VNĐ)</label>
                  <input
                    type="number"
                    step="10000"
                    value={newScheduleForm.price}
                    onChange={(e) => setNewScheduleForm({ ...newScheduleForm, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8E4]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#2D3732] block mb-1">Hướng dẫn viên phụ trách (Có thẻ BQL)</label>
                <select
                  value={newScheduleForm.guide_name}
                  onChange={(e) => setNewScheduleForm({ ...newScheduleForm, guide_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8E4]"
                >
                  <option value="Nguyễn Tuấn Anh (Thẻ BQL #G08)">Nguyễn Tuấn Anh (Thẻ BQL #G08)</option>
                  <option value="Trần Minh Đức (Thẻ BQL #G12)">Trần Minh Đức (Thẻ BQL #G12)</option>
                  <option value="Lê Hoàng Nam (Thẻ BQL #G05)">Lê Hoàng Nam (Thẻ BQL #G05)</option>
                  <option value="Võ Quốc Huy (Thẻ BQL #G15)">Võ Quốc Huy (Thẻ BQL #G15)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-[#4A6B5D] text-white font-bold hover:bg-[#3B5A45] shadow-xs cursor-pointer"
                >
                  Mở Chuyến Ngay
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: XEM CHI TIẾT LỘ TRÌNH TOUR                                       */}
      {/* ========================================================================= */}
      {detailTourModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-[#E2E8E4] space-y-4 font-be-vietnam max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8E4]">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#4A6B5D]" />
                <h3 className="font-bold font-fraunces text-base text-[#2D3732] m-0">
                  {detailTourModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailTourModal(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer border-0"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Bản đồ Google Maps xem trước lộ trình */}
              <div className="rounded-2xl overflow-hidden border border-[#E2E8E4]">
                <RouteMapPreview
                  coordinates={detailTourModal.route?.coordinates || (detailTourModal.checkpoints || []).map(cp => [cp.lat || cp.latitude, cp.lng || cp.longitude])}
                  checkpoints={detailTourModal.checkpoints || []}
                  height="260px"
                  tourTitle={detailTourModal.title}
                />
              </div>

              <p className="text-[#6B7A72] leading-relaxed m-0">{detailTourModal.description}</p>
              
              <div className="p-3.5 rounded-2xl bg-[#F7F5F0] space-y-2">
                <span className="font-bold text-[#4A6B5D] block">Thông số lộ trình:</span>
                <div className="grid grid-cols-2 gap-2 text-[#6B7A72]">
                  <span>Cự ly: {detailTourModal.route?.total_distance_km || 4.2} km</span>
                  <span>Thời lượng: {detailTourModal.duration_hours} giờ</span>
                  <span>Điểm đầu: {detailTourModal.route?.start_point || 'Chân núi'}</span>
                  <span>Độ cao: +{detailTourModal.route?.elevation_gain_m || 300} m</span>
                </div>
              </div>

              {detailTourModal.checkpoints && detailTourModal.checkpoints.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-[#2D3732] block">Các Checkpoint GPS trên tuyến ({detailTourModal.checkpoints.length} trạm):</span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {detailTourModal.checkpoints.map((cp, cIdx) => (
                      <div key={cIdx} className="p-2.5 rounded-xl border border-[#E2E8E4] bg-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#E9EFEC] text-[#4A6B5D] font-bold text-[10px] flex items-center justify-center shrink-0">
                          {cp.order_index}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-[#2D3732] block truncate">{cp.name}</span>
                          <span className="text-[10px] text-[#86928b] block truncate">{cp.desc}</span>
                        </div>
                        {cp.lat && cp.lng && (
                          <span className="text-[10px] text-gray-400 font-mono shrink-0">
                            {Number(cp.lat).toFixed(4)}, {Number(cp.lng).toFixed(4)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailTourModal(null)}
                className="px-5 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer border-0"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default VendorExperiencesPage;

