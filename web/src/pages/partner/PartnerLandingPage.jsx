import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Building2, 
  Compass, 
  Recycle, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Users, 
  Award, 
  BarChart3, 
  HelpCircle 
} from 'lucide-react'
import { SiteHeader } from '../../components/SiteHeader'
import { SiteFooter } from '../../components/SiteFooter'
import { useScrollReveal } from '../../hooks/useScrollReveal'

export default function PartnerLandingPage() {
  useScrollReveal()

  const benefits = [
    {
      icon: Compass,
      title: 'Dành cho tour operator',
      desc: 'Chuẩn hóa và đồng bộ các tuyến trekking an toàn, xác thực checkpoint GPS được BQL Sơn Trà cấp phép.',
      tag: 'Trekking và mạo hiểm'
    },
    {
      icon: Recycle,
      title: 'Dành cho làng nghề và nghệ nhân',
      desc: 'Phân phối các sản phẩm lưu niệm, đồ thủ công tái chế thân thiện môi trường trên sàn marketplace sinh thái.',
      tag: 'Kinh tế tuần hoàn'
    },
    {
      icon: ShieldCheck,
      title: 'Minh bạch quỹ ESG và bảo tồn',
      desc: 'Mỗi đơn hàng thành công tự động trích 10% đóng góp minh bạch vào quỹ bảo tồn và cứu hộ bán đảo Sơn Trà.',
      tag: 'Tác động môi trường'
    }
  ]

  const stats = [
    { number: '+1,200', label: 'Du khách sinh thái mỗi tháng' },
    { number: '100%', label: 'Tuyến tour được BQL chuẩn hóa' },
    { number: '10%', label: 'Chiết khấu minh bạch trích quỹ ESG' },
    { number: '24/7', label: 'Hỗ trợ nghiệp vụ và kết nối cứu hộ' }
  ]

  const processSteps = [
    {
      step: '01',
      title: 'Nộp hồ sơ trực tuyến',
      desc: 'Điền thông tin doanh nghiệp, tải lên giấy phép kinh doanh và hình ảnh nhận diện thương hiệu.'
    },
    {
      step: '02',
      title: 'BQL Sơn Trà thẩm định',
      desc: 'Cán bộ BQL kiểm tra tính pháp lý, tiêu chuẩn an toàn sinh thái và phê duyệt hồ sơ trong 24-48h.'
    },
    {
      step: '03',
      title: 'Kích hoạt và mở bán',
      desc: 'Đăng nhập vào vendor dashboard để thiết lập tour trekking, quản lý hướng dẫn viên và đăng bán sản phẩm.'
    }
  ]

  return (
    <div className="m3-partner-page min-h-screen bg-[#F8FAF7] font-be-vietnam flex flex-col justify-between motion-page-enter">
      {/* Shared Site Header */}
      <SiteHeader />

      <main className="flex-1">
        {/* ================= HERO SECTION ================= */}
        <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-20 max-w-6xl mx-auto">
          <div className="text-center space-y-6 max-w-3xl mx-auto motion-stagger">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DCEBE3] text-[#2F5D4A] text-xs font-bold tracking-wider">
              <Building2 className="w-4 h-4" />
              <span>Cổng thông tin hợp tác doanh nghiệp và đối tác</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-[50px] font-bold text-[#191C1A] font-fraunces leading-[1.18]">
              Đồng hành cùng Sơn Trà REloop phát triển du lịch bền vững
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base text-[#4A514C] leading-relaxed max-w-2xl mx-auto">
              Nền tảng kết nối trực tiếp các đơn vị lữ hành, nghệ nhân thủ công với cộng đồng du khách có trách nhiệm. Chuẩn hóa tuyến trải nghiệm và chung tay bảo tồn hệ sinh thái bán đảo Sơn Trà.
            </p>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Ô MÀU XANH -> CHỮ TRẮNG */}
              <Link
                to="/partner/onboarding"
                className="w-full sm:w-auto min-h-12 px-8 py-4 bg-[#2F5D4A] hover:bg-[#254B3C] !text-white text-sm font-bold rounded-full shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer motion-press"
              >
                <span className="!text-white">Đăng ký làm đối tác ngay</span>
                <ArrowRight className="w-4 h-4 !text-white transition-transform group-hover:translate-x-1" />
              </Link>

              {/* Ô MÀU TRẮNG -> CHỮ ĐEN */}
              <Link
                to="/partner/login"
                className="w-full sm:w-auto min-h-12 px-8 py-4 bg-white border border-[#C5CCC7] !text-[#191C1A] hover:border-[#2F5D4A] text-sm font-bold rounded-full transition-all shadow-xs cursor-pointer motion-press"
              >
                <span className="!text-[#191C1A]">Đăng nhập cổng đối tác</span>
              </Link>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-14 sm:mt-16 bg-white border border-[#C5CCC7] rounded-3xl p-6 sm:p-8 shadow-xs grid grid-cols-2 lg:grid-cols-4 gap-6 text-center motion-stagger motion-hover-lift">
            {stats.map((s, idx) => (
              <div key={idx} className="space-y-1">
                <p className="text-2xl sm:text-3xl font-extrabold text-[#2F5D4A] font-fraunces">
                  {s.number}
                </p>
                <p className="text-xs text-[#4A514C] font-medium leading-tight">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ================= 3 CORE BENEFITS ================= */}
        <section id="benefits" className="bg-white border-y border-[#C5CCC7] py-16 px-4 sm:px-6 lg:px-8" data-motion-reveal>
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <p className="text-xs font-bold text-[#2F5D4A] tracking-wider">
                Quyền lợi hợp tác
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold font-fraunces text-[#191C1A]">
                Vì sao nên trở thành đối tác của Sơn Trà REloop?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 motion-stagger">
              {benefits.map((b, i) => {
                const Icon = b.icon
                return (
                  <div 
                    key={i} 
                    className="p-6 rounded-2xl border border-[#C5CCC7] bg-[#F2F5F1] hover:border-[#2F5D4A] transition-all space-y-4 flex flex-col justify-between motion-hover-lift"
                  >
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-[#DCEBE3] text-[#2F5D4A] flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="inline-block text-xs font-bold tracking-wider text-[#2F5D4A] bg-[#DCEBE3] px-2 py-0.5 rounded-md">
                        {b.tag}
                      </span>
                      <h3 className="text-base font-bold text-[#191C1A]">
                        {b.title}
                      </h3>
                      <p className="text-sm text-[#4A514C] leading-relaxed">
                        {b.desc}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-[#2F5D4A]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Được bảo chứng bởi BQL</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ================= ONBOARDING PROCESS ================= */}
        <section id="process" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto" data-motion-reveal>
          <div className="space-y-12">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <p className="text-xs font-bold text-[#2F5D4A] tracking-wider">
                Quy trình 3 bước
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold font-fraunces text-[#191C1A]">
                Quy trình đăng ký và xét duyệt hồ sơ
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 motion-stagger">
              {processSteps.map((p, index) => (
                <div key={index} className="bg-white border border-[#C5CCC7] rounded-2xl p-6 shadow-xs space-y-3 relative motion-hover-lift">
                  <span className="text-2xl font-black text-[#2F5D4A]/25 font-fraunces block">
                    {p.step}
                  </span>
                  <h3 className="text-base font-bold text-[#191C1A]">
                    {p.title}
                  </h3>
                  <p className="text-sm text-[#4A514C] leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Bottom Callout */}
            <div className="bg-[#2F5D4A] text-white rounded-3xl p-8 sm:p-12 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold font-fraunces !text-white">
                  Sẵn sàng mở rộng hoạt động cùng BQL Sơn Trà?
                </h3>
                <p className="text-xs sm:text-sm text-white/85">
                  Chỉ mất 5 phút để hoàn tất hồ sơ trực tuyến. Đội ngũ BQL sẽ hỗ trợ xác minh và cấp tài khoản nhanh chóng.
                </p>
              </div>

              {/* Ô MÀU TRẮNG -> CHỮ ĐEN */}
              <Link
                to="/partner/onboarding"
                className="min-h-12 px-7 py-3.5 bg-white !text-[#191C1A] hover:bg-[#F2F5F1] text-sm font-bold rounded-full transition-all shadow-sm shrink-0 cursor-pointer motion-press"
              >
                <span className="!text-[#191C1A]">Bắt đầu hoàn thiện hồ sơ</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Shared Site Footer */}
      <SiteFooter />
    </div>
  )
}

