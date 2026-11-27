import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Copy, HeartHandshake } from "lucide-react";
import { api } from "../../../lib/axios";
import { useUserEco } from "../../../context/UserEcoContext";
import rewardService from "../../../services/rewardService";
import { PageHeader } from "../../../components/ui/SaasPrimitives";
import { extractErrorMessage } from "../../../utils/apiError";

export default function MarketplaceFigmaPage() {
  const navigate = useNavigate();
  const { points = 0, updatePoints, refreshEcoData } = useUserEco();

  const [tab, setTab] = useState("all");
  const [toast, setToast] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [items, setItems] = useState([]);
  const [myVouchers, setMyVouchers] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [donationProjects, setDonationProjects] = useState([]);
  const [userDonatedPoints, setUserDonatedPoints] = useState(0);
  const [userDonationsCount, setUserDonationsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState(null);
  const [donatingCode, setDonatingCode] = useState(null);

  const loadRewardData = useCallback(async () => {
    setLoading(true);
    const [rewardsRes, vouchersRes, ledgerRes, donateRes] = await Promise.allSettled([
      rewardService.fetchRewards(),
      rewardService.fetchMyVouchers(),
      rewardService.fetchPointsLedger(),
      api.get("/gamification/rewards/donate/"),
    ]);

    if (rewardsRes.status === "fulfilled" && Array.isArray(rewardsRes.value)) {
      setItems(rewardsRes.value);
    } else {
      setItems([]);
    }
    if (vouchersRes.status === "fulfilled" && Array.isArray(vouchersRes.value)) {
      setMyVouchers(vouchersRes.value);
    } else {
      setMyVouchers([]);
    }
    if (ledgerRes.status === "fulfilled" && Array.isArray(ledgerRes.value)) {
      setLedger(ledgerRes.value);
    } else {
      setLedger([]);
    }
    if (donateRes.status === "fulfilled" && donateRes.value?.data) {
      const d = donateRes.value.data;
      setDonationProjects(Array.isArray(d.projects) ? d.projects : []);
      setUserDonatedPoints(Number(d.user_donated_points || 0));
      setUserDonationsCount(Number(d.user_donations_count || 0));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRewardData();
  }, [loadRewardData]);

  const usableVouchers = useMemo(
    () => myVouchers.filter((v) => v.type !== "donation"),
    [myVouchers]
  );

  const filteredCatalog = useMemo(() => {
    if (tab === "vouchers") return items.filter((item) => item.type !== "gift" && item.type !== "donation");
    if (tab === "gifts") return items.filter((item) => item.type === "gift");
    return items.filter((item) => item.type !== "donation");
  }, [items, tab]);

  const handleDonate = async (project) => {
    const required = Number(project.points_required || 0);
    if (points < required) {
      showToast(`Bạn cần thêm ${required - points} RE-Points để quyên góp cho dự án này.`);
      return;
    }
    setDonatingCode(project.code);
    try {
      const res = await api.post("/gamification/rewards/donate/", {
        project_code: project.code,
      });
      if (typeof res.data?.new_total_points === "number") {
        updatePoints(res.data.new_total_points);
      }
      showToast(
        res.data?.message || `Đã quyên góp ${required} RE-Points cho "${project.title}"!`
      );
      refreshEcoData();
      loadRewardData();
    } catch (err) {
      showToast(extractErrorMessage(err, "Không thể thực hiện quyên góp lúc này."));
    } finally {
      setDonatingCode(null);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 3500);
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(""), 2000);
  };

  const handleRedeem = async (item) => {
    const required = Number(item.points_required || 0);
    if (points < required) {
      showToast(`Bạn cần thêm ${required - points} RE-Points để đổi ưu đãi này.`);
      return;
    }
    setRedeemingId(item.id);
    const result = await rewardService.redeemReward(item.id);
    if (result.success) {
      if (typeof result.data?.new_total_points === "number") {
        updatePoints(result.data.new_total_points);
      }
      showToast(result.data?.message || `Đã đổi "${item.title}" thành công.`);
      refreshEcoData();
      loadRewardData();
    } else {
      showToast(result.error);
    }
    setRedeemingId(null);
  };

  const breakdownRows = useMemo(() => {
    const earned = ledger.filter((row) => Number(row.points_change || 0) > 0);
    let missionPts = 0;
    let communityPts = 0;
    let otherPts = 0;
    for (const row of earned) {
      const ref = String(row.reference_type || "");
      const amt = Number(row.points_change || 0);
      if (ref.includes("challenge") || ref.includes("mission")) {
        missionPts += amt;
      } else if (ref.includes("community") || ref.includes("trash") || ref.includes("cleanup")) {
        communityPts += amt;
      } else {
        otherPts += amt;
      }
    }
    const totalEarned = Math.max(1, missionPts + communityPts + otherPts);
    const hasLedger = earned.length > 0;
    return [
      {
        label: "Nhiệm vụ & Check-in GPS",
        pts: missionPts,
        pct: hasLedger ? Math.round((missionPts / totalEarned) * 100) : 0,
      },
      {
        label: "Cộng đồng & Thu gom rác",
        pts: communityPts,
        pct: hasLedger ? Math.round((communityPts / totalEarned) * 100) : 0,
      },
      {
        label: "Ưu đãi & Hoạt động khác",
        pts: otherPts,
        pct: hasLedger ? Math.round((otherPts / totalEarned) * 100) : 0,
      },
    ];
  }, [ledger]);

  return (
    <div className="sr-page">
      <PageHeader
        title="Điểm thưởng & Voucher"
        subtitle="Theo dõi số dư RE-Points, quản lý mã ưu đãi và đổi quà sinh thái"
        actions={
          toast && (
            <div
              role="status"
              className="px-3 py-1.5 rounded-lg bg-[var(--sr-accent-soft)] text-[var(--sr-accent)] text-xs font-medium"
            >
              {toast}
            </div>
          )
        }
      />

      {/* Band 1: Highlighted Points Balance & Owned Vouchers */}
      <section className="sr-hero-split" aria-label="Số dư điểm và voucher đang sở hữu">
        <div className="flex flex-col justify-between gap-4 min-w-[var(--sr-sidebar-w)] lg:w-80 lg:pr-8 lg:border-r lg:border-[var(--sr-border)]">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--sr-text-muted)]">
              Tổng điểm RE-Points khả dụng
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight sr-tabular">
                {Number(points || 0).toLocaleString("vi-VN")}
              </span>
              <span className="text-xs font-medium text-[var(--sr-accent)]">Eco-Guardian</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {breakdownRows.map((row) => (
              <div key={row.label} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--sr-text-secondary)]">{row.label}</span>
                  <span className="font-medium sr-tabular">{row.pts} pts</span>
                </div>
                <div className="sr-progress-track">
                  <div className="sr-progress-fill" style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="sr-h2">Voucher đang sở hữu ({usableVouchers.length})</h2>
            <span className="text-xs text-[var(--sr-text-muted)]">
              Áp dụng trực tiếp ở bước đặt tour
            </span>
          </div>

          {loading ? (
            <div className="sr-surface text-sm text-[var(--sr-text-muted)]">
              Đang tải voucher của bạn...
            </div>
          ) : usableVouchers.length === 0 ? (
            <div className="sr-surface text-sm text-[var(--sr-text-muted)]">
              Bạn chưa sở hữu voucher nào. Hãy đổi điểm từ kho ưu đãi bên dưới.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {usableVouchers.slice(0, 4).map((voucher) => {
                const code = voucher.code || `SR-${voucher.id}`;
                const isCopied = copiedCode === code;
                return (
                  <article key={voucher.id} className="sr-voucher-card">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-[var(--sr-accent)] sr-tabular">
                        {code}
                      </span>
                      <h3 className="sr-h2">{voucher.title || voucher.reward_title}</h3>
                      <p className="text-xs text-[var(--sr-text-muted)] m-0">
                        {voucher.expires_at ? `HSD: ${voucher.expires_at}` : "Còn hiệu lực"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="sr-btn sr-btn-secondary sr-btn-sm flex-1"
                        onClick={() => handleCopyCode(code)}
                      >
                        {isCopied ? (
                          <>
                            <Check size={13} aria-hidden="true" />
                            <span>Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} aria-hidden="true" />
                            <span>Sao chép mã</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="sr-btn sr-btn-primary sr-btn-sm flex-1"
                        onClick={() => navigate("/dashboard/trekking")}
                      >
                        Dùng ngay
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Band 2: Redemption Catalog */}
      <section className="flex flex-col gap-4 pt-5 border-t border-[var(--sr-border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="sr-h2">Kho đổi thưởng &amp; Quyên góp Bảo tồn</h2>
          <div className="sr-tabs" role="tablist" aria-label="Danh mục đổi thưởng">
            {[
              ["all", `Tất cả (${items.filter((it) => it.type !== "donation").length})`],
              ["vouchers", "Voucher giảm giá tour"],
              ["gifts", "Quà tặng sinh thái"],
              ["donations", `Quyên góp Bảo tồn (${donationProjects.length})`],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`sr-tab ${tab === id ? "is-selected" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === "donations" ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-[var(--sr-border-strong)] bg-[var(--sr-accent-soft)] px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-[var(--sr-accent-ink)] font-semibold">
                <HeartHandshake size={16} aria-hidden="true" />
                <span>
                  Dùng điểm RE-Points đóng góp trực tiếp cho các dự án phục hồi rừng và bảo vệ Voọc chà vá tại Sơn Trà.
                </span>
              </div>
              <span className="font-semibold text-[var(--sr-accent)] sr-tabular">
                Bạn đã đóng góp: {userDonatedPoints.toLocaleString("vi-VN")} pts ({userDonationsCount} lượt)
              </span>
            </div>

            {donationProjects.length === 0 ? (
              <div className="sr-surface text-sm text-[var(--sr-text-muted)]">
                Đang tải danh sách dự án bảo tồn...
              </div>
            ) : (
              <div className="sr-voucher-grid">
                {donationProjects.map((project) => {
                  const required = Number(project.points_required || 0);
                  const canAfford = points >= required;
                  const shortage = Math.max(0, required - points);
                  return (
                    <article key={project.code} className="sr-voucher-card">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-[var(--sr-accent)] sr-tabular">
                          {required.toLocaleString("vi-VN")} RE-Points · {project.impact_label}
                        </span>
                        <h3 className="sr-h2">{project.title}</h3>
                        <p className="text-xs text-[var(--sr-text-muted)] m-0">
                          {project.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        className={
                          canAfford
                            ? "sr-btn sr-btn-primary sr-btn-sm sr-btn-block"
                            : "sr-btn sr-btn-sm sr-btn-block bg-[var(--sr-bg-subtle)] text-[var(--sr-text-muted)] border border-transparent"
                        }
                        disabled={!canAfford || donatingCode === project.code}
                        onClick={() => handleDonate(project)}
                      >
                        {donatingCode === project.code
                          ? "Đang ghi nhận..."
                          : canAfford
                          ? "Quyên góp ngay"
                          : `Thiếu ${shortage.toLocaleString("vi-VN")} điểm`}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="sr-surface text-sm text-[var(--sr-text-muted)]">
            Đang tải danh sách ưu đãi...
          </div>
        ) : filteredCatalog.length === 0 ? (
          <div className="sr-surface text-sm text-[var(--sr-text-muted)]">
            Hiện chưa có ưu đãi nào đang mở đổi trong mục này.
          </div>
        ) : (
          <div className="sr-voucher-grid">
            {filteredCatalog.map((item) => {
              const required = Number(item.points_required || 0);
              const canAfford = points >= required;
              const shortage = Math.max(0, required - points);
              return (
                <article key={item.id} className="sr-voucher-card">
                  <div className="flex flex-col gap-1.5">
                    <span
                      className={`text-xs font-semibold sr-tabular ${
                        canAfford ? "text-[var(--sr-accent)]" : "text-[var(--sr-text-muted)]"
                      }`}
                    >
                      {required.toLocaleString("vi-VN")} RE-Points
                    </span>
                    <h3 className="sr-h2">{item.title}</h3>
                    <p className="text-xs text-[var(--sr-text-muted)] m-0">
                      {item.description ||
                        item.pickup_location ||
                        "Áp dụng cho các tuyến trekking đang mở trên Sơn Trà ReLoop."}
                    </p>
                  </div>

                  <button
                    type="button"
                    className={
                      canAfford
                        ? "sr-btn sr-btn-secondary sr-btn-sm sr-btn-block"
                        : "sr-btn sr-btn-sm sr-btn-block bg-[var(--sr-bg-subtle)] text-[var(--sr-text-muted)] border border-transparent"
                    }
                    disabled={!canAfford || redeemingId === item.id}
                    onClick={() => handleRedeem(item)}
                  >
                    {redeemingId === item.id
                      ? "Đang xử lý..."
                      : canAfford
                      ? "Đổi ngay"
                      : `Thiếu ${shortage.toLocaleString("vi-VN")} điểm`}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Band 3: Clean Borderless Transaction History */}
      <section className="flex flex-col gap-3 pt-5 border-t border-[var(--sr-border)]">
        <h2 className="sr-h2">Lịch sử giao dịch điểm gần đây</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-[var(--sr-text-muted)]">
            Chưa có giao dịch điểm thưởng nào được ghi nhận.
          </p>
        ) : (
          <div className="sr-table-wrap">
            <table className="sr-table">
              <caption className="sr-only">Lịch sử giao dịch điểm thưởng RE-Points</caption>
              <thead>
                <tr>
                  <th scope="col">Nội dung giao dịch</th>
                  <th scope="col" className="sr-hide-mobile">Loại</th>
                  <th scope="col" className="sr-hide-mobile">Thời gian</th>
                  <th scope="col">Biến động</th>
                </tr>
              </thead>
              <tbody>
                {ledger.slice(0, 6).map((entry) => {
                  const delta = Number(entry.points_change || entry.amount || 0);
                  const isPlus = delta >= 0;
                  return (
                    <tr key={entry.id}>
                      <td className="font-medium text-[var(--sr-text-primary)]">
                        {entry.description || entry.reason || "Giao dịch RE-Points"}
                      </td>
                      <td className="sr-hide-mobile">{entry.source || "Hệ thống"}</td>
                      <td className="sr-hide-mobile sr-tabular">
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleDateString("vi-VN")
                          : "Gần đây"}
                      </td>
                      <td
                        className={`font-semibold sr-tabular ${
                          isPlus ? "text-[var(--sr-accent)]" : "text-[var(--sr-text-secondary)]"
                        }`}
                      >
                        {isPlus ? `+${delta}` : delta} pts
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
