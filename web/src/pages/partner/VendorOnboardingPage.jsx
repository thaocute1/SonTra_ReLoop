import React, { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Check,
  Upload,
  FileText,
  Image as ImageIcon,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react'
import { vendorApplicationService } from '../../services/vendorApplicationService'
import { extractErrorMessage } from '../../utils/apiError'

function LogoIcon({ className = 'w-7 h-7' }) {
  return (
    <svg
      viewBox="0 0 256 256"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M 128.005 191.173 C 128.448 156.208 156.93 128 192 128 L 192 64 L 128 64 C 128 99.346 99.346 128 64 128 L 64 192 L 128 192 Z M 192 256 L 64 256 C 28.654 256 0 227.346 0 192 L 0 64 L 64 64 L 64 0 L 192 0 C 227.346 0 256 28.654 256 64 L 256 192 L 192 192 Z" />
    </svg>
  )
}

const STEPS = [
  { id: 1, code: '01', label: 'Thông tin doanh nghiệp' },
  { id: 2, code: '02', label: 'Xác minh & cam kết' },
]

const baseInputClass =
  'w-full min-h-[52px] px-4 py-3 rounded-xl border text-base text-black placeholder:text-black/40 focus:outline-hidden focus:ring-2 transition-all'

function getFieldClass(hasError) {
  return `${baseInputClass} ${
    hasError
      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-600 focus:ring-rose-500/15 focus:bg-white'
      : 'border-black/15 bg-[#F5F5F5]/60 focus:border-black focus:ring-black/10 focus:bg-white'
  }`
}

export default function VendorOnboardingPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const licenseInputRef = useRef(null)
  const logoInputRef = useRef(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [errors, setErrors] = useState({})
  const [formErrorBanner, setFormErrorBanner] = useState('')

  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    serviceType: 'Trekking',
    operatingArea: 'Bán đảo Sơn Trà',
    hotline: '',
    email: '',
    licenseFile: null,
    logoFile: null,
    safetyCommitment: false,
    esgFundCommitment: false,
  })

  const [isSubmitted, setIsSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const clearFieldError = (field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
    setFormErrorBanner('')
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    clearFieldError(name)
  }

  const handleLicenseChange = (e) => {
    const file = e.target.files?.[0] || null
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        licenseFile: 'Tệp giấy phép kinh doanh không được vượt quá 5MB.',
      }))
      return
    }
    setFormData((prev) => ({ ...prev, licenseFile: file }))
    clearFieldError('licenseFile')
  }

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0] || null
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        logoFile: 'Ảnh logo không được vượt quá 2MB.',
      }))
      return
    }
    setFormData((prev) => ({ ...prev, logoFile: file }))
    clearFieldError('logoFile')
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoPreview(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const clearLicenseFile = (e) => {
    e.stopPropagation()
    setFormData((prev) => ({ ...prev, licenseFile: null }))
    if (licenseInputRef.current) licenseInputRef.current.value = ''
  }

  const clearLogoFile = (e) => {
    e.stopPropagation()
    setFormData((prev) => ({ ...prev, logoFile: null }))
    setLogoPreview('')
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const validateStep1 = () => {
    const nextErrors = {}
    const name = formData.businessName.trim()
    const desc = formData.description.trim()
    const service = formData.serviceType.trim()
    const phone = formData.hotline.trim()
    const email = formData.email.trim()

    if (!name) {
      nextErrors.businessName = 'Vui lòng nhập tên doanh nghiệp.'
    } else if (name.length < 2) {
      nextErrors.businessName = 'Tên doanh nghiệp cần ít nhất 2 ký tự.'
    }

    if (!desc) {
      nextErrors.description = 'Vui lòng nhập mô tả ngắn về doanh nghiệp.'
    } else if (desc.length < 10) {
      nextErrors.description = 'Mô tả cần ít nhất 10 ký tự.'
    }

    if (!service) {
      nextErrors.serviceType = 'Vui lòng nhập loại hình dịch vụ.'
    }

    const cleanPhone = phone.replace(/[\s.-]/g, '')
    if (!cleanPhone) {
      nextErrors.hotline = 'Vui lòng nhập số hotline liên hệ.'
    } else if (!/^(0|\+84)\d{8,10}$/.test(cleanPhone)) {
      nextErrors.hotline = 'Số điện thoại không hợp lệ (ví dụ: 0905123456).'
    }

    if (!email) {
      nextErrors.email = 'Vui lòng nhập email doanh nghiệp.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Định dạng email không hợp lệ.'
    }

    if (!formData.licenseFile) {
      nextErrors.licenseFile = 'Vui lòng tải lên tệp giấy phép kinh doanh để BQL thẩm định.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setFormErrorBanner('Vui lòng điền đầy đủ thông tin bắt buộc và tải lên giấy phép kinh doanh trước khi tiếp tục.')
      return false
    }
    setFormErrorBanner('')
    return true
  }

  const validateStep2 = () => {
    const nextErrors = {}
    if (!formData.safetyCommitment || !formData.esgFundCommitment) {
      nextErrors.commitments =
        'Bạn cần đồng ý đầy đủ cả 2 cam kết an toàn rừng và quỹ bảo tồn ESG (10%) trước khi gửi hồ sơ.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setFormErrorBanner(nextErrors.commitments)
      return false
    }
    setFormErrorBanner('')
    return true
  }

  const handleStepSelect = (targetStepId) => {
    if (targetStepId === currentStep) return
    if (targetStepId > 1 && !validateStep1()) {
      return
    }
    setErrors({})
    setFormErrorBanner('')
    setCurrentStep(targetStepId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!validateStep1()) return
      setCurrentStep(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (!validateStep1()) {
      setCurrentStep(1)
      return
    }
    if (!validateStep2()) {
      return
    }

    setLoading(true)
    try {
      await vendorApplicationService.submit(formData)
      setIsSubmitted(true)
    } catch (err) {
      console.error('Lỗi khi lưu hồ sơ:', err)
      setFormErrorBanner(extractErrorMessage(err, 'Không thể gửi hồ sơ lúc này. Vui lòng thử lại.'))
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setErrors({})
    setFormErrorBanner('')
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/partner')
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-black font-be-vietnam antialiased selection:bg-[#19392D] selection:text-white flex flex-col justify-between motion-page-enter">
      {/* Top Editorial Header */}
      <header className="h-[72px] flex items-center justify-between px-6 sm:px-12 border-b border-black/10 bg-[#F5F5F5]/85 backdrop-blur-md sticky top-0 z-20">
        <Link to="/partner" className="flex items-center gap-2.5 text-black hover:opacity-80 transition-opacity">
          <LogoIcon className="w-7 h-7 text-black" />
          <span className="text-lg sm:text-xl font-semibold tracking-tight text-black">
            Sơn Trà REloop
          </span>
          <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-black/5 text-black/75 border border-black/10">
            Đối tác
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
          {!isSubmitted && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#19392D]/10 text-[#19392D]">
              Bước 0{currentStep} / 0{STEPS.length}
            </span>
          )}
          <Link
            to="/partner/login"
            className="hidden sm:inline-flex items-center font-medium text-black/70 hover:text-black transition-colors"
          >
            Đăng nhập đối tác
          </Link>
        </div>
      </header>

      {/* Page Title & Stepper */}
      {!isSubmitted && (
        <section className="px-4 sm:px-8 pt-10 pb-6 max-w-6xl w-full mx-auto text-center space-y-6">
          <div className="space-y-2">
            <h1
              className="text-3xl sm:text-4xl font-semibold text-black leading-tight"
              style={{ letterSpacing: '-0.03em' }}
            >
              Hoàn thiện hồ sơ đối tác
            </h1>
            <p
              className="text-sm sm:text-base text-black/60 max-w-xl mx-auto"
              style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
            >
              Cung cấp thông tin doanh nghiệp và cam kết bảo tồn để BQL Sơn Trà thẩm định trong 24–48 giờ.
            </p>
          </div>

          {/* Stepper Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs font-medium">
            {STEPS.map((step) => {
              const isCurrent = currentStep === step.id
              const isDone = currentStep > step.id

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepSelect(step.id)}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`inline-flex min-h-10 items-center gap-2 px-4 py-2 rounded-full border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-black text-white border-black shadow-xs'
                      : isDone
                      ? 'bg-[#19392D]/10 text-[#19392D] border-[#19392D]/25 hover:bg-[#19392D]/15'
                      : 'bg-white text-black/60 border-black/10 hover:border-black/25 hover:text-black'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                      isCurrent
                        ? 'bg-white text-black'
                        : isDone
                        ? 'bg-[#19392D] text-white'
                        : 'bg-black/5 text-black/55'
                    }`}
                  >
                    {isDone ? <Check className="w-3 h-3" /> : step.code}
                  </span>
                  <span>{step.label}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Main Content */}
      <main
        key={isSubmitted ? 'submitted' : currentStep}
        className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-4 pb-10 motion-fade-up"
      >
        {!isSubmitted && formErrorBanner && (
          <div
            role="alert"
            className="mb-6 max-w-3xl mx-auto p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs sm:text-sm text-rose-800"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{formErrorBanner}</span>
          </div>
        )}

        {isSubmitted ? (
          /* SUCCESS SCREEN */
          <div className="bg-white border border-black/10 rounded-3xl p-8 sm:p-14 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] text-center space-y-6 max-w-2xl mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-[#19392D]/10 text-[#19392D] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2
                className="text-2xl sm:text-3xl font-semibold text-black leading-tight"
                style={{ letterSpacing: '-0.03em' }}
              >
                Hồ sơ đối tác đã được gửi thành công!
              </h2>
              <p
                className="text-sm text-black/65 leading-relaxed max-w-lg mx-auto"
                style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
              >
                Cảm ơn <strong className="text-black">{formData.businessName}</strong>. Ban Quản lý Sơn Trà sẽ thẩm định giấy phép kinh doanh và gửi thông báo qua email <strong className="text-black">{formData.email}</strong> trong vòng 24–48 giờ.
              </p>
            </div>

            <div className="p-5 bg-[#F5F5F5]/80 border border-black/10 rounded-2xl text-left space-y-2.5 text-xs sm:text-sm text-black/65">
              <div className="flex justify-between items-center gap-4">
                <span>Trạng thái</span>
                <span className="font-semibold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full text-xs">
                  Chờ BQL thẩm định
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span>Doanh nghiệp</span>
                <span className="font-semibold text-black">{formData.businessName}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span>Loại hình dịch vụ</span>
                <span className="font-semibold text-black">{formData.serviceType}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                to="/partner"
                className="group inline-flex min-h-12 items-center justify-center gap-3 pl-7 pr-2 py-2 bg-black hover:bg-gray-800 !text-white text-sm font-medium rounded-full transition-all"
              >
                <span>Về cổng đối tác</span>
                <span className="bg-white rounded-full p-2 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5">
                  <ArrowRight className="w-4 h-4 text-black" />
                </span>
              </Link>
              <Link
                to="/"
                className="inline-flex min-h-12 items-center justify-center px-6 py-3 bg-white border border-black/15 hover:bg-black/5 !text-black text-sm font-medium rounded-full transition-all"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* STEP 1: THÔNG TIN DOANH NGHIỆP */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT MAIN COLUMN (8 cols) */}
                <div className="lg:col-span-8">
                  <div className="bg-white border border-black/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] space-y-5">
                    <div className="border-b border-black/10 pb-4 flex items-center justify-between">
                      <h2
                        className="text-lg font-semibold text-black"
                        style={{ letterSpacing: '-0.02em' }}
                      >
                        Thông tin chung doanh nghiệp
                      </h2>
                      <span className="text-xs text-black/50">
                        <span className="text-rose-600">*</span> Bắt buộc
                      </span>
                    </div>

                    {/* Tên doanh nghiệp */}
                    <div className="space-y-1.5">
                      <label htmlFor="businessName" className="block text-sm font-semibold text-black">
                        Tên doanh nghiệp <span className="text-rose-600">*</span>
                      </label>
                      <input
                        id="businessName"
                        type="text"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleChange}
                        placeholder="Sơn Trà Trekking"
                        aria-invalid={!!errors.businessName}
                        className={getFieldClass(!!errors.businessName)}
                      />
                      {errors.businessName && (
                        <p className="text-xs text-rose-600 font-medium">{errors.businessName}</p>
                      )}
                    </div>

                    {/* Mô tả */}
                    <div className="space-y-1.5">
                      <label htmlFor="description" className="block text-sm font-semibold text-black">
                        Mô tả doanh nghiệp <span className="text-rose-600">*</span>
                      </label>
                      <textarea
                        id="description"
                        rows={4}
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Giới thiệu ngắn về doanh nghiệp, kinh nghiệm tổ chức và định hướng du lịch bền vững..."
                        aria-invalid={!!errors.description}
                        className={`w-full px-4 py-3 rounded-xl border text-base text-black placeholder:text-black/40 focus:outline-hidden focus:ring-2 transition-all resize-none ${
                          errors.description
                            ? 'border-rose-400 bg-rose-50/40 focus:border-rose-600 focus:ring-rose-500/15 focus:bg-white'
                            : 'border-black/15 bg-[#F5F5F5]/60 focus:border-black focus:ring-black/10 focus:bg-white'
                        }`}
                      />
                      {errors.description && (
                        <p className="text-xs text-rose-600 font-medium">{errors.description}</p>
                      )}
                    </div>

                    {/* Loại hình dịch vụ */}
                    <div className="space-y-1.5">
                      <label htmlFor="serviceType" className="block text-sm font-semibold text-black">
                        Loại hình dịch vụ <span className="text-rose-600">*</span>
                      </label>
                      <input
                        id="serviceType"
                        type="text"
                        name="serviceType"
                        value={formData.serviceType}
                        onChange={handleChange}
                        placeholder="Trekking & Du lịch sinh thái"
                        aria-invalid={!!errors.serviceType}
                        className={getFieldClass(!!errors.serviceType)}
                      />
                      {errors.serviceType && (
                        <p className="text-xs text-rose-600 font-medium">{errors.serviceType}</p>
                      )}
                    </div>

                    {/* 2 Cols: Hotline & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="hotline" className="block text-sm font-semibold text-black">
                          Hotline <span className="text-rose-600">*</span>
                        </label>
                        <input
                          id="hotline"
                          type="tel"
                          name="hotline"
                          value={formData.hotline}
                          onChange={handleChange}
                          placeholder="0905 123 456"
                          aria-invalid={!!errors.hotline}
                          className={getFieldClass(!!errors.hotline)}
                        />
                        {errors.hotline && (
                          <p className="text-xs text-rose-600 font-medium">{errors.hotline}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="partner-application-email" className="block text-sm font-semibold text-black">
                          Email doanh nghiệp <span className="text-rose-600">*</span>
                        </label>
                        <input
                          id="partner-application-email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="contact@sontratrekking.vn"
                          aria-invalid={!!errors.email}
                          className={getFieldClass(!!errors.email)}
                        />
                        {errors.email && (
                          <p className="text-xs text-rose-600 font-medium">{errors.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDEBAR (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Card 1: Giấy phép kinh doanh */}
                  <div className="bg-white border border-black/10 rounded-3xl p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-black">
                        Giấy phép kinh doanh <span className="text-rose-600">*</span>
                      </h3>
                      <p className="text-xs text-black/55">
                        Định dạng PDF, PNG hoặc JPG (tối đa 5MB).
                      </p>
                    </div>

                    <input
                      ref={licenseInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleLicenseChange}
                      className="hidden"
                    />

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => licenseInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') licenseInputRef.current?.click()
                      }}
                      className={`border border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 transition-all cursor-pointer ${
                        errors.licenseFile
                          ? 'border-rose-400 bg-rose-50/40 hover:border-rose-600'
                          : 'border-black/20 bg-[#F5F5F5]/60 hover:border-black hover:bg-[#F5F5F5]'
                      }`}
                    >
                      {formData.licenseFile ? (
                        <div className="w-full flex items-center justify-between gap-2 bg-white border border-black/10 rounded-xl px-3 py-2.5 text-left">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-[#19392D] shrink-0" />
                            <span className="text-xs font-medium text-black truncate">
                              {formData.licenseFile.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={clearLicenseFile}
                            aria-label="Xoá tệp giấy phép"
                            className="p-1 rounded-full hover:bg-black/5 text-black/50 hover:text-black cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-white border border-black/10 flex items-center justify-center text-black/65">
                            <Upload className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium text-black/65">
                            Chọn tệp giấy phép kinh doanh
                          </span>
                        </>
                      )}
                    </div>

                    {errors.licenseFile && (
                      <p className="text-xs text-rose-600 font-medium">{errors.licenseFile}</p>
                    )}

                    <button
                      type="button"
                      onClick={() => licenseInputRef.current?.click()}
                      className="w-full min-h-11 py-2 px-4 rounded-full border border-black/15 hover:border-black hover:bg-black/5 text-xs sm:text-sm font-medium text-black transition-all bg-white cursor-pointer"
                    >
                      {formData.licenseFile ? 'Thay đổi tài liệu' : 'Tải lên tài liệu'}
                    </button>
                  </div>

                  {/* Card 2: Logo / Nhận diện thương hiệu */}
                  <div className="bg-white border border-black/10 rounded-3xl p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-black">
                        Logo thương hiệu
                      </h3>
                      <p className="text-xs text-black/55">
                        Ảnh đại diện vuông hoặc tròn, PNG/JPG (tối đa 2MB).
                      </p>
                    </div>

                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoChange}
                      className="hidden"
                    />

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => logoInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') logoInputRef.current?.click()
                      }}
                      className="border border-dashed border-black/20 bg-[#F5F5F5]/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2.5 hover:border-black hover:bg-[#F5F5F5] transition-all cursor-pointer"
                    >
                      {logoPreview ? (
                        <div className="w-full flex items-center justify-between gap-3 bg-white border border-black/10 rounded-xl px-3 py-2 text-left">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={logoPreview}
                              alt="Logo xem trước"
                              className="w-9 h-9 rounded-full object-cover border border-black/10 shrink-0"
                            />
                            <span className="text-xs font-medium text-black truncate">
                              {formData.logoFile?.name || 'logo.png'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={clearLogoFile}
                            aria-label="Xoá logo"
                            className="p-1 rounded-full hover:bg-black/5 text-black/50 hover:text-black cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-white border border-black/10 flex items-center justify-center text-black/65">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium text-black/65">
                            Chọn ảnh logo doanh nghiệp
                          </span>
                        </>
                      )}
                    </div>

                    {errors.logoFile && (
                      <p className="text-xs text-rose-600 font-medium">{errors.logoFile}</p>
                    )}

                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="w-full min-h-11 py-2 px-4 rounded-full border border-black/15 hover:border-black hover:bg-black/5 text-xs sm:text-sm font-medium text-black transition-all bg-white cursor-pointer"
                    >
                      {logoPreview ? 'Thay đổi logo' : 'Tải lên logo'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: XÁC MINH & GỬI THẨM ĐỊNH */}
            {currentStep === 2 && (
              <div className="bg-white border border-black/10 rounded-3xl p-6 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] space-y-6 max-w-3xl mx-auto">
                <div className="border-b border-black/10 pb-4 space-y-1">
                  <h2
                    className="text-xl font-semibold text-black"
                    style={{ letterSpacing: '-0.02em' }}
                  >
                    02. Xác minh và cam kết bảo tồn ESG (10%)
                  </h2>
                  <p className="text-xs sm:text-sm text-black/60">
                    Rà soát thông tin và tích chọn đầy đủ 2 cam kết bắt buộc trước khi gửi Ban Quản lý phê duyệt.
                  </p>
                </div>

                <div className="space-y-3 bg-[#F5F5F5]/80 border border-black/10 rounded-2xl p-5 text-xs sm:text-sm text-black/65">
                  <div className="flex justify-between gap-4">
                    <span>Tên doanh nghiệp</span>
                    <span className="font-semibold text-black text-right">
                      {formData.businessName}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Loại hình dịch vụ</span>
                    <span className="font-semibold text-black text-right">
                      {formData.serviceType}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Hotline / Email</span>
                    <span className="font-semibold text-black text-right">
                      {formData.hotline} / {formData.email}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Tệp đính kèm</span>
                    <span className="font-semibold text-black text-right">
                      {formData.licenseFile?.name || 'Chưa tải giấy phép'} · {formData.logoFile?.name || 'Chưa tải logo'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <label
                    className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors cursor-pointer ${
                      errors.commitments && !formData.safetyCommitment
                        ? 'border-rose-400 bg-rose-50/40'
                        : formData.safetyCommitment
                        ? 'border-[#19392D]/40 bg-[#19392D]/[0.04]'
                        : 'border-black/10 bg-[#F5F5F5]/50 hover:border-black/25'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.safetyCommitment}
                      onChange={(e) => {
                        setFormData((p) => ({ ...p, safetyCommitment: e.target.checked }))
                        clearFieldError('commitments')
                      }}
                      className="mt-0.5 w-4 h-4 accent-[#19392D] rounded shrink-0 cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm text-black/80 leading-relaxed">
                      Cam kết tuyệt đối tuân thủ chỉ dẫn an toàn rừng, phòng cháy chữa cháy và quy định bảo vệ loài voọc chà vá chân nâu. <span className="text-rose-600">*</span>
                    </span>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors cursor-pointer ${
                      errors.commitments && !formData.esgFundCommitment
                        ? 'border-rose-400 bg-rose-50/40'
                        : formData.esgFundCommitment
                        ? 'border-[#19392D]/40 bg-[#19392D]/[0.04]'
                        : 'border-black/10 bg-[#F5F5F5]/50 hover:border-black/25'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.esgFundCommitment}
                      onChange={(e) => {
                        setFormData((p) => ({ ...p, esgFundCommitment: e.target.checked }))
                        clearFieldError('commitments')
                      }}
                      className="mt-0.5 w-4 h-4 accent-[#19392D] rounded shrink-0 cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm text-black/80 leading-relaxed">
                      Đồng ý với cơ chế trích tự động <strong className="text-black">10%</strong> phí đơn hàng vào <strong className="text-black">quỹ bảo tồn và cứu hộ bán đảo Sơn Trà</strong>. <span className="text-rose-600">*</span>
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* BOTTOM ACTION BAR */}
      {!isSubmitted && (
        <footer className="bg-[#F5F5F5]/90 backdrop-blur-md border-t border-black/10 px-4 sm:px-8 py-4 sticky bottom-0 z-10">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="min-h-12 px-6 py-2.5 rounded-full border border-black/15 bg-white hover:bg-black/5 text-sm font-medium text-black transition-all cursor-pointer"
            >
              Quay lại
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="group inline-flex min-h-12 items-center gap-3 pl-7 pr-2 py-2 bg-black hover:bg-gray-800 active:scale-[0.98] disabled:opacity-60 !text-white text-sm font-medium rounded-full transition-all cursor-pointer"
            >
              <span>
                {loading
                  ? 'Đang xử lý...'
                  : currentStep === STEPS.length
                  ? 'Gửi hồ sơ thẩm định'
                  : 'Tiếp tục'}
              </span>
              <span className="bg-white rounded-full p-2 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5">
                <ArrowRight className="w-4 h-4 text-black" />
              </span>
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}
