import React, { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { 
  CheckCircle2,
  Award,
  Menu
} from "lucide-react";

export default function MarketplacePage() {
  const navigate = useNavigate();
  const { openSidebar } = useOutletContext() || {};
  const [userPoints, setUserPoints] = useState(350);
  const [activeTab, setActiveTab] = useState("rewards"); // 'rewards' | 'recycled'
  const [toastMessage, setToastMessage] = useState("");

  // Rewards list
  const rewards = [
    {
      id: 1,
      title: "Giảm 20% Tour Lặn Ngắm San Hô",
      points: 150,
      image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80",
      tag: "Voucher",
    },
    {
      id: 2,
      title: "Túi Canvas Sơn Trà RELoop",
      points: 200,
      image: "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=400&q=80",
      tag: "Túi canvas",
    },
  ];

  // Recycled Products list
  const recycledProducts = [
    {
      id: 101,
      title: "Móc khóa Voọc chà vá tái chế",
      price: "45.000đ",
      points: 80,
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
      tag: "Móc khóa",
    },
    {
      id: 102,
      title: "Trà thảo mộc Sơn Trà",
      price: "65.000đ",
      points: 120,
      image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80",
      tag: "Trà thảo mộc",
    },
    {
      id: 103,
      title: "Túi vải tái chế Sơn Trà",
      price: "90.000đ",
      points: 160,
      image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80",
      tag: "Túi vải",
    },
    {
      id: 104,
      title: "Sổ tay giấy tái chế",
      price: "35.000đ",
      points: 60,
      image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80",
      tag: "Sổ tay",
    },
  ];

  const handleRedeem = (itemTitle, requiredPoints) => {
    if (userPoints >= requiredPoints) {
      setUserPoints((prev) => prev - requiredPoints);
      setToastMessage(`Đổi thành công "${itemTitle}" với ${requiredPoints} RE-Points! 🎉`);
    } else {
      setToastMessage(`Bạn cần thêm ${requiredPoints - userPoints} RE-Points nữa để đổi quà này!`);
    }
    setTimeout(() => setToastMessage(""), 4500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-[#2F3A35] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#4A6B5D] animate-fade-in font-be-vietnam">
          <CheckCircle2 className="w-5 h-5 text-[#8DA696] shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="w-full border-b border-[#E9EFEC] bg-white sticky top-0 z-30">
        <div className="flex justify-between items-center w-full max-w-7xl mx-auto py-6 px-6 sm:px-10 gap-4">
          <div className="flex items-center gap-3">
            {openSidebar && (
              <button
                type="button"
                className="lg:hidden p-2 bg-[#F7F5F0] text-[#2D3732] rounded-xl border-0 cursor-pointer"
                onClick={openSidebar}
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-[#2D3732] text-xl sm:text-[22px] font-bold tracking-tight font-fraunces m-0">
              Đổi thưởng &amp; Sản phẩm Xanh
            </h1>
            </div>

            {/* Top Right Navigation Tabs */}
            <div className="flex items-center bg-[#F7F5F0] p-1 rounded-full border border-[#E2E8E4]">
              <button
                type="button"
                onClick={() => setActiveTab("rewards")}
                className={`py-2 px-5 rounded-full text-xs font-bold font-be-vietnam transition-all border-0 cursor-pointer ${
                  activeTab === "rewards"
                    ? "bg-white text-[#2D3732] shadow-sm"
                    : "bg-transparent text-[#6B7A72] hover:text-[#2D3732]"
                }`}
              >
                Đổi phần thưởng
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("recycled")}
                className={`py-2 px-5 rounded-full text-xs font-bold font-be-vietnam transition-all border-0 cursor-pointer ${
                  activeTab === "recycled"
                    ? "bg-white text-[#2D3732] shadow-sm"
                    : "bg-transparent text-[#6B7A72] hover:text-[#2D3732]"
                }`}
              >
                Sản phẩm Tái chế
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex flex-col w-full max-w-7xl mx-auto p-6 sm:p-10 gap-10">
          
          {/* Section 1: Ưu đãi dành cho bạn */}
          {(activeTab === "rewards" || activeTab === "all") && (
            <section className="flex flex-col gap-5">
              <h2 className="text-[#2D3732] text-xl sm:text-[22px] font-bold tracking-tight font-fraunces m-0">
                Ưu đãi dành cho bạn
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rewards.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center bg-white p-4 gap-5 rounded-3xl border border-[#E2E8E4] hover:shadow-md transition-shadow group"
                  >
                    {/* Thumbnail / Badge */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-[#F7F5F0] rounded-2xl flex flex-col items-center justify-center border border-[#E2E8E4] shrink-0 relative overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                      />
                      <span className="absolute text-[#6B7A72] text-xs font-medium font-be-vietnam bg-[#F7F5F0]/90 px-2 py-1 rounded-lg">
                        {item.tag}
                      </span>
                    </div>

                    {/* Reward Details */}
                    <div className="flex-1 flex flex-col justify-between py-1 gap-2">
                      <h3 className="text-[#2D3732] text-base font-bold font-fraunces m-0 line-clamp-2">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[#4A6B5D] text-sm font-bold font-be-vietnam">
                        <Award className="w-4 h-4" />
                        <span>{item.points} Points</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRedeem(item.title, item.points)}
                        className="w-fit bg-[#4A6B5D] hover:bg-[#3d594d] text-white text-xs font-bold py-2 px-4 rounded-full transition-colors cursor-pointer border-0 font-be-vietnam mt-1"
                      >
                        Đổi ngay
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 2: Sản phẩm Tái chế */}
          {(activeTab === "recycled" || activeTab === "all" || activeTab === "rewards") && (
            <section className="flex flex-col gap-5">
              <h2 className="text-[#2D3732] text-xl sm:text-[22px] font-bold tracking-tight font-fraunces m-0">
                Sản phẩm Tái chế
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {recycledProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex flex-col bg-white p-4 gap-4 rounded-3xl border border-[#E2E8E4] hover:shadow-md transition-shadow group"
                  >
                    {/* Product Image */}
                    <div className="w-full h-40 bg-[#F7F5F0] rounded-2xl flex flex-col items-center justify-center border border-[#E2E8E4] relative overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                      />
                      <span className="text-[#6B7A72] text-xs font-medium font-be-vietnam bg-[#F7F5F0]/80 px-2 py-1 rounded-lg">
                        {product.tag}
                      </span>
                    </div>

                    {/* Product Details */}
                    <div className="flex flex-col gap-2 flex-1 justify-between">
                      <h3 className="text-[#2D3732] text-sm font-bold font-fraunces m-0 line-clamp-2">
                        {product.title}
                      </h3>
                      
                      <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
                        <span className="text-[#2D3732] text-base font-bold font-fraunces">
                          {product.price}
                        </span>
                        <span className="text-[#6B7A72] text-xs font-medium font-be-vietnam">
                          / {product.points} Pt
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRedeem(product.title, product.points)}
                        className="w-full bg-[#E9EFEC] hover:bg-[#4A6B5D] hover:text-white text-[#4A6B5D] text-xs font-bold py-2.5 rounded-full transition-colors cursor-pointer border-0 font-be-vietnam mt-2"
                      >
                        Đổi / Đặt hàng
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </main>
    </div>
  );
}
