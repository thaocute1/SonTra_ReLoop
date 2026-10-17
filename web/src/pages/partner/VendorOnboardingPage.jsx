import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Check, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles,
  Compass,
  MapPin,
  Clock
} from 'lucide-react'
import { vendorApplicationService } from '../../services/vendorApplicationService'

export default function VendorOnboardingPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)

  // Form states matching Figma wireframe
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    serviceType: 'Trekking',
    operatingArea: 'Bán đảo Sơn Trà',
    hotline: '',
    email: '',
    licenseFile: null,
    logoFile: null,
    // Step 2 & 3 info
    experienceTypes: ['Trekking mạo hiểm', 'Lặn biển ngắm san hô'],
    safetyCommitment: true,
    esgFundCommitment: true
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

  const handleNext = async () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Final Submit: Gửi hồ sơ đối tác về Backend Django (kèm fallback) để Admin BQL thẩm định
      setLoading(true)
      try {
        await vendorApplicationService.submit(formData)
      } catch (err) {
        console.error('Lỗi khi lưu hồ sơ:', err)
      } finally {
        setLoading(false)
        setIsSubmitted(true)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/partner')
    }
  }

  return (
    <div className="min-h-screen bg-[#fcfbf9] font-be-vietnam text-[#18211c] flex flex-col justify-between">
      {/* Top Banner / Stepper Header */}
      <header className="px-4 sm:px-8 py-6 max-w-6xl w-full mx-auto">
        <div className="flex items-center justify-between text-xs text-[#5d6861] pb-2">
          <Link to="/partner" className="inline-flex items-center gap-1.5 hover:text-[#24563d] font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>02 · Vendor Onboarding</span>
          </Link>

          <span className="text-[11px] font-semibold bg-[#eaf2eb] text-[#24563d] px-2.5 py-0.5 rounded-full">
            Bước {currentStep} / 4
          </span>
        </div>

        {/* Title */}
        <div className="text-center space-y-4 pt-2">
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-bold font-fraunces text-[#18211c]">
            Hoàn thiện hồ sơ đối tác
          </h1>

          {/* Stepper Progress Bar (Matching Figma Image) */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-semibold">
            {/* Step 1 */}
            <button
              onClick={() => setCurrentStep(1)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border transition-all cursor-pointer ${
                currentStep === 1
                  ? 'bg-[#eaf2eb] text-[#24563d] border-[#24563d] shadow-2xs'
                  : currentStep > 1
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-white text-gray-400 border-gray-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-[#24563d] text-white flex items-center justify-center text-[10px]">
                ✓
              </span>
              <span>Thông tin doanh nghiệp</span>
            </button>

            {/* Step 2 */}
            <button
              onClick={() => setCurrentStep(2)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border transition-all cursor-pointer ${
                currentStep === 2
                  ? 'bg-[#eaf2eb] text-[#24563d] border-[#24563d] shadow-2xs'
                  : currentStep > 2
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 2 ? 'bg-[#24563d] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                02
              </span>
              <span>Trải nghiệm</span>
            </button>

            {/* Step 3 */}
            <button
              onClick={() => setCurrentStep(3)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border transition-all cursor-pointer ${
                currentStep === 3
                  ? 'bg-[#eaf2eb] text-[#24563d] border-[#24563d] shadow-2xs'
                  : currentStep > 3
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 3 ? 'bg-[#24563d] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                03
              </span>
              <span>Khu vực hoạt động</span>
            </button>

            {/* Step 4 */}
            <button
              onClick={() => setCurrentStep(4)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border transition-all cursor-pointer ${
                currentStep === 4
                  ? 'bg-[#eaf2eb] text-[#24563d] border-[#24563d] shadow-2xs'
                  : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 4 ? 'bg-[#24563d] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                04
              </span>
              <span>Xác minh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Form */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-4">
        {isSubmitted ? (
          /* SUCCESS SCREEN */
          <div className="bg-white border border-[#e2e8e4] rounded-3xl p-8 sm:p-14 shadow-sm text-center space-y-6 max-w-2xl mx-auto my-8">
            <div className="w-16 h-16 rounded-full bg-[#eaf2eb] text-[#24563d] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold font-fraunces text-[#18211c]">
                Hồ sơ đối tác đã được gửi thành công!
              </h2>
              <p className="text-xs sm:text-sm text-[#5d6861] leading-relaxed">
                Cảm ơn <b>{formData.businessName || 'Doanh nghiệp của bạn'}</b>. Ban Quản Lý (BQL) Sơn Trà sẽ thẩm định giấy phép kinh doanh và gửi thông báo qua email <b>{formData.email || 'của bạn'}</b> trong vòng 24 giờ.
              </p>
            </div>

            <div className="p-4 bg-[#fcfdfc] border border-[#e8ece9] rounded-2xl text-left space-y-2 text-xs text-[#5d6861]">
              <div className="flex justify-between">
                <span>Trạng thái:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                  Chờ BQL Thẩm Định (pending_approval)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Doanh nghiệp:</span>
                <span className="font-bold text-[#18211c]">{formData.businessName || 'Sơn Trà Trekking'}</span>
              </div>
              <div className="flex justify-between">
                <span>Khu vực:</span>
                <span className="font-bold text-[#18211c]">{formData.operatingArea}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                to="/partner"
                className="px-6 py-3 bg-[#24563d] text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-[#1b3d2b] transition-all cursor-pointer"
              >
                Về Cổng Đối Tác
              </Link>
              <Link
                to="/"
                className="px-6 py-3 bg-[#f4f7f4] border border-[#e2e8e4] text-[#18211c] text-xs sm:text-sm font-semibold rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
              >
                Về Trang Chủ
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* STEP 1: THÔNG TIN DOANH NGHIỆP (EXACT MATCH TO FIGMA IMAGE) */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT MAIN COLUMN (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Card: Logo doanh nghiệp */}
                  <div className="bg-white border border-[#e2e8e4] rounded-2xl p-6 shadow-2xs space-y-4">
                    <h2 className="text-base font-bold text-[#18211c]">
                      Logo doanh nghiệp
                    </h2>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-[#f2f4f2] border border-[#e2e8e4] flex items-center justify-center text-xs font-semibold text-gray-500 shrink-0">
                        Logo
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-[#5d6861]">
                          Ảnh đại diện vuông hoặc tròn, định dạng PNG/JPG (tối đa 2MB).
                        </p>
                        <button
                          type="button"
                          className="px-3 py-1.5 border border-[#e2e8e4] rounded-lg text-xs font-semibold text-[#18211c] hover:bg-gray-50 cursor-pointer"
                        >
                          Chọn ảnh logo
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card: Main Form Fields */}
                  <div className="bg-white border border-[#e2e8e4] rounded-2xl p-6 shadow-2xs space-y-4">
                    {/* Tên doanh nghiệp */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#18211c]">
                        Tên doanh nghiệp
                      </label>
                      <input
                        type="text"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleChange}
                        placeholder="Sơn Trà Trekking"
                        className="w-full px-4 py-2.5 rounded-xl border border-[#e2e8e4] bg-[#fcfdfc] text-xs sm:text-sm focus:outline-none focus:border-[#24563d] focus:bg-white transition-all"
                      />
                    </div>

                    {/* Mô tả */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#18211c]">
                        Mô tả
                      </label>
                      <textarea
                        rows={4}
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Giới thiệu ngắn về doanh nghiệp..."
                        className="w-full px-4 py-2.5 rounded-xl border border-[#e2e8e4] bg-[#fcfdfc] text-xs sm:text-sm focus:outline-none focus:border-[#24563d] focus:bg-white transition-all resize-none"
                      />
                    </div>

                    {/* 2 Cols: Loại hình dịch vụ & Khu vực hoạt động */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#18211c]">
                          Loại hình dịch vụ
                        </label>
                        <input
                          type="text"
                          name="serviceType"
                          value={formData.serviceType}
                          onChange={handleChange}
                          placeholder="Trekking"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#e2e8e4] bg-[#fcfdfc] text-xs sm:text-sm focus:outline-none focus:border-[#24563d] focus:bg-white transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#18211c]">
                          Khu vực hoạt động
                        </label>
                        <input
                          type="text"
                          name="operatingArea"
                          value={formData.operatingArea}
                          onChange={handleChange}
                          placeholder="Bán đảo Sơn Trà"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#e2e8e4] bg-[#fcfdfc] text-xs sm:text-sm focus:outline-none focus:border-[#24563d] focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    {/* 2 Cols: Hotline & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#18211c]">
                          Hotline
                        </label>
                        <input
                          type="text"
                          name="hotline"
                          value={formData.hotline}
                          onChange={handleChange}
                          placeholder="09xx xxx xxx"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#e2e8e4] bg-[#fcfdfc] text-xs sm:text-sm focus:outline-none focus:border-[#24563d] focus:bg-white transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#18211c]">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="contact@sontratrekking.vn"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#e2e8e4] bg-[#fcfdfc] text-xs sm:text-sm focus:outline-none focus:border-[#24563d] focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDEBAR (4 cols) - Matching Figma Cards */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Card 1: Giấy phép kinh doanh */}
                  <div className="bg-white border border-[#e2e8e4] rounded-2xl p-6 shadow-2xs space-y-4">
                    <h3 className="text-sm font-bold text-[#18211c]">
                      Giấy phép kinh doanh
                    </h3>

                    {/* Upload drop box */}
                    <div className="border border-dashed border-[#d1d9d4] bg-[#fcfdfc] rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-2 hover:border-[#24563d] transition-all cursor-pointer">
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">
                        Upload document
                      </span>
                    </div>

                    {/* Upload button */}
                    <button
                      type="button"
                      className="w-full py-2 px-4 rounded-xl border border-[#e2e8e4] hover:border-[#24563d] text-xs font-bold text-[#18211c] transition-all bg-white cursor-pointer"
                    >
                      Upload document
                    </button>
                  </div>

                  {/* Card 2: Logo / Brand asset */}
                  <div className="bg-white border border-[#e2e8e4] rounded-2xl p-6 shadow-2xs space-y-4">
                    <h3 className="text-sm font-bold text-[#18211c]">
                      Logo / Brand asset
                    </h3>

                    {/* Upload drop box */}
                    <div className="border border-dashed border-[#d1d9d4] bg-[#fcfdfc] rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-2 hover:border-[#24563d] transition-all cursor-pointer">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">
                        Upload
                      </span>
                    </div>

                    {/* Upload button */}
                    <button
                      type="button"
                      className="w-full py-2 px-4 rounded-xl border border-[#e2e8e4] hover:border-[#24563d] text-xs font-bold text-[#18211c] transition-all bg-white cursor-pointer"
                    >
                      Upload
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: TRẢI NGHIỆM */}
            {currentStep === 2 && (
              <div className="bg-white border border-[#e2e8e4] rounded-2xl p-6 sm:p-10 shadow-2xs space-y-6 max-w-3xl mx-auto">
                <div className="border-b border-[#e2e8e4] pb-4 space-y-1">
                  <h2 className="text-lg font-bold text-[#18211c]">
                    02. Thiết lập Sản phẩm & Trải nghiệm
                  </h2>
                  <p className="text-xs text-[#5d6861]">
                    Chọn các gói dịch vụ du lịch sinh thái hoặc sản phẩm thủ công bạn dự kiến cung cấp.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#18211c]">Danh mục hoạt động chính</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Trekking Đỉnh Bàn Cờ', 'Khám phá Cây Đa Ngàn Năm', 'Tour lặn ngắm san hô Bãi Nam', 'Workshop tái chế vỏ sò'].map((item) => (
                      <div key={item} className="p-3.5 rounded-xl border border-[#e2e8e4] flex items-center gap-3 bg-[#fcfdfc]">
                        <input type="checkbox" defaultChecked className="accent-[#24563d] rounded" />
                        <span className="text-xs font-medium text-[#18211c]">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#18211c]">Kinh nghiệm tổ chức (Số năm)</label>
                  <input
                    type="number"
                    defaultValue={3}
                    className="w-32 px-4 py-2 rounded-xl border border-[#e2e8e4] bg-[#fcfdfc] text-xs sm:text-sm focus:outline-none focus:border-[#24563d]"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: KHU VỰC HOẠT ĐỘNG */}
            {currentStep === 3 && (
              <div className="bg-white border border-[#e2e8e4] rounded-2xl p-6 sm:p-10 shadow-2xs space-y-6 max-w-3xl mx-auto">
                <div className="border-b border-[#e2e8e4] pb-4 space-y-1">
                  <h2 className="text-lg font-bold text-[#18211c]">
                    03. Khu vực hoạt động & Checkpoint GPS
                  </h2>
                  <p className="text-xs text-[#5d6861]">
                    Xác nhận các địa bàn rừng và trạm tuần tra mà đơn vị sẽ thường xuyên tác nghiệp.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#f4f7f4] border border-[#e2e8e4] flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#24563d] shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-[#18211c]">Bán đảo Sơn Trà (Đà Nẵng)</p>
                      <p className="text-[#5d6861]">Bao gồm các cung đường Đỉnh Bàn Cờ, Bãi Bắc, Bãi Nam, Suối Đổ và Tuyến cây di sản.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#18211c]">Số lượng Hướng dẫn viên (Guide) đăng ký cấp thẻ BQL</label>
                    <input
                      type="number"
                      defaultValue={2}
                      className="w-32 px-4 py-2 rounded-xl border border-[#e2e8e4] bg-[#fcfdfc] text-xs sm:text-sm focus:outline-none focus:border-[#24563d]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: XÁC MINH & GỬI THẨM ĐỊNH */}
            {currentStep === 4 && (
              <div className="bg-white border border-[#e2e8e4] rounded-2xl p-6 sm:p-10 shadow-2xs space-y-6 max-w-3xl mx-auto">
                <div className="border-b border-[#e2e8e4] pb-4 space-y-1">
                  <h2 className="text-lg font-bold text-[#18211c]">
                    04. Xác minh & Cam kết Bảo tồn ESG (10%)
                  </h2>
                  <p className="text-xs text-[#5d6861]">
                    Rà soát thông tin và cam kết quy chuẩn an toàn trước khi gửi Ban Quản Lý phê duyệt.
                  </p>
                </div>

                <div className="space-y-3 bg-[#fcfdfc] border border-[#e8ece9] rounded-xl p-5 text-xs text-[#5d6861]">
                  <div className="flex justify-between">
                    <span className="font-medium">Tên doanh nghiệp:</span>
                    <span className="font-bold text-[#18211c]">{formData.businessName || 'Sơn Trà Trekking'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Hotline / Email:</span>
                    <span className="font-bold text-[#18211c]">{formData.hotline || 'Chưa điền'} / {formData.email || 'Chưa điền'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Loại hình:</span>
                    <span className="font-bold text-[#18211c]">{formData.serviceType} ({formData.operatingArea})</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.safetyCommitment}
                      onChange={(e) => setFormData(p => ({ ...p, safetyCommitment: e.target.checked }))}
                      className="mt-1 accent-[#24563d] rounded"
                    />
                    <span className="text-xs text-[#18211c] leading-relaxed">
                      Cam kết tuyệt đối tuân thủ chỉ dẫn an toàn rừng, phòng cháy chữa cháy và quy định bảo vệ loài Voọc chà vá chân nâu.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.esgFundCommitment}
                      onChange={(e) => setFormData(p => ({ ...p, esgFundCommitment: e.target.checked }))}
                      className="mt-1 accent-[#24563d] rounded"
                    />
                    <span className="text-xs text-[#18211c] leading-relaxed">
                      Đồng ý với cơ chế trích tự động <b>10%</b> phí đơn hàng vào <b>Quỹ Bảo Tồn & Cứu Hộ Bán Đảo Sơn Trà</b>.
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* BOTTOM ACTION BAR (MATCHING FIGMA IMAGE) */}
      {!isSubmitted && (
        <footer className="bg-white border-t border-[#e2e8e4] px-4 sm:px-8 py-4 mt-8">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 rounded-xl border border-[#e2e8e4] hover:bg-gray-50 text-xs font-bold text-[#18211c] transition-all cursor-pointer"
            >
              Quay lại
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="px-7 py-2.5 bg-[#24563d] hover:bg-[#1b3d2b] disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              {loading ? (
                <span>Đang xử lý...</span>
              ) : currentStep === 4 ? (
                <span>Gửi hồ sơ thẩm định</span>
              ) : (
                <span>Tiếp tục</span>
              )}
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}

