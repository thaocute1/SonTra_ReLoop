import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Loader } from "lucide-react";
import RouteMapPicker from "../../../components/common/RouteMapPicker";
import { SaasSelect } from "../../../components/ui/SaasPrimitives";
import { api } from "../../../lib/axios";
import { extractErrorMessage } from "../../../utils/apiError";
import { difficultyLabel } from "../../../lib/chatMessage";

const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80";

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Dễ" },
  { value: "moderate", label: "Trung bình" },
  { value: "challenging", label: "Thử thách" },
];

const TIME_SLOT_OPTIONS = [
  { value: "05:00 - 09:30", label: "05:00 - 09:30 (Đón bình minh)" },
  { value: "06:00 - 10:30", label: "06:00 - 10:30 (Buổi sáng)" },
  { value: "07:30 - 11:30", label: "07:30 - 11:30 (Sáng muộn)" },
  { value: "13:30 - 17:30", label: "13:30 - 17:30 (Buổi chiều)" },
  { value: "14:30 - 18:30", label: "14:30 - 18:30 (Ngắm hoàng hôn)" },
];

const getUpcomingDate = (daysAhead = 2) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0];
};

const STEPS = ["Thông tin", "Lộ trình", "Khởi hành"];

function hashDraft(draft) {
  const raw = JSON.stringify(draft || {});
  let hash = 5381;
  for (let i = 0; i < raw.length; i += 1) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function draftStorageKey(sessionId, messageIndex, index, draft) {
  return `reloop_tour_draft_created:${sessionId || "anon"}:${messageIndex}:${index}:${hashDraft(draft)}`;
}

function readCreated(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Bản nháp trải nghiệm hiển thị ngay trong chat.
 * Cho phép vendor hoàn thiện đủ 3 bước tạo (thông tin → lộ trình/checkpoint →
 * ngày giờ khởi hành) ngay trong chatbox; chỉ gọi API tạo tour khi bấm "Tạo".
 * Chỉ hiện nút hành động khi đây là message mới nhất và chưa tạo.
 * Trạng thái "đã tạo" được lưu localStorage để reload/điều hướng không mở lại form.
 */
export default function TourDraftCard({
  draft = {},
  index = 0,
  messageIndex = 0,
  sessionId = "",
  isLatest = false,
}) {
  const storageKey = useMemo(
    () => draftStorageKey(sessionId, messageIndex, index, draft),
    [sessionId, messageIndex, index, draft],
  );
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => ({
    title: draft.title || "",
    description: draft.description || "",
    difficulty_level: draft.difficulty_level || "moderate",
    duration_hours: draft.duration_hours ?? 4.5,
    price: draft.price ?? 450000,
    max_capacity: draft.max_capacity ?? 15,
    cover_image_url: draft.cover_image_url || DEFAULT_COVER,
    start_point: "Chân dốc Hoàng Sa, Thọ Quang, Đà Nẵng",
    end_point: "Đỉnh Bàn Cờ (độ cao 700m)",
    total_distance_km: 4.5,
    elevation_gain_m: 350,
    checkpoints: [],
    coordinates: [],
    initial_date: getUpcomingDate(2),
    initial_time: "06:00 - 10:30",
    guide_id: "",
  }));
  const [guides, setGuides] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(() => readCreated(storageKey));

  useEffect(() => {
    const stored = readCreated(storageKey);
    if (stored) setCreated(stored);
  }, [storageKey]);

  useEffect(() => {
    let active = true;
    api
      .get("/vendors/guides/")
      .then((response) => {
        if (active) {
          setGuides((response.data?.data || []).filter((g) => g.status === "active"));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const guideOptions = useMemo(
    () => [
      { value: "", label: "Chưa phân công HDV" },
      ...guides.map((g) => ({ value: String(g.id), label: g.name })),
    ],
    [guides],
  );

  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const goNext = () => {
    setError("");
    if (step === 1 && !String(form.title).trim()) {
      setError("Vui lòng nhập tên trải nghiệm.");
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  };

  const goBack = () => {
    setError("");
    setStep((current) => Math.max(1, current - 1));
  };

  const handleCreate = async () => {
    setError("");
    if (!String(form.title).trim()) {
      setError("Vui lòng nhập tên trải nghiệm.");
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 1000) {
      setError("Giá tour phải từ 1.000 đ.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: String(form.title).trim(),
        description:
          String(form.description || "").trim() ||
          "Trải nghiệm trekking sinh thái bán đảo Sơn Trà cùng hướng dẫn viên địa phương.",
        price,
        max_capacity: Number(form.max_capacity) || 15,
        difficulty_level: form.difficulty_level,
        duration_hours: Number(form.duration_hours) || 4.5,
        cover_image_url: form.cover_image_url || DEFAULT_COVER,
        start_point: form.start_point,
        end_point: form.end_point,
        total_distance_km: Number(form.total_distance_km) || 4.5,
        elevation_gain_m: Number(form.elevation_gain_m) || 0,
        checkpoints: form.checkpoints || [],
        coordinates: form.coordinates || [],
        initial_schedule: {
          departure_date: String(form.initial_date).split("-").reverse().join("/"),
          time_slot: form.initial_time,
          guide_id: form.guide_id ? Number(form.guide_id) : null,
        },
      };
      const response = await api.post("/vendors/tours/", payload);
      if (response.data?.status === "success") {
        const createdInfo = response.data.data || { title: payload.title };
        setCreated(createdInfo);
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(createdInfo));
        } catch {
          // localStorage unavailable: in-session state still prevents duplicates.
        }
      } else {
        setError(extractErrorMessage(response, "Không thể tạo trải nghiệm."));
      }
    } catch (err) {
      setError(extractErrorMessage(err, "Không thể tạo trải nghiệm. Vui lòng thử lại."));
    } finally {
      setSaving(false);
    }
  };

  // Đã tạo: chỉ hiện xác nhận, không còn nút tạo.
  if (created) {
    return (
      <div className="flex flex-col gap-2 p-4 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-bg-page)]">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--sr-text-primary)]">
          <CheckCircle2 size={15} className="text-[var(--sr-accent)]" aria-hidden="true" />
          Đã tạo trải nghiệm “{created.title || form.title}”
        </div>
        <p className="text-xs text-[var(--sr-text-muted)] m-0">
          Trải nghiệm đang chờ Ban Quản Lý phê duyệt.
        </p>
      </div>
    );
  }

  // Message cũ hơn (đã có tin nhắn mới) hoặc không phải message mới nhất:
  // bỏ toàn bộ nút hành động, chỉ hiện tóm tắt.
  if (!isLatest) {
    return (
      <div className="flex flex-col gap-1 p-3 rounded-xl border border-dashed border-[var(--sr-border)] bg-[var(--sr-bg-page)] opacity-80">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--sr-text-muted)]">
          <ClipboardList size={13} aria-hidden="true" />
          Bản nháp trải nghiệm
        </div>
        <div className="text-sm font-semibold text-[var(--sr-text-primary)]">
          {form.title || "Trải nghiệm mới"}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--sr-text-muted)]">
          <span>{difficultyLabel(form.difficulty_level)}</span>
          <span>{form.duration_hours} giờ</span>
          <span>{Number(form.price).toLocaleString("vi-VN")} đ</span>
          <span>Tối đa {form.max_capacity} khách</span>
        </div>
        <p className="text-xs text-[var(--sr-text-muted)] m-0">
          Bản nháp đã cũ — hãy nhắn lại để tạo bản nháp mới.
        </p>
      </div>
    );
  }

  return (
    <div
      key={index}
      className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--sr-border)] bg-[var(--sr-bg-page)]"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-[var(--sr-accent-soft)] text-[var(--sr-accent)] inline-flex items-center justify-center">
            <ClipboardList size={13} aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-[var(--sr-text-primary)]">
            Bản nháp trải nghiệm
          </span>
        </div>
        <span className="text-xs text-[var(--sr-text-muted)]">
          Bước {step}/3 · {STEPS[step - 1]}
        </span>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-[var(--sr-text-muted)]">
            Tên trải nghiệm
            <input
              type="text"
              value={form.title}
              onChange={update("title")}
              placeholder="Ví dụ: Trekking Bãi Bắc ngắm bình minh"
              className="px-3 h-9 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-surface)] text-sm text-[var(--sr-text-primary)] outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--sr-text-muted)]">
            Mô tả
            <textarea
              value={form.description}
              onChange={update("description")}
              rows={2}
              placeholder="Mô tả ngắn về trải nghiệm"
              className="px-3 py-2 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-surface)] text-sm text-[var(--sr-text-primary)] outline-none resize-none"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-[var(--sr-text-muted)]">
              Độ khó
              <select
                value={form.difficulty_level}
                onChange={update("difficulty_level")}
                className="px-2 h-9 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-surface)] text-sm text-[var(--sr-text-primary)] outline-none"
              >
                {DIFFICULTY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--sr-text-muted)]">
              Thời lượng (giờ)
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={form.duration_hours}
                onChange={update("duration_hours")}
                className="px-3 h-9 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-surface)] text-sm text-[var(--sr-text-primary)] outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--sr-text-muted)]">
              Giá / khách (đ)
              <input
                type="number"
                min="1000"
                step="1000"
                value={form.price}
                onChange={update("price")}
                className="px-3 h-9 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-surface)] text-sm text-[var(--sr-text-primary)] outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--sr-text-muted)]">
              Sức chứa tối đa
              <input
                type="number"
                min="1"
                max="100"
                value={form.max_capacity}
                onChange={update("max_capacity")}
                className="px-3 h-9 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-surface)] text-sm text-[var(--sr-text-primary)] outline-none"
              />
            </label>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-[var(--sr-text-muted)]">
              Điểm xuất phát
              <input
                type="text"
                value={form.start_point}
                onChange={update("start_point")}
                className="px-3 h-9 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-surface)] text-sm text-[var(--sr-text-primary)] outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--sr-text-muted)]">
              Điểm kết thúc
              <input
                type="text"
                value={form.end_point}
                onChange={update("end_point")}
                className="px-3 h-9 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-surface)] text-sm text-[var(--sr-text-primary)] outline-none"
              />
            </label>
          </div>
          <RouteMapPicker
            checkpoints={form.checkpoints}
            onChange={(updatedCheckpoints) =>
              setForm((prev) => ({ ...prev, checkpoints: updatedCheckpoints }))
            }
            onDistanceChange={(km) => setForm((prev) => ({ ...prev, total_distance_km: km }))}
            onElevationChange={(gain) =>
              setForm((prev) => ({ ...prev, elevation_gain_m: gain }))
            }
            onDetailedRoute={(coords) => setForm((prev) => ({ ...prev, coordinates: coords }))}
            height="300px"
          />
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-[var(--sr-text-muted)]">
            Ngày khởi hành đầu tiên
            <input
              type="date"
              value={form.initial_date}
              onChange={update("initial_date")}
              className="px-3 h-9 rounded-lg border border-[var(--sr-border)] bg-[var(--sr-bg-surface)] text-sm text-[var(--sr-text-primary)] outline-none"
            />
          </label>
          <div className="sr-field">
            <span className="sr-field-label text-xs text-[var(--sr-text-muted)]">
              Khung giờ khởi hành
            </span>
            <SaasSelect
              label=""
              value={form.initial_time}
              options={TIME_SLOT_OPTIONS}
              onChange={(val) => setForm((prev) => ({ ...prev, initial_time: val }))}
            />
          </div>
          <div className="sr-field">
            <span className="sr-field-label text-xs text-[var(--sr-text-muted)]">
              Hướng dẫn viên phụ trách
            </span>
            <SaasSelect
              label=""
              value={String(form.guide_id || "")}
              options={guideOptions}
              onChange={(val) => setForm((prev) => ({ ...prev, guide_id: val }))}
            />
          </div>
        </div>
      )}

      {error && <p className="text-xs text-[var(--sr-danger,#b42318)] m-0">{error}</p>}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="sr-btn sr-btn-secondary sr-btn-sm"
          onClick={goBack}
          disabled={step === 1 || saving}
        >
          Quay lại
        </button>
        {step < 3 ? (
          <button type="button" className="sr-btn sr-btn-primary sr-btn-sm" onClick={goNext}>
            Tiếp tục
          </button>
        ) : (
          <button
            type="button"
            className="sr-btn sr-btn-primary sr-btn-sm inline-flex items-center gap-1"
            onClick={handleCreate}
            disabled={saving}
          >
            {saving ? (
              <Loader size={13} className="animate-spin" aria-hidden="true" />
            ) : (
              <ClipboardList size={13} aria-hidden="true" />
            )}
            <span>{saving ? "Đang tạo..." : "Tạo trải nghiệm"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
