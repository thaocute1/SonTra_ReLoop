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
    <div className="m3-partner-page min-h-screen bg-[#F8FAF7] font-be-vietnam text-[#191C1A] flex flex-col justify-between motion-page-enter">
      {/* Top Banner / Stepper Header */}
      <header className="px-4 sm:px-8 py-6 max-w-6xl w-full mx-auto">
        <div className="flex items-center justify-between text-xs text-[#4A514C] pb-2">
          <Link to="/partner" className="inline-flex items-center gap-1.5 hover:text-[#2F5D4A] font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>02 · Vendor onboarding</span>
          </Link>

          <span className="text-xs font-semibold bg-[#DCEBE3] text-[#2F5D4A] px-2.5 py-1 rounded-full">
            Bước {currentStep} / 4
          </span>
        </div>

        {/* Title */}
        <div className="text-center space-y-4 pt-2">
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-bold font-fraunces text-[#191C1A]">
            Hoàn thiện hồ sơ đối tác
          </h1>

          {/* Stepper Progress Bar (Matching Figma Image) */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-semibold">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              aria-current={currentStep === 1 ? 'step' : undefined}
              className={`inline-flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-full border transition-all cursor-pointer ${
                currentStep === 1
                  ? 'bg-[#DCEBE3] text-[#2F5D4A] border-[#2F5D4A] shadow-2xs'
                  : currentStep > 1
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-white text-[#4A514C] border-[#C5CCC7]'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-[#2F5D4A] text-white flex items-center justify-center text-[10px]">
                ✓
              </span>
              <span>Thông tin doanh nghiệp</span>
            </button>

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              aria-current={currentStep === 2 ? 'step' : undefined}
              className={`inline-flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-full border transition-all cursor-pointer ${
                currentStep === 2
                  ? 'bg-[#DCEBE3] text-[#2F5D4A] border-[#2F5D4A] shadow-2xs'
                  : currentStep > 2
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-white text-[#4A514C] border-[#C5CCC7]'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 2 ? 'bg-[#2F5D4A] text-white' : 'bg-[#F2F5F1] text-[#4A514C]'
              }`}>
                02
              </span>
              <span>Trải nghiệm</span>
            </button>

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              aria-current={currentStep === 3 ? 'step' : undefined}
              className={`inline-flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-full border transition-all cursor-pointer ${
                currentStep === 3
                  ? 'bg-[#DCEBE3] text-[#2F5D4A] border-[#2F5D4A] shadow-2xs'
                  : currentStep > 3
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-white text-[#4A514C] border-[#C5CCC7]'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 3 ? 'bg-[#2F5D4A] text-white' : 'bg-[#F2F5F1] text-[#4A514C]'
              }`}>
                03
              </span>
              <span>Khu vực hoạt động</span>
            </button>

            {/* Step 4 */}
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              aria-current={currentStep === 4 ? 'step' : undefined}
              className={`inline-flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-full border transition-all cursor-pointer ${
                currentStep === 4
                  ? 'bg-[#DCEBE3] text-[#2F5D4A] border-[#2F5D4A] shadow-2xs'
                  : 'bg-white text-[#4A514C] border-[#C5CCC7]'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 4 ? 'bg-[#2F5D4A] text-white' : 'bg-[#F2F5F1] text-[#4A514C]'
              }`}>
                04
              </span>
              <span>Xác minh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Form */}
      <main key={isSubmitted ? 'submitted' : currentStep} className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-4 motion-fade-up">
        {isSubmitted ? (
          /* SUCCESS SCREEN */
          <div className="bg-white border border-[#C5CCC7] rounded-3xl p-8 sm:p-14 shadow-sm text-center space-y-6 max-w-2xl mx-auto my-8">
            <div className="w-16 h-16 rounded-full bg-[#DCEBE3] text-[#2F5D4A] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold font-fraunces text-[#191C1A]">
                Hồ sơ đối tác đã được gửi thành công!
              </h2>
              <p className="text-xs sm:text-sm text-[#4A514C] leading-relaxed">
                Cảm ơn <b>{formData.businessName || 'doanh nghiệp của bạn'}</b>. Ban quản lý (BQL) Sơn Trà sẽ thẩm định giấy phép kinh doanh và gửi thông báo qua email <b>{formData.email || 'của bạn'}</b> trong vòng 24 giờ.
              </p>
            </div>

            <div className="p-4 bg-[#F2F5F1] border border-[#C5CCC7] rounded-2xl text-left space-y-2 text-xs text-[#4A514C]">
              <div className="flex justify-between">
                <span>Trạng thái:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                  Chờ BQL thẩm định (pending_approval)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Doanh nghiệp:</span>
                <span className="font-bold text-[#191C1A]">{formData.businessName || 'Sơn Trà Trekking'}</span>
              </div>
              <div className="flex justify-between">
                <span>Khu vực:</span>
                <span className="font-bold text-[#191C1A]">{formData.operatingArea}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                to="/partner"
                className="min-h-12 px-6 py-3 bg-[#2F5D4A] text-white text-sm font-semibold rounded-full hover:bg-[#254B3C] transition-all cursor-pointer"
              >
                Về cổng đối tác
              </Link>
              <Link
                to="/"
                className="min-h-12 px-6 py-3 bg-[#F2F5F1] border border-[#C5CCC7] text-[#191C1A] text-sm font-semibold rounded-full hover:bg-[#DCEBE3] transition-all cursor-pointer"
              >
                Về trang chủ
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
                  <div className="bg-white border border-[#C5CCC7] rounded-2xl p-6 shadow-2xs space-y-4">
                    <h2 className="text-base font-bold text-[#191C1A]">
                      Logo doanh nghiệp
                    </h2>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-[#F2F5F1] border border-[#C5CCC7] flex items-center justify-center text-xs font-semibold text-[#4A514C] shrink-0">
                        Logo
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-[#4A514C]">
                          Ảnh đại diện vuông hoặc tròn, định dạng PNG/JPG (tối đa 2MB).
                        </p>
                        <button
                          type="button"
                          className="min-h-11 px-3 py-1.5 border border-[#C5CCC7] rounded-full text-sm font-semibold text-[#191C1A] hover:bg-[#F2F5F1] cursor-pointer"
                        >
                          Chọn ảnh logo
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card: Main Form Fields */}
                  <div className="bg-white border border-[#C5CCC7] rounded-2xl p-6 shadow-2xs space-y-4">
                    {/* Tên doanh nghiệp */}
                    <div className="space-y-1.5">
                      <label htmlFor="businessName" className="block text-sm font-bold text-[#191C1A]">
                        Tên doanh nghiệp
                      </label>
                      <input
                        id="businessName"
                        type="text"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleChange}
                        placeholder="Sơn Trà Trekking"
                        className="w-full min-h-14 px-4 py-2.5 rounded-xl border border-[#C5CCC7] bg-[#F2F5F1] text-base focus:outline-none focus:border-[#2F5D4A] focus:ring-2 focus:ring-[#2F5D4A]/20 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Mô tả */}
                    <div className="space-y-1.5">
                      <label htmlFor="description" className="block text-sm font-bold text-[#191C1A]">
                        Mô tả
                      </label>
                      <textarea
                        id="description"
                        rows={4}
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Giới thiệu ngắn về doanh nghiệp..."
                        className="w-full px-4 py-3 rounded-xl border border-[#C5CCC7] bg-[#F2F5F1] text-base focus:outline-none focus:border-[#2F5D4A] focus:ring-2 focus:ring-[#2F5D4A]/20 focus:bg-white transition-all resize-none"
                      />
                    </div>

                    {/* 2 Cols: Loại hình dịch vụ & Khu vực hoạt động */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="serviceType" className="block text-sm font-bold text-[#191C1A]">
                          Loại hình dịch vụ
                        </label>
                        <input
                          id="serviceType"
                          type="text"
                          name="serviceType"
                          value={formData.serviceType}
                          onChange={handleChange}
                          placeholder="Trekking"
                          className="w-full min-h-14 px-4 py-2.5 rounded-xl border border-[#C5CCC7] bg-[#F2F5F1] text-base focus:outline-none focus:border-[#2F5D4A] focus:ring-2 focus:ring-[#2F5D4A]/20 focus:bg-white transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="operatingArea" className="block text-sm font-bold text-[#191C1A]">
                          Khu vực hoạt động
                        </label>
                        <input
                          id="operatingArea"
                          type="text"
                          name="operatingArea"
                          value={formData.operatingArea}
                          onChange={handleChange}
                          placeholder="Bán đảo Sơn Trà"
                          className="w-full min-h-14 px-4 py-2.5 rounded-xl border border-[#C5CCC7] bg-[#F2F5F1] text-base focus:outline-none focus:border-[#2F5D4A] focus:ring-2 focus:ring-[#2F5D4A]/20 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    {/* 2 Cols: Hotline & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="hotline" className="block text-sm font-bold text-[#191C1A]">
                          Hotline
                        </label>
                        <input
                          id="hotline"
                          type="text"
                          name="hotline"
                          value={formData.hotline}
                          onChange={handleChange}
                          placeholder="09xx xxx xxx"
                          className="w-full min-h-14 px-4 py-2.5 rounded-xl border border-[#C5CCC7] bg-[#F2F5F1] text-base focus:outline-none focus:border-[#2F5D4A] focus:ring-2 focus:ring-[#2F5D4A]/20 focus:bg-white transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="partner-application-email" className="block text-sm font-bold text-[#191C1A]">
                          Email
                        </label>
                        <input
                          id="partner-application-email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="contact@sontratrekking.vn"
                          className="w-full min-h-14 px-4 py-2.5 rounded-xl border border-[#C5CCC7] bg-[#F2F5F1] text-base focus:outline-none focus:border-[#2F5D4A] focus:ring-2 focus:ring-[#2F5D4A]/20 focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDEBAR (4 cols) - Matching Figma Cards */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Card 1: Giấy phép kinh doanh */}
                  <div className="bg-white border border-[#C5CCC7] rounded-2xl p-6 shadow-2xs space-y-4">
                    <h3 className="text-sm font-bold text-[#191C1A]">
                      Giấy phép kinh doanh
                    </h3>

                    {/* Upload drop box */}
                    <div className="border border-dashed border-[#C5CCC7] bg-[#F2F5F1] rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-2 hover:border-[#2F5D4A] transition-all cursor-pointer">
                      <Upload className="w-6 h-6 text-[#4A514C]" />
                      <span className="text-xs font-medium text-[#4A514C]">
                        Upload document
                      </span>
                    </div>

                    {/* Upload button */}
                    <button
                      type="button"
                      className="w-full min-h-12 py-2 px-4 rounded-full border border-[#C5CCC7] hover:border-[#2F5D4A] text-sm font-bold text-[#191C1A] transition-all bg-white cursor-pointer"
                    >
                      Upload document
                    </button>
                  </div>

                  {/* Card 2: Logo / Brand asset */}
                  <div className="bg-white border border-[#C5CCC7] rounded-2xl p-6 shadow-2xs space-y-4">
                    <h3 className="text-sm font-bold text-[#191C1A]">
                      Logo / brand asset
                    </h3>

                    {/* Upload drop box */}
                    <div className="border border-dashed border-[#C5CCC7] bg-[#F2F5F1] rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-2 hover:border-[#2F5D4A] transition-all cursor-pointer">
                      <ImageIcon className="w-6 h-6 text-[#4A514C]" />
                      <span className="text-xs font-medium text-[#4A514C]">
                        Upload
                      </span>
                    </div>

                    {/* Upload button */}
                    <button
                      type="button"
                      className="w-full min-h-12 py-2 px-4 rounded-full border border-[#C5CCC7] hover:border-[#2F5D4A] text-sm font-bold text-[#191C1A] transition-all bg-white cursor-pointer"
                    >
                      Upload
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: TRẢI NGHIỆM */}
            {currentStep === 2 && (
              <div className="bg-white border border-[#C5CCC7] rounded-2xl p-6 sm:p-10 shadow-2xs space-y-6 max-w-3xl mx-auto">
                <div className="border-b border-[#C5CCC7] pb-4 space-y-1">
                  <h2 className="text-lg font-bold text-[#191C1A]">
                    02. Thiết lập sản phẩm và trải nghiệm
                  </h2>
                  <p className="text-xs text-[#4A514C]">
                    Chọn các gói dịch vụ du lịch sinh thái hoặc sản phẩm thủ công bạn dự kiến cung cấp.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-[#191C1A]">Danh mục hoạt động chính</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Trekking đỉnh Bàn Cờ', 'Khám phá cây đa ngàn năm', 'Tour lặn ngắm san hô Bãi Nam', 'Workshop tái chế vỏ sò'].map((item) => (
                      <label key={item} className="min-h-12 p-3.5 rounded-xl border border-[#C5CCC7] flex items-center gap-3 bg-[#F2F5F1] cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#2F5D4A] rounded" />
                        <span className="text-sm font-medium text-[#191C1A]">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="experienceYears" className="text-sm font-bold text-[#191C1A]">Kinh nghiệm tổ chức (số năm)</label>
                  <input
                    id="experienceYears"
                    type="number"
                    defaultValue={3}
                    className="w-32 min-h-14 px-4 py-2 rounded-xl border border-[#C5CCC7] bg-[#F2F5F1] text-base focus:outline-none focus:border-[#2F5D4A] focus:ring-2 focus:ring-[#2F5D4A]/20"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: KHU VỰC HOẠT ĐỘNG */}
            {currentStep === 3 && (
              <div className="bg-white border border-[#C5CCC7] rounded-2xl p-6 sm:p-10 shadow-2xs space-y-6 max-w-3xl mx-auto">
                <div className="border-b border-[#C5CCC7] pb-4 space-y-1">
                  <h2 className="text-lg font-bold text-[#191C1A]">
                    03. Khu vực hoạt động và checkpoint GPS
                  </h2>
                  <p className="text-xs text-[#4A514C]">
                    Xác nhận các địa bàn rừng và trạm tuần tra mà đơn vị sẽ thường xuyên tác nghiệp.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#F2F5F1] border border-[#C5CCC7] flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#2F5D4A] shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-[#191C1A]">Bán đảo Sơn Trà (Đà Nẵng)</p>
                      <p className="text-[#4A514C]">Bao gồm các cung đường đỉnh Bàn Cờ, Bãi Bắc, Bãi Nam, Suối Đổ và tuyến cây di sản.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="guideCount" className="text-sm font-bold text-[#191C1A]">Số lượng hướng dẫn viên (guide) đăng ký cấp thẻ BQL</label>
                    <input
                      id="guideCount"
                      type="number"
                      defaultValue={2}
                      className="w-32 min-h-14 px-4 py-2 rounded-xl border border-[#C5CCC7] bg-[#F2F5F1] text-base focus:outline-none focus:border-[#2F5D4A] focus:ring-2 focus:ring-[#2F5D4A]/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: XÁC MINH & GỬI THẨM ĐỊNH */}
            {currentStep === 4 && (
              <div className="bg-white border border-[#C5CCC7] rounded-2xl p-6 sm:p-10 shadow-2xs space-y-6 max-w-3xl mx-auto">
                <div className="border-b border-[#C5CCC7] pb-4 space-y-1">
                  <h2 className="text-lg font-bold text-[#191C1A]">
                    04. Xác minh và cam kết bảo tồn ESG (10%)
                  </h2>
                  <p className="text-xs text-[#4A514C]">
                    Rà soát thông tin và cam kết quy chuẩn an toàn trước khi gửi ban quản lý phê duyệt.
                  </p>
                </div>

                <div className="space-y-3 bg-[#F2F5F1] border border-[#C5CCC7] rounded-xl p-5 text-xs text-[#4A514C]">
                  <div className="flex justify-between">
                    <span className="font-medium">Tên doanh nghiệp:</span>
                    <span className="font-bold text-[#191C1A]">{formData.businessName || 'Sơn Trà Trekking'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Hotline / email:</span>
                    <span className="font-bold text-[#191C1A]">{formData.hotline || 'Chưa điền'} / {formData.email || 'Chưa điền'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Loại hình:</span>
                    <span className="font-bold text-[#191C1A]">{formData.serviceType} ({formData.operatingArea})</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.safetyCommitment}
                      onChange={(e) => setFormData(p => ({ ...p, safetyCommitment: e.target.checked }))}
                      className="mt-0.5 w-5 h-5 accent-[#2F5D4A] rounded shrink-0"
                    />
                    <span className="text-xs text-[#191C1A] leading-relaxed">
                      Cam kết tuyệt đối tuân thủ chỉ dẫn an toàn rừng, phòng cháy chữa cháy và quy định bảo vệ loài voọc chà vá chân nâu.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.esgFundCommitment}
                      onChange={(e) => setFormData(p => ({ ...p, esgFundCommitment: e.target.checked }))}
                      className="mt-0.5 w-5 h-5 accent-[#2F5D4A] rounded shrink-0"
                    />
                    <span className="text-xs text-[#191C1A] leading-relaxed">
                      Đồng ý với cơ chế trích tự động <b>10%</b> phí đơn hàng vào <b>quỹ bảo tồn và cứu hộ bán đảo Sơn Trà</b>.
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
        <footer className="bg-white border-t border-[#C5CCC7] px-4 sm:px-8 py-4 mt-8">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="min-h-12 px-5 py-2.5 rounded-full border border-[#C5CCC7] hover:bg-[#F2F5F1] text-sm font-bold text-[#191C1A] transition-all cursor-pointer motion-press"
            >
              Quay lại
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="min-h-12 px-7 py-2.5 bg-[#2F5D4A] hover:bg-[#254B3C] disabled:opacity-60 text-white text-sm font-bold rounded-full transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 motion-press"
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

