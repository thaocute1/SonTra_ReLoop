import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import logoImg from '../assets/logo.jpg'

const customerNavItems = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Trekking', href: '/dashboard/trekking' },
  { label: 'Nhiệm vụ xanh', href: '/dashboard/tasks' },
  { label: 'Marketplace', href: '/dashboard/marketplace' },
  { label: 'Cộng đồng', href: '/dashboard/community' }
]

const partnerNavItems = [
  { label: '← Về trang du khách', href: '/' },
  { label: 'Quyền lợi hợp tác', href: '/partner#benefits' },
  { label: 'Quy trình xét duyệt', href: '/partner#process' }
]

export function Brand({ isPartner = false }) {
  return (
    <Link to={isPartner ? '/partner' : '/'} className="brand motion-press" aria-label="Sơn Trà REloop">
      <img src={logoImg} alt="Logo Sơn Trà REloop" />
      <span className="font-fraunces font-bold text-[#191C1A]">Sơn Trà REloop</span>
      {isPartner && (
        <span className="text-[11px] font-bold tracking-wider px-2 py-0.5 bg-[#DCEBE3] !text-[#173A2C] rounded-md font-be-vietnam border border-[#2F5D4A]/20 ml-1">
          Đối tác
        </span>
      )}
    </Link>
  )
}

export function SiteHeader() {
  const location = useLocation()
  const isPartnerPortal = location.pathname.startsWith('/partner')

  // HEADER CHO TRANG ĐỐI TÁC (/partner, /partner/onboarding)
  if (isPartnerPortal) {
    return (
      <header className="site-header motion-fade-in">
        <Brand isPartner={true} />
        <nav className="site-nav" aria-label="Điều hướng đối tác">
          {partnerNavItems.map((item) => (
            <Link to={item.href} key={item.label} className="hover:!text-[#2F5D4A] !text-[#4A514C] motion-underline">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="site-header__actions">
          {/* Ô MÀU TRẮNG -> CHỮ ĐEN */}
          <Link 
            className="header-partner-login-btn px-4 py-2 bg-white border border-[#C5CCC7] hover:border-[#2F5D4A] !text-[#191C1A] text-xs font-bold rounded-full transition-all shadow-2xs motion-press"
            to="/login"
          >
            Đăng nhập cổng đối tác
          </Link>

          {/* Ô MÀU XANH -> CHỮ TRẮNG */}
          <Link 
            className="header-partner-register-btn px-4 py-2 bg-[#2F5D4A] hover:bg-[#254B3C] !text-white text-xs font-bold rounded-full transition-all shadow-2xs motion-press"
            to="/partner/onboarding"
          >
            Đăng ký đối tác
          </Link>
        </div>
      </header>
    )
  }

  // HEADER THÔNG THƯỜNG CHO KHÁCH DU LỊCH (Trang chủ)
  return (
    <header className="site-header motion-fade-in">
      <Brand />
      <nav className="site-nav" aria-label="Điều hướng chính">
        {customerNavItems.map((item) => (
          <Link to={item.href} key={item.label} className="motion-underline">
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="site-header__actions">
        {/* Ô TRẮNG / CHỮ ĐEN */}
        <Link className="header-login-btn !text-[#191C1A] motion-underline motion-press" to="/login">
          Đăng nhập
        </Link>
        <Link className="header-partner-btn !text-[#2F5D4A] motion-press" to="/partner">
          Trở thành đối tác
        </Link>

        {/* Ô XANH / CHỮ TRẮNG */}
        <Link className="header-register-btn !text-white motion-press" to="/register">
          Đăng ký
        </Link>
      </div>
    </header>
  )
}

export default SiteHeader
