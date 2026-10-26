import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  Eye, 
  X, 
  Check, 
  RefreshCw, 
  ExternalLink,
  Download,
  AlertTriangle,
  Award,
  Users,
  Compass,
  Maximize2,
  FileCheck,
  CheckCheck,
  Copy,
  Lock,
  Key,
  EyeOff
} from 'lucide-react';
import { vendorApplicationService, formatDisplayId } from '../../services/vendorApplicationService';

export const VendorApprovalsPage = () => {
  const [activeTab, setActiveTab] = useState('pending_approval');
  const [searchQuery, setSearchQuery] = useState('');
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, need_info: 0, rejected: 0 });
  const [selectedApp, setSelectedApp] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Tab bên trong Modal Thẩm định: 'profile' | 'documents' | 'esg'
  const [dossierTab, setDossierTab] = useState('profile');
  
  // States cho hành động thẩm định
  const [actionType, setActionType] = useState(null); // 'approve' | 'need_info' | 'reject'
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // States cho Modal bàn giao tài khoản đối tác sau khi phê duyệt
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [approvedVendorData, setApprovedVendorData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState(null); // 'email' | 'password' | 'all'
  const [credentialTab, setCredentialTab] = useState('credentials'); // 'credentials' | 'letter'

  // Tải dữ liệu từ service (Hỗ trợ gọi Backend API và fallback)
  const loadData = async () => {
    try {
      const list = await vendorApplicationService.getAll({
        status: activeTab,
        search: searchQuery
      });
      setApplications(list);
      const st = await vendorApplicationService.getStats();
      setStats(st);
    } catch (err) {
      console.error('Lỗi tải danh sách hồ sơ:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, searchQuery]);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenDetail = (app) => {
    setSelectedApp(app);
    setDrawerOpen(true);
    setDossierTab('profile');
    setActionType(null);
    setActionReason('');
  };

  const handleCloseDetail = () => {
    setDrawerOpen(false);
    setSelectedApp(null);
    setActionType(null);
    setActionReason('');
  };

  // Thực hiện phê duyệt / từ chối / yêu cầu bổ sung
  const handleExecuteAction = async (status) => {
    if ((status === 'reject' || status === 'need_info') && !actionReason.trim()) {
      alert('Vui lòng nhập lý do / ghi chú cụ thể để gửi cho đơn vị đối tác!');
      return;
    }

    setActionLoading(true);
    try {
      const adminName = localStorage.getItem('user_name') || 'Cán bộ BQL Sơn Trà';
      const updated = await vendorApplicationService.updateStatus(
        selectedApp.id,
        status,
        actionReason,
        adminName
      );

      setSelectedApp(updated);
      await loadData();
      setActionLoading(false);
      setActionType(null);
      setActionReason('');

      if (status === 'approved') {
        showToast(`Đã phê duyệt đối tác "${updated.brand_name}" thành công!`);
        setDrawerOpen(false);
        setApprovedVendorData(updated);
        setCredentialsModalOpen(true);
      } else if (status === 'need_info') {
        showToast(`Đã gửi yêu cầu bổ sung hồ sơ tới email ${updated.email}!`, 'warning');
      } else if (status === 'rejected') {
        showToast(`Đã từ chối hồ sơ đối tác "${updated.brand_name}".`, 'info');
      }
    } catch (err) {
      console.error('Lỗi khi thẩm định:', err);
      setActionLoading(false);
      showToast('Có lỗi xảy ra khi cập nhật hồ sơ.', 'warning');
    }
  };

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleCopyAllCredentials = () => {
    if (!approvedVendorData) return;
    const pwd = approvedVendorData.initial_password || 'Vendor@2026';
    const text = `=== THÔNG TIN BÀN GIAO TÀI KHOẢN ĐỐI TÁC SƠN TRÀ RELOOP ===\nĐơn vị: ${approvedVendorData.brand_name}\nMã hồ sơ: ${formatDisplayId(approvedVendorData.display_id || approvedVendorData.id)}\nEmail đăng nhập: ${approvedVendorData.email}\nMật khẩu khởi tạo: ${pwd}\nCổng đăng nhập B2B: ${window.location.origin}/partner/login\nTrạng thái: đã kích hoạt\n* Ghi chú: vui lòng đổi mật khẩu ở lần đầu đăng nhập.`;
    navigator.clipboard.writeText(text);
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleResetData = async () => {
    if (window.confirm('Khôi phục danh sách hồ sơ đối tác về dữ liệu mẫu ban đầu?')) {
      vendorApplicationService.resetToDefault();
      await loadData();
      showToast('Đã khôi phục dữ liệu mẫu thành công!');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Chờ thẩm định</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Đã phê duyệt</span>
          </span>
        );
      case 'need_info':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <AlertCircle className="w-3 h-3 text-blue-600" />
            <span>Yêu cầu bổ sung</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Đã từ chối</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="m3-app-page min-w-0 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-2xl shadow-lg border text-xs font-bold flex items-center gap-2.5 ${
            toastMessage.type === 'success' 
              ? 'bg-[#2F5D4A] !text-white border-[#254B3C]'
              : toastMessage.type === 'warning'
              ? 'bg-amber-600 !text-white border-amber-700'
              : 'bg-rose-700 !text-white border-rose-800'
          }`}>
            <Sparkles className="w-4 h-4 shrink-0 text-white" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* TOP BANNER */}
      <div className="bg-white border border-[#C5CCC7] rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#DCEBE3] text-[#2F5D4A] rounded-lg text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Thẩm định pháp lý & đối tác B2B</span>
          </div>
          <h1 className="text-2xl font-bold font-fraunces text-[#191C1A]">
            Kiểm duyệt hồ sơ đối tác
          </h1>
          <p className="text-xs text-[#4A514C] mt-1">
            Xét duyệt hồ sơ pháp nhân, giấy phép kinh doanh lữ hành và cam kết trích 10% quỹ bảo tồn ESG Sơn Trà.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetData}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#C5CCC7] hover:bg-gray-50 !text-[#191C1A] text-xs font-semibold rounded-xl transition-all cursor-pointer"
            title="Khôi phục danh sách mẫu ban đầu"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Dữ liệu mẫu</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => setActiveTab('pending_approval')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'pending_approval' 
              ? 'bg-amber-50/70 border-amber-300 shadow-2xs' 
              : 'bg-white border-[#C5CCC7] hover:border-amber-300'
          }`}
        >
          <div className="flex justify-between items-center text-xs font-semibold text-amber-800 mb-1">
            <span>Chờ thẩm định</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold font-fraunces text-[#191C1A]">{stats.pending}</p>
          <p className="text-[11px] text-amber-700 mt-0.5">Cần xử lý trong 24h</p>
        </div>

        <div 
          onClick={() => setActiveTab('approved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'approved' 
              ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs' 
              : 'bg-white border-[#C5CCC7] hover:border-emerald-300'
          }`}
        >
          <div className="flex justify-between items-center text-xs font-semibold text-emerald-800 mb-1">
            <span>Đã phê duyệt</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-fraunces text-[#191C1A]">{stats.approved}</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Đang hoạt động</p>
        </div>

        <div 
          onClick={() => setActiveTab('need_info')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'need_info' 
              ? 'bg-blue-50/70 border-blue-300 shadow-2xs' 
              : 'bg-white border-[#C5CCC7] hover:border-blue-300'
          }`}
        >
          <div className="flex justify-between items-center text-xs font-semibold text-blue-800 mb-1">
            <span>Yêu cầu bổ sung</span>
            <AlertCircle className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-fraunces text-[#191C1A]">{stats.need_info}</p>
          <p className="text-[11px] text-blue-700 mt-0.5">Chờ đối tác phản hồi</p>
        </div>

        <div 
          onClick={() => setActiveTab('rejected')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'rejected' 
              ? 'bg-rose-50/70 border-rose-300 shadow-2xs' 
              : 'bg-white border-[#C5CCC7] hover:border-rose-300'
          }`}
        >
          <div className="flex justify-between items-center text-xs font-semibold text-rose-800 mb-1">
            <span>Đã từ chối</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold font-fraunces text-[#191C1A]">{stats.rejected}</p>
          <p className="text-[11px] text-rose-700 mt-0.5">Không đạt điều kiện</p>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-[#C5CCC7] p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F2F5F1] p-1.5 rounded-xl border border-[#C5CCC7]">
            {[
              { key: 'all', label: `Tất cả (${stats.total})` },
              { key: 'pending_approval', label: `Chờ duyệt (${stats.pending})` },
              { key: 'approved', label: `Đã duyệt (${stats.approved})` },
              { key: 'need_info', label: `Yêu cầu bổ sung (${stats.need_info})` },
              { key: 'rejected', label: `Từ chối (${stats.rejected})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-[#2F5D4A] !text-white shadow-2xs'
                    : 'bg-transparent !text-[#4A514C] hover:!text-[#191C1A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-2 px-3.5 py-2 bg-[#F2F5F1] border border-[#C5CCC7] rounded-xl w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên doanh nghiệp, GPKD, hotline..."
              className="bg-transparent text-xs text-[#191C1A] focus:outline-none w-full"
            />
          </div>
        </div>

        {/* TABLE APPLICATIONS */}
        <div className="overflow-x-auto">
          {applications.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <Building2 className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-bold text-[#191C1A]">Không tìm thấy hồ sơ nào</p>
              <p className="text-xs text-[#4A514C]">Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF7] text-[#4A514C] font-bold text-[10px] tracking-wider border-b border-[#C5CCC7]">
                <tr>
                  <th className="p-3.5">Mã & Doanh nghiệp</th>
                  <th className="p-3.5">Loại hình / Địa bàn</th>
                  <th className="p-3.5">Người đại diện / Liên hệ</th>
                  <th className="p-3.5">Ngày nộp</th>
                  <th className="p-3.5">Trạng thái BQL</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C5CCC7]">
                {applications.map((app) => (
                  <tr 
                    key={app.id} 
                    onClick={() => handleOpenDetail(app)}
                    className="hover:bg-[#F8FAF7] transition-colors cursor-pointer group"
                    title="Bấm để xem hồ sơ và giấy tờ chi tiết"
                  >
                    {/* Brand & ID */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#DCEBE3] border border-[#C5CCC7] flex items-center justify-center font-bold text-xs text-[#2F5D4A] shrink-0 group-hover:scale-105 transition-transform">
                          {app.brand_name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-[#191C1A] group-hover:text-[#2F5D4A] transition-colors">
                              {app.brand_name}
                            </span>
                            {app.is_new && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-500 text-white animate-pulse">
                                MỚI
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#4A514C] font-mono mt-0.5">
                            {formatDisplayId(app.display_id || app.id)} · GPKD: {app.business_license_code || 'Chưa cung cấp'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Service & Area */}
                    <td className="p-3.5">
                      <p className="font-semibold text-[#191C1A]">{app.service_type}</p>
                      <p className="text-[11px] text-[#4A514C] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#2F5D4A]" />
                        <span>{app.operating_area}</span>
                      </p>
                    </td>

                    {/* Contact */}
                    <td className="p-3.5">
                      <p className="font-medium text-[#191C1A] flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{app.hotline || 'N/A'}</span>
                      </p>
                      <p className="text-[11px] text-[#4A514C] flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span>{app.email || 'N/A'}</span>
                      </p>
                    </td>

                    {/* Date */}
                    <td className="p-3.5 text-[#4A514C]">
                      {new Date(app.submitted_at).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                      <span className="block text-[10px] text-gray-400">
                        {new Date(app.submitted_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-3.5">
                      {getStatusBadge(app.status)}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(app);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#DCEBE3] hover:bg-[#DCEBE3] text-[#2F5D4A] font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem hồ sơ</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* FULL-FEATURED DOSSIER & DOCUMENT INSPECTION MODAL */}
      {drawerOpen && selectedApp && (
        <div role="dialog" aria-modal="true" aria-label="Chi tiết hồ sơ đối tác" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs motion-backdrop-enter">
          <div className="bg-white rounded-3xl border border-[#C5CCC7] max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden motion-modal-enter">
            
            {/* 1. MODAL TOP HEADER */}
            <div className="px-6 py-4 border-b border-[#C5CCC7] flex items-center justify-between bg-[#F8FAF7]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#2F5D4A] !text-white flex items-center justify-center font-bold text-base shadow-xs">
                  {selectedApp.brand_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold font-fraunces text-[#191C1A]">
                      {selectedApp.brand_name}
                    </h2>
                    {getStatusBadge(selectedApp.status)}
                  </div>
                  <p className="text-[11px] text-[#4A514C] font-mono mt-0.5">
                    Mã hồ sơ: <span className="font-bold text-[#2F5D4A]">{formatDisplayId(selectedApp.display_id || selectedApp.id)}</span> · Nộp: {new Date(selectedApp.submitted_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseDetail}
                aria-label="Đóng chi tiết hồ sơ đối tác"
                className="w-12 h-12 inline-flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. DOSSIER NAVIGATION TABS */}
            <div className="px-6 pt-3 bg-white border-b border-[#C5CCC7] flex gap-2 overflow-x-auto">
              <button
                onClick={() => setDossierTab('profile')}
                className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  dossierTab === 'profile'
                    ? 'border-[#2F5D4A] text-[#2F5D4A]'
                    : 'border-transparent text-gray-500 hover:text-[#191C1A]'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>1. Hồ sơ doanh nghiệp & năng lực</span>
              </button>

              <button
                onClick={() => setDossierTab('documents')}
                className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  dossierTab === 'documents'
                    ? 'border-[#2F5D4A] text-[#2F5D4A]'
                    : 'border-transparent text-gray-500 hover:text-[#191C1A]'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                <span>2. Giấy phép kinh doanh (trình xem GPKD)</span>
              </button>

              <button
                onClick={() => setDossierTab('esg')}
                className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  dossierTab === 'esg'
                    ? 'border-[#2F5D4A] text-[#2F5D4A]'
                    : 'border-transparent text-gray-500 hover:text-[#191C1A]'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>3. Cam kết bảo tồn & quỹ ESG 10%</span>
              </button>
            </div>

            {/* 3. MODAL SCROLLABLE BODY */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-[#191C1A]">
              
              {/* Notice if rejection reason exists */}
              {selectedApp.rejection_reason && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900">Ghi chú thẩm định từ BQL:</p>
                    <p className="text-amber-800 mt-0.5 leading-relaxed">{selectedApp.rejection_reason}</p>
                  </div>
                </div>
              )}

              {/* TAB 1: THÔNG TIN DOANH NGHIỆP & NĂNG LỰC */}
              {dossierTab === 'profile' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* General Legal Info */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[#2F5D4A] tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      <span>Thông tin pháp nhân doanh nghiệp</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#F8FAF7] p-4.5 rounded-2xl border border-[#C5CCC7]">
                      <div>
                        <span className="text-[#4A514C]">Tên doanh nghiệp chính thức:</span>
                        <p className="font-bold text-sm text-[#191C1A] mt-0.5">{selectedApp.brand_name}</p>
                      </div>

                      <div>
                        <span className="text-[#4A514C]">Người đại diện theo pháp luật:</span>
                        <p className="font-bold text-sm text-[#191C1A] mt-0.5">
                          {selectedApp.legal_representative || 'Chưa cập nhật'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[#4A514C]">Mã số thuế / GPKD:</span>
                        <p className="font-mono font-bold text-emerald-800 mt-0.5">
                          {selectedApp.tax_code || selectedApp.business_license_code}
                        </p>
                      </div>

                      <div>
                        <span className="text-[#4A514C]">Cơ quan cấp phép:</span>
                        <p className="font-medium text-[#191C1A] mt-0.5">
                          {selectedApp.issued_by || 'Sở Kế hoạch và Đầu tư TP. Đà Nẵng'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[#4A514C]">Hotline đại diện:</span>
                        <p className="font-bold text-[#191C1A] mt-0.5 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{selectedApp.hotline || 'Chưa cung cấp'}</span>
                        </p>
                      </div>

                      <div>
                        <span className="text-[#4A514C]">Email nhận tài khoản cổng đối tác:</span>
                        <p className="font-bold text-[#191C1A] mt-0.5 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span>{selectedApp.email}</span>
                        </p>
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-[#4A514C]">Phạm vi ngành nghề kinh doanh:</span>
                        <p className="font-medium text-[#191C1A] mt-0.5">
                          {selectedApp.scope_of_business || 'Kinh doanh dịch vụ lữ hành, tour du lịch sinh thái & thể thao mạo hiểm'}
                        </p>
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-[#4A514C]">Giới thiệu tóm tắt đơn vị:</span>
                        <p className="text-gray-700 mt-0.5 leading-relaxed bg-white p-3 rounded-xl border border-[#C5CCC7]">
                          {selectedApp.description || 'Chưa có mô tả chi tiết.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Operational Capacity */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[#2F5D4A] tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4" />
                      <span>Năng lực tổ chức và đội ngũ thực địa</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 rounded-2xl bg-[#F8FAF7] border border-[#C5CCC7] space-y-1">
                        <span className="text-[#4A514C]">Kinh nghiệm lữ hành:</span>
                        <p className="text-lg font-bold font-fraunces text-[#2F5D4A]">
                          {selectedApp.experience_years || 4} Năm
                        </p>
                        <p className="text-[10px] text-gray-400">Tổ chức trekking Sơn Trà</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#F8FAF7] border border-[#C5CCC7] space-y-1">
                        <span className="text-[#4A514C]">Hướng dẫn viên (Guide):</span>
                        <p className="text-lg font-bold font-fraunces text-[#2F5D4A]">
                          {selectedApp.guides_count || 5} Hướng dẫn viên
                        </p>
                        <p className="text-[10px] text-gray-400">Đăng ký cấp thẻ tuần tra BQL</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#F8FAF7] border border-[#C5CCC7] space-y-1">
                        <span className="text-[#4A514C]">Địa bàn tác nghiệp:</span>
                        <p className="text-xs font-bold text-[#191C1A] truncate">
                          {selectedApp.operating_area}
                        </p>
                        <p className="text-[10px] text-emerald-700 font-semibold">Tuyến rừng được cấp phép</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TRÌNH XEM GIẤY PHÉP KINH DOANH (DOCUMENT VIEWER) */}
              {dossierTab === 'documents' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-[#2F5D4A] tracking-wider flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4" />
                        <span>Trình xem giấy tờ & đối soát hồ sơ pháp lý</span>
                      </h3>
                      <p className="text-[11px] text-[#4A514C] mt-0.5">
                        Kiểm tra con dấu đỏ, mã số đăng ký kinh doanh và phạm vi cấp phép lữ hành sinh thái.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert('Đang tải file đính kèm chất lượng cao về máy cán bộ BQL...')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#C5CCC7] hover:bg-gray-50 !text-[#191C1A] text-xs font-semibold rounded-xl cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải file PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* SIMULATED OFFICIAL A4 BUSINESS LICENSE PREVIEW */}
                  <div className="bg-[#F8FAF7] border-2 border-[#C5CCC7] rounded-3xl p-6 sm:p-10 shadow-md max-w-2xl mx-auto space-y-6 text-[#191C1A] relative overflow-hidden">
                    {/* Watermark */}
                    <div className="absolute right-6 bottom-6 opacity-10 pointer-events-none select-none font-fraunces text-8xl font-black text-rose-900 rotate-[-15deg]">
                      SƠN TRÀ
                    </div>

                    {/* Official National Header */}
                    <div className="text-center space-y-1 border-b border-[#ded7c4] pb-4">
                      <p className="text-xs font-extrabold tracking-widest text-[#191C1A]">
                        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                      </p>
                      <p className="text-[11px] font-bold text-gray-600">
                        Độc lập – Tự do – Hạnh phúc
                      </p>
                      <div className="w-24 h-0.5 bg-[#8b3a2b] mx-auto mt-2" />
                    </div>

                    {/* Document Title */}
                    <div className="text-center space-y-1">
                      <h4 className="text-base sm:text-lg font-black font-fraunces tracking-wide text-[#7a221b]">
                        GIẤY CHỨNG NHẬN ĐĂNG KÝ DOANH NGHIỆP
                      </h4>
                      <p className="text-[11px] font-semibold text-gray-500">
                        CÔNG TY TNHH / DOANH NGHIỆP LỮ HÀNH DU LỊCH SINH THÁI
                      </p>
                      <p className="text-xs font-mono font-bold text-[#191C1A] pt-1">
                        Mã số doanh nghiệp: {selectedApp.tax_code || selectedApp.business_license_code}
                      </p>
                    </div>

                    {/* License Details Grid */}
                    <div className="space-y-3 text-xs leading-relaxed border-y border-[#ded7c4] py-4">
                      <div className="flex">
                        <span className="w-36 text-gray-600 shrink-0 font-medium">1. Tên doanh nghiệp:</span>
                        <span className="font-extrabold text-[#191C1A]">{selectedApp.brand_name}</span>
                      </div>
                      <div className="flex">
                        <span className="w-36 text-gray-600 shrink-0 font-medium">2. Người đại diện PL:</span>
                        <span className="font-bold text-[#191C1A]">{selectedApp.legal_representative || 'Nguyễn Văn Hùng'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-36 text-gray-600 shrink-0 font-medium">3. Trụ sở tác nghiệp:</span>
                        <span className="text-[#191C1A]">{selectedApp.operating_area}, TP. Đà Nẵng</span>
                      </div>
                      <div className="flex">
                        <span className="w-36 text-gray-600 shrink-0 font-medium">4. Ngành nghề chính:</span>
                        <span className="text-[#191C1A]">{selectedApp.scope_of_business || 'Dịch vụ lữ hành, hướng dẫn du lịch mạo hiểm trekking rừng bán đảo'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-36 text-gray-600 shrink-0 font-medium">5. Hotline / Email:</span>
                        <span className="text-[#191C1A]">{selectedApp.hotline} · {selectedApp.email}</span>
                      </div>
                    </div>

                    {/* Official Stamp & Sign Off */}
                    <div className="pt-2 flex justify-between items-end">
                      <div className="text-[10px] text-gray-500">
                        <p>File lưu trữ: <b>{selectedApp.license_file_name}</b></p>
                        <p>Trạng thái kiểm tra: <b className="text-emerald-700">Hợp lệ và còn hiệu lực</b></p>
                      </div>

                      <div className="text-center space-y-1 relative pr-4">
                        <p className="text-[10px] italic text-gray-600">Đà Nẵng, ngày {selectedApp.issued_date || '15 tháng 03 năm 2021'}</p>
                        <p className="text-xs font-bold text-[#191C1A]">Cơ quan đăng ký kinh doanh</p>
                        
                        {/* Red Seal Stamp Simulation */}
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-rose-600 text-rose-700 flex flex-col items-center justify-center text-[9px] font-black mx-auto rotate-[-8deg] shadow-xs bg-rose-50/40">
                          <span>SỞ KH&ĐT</span>
                          <span className="text-[8px]">ĐÀ NẴNG</span>
                          <span>★ ĐÃ ĐỐI SOÁT ★</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Logo Brand Asset Inspection Card */}
                  <div className="bg-[#F8FAF7] border border-[#C5CCC7] rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#DCEBE3] border border-[#C5CCC7] flex items-center justify-center font-bold text-sm text-[#2F5D4A]">
                        {selectedApp.brand_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[#191C1A]">Logo đại diện: {selectedApp.logo_file_name}</p>
                        <p className="text-[11px] text-[#4A514C]">Định dạng PNG/JPG chuẩn hiển thị B2B và danh sách tour</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-lg flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Đạt chuẩn</span>
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 3: CAM KẾT BẢO TỒN ESG & QUỸ 10% */}
              {dossierTab === 'esg' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-[#2F5D4A] tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Cam kết chuẩn mực sinh thái và Quỹ bảo tồn bán đảo</span>
                    </h3>
                    <p className="text-[11px] text-[#4A514C]">
                      Mọi đơn vị đối tác tham gia nền tảng Son Tra ReLoop bắt buộc tuân thủ 2 điều khoản cốt lõi sau:
                    </p>
                  </div>

                  {/* ESG Card 1 */}
                  <div className="p-5 rounded-2xl bg-[#DCEBE3] border border-[#C5CCC7] space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#2F5D4A] text-white flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCheck className="w-5 h-5 text-white" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-[#2F5D4A]">
                          1. Cơ chế trích tự động 10% quỹ bảo tồn và cứu hộ bán đảo Sơn Trà
                        </h4>
                        <p className="text-xs text-[#4A514C] leading-relaxed">
                          Doanh nghiệp cam kết đồng ý với cơ chế đối soát tự động của hệ thống (split-payment qua VNPay/Stripe): mỗi đơn đặt tour hoàn tất sẽ tự động chuyển <b>10%</b> giá trị vào quỹ bảo tồn để tài trợ thức ăn cho voọc chà vá, trồng rừng bản địa và trang bị thiết bị tuần tra.
                        </p>
                      </div>
                    </div>
                    <div className="pl-11 flex items-center gap-2 text-[11px] font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-[#2F5D4A]" />
                      <span>Đã ký cam kết điện tử khi nộp hồ sơ.</span>
                    </div>
                  </div>

                  {/* ESG Card 2 */}
                  <div className="p-5 rounded-2xl bg-[#F8FAF7] border border-[#C5CCC7] space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Compass className="w-5 h-5 text-[#2F5D4A]" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-[#191C1A]">
                          2. Quy chuẩn an toàn rừng và không rác thải (Zero Waste)
                        </h4>
                        <p className="text-xs text-[#4A514C] leading-relaxed">
                          - Cam kết không sử dụng loa kéo công suất lớn gây ảnh hưởng sinh quyển.<br/>
                          - Tuyệt đối không cho du khách cho khỉ/voọc ăn thức ăn lạ.<br/>
                          - Đội ngũ hướng dẫn viên có trách nhiệm thu gom 100% rác sinh hoạt phát sinh và cân rác Eco-Trash tại các trạm checkpoint tuần tra.
                        </p>
                      </div>
                    </div>
                    <div className="pl-11 flex items-center gap-2 text-[11px] font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-[#2F5D4A]" />
                      <span>Đã thông qua quy chuẩn kiểm định BQL.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. KHUNG NHẬP LÝ DO (KHI BẤM TỪ CHỐI HOẶC YÊU CẦU BỔ SUNG) */}
              {actionType && (
                <div className="p-4 rounded-2xl border bg-gray-50 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#191C1A]">
                      {actionType === 'reject' 
                        ? 'Nhập lý do từ chối hồ sơ đối tác:' 
                        : 'Nhập nội dung yêu cầu bổ sung thông tin:'}
                    </span>
                    <button 
                      onClick={() => setActionType(null)}
                      className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                    >
                      Hủy thao tác
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder={
                      actionType === 'reject'
                        ? 'Ví dụ: Giấy phép kinh doanh đã hết hạn hoặc không có ngành nghề lữ hành du lịch sinh thái...'
                        : 'Ví dụ: Vui lòng cung cấp bản scan màu có dấu mộc rõ ràng và chứng chỉ của các hướng dẫn viên...'
                    }
                    className="w-full p-3 rounded-xl border border-[#C5CCC7] bg-white text-xs focus:outline-none focus:border-[#2F5D4A] resize-none"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleExecuteAction(actionType)}
                      disabled={actionLoading}
                      className={`px-4 py-2 rounded-xl text-xs font-bold !text-white transition-all cursor-pointer ${
                        actionType === 'reject' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {actionLoading ? 'Đang lưu...' : 'Xác nhận gửi phản hồi'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. MODAL BOTTOM ACTIONS BAR */}
            <div className="px-6 py-4 bg-[#F8FAF7] border-t border-[#C5CCC7] flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCloseDetail}
                className="px-4 py-2.5 rounded-xl border border-[#C5CCC7] bg-white hover:bg-gray-50 !text-[#191C1A] text-xs font-bold transition-all cursor-pointer"
              >
                Đóng hồ sơ
              </button>

              <div className="flex items-center gap-2">
                {/* Nút Yêu cầu bổ sung */}
                <button
                  type="button"
                  onClick={() => {
                    setActionType('need_info');
                    setDossierTab('profile');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Yêu cầu bổ sung
                </button>

                {/* Nút Từ chối */}
                <button
                  type="button"
                  onClick={() => {
                    setActionType('reject');
                    setDossierTab('profile');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Từ chối
                </button>

                {/* Nút Phê duyệt (Primary Green, Text White) */}
                <button
                  type="button"
                  onClick={() => handleExecuteAction('approved')}
                  disabled={actionLoading || selectedApp.status === 'approved'}
                  className="px-5 py-2.5 rounded-xl bg-[#2F5D4A] hover:bg-[#254B3C] disabled:opacity-50 !text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>{selectedApp.status === 'approved' ? 'Đã phê duyệt' : 'Phê duyệt đối tác'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL BÀN GIAO TÀI KHOẢN ĐỐI TÁC THÀNH CÔNG (PBL6 DEMO READY) */}
      {credentialsModalOpen && approvedVendorData && (
        <div role="dialog" aria-modal="true" aria-label="Thông tin tài khoản đối tác" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs motion-backdrop-enter">
          <div className="bg-white rounded-3xl border border-[#C5CCC7] max-w-2xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden motion-modal-enter">
            
            {/* Modal Header */}
            <div className="px-6 py-5 bg-[#F8FAF7] border-b border-[#C5CCC7] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#2F5D4A] !text-white flex items-center justify-center shadow-xs">
                  <CheckCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 tracking-wide">
                      Kích hoạt thành công
                    </span>
                    <span className="text-[11px] font-mono font-bold text-gray-500">
                      {formatDisplayId(approvedVendorData.display_id || approvedVendorData.id)}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold font-fraunces text-[#191C1A] mt-0.5">
                    Bàn giao tài khoản đối tác B2B
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCredentialsModalOpen(false)}
                aria-label="Đóng thông tin tài khoản đối tác"
                className="w-12 h-12 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 border-b border-[#C5CCC7] bg-white flex items-center gap-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCredentialTab('credentials')}
                className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  credentialTab === 'credentials'
                    ? 'border-[#2F5D4A] text-[#2F5D4A]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>Thông tin Đăng nhập</span>
              </button>
              <button
                type="button"
                onClick={() => setCredentialTab('letter')}
                className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  credentialTab === 'letter'
                    ? 'border-[#2F5D4A] text-[#2F5D4A]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                <span>Thư bàn giao và thông báo BQL</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {credentialTab === 'credentials' ? (
                <>
                  {/* Banner chúc mừng */}
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 leading-relaxed">
                      <p className="font-bold text-emerald-950">
                        Đối tác "{approvedVendorData.brand_name}" đã được phê duyệt chính thức!
                      </p>
                      <p className="text-emerald-800 mt-0.5">
                        Tài khoản người dùng đã được kích hoạt trên hệ thống (Phân quyền: <code className="font-mono font-bold bg-emerald-100 px-1 py-0.5 rounded">vendor_admin</code>). Mật khẩu khởi tạo bên dưới có thể dùng để đăng nhập ngay vào Cổng đối tác.
                      </p>
                    </div>
                  </div>

                  {/* Khung thông tin đăng nhập */}
                  <div className="space-y-3">
                    {/* Brand name & Service */}
                    <div className="p-3.5 rounded-2xl bg-[#F8FAF7] border border-[#C5CCC7] flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold tracking-wider text-gray-400">Đơn vị thụ hưởng</p>
                        <p className="text-sm font-bold text-[#191C1A] mt-0.5">{approvedVendorData.brand_name}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-[#DCEBE3] text-[#2F5D4A]">
                        {approvedVendorData.service_type || 'Trekking & Sinh thái'}
                      </span>
                    </div>

                    {/* Email / Username */}
                    <div className="p-3.5 rounded-2xl border border-[#C5CCC7] bg-white flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <label className="block text-[10px] font-bold tracking-wider text-gray-400">
                          Tên đăng nhập (Email)
                        </label>
                        <p className="text-sm font-mono font-bold text-[#191C1A] truncate mt-0.5">
                          {approvedVendorData.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(approvedVendorData.email, 'email')}
                        className="px-3 py-1.5 rounded-xl border border-[#C5CCC7] bg-[#F8FAF7] hover:bg-[#DCEBE3] text-xs font-bold text-[#2F5D4A] flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                      >
                        {copiedField === 'email' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Initial Password */}
                    <div className="p-3.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <label className="block text-[10px] font-bold tracking-wider text-emerald-800">
                            Mật khẩu khởi tạo ban đầu
                          </label>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-200 text-emerald-900">
                            Mặc định hệ thống
                          </span>
                        </div>
                        <p className="text-base font-mono font-bold text-[#191C1A] mt-0.5 tracking-wider">
                          {showPassword ? (approvedVendorData.initial_password || 'Vendor@2026') : '••••••••••••'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-2 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700 transition-all cursor-pointer"
                          title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(approvedVendorData.initial_password || 'Vendor@2026', 'password')}
                          className="px-3.5 py-2 rounded-xl bg-[#2F5D4A] hover:bg-[#254B3C] !text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        >
                          {copiedField === 'password' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span className="text-white">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-white" />
                              <span className="text-white">Chép mật khẩu</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Portal URL */}
                    <div className="p-3.5 rounded-2xl border border-[#C5CCC7] bg-[#F8FAF7] flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold tracking-wider text-gray-400">Cổng đăng nhập đối tác</p>
                        <p className="text-xs font-mono font-semibold text-[#2F5D4A] mt-0.5">
                          {window.location.origin}/partner/login
                        </p>
                      </div>
                      <a
                        href="/partner/login"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#C5CCC7] bg-white hover:bg-gray-50 !text-[#191C1A] text-xs font-bold transition-all shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
                        <span>Mở cổng</span>
                      </a>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center gap-2 text-[11px] text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Hệ thống khuyến nghị đối tác đổi mật khẩu ngay sau lần đăng nhập đầu tiên.</span>
                  </div>
                </>
              ) : (
                /* Tab Thư chúc mừng */
                <div className="bg-[#F8FAF7] border border-[#C5CCC7] rounded-2xl p-6 text-xs text-[#191C1A] space-y-4 shadow-2xs font-sans">
                  {/* Quốc hiệu */}
                  <div className="text-center border-b border-[#C5CCC7] pb-4 space-y-1">
                    <p className="font-bold tracking-widest text-[11px] text-[#191C1A]">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </p>
                    <p className="italic text-[11px] text-gray-600">Độc lập - Tự do - Hạnh phúc</p>
                    <div className="pt-2">
                      <p className="font-bold text-[12px] text-[#2F5D4A]">
                        Ban quản lý bán đảo Sơn Trà và các bãi biển du lịch Đà Nẵng
                      </p>
                      <p className="text-[10px] text-gray-400">Số: {formatDisplayId(approvedVendorData.display_id || approvedVendorData.id)}/TB-BQLST</p>
                    </div>
                  </div>

                  {/* Tiêu đề thư */}
                  <div className="text-center py-1">
                    <h3 className="text-sm font-bold font-fraunces text-[#2F5D4A]">
                      THƯ CHÚC MỪNG & THÔNG BÁO BÀN GIAO QUYỀN TRUY CẬP HỆ THỐNG
                    </h3>
                    <p className="text-[11px] italic text-gray-500 mt-0.5">
                      V/v: phê duyệt tham gia mạng lưới du lịch sinh thái tuần hoàn Sơn Trà REloop
                    </p>
                  </div>

                  {/* Nội dung */}
                  <div className="space-y-2.5 text-[#191C1A] leading-relaxed">
                    <p>
                      <strong>Kính gửi:</strong> Ban giám đốc và bộ phận điều hành <strong>{approvedVendorData.brand_name}</strong>,
                    </p>
                    <p>
                      Ban quản lý bán đảo Sơn Trà trân trọng chúc mừng quý đơn vị đã hoàn tất quy trình thẩm định hồ sơ năng lực lữ hành và cam kết tuân thủ quy chế du lịch sinh thái bảo vệ môi trường bán đảo Sơn Trà.
                    </p>
                    <p>
                      Hồ sơ mã số <strong>{formatDisplayId(approvedVendorData.display_id || approvedVendorData.id)}</strong> đã chính thức được phê duyệt với mức trích quỹ ESG cam kết là <strong>10%</strong>. Quyền quản trị đối tác B2B của đơn vị đã được cấp phát:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] bg-white p-3 rounded-xl border border-[#C5CCC7]">
                      <li>Email đăng nhập: <strong>{approvedVendorData.email}</strong></li>
                      <li>Mật khẩu khởi tạo: <strong>{approvedVendorData.initial_password || 'Vendor@2026'}</strong></li>
                      <li>Phân hệ truy cập: <strong>Cổng quản trị đối tác lữ hành Sơn Trà ReLoop</strong></li>
                    </ul>
                    <p>
                      Quý đối tác vui lòng đăng nhập, cập nhật hồ sơ điều hành và đăng ký danh mục tour sinh thái trải nghiệm tại bán đảo Sơn Trà.
                    </p>
                  </div>

                  {/* Ký tên */}
                  <div className="flex justify-between items-end pt-4 border-t border-[#C5CCC7]">
                    <div className="text-[10px] text-gray-400">
                      Đà Nẵng, ngày {new Date().toLocaleDateString('vi-VN')}
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-bold text-[11px] text-[#191C1A]">TM. Ban quản lý</p>
                      <p className="text-[10px] text-gray-500 italic">Trưởng ban (đã ký duyệt điện tử)</p>
                      <div className="w-24 h-11 mx-auto rounded-lg border border-emerald-400 bg-emerald-50 text-[9px] font-bold text-emerald-800 flex items-center justify-center tracking-tight shadow-xs">
                        BQL SƠN TRÀ<br/>VERIFIED
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="px-6 py-4 bg-[#F8FAF7] border-t border-[#C5CCC7] flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCopyAllCredentials}
                className="px-4 py-2.5 rounded-xl border border-[#C5CCC7] bg-white hover:bg-gray-50 !text-[#191C1A] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedField === 'all' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Đã chép tất cả thông tin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Sao chép tất cả thông tin</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <a
                  href="/partner/login"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4 text-emerald-700" />
                  <span>Đăng nhập thử Cổng đối tác</span>
                </a>

                <button
                  type="button"
                  onClick={() => setCredentialsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#2F5D4A] hover:bg-[#254B3C] !text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>Hoàn tất & Đóng</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default VendorApprovalsPage;
