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
import { PageHeader } from '../../components/ui/SaasPrimitives';

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
  const handleExecuteAction = async (rawStatus) => {
    const status = rawStatus === 'reject' ? 'rejected' : rawStatus;
    if ((status === 'rejected' || status === 'need_info') && !actionReason.trim()) {
      alert('Vui lòng nhập lý do / ghi chú cụ thể để gửi cho đơn vị đối tác!');
      return;
    }

    setActionLoading(true);
    try {
      const adminName = localStorage.getItem('user_name') || 'Cán bộ BQL Sơn Trà';
      const updated = (await vendorApplicationService.updateStatus(
        selectedApp.id,
        status,
        actionReason,
        adminName
      )) || {
        ...selectedApp,
        status,
        rejection_reason: actionReason || '',
        verified_by_admin: adminName,
        verified_at: new Date().toISOString(),
        initial_password: status === 'approved' ? 'Vendor@2026' : null,
      };

      setSelectedApp(updated);
      await loadData();
      setActionLoading(false);
      setActionType(null);
      setActionReason('');

      const brandLabel = updated?.brand_name || selectedApp?.brand_name || 'Đối tác';
      const emailLabel = updated?.email || selectedApp?.email || '';

      if (status === 'approved') {
        showToast(`Đã phê duyệt đối tác "${brandLabel}" thành công!`);
        setDrawerOpen(false);
        setApprovedVendorData(updated);
        setCredentialsModalOpen(true);
      } else if (status === 'need_info') {
        showToast(`Đã gửi yêu cầu bổ sung hồ sơ tới email ${emailLabel}!`, 'warning');
      } else if (status === 'rejected') {
        showToast(`Đã từ chối hồ sơ đối tác "${brandLabel}".`, 'info');
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--sr-warn-soft)] text-[var(--sr-warn)] border border-[var(--sr-warn)]">
            <Clock className="w-3 h-3 text-[var(--sr-warn)]" />
            <span>Chờ thẩm định</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--sr-accent-soft)] text-[var(--sr-accent-ink)] border border-[var(--sr-border-strong)]">
            <CheckCircle2 className="w-3 h-3 text-[var(--sr-accent)]" />
            <span>Đã phê duyệt</span>
          </span>
        );
      case 'need_info':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--color-info-subtle)] text-[var(--color-info)] border border-[var(--color-info)]">
            <AlertCircle className="w-3 h-3 text-[var(--color-info)]" />
            <span>Yêu cầu bổ sung</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--sr-urgent-soft)] text-[var(--sr-urgent-ink)] border border-[var(--sr-urgent)]">
            <XCircle className="w-3 h-3 text-[var(--sr-urgent)]" />
            <span>Đã từ chối</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="sr-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50">
          <div className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2.5 ${
            toastMessage.type === 'success' 
              ? 'bg-[var(--sr-accent)] !text-white border-[var(--sr-accent-hover)]'
              : toastMessage.type === 'warning'
              ? 'bg-[var(--sr-warn)] !text-white border-[var(--sr-warn)]'
              : 'bg-[var(--sr-urgent)] !text-white border-[var(--terracotta-hover)]'
          }`}>
            <Sparkles className="w-4 h-4 shrink-0 text-white" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      <PageHeader
        title="Kiểm duyệt hồ sơ đối tác"
        subtitle="Thẩm định pháp lý, giấy phép kinh doanh và cam kết bảo tồn trước khi cấp tài khoản vận hành tour."
        actions={
          <button
            type="button"
            onClick={handleResetData}
            className="sr-btn sr-btn-sm sr-btn-secondary"
            title="Khôi phục danh sách mẫu ban đầu"
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Dữ liệu mẫu</span>
          </button>
        }
      />

      {/* Band 1: Queue Summary */}
      <section className="sr-grid-8-4" aria-label="Thống kê hồ sơ đối tác">
        <article className="sr-hero-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--sr-text-muted)]">
                Hồ sơ chờ BQL thẩm định
              </span>
              <strong className="sr-metric-hero sr-tabular">
                {stats.pending} hồ sơ chờ duyệt
              </strong>
            </div>
            <span className="sr-badge sr-badge-warn">
              <span className="sr-badge-dot" aria-hidden="true" />
              <span>Cần xử lý trong 24h</span>
            </span>
          </div>
        </article>

        <article className="sr-card justify-between">
          <div className="sr-kv-row">
            <span className="text-[var(--sr-text-secondary)]">Đã phê duyệt hoạt động</span>
            <strong className="sr-tabular text-[var(--sr-accent-ink)]">
              {stats.approved} đối tác
            </strong>
          </div>
          <div className="sr-kv-row">
            <span className="text-[var(--sr-text-secondary)]">Yêu cầu bổ sung</span>
            <strong className="sr-tabular text-[var(--sr-text-primary)]">
              {stats.need_info} hồ sơ
            </strong>
          </div>
          <div className="sr-kv-row">
            <span className="text-[var(--sr-text-secondary)]">Đã từ chối</span>
            <strong className="sr-tabular text-[var(--sr-urgent-ink)]">
              {stats.rejected} hồ sơ
            </strong>
          </div>
        </article>
      </section>

      {/* Band 2: Filter Toolbar + Applications Table */}
      <section className="sr-table-card">
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sr-border)]">
          <div className="sr-segment-group" role="group" aria-label="Lọc trạng thái hồ sơ">
            {[
              { key: 'all', label: `Tất cả (${stats.total})` },
              { key: 'pending_approval', label: `Chờ duyệt (${stats.pending})` },
              { key: 'approved', label: `Đã duyệt (${stats.approved})` },
              { key: 'need_info', label: `Yêu cầu bổ sung (${stats.need_info})` },
              { key: 'rejected', label: `Từ chối (${stats.rejected})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                aria-pressed={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`sr-segment-btn ${activeTab === tab.key ? 'is-selected' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="sr-toolbar-search">
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              aria-label="Tìm theo tên doanh nghiệp, GPKD, hotline"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên doanh nghiệp, GPKD, hotline..."
            />
          </div>
        </div>

        {applications.length === 0 ? (
          <p className="p-8 text-center text-sm text-[var(--sr-text-muted)] m-0">
            Không tìm thấy hồ sơ nào phù hợp với bộ lọc hiện tại.
          </p>
        ) : (
          <div className="sr-table-scroll">
            <table className="sr-table">
              <caption className="sr-only">Danh sách hồ sơ đối tác lữ hành</caption>
              <thead>
                <tr>
                  <th scope="col">Mã & Doanh nghiệp</th>
                  <th scope="col">Loại hình / Địa bàn</th>
                  <th scope="col">Liên hệ</th>
                  <th scope="col">Ngày nộp</th>
                  <th scope="col">Trạng thái BQL</th>
                  <th scope="col" className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => handleOpenDetail(app)}
                    className="is-interactive"
                    title="Bấm để xem hồ sơ và giấy tờ chi tiết"
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="sr-avatar" aria-hidden="true">
                          {app.brand_name.charAt(0)}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[var(--sr-text-primary)]">
                              {app.brand_name}
                            </span>
                            {app.is_new && (
                              <span className="sr-badge sr-badge-urgent">MỚI</span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--sr-text-muted)] font-mono mt-0.5 m-0">
                            {formatDisplayId(app.display_id || app.id)} · GPKD: {app.business_license_code || 'Chưa cung cấp'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td>
                      <p className="font-medium text-[var(--sr-text-primary)] m-0">{app.service_type}</p>
                      <p className="text-xs text-[var(--sr-text-muted)] flex items-center gap-1 mt-0.5 m-0">
                        <MapPin className="w-3 h-3 text-[var(--sr-accent)]" />
                        <span>{app.operating_area}</span>
                      </p>
                    </td>

                    <td>
                      <p className="text-xs font-medium text-[var(--sr-text-primary)] flex items-center gap-1.5 m-0">
                        <Phone className="w-3 h-3 text-[var(--sr-text-muted)]" />
                        <span>{app.hotline || 'N/A'}</span>
                      </p>
                      <p className="text-xs text-[var(--sr-text-muted)] flex items-center gap-1.5 mt-0.5 m-0">
                        <Mail className="w-3 h-3 text-[var(--sr-text-muted)]" />
                        <span>{app.email || 'N/A'}</span>
                      </p>
                    </td>

                    <td className="whitespace-nowrap text-xs text-[var(--sr-text-muted)]">
                      {new Date(app.submitted_at).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                      <span className="block">
                        {new Date(app.submitted_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    <td>
                      {getStatusBadge(app.status)}
                    </td>

                    <td className="text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(app);
                        }}
                        className="sr-btn sr-btn-sm sr-btn-secondary"
                      >
                        <Eye size={14} aria-hidden="true" />
                        <span>Xem hồ sơ</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* FULL-FEATURED DOSSIER & DOCUMENT INSPECTION MODAL */}
      {drawerOpen && selectedApp && (
        <div role="dialog" aria-modal="true" aria-label="Chi tiết hồ sơ đối tác" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs motion-backdrop-enter">
          <div className="bg-white rounded-3xl border border-[var(--sr-border)] max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden motion-modal-enter">
            
            {/* 1. MODAL TOP HEADER */}
            <div className="px-6 py-4 border-b border-[var(--sr-border)] flex items-center justify-between bg-[var(--sr-bg-page)]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[var(--sr-accent)] !text-white flex items-center justify-center font-bold text-base shadow-xs">
                  {selectedApp.brand_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold font-fraunces text-[var(--sr-text-primary)]">
                      {selectedApp.brand_name}
                    </h2>
                    {getStatusBadge(selectedApp.status)}
                  </div>
                  <p className="text-xs text-[var(--sr-text-secondary)] font-mono mt-0.5">
                    Mã hồ sơ: <span className="font-bold text-[var(--sr-accent)]">{formatDisplayId(selectedApp.display_id || selectedApp.id)}</span> · Nộp: {new Date(selectedApp.submitted_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseDetail}
                aria-label="Đóng chi tiết hồ sơ đối tác"
                className="w-12 h-12 inline-flex items-center justify-center rounded-full text-[var(--sr-text-muted)] hover:text-[var(--sr-text-primary)] hover:bg-[var(--sr-bg-subtle)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sr-accent)]/40"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. DOSSIER NAVIGATION TABS */}
            <div className="px-6 pt-3 bg-white border-b border-[var(--sr-border)] flex gap-2 overflow-x-auto">
              <button
                onClick={() => setDossierTab('profile')}
                className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  dossierTab === 'profile'
                    ? 'border-[var(--sr-accent)] text-[var(--sr-accent)]'
                    : 'border-transparent text-[var(--sr-text-muted)] hover:text-[var(--sr-text-primary)]'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>1. Hồ sơ doanh nghiệp & năng lực</span>
              </button>

              <button
                onClick={() => setDossierTab('documents')}
                className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  dossierTab === 'documents'
                    ? 'border-[var(--sr-accent)] text-[var(--sr-accent)]'
                    : 'border-transparent text-[var(--sr-text-muted)] hover:text-[var(--sr-text-primary)]'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                <span>2. Giấy phép kinh doanh (trình xem GPKD)</span>
              </button>

              <button
                onClick={() => setDossierTab('esg')}
                className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  dossierTab === 'esg'
                    ? 'border-[var(--sr-accent)] text-[var(--sr-accent)]'
                    : 'border-transparent text-[var(--sr-text-muted)] hover:text-[var(--sr-text-primary)]'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>3. Cam kết bảo tồn & quỹ 10%</span>
              </button>
            </div>

            {/* 3. MODAL SCROLLABLE BODY */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-[var(--sr-text-primary)]">
              
              {/* Notice if rejection reason exists */}
              {selectedApp.rejection_reason && (
                <div className="p-4 rounded-2xl bg-[var(--sr-warn-soft)] border border-[var(--sr-warn)] flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[var(--sr-warn)] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[var(--sr-warn)]">Ghi chú thẩm định từ BQL:</p>
                    <p className="text-[var(--sr-warn)] mt-0.5 leading-relaxed">{selectedApp.rejection_reason}</p>
                  </div>
                </div>
              )}

              {/* TAB 1: THÔNG TIN DOANH NGHIỆP & NĂNG LỰC */}
              {dossierTab === 'profile' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* General Legal Info */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[var(--sr-accent)] tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      <span>Thông tin pháp nhân doanh nghiệp</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[var(--sr-bg-page)] p-4.5 rounded-2xl border border-[var(--sr-border)]">
                      <div>
                        <span className="text-[var(--sr-text-secondary)]">Tên doanh nghiệp chính thức:</span>
                        <p className="font-bold text-sm text-[var(--sr-text-primary)] mt-0.5">{selectedApp.brand_name}</p>
                      </div>

                      <div>
                        <span className="text-[var(--sr-text-secondary)]">Người đại diện theo pháp luật:</span>
                        <p className="font-bold text-sm text-[var(--sr-text-primary)] mt-0.5">
                          {selectedApp.legal_representative || 'Chưa cập nhật'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[var(--sr-text-secondary)]">Mã số thuế / GPKD:</span>
                        <p className="font-mono font-bold text-[var(--sr-accent-ink)] mt-0.5">
                          {selectedApp.tax_code || selectedApp.business_license_code}
                        </p>
                      </div>

                      <div>
                        <span className="text-[var(--sr-text-secondary)]">Cơ quan cấp phép:</span>
                        <p className="font-medium text-[var(--sr-text-primary)] mt-0.5">
                          {selectedApp.issued_by || 'Sở Kế hoạch và Đầu tư TP. Đà Nẵng'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[var(--sr-text-secondary)]">Hotline đại diện:</span>
                        <p className="font-bold text-[var(--sr-text-primary)] mt-0.5 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[var(--sr-text-muted)]" />
                          <span>{selectedApp.hotline || 'Chưa cung cấp'}</span>
                        </p>
                      </div>

                      <div>
                        <span className="text-[var(--sr-text-secondary)]">Email nhận tài khoản cổng đối tác:</span>
                        <p className="font-bold text-[var(--sr-text-primary)] mt-0.5 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-[var(--sr-text-muted)]" />
                          <span>{selectedApp.email}</span>
                        </p>
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-[var(--sr-text-secondary)]">Phạm vi ngành nghề kinh doanh:</span>
                        <p className="font-medium text-[var(--sr-text-primary)] mt-0.5">
                          {selectedApp.scope_of_business || 'Kinh doanh dịch vụ lữ hành, tour du lịch sinh thái & thể thao mạo hiểm'}
                        </p>
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-[var(--sr-text-secondary)]">Giới thiệu tóm tắt đơn vị:</span>
                        <p className="text-[var(--sr-text-primary)] mt-0.5 leading-relaxed bg-white p-3 rounded-xl border border-[var(--sr-border)]">
                          {selectedApp.description || 'Chưa có mô tả chi tiết.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Operational Capacity */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[var(--sr-accent)] tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4" />
                      <span>Năng lực tổ chức và đội ngũ thực địa</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 rounded-2xl bg-[var(--sr-bg-page)] border border-[var(--sr-border)] space-y-1">
                        <span className="text-[var(--sr-text-secondary)]">Kinh nghiệm lữ hành:</span>
                        <p className="text-lg font-bold font-fraunces text-[var(--sr-accent)]">
                          {selectedApp.experience_years || 4} Năm
                        </p>
                        <p className="text-xs text-[var(--sr-text-muted)]">Tổ chức trekking Sơn Trà</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-[var(--sr-bg-page)] border border-[var(--sr-border)] space-y-1">
                        <span className="text-[var(--sr-text-secondary)]">Hướng dẫn viên (Guide):</span>
                        <p className="text-lg font-bold font-fraunces text-[var(--sr-accent)]">
                          {selectedApp.guides_count || 5} Hướng dẫn viên
                        </p>
                        <p className="text-xs text-[var(--sr-text-muted)]">Đăng ký cấp thẻ tuần tra BQL</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-[var(--sr-bg-page)] border border-[var(--sr-border)] space-y-1">
                        <span className="text-[var(--sr-text-secondary)]">Địa bàn tác nghiệp:</span>
                        <p className="text-xs font-bold text-[var(--sr-text-primary)] truncate">
                          {selectedApp.operating_area}
                        </p>
                        <p className="text-xs text-[var(--sr-accent-ink)] font-semibold">Tuyến rừng được cấp phép</p>
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
                      <h3 className="text-xs font-bold text-[var(--sr-accent)] tracking-wider flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4" />
                        <span>Trình xem giấy tờ & đối soát hồ sơ pháp lý</span>
                      </h3>
                      <p className="text-xs text-[var(--sr-text-secondary)] mt-0.5">
                        Kiểm tra con dấu đỏ, mã số đăng ký kinh doanh và phạm vi cấp phép lữ hành sinh thái.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert('Đang tải file đính kèm chất lượng cao về máy cán bộ BQL...')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--sr-border)] hover:bg-[var(--sr-bg-page)] !text-[var(--sr-text-primary)] text-xs font-semibold rounded-xl cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải file PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* SIMULATED OFFICIAL A4 BUSINESS LICENSE PREVIEW */}
                  <div className="bg-[var(--sr-bg-page)] border-2 border-[var(--sr-border)] rounded-3xl p-6 sm:p-10 shadow-md max-w-2xl mx-auto space-y-6 text-[var(--sr-text-primary)] relative overflow-hidden">
                    {/* Watermark */}
                    <div className="absolute right-6 bottom-6 opacity-10 pointer-events-none select-none font-fraunces text-8xl font-black text-[var(--sr-urgent-ink)] rotate-[-15deg]">
                      SƠN TRÀ
                    </div>

                    {/* Official National Header */}
                    <div className="text-center space-y-1 border-b border-[var(--sr-border)] pb-4">
                      <p className="text-xs font-extrabold tracking-widest text-[var(--sr-text-primary)]">
                        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                      </p>
                      <p className="text-xs font-bold text-[var(--sr-text-secondary)]">
                        Độc lập, Tự do, Hạnh phúc
                      </p>
                      <div className="w-24 h-0.5 bg-[var(--sr-urgent)] mx-auto mt-2" />
                    </div>

                    {/* Document Title */}
                    <div className="text-center space-y-1">
                      <h4 className="text-base sm:text-lg font-black font-fraunces tracking-wide text-[var(--sr-urgent-ink)]">
                        GIẤY CHỨNG NHẬN ĐĂNG KÝ DOANH NGHIỆP
                      </h4>
                      <p className="text-xs font-semibold text-[var(--sr-text-muted)]">
                        CÔNG TY TNHH / DOANH NGHIỆP LỮ HÀNH DU LỊCH SINH THÁI
                      </p>
                      <p className="text-xs font-mono font-bold text-[var(--sr-text-primary)] pt-1">
                        Mã số doanh nghiệp: {selectedApp.tax_code || selectedApp.business_license_code}
                      </p>
                    </div>

                    {/* License Details Grid */}
                    <div className="space-y-3 text-xs leading-relaxed border-y border-[var(--sr-border)] py-4">
                      <div className="flex">
                        <span className="w-36 text-[var(--sr-text-secondary)] shrink-0 font-medium">1. Tên doanh nghiệp:</span>
                        <span className="font-extrabold text-[var(--sr-text-primary)]">{selectedApp.brand_name}</span>
                      </div>
                      <div className="flex">
                        <span className="w-36 text-[var(--sr-text-secondary)] shrink-0 font-medium">2. Người đại diện PL:</span>
                        <span className="font-bold text-[var(--sr-text-primary)]">{selectedApp.legal_representative || 'Nguyễn Văn Hùng'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-36 text-[var(--sr-text-secondary)] shrink-0 font-medium">3. Trụ sở tác nghiệp:</span>
                        <span className="text-[var(--sr-text-primary)]">{selectedApp.operating_area}, TP. Đà Nẵng</span>
                      </div>
                      <div className="flex">
                        <span className="w-36 text-[var(--sr-text-secondary)] shrink-0 font-medium">4. Ngành nghề chính:</span>
                        <span className="text-[var(--sr-text-primary)]">{selectedApp.scope_of_business || 'Dịch vụ lữ hành, hướng dẫn du lịch mạo hiểm trekking rừng bán đảo'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-36 text-[var(--sr-text-secondary)] shrink-0 font-medium">5. Hotline / Email:</span>
                        <span className="text-[var(--sr-text-primary)]">{selectedApp.hotline} · {selectedApp.email}</span>
                      </div>
                    </div>

                    {/* Official Stamp & Sign Off */}
                    <div className="pt-2 flex justify-between items-end">
                      <div className="text-xs text-[var(--sr-text-muted)]">
                        <p>File lưu trữ: <b>{selectedApp.license_file_name}</b></p>
                        <p>Trạng thái kiểm tra: <b className="text-[var(--sr-accent-ink)]">Hợp lệ và còn hiệu lực</b></p>
                      </div>

                      <div className="text-center space-y-1 relative pr-4">
                        <p className="text-xs italic text-[var(--sr-text-secondary)]">Đà Nẵng, ngày {selectedApp.issued_date || '15 tháng 03 năm 2021'}</p>
                        <p className="text-xs font-bold text-[var(--sr-text-primary)]">Cơ quan đăng ký kinh doanh</p>
                        
                        {/* Red Seal Stamp Simulation */}
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-[var(--sr-urgent)] text-[var(--sr-urgent-ink)] flex flex-col items-center justify-center text-xs font-black mx-auto rotate-[-8deg] shadow-xs bg-[var(--sr-urgent-soft)]">
                          <span>SỞ KH&ĐT</span>
                          <span className="text-xs">ĐÀ NẴNG</span>
                          <span>ĐÃ ĐỐI SOÁT</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Logo Brand Asset Inspection Card */}
                  <div className="bg-[var(--sr-bg-page)] border border-[var(--sr-border)] rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[var(--sr-accent-soft)] border border-[var(--sr-border)] flex items-center justify-center font-bold text-sm text-[var(--sr-accent)]">
                        {selectedApp.brand_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[var(--sr-text-primary)]">Logo đại diện: {selectedApp.logo_file_name}</p>
                        <p className="text-xs text-[var(--sr-text-secondary)]">Định dạng PNG/JPG chuẩn hiển thị B2B và danh sách tour</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-[var(--sr-accent-soft)] text-[var(--sr-accent-ink)] border border-[var(--sr-border-strong)] text-xs font-bold rounded-lg flex items-center gap-1">
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
                    <h3 className="text-xs font-bold text-[var(--sr-accent)] tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Cam kết chuẩn mực sinh thái và Quỹ bảo tồn bán đảo</span>
                    </h3>
                    <p className="text-xs text-[var(--sr-text-secondary)]">
                      Mọi đơn vị đối tác tham gia nền tảng Son Tra ReLoop bắt buộc tuân thủ 2 điều khoản cốt lõi sau:
                    </p>
                  </div>

                  {/* ESG Card 1 */}
                  <div className="p-5 rounded-2xl bg-[var(--sr-accent-soft)] border border-[var(--sr-border)] space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--sr-accent)] text-white flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCheck className="w-5 h-5 text-white" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-[var(--sr-accent)]">
                          1. Cơ chế trích tự động 10% quỹ bảo tồn và cứu hộ bán đảo Sơn Trà
                        </h4>
                        <p className="text-xs text-[var(--sr-text-secondary)] leading-relaxed">
                          Doanh nghiệp cam kết đồng ý với cơ chế đối soát tự động của hệ thống (split-payment qua VNPay/Stripe): mỗi đơn đặt tour hoàn tất sẽ tự động chuyển <b>10%</b> giá trị vào quỹ bảo tồn để tài trợ thức ăn cho voọc chà vá, trồng rừng bản địa và trang bị thiết bị tuần tra.
                        </p>
                      </div>
                    </div>
                    <div className="pl-11 flex items-center gap-2 text-xs font-bold text-[var(--sr-accent-ink)]">
                      <CheckCircle2 className="w-4 h-4 text-[var(--sr-accent)]" />
                      <span>Đã ký cam kết điện tử khi nộp hồ sơ.</span>
                    </div>
                  </div>

                  {/* ESG Card 2 */}
                  <div className="p-5 rounded-2xl bg-[var(--sr-bg-page)] border border-[var(--sr-border)] space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--sr-accent-soft)] text-[var(--sr-accent-ink)] flex items-center justify-center shrink-0 mt-0.5">
                        <Compass className="w-5 h-5 text-[var(--sr-accent)]" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-[var(--sr-text-primary)]">
                          2. Quy chuẩn an toàn rừng và không rác thải (Zero Waste)
                        </h4>
                        <p className="text-xs text-[var(--sr-text-secondary)] leading-relaxed">
                          - Cam kết không sử dụng loa kéo công suất lớn gây ảnh hưởng sinh quyển.<br/>
                          - Tuyệt đối không cho du khách cho khỉ/voọc ăn thức ăn lạ.<br/>
                          - Đội ngũ hướng dẫn viên có trách nhiệm thu gom 100% rác sinh hoạt phát sinh và cân rác Eco-Trash tại các trạm checkpoint tuần tra.
                        </p>
                      </div>
                    </div>
                    <div className="pl-11 flex items-center gap-2 text-xs font-bold text-[var(--sr-accent-ink)]">
                      <CheckCircle2 className="w-4 h-4 text-[var(--sr-accent)]" />
                      <span>Đã thông qua quy chuẩn kiểm định BQL.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. KHUNG NHẬP LÝ DO (KHI BẤM TỪ CHỐI HOẶC YÊU CẦU BỔ SUNG) */}
              {actionType && (
                <div className="p-4 rounded-2xl border bg-[var(--sr-bg-page)] space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[var(--sr-text-primary)]">
                      {actionType === 'reject' 
                        ? 'Nhập lý do từ chối hồ sơ đối tác:' 
                        : 'Nhập nội dung yêu cầu bổ sung thông tin:'}
                    </span>
                    <button 
                      onClick={() => setActionType(null)}
                      className="text-[var(--sr-text-muted)] hover:text-[var(--sr-text-secondary)] text-xs cursor-pointer"
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
                    className="w-full p-3 rounded-xl border border-[var(--sr-border)] bg-white text-xs focus:outline-none focus:border-[var(--sr-accent)] resize-none"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleExecuteAction(actionType)}
                      disabled={actionLoading}
                      className={`px-4 py-2 rounded-xl text-xs font-bold !text-white transition-all cursor-pointer ${
                        actionType === 'reject' ? 'bg-[var(--sr-urgent)] hover:bg-[var(--terracotta-hover)]' : 'bg-[var(--color-info)] hover:bg-[var(--color-info)]'
                      }`}
                    >
                      {actionLoading ? 'Đang lưu...' : 'Xác nhận gửi phản hồi'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. MODAL BOTTOM ACTIONS BAR */}
            <div className="px-6 py-4 bg-[var(--sr-bg-page)] border-t border-[var(--sr-border)] flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCloseDetail}
                className="px-4 py-2.5 rounded-xl border border-[var(--sr-border)] bg-white hover:bg-[var(--sr-bg-page)] !text-[var(--sr-text-primary)] text-xs font-bold transition-all cursor-pointer"
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
                  className="px-4 py-2.5 rounded-xl bg-[var(--color-info-subtle)] border border-[var(--color-info)] hover:bg-[var(--color-info-subtle)] text-[var(--color-info)] text-xs font-bold transition-all cursor-pointer"
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
                  className="px-4 py-2.5 rounded-xl bg-[var(--sr-urgent-soft)] border border-[var(--sr-urgent)] hover:bg-[var(--sr-urgent-soft)] text-[var(--sr-urgent-ink)] text-xs font-bold transition-all cursor-pointer"
                >
                  Từ chối
                </button>

                {/* Nút Phê duyệt (Primary Green, Text White) */}
                <button
                  type="button"
                  onClick={() => handleExecuteAction('approved')}
                  disabled={actionLoading || selectedApp.status === 'approved'}
                  className="px-5 py-2.5 rounded-xl bg-[var(--sr-accent)] hover:bg-[var(--sr-accent-hover)] disabled:opacity-50 !text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
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
          <div className="bg-white rounded-3xl border border-[var(--sr-border)] max-w-2xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden motion-modal-enter">
            
            {/* Modal Header */}
            <div className="px-6 py-5 bg-[var(--sr-bg-page)] border-b border-[var(--sr-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[var(--sr-accent)] !text-white flex items-center justify-center shadow-xs">
                  <CheckCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--sr-accent-soft)] text-[var(--sr-accent-ink)] border border-[var(--sr-border-strong)] tracking-wide">
                      Kích hoạt thành công
                    </span>
                    <span className="text-xs font-mono font-bold text-[var(--sr-text-muted)]">
                      {formatDisplayId(approvedVendorData.display_id || approvedVendorData.id)}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold font-fraunces text-[var(--sr-text-primary)] mt-0.5">
                    Bàn giao tài khoản đối tác B2B
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCredentialsModalOpen(false)}
                aria-label="Đóng thông tin tài khoản đối tác"
                className="w-12 h-12 rounded-full flex items-center justify-center text-[var(--sr-text-muted)] hover:text-[var(--sr-text-primary)] hover:bg-[var(--sr-bg-subtle)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sr-accent)]/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 border-b border-[var(--sr-border)] bg-white flex items-center gap-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCredentialTab('credentials')}
                className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  credentialTab === 'credentials'
                    ? 'border-[var(--sr-accent)] text-[var(--sr-accent)]'
                    : 'border-transparent text-[var(--sr-text-muted)] hover:text-[var(--sr-text-primary)]'
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
                    ? 'border-[var(--sr-accent)] text-[var(--sr-accent)]'
                    : 'border-transparent text-[var(--sr-text-muted)] hover:text-[var(--sr-text-primary)]'
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
                  <div className="p-4 rounded-2xl bg-[var(--sr-accent-soft)] border border-[var(--sr-border-strong)] flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-[var(--sr-accent-ink)] shrink-0 mt-0.5" />
                    <div className="text-xs text-[var(--sr-accent-ink)] leading-relaxed">
                      <p className="font-bold text-[var(--sr-accent-ink)]">
                        Đối tác "{approvedVendorData.brand_name}" đã được phê duyệt chính thức!
                      </p>
                      <p className="text-[var(--sr-accent-ink)] mt-0.5">
                        Tài khoản người dùng đã được kích hoạt trên hệ thống (Phân quyền: <code className="font-mono font-bold bg-[var(--sr-accent-soft)] px-1 py-0.5 rounded">vendor_admin</code>). Mật khẩu khởi tạo bên dưới có thể dùng để đăng nhập ngay vào Cổng đối tác.
                      </p>
                    </div>
                  </div>

                  {/* Khung thông tin đăng nhập */}
                  <div className="space-y-3">
                    {/* Brand name & Service */}
                    <div className="p-3.5 rounded-2xl bg-[var(--sr-bg-page)] border border-[var(--sr-border)] flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold tracking-wider text-[var(--sr-text-muted)]">Đơn vị thụ hưởng</p>
                        <p className="text-sm font-bold text-[var(--sr-text-primary)] mt-0.5">{approvedVendorData.brand_name}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-[var(--sr-accent-soft)] text-[var(--sr-accent)]">
                        {approvedVendorData.service_type || 'Trekking & Sinh thái'}
                      </span>
                    </div>

                    {/* Email / Username */}
                    <div className="p-3.5 rounded-2xl border border-[var(--sr-border)] bg-white flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <label className="block text-xs font-bold tracking-wider text-[var(--sr-text-muted)]">
                          Tên đăng nhập (Email)
                        </label>
                        <p className="text-sm font-mono font-bold text-[var(--sr-text-primary)] truncate mt-0.5">
                          {approvedVendorData.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(approvedVendorData.email, 'email')}
                        className="px-3 py-1.5 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-bg-page)] hover:bg-[var(--sr-accent-soft)] text-xs font-bold text-[var(--sr-accent)] flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                      >
                        {copiedField === 'email' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[var(--sr-accent)]" />
                            <span className="text-[var(--sr-accent-ink)]">Đã chép</span>
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
                    <div className="p-3.5 rounded-2xl border-2 border-[var(--sr-border-strong)] bg-[var(--sr-accent-soft)] flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <label className="block text-xs font-bold tracking-wider text-[var(--sr-accent-ink)]">
                            Mật khẩu khởi tạo ban đầu
                          </label>
                          <span className="px-1.5 py-0.2 rounded text-xs font-bold bg-[var(--sr-accent-soft)] text-[var(--sr-accent-ink)]">
                            Mặc định hệ thống
                          </span>
                        </div>
                        <p className="text-base font-mono font-bold text-[var(--sr-text-primary)] mt-0.5 tracking-wider">
                          {showPassword ? (approvedVendorData.initial_password || 'Vendor@2026') : '••••••••••••'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-2 rounded-xl border border-[var(--sr-border-strong)] bg-white hover:bg-[var(--sr-accent-soft)] text-[var(--sr-accent-ink)] transition-all cursor-pointer"
                          title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(approvedVendorData.initial_password || 'Vendor@2026', 'password')}
                          className="px-3.5 py-2 rounded-xl bg-[var(--sr-accent)] hover:bg-[var(--sr-accent-hover)] !text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
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
                    <div className="p-3.5 rounded-2xl border border-[var(--sr-border)] bg-[var(--sr-bg-page)] flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold tracking-wider text-[var(--sr-text-muted)]">Cổng đăng nhập đối tác</p>
                        <p className="text-xs font-mono font-semibold text-[var(--sr-accent)] mt-0.5">
                          {window.location.origin}/partner/login
                        </p>
                      </div>
                      <a
                        href="/partner/login"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--sr-border)] bg-white hover:bg-[var(--sr-bg-page)] !text-[var(--sr-text-primary)] text-xs font-bold transition-all shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[var(--sr-text-secondary)]" />
                        <span>Mở cổng</span>
                      </a>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--sr-warn-soft)]/70 border border-[var(--sr-warn)] flex items-center gap-2 text-xs text-[var(--sr-warn)]">
                    <AlertTriangle className="w-4 h-4 text-[var(--sr-warn)] shrink-0" />
                    <span>Hệ thống khuyến nghị đối tác đổi mật khẩu ngay sau lần đăng nhập đầu tiên.</span>
                  </div>
                </>
              ) : (
                /* Tab Thư chúc mừng */
                <div className="bg-[var(--sr-bg-page)] border border-[var(--sr-border)] rounded-2xl p-6 text-xs text-[var(--sr-text-primary)] space-y-4 shadow-2xs font-sans">
                  {/* Quốc hiệu */}
                  <div className="text-center border-b border-[var(--sr-border)] pb-4 space-y-1">
                    <p className="font-bold tracking-widest text-xs text-[var(--sr-text-primary)]">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </p>
                    <p className="italic text-xs text-[var(--sr-text-secondary)]">Độc lập - Tự do - Hạnh phúc</p>
                    <div className="pt-2">
                      <p className="font-bold text-xs text-[var(--sr-accent)]">
                        Ban quản lý bán đảo Sơn Trà và các bãi biển du lịch Đà Nẵng
                      </p>
                      <p className="text-xs text-[var(--sr-text-muted)]">Số: {formatDisplayId(approvedVendorData.display_id || approvedVendorData.id)}/TB-BQLST</p>
                    </div>
                  </div>

                  {/* Tiêu đề thư */}
                  <div className="text-center py-1">
                    <h3 className="text-sm font-bold font-fraunces text-[var(--sr-accent)]">
                      THƯ CHÚC MỪNG & THÔNG BÁO BÀN GIAO QUYỀN TRUY CẬP HỆ THỐNG
                    </h3>
                    <p className="text-xs italic text-[var(--sr-text-muted)] mt-0.5">
                      V/v: phê duyệt tham gia mạng lưới du lịch sinh thái tuần hoàn Sơn Trà REloop
                    </p>
                  </div>

                  {/* Nội dung */}
                  <div className="space-y-2.5 text-[var(--sr-text-primary)] leading-relaxed">
                    <p>
                      <strong>Kính gửi:</strong> Ban giám đốc và bộ phận điều hành <strong>{approvedVendorData.brand_name}</strong>,
                    </p>
                    <p>
                      Ban quản lý bán đảo Sơn Trà trân trọng chúc mừng quý đơn vị đã hoàn tất quy trình thẩm định hồ sơ năng lực lữ hành và cam kết tuân thủ quy chế du lịch sinh thái bảo vệ môi trường bán đảo Sơn Trà.
                    </p>
                    <p>
                      Hồ sơ mã số <strong>{formatDisplayId(approvedVendorData.display_id || approvedVendorData.id)}</strong> đã chính thức được phê duyệt với mức trích quỹ bảo tồn cam kết là <strong>10%</strong>. Quyền quản trị đối tác B2B của đơn vị đã được cấp phát:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 font-mono text-xs bg-white p-3 rounded-xl border border-[var(--sr-border)]">
                      <li>Email đăng nhập: <strong>{approvedVendorData.email}</strong></li>
                      <li>Mật khẩu khởi tạo: <strong>{approvedVendorData.initial_password || 'Vendor@2026'}</strong></li>
                      <li>Phân hệ truy cập: <strong>Cổng quản trị đối tác lữ hành Sơn Trà ReLoop</strong></li>
                    </ul>
                    <p>
                      Quý đối tác vui lòng đăng nhập, cập nhật hồ sơ điều hành và đăng ký danh mục tour sinh thái trải nghiệm tại bán đảo Sơn Trà.
                    </p>
                  </div>

                  {/* Ký tên */}
                  <div className="flex justify-between items-end pt-4 border-t border-[var(--sr-border)]">
                    <div className="text-xs text-[var(--sr-text-muted)]">
                      Đà Nẵng, ngày {new Date().toLocaleDateString('vi-VN')}
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-bold text-xs text-[var(--sr-text-primary)]">TM. Ban quản lý</p>
                      <p className="text-xs text-[var(--sr-text-muted)] italic">Trưởng ban (đã ký duyệt điện tử)</p>
                      <div className="w-24 h-11 mx-auto rounded-lg border border-[var(--sr-accent)] bg-[var(--sr-accent-soft)] text-xs font-bold text-[var(--sr-accent-ink)] flex items-center justify-center tracking-tight shadow-xs">
                        BQL SƠN TRÀ<br/>VERIFIED
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="px-6 py-4 bg-[var(--sr-bg-page)] border-t border-[var(--sr-border)] flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCopyAllCredentials}
                className="px-4 py-2.5 rounded-xl border border-[var(--sr-border)] bg-white hover:bg-[var(--sr-bg-page)] !text-[var(--sr-text-primary)] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedField === 'all' ? (
                  <>
                    <Check className="w-4 h-4 text-[var(--sr-accent)]" />
                    <span className="text-[var(--sr-accent-ink)]">Đã chép tất cả thông tin!</span>
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
                  className="px-4 py-2.5 rounded-xl border border-[var(--sr-border-strong)] bg-[var(--sr-accent-soft)] hover:bg-[var(--sr-accent-soft)] text-[var(--sr-accent-ink)] text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4 text-[var(--sr-accent-ink)]" />
                  <span>Đăng nhập thử Cổng đối tác</span>
                </a>

                <button
                  type="button"
                  onClick={() => setCredentialsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[var(--sr-accent)] hover:bg-[var(--sr-accent-hover)] !text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
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
