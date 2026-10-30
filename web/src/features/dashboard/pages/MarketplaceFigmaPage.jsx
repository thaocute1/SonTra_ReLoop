import React, { useEffect, useMemo, useState } from "react";
import { useUserEco } from "../../../context/UserEcoContext";
import rewardService from "../../../services/rewardService";

export default function MarketplaceFigmaPage() {
  const { points = 0, updatePoints, refreshEcoData } = useUserEco();
  const [tab, setTab] = useState("rewards");
  const [toast, setToast] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    rewardService.fetchRewards().then((data) => {
      if (mounted) setItems(Array.isArray(data) ? data : []);
    }).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const vouchers = useMemo(() => items.filter((item) => item.type !== "gift"), [items]);
  const products = useMemo(() => items.filter((item) => item.type === "gift"), [items]);

  const choose = async (item) => {
    const required = Number(item.points_required || 0);
    if (points < required) {
      setToast(`Bạn cần ${required - points} RE-Points nữa để đổi phần thưởng này.`);
      window.setTimeout(() => setToast(""), 3500);
      return;
    }
    if (!window.confirm(`Đổi “${item.title}” bằng ${required} RE-Points?`)) return;
    setRedeemingId(item.id);
    const result = await rewardService.redeemReward(item.id);
    if (result.success) {
      updatePoints(result.data.new_total_points);
      setToast(result.data.message || `Đã đổi “${item.title}” thành công.`);
      refreshEcoData();
    } else {
      setToast(result.error);
    }
    setRedeemingId(null);
    window.setTimeout(() => setToast(""), 4000);
  };

  return <div className="figma-screen figma-market-screen">
    {toast && <div className="figma-toast">{toast}</div>}
    <div className="figma-market-tabs" role="tablist">
      <button className={tab === "rewards" ? "active" : ""} onClick={() => setTab("rewards")}>Đổi phần thưởng</button>
      <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>Sản phẩm tái chế</button>
    </div>
    <main className="figma-screen-content">
      {tab === "rewards" && <section>
        <h2>Ưu đãi dành cho bạn</h2>
        <div className="figma-voucher-grid">
          {loading && [0, 1, 2].map((item) => <article key={item} className="figma-skeleton-card" aria-hidden="true"><span /><span /><span /></article>)}
          {!loading && vouchers.length === 0 && <p className="figma-data-state">Hiện chưa có voucher đang mở đổi.</p>}
          {vouchers.map((reward) => <button key={reward.id} type="button" disabled={redeemingId === reward.id} onClick={() => choose(reward)}><span>{reward.discount_badge || "Voucher"}</span><div><h3>{reward.title}</h3><b>{reward.points_required} RE-Points</b></div></button>)}
        </div>
      </section>}
      {tab === "products" && <section>
        <h2>Sản phẩm tái chế</h2>
        <div className="figma-product-grid">
          {loading && [0, 1, 2, 3].map((item) => <article key={item} className="figma-skeleton-card" aria-hidden="true"><span /><span /><span /></article>)}
          {!loading && products.length === 0 && <p className="figma-data-state">Hiện chưa có sản phẩm tái chế đang mở đổi.</p>}
          {products.map((product) => <button key={product.id} type="button" disabled={redeemingId === product.id} onClick={() => choose(product)}><span>{product.image ? <img src={product.image} alt="" /> : "Quà xanh"}</span><h3>{product.title}</h3><div><b>{product.pickup_location || "Nhận tại trạm"}</b><small>/ {product.points_required} Pt</small></div></button>)}
        </div>
      </section>}
    </main>
  </div>;
}
