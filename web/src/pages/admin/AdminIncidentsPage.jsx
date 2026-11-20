import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { api } from "../../lib/axios";
import { PageHeader, SaasSelect } from "../../components/ui/SaasPrimitives";

const STATUS_OPTIONS = [
  { value: "pending", label: "Chờ BQL tiếp nhận" },
  { value: "in_progress", label: "Đang xử lý thực địa" },
  { value: "resolved", label: "Đã giải quyết khắc phục" },
];

const STAFF_OPTIONS = [
  { value: "Đội tuần tra rừng số 2", label: "Đội tuần tra rừng số 2" },
  { value: "Hạt Kiểm lâm Liên Chiểu - Sơn Trà", label: "Hạt Kiểm lâm Liên Chiểu - Sơn Trà" },
  { value: "Đội vệ sinh môi trường Bãi Bụt", label: "Đội vệ sinh môi trường Bãi Bụt" },
  { value: "Trung Tâm Cứu Hộ Động Vật Sơn Trà", label: "Trung tâm cứu hộ động vật Sơn Trà" },
];

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả loại sự cố" },
  { value: "trash", label: "Rác thải & Eco-Trash" },
  { value: "landslide", label: "Sạt lở & Đường mòn" },
  { value: "wildlife", label: "Động vật hoang dã" },
  { value: "infrastructure", label: "Hạ tầng checkpoint" },
];

export const AdminIncidentsPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: "in_progress",
    assigned_staff: "Đội tuần tra rừng số 2",
    resolution_notes: "",
    points_awarded: 50,
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/cms-chatbot/incidents/admin/?status=${statusFilter}&type=${typeFilter}`
      );
      if (res.data?.results) {
        setIncidents(res.data.results);
        if (!selectedIncident && res.data.results.length > 0) {
          selectIncidentForInspect(res.data.results[0]);
        }
        window.dispatchEvent(new Event("incidents-updated"));
      }
    } catch {
      /* Preserve current list on transient API failure */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter, typeFilter]);

  const selectIncidentForInspect = (inc) => {
    setSelectedIncident(inc);
    setUpdateForm({
      status: inc.status || "in_progress",
      assigned_staff:
        !inc.assigned_staff || inc.assigned_staff === "Chưa phân công"
          ? "Đội tuần tra rừng số 2"
          : inc.assigned_staff,
      resolution_notes: inc.resolution_notes || "",
      points_awarded: inc.points_awarded || 50,
    });
  };

  const handleSaveUpdate = async (e) => {
    e.preventDefault();
    if (!selectedIncident) return;
    setIsUpdating(true);
    try {
      const res = await api.patch(
        `/cms-chatbot/incidents/admin/${selectedIncident.id}/`,
        updateForm
      );
      if (res.data?.success) {
        showToast(`Đã cập nhật sự cố #${selectedIncident.id} thành công!`);
        fetchIncidents();
        window.dispatchEvent(new Event("incidents-updated"));
      }
    } catch {
      showToast("Lỗi khi cập nhật trạng thái sự cố!");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteIncident = async () => {
    if (!selectedIncident) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sự cố ${selectedIncident.id} khỏi hệ thống?`)) {
      return;
    }
    setIsUpdating(true);
    try {
      const res = await api.delete(`/cms-chatbot/incidents/admin/${selectedIncident.id}/`);
      if (res.data?.success) {
        showToast(`Đã xóa sự cố ${selectedIncident.id} thành công!`);
        setSelectedIncident(null);
        fetchIncidents();
        window.dispatchEvent(new Event("incidents-updated"));
      }
    } catch {
      showToast("Lỗi khi xóa sự cố!");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(inc.id || "").toLowerCase().includes(q) ||
      inc.location_name?.toLowerCase().includes(q) ||
      inc.reporter_name?.toLowerCase().includes(q) ||
      inc.description?.toLowerCase().includes(q)
    );
  });

  const pendingCount = incidents.filter((i) => i.status === "pending").length;
  const inProgressCount = incidents.filter((i) => i.status === "in_progress").length;
  const resolvedCount = incidents.filter((i) => i.status === "resolved").length;

  const getSeverityBadge = (sev) => {
    if (sev === "urgent") {
      return (
        <span className="sr-badge sr-badge-urgent">
          <span className="sr-badge-dot" aria-hidden="true" />
          <span>Khẩn cấp</span>
        </span>
      );
    }
    if (sev === "medium") {
      return (
        <span className="sr-badge sr-badge-warn">
          <span className="sr-badge-dot" aria-hidden="true" />
          <span>Trung bình</span>
        </span>
      );
    }
    return (
      <span className="sr-badge sr-badge-neutral">
        <span className="sr-badge-dot" aria-hidden="true" />
        <span>Thấp</span>
      </span>
    );
  };

  const getStatusBadge = (st) => {
    if (st === "resolved") {
      return (
        <span className="sr-badge sr-badge-moss">
          <Check size={12} aria-hidden="true" />
          <span>Đã giải quyết</span>
        </span>
      );
    }
    if (st === "in_progress") {
      return (
        <span className="sr-badge sr-badge-warn">
          <Clock size={12} aria-hidden="true" />
          <span>Đang xử lý</span>
        </span>
      );
    }
    return (
      <span className="sr-badge sr-badge-urgent">
        <AlertTriangle size={12} aria-hidden="true" />
        <span>Chờ tiếp nhận</span>
      </span>
    );
  };

  return (
    <div className="sr-page">
      {toastMessage && (
        <div role="status" className="sr-callout sr-callout-moss justify-between">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setToastMessage("")}
            className="sr-btn-ghost p-1 rounded cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <PageHeader
        title="Điều phối & xử lý sự cố thực địa"
        subtitle="Tiếp nhận phản ánh theo tọa độ GPS, phân đội tuần tra và cộng thưởng Green Points"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="sr-segment-group" role="group" aria-label="Lọc trạng thái sự cố">
              {[
                { id: "all", label: `Tất cả (${incidents.length})` },
                { id: "pending", label: `Chờ tiếp nhận (${pendingCount})` },
                { id: "in_progress", label: `Đang xử lý (${inProgressCount})` },
                { id: "resolved", label: `Đã xử lý (${resolvedCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={statusFilter === tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`sr-segment-btn ${statusFilter === tab.id ? "is-selected" : ""}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={fetchIncidents}
              disabled={loading}
              className="sr-btn sr-btn-sm sr-btn-secondary"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
              <span>Làm mới</span>
            </button>
          </div>
        }
      />

      <div className="sr-toolbar">
        <div className="sr-toolbar-group">
          <div className="sr-toolbar-search">
            <Search size={14} aria-hidden="true" />
            <input
              type="text"
              aria-label="Tìm theo mã, vị trí, người gửi"
              placeholder="Tìm mã INC, tuyến, nội dung..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <SaasSelect
            label="Loại"
            value={typeFilter}
            options={TYPE_FILTER_OPTIONS}
            onChange={setTypeFilter}
          />
        </div>

        <span className="text-xs text-[var(--sr-text-muted)]">
          Hiển thị {filteredIncidents.length} sự cố thực địa
        </span>
      </div>

      <section className="sr-grid-split" aria-label="Danh sách và chi tiết điều phối sự cố">
        <div className="sr-table-card">
          {loading ? (
            <p role="status" className="p-8 text-center text-sm text-[var(--sr-text-muted)]">
              Đang tải dữ liệu sự cố thực địa...
            </p>
          ) : filteredIncidents.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--sr-text-muted)]">
              Không tìm thấy sự cố nào phù hợp với bộ lọc hiện tại.
            </p>
          ) : (
            <div className="sr-table-scroll">
              <table className="sr-table">
                <caption className="sr-only">Danh sách báo cáo sự cố thực địa</caption>
                <thead>
                  <tr>
                    <th scope="col">Mã & Mô tả sự cố</th>
                    <th scope="col">Vị trí / Người gửi</th>
                    <th scope="col">Đội phụ trách</th>
                    <th scope="col">Mức độ</th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.map((inc) => {
                    const isSelected = selectedIncident?.id === inc.id;
                    return (
                      <tr
                        key={inc.id}
                        onClick={() => selectIncidentForInspect(inc)}
                        className={`is-interactive ${isSelected ? "is-selected" : ""}`}
                      >
                        <td>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-[var(--sr-accent-ink)]">
                              #{inc.id} · {inc.incident_type}
                            </span>
                            <span className="font-medium line-clamp-2">{inc.description}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="inline-flex items-center gap-1 font-medium">
                              <MapPin size={12} aria-hidden="true" />
                              {inc.location_name}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[var(--sr-text-muted)]">
                              <User size={12} aria-hidden="true" />
                              {inc.reporter_name}
                            </span>
                          </div>
                        </td>
                        <td className="text-xs text-[var(--sr-text-secondary)]">
                          {inc.assigned_staff || "Chưa phân công"}
                        </td>
                        <td>{getSeverityBadge(inc.severity)}</td>
                        <td>{getStatusBadge(inc.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="sr-card" aria-label="Bảng điều phối chi tiết sự cố">
          {selectedIncident ? (
            <form onSubmit={handleSaveUpdate} className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                {getSeverityBadge(selectedIncident.severity)}
                <span className="text-xs font-semibold text-[var(--sr-text-muted)]">
                  #{selectedIncident.id}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <h2 className="sr-h2 m-0">{selectedIncident.incident_type}</h2>
                <p className="text-xs text-[var(--sr-text-secondary)] m-0">
                  {selectedIncident.description}
                </p>
              </div>

              {selectedIncident.photo_url ? (
                <img
                  src={selectedIncident.photo_url}
                  alt="Hiện trường sự cố"
                  className="w-full h-40 object-cover rounded-lg border border-[var(--sr-border)]"
                />
              ) : (
                <div className="h-24 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-page)] flex items-center justify-center gap-2 text-xs text-[var(--sr-text-muted)]">
                  <Camera size={16} aria-hidden="true" />
                  <span>Chưa có ảnh hiện trường</span>
                </div>
              )}

              <div className="p-3 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-page)] flex flex-col gap-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--sr-text-muted)]">Vị trí hiện trường</span>
                  <span className="font-semibold text-right">{selectedIncident.location_name}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--sr-text-muted)]">Người báo cáo</span>
                  <span className="font-semibold text-right">{selectedIncident.reporter_name}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--sr-text-muted)]">Thời gian tiếp nhận</span>
                  <span className="font-semibold text-right">{selectedIncident.created_at}</span>
                </div>
              </div>

              <div className="sr-field">
                <span className="sr-field-label">Trạng thái xử lý</span>
                <SaasSelect
                  value={updateForm.status}
                  options={STATUS_OPTIONS}
                  onChange={(val) => setUpdateForm({ ...updateForm, status: val })}
                  className="w-full"
                />
              </div>

              <div className="sr-field">
                <span className="sr-field-label">Cán bộ / đội phụ trách</span>
                <SaasSelect
                  value={updateForm.assigned_staff}
                  options={STAFF_OPTIONS}
                  onChange={(val) => setUpdateForm({ ...updateForm, assigned_staff: val })}
                  className="w-full"
                />
              </div>

              <div className="sr-field">
                <label htmlFor="inc-points" className="sr-field-label">
                  Thưởng Green Points cho người báo cáo
                </label>
                <input
                  id="inc-points"
                  type="number"
                  min="0"
                  step="10"
                  value={updateForm.points_awarded}
                  onChange={(e) =>
                    setUpdateForm({
                      ...updateForm,
                      points_awarded: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="sr-input"
                />
              </div>

              <div className="sr-field">
                <label htmlFor="inc-notes" className="sr-field-label">
                  Ghi chú xử lý hiện trường
                </label>
                <textarea
                  id="inc-notes"
                  rows={3}
                  value={updateForm.resolution_notes}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, resolution_notes: e.target.value })
                  }
                  placeholder="Nhập chi tiết biện pháp đã xử lý thực địa..."
                  className="sr-textarea"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[var(--sr-border)]">
                <button
                  type="button"
                  onClick={handleDeleteIncident}
                  disabled={isUpdating}
                  className="sr-btn sr-btn-sm sr-btn-destructive"
                >
                  <Trash2 size={14} aria-hidden="true" />
                  <span>Xóa</span>
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="sr-btn sr-btn-sm sr-btn-primary flex-1"
                >
                  <Check size={14} aria-hidden="true" />
                  <span>{isUpdating ? "Đang lưu..." : "Cập nhật & Điều phối"}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="py-12 text-center text-xs text-[var(--sr-text-muted)]">
              Chọn một sự cố trong danh sách để xem tọa độ GPS và điều phối đội tuần tra.
            </div>
          )}
        </aside>
      </section>
    </div>
  );
};

export default AdminIncidentsPage;
