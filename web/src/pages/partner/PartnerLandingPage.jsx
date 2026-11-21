import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollReveal'

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

const HERO_PARTNER_TOPICS = [
  { name: 'Tour Operator', style: { fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 700, letterSpacing: '0.04em', fontSize: '13px', textTransform: 'uppercase' } },
  { name: 'Làng Nghề Bản Địa', style: { fontFamily: 'Georgia, serif', fontWeight: 700, letterSpacing: '0.01em', fontSize: '14px' } },
  { name: 'Checkpoint GPS', style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 700, letterSpacing: '0.08em', fontSize: '13px', textTransform: 'uppercase' } },
  { name: 'Quỹ Bảo Tồn ESG 10%', style: { fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: '-0.01em', fontSize: '14px' } },
  { name: 'Đỉnh Bàn Cờ', style: { fontFamily: 'Georgia, serif', fontWeight: 600, letterSpacing: '0.01em', fontSize: '14px', fontStyle: 'italic' } },
  { name: 'Cây Đa Ngàn Năm', style: { fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 600, letterSpacing: '0.02em', fontSize: '14px' } },
  { name: 'Mũi Nghê', style: { fontFamily: 'Georgia, serif', fontWeight: 500, letterSpacing: '0.01em', fontSize: '15px' } },
]

const ECOSYSTEM_METRICS = [
  { name: '+1.200 Du khách/tháng', style: { fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 700, letterSpacing: '-0.01em', fontSize: '15px' } },
  { name: '100% Tuyến tour chuẩn hóa BQL', style: { fontFamily: 'Georgia, serif', fontWeight: 700, letterSpacing: '0.01em', fontSize: '14px' } },
  { name: '10% Quỹ bảo tồn ESG', style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 700, letterSpacing: '0.06em', fontSize: '13px' } },
  { name: '24/7 Kết nối cứu hộ', style: { fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: '0.02em', fontSize: '14px' } },
  { name: 'BQL Bán Đảo Sơn Trà', style: { fontFamily: 'Georgia, serif', fontWeight: 600, letterSpacing: '0.01em', fontSize: '14px', fontStyle: 'italic' } },
  { name: 'Đội Tuần Tra', style: { fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 600, letterSpacing: '0.03em', fontSize: '14px' } },
  { name: 'Vendor Hub', style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 700, letterSpacing: '0.08em', fontSize: '13px' } },
  { name: 'Hộ Chiếu Xanh', style: { fontFamily: 'Georgia, serif', fontWeight: 600, letterSpacing: '0.02em', fontSize: '14px' } },
]

const PROCESS_STEPS = [
  {
    step: '01',
    title: 'Nộp hồ sơ trực tuyến',
    description:
      'Điền thông tin doanh nghiệp, tải lên giấy phép kinh doanh và hình ảnh nhận diện thương hiệu trong 5 phút.',
  },
  {
    step: '02',
    title: 'BQL Sơn Trà thẩm định',
    description:
      'Cán bộ BQL kiểm tra tính pháp lý, tiêu chuẩn an toàn sinh thái và phê duyệt hồ sơ trong 24–48 giờ.',
  },
  {
    step: '03',
    title: 'Kích hoạt và mở bán',
    description:
      'Đăng nhập Vendor Dashboard để thiết lập tuyến trekking, quản lý hướng dẫn viên và đăng bán sản phẩm.',
  },
]

const PARTNER_COMMITMENTS = [
  {
    step: '01',
    title: 'Bảo chứng chính thức bởi BQL Sơn Trà',
    description:
      'Tuyến trekking và điểm dừng chân được chuẩn hóa lộ trình GPS, tăng độ tin cậy với cộng đồng du khách sinh thái.',
  },
  {
    step: '02',
    title: 'Vận hành số hóa & đối soát minh bạch',
    description:
      'Theo dõi booking, điểm danh đoàn theo thời gian thực và tự động phân bổ 10% quỹ bảo tồn ESG trên mỗi đơn hàng.',
  },
]

export function PartnerLandingPage() {
  useScrollReveal()
  const navigate = useNavigate()
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [])

  const handleNavigate = (path) => (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return
    }
    event.preventDefault()
    if (isLeaving) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (reduced) {
      navigate(path)
      return
    }
    setIsLeaving(true)
    window.setTimeout(() => {
      navigate(path)
    }, 260)
  }

  return (
    <div
      className={`flex flex-col min-h-screen bg-[#F5F5F5] text-black font-be-vietnam antialiased selection:bg-[#19392D] selection:text-white transition-all duration-300 ease-out ${
        isLeaving ? 'opacity-0 scale-[0.985] -translate-y-2.5 blur-[4px] pointer-events-none' : 'opacity-100 scale-100 translate-y-0 blur-0'
      }`}
    >
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes backers-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes hero-ken-burns {
          0% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee 22s linear infinite;
        }
        .backers-track {
          display: flex;
          width: max-content;
          animation: backers-marquee 30s linear infinite;
        }
        .marquee-wrap:hover .marquee-track,
        .marquee-wrap:hover .backers-track {
          animation-play-state: paused;
        }
        .hero-bg-zoom {
          animation: hero-ken-burns 14s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track,
          .backers-track,
          .hero-bg-zoom {
            animation: none !important;
          }
        }
      `}</style>

      {/* ================= 1. NAVBAR + HERO (h-screen wrapper) ================= */}
      <div className="relative h-screen min-h-[700px] flex flex-col overflow-hidden">
        {/* Navbar (absolute, transparent over hero) */}
        <nav className="absolute top-0 left-0 right-0 z-20 px-6 py-5 motion-fade-in">
          <div className="max-w-[88rem] mx-auto flex items-center justify-between gap-4">
            <Link to="/partner" className="flex items-center gap-2.5 text-black hover:opacity-80 transition-opacity shrink-0">
              <LogoIcon className="w-7 h-7 text-black" />
              <span className="text-xl md:text-2xl font-semibold tracking-tight text-black">
                Sơn Trà REloop
              </span>
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-black/5 text-black/75 border border-black/10">
                Đối tác
              </span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/partner/login"
                onClick={handleNavigate('/partner/login')}
                className="hidden sm:inline-flex items-center bg-white/85 backdrop-blur border border-black/15 !text-black text-sm font-medium px-5 py-2.5 rounded-full hover:bg-white transition-colors duration-200"
              >
                Đăng nhập đối tác
              </Link>
              <Link
                to="/partner/onboarding"
                onClick={handleNavigate('/partner/onboarding')}
                className="bg-black !text-white text-sm md:text-base font-medium px-5 md:px-7 py-2.5 rounded-full hover:bg-gray-800 transition-colors duration-200"
              >
                Đăng ký đối tác
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section (Full Screen) */}
        <section className="relative w-full h-full flex-1 overflow-hidden">
          <img
            src="/images/landing/card-use-modes.png"
            alt="Cổng đối tác du lịch sinh thái Sơn Trà REloop"
            className="object-cover object-center absolute inset-0 w-full h-full hero-bg-zoom"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, rgba(245,245,245,0.68) 0%, rgba(245,245,245,0.24) 58%, rgba(245,245,245,0) 100%)',
            }}
          />

          <div className="relative z-10 max-w-[88rem] mx-auto h-full px-6 sm:px-12 pt-32 sm:pt-44 pb-12 flex flex-col items-start justify-start motion-stagger">
            <h1
              className="text-black text-4xl sm:text-5xl md:text-6xl font-semibold leading-tight max-w-2xl mb-4"
              style={{ letterSpacing: '-0.04em' }}
            >
              Kiến Tạo Chuẩn Mực
              <br />
              Du Lịch Sinh Thái
            </h1>
            <p
              className="text-black/75 text-base md:text-lg max-w-lg mb-8 leading-relaxed"
              style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
            >
              Cổng kết nối các đơn vị lữ hành, hướng dẫn viên và nghệ nhân bản địa với cộng đồng du khách có trách nhiệm — chuẩn hóa tuyến trekking GPS và minh bạch 10% quỹ bảo tồn bán đảo Sơn Trà.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/partner/onboarding"
                onClick={handleNavigate('/partner/onboarding')}
                className="group inline-flex items-center gap-3 bg-black !text-white text-base md:text-lg font-medium pl-8 pr-2 py-2 rounded-full hover:bg-gray-800 active:scale-[0.98] transition-all duration-200"
              >
                <span>Đăng ký làm đối tác</span>
                <span className="bg-white rounded-full p-2 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5">
                  <ArrowRight className="w-5 h-5 text-black" />
                </span>
              </Link>

              <Link
                to="/partner/login"
                onClick={handleNavigate('/partner/login')}
                className="inline-flex items-center bg-white/85 backdrop-blur border border-black/15 !text-black text-base font-medium px-7 py-3 rounded-full hover:bg-white active:scale-[0.98] transition-all duration-200"
              >
                Đăng nhập cổng đối tác
              </Link>
            </div>

            {/* Hero Partner Marquee */}
            <div className="marquee-wrap mt-auto md:mt-20 w-full max-w-lg overflow-hidden">
              <div className="marquee-track">
                {[...HERO_PARTNER_TOPICS, ...HERO_PARTNER_TOPICS].map((topic, idx) => (
                  <span
                    key={`${topic.name}-${idx}`}
                    className="mx-6 shrink-0 text-black/60 whitespace-nowrap"
                    style={topic.style}
                  >
                    {topic.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ================= 2. INFO & BENTO GRID ("Đồng hành cùng Sơn Trà REloop.") ================= */}
      <section id="benefits" className="bg-[#F5F5F5] px-6 py-24">
        <div className="max-w-[88rem] mx-auto">
          <div
            data-motion-reveal
            className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 items-start"
          >
            <div>
              <h2
                className="text-black text-4xl md:text-5xl font-semibold leading-tight mb-8"
                style={{ letterSpacing: '-0.03em' }}
              >
                Đồng hành cùng
                <br />
                Sơn Trà REloop.
              </h2>
              <Link
                to="/partner/onboarding"
                onClick={handleNavigate('/partner/onboarding')}
                className="group inline-flex items-center gap-3 bg-black !text-white text-base font-medium pl-7 pr-2 py-2 rounded-full hover:bg-gray-800 active:scale-[0.98] transition-all duration-200"
              >
                <span>Nộp hồ sơ ngay</span>
                <span className="bg-white rounded-full p-2 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5">
                  <ArrowRight className="w-5 h-5 text-black" />
                </span>
              </Link>
            </div>

            <p className="text-black/70 text-2xl md:text-3xl leading-relaxed">
              Hệ sinh thái vận hành chuẩn hóa giúp đơn vị lữ hành mở rộng nguồn khách sinh thái chất lượng, đồng thời tạo tác động bảo tồn đo lường được cho rừng già Sơn Trà.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1 (spans 2 cols on lg) */}
            <div
              data-motion-reveal
              className="group lg:col-span-2 rounded-2xl p-7 min-h-80 flex flex-col justify-between relative overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
            >
              <img
                src="/images/landing/card-green-points.png"
                alt="Chuẩn hóa tuyến trekking và điểm danh GPS"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              <h3
                className="text-black text-2xl font-semibold leading-snug relative z-10"
                style={{ letterSpacing: '-0.02em' }}
              >
                Dành cho đơn vị lữ hành
                <br />
                &amp; Tour Operator
              </h3>
              <p className="text-black/75 text-base max-w-sm relative z-10">
                Chuẩn hóa và đồng bộ các tuyến trekking an toàn, xác thực checkpoint QR/GPS và điều phối hướng dẫn viên được BQL Sơn Trà cấp phép.
              </p>
            </div>

            {/* Card 2 */}
            <div
              data-motion-reveal
              style={{ transitionDelay: '100ms' }}
              className="bg-[#19392D] rounded-2xl p-7 min-h-80 flex flex-col justify-between hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
            >
              <h3
                className="text-white text-2xl font-semibold leading-snug"
                style={{ letterSpacing: '-0.02em' }}
              >
                Làng nghề &amp;
                <br />
                kinh tế tuần hoàn.
              </h3>
              <p className="text-white/70 text-base">
                Phân phối sản phẩm lưu niệm, đồ thủ công tái chế thân thiện môi trường tới du khách đổi thưởng Green Points trên sàn Marketplace sinh thái.
              </p>
            </div>

            {/* Card 3 */}
            <div
              data-motion-reveal
              style={{ transitionDelay: '200ms' }}
              className="bg-[#19392D] rounded-2xl p-7 min-h-80 flex flex-col justify-between hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
            >
              <h3
                className="text-white text-2xl font-semibold leading-snug"
                style={{ letterSpacing: '-0.02em' }}
              >
                Minh bạch quỹ ESG
                <br />
                &amp; bảo tồn
              </h3>
              <p className="text-white/70 text-base">
                Mỗi đơn hàng thành công tự động trích 10% đóng góp minh bạch vào quỹ bảo tồn và cứu hộ bán đảo Sơn Trà theo thời gian thực.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. METRICS & ECOSYSTEM MARQUEE ================= */}
      <section data-motion-reveal className="bg-[#F5F5F5] px-6 py-6">
        <div className="max-w-[88rem] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
          <div className="md:col-span-1">
            <p className="text-black/70 text-base leading-relaxed">
              Bảo chứng vận hành cùng BQL Sơn Trà
              <br />
              và mạng lưới đối tác bản địa.
            </p>
          </div>
          <div className="marquee-wrap md:col-span-3 overflow-hidden">
            <div className="backers-track">
              {[...ECOSYSTEM_METRICS, ...ECOSYSTEM_METRICS].map((item, idx) => (
                <span
                  key={`${item.name}-${idx}`}
                  className="mx-8 shrink-0 text-black/50 whitespace-nowrap"
                  style={item.style}
                >
                  {item.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= 4. ONBOARDING PROCESS SECTION ================= */}
      <section id="process" className="bg-[#F5F5F5] px-6 py-24">
        <div className="max-w-[88rem] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div data-motion-reveal className="md:pr-12 md:pt-2">
            <p className="text-black/60 text-sm mb-2">Quy trình tham gia hệ sinh thái</p>
            <h2
              className="text-black text-5xl md:text-6xl font-semibold leading-none mb-6"
              style={{ letterSpacing: '-0.04em' }}
            >
              Ba bước
              <br />
              đồng hành
            </h2>
            <p className="text-black/60 text-base leading-relaxed max-w-sm mb-10">
              Quy trình đăng ký và thẩm định trực tuyến tinh gọn giúp doanh nghiệp nhanh chóng kết nối với hệ thống vận hành của BQL Sơn Trà.
            </p>

            <div className="space-y-4">
              {PROCESS_STEPS.map((item, idx) => (
                <div
                  key={item.step}
                  data-motion-reveal
                  style={{ transitionDelay: `${idx * 80}ms` }}
                  className="rounded-2xl bg-white/80 border border-black/8 p-5 hover:border-black/20 transition-colors duration-200"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-xs font-mono font-semibold text-black/45 pt-1 shrink-0">
                      {item.step}
                    </span>
                    <div>
                      <h3
                        className="text-black text-lg font-semibold leading-snug mb-1"
                        style={{ letterSpacing: '-0.02em' }}
                      >
                        {item.title}
                      </h3>
                      <p className="text-black/65 text-sm leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            data-motion-reveal
            style={{ transitionDelay: '120ms' }}
            className="group relative rounded-3xl overflow-hidden min-h-[600px] md:min-h-[720px] hover:shadow-xl transition-shadow duration-300"
          >
            <img
              src="/images/landing/card-use-modes.png"
              alt="Quản trị tập trung trên Vendor Dashboard Sơn Trà REloop"
              className="object-cover absolute inset-0 w-full h-full transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
            <div className="relative z-10 p-10 md:p-12">
              <h3
                className="text-black text-4xl md:text-5xl font-semibold leading-tight mb-5"
                style={{ letterSpacing: '-0.03em' }}
              >
                Quản trị tập trung
              </h3>
              <p className="text-black/75 text-base max-w-md mb-8 leading-relaxed">
                Theo dõi lịch khởi hành, quản lý đoàn khách qua QR/GPS, điều phối hướng dẫn viên và đối soát doanh thu minh bạch ngay trên Vendor Dashboard.
              </p>
              <Link
                to="/partner/onboarding"
                onClick={handleNavigate('/partner/onboarding')}
                className="group/link inline-flex items-center gap-3 text-base font-medium text-black"
              >
                <span className="w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center group-hover/link:bg-white transition-all duration-200 group-hover/link:translate-x-0.5">
                  <ArrowRight className="w-4 h-4 text-black" />
                </span>
                <span>Bắt đầu hoàn thiện hồ sơ</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 5. PARTNER DARK CTA SLIDE ================= */}
      <section
        id="onboarding-cta"
        className="relative w-full min-h-screen bg-[#19392D] text-white overflow-hidden flex items-center px-6 sm:px-12 py-20"
      >
        <img
          src="/images/landing/hero-sontra.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-15 pointer-events-none select-none"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(110deg, rgba(25,57,45,0.96) 0%, rgba(25,57,45,0.88) 55%, rgba(25,57,45,0.72) 100%)',
          }}
        />

        <div
          data-motion-reveal
          className="relative z-10 max-w-[88rem] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center"
        >
          <div className="lg:col-span-7">
            <p className="text-white/65 text-sm mb-4">
              Bắt đầu hành trình hợp tác
            </p>
            <h2
              className="text-white text-4xl sm:text-5xl md:text-6xl font-semibold leading-[1.06] mb-6"
              style={{ letterSpacing: '-0.04em' }}
            >
              Sẵn sàng mở rộng hoạt động
              <br />
              cùng BQL Sơn Trà?
            </h2>
            <p className="text-white/75 text-base md:text-lg max-w-xl leading-relaxed mb-10">
              Chỉ mất 5 phút để hoàn tất hồ sơ trực tuyến. Đội ngũ Ban Quản lý sẽ thẩm định pháp lý và cấp tài khoản đối tác trong vòng 24–48 giờ.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/partner/onboarding"
                onClick={handleNavigate('/partner/onboarding')}
                className="group inline-flex items-center gap-3 bg-white !text-[#19392D] text-base font-medium pl-7 pr-2 py-2 rounded-full hover:bg-[#F5F5F5] active:scale-[0.98] transition-all duration-200"
              >
                <span>Bắt đầu hoàn thiện hồ sơ</span>
                <span className="bg-[#19392D] rounded-full p-2 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5">
                  <ArrowRight className="w-4 h-4" color="#FFFFFF" />
                </span>
              </Link>

              <Link
                to="/partner/login"
                onClick={handleNavigate('/partner/login')}
                className="inline-flex items-center px-6 py-3 rounded-full border border-white/25 bg-white/10 hover:bg-white/15 !text-white text-base font-medium transition-colors duration-200"
              >
                Đăng nhập cổng đối tác
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {PARTNER_COMMITMENTS.map((item, idx) => (
              <div
                key={item.step}
                data-motion-reveal
                style={{ transitionDelay: `${idx * 90}ms` }}
                className="rounded-2xl bg-white/[0.06] border border-white/10 p-5 sm:p-6 backdrop-blur-xs hover:bg-white/[0.1] transition-colors duration-200"
              >
                <div className="flex items-start gap-4">
                  <span className="text-xs font-mono font-semibold text-white/50 pt-1 shrink-0">
                    {item.step}
                  </span>
                  <div>
                    <h3
                      className="text-white text-lg font-semibold leading-snug mb-1.5"
                      style={{ letterSpacing: '-0.02em' }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-white/70 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-2 flex flex-wrap items-center gap-5 text-sm text-white/60">
              <Link to="/" onClick={handleNavigate('/')} className="hover:text-white transition-colors">
                ← Trang chủ du khách
              </Link>
              <Link to="/bql-portal/login" onClick={handleNavigate('/bql-portal/login')} className="hover:text-white transition-colors">
                Cổng BQL nội bộ
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PartnerLandingPage
