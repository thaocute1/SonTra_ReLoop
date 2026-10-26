import React, { useMemo, useState } from "react";
import { Camera, Check, CheckCircle2, ClipboardList, MapPin, Trash2 } from "lucide-react";
import { useUserEco } from "../../../context/UserEcoContext";

const TASK_ICONS = [Trash2, MapPin, ClipboardList];

export default function MissionsFigmaPage() {
  const { tasks = [], completedTasksCount = 0, totalTasksCount = 0, completeTask, isLoadingEco } = useUserEco();
  const [toast, setToast] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [proofName, setProofName] = useState("");
  const [note, setNote] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const displayTasks = useMemo(() => tasks.map((task, index) => ({ ...task, icon: TASK_ICONS[index % TASK_ICONS.length] })), [tasks]);
  const progress = Math.min(100, Math.round((completedTasksCount / Math.max(totalTasksCount, 1)) * 100));

  const claim = async (task, evidence = {}) => {
    if (task.status === "completed") return;
    const result = await completeTask(task.id, evidence);
    setToast(result?.message || result?.error || `Đã ghi nhận nhiệm vụ “${task.title}”.`);
    window.setTimeout(() => setToast(""), 3500);
    return result;
  };

  const submitEvidence = async () => {
    if (!proofFile) {
      setToast("Vui lòng chọn ảnh minh chứng trước khi gửi xác thực.");
      return;
    }
    setSubmitting(true);
    const evidence = { proof_file: proofFile, proof_name: proofFile.name, proof_type: proofFile.type, note: note.trim() };
    try {
      if (navigator.geolocation) {
        const location = await new Promise((resolve) => navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 6000 }));
        if (location) {
          evidence.latitude = location.coords.latitude;
          evidence.longitude = location.coords.longitude;
          evidence.gps_accuracy_m = location.coords.accuracy;
        }
      }
      const result = await claim(selectedTask, evidence);
      if (result?.success) {
        setSelectedTask(null);
        setProofFile(null);
        setProofName("");
        setNote("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (selectedTask) return <div className="figma-screen figma-proof-screen">
    {toast && <div className="figma-toast">{toast}</div>}
    <main className="figma-proof-content">
      <header><h1>{selectedTask.title}</h1><p>Hoàn tất các bước bên dưới để nhận {selectedTask.points} RE-Points.</p></header>
      <div className="figma-proof-grid">
        <section><h2>Ảnh minh chứng</h2><label className="figma-proof-upload"><Camera /><span>{proofName || "Chụp hoặc tải ảnh rác đã gom tại Checkpoint GPS"}</span><b>Chọn ảnh</b><input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0] || null; setProofFile(file); setProofName(file?.name || ""); }} /></label></section>
        <section><div className="figma-location-ok"><CheckCircle2 /> Vị trí GPS sẽ được xác nhận khi gửi</div><label>Ghi chú trải nghiệm<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Chia sẻ cảm nhận của bạn về chuyến đi..." /></label><button type="button" disabled={submitting} onClick={submitEvidence}>{submitting ? "Đang xác thực..." : "Gửi xác thực & nhận Points"}</button></section>
      </div>
    </main>
  </div>;

  return <div className="figma-screen figma-missions-screen">
    {toast && <div className="figma-toast">{toast}</div>}
    <main className="figma-screen-content">
      <section className="figma-mission-hero">
        <div><h2>Hành động nhỏ - Tác động lớn</h2><p>Hoàn thành nhiệm vụ tuần này để nhận thêm RE-Points.</p></div>
        <div className="figma-week-progress"><b>Nhiệm vụ tuần này: {completedTasksCount}/{totalTasksCount}</b><span><i style={{ width: `${progress}%` }} /></span></div>
      </section>
      <section className="figma-mission-grid">
        {isLoadingEco && [0, 1, 2].map((item) => <article key={item} className="figma-skeleton-card" aria-hidden="true"><span /><span /><span /><span /></article>)}
        {!isLoadingEco && displayTasks.length === 0 && <p className="figma-data-state">Hiện chưa có nhiệm vụ xanh đang mở.</p>}
        {displayTasks.map((task) => {
          const Icon = task.icon;
          const done = task.status === "completed";
          return <article key={task.id}>
            <span className="figma-icon-box"><Icon /></span>
            <h3>{task.title}</h3>
            <p>+{task.points} RE-Points</p>
            <button type="button" onClick={() => setSelectedTask(task)} disabled={done}>{done ? <><Check /> Đã hoàn thành</> : "Nhận nhiệm vụ"}</button>
          </article>;
        })}
      </section>
    </main>
  </div>;
}
