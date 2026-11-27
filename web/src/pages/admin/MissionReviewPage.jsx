import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Award,
  Check,
  Edit3,
  Eye,
  EyeOff,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import api from "../../lib/axios";
import { extractErrorMessage } from "../../utils/apiError";
import { PageHeader } from "../../components/ui/SaasPrimitives";

const MISSION_TYPE_OPTIONS = [
  { value: "eco_action", label: "Hành động xanh (Ảnh minh chứng)" },
  { value: "checkin_gps", label: "Check-in GPS theo tuyến tour" },
];

const ECO_ACTIVITY_OPTIONS = [
  { value: "trash_pickup", label: "Thu gom rác thải" },
  { value: "tree_planting", label: "Trồng cây & phục hồi" },
  { value: "other", label: "Hoạt động sinh thái khác" },
];

const emptyForm = () => ({
  title: "",
  description: "",
  mission_type: "eco_action",
  eco_activity_type: "trash_pickup",
  tour_id: "",
  checkpoint_ids: [],
  reward_points: "100",
  target_weight_kg: "",
  time_limit_minutes: "",
  badge_name: "",
  badge_description: "",
  banner_url: "",
  valid_from: "",
  valid_to: "",
  is_active: true,
});

function toDatetimeLocalValue(isoString) {
  if (!isoString) return "";
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export default function MissionReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "review" ? "review" : "missions";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [queueItems, setQueueItems] = useState([]);
  const [missions, setMissions] = useState([]);
  const [tourOptions, setTourOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Proof reject inline state
  const [rejectAttemptId, setRejectAttemptId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reviewingId, setReviewingId] = useState(null);

  // Mission create / edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMissionId, setEditingMissionId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [queueRes, adminMissionsRes] = await Promise.all([
        api.get("/challenging/missions/review-queue/"),
        api.get("/challenging/missions/admin/"),
      ]);
      const queueList = queueRes.data?.results || [];
      const adminData = adminMissionsRes.data?.data || {};
      setQueueItems(queueList);
      setMissions(adminData.missions || []);
      setTourOptions(adminData.tours || []);
      if (!searchParams.get("tab") && queueList.length > 0) {
        setActiveTab("review");
      }
    } catch (e) {
      setError(extractErrorMessage(e, "Không thể tải dữ liệu nhiệm vụ xanh."));
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const switchTab = (nextTab) => {
    setActiveTab(nextTab);
    const next = new URLSearchParams(searchParams);
    next.set("tab", nextTab);
    setSearchParams(next, { replace: true });
  };

  const handleReviewAttempt = async (item, decision, reasonText = "") => {
    if (reviewingId) return;
    setReviewingId(item.id);
    setError("");
    setNotice("");
    try {
      await api.post(`/challenging/missions/attempts/${item.id}/review/`, {
        decision,
        reason: reasonText.trim(),
      });
      setQueueItems((prev) => prev.filter((row) => row.id !== item.id));
      setRejectAttemptId(null);
      setRejectReason("");
      setNotice(
        decision === "approved"
          ? `Đã duyệt minh chứng "${item.title}" và cộng điểm cho du khách.`
          : `Đã từ chối minh chứng "${item.title}".`
      );
    } catch (e) {
      setError(extractErrorMessage(e, "Không thể xử lý minh chứng."));
    } finally {
      setReviewingId(null);
    }
  };

  const openCreateModal = () => {
    setEditingMissionId(null);
    setForm(emptyForm());
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (mission) => {
    setEditingMissionId(mission.id);
    setForm({
      title: mission.title || "",
      description: mission.description || "",
      mission_type: mission.mission_type || "eco_action",
      eco_activity_type: mission.eco_activity_type || "trash_pickup",
      tour_id: mission.tour_id ? String(mission.tour_id) : "",
      checkpoint_ids: (mission.checkpoints || []).map((cp) => cp.id),
      reward_points: String(mission.reward_points ?? 100),
      target_weight_kg:
        mission.target_weight_kg != null ? String(mission.target_weight_kg) : "",
      time_limit_minutes:
        mission.time_limit_minutes != null ? String(mission.time_limit_minutes) : "",
      badge_name: mission.badge_name || "",
      badge_description: mission.badge_description || "",
      banner_url: mission.banner_url || "",
      valid_from: toDatetimeLocalValue(mission.valid_from),
      valid_to: toDatetimeLocalValue(mission.valid_to),
      is_active: Boolean(mission.is_active),
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSaveMission = async (e) => {
    e.preventDefault();
    if (saving) return;
    setFormError("");
    setNotice("");

    if (!form.title.trim()) {
      setFormError("Vui lòng nhập tiêu đề nhiệm vụ xanh.");
      return;
    }
    if (form.mission_type === "checkin_gps" && !form.tour_id) {
      setFormError("Nhiệm vụ Check-in GPS cần chọn tuyến tour áp dụng.");
      return;
    }

    const showWeightGoal =
      form.mission_type === "eco_action" &&
      form.eco_activity_type === "trash_pickup";

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      mission_type: form.mission_type,
      eco_activity_type:
        form.mission_type === "eco_action" ? form.eco_activity_type : null,
      tour_id: form.tour_id ? Number(form.tour_id) : null,
      checkpoint_ids:
        form.mission_type === "checkin_gps" ? form.checkpoint_ids : [],
      reward_points: Number(form.reward_points || 100),
      target_weight_kg:
        showWeightGoal && form.target_weight_kg !== ""
          ? Number(form.target_weight_kg)
          : null,
      time_limit_minutes:
        form.time_limit_minutes !== "" ? Number(form.time_limit_minutes) : null,
      badge_name: form.badge_name.trim(),
      badge_description: form.badge_description.trim(),
      banner_url: form.banner_url.trim(),
      valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
      valid_to: form.valid_to ? new Date(form.valid_to).toISOString() : null,
      is_active: Boolean(form.is_active),
    };

    setSaving(true);
    try {
      const res = editingMissionId
        ? await api.patch(`/challenging/missions/admin/${editingMissionId}/`, payload)
        : await api.post("/challenging/missions/admin/", payload);
      setNotice(
        res.data?.message ||
          (editingMissionId
            ? "Đã cập nhật nhiệm vụ xanh."
            : "Đã tạo nhiệm vụ xanh mới.")
      );
      setModalOpen(false);
      await loadAll();
      setActiveTab("missions");
    } catch (err) {
      setFormError(extractErrorMessage(err, "Không thể lưu nhiệm vụ xanh."));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (mission) => {
    if (togglingId) return;
    setTogglingId(mission.id);
    setError("");
    setNotice("");
    try {
      const nextActive = !mission.is_active;
      await api.patch(`/challenging/missions/admin/${mission.id}/`, {
        is_active: nextActive,
      });
      setMissions((prev) =>
        prev.map((m) => (m.id === mission.id ? { ...m, is_active: nextActive } : m))
      );
      setNotice(
        nextActive
          ? `Đã mở lại nhiệm vụ "${mission.title}".`
          : `Đã tạm ẩn nhiệm vụ "${mission.title}".`
      );
    } catch (err) {
      setError(extractErrorMessage(err, "Không thể cập nhật trạng thái nhiệm vụ."));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteMission = async (mission) => {
    if (!window.confirm(`Bạn có chắc muốn gỡ nhiệm vụ "${mission.title}"?`)) return;
    setError("");
    setNotice("");
    try {
      await api.delete(`/challenging/missions/admin/${mission.id}/`);
      setMissions((prev) => prev.filter((m) => m.id !== mission.id));
      setNotice(`Đã gỡ nhiệm vụ "${mission.title}".`);
    } catch (err) {
      setError(extractErrorMessage(err, "Không thể xóa nhiệm vụ xanh."));
    }
  };

  const activeMissionsCount = missions.filter((m) => m.is_active).length;
  const totalCompletedCount = missions.reduce(
    (sum, m) => sum + Number(m.completed_count || 0),
    0
  );
  const showWeightGoal =
    form.mission_type === "eco_action" &&
    form.eco_activity_type === "trash_pickup";

  const selectedTourObj = tourOptions.find(
    (t) => String(t.id) === String(form.tour_id)
  );
  const selectedTourSelectOptions = [
    {
      value: "",
      label:
        form.mission_type === "eco_action"
          ? "Toàn Sơn Trà (Nhiệm vụ mở)"
          : "Chọn tuyến tour...",
    },
    ...tourOptions.map((t) => ({
      value: String(t.id),
      label: `${t.title} (${t.vendor_name})`,
    })),
  ];

  const toggleCheckpoint = (cpId) => {
    setForm((prev) => {
      const exists = prev.checkpoint_ids.includes(cpId);
      return {
        ...prev,
        checkpoint_ids: exists
          ? prev.checkpoint_ids.filter((id) => id !== cpId)
          : [...prev.checkpoint_ids, cpId],
      };
    });
  };

  return (
    <div className="sr-page">
      <PageHeader
        title="Nhiệm vụ xanh Sơn Trà"
        subtitle="Tạo nhiệm vụ bảo tồn cho du khách và duyệt minh chứng thực địa trước khi cộng RE-Points"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadAll}
              className="sr-btn sr-btn-secondary sr-btn-sm"
            >
              <RefreshCw size={14} aria-hidden="true" />
              <span>Làm mới</span>
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="sr-btn sr-btn-primary sr-btn-sm"
            >
              <Plus size={15} aria-hidden="true" />
              <span>Tạo nhiệm vụ xanh</span>
            </button>
          </div>
        }
      />

      {error && (
        <p role="alert" className="sr-callout sr-callout-urgent m-0">
          {error}
        </p>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-[var(--sr-border-strong)] bg-[var(--sr-accent-soft)] px-4 py-2.5 text-xs font-medium text-[var(--sr-accent-ink)]"
        >
          {notice}
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <section className="sr-surface flex flex-col gap-1">
          <span className="text-xs text-[var(--sr-text-muted)]">
            Tổng nhiệm vụ xanh
          </span>
          <span className="text-2xl font-bold text-[var(--sr-text-primary)] sr-tabular">
            {missions.length}
          </span>
          <span className="text-xs text-[var(--sr-text-secondary)]">
            Do BQL phát hành
          </span>
        </section>

        <section className="sr-surface flex flex-col gap-1">
          <span className="text-xs text-[var(--sr-text-muted)]">
            Đang mở cho du khách
          </span>
          <span className="text-2xl font-bold text-[var(--sr-accent)] sr-tabular">
            {activeMissionsCount}
          </span>
          <span className="text-xs text-[var(--sr-text-secondary)]">
            Hiển thị trên mục Nhiệm vụ
          </span>
        </section>

        <section className="sr-surface flex flex-col gap-1">
          <span className="text-xs text-[var(--sr-text-muted)]">
            Minh chứng chờ duyệt
          </span>
          <span className="text-2xl font-bold text-amber-700 sr-tabular">
            {queueItems.length}
          </span>
          <span className="text-xs text-[var(--sr-text-secondary)]">
            Cần xác nhận ảnh thực địa
          </span>
        </section>

        <section className="sr-surface flex flex-col gap-1">
          <span className="text-xs text-[var(--sr-text-muted)]">
            Lượt hoàn thành
          </span>
          <span className="text-2xl font-bold text-[var(--sr-text-primary)] sr-tabular">
            {totalCompletedCount}
          </span>
          <span className="text-xs text-[var(--sr-text-secondary)]">
            Đã cộng RE-Points &amp; huy hiệu
          </span>
        </section>
      </div>

      {/* Main Content Surface */}
      <section className="sr-surface flex flex-col gap-4">
        <div className="sr-tabs" role="tablist" aria-label="Quản lý nhiệm vụ xanh">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "missions"}
            onClick={() => switchTab("missions")}
            className={`sr-tab ${activeTab === "missions" ? "is-selected" : ""}`}
          >
            Danh sách &amp; Tạo nhiệm vụ ({missions.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "review"}
            onClick={() => switchTab("review")}
            className={`sr-tab ${activeTab === "review" ? "is-selected" : ""}`}
          >
            Duyệt minh chứng ({queueItems.length})
          </button>
        </div>

        {loading ? (
          <p
            role="status"
            className="py-10 text-center text-sm text-[var(--sr-text-muted)]"
          >
            Đang tải dữ liệu nhiệm vụ xanh...
          </p>
        ) : activeTab === "missions" ? (
          !missions.length ? (
            <div className="py-10 text-center flex flex-col items-center gap-3">
              <Sparkles size={28} className="text-stone-300" aria-hidden="true" />
              <p className="text-sm font-medium text-[var(--sr-text-primary)] m-0">
                Chưa có nhiệm vụ xanh nào trong hệ thống
              </p>
              <p className="text-xs text-[var(--sr-text-muted)] m-0 max-w-md">
                Admin có thể tạo nhiệm vụ thu gom rác, trồng cây hoặc check-in GPS để khuyến khích du khách tích điểm xanh.
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="sr-btn sr-btn-primary sr-btn-sm"
              >
                <Plus size={14} aria-hidden="true" />
                <span>Tạo nhiệm vụ đầu tiên</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {missions.map((mission) => (
                <article
                  key={mission.id}
                  className={`rounded-xl border p-4 flex flex-col gap-3 ${
                    mission.is_active
                      ? "border-[var(--sr-border)] bg-[var(--sr-bg-page)]"
                      : "border-stone-200 bg-stone-50/70 opacity-85"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-bold text-[var(--sr-text-primary)] m-0">
                          {mission.title}
                        </h2>
                        <span
                          className={`sr-badge ${
                            mission.is_active ? "sr-badge-moss" : "sr-badge-neutral"
                          }`}
                        >
                          <span className="sr-badge-dot" aria-hidden="true" />
                          <span>{mission.is_active ? "Đang mở" : "Đang tạm ẩn"}</span>
                        </span>
                        <span className="rounded-full border border-[var(--sr-border)] bg-white px-2.5 py-0.5 text-[11px] font-medium text-[var(--sr-text-secondary)]">
                          {mission.mission_type === "checkin_gps" ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={11} aria-hidden="true" />
                              Check-in GPS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <ShieldCheck size={11} aria-hidden="true" />
                              {mission.eco_activity_label}
                            </span>
                          )}
                        </span>
                      </div>

                      {mission.description && (
                        <p className="text-xs text-[var(--sr-text-secondary)] m-0 leading-relaxed">
                          {mission.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--sr-text-muted)] pt-1">
                        <span className="font-semibold text-[var(--sr-accent-ink)] sr-tabular">
                          +{mission.reward_points} RE-Points
                        </span>
                        {mission.badge_name && (
                          <span className="inline-flex items-center gap-1">
                            <Award size={12} aria-hidden="true" />
                            Huy hiệu: {mission.badge_name}
                          </span>
                        )}
                        {mission.tour_title && (
                          <span>
                            Tuyến: <strong>{mission.tour_title}</strong>
                          </span>
                        )}
                        {mission.target_weight_kg != null && (
                          <span>Mục tiêu: {mission.target_weight_kg} kg</span>
                        )}
                        <span className="sr-tabular">
                          Hoàn thành: <strong>{mission.completed_count}</strong> · Chờ duyệt:{" "}
                          <strong>{mission.pending_count}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={togglingId === mission.id}
                        onClick={() => handleToggleActive(mission)}
                        className="sr-btn sr-btn-secondary sr-btn-sm"
                      >
                        {mission.is_active ? (
                          <>
                            <EyeOff size={13} aria-hidden="true" />
                            <span>Tạm ẩn</span>
                          </>
                        ) : (
                          <>
                            <Eye size={13} aria-hidden="true" />
                            <span>Mở lại</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(mission)}
                        className="sr-btn sr-btn-secondary sr-btn-sm"
                      >
                        <Edit3 size={13} aria-hidden="true" />
                        <span>Sửa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMission(mission)}
                        className="sr-btn sr-btn-destructive-ghost sr-btn-sm"
                        aria-label={`Xóa nhiệm vụ ${mission.title}`}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : !queueItems.length ? (
          <div className="py-10 text-center flex flex-col items-center gap-2">
            <ShieldCheck size={28} className="text-stone-300" aria-hidden="true" />
            <p className="m-0 text-sm font-medium text-[var(--sr-text-primary)]">
              Không có minh chứng đang chờ duyệt
            </p>
            <p className="m-0 text-xs text-[var(--sr-text-muted)]">
              Khi du khách gửi ảnh hoàn thành nhiệm vụ xanh, yêu cầu duyệt sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <div className="sr-grid-2">
            {queueItems.map((item) => {
              const isRejecting = rejectAttemptId === item.id;
              return (
                <article key={item.id} className="sr-card justify-between">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex flex-col gap-1">
                      <h2 className="sr-h2 m-0">{item.title}</h2>
                      <p className="text-xs text-[var(--sr-text-secondary)] m-0">
                        {item.customer?.name} · {item.customer?.email}
                      </p>
                    </div>
                    {item.evidence && (
                      <a
                        className="sr-btn sr-btn-sm sr-btn-secondary shrink-0"
                        href={item.evidence}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Xem ảnh
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-[var(--sr-border)]">
                    <button
                      type="button"
                      disabled={reviewingId === item.id}
                      className="sr-btn sr-btn-sm sr-btn-primary"
                      onClick={() => handleReviewAttempt(item, "approved")}
                    >
                      <Check size={14} aria-hidden="true" />
                      <span>Duyệt</span>
                    </button>
                    <button
                      type="button"
                      disabled={reviewingId === item.id}
                      className="sr-btn sr-btn-sm sr-btn-destructive"
                      onClick={() => {
                        if (isRejecting) {
                          setRejectAttemptId(null);
                          setRejectReason("");
                        } else {
                          setRejectAttemptId(item.id);
                          setRejectReason("");
                        }
                      }}
                    >
                      <XCircle size={14} aria-hidden="true" />
                      <span>Từ chối</span>
                    </button>
                  </div>

                  {isRejecting && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleReviewAttempt(item, "rejected", rejectReason);
                      }}
                      className="flex flex-col gap-2 pt-2 border-t border-[var(--sr-border)]"
                    >
                      <textarea
                        rows={2}
                        required
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Nhập lý do từ chối minh chứng..."
                        className="sr-textarea text-xs bg-white"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRejectAttemptId(null);
                            setRejectReason("");
                          }}
                          className="sr-btn sr-btn-ghost sr-btn-sm"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={reviewingId === item.id}
                          className="sr-btn sr-btn-primary sr-btn-sm"
                        >
                          Xác nhận từ chối
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="sr-modal-backdrop motion-backdrop-enter"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mission-modal-title"
        >
          <section
            className="sr-modal-panel motion-modal-enter"
            style={{ maxWidth: "42rem" }}
          >
            <header className="shrink-0 bg-[var(--sr-bg-surface)] border-b border-[var(--sr-border)] px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <h2 id="mission-modal-title" className="sr-h2 m-0">
                  {editingMissionId ? "Chỉnh sửa nhiệm vụ xanh" : "Tạo nhiệm vụ xanh mới"}
                </h2>
                <p className="text-xs text-[var(--sr-text-muted)] m-0 mt-0.5">
                  Nhiệm vụ được BQL phát hành sẽ hiển thị trực tiếp cho du khách tham gia.
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng hộp thoại"
                onClick={() => setModalOpen(false)}
                className="sr-btn sr-btn-ghost sr-btn-sm shrink-0"
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleSaveMission} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-4">
                {formError && (
                  <div role="alert" className="sr-callout sr-callout-urgent">
                    {formError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--sr-text-primary)]">
                    Tiêu đề nhiệm vụ <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={255}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="VD: Thu gom 1kg rác nhựa tại Bãi Bụt"
                    className="sr-input text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[var(--sr-text-primary)]">
                      Loại nhiệm vụ
                    </label>
                    <select
                      value={form.mission_type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          mission_type: e.target.value,
                          checkpoint_ids: [],
                          target_weight_kg:
                            e.target.value === "eco_action"
                              ? form.target_weight_kg
                              : "",
                        })
                      }
                      className="sr-input text-sm"
                    >
                      {MISSION_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {form.mission_type === "eco_action" ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--sr-text-primary)]">
                        Hoạt động sinh thái
                      </label>
                      <select
                        value={form.eco_activity_type}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            eco_activity_type: e.target.value,
                            target_weight_kg:
                              e.target.value === "trash_pickup"
                                ? form.target_weight_kg
                                : "",
                          })
                        }
                        className="sr-input text-sm"
                      >
                        {ECO_ACTIVITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--sr-text-primary)]">
                        Tuyến tour áp dụng <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={form.tour_id}
                        onChange={(e) =>
                          setForm({ ...form, tour_id: e.target.value, checkpoint_ids: [] })
                        }
                        className="sr-input text-sm"
                      >
                        {selectedTourSelectOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {form.mission_type === "eco_action" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[var(--sr-text-primary)]">
                      Phạm vi / Tuyến tour áp dụng (tùy chọn)
                    </label>
                    <select
                      value={form.tour_id}
                      onChange={(e) =>
                        setForm({ ...form, tour_id: e.target.value })
                      }
                      className="sr-input text-sm"
                    >
                      {selectedTourSelectOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {form.mission_type === "checkin_gps" &&
                  selectedTourObj &&
                  selectedTourObj.checkpoints?.length > 0 && (
                    <div className="flex flex-col gap-2 rounded-xl border border-[var(--sr-border)] p-3.5 bg-[var(--sr-bg-page)]">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-[var(--sr-text-primary)]">
                          Checkpoint GPS đích (chọn từ tuyến {selectedTourObj.title})
                        </span>
                        <span className="text-[11px] text-[var(--sr-text-muted)]">
                          Chọn trạm du khách cần tới để check-in GPS nhận thưởng.
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedTourObj.checkpoints.map((cp) => {
                          const checked = form.checkpoint_ids.includes(cp.id);
                          return (
                            <button
                              key={cp.id}
                              type="button"
                              onClick={() => toggleCheckpoint(cp.id)}
                              className={`rounded-full border px-3 py-1 text-xs cursor-pointer transition ${
                                checked
                                  ? "border-[var(--sr-accent)] bg-[var(--sr-accent-soft)] text-[var(--sr-accent-ink)] font-semibold"
                                  : "border-[var(--sr-border)] bg-white text-[var(--sr-text-secondary)]"
                              }`}
                            >
                              {cp.order_index}. {cp.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                <div
                  className={`grid grid-cols-1 gap-4 ${
                    showWeightGoal ? "sm:grid-cols-3" : "sm:grid-cols-2"
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[var(--sr-text-primary)]">
                      Điểm thưởng (RE-Points) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      required
                      value={form.reward_points}
                      onChange={(e) =>
                        setForm({ ...form, reward_points: e.target.value })
                      }
                      className="sr-input text-sm"
                    />
                  </div>

                  {showWeightGoal && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--sr-text-primary)]">
                        Mục tiêu rác (kg, tùy chọn)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={form.target_weight_kg}
                        onChange={(e) =>
                          setForm({ ...form, target_weight_kg: e.target.value })
                        }
                        placeholder="VD: 1.5"
                        className="sr-input text-sm"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[var(--sr-text-primary)]">
                      Tên huy hiệu đi kèm
                    </label>
                    <input
                      type="text"
                      maxLength={255}
                      value={form.badge_name}
                      onChange={(e) =>
                        setForm({ ...form, badge_name: e.target.value })
                      }
                      placeholder="Mặc định lấy theo tiêu đề"
                      className="sr-input text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[var(--sr-text-primary)]">
                      Hiệu lực từ (tùy chọn)
                    </label>
                    <input
                      type="datetime-local"
                      value={form.valid_from}
                      onChange={(e) =>
                        setForm({ ...form, valid_from: e.target.value })
                      }
                      className="sr-input text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[var(--sr-text-primary)]">
                      Hết hạn lúc (tùy chọn)
                    </label>
                    <input
                      type="datetime-local"
                      value={form.valid_to}
                      onChange={(e) =>
                        setForm({ ...form, valid_to: e.target.value })
                      }
                      className="sr-input text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--sr-text-primary)]">
                    Mô tả &amp; hướng dẫn thực hiện
                  </label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Hướng dẫn chi tiết cách du khách thực hiện và chụp ảnh minh chứng..."
                    className="sr-textarea text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--sr-text-primary)]">
                    Ảnh banner URL (tùy chọn)
                  </label>
                  <input
                    type="url"
                    value={form.banner_url}
                    onChange={(e) =>
                      setForm({ ...form, banner_url: e.target.value })
                    }
                    placeholder="https://..."
                    className="sr-input text-sm"
                  />
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-medium text-[var(--sr-text-primary)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm({ ...form, is_active: e.target.checked })
                    }
                  />
                  <span>Kích hoạt và hiển thị ngay cho du khách</span>
                </label>
              </div>

              <footer className="shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--sr-border)] bg-[var(--sr-bg-surface)]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="sr-btn sr-btn-ghost sr-btn-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="sr-btn sr-btn-primary sr-btn-sm"
                >
                  {saving
                    ? "Đang lưu..."
                    : editingMissionId
                      ? "Lưu thay đổi"
                      : "Tạo nhiệm vụ xanh"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
