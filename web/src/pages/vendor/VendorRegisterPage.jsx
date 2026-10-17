import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Building2, 
  Compass, 
  Recycle, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowLeft, 
  FileText, 
  Mail, 
  Lock, 
  User, 
  Phone,
  Sparkles
} from 'lucide-react'
import logoImg from '../../assets/logo.jpg'

export default function VendorRegisterPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    brand_name: '',
    vendor_type: 'tour_operator', // 'tour_operator' | 'artisan'
    business_license_code: '',
    termsAgreed: true,
  })

  const [isSubmitted, setIsSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)

    // Simulate API registration submission
    setTimeout(() => {
      setLoading(false)
      setIsSubmitted(true)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-[#f7f5f0] font-be-vietnam flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="bg-white border-b border-[#e2e8e4] px-6 sm:px-12 py-4 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2.5 font-fraunces font-bold text-lg text-[#18211c]">
          <img src={logoImg} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
          <span>Sơn Trà REloop</span>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#5d6861] hover:text-[#24563d] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang chủ</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 my-6">
        {isSubmitted ? (
          /* SUCCESS SUBMISSION STATE */
          <div className="bg-white border border-[#e2e8e4] rounded-3xl p-8 sm:p-12 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-[#eaf2eb] text-[#24563d] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold font-fraunces text-[#18211c]">
                Hồ sơ Đối tác Đã Được Gửi!
              </h2>
              <p className="text-sm text-[#5d6861] leading-relaxed">
                Cảm ơn <b>{formData.brand_name || formData.name}</b> đã đăng ký đồng hành cùng Sơn Trà REloop. Hồ sơ và giấy phép kinh doanh của bạn đang được Ban Quản Lý (BQL) Sơn Trà tiến hành thẩm định.
              </p>
            </div>

            <div className="bg-[#fcfdfc] border border-[#e8ece9] rounded-2xl p-5 max-w-md mx-auto text-left space-y-2.5 text-xs text-[#5d6861]">
              <div className="flex justify-between">
                <span>Trạng thái:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                  Chờ BQL Thẩm Định (pending_approval)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Loại đối tác:</span>
                <span className="font-bold text-[#18211c]">
                  {formData.vendor_type === 'tour_operator' ? 'Đơn vị Tour Operator' : 'Làng nghề & Nghệ nhân Tái chế'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Mã GPKD:</span>
                <span className="font-bold text-[#18211c]">{formData.business_license_code || 'Chưa cung cấp'}</span>
              </div>
              <div className="flex justify-between">
                <span>Email thông báo:</span>
                <span className="font-bold text-[#18211c]">{formData.email}</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/"
                className="px-6 py-3 bg-[#24563d] text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-[#1b3d2b] transition-all cursor-pointer"
              >
                Về trang chủ
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 bg-[#f4f7f4] border border-[#e2e8e4] text-[#18211c] text-xs sm:text-sm font-semibold rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
              >
                Đăng nhập Cổng Đối tác
              </Link>
            </div>
          </div>
        ) : (
          /* PARTNER REGISTRATION FORM */
          <div className="bg-white border border-[#e2e8e4] rounded-3xl p-6 sm:p-12 shadow-sm space-y-8">
            {/* Header info */}
            <div className="border-b border-[#e2e8e4] pb-6 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#eaf2eb] text-[#24563d] rounded-lg text-xs font-bold">
                <Building2 className="w-4 h-4" />
                <span>Đăng ký Hợp tác Doanh nghiệp & Nghệ nhân</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-fraunces text-[#18211c]">
                Mở Gian hàng & Tuyến Tour Sinh thái Sơn Trà
              </h1>
              <p className="text-xs sm:text-sm text-[#5d6861]">
                Điền đầy đủ thông tin pháp lý doanh nghiệp để tham gia mạng lưới du lịch có trách nhiệm và mở bán tour/sản phẩm tái chế.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* PHẦN 1: LOẠI HÌNH ĐỐI TÁC */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#18211c]">
                  1. Chọn Loại Hình Đối Tác
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 1: Tour Operator */}
                  <label
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                      formData.vendor_type === 'tour_operator'
                        ? 'border-[#24563d] bg-[#eaf2eb]/30'
                        : 'border-[#e2e8e4] bg-[#fcfdfc] hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="vendor_type"
                      value="tour_operator"
                      checked={formData.vendor_type === 'tour_operator'}
                      onChange={handleChange}
                      className="mt-1 accent-[#24563d]"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-[#18211c]">
                        <Compass className="w-4 h-4 text-[#24563d]" />
                        <span>Đơn vị Tour Operator</span>
                      </div>
                      <p className="text-xs text-[#5d6861] leading-relaxed">
                        Tổ chức các tour trekking, lặn ngắm san hô, trải nghiệm thiên nhiên có hướng dẫn viên BQL.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Artisan */}
                  <label
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                      formData.vendor_type === 'artisan'
                        ? 'border-[#24563d] bg-[#eaf2eb]/30'
                        : 'border-[#e2e8e4] bg-[#fcfdfc] hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="vendor_type"
                      value="artisan"
                      checked={formData.vendor_type === 'artisan'}
                      onChange={handleChange}
                      className="mt-1 accent-[#24563d]"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-[#18211c]">
                        <Recycle className="w-4 h-4 text-[#24563d]" />
                        <span>Làng nghề & Nghệ nhân Tái chế</span>
                      </div>
                      <p className="text-xs text-[#5d6861] leading-relaxed">
                        Cung cấp các sản phẩm thủ công, quà lưu niệm tái chế thân thiện môi trường trên Marketplace.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* PHẦN 2: THÔNG TIN PHÁP LÝ & THƯƠNG HIỆU */}
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-[#18211c]">
                  2. Thông Tin Doanh Nghiệp & Giấy Phép
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#18211c] mb-1.5">
                      Tên thương hiệu / Cơ sở kinh doanh *
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#f4f7f4] border border-[#e2e8e4] rounded-xl focus-within:border-[#24563d] focus-within:bg-white transition-all">
                      <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        name="brand_name"
                        value={formData.brand_name}
                        onChange={handleChange}
                        required
                        placeholder="VD: Sơn Trà Eco Trekking"
                        className="bg-transparent text-xs sm:text-sm text-[#18211c] focus:outline-none w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#18211c] mb-1.5">
                      Mã số Giấy phép kinh doanh / MST *
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#f4f7f4] border border-[#e2e8e4] rounded-xl focus-within:border-[#24563d] focus-within:bg-white transition-all">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        name="business_license_code"
                        value={formData.business_license_code}
                        onChange={handleChange}
                        required
                        placeholder="VD: 0401234567"
                        className="bg-transparent text-xs sm:text-sm text-[#18211c] focus:outline-none w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PHẦN 3: TÀI KHOẢN ĐẠI DIỆN */}
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-[#18211c]">
                  3. Thông Tin Người Đại Diện Pháp Lý
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#18211c] mb-1.5">
                      Họ và tên người đại diện *
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#f4f7f4] border border-[#e2e8e4] rounded-xl focus-within:border-[#24563d] focus-within:bg-white transition-all">
                      <User className="w-4 h-4 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Nguyễn Văn A"
                        className="bg-transparent text-xs sm:text-sm text-[#18211c] focus:outline-none w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#18211c] mb-1.5">
                      Số điện thoại liên hệ *
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#f4f7f4] border border-[#e2e8e4] rounded-xl focus-within:border-[#24563d] focus-within:bg-white transition-all">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        placeholder="0905 123 456"
                        className="bg-transparent text-xs sm:text-sm text-[#18211c] focus:outline-none w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#18211c] mb-1.5">
                      Email đăng nhập quản trị *
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#f4f7f4] border border-[#e2e8e4] rounded-xl focus-within:border-[#24563d] focus-within:bg-white transition-all">
                      <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="contact@ecotrek.vn"
                        className="bg-transparent text-xs sm:text-sm text-[#18211c] focus:outline-none w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#18211c] mb-1.5">
                      Mật khẩu khởi tạo *
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#f4f7f4] border border-[#e2e8e4] rounded-xl focus-within:border-[#24563d] focus-within:bg-white transition-all">
                      <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="Ít nhất 6 ký tự"
                        minLength={6}
                        className="bg-transparent text-xs sm:text-sm text-[#18211c] focus:outline-none w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PHẦN 4: CHÍNH SÁCH VÀ CHIẾT KHẤU ESG */}
              <div className="bg-[#fcfdfc] border border-[#e8ece9] rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#24563d]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Quy Chuẩn Cam Kết Bảo Tồn ESG Sơn Trà (10%)</span>
                </div>
                <p className="text-xs text-[#5d6861] leading-relaxed">
                  Đối tác đăng ký đồng ý với mức chiết khấu nền tảng <b>10%</b> trên mỗi đơn hàng/vé tour thành công. Một phần doanh thu này sẽ được tự động trích nộp minh bạch vào <b>Quỹ Bảo Tồn & ESG Bán Đảo Sơn Trà</b> (tài trợ dọn rác, cứu hộ động vật và trồng rừng).
                </p>
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    name="termsAgreed"
                    checked={formData.termsAgreed}
                    onChange={handleChange}
                    required
                    className="accent-[#24563d] rounded"
                  />
                  <span className="text-xs text-[#18211c] font-medium">
                    Tôi cam kết thông tin pháp lý cung cấp là chính xác và tuân thủ quy chuẩn của BQL Sơn Trà.
                  </span>
                </label>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#24563d] hover:bg-[#1b3d2b] disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span>Đang gửi hồ sơ thẩm định...</span>
                  ) : (
                    <>
                      <span>Gửi Hồ sơ Đăng ký Đối tác cho BQL</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-[#5d6861] border-t border-[#e2e8e4] bg-white">
        © 2026 Sơn Trà REloop - Nền tảng Du lịch Sinh thái & Quản lý Bảo tồn Bán đảo Sơn Trà
      </footer>
    </div>
  )
}

