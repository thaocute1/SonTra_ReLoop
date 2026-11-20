import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useScrollReveal } from '../../../hooks/useScrollReveal'

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

const HERO_SPOTS = [
  { name: 'Đỉnh Bàn Cờ', style: { fontFamily: 'Georgia, serif', fontWeight: 700, letterSpacing: '0.01em', fontSize: '14px' } },
  { name: 'Cây Đa Ngàn Năm', style: { fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 700, letterSpacing: '0.04em', fontSize: '13px', textTransform: 'uppercase' } },
  { name: 'Hải Đăng Tiên Sa', style: { fontFamily: 'Georgia, serif', fontWeight: 600, letterSpacing: '0.01em', fontSize: '14px', fontStyle: 'italic' } },
  { name: 'Trạm Rada 29', style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 700, letterSpacing: '0.08em', fontSize: '13px', textTransform: 'uppercase' } },
  { name: 'Ghềnh Bàng', style: { fontFamily: 'Georgia, serif', fontWeight: 500, letterSpacing: '0.01em', fontSize: '15px' } },
  { name: 'Mũi Nghê', style: { fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 700, letterSpacing: '0.04em', fontSize: '14px' } },
  { name: 'Suối Ôm', style: { fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 600, letterSpacing: '0.01em', fontSize: '14px' } },
]

const ECOSYSTEM_PARTNERS = [
  { name: 'BQL Bán Đảo Sơn Trà', style: { fontFamily: 'Georgia, serif', fontWeight: 700, letterSpacing: '0.02em', fontSize: '14px' } },
  { name: 'Đối Tác Lữ Hành', style: { fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 700, letterSpacing: '0.04em', fontSize: '14px' } },
  { name: 'Đội Tuần Tra', style: { fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 600, letterSpacing: '0.03em', fontSize: '15px' } },
  { name: 'Hộ Chiếu Xanh', style: { fontFamily: 'Georgia, serif', fontWeight: 600, letterSpacing: '0.01em', fontSize: '15px', fontStyle: 'italic' } },
  { name: 'Quỹ Bảo Tồn ESG', style: { fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: '-0.01em', fontSize: '14px' } },
  { name: 'Trợ Lý AI', style: { fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 700, letterSpacing: '0.05em', fontSize: '13px', textTransform: 'uppercase' } },
  { name: 'Trekker Hub', style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 700, letterSpacing: '0.08em', fontSize: '13px' } },
  { name: 'PBL6 · DUT', style: { fontFamily: 'Georgia, serif', fontWeight: 600, letterSpacing: '0.03em', fontSize: '14px' } },
]

export function LandingPage() {
  useScrollReveal()
  const navigate = useNavigate()
  const [isLeaving, setIsLeaving] = useState(false)

  const handleToLogin = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return
    }
    event.preventDefault()
    if (isLeaving) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (reduced) {
      navigate('/login')
      return
    }
    setIsLeaving(true)
    window.setTimeout(() => {
      navigate('/login')
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
          <div className="max-w-[88rem] mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 text-black hover:opacity-80 transition-opacity">
              <LogoIcon className="w-7 h-7 text-black" />
              <span className="text-xl md:text-2xl font-semibold tracking-tight text-black">
                Sơn Trà REloop
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to="/login"
                onClick={handleToLogin}
                className="bg-black !text-white text-sm md:text-base font-medium px-6 md:px-7 py-2.5 rounded-full hover:bg-gray-800 transition-colors duration-200"
              >
                Khám phá tour
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section (Full Screen) */}
        <section className="relative w-full h-full flex-1 overflow-hidden">
          <img
            src="/images/landing/card-use-modes.png"
            alt="Đường đồng mức sinh thái Sơn Trà REloop"
            className="object-cover object-center absolute inset-0 w-full h-full hero-bg-zoom"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, rgba(245,245,245,0.55) 0%, rgba(245,245,245,0.18) 55%, rgba(245,245,245,0) 100%)',
            }}
          />

          <div className="relative z-10 max-w-[88rem] mx-auto h-full px-6 sm:px-12 pt-32 sm:pt-44 pb-12 flex flex-col items-start justify-start motion-stagger">
            <h1
              className="text-black text-4xl sm:text-5xl md:text-6xl font-semibold leading-tight max-w-2xl mb-4"
              style={{ letterSpacing: '-0.04em' }}
            >
              Mỗi Bước Chân
              <br />
              Một Vòng Tuần Hoàn
            </h1>
            <p
              className="text-black/75 text-base md:text-lg max-w-md mb-8 leading-relaxed"
              style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
            >
              Nền tảng du lịch sinh thái kết nối du khách trekking, đơn vị lữ hành bản địa và quỹ bảo tồn bán đảo Sơn Trà qua check-in QR/GPS và thưởng Green Points tự động.
            </p>

            <Link
              to="/login"
              onClick={handleToLogin}
              className="group inline-flex items-center gap-3 bg-black !text-white text-base md:text-lg font-medium pl-8 pr-2 py-2 rounded-full hover:bg-gray-800 active:scale-[0.98] transition-all duration-200"
            >
              <span>Đặt chuyến đi</span>
              <span className="bg-white rounded-full p-2 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5">
                <ArrowRight className="w-5 h-5 text-black" />
              </span>
            </Link>

            {/* Hero Brand Marquee */}
            <div className="marquee-wrap mt-auto md:mt-20 w-full max-w-lg overflow-hidden">
              <div className="marquee-track">
                {[...HERO_SPOTS, ...HERO_SPOTS].map((spot, idx) => (
                  <span
                    key={`${spot.name}-${idx}`}
                    className="mx-6 shrink-0 text-black/60 whitespace-nowrap"
                    style={spot.style}
                  >
                    {spot.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ================= 2. INFO SECTION ("Gặp gỡ Sơn Trà REloop.") ================= */}
      <section id="info" className="bg-[#F5F5F5] px-6 py-24">
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
                Gặp gỡ
                <br />
                Sơn Trà REloop.
              </h2>
              <Link
                to="/login"
                onClick={handleToLogin}
                className="group inline-flex items-center gap-3 bg-black !text-white text-base font-medium pl-7 pr-2 py-2 rounded-full hover:bg-gray-800 active:scale-[0.98] transition-all duration-200"
              >
                <span>Nhiệm vụ xanh</span>
                <span className="bg-white rounded-full p-2 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5">
                  <ArrowRight className="w-5 h-5 text-black" />
                </span>
              </Link>
            </div>

            <p className="text-black/70 text-2xl md:text-3xl leading-relaxed">
              Sơn Trà REloop là hệ sinh thái trekking có thưởng giúp mỗi bước chân khám phá của bạn vừa tích lũy ưu đãi, vừa đóng góp trực tiếp cho rừng già Sơn Trà.
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
                alt="Tích lũy Green Points tự nhiên"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              <h3
                className="text-black text-2xl font-semibold leading-snug relative z-10"
                style={{ letterSpacing: '-0.02em' }}
              >
                Tích lũy Green Points
                <br />
                tự nhiên
              </h3>
              <p className="text-black/75 text-base max-w-xs relative z-10">
                Nhận điểm thưởng khi hoàn thành tuyến trekking, quét QR tại trạm gác và tham gia thử thách bảo vệ môi trường.
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
                Định vị thực địa,
                <br />
                luôn an toàn.
              </h3>
              <p className="text-white/70 text-base">
                Theo dõi lộ trình GPS, điểm danh theo đoàn trên ứng dụng di động và cảnh báo tách đoàn/SOS ngay cả khi mất sóng.
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
                Bảo tồn tự động
                <br />
                &amp; minh bạch
              </h3>
              <p className="text-white/70 text-base">
                Mỗi đơn đặt trải nghiệm được phân bổ minh bạch vào quỹ bảo tồn và giám sát trực tiếp trên bảng điều khiển ESG.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. BACKED BY / ECOSYSTEM MARQUEE ================= */}
      <section data-motion-reveal className="bg-[#F5F5F5] px-6 py-6">
        <div className="max-w-[88rem] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
          <div className="md:col-span-1">
            <p className="text-black/70 text-base leading-relaxed">
              Đồng hành cùng mạng lưới bảo tồn
              <br />
              và các đơn vị lữ hành bản địa.
            </p>
          </div>
          <div className="marquee-wrap md:col-span-3 overflow-hidden">
            <div className="backers-track">
              {[...ECOSYSTEM_PARTNERS, ...ECOSYSTEM_PARTNERS].map((partner, idx) => (
                <span
                  key={`${partner.name}-${idx}`}
                  className="mx-8 shrink-0 text-black/50 whitespace-nowrap"
                  style={partner.style}
                >
                  {partner.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= 4. USE CASES SECTION ================= */}
      <section id="use-modes" className="bg-[#F5F5F5] px-6 py-24">
        <div className="max-w-[88rem] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div data-motion-reveal className="md:pr-12 md:pt-2">
            <p className="text-black/60 text-sm mb-2">Sơn Trà REloop trong thực tiễn</p>
            <h2
              className="text-black text-5xl md:text-6xl font-semibold leading-none mb-6"
              style={{ letterSpacing: '-0.04em' }}
            >
              Ba cổng
              <br />
              vận hành
            </h2>
            <p className="text-black/60 text-base leading-relaxed max-w-sm">
              Sơn Trà REloop vận hành đồng bộ cho du khách khám phá, đối tác lữ hành bản địa quản lý chuyến đi và Ban Quản lý giám sát chỉ số ESG.
            </p>
          </div>

          <div
            data-motion-reveal
            style={{ transitionDelay: '120ms' }}
            className="group relative rounded-3xl overflow-hidden min-h-[600px] md:min-h-[720px] hover:shadow-xl transition-shadow duration-300"
          >
            <img
              src="/images/landing/card-use-modes.png"
              alt="Trải nghiệm và Bảo tồn Sơn Trà REloop"
              className="object-cover absolute inset-0 w-full h-full transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
            <div className="relative z-10 p-10 md:p-12">
              <h3
                className="text-black text-4xl md:text-5xl font-semibold leading-tight mb-5"
                style={{ letterSpacing: '-0.03em' }}
              >
                Trải nghiệm &amp; Bảo tồn
              </h3>
              <p className="text-black/75 text-base max-w-md mb-8 leading-relaxed">
                Nâng tầm hành trình khám phá Sơn Trà với các tuyến trekking đã được kiểm duyệt, trợ lý AI gợi ý lộ trình và cơ chế tích điểm thưởng xanh ngay trên nền tảng.
              </p>
              <Link
                to="/login"
                onClick={handleToLogin}
                className="group/link inline-flex items-center gap-3 text-base font-medium text-black"
              >
                <span className="w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center group-hover/link:bg-white transition-all duration-200 group-hover/link:translate-x-0.5">
                  <ArrowRight className="w-4 h-4 text-black" />
                </span>
                <span>Khám phá trải nghiệm</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
