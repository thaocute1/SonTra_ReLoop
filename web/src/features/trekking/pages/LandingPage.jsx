import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Leaf, 
  Compass, 
  Recycle, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight 
} from 'lucide-react'
import { useScrollReveal } from '../../../hooks/useScrollReveal'

export function LandingPage() {
  useScrollReveal()

  return (
    <div className="landing-page m3-public-page bg-[#F8FAF7] font-be-vietnam motion-page-enter">
      <main>
        {/* ================= HERO SECTION ================= */}
        <section className="hero bg-white border-b border-[#C5CCC7]">
          <div className="hero__content motion-stagger">
            <div className="eyebrow inline-flex items-center gap-2">
              <Leaf className="w-3.5 h-3.5 text-[#2F5D4A]" />
              <span>Nền tảng du lịch sinh thái có trách nhiệm</span>
            </div>

            <h1 className="hero__title font-fraunces">
              Khám phá Sơn Trà<br />có trách nhiệm
            </h1>

            <p className="hero__lead font-be-vietnam">
              Trekking an toàn - tích điểm xanh - bảo tồn thiên nhiên. Cùng cộng đồng bảo vệ bán đảo Sơn Trà qua từng chuyến đi.
            </p>

            <div className="hero__actions">
              <Link className="hero-btn-primary min-h-12 motion-press" to="/register">
                Bắt đầu trải nghiệm
              </Link>
              <Link className="hero-btn-outline min-h-12 motion-press" to="/dashboard/trekking">
                Xem các tuyến trekking
              </Link>
            </div>

            <dl className="hero__stats motion-stagger">
              <div>
                <dt className="font-fraunces">1,200+</dt>
                <dd>Du khách tham gia</dd>
              </div>
              <div>
                <dt className="font-fraunces">50 kg</dt>
                <dd>Rác nhựa đã thu gom</dd>
              </div>
              <div>
                <dt className="font-fraunces">12</dt>
                <dd>Tuyến trekking an toàn</dd>
              </div>
            </dl>
          </div>

          <div className="hero__visual motion-fade-up motion-hover-lift">
            <img 
              src="/assets/figma/landing-photo.jpeg" 
              alt="Khung cảnh thiên nhiên hoàng hôn bán đảo Sơn Trà" 
              className="rounded-3xl"
            />
          </div>
        </section>

        {/* ================= PARTNER / VENDOR ONBOARDING SECTION ================= */}
        <section className="partner-section py-16 px-4 sm:px-6 lg:px-8 bg-[#F8FAF7]" data-motion-reveal>
          <div className="max-w-[1240px] mx-auto bg-white rounded-[2rem] border border-[#C5CCC7] p-8 md:p-14 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center motion-hover-lift">
            
            {/* Left Column: Value Proposition & Onboarding Info */}
            <div className="lg:col-span-7 space-y-6">
              {/* Kicker Tag */}
              <div className="inline-flex items-center gap-2 text-[#2F5D4A] text-xs font-bold tracking-wider font-be-vietnam">
                <Leaf className="w-4 h-4 text-[#2F5D4A]" />
                <span>Dành cho đối tác và doanh nghiệp</span>
              </div>

              {/* Main Headline */}
              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#191C1A] leading-[1.2] font-fraunces">
                Đồng hành lan tỏa du lịch sinh thái Sơn Trà
              </h2>

              {/* Description */}
              <p className="text-sm md:text-base text-[#4A514C] leading-relaxed font-be-vietnam max-w-xl">
                Tiếp cận cộng đồng du khách có trách nhiệm, phát triển tour trekking an toàn hoặc phân phối sản phẩm tái chế trên nền tảng chính thức.
              </p>

              {/* 3 Pillars / Key Benefits */}
              <div className="space-y-5 pt-2 motion-stagger">
                {/* 1. Tour Operator */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#DCEBE3] flex items-center justify-center shrink-0 mt-0.5">
                    <Compass className="w-5 h-5 text-[#2F5D4A]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#191C1A] font-be-vietnam">
                      Dành cho tour operator
                    </h3>
                    <p className="text-sm text-[#4A514C] font-be-vietnam mt-0.5 leading-normal">
                      Chuẩn hóa tuyến đường, xác thực điểm GPS an toàn cùng ban quản lý.
                    </p>
                  </div>
                </div>

                {/* 2. Làng nghề & Nghệ nhân */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#DCEBE3] flex items-center justify-center shrink-0 mt-0.5">
                    <Recycle className="w-5 h-5 text-[#2F5D4A]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#191C1A] font-be-vietnam">
                      Dành cho làng nghề và nghệ nhân
                    </h3>
                    <p className="text-sm text-[#4A514C] font-be-vietnam mt-0.5 leading-normal">
                      Mở gian hàng sản phẩm tái chế trên marketplace sinh thái.
                    </p>
                  </div>
                </div>

                {/* 3. Minh bạch & ESG */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#DCEBE3] flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5 text-[#2F5D4A]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#191C1A] font-be-vietnam">
                      Minh bạch và ESG
                    </h3>
                    <p className="text-sm text-[#4A514C] font-be-vietnam mt-0.5 leading-normal">
                      Tự động trích phần trăm vào quỹ bảo tồn bán đảo Sơn Trà.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <Link
                  to="/partner"
                  className="partner-cta-btn min-h-12 !text-white motion-press"
                >
                  Đăng ký làm đối tác ngay
                </Link>

                <a
                  href="#bql-policy"
                  className="text-xs sm:text-sm font-semibold text-[#191C1A] hover:text-[#2F5D4A] inline-flex items-center gap-1.5 font-be-vietnam transition-colors group cursor-pointer motion-underline"
                >
                  <span>Tìm hiểu chính sách BQL</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>

            {/* Right Column: Visual Showcase Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-md aspect-[4/3] sm:aspect-[1/1] w-full bg-[#191C1A]">
                {/* Hiker image */}
                <img
                  src="https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=80"
                  alt="Đội nhóm trekking khám phá rừng bán đảo Sơn Trà"
                  className="w-full h-full object-cover"
                />

                {/* Top Badge: Verified Partner Profile */}
                <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/95 backdrop-blur-xs rounded-full shadow-md text-xs font-semibold text-[#191C1A] font-be-vietnam border border-white/60">
                  <CheckCircle2 className="w-4 h-4 text-[#2F5D4A]" />
                  <span>Hồ sơ đối tác đã xác minh</span>
                </div>

                {/* Bottom Stats Overlay Box */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/60 grid grid-cols-2 divide-x divide-[#C5CCC7] text-center font-be-vietnam">
                  <div className="px-2">
                    <p className="text-xs tracking-wider text-[#4A514C] font-bold">
                      Du khách hàng tháng
                    </p>
                    <p className="text-xl font-extrabold text-[#2F5D4A] font-fraunces mt-0.5">
                      +1,200
                    </p>
                  </div>
                  <div className="px-2">
                    <p className="text-xs tracking-wider text-[#4A514C] font-bold">
                      Chiết khấu linh hoạt
                    </p>
                    <p className="text-xl font-extrabold text-[#2F5D4A] font-fraunces mt-0.5">
                      10%
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  )
}

export default LandingPage
