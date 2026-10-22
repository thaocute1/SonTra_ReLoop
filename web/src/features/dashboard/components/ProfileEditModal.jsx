import React, { useState, useEffect } from "react";
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  ShieldAlert, 
  Activity, 
  HeartHandshake, 
  CheckCircle, 
  AlertCircle,
  Camera,
  Sparkles
} from "lucide-react";
import authService from "../../auth/api/authService";

// Bộ sưu tập 6 avatar linh vật Sơn Trà
const PRESET_AVATARS = [
  {
    id: "vooc",
    name: "Voọc Chà Vá",
    role: "Nữ hoàng linh trưởng",
    url: "https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?auto=format&fit=crop&w=200&q=80"
  },
  {
    id: "eagle",
    name: "Đại Bàng Biển",
    role: "Chúa tể bầu trời",
    url: "https://images.unsplash.com/photo-1611689342806-0863700ce1e4?auto=format&fit=crop&w=200&q=80"
  },
  {
    id: "banyan",
    name: "Cây Đa Ngàn Năm",
    role: "Linh hồn Sơn Trà",
    url: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=200&q=80"
  },
  {
    id: "turtle",
    name: "Rùa Biển Bãi Bắc",
    role: "Sứ giả đại dương",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=200&q=80"
  },
  {
    id: "coral",
    name: "San Hô Hòn Sụp",
    role: "Rạn ngọc sinh thái",
    url: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=200&q=80"
  },
  {
    id: "ranger",
    name: "Kiểm Lâm Sơn Trà",
    role: "Người gác rừng",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
  }
];

export default function ProfileEditModal({ isOpen, onClose, currentUser, onProfileUpdated }) {
  const [activeTab, setActiveTab] = useState("basic"); // 'basic' | 'safety' | 'security'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    avatar_url: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    fitness_level: "moderate",
    medical_notes: "",
    old_password: "",
    new_password: "",
    confirm_password: ""
  });

  useEffect(() => {
    if (isOpen && currentUser) {
      setFormData({
        name: currentUser.name || "",
        phone: currentUser.phone || "",
        avatar_url: currentUser.avatar_url || "",
        emergency_contact_name: currentUser.emergency_contact_name || currentUser.raw_user_meta_data?.emergency_contact_name || "",
        emergency_contact_phone: currentUser.emergency_contact_phone || currentUser.raw_user_meta_data?.emergency_contact_phone || "",
        fitness_level: currentUser.fitness_level || currentUser.raw_user_meta_data?.fitness_level || "moderate",
        medical_notes: currentUser.medical_notes || currentUser.raw_user_meta_data?.medical_notes || "",
        old_password: "",
        new_password: "",
        confirm_password: ""
      });
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectAvatar = (url) => {
    setFormData((prev) => ({ ...prev, avatar_url: url }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Validate password if user entered one
    if (formData.new_password) {
      if (formData.new_password.length < 6) {
        setErrorMsg("Mật khẩu mới phải có ít nhất 6 ký tự.");
        return;
      }
      if (formData.new_password !== formData.confirm_password) {
        setErrorMsg("Mật khẩu xác nhận không khớp với mật khẩu mới.");
        return;
      }
      if (!formData.old_password) {
        setErrorMsg("Vui lòng nhập mật khẩu hiện tại để xác nhận đổi mật khẩu.");
        return;
      }
    }

    // Phone format basic check
    if (formData.phone && !/^\+?[0-9]{9,15}$/.test(formData.phone.replace(/[\s\-\.]/g, ""))) {
      setErrorMsg("Số điện thoại không hợp lệ (từ 9 đến 15 chữ số).");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        avatar_url: formData.avatar_url.trim(),
        emergency_contact_name: formData.emergency_contact_name.trim(),
        emergency_contact_phone: formData.emergency_contact_phone.trim(),
        fitness_level: formData.fitness_level,
        medical_notes: formData.medical_notes.trim()
      };

      if (formData.new_password) {
        payload.old_password = formData.old_password;
        payload.new_password = formData.new_password;
      }

      const res = await authService.updateProfile(payload);
      setSuccessMsg("Cập nhật hồ sơ thành công!");
      
      if (onProfileUpdated && res?.user) {
        onProfileUpdated(res.user);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Profile update error:", err);
      let msg = "Có lỗi xảy ra khi cập nhật hồ sơ.";
      if (typeof err === "string") {
        msg = err;
      } else if (err?.old_password) {
        msg = Array.isArray(err.old_password) ? err.old_password[0] : err.old_password;
      } else if (err?.phone) {
        msg = Array.isArray(err.phone) ? err.phone[0] : err.phone;
      } else if (err?.message) {
        msg = err.message;
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-be-vietnam animate-fade-in">
      <div 
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-[#E2E8E4] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#E2E8E4] bg-[#F7F5F0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E9EFEC] text-[#4A6B5D] flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[#2D3732] text-lg font-bold font-fraunces m-0">
                Chỉnh Sửa Hồ Sơ Cá Nhân
              </h2>
              <p className="text-xs text-[#6B7A72] m-0">
                Cập nhật thông tin nhận diện, an toàn dã ngoại và bảo mật
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#6B7A72] hover:bg-[#E9EFEC] hover:text-[#2D3732] border-0 bg-transparent cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E2E8E4] bg-white px-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer bg-transparent border-t-0 border-x-0 ${
              activeTab === "basic" 
                ? "border-[#4A6B5D] text-[#4A6B5D]" 
                : "border-transparent text-[#6B7A72] hover:text-[#2D3732]"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Thông Tin Cơ Bản</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("safety")}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer bg-transparent border-t-0 border-x-0 ${
              activeTab === "safety" 
                ? "border-[#4A6B5D] text-[#4A6B5D]" 
                : "border-transparent text-[#6B7A72] hover:text-[#2D3732]"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>An Toàn & Y Tế</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer bg-transparent border-t-0 border-x-0 ${
              activeTab === "security" 
                ? "border-[#4A6B5D] text-[#4A6B5D]" 
                : "border-transparent text-[#6B7A72] hover:text-[#2D3732]"
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Đổi Mật Khẩu</span>
          </button>
        </div>

        {/* Notifications */}
        <div className="px-6 pt-3">
          {errorMsg && (
            <div className="flex items-center gap-2.5 bg-red-50 text-red-700 p-3 rounded-2xl text-xs border border-red-200 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2.5 bg-[#E9EFEC] text-[#24533F] p-3 rounded-2xl text-xs border border-[#4A6B5D]/30 animate-fade-in">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* TAB 1: BASIC INFO */}
          {activeTab === "basic" && (
            <div className="flex flex-col gap-5">
              {/* Avatar Selector Section */}
              <div className="flex flex-col gap-3 bg-[#F7F5F0] p-4 rounded-2xl border border-[#E2E8E4]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2D3732] flex items-center gap-1.5 font-fraunces">
                    <Sparkles className="w-4 h-4 text-[#4A6B5D]" />
                    Ảnh đại diện hoặc Avatar Linh vật Sơn Trà
                  </span>
                  {formData.avatar_url && (
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, avatar_url: "" }))}
                      className="text-[11px] text-[#B8442C] hover:underline bg-transparent border-0 cursor-pointer"
                    >
                      Dùng chữ cái mặc định
                    </button>
                  )}
                </div>

                {/* Live Preview & Presets */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-18 h-18 rounded-2xl overflow-hidden bg-white border-2 border-[#4A6B5D] flex items-center justify-center shrink-0 shadow-xs">
                    {formData.avatar_url ? (
                      <img 
                        src={formData.avatar_url} 
                        alt="Avatar preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?auto=format&fit=crop&w=200&q=80";
                        }}
                      />
                    ) : (
                      <span className="font-fraunces text-xl font-bold text-[#4A6B5D]">
                        {(formData.name || "U").substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 grid grid-cols-3 sm:grid-cols-6 gap-2 w-full">
                    {PRESET_AVATARS.map((avatar) => {
                      const isSelected = formData.avatar_url === avatar.url;
                      return (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => handleSelectAvatar(avatar.url)}
                          title={`${avatar.name} (${avatar.role})`}
                          className={`flex flex-col items-center gap-1 p-1 rounded-xl border transition-all cursor-pointer bg-white ${
                            isSelected 
                              ? "border-[#4A6B5D] ring-2 ring-[#4A6B5D]/30" 
                              : "border-[#E2E8E4] hover:border-[#8DA696]"
                          }`}
                        >
                          <img 
                            src={avatar.url} 
                            alt={avatar.name} 
                            className="w-10 h-10 rounded-lg object-cover" 
                          />
                          <span className="text-[10px] font-medium text-[#2D3732] truncate max-w-full">
                            {avatar.name.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Avatar URL Input */}
                <div className="flex items-center gap-2 mt-1">
                  <Camera className="w-4 h-4 text-[#6B7A72] shrink-0" />
                  <input
                    type="url"
                    name="avatar_url"
                    value={formData.avatar_url}
                    onChange={handleChange}
                    placeholder="Hoặc dán URL ảnh đại diện tùy chỉnh (https://...)"
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E2E8E4] bg-white text-[#2D3732] outline-none focus:border-[#4A6B5D]"
                  />
                </div>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#2D3732] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#4A6B5D]" />
                    Họ và tên <span className="text-[#B8442C]">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="p-3 text-xs rounded-2xl border border-[#E2E8E4] bg-white text-[#2D3732] outline-none focus:border-[#4A6B5D]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#2D3732] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#4A6B5D]" />
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Ví dụ: 0905123456"
                    className="p-3 text-xs rounded-2xl border border-[#E2E8E4] bg-white text-[#2D3732] outline-none focus:border-[#4A6B5D]"
                  />
                </div>
              </div>

              {/* Email (Readonly) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#2D3732] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#4A6B5D]" />
                    Địa chỉ Email (Định danh tài khoản)
                  </label>
                  <span className="text-[10px] text-[#4A6B5D] bg-[#E9EFEC] px-2 py-0.5 rounded-full font-bold">
                    Khóa bảo mật
                  </span>
                </div>
                <input
                  type="email"
                  disabled
                  value={currentUser?.email || "Chưa thiết lập email"}
                  className="p-3 text-xs rounded-2xl border border-[#E2E8E4] bg-[#F7F5F0] text-[#6B7A72] cursor-not-allowed"
                />
                <p className="text-[11px] text-[#6B7A72] m-0">
                  Email là mã định danh không thể thay đổi để đảm bảo tính toàn vẹn của lịch trình và ví RE-Points.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: OUTDOOR SAFETY & MEDICAL */}
          {activeTab === "safety" && (
            <div className="flex flex-col gap-5">
              <div className="bg-[#E9EFEC]/60 p-3.5 rounded-2xl border border-[#DCE5DF] flex items-start gap-2.5">
                <HeartHandshake className="w-5 h-5 text-[#4A6B5D] shrink-0 mt-0.5" />
                <p className="text-xs text-[#2D3732] m-0 leading-relaxed">
                  <strong>Thông tin cứu hộ Sơn Trà:</strong> Nhóm kiểm lâm và đội ngũ cứu hộ sẽ sử dụng thông tin này trong trường hợp bạn trekking gặp tai nạn hoặc đi lạc trong rừng sâu Bán đảo.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#2D3732]">
                    Người thân liên hệ khẩn cấp
                  </label>
                  <input
                    type="text"
                    name="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={handleChange}
                    placeholder="Ví dụ: Bố / Mẹ / Bạn đời (Nguyễn Văn B)"
                    className="p-3 text-xs rounded-2xl border border-[#E2E8E4] bg-white text-[#2D3732] outline-none focus:border-[#4A6B5D]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#2D3732]">
                    SĐT người thân khẩn cấp
                  </label>
                  <input
                    type="tel"
                    name="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={handleChange}
                    placeholder="Ví dụ: 0912345678"
                    className="p-3 text-xs rounded-2xl border border-[#E2E8E4] bg-white text-[#2D3732] outline-none focus:border-[#4A6B5D]"
                  />
                </div>
              </div>

              {/* Fitness Level */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#2D3732] flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#4A6B5D]" />
                  Cấp độ thể lực dã ngoại (Trekking Profile)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "beginner", label: "Mới bắt đầu", desc: "Đi bộ nhẹ < 3km" },
                    { id: "moderate", label: "Trung bình", desc: "Trekking 3-8km dốc" },
                    { id: "advanced", label: "Dày dặn", desc: "Trekking > 10km rừng" },
                    { id: "expert", label: "Chuyên gia", desc: "Sinh tồn độc hành" }
                  ].map((level) => {
                    const isSelected = formData.fitness_level === level.id;
                    return (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, fitness_level: level.id }))}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                          isSelected
                            ? "bg-[#E9EFEC] border-[#4A6B5D] text-[#4A6B5D]"
                            : "bg-white border-[#E2E8E4] text-[#2D3732] hover:bg-[#F7F5F0]"
                        }`}
                      >
                        <span className="text-xs font-bold">{level.label}</span>
                        <span className="text-[10px] text-[#6B7A72]">{level.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Medical notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#2D3732]">
                  Lưu ý y tế / Dị ứng / Bệnh nền đặc biệt
                </label>
                <textarea
                  name="medical_notes"
                  rows={3}
                  value={formData.medical_notes}
                  onChange={handleChange}
                  placeholder="Ví dụ: Dị ứng ong rừng, hen suyễn khi vận động mạnh, sợ độ cao hoặc có tiền sử huyết áp..."
                  className="p-3 text-xs rounded-2xl border border-[#E2E8E4] bg-white text-[#2D3732] outline-none focus:border-[#4A6B5D] resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: PASSWORD & SECURITY */}
          {activeTab === "security" && (
            <div className="flex flex-col gap-4">
              <div className="bg-[#FAF3EB] p-3.5 rounded-2xl border border-[#E67E22]/20 flex items-start gap-2.5">
                <Lock className="w-5 h-5 text-[#E67E22] shrink-0 mt-0.5" />
                <p className="text-xs text-[#2D3732] m-0 leading-relaxed">
                  Để bảo vệ tài khoản, bạn chỉ cần nhập mật khẩu hiện tại khi muốn đổi sang mật khẩu mới. Bỏ trống các ô này nếu bạn không muốn đổi mật khẩu.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#2D3732]">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  name="old_password"
                  value={formData.old_password}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu đang dùng"
                  className="p-3 text-xs rounded-2xl border border-[#E2E8E4] bg-white text-[#2D3732] outline-none focus:border-[#4A6B5D]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#2D3732]">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    name="new_password"
                    value={formData.new_password}
                    onChange={handleChange}
                    placeholder="Ít nhất 6 ký tự"
                    className="p-3 text-xs rounded-2xl border border-[#E2E8E4] bg-white text-[#2D3732] outline-none focus:border-[#4A6B5D]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#2D3732]">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Nhập lại mật khẩu mới"
                    className="p-3 text-xs rounded-2xl border border-[#E2E8E4] bg-white text-[#2D3732] outline-none focus:border-[#4A6B5D]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8E4] mt-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl border border-[#E2E8E4] text-[#6B7A72] hover:text-[#2D3732] hover:bg-[#F7F5F0] text-xs font-bold transition-colors cursor-pointer bg-white"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-2xl bg-[#4A6B5D] hover:bg-[#3B5A45] text-white text-xs font-bold transition-all shadow-md cursor-pointer border-0 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Lưu Thay Đổi</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

