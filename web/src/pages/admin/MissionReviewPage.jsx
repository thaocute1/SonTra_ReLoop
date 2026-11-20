import React, { useEffect, useState } from "react";
import { Check, XCircle } from "lucide-react";
import api from "../../lib/axios";
import { extractErrorMessage } from "../../utils/apiError";
import { PageHeader } from "../../components/ui/SaasPrimitives";

export default function MissionReviewPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const response = await api.get("/challenging/missions/review-queue/");
      setItems(response.data?.results || []);
      setError("");
    } catch (e) {
      setError(e.response?.data?.detail || "Không thể tải hàng chờ duyệt.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const review = async (item, decision) => {
    const reason = decision === "rejected" ? window.prompt("Lý do từ chối:") : "";
    if (decision === "rejected" && reason === null) return;
    try {
      await api.post(`/challenging/missions/attempts/${item.id}/review/`, {
        decision,
        reason,
      });
      setItems((prev) => prev.filter((row) => row.id !== item.id));
    } catch (e) {
      setError(extractErrorMessage(e, "Không thể xử lý minh chứng."));
    }
  };

  return (
    <div className="sr-page">
      <PageHeader
        title="Duyệt nhiệm vụ xanh"
        subtitle="Kiểm tra minh chứng thực địa trước khi cộng điểm thưởng Green Points cho du khách"
      />

      {error && (
        <p role="alert" className="sr-callout sr-callout-urgent m-0">
          {error}
        </p>
      )}

      {!items.length && !error ? (
        <div className="sr-card">
          <p className="m-0 text-sm text-[var(--sr-text-muted)]">
            Không có minh chứng đang chờ duyệt.
          </p>
        </div>
      ) : (
        <div className="sr-grid-2">
          {items.map((item) => (
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
                  className="sr-btn sr-btn-sm sr-btn-primary"
                  onClick={() => review(item, "approved")}
                >
                  <Check size={14} aria-hidden="true" />
                  <span>Duyệt</span>
                </button>
                <button
                  type="button"
                  className="sr-btn sr-btn-sm sr-btn-destructive"
                  onClick={() => review(item, "rejected")}
                >
                  <XCircle size={14} aria-hidden="true" />
                  <span>Từ chối</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
