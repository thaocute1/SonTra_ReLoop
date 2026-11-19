import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1761566688762-d4c3259899af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3OTUwNTQ0OTd8&ixlib=rb-4.1.0&q=80&w=1080'

const ABOUT_IMAGE =
  'https://images.unsplash.com/photo-1622208124790-957dcad00105?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3OTUwNTQ0OTd8&ixlib=rb-4.1.0&q=80&w=1080'

const GALLERY_IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1785256344813-403443157f6c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3OTUwNTQ0OTd8&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Đường mòn xuyên rừng nguyên sinh Sơn Trà',
    className: 'w-full lg:w-[580px] h-[340px] lg:h-[540px]',
  },
  {
    src: 'https://images.unsplash.com/photo-1755096884721-7afa30ac088e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3OTUwNTQ0OTd8&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Tán cây cổ thụ hàng trăm năm tuổi tại Sơn Trà',
    className: 'w-full lg:w-[340px] h-[320px] lg:h-[440px]',
  },
  {
    src: 'https://images.unsplash.com/photo-1774167337631-e2b6b6daaae6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3OTUwNTQ0OTd8&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Tầm nhìn núi rừng hướng ra biển Đông từ bán đảo Sơn Trà',
    className: 'w-full lg:flex-1 h-[340px] lg:h-[500px]',
  },
]

const EXPERIENCE_IMAGE =
  'https://images.unsplash.com/photo-1793964921657-6b5422107a57?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3OTUwNTQ0OTd8&ixlib=rb-4.1.0&q=80&w=1080'

const FINAL_CTA_IMAGE =
  'https://images.unsplash.com/photo-1762980966982-2cc919519ec3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3OTUwNTQ4NDd8&ixlib=rb-4.1.0&q=80&w=1080'

const NAV_LINKS = [
  { label: 'Giới thiệu', href: '#about' },
  { label: 'Khoảnh khắc', href: '#moments' },
  { label: 'Trải nghiệm', href: '#experience' },
]

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F4EFE6] text-[#1F3A2D] font-be-vietnam antialiased selection:bg-[#4F6B3A] selection:text-[#F4EFE6]">
      {/* ================= SECTION 01 · HERO ================= */}
      <section className="relative w-full min-h-[760px] lg:h-[900px] bg-[#1F3A2D] overflow-hidden flex flex-col justify-between">
        <img
          src={HERO_IMAGE}
          alt="Rừng già bán đảo Sơn Trà nhìn ra biển Đông"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(31,58,45,0.45) 0%, rgba(31,58,45,0.08) 35%, rgba(31,58,45,0.55) 72%, rgba(31,58,45,0.80) 100%)',
          }}
        />

        {/* Minimal Navigation */}
        <header className="relative z-20 w-full max-w-[1440px] mx-auto h-[88px] px-6 md:px-12 lg:px-20 flex items-center justify-between">
          <Link
            to="/"
            className="font-fraunces text-[21px] font-semibold text-[#F4EFE6] tracking-tight hover:opacity-90 transition-opacity"
          >
            Sơn Trà Trekking
          </Link>

          <nav className="hidden md:flex items-center gap-9" aria-label="Điều hướng chính">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[15px] font-medium text-[#F4EFE6] hover:text-[#E3B65B] transition-colors"
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/login"
              className="text-[15px] font-medium text-[#F4EFE6] hover:text-[#E3B65B] transition-colors"
            >
              Đăng nhập
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full text-[#F4EFE6] hover:bg-[#F4EFE6]/10 transition-colors"
            aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {mobileMenuOpen && (
          <div className="md:hidden relative z-20 mx-6 mb-4 rounded-2xl bg-[#1F3A2D]/95 backdrop-blur-md border border-[#F4EFE6]/15 p-5 flex flex-col gap-4">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-[15px] font-medium text-[#F4EFE6] hover:text-[#E3B65B]"
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[15px] font-medium text-[#F4EFE6] hover:text-[#E3B65B]"
            >
              Đăng nhập
            </Link>
          </div>
        )}

        {/* Hero Editorial Copy */}
        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 pb-16 lg:pb-24 pt-12">
          <div className="max-w-[820px] flex flex-col gap-6">
            <p className="text-[12px] font-semibold tracking-[1.8px] uppercase text-[#E6EAE1]">
              BÁN ĐẢO SƠN TRÀ · ĐÀ NẴNG
            </p>
            <h1 className="font-fraunces text-[42px] sm:text-[58px] lg:text-[78px] font-semibold leading-[1.12] tracking-[-1.6px] text-[#F4EFE6]">
              Chạm vào rừng già
              <br />
              giữa lòng biển Đông.
            </h1>
            <p className="max-w-[580px] text-[17px] lg:text-[19px] leading-[1.65] text-[#F4EFE6]/95">
              Những bước chân chậm rãi dưới tán rừng nguyên sinh, nơi tiếng gió biển hòa cùng hương lá sớm.
            </p>
            <div className="flex flex-wrap items-center gap-[18px] pt-2.5">
              <a
                href="#about"
                className="inline-flex items-center justify-center rounded-full bg-[#4F6B3A] hover:bg-[#3f572e] px-8 py-4 text-[15px] font-semibold text-[#F4EFE6] transition-colors"
              >
                Khám phá trải nghiệm trekking
              </a>
              <Link
                to="/dashboard/trekking"
                className="inline-flex items-center justify-center rounded-full border-[1.25px] border-[#F4EFE6] hover:bg-[#F4EFE6]/10 px-7 py-[15px] text-[15px] font-medium text-[#F4EFE6] transition-colors"
              >
                Đặt chuyến đi
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 02 · VỀ TRẢI NGHIỆM (LIMESTONE) ================= */}
      <section id="about" className="w-full bg-[#F4EFE6]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 py-16 lg:py-24 min-h-[720px] lg:min-h-[820px] flex flex-col lg:flex-row items-center gap-12 lg:gap-[72px]">
          <div
            className="w-full lg:w-[680px] h-[380px] sm:h-[480px] lg:h-[600px] shrink-0 rounded-xl overflow-hidden"
            style={{ boxShadow: '0 18px 36px rgba(91, 70, 54, 0.12)' }}
          >
            <img
              src={ABOUT_IMAGE}
              alt="Lối mòn xanh mát dưới tán rừng Sơn Trà"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 flex flex-col gap-6">
            <p className="text-[12px] font-bold tracking-[1.6px] uppercase text-[#B8714A]">
              NHỊP THỞ SƠN TRÀ
            </p>
            <h2 className="font-fraunces text-[34px] sm:text-[40px] lg:text-[46px] font-semibold leading-[1.18] tracking-[-0.8px] text-[#1F3A2D]">
              Một Sơn Trà khác,
              <br />
              khi bạn bước chậm lại.
            </h2>
            <p className="text-[17px] leading-[1.75] text-[#5B4636]">
              Rời khỏi nhịp phố thị ồn ào chỉ sau vài chục phút di chuyển, lối mòn dẫn bạn đi dưới những tán cây rậm rạp, nơi ánh nắng sớm xuyên qua kẽ lá và hơi sương còn đọng trên thảm rêu.
            </p>
          </div>
        </div>
      </section>

      {/* ================= SECTION 03 · KHOẢNH KHẮC RỪNG GIÀ (MIST) ================= */}
      <section id="moments" className="w-full bg-[#E6EAE1]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 py-16 lg:py-[88px] min-h-[820px] lg:min-h-[920px] flex flex-col justify-center gap-11">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-[680px] flex flex-col gap-3">
              <p className="text-[12px] font-bold tracking-[1.6px] uppercase text-[#B8714A]">
                KHÁM PHÁ BÁN ĐẢO
              </p>
              <h2 className="font-fraunces text-[32px] sm:text-[38px] lg:text-[44px] font-semibold leading-[1.18] tracking-[-0.6px] text-[#1F3A2D]">
                Những cung đường và khoảnh khắc đáng nhớ.
              </h2>
            </div>
            <p className="max-w-[360px] text-[16px] leading-[1.6] text-[#5B4636]">
              Từ những con dốc phủ lá khô, gốc cổ thụ hàng trăm năm tuổi đến tầm nhìn hướng biển.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end gap-7">
            {GALLERY_IMAGES.map((photo) => (
              <div
                key={photo.src}
                className={`${photo.className} rounded-xl overflow-hidden shrink-0`}
                style={{ boxShadow: '0 16px 32px rgba(91, 70, 54, 0.11)' }}
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SECTION 04 · TRẢI NGHIỆM CHẬM (DEEP PINE) ================= */}
      <section id="experience" className="w-full bg-[#1F3A2D]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 py-16 lg:py-24 min-h-[680px] lg:min-h-[760px] flex flex-col lg:flex-row items-center gap-12 lg:gap-[72px]">
          <div className="w-full lg:w-[560px] shrink-0 flex flex-col gap-7">
            <p className="text-[12px] font-bold tracking-[1.6px] uppercase text-[#E3B65B]">
              TRẢI NGHIỆM BẢN ĐỊA
            </p>
            <h2 className="font-fraunces text-[34px] sm:text-[42px] lg:text-[48px] font-semibold leading-[1.16] tracking-[-0.8px] text-[#F4EFE6]">
              Mỗi bước chân là một trải nghiệm.
            </h2>
            <p className="text-[17px] lg:text-[18px] leading-[1.75] text-[#E6EAE1]">
              Trekking ở Sơn Trà không phải là cuộc chạy đua chinh phục đỉnh cao. Đó là hành trình lắng nghe thiên nhiên, quan sát những tầng lá chuyển sắc theo nắng và cảm nhận sự bình yên hiếm có bên bờ biển.
            </p>
            <p className="text-[17px] lg:text-[18px] leading-[1.75] text-[#E6EAE1]">
              Khi bạn đi đủ chậm, từng khúc quanh đường mòn, từng vạt nắng xuyên rừng đều trở thành một ký ức riêng về bán đảo.
            </p>
          </div>

          <div className="w-full lg:flex-1 h-[360px] sm:h-[440px] lg:h-[540px] rounded-xl overflow-hidden">
            <img
              src={EXPERIENCE_IMAGE}
              alt="Khoảnh khắc trekking chậm rãi giữa rừng Sơn Trà"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ================= SECTION 05 · IMMERSIVE FINAL CTA ================= */}
      <section className="relative w-full min-h-[560px] lg:h-[720px] bg-[#1F3A2D] overflow-hidden flex items-center justify-center">
        <img
          src={FINAL_CTA_IMAGE}
          alt="Toàn cảnh thiên nhiên bán đảo Sơn Trà"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(31,58,45,0.30) 0%, rgba(31,58,45,0.60) 55%, rgba(31,58,45,0.81) 100%)',
          }}
        />

        <div className="relative z-10 max-w-[1000px] mx-auto px-6 py-20 flex flex-col items-center text-center gap-6">
          <h2 className="font-fraunces text-[38px] sm:text-[48px] lg:text-[60px] font-semibold leading-[1.14] tracking-[-1.2px] text-[#F4EFE6]">
            Sẵn sàng khám phá Sơn Trà?
          </h2>
          <p className="max-w-[660px] text-[17px] lg:text-[19px] leading-[1.65] text-[#F4EFE6]/95">
            Bước vào rừng, chạm vào thiên nhiên và tận hưởng những khoảnh khắc bình yên giữa bán đảo Sơn Trà.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-[18px] pt-3">
            <Link
              to="/dashboard/trekking"
              className="inline-flex items-center justify-center rounded-full bg-[#4F6B3A] hover:bg-[#3f572e] px-[34px] py-4 text-[16px] font-semibold text-[#F4EFE6] transition-colors"
            >
              Đặt chuyến đi
            </Link>
            <a
              href="#about"
              className="inline-flex items-center justify-center rounded-full border-[1.25px] border-[#F4EFE6] hover:bg-[#F4EFE6]/10 px-[30px] py-[15px] text-[16px] font-medium text-[#F4EFE6] transition-colors"
            >
              Khám phá trải nghiệm
            </a>
          </div>
        </div>
      </section>

      {/* ================= FOOTER · MINIMAL FOREST EDITORIAL ================= */}
      <footer className="w-full bg-[#1F3A2D]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 pt-12 pb-9 min-h-[240px] flex flex-col justify-between gap-10">
          <div className="flex flex-col md:flex-row justify-between gap-10">
            <div className="max-w-[340px] flex flex-col gap-2">
              <span className="font-fraunces text-[22px] font-semibold text-[#F4EFE6]">
                Sơn Trà Trekking
              </span>
              <span className="text-[14px] text-[#E6EAE1]">
                Bán đảo Sơn Trà, Quận Sơn Trà, Đà Nẵng
              </span>
            </div>

            <div className="flex flex-wrap gap-12">
              <div className="flex flex-col gap-2.5">
                <h3 className="text-[13px] font-bold text-[#F4EFE6]">Khám phá</h3>
                <a
                  href="#about"
                  className="text-[14px] text-[#E6EAE1] hover:text-[#F4EFE6] transition-colors"
                >
                  Về trải nghiệm
                </a>
                <a
                  href="#moments"
                  className="text-[14px] text-[#E6EAE1] hover:text-[#F4EFE6] transition-colors"
                >
                  Khoảnh khắc rừng già
                </a>
                <Link
                  to="/dashboard/trekking"
                  className="text-[14px] text-[#E6EAE1] hover:text-[#F4EFE6] transition-colors"
                >
                  Đặt chuyến đi
                </Link>
              </div>

              <div className="flex flex-col gap-2.5">
                <h3 className="text-[13px] font-bold text-[#F4EFE6]">Tài khoản</h3>
                <Link
                  to="/login"
                  className="text-[14px] text-[#E6EAE1] hover:text-[#F4EFE6] transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="text-[14px] text-[#E6EAE1] hover:text-[#F4EFE6] transition-colors"
                >
                  Đăng ký
                </Link>
                <Link
                  to="/partner"
                  className="text-[14px] text-[#E6EAE1] hover:text-[#F4EFE6] transition-colors"
                >
                  Cổng đối tác
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <p className="text-[12px] text-[#E6EAE1]">© Sơn Trà Trekking · REloop</p>
            <p className="text-[12px] text-[#E6EAE1]">Ảnh tư liệu từ Unsplash.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
