import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  Camera, 
  Filter, 
  Search, 
  ChevronRight, 
  Eye, 
  Check, 
  X, 
  Sparkles,
  ArrowRight,
  Flame,
  Trash2,
  Trees,
  Award
} from 'lucide-react';
import { api } from '../../lib/axios';

export const AdminIncidentsPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Selected incident for Detail / Resolution Modal
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    assigned_staff: '',
    resolution_notes: '',
    points_awarded: 50
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/cms-chatbot/incidents/admin/?status=${statusFilter}&type=${typeFilter}`);
      if (res.data?.results) {
        setIncidents(res.data.results);
        window.dispatchEvent(new Event('incidents-updated'));
      }
    } catch (err) {
      console.warn("Could not load incidents from API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter, typeFilter]);

  const handleOpenDetailModal = (inc) => {
    setSelectedIncident(inc);
    setUpdateForm({
      status: inc.status || 'in_progress',
      assigned_staff: inc.assigned_staff === 'Chưa phân công' ? 'Đội tuần tra rừng số 2' : (inc.assigned_staff || 'Đội tuần tra rừng số 2'),
      resolution_notes: inc.resolution_notes || '',
      points_awarded: inc.points_awarded || 50
    });
  };

  const handleSaveUpdate = async (e) => {
    e.preventDefault();
    if (!selectedIncident) return;
    setIsUpdating(true);
    try {
      const res = await api.patch(`/cms-chatbot/incidents/admin/${selectedIncident.id}/`, updateForm);
      if (res.data?.success) {
        showToast(`Đã cập nhật sự cố #${selectedIncident.id} thành công!`);
        setSelectedIncident(null);
        fetchIncidents();
        window.dispatchEvent(new Event('incidents-updated'));
      }
    } catch (err) {
      showToast("Lỗi khi cập nhật trạng thái sự cố!");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteIncident = async () => {
    if (!selectedIncident) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sự cố ${selectedIncident.id} khỏi hệ thống?`)) return;
    setIsUpdating(true);
    try {
      const res = await api.delete(`/cms-chatbot/incidents/admin/${selectedIncident.id}/`);
      if (res.data?.success) {
        showToast(`Đã xóa sự cố ${selectedIncident.id} thành công!`);
        setSelectedIncident(null);
        fetchIncidents();
        window.dispatchEvent(new Event('incidents-updated'));
      }
    } catch (err) {
      showToast("Lỗi khi xóa sự cố!");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredIncidents = incidents.filter(inc => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inc.id?.toLowerCase().includes(q) ||
      inc.location_name?.toLowerCase().includes(q) ||
      inc.reporter_name?.toLowerCase().includes(q) ||
      inc.description?.toLowerCase().includes(q)
    );
  });

  const pendingCount = incidents.filter(i => i.status === 'pending').length;
  const inProgressCount = incidents.filter(i => i.status === 'in_progress').length;
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length;

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">Khẩn cấp</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Trung bình</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">Thấp</span>;
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'resolved':
        return <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Đã giải quyết</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Đang xử lý</span>;
      default:
        return <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Chờ tiếp nhận</span>;
    }
  };

  return (
    <div className="m3-app-page min-w-0 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-[#191C1A] text-white px-5 py-3 rounded-2xl shadow-xl border border-gray-700 animate-fade-in text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-white border border-[#C5CCC7] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold mb-2 border border-red-200">
            <ShieldAlert className="w-4 h-4" />
            <span>Trung tâm xử lý sự cố thực địa (AD-08)</span>
          </div>
          <h1 className="text-2xl font-bold text-[#191C1A] font-fraunces">Tiếp nhận & điều phối báo cáo sự cố Sơn Trà</h1>
          <p className="text-xs text-[#4A514C] mt-1">Giám sát phản ánh thời gian thực từ du khách (KH-12) và nhân viên tuần tra rừng tại thực địa bán đảo.</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={fetchIncidents}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F2F5F1] hover:bg-[#DCEBE3] text-[#2F5D4A] rounded-xl border border-[#C5CCC7] text-xs font-bold transition-colors cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>Làm mới danh sách</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#C5CCC7] shadow-xs space-y-1">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-semibold">Tổng sự cố ghi nhận</span>
            <AlertTriangle className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-[#191C1A] font-fraunces">{incidents.length}</p>
          <span className="text-[11px] text-gray-500 block">Dữ liệu thực tế toàn bán đảo</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-amber-700">
            <span className="text-xs font-bold">Chờ tiếp nhận (mới)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-800 font-fraunces">{pendingCount}</p>
          <span className="text-[11px] text-amber-700 font-semibold block">Cần phân công cán bộ BQL</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-200 bg-sky-50/20 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-sky-700">
            <span className="text-xs font-bold">Đang xử lý thực địa</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-sky-800 font-fraunces">{inProgressCount}</p>
          <span className="text-[11px] text-sky-700 font-semibold block">Đội tuần tra đang tác nghiệp</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-emerald-700">
            <span className="text-xs font-bold">Đã khắc phục thành công</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-800 font-fraunces">{resolvedCount}</p>
          <span className="text-[11px] text-emerald-700 font-semibold block">Đã dọn dẹp & tặng điểm xanh</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#C5CCC7] p-4 shadow-xs flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-[#191C1A] mr-1">Trạng thái:</span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'pending', label: 'Chờ tiếp nhận' },
            { id: 'in_progress', label: 'Đang xử lý' },
            { id: 'resolved', label: 'Đã giải quyết' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                statusFilter === tab.id
                  ? 'bg-[#2F5D4A] text-white border-[#2F5D4A]'
                  : 'bg-[#F2F5F1] text-[#4A514C] border-[#C5CCC7] hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-80">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#F2F5F1] rounded-xl border border-[#C5CCC7] w-full focus-within:border-[#2F5D4A] transition-all">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Tìm theo mã, vị trí, người gửi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-0 text-xs text-[#191C1A] focus:outline-none w-full"
            />
          </div>
        </div>
      </div>

      {/* Incident Cards Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-2xl border border-[#C5CCC7]">
            Đang tải dữ liệu sự cố thực địa...
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-2xl border border-[#C5CCC7]">
            Không tìm thấy sự cố nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          filteredIncidents.map(inc => (
            <div 
              key={inc.id}
              className="bg-white rounded-2xl border border-[#C5CCC7] p-5 shadow-xs hover:border-[#2F5D4A] transition-all flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5"
            >
              <div className="flex items-start gap-4 flex-1">
                {inc.photo_url ? (
                  <img 
                    src={inc.photo_url} 
                    alt="Hiện trường" 
                    className="w-20 h-20 rounded-xl object-cover border border-[#C5CCC7] shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0 border border-gray-200">
                    <Camera className="w-6 h-6" />
                  </div>
                )}

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs text-[#2F5D4A] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      #{inc.id}
                    </span>
                    <span className="font-bold text-xs text-[#191C1A]">
                      {inc.incident_type}
                    </span>
                    {getSeverityBadge(inc.severity)}
                  </div>

                  <p className="text-xs text-[#191C1A] line-clamp-2 leading-relaxed">
                    {inc.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#4A514C] pt-1">
                    <span className="flex items-center gap-1 font-medium text-[#191C1A]">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      {inc.location_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {inc.reporter_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {inc.created_at}
                    </span>
                    <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Cán bộ: {inc.assigned_staff || "Chưa phân công"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 self-end lg:self-center w-full sm:w-auto justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-gray-100">
                <div>
                  {getStatusBadge(inc.status)}
                </div>

                <button 
                  onClick={() => handleOpenDetailModal(inc)}
                  className="px-4 py-2 bg-[#2F5D4A] hover:bg-[#254B3C] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span>Xử lý & Cập nhật</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail & Update Incident Modal */}
      {selectedIncident && (
        <div role="dialog" aria-modal="true" aria-label="Chi tiết sự cố" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs motion-backdrop-enter">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 border border-[#C5CCC7] shadow-2xl relative max-h-[90vh] overflow-y-auto motion-modal-enter">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-100 text-[#2F5D4A] text-xs font-bold rounded-lg">
                  #{selectedIncident.id}
                </span>
                <h3 className="font-bold text-base text-[#191C1A] font-fraunces m-0">
                  Điều phối xử lý sự cố thực địa
                </h3>
              </div>
              <button 
                onClick={() => setSelectedIncident(null)}
                aria-label="Đóng chi tiết sự cố"
                className="w-12 h-12 inline-flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full cursor-pointer border-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5D4A]/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Incident Summary Card */}
            <div className="bg-[#F8FAF7] p-4 rounded-2xl border border-[#C5CCC7] space-y-2 text-xs">
              <div className="flex justify-between items-center font-bold">
                <span className="text-[#191C1A]">{selectedIncident.incident_type}</span>
                {getSeverityBadge(selectedIncident.severity)}
              </div>
              <p className="text-gray-700 m-0 leading-relaxed">{selectedIncident.description}</p>
              <div className="flex items-center gap-4 text-gray-500 pt-1 text-[11px]">
                <span className="flex items-center gap-1 text-red-600 font-bold">
                  <MapPin className="w-3.5 h-3.5" /> {selectedIncident.location_name}
                </span>
                <span>Người gửi: {selectedIncident.reporter_name}</span>
              </div>
            </div>

            {/* Photo Preview if available */}
            {selectedIncident.photo_url && (
              <div>
                <p className="text-xs font-bold text-[#191C1A] mb-1.5">Ảnh hiện trường đính kèm:</p>
                <img 
                  src={selectedIncident.photo_url} 
                  alt="Hiện trường sự cố" 
                  className="w-full h-48 object-cover rounded-2xl border border-gray-200" 
                />
              </div>
            )}

            {/* Action Form */}
            <form onSubmit={handleSaveUpdate} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#191C1A] mb-1.5">
                    Trạng thái xử lý
                  </label>
                  <select
                    value={updateForm.status}
                    onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-[#2F5D4A]"
                  >
                    <option value="pending">Chờ BQL tiếp nhận</option>
                    <option value="in_progress">Đang xử lý thực địa</option>
                    <option value="resolved">Đã giải quyết khắc phục</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#191C1A] mb-1.5">
                    Cán bộ / đội phụ trách
                  </label>
                  <select
                    value={updateForm.assigned_staff}
                    onChange={(e) => setUpdateForm({ ...updateForm, assigned_staff: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-[#2F5D4A]"
                  >
                    <option value="Đội tuần tra rừng số 2">Đội tuần tra rừng số 2</option>
                    <option value="Hạt Kiểm lâm Liên Chiểu - Sơn Trà">Hạt Kiểm lâm Liên Chiểu - Sơn Trà</option>
                    <option value="Đội vệ sinh môi trường Bãi Bụt">Đội vệ sinh môi trường Bãi Bụt</option>
                    <option value="Trung Tâm Cứu Hộ Động Vật Sơn Trà">Trung tâm cứu hộ động vật Sơn Trà</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#191C1A] mb-1.5">
                  Điểm thưởng sinh thái tặng người báo cáo (RE-Points)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={updateForm.points_awarded}
                    onChange={(e) => setUpdateForm({ ...updateForm, points_awarded: parseInt(e.target.value, 10) || 0 })}
                    className="w-32 text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#2F5D4A]"
                  />
                  <span className="text-[11px] text-gray-500">Khuyến khích du khách và cán bộ phát hiện kịp thời</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#191C1A] mb-1.5">
                  Ghi chú kết quả khắc phục / xử lý thực địa
                </label>
                <textarea
                  rows="3"
                  value={updateForm.resolution_notes}
                  onChange={(e) => setUpdateForm({ ...updateForm, resolution_notes: e.target.value })}
                  placeholder="Nhập chi tiết biện pháp đã xử lý (ví dụ: đã dọn sạch 15kg rác, rào chắn đá rơi...)"
                  className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:outline-none focus:border-[#2F5D4A]"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleDeleteIncident}
                  disabled={isUpdating}
                  className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl cursor-pointer border border-red-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa sự cố này
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedIncident(null)}
                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer border-0 bg-transparent"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2 text-xs font-bold text-white bg-[#2F5D4A] hover:bg-[#254B3C] rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isUpdating ? "Đang lưu..." : "Xác nhận & cập nhật"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminIncidentsPage;

