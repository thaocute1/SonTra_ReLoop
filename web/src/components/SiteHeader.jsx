import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import logoImg from '../assets/logo.jpg'

const customerNavItems = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Trekking', href: '/dashboard/trekking' },
  { label: 'Nhiệm vụ Xanh', href: '/dashboard/tasks' },
  { label: 'Marketplace', href: '/dashboard/marketplace' },
  { label: 'Cộng đồng', href: '/dashboard/community' }
]

const partnerNavItems = [
  { label: '← Về trang Du khách', href: '/' },
  { label: 'Quyền lợi hợp tác', href: '/partner#benefits' },
  { label: 'Quy trình xét duyệt', href: '/partner#process' }
]

export function Brand({ isPartner = false }) {
  return (
    <Link to={isPartner ? '/partner' : '/'} className="brand" aria-label="Sơn Trà REloop">
      <img src={logoImg} alt="Sơn Trà REloop Logo" />
      <span className="font-fraunces font-bold text-[#18211c]">Sơn Trà REloop</span>
      {isPartner && (
        <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 bg-[#eaf2eb] !text-[#24563d] rounded-md font-be-vietnam border border-[#24563d]/20 ml-1">
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
      <header className="site-header">
        <Brand isPartner={true} />
        <nav className="site-nav" aria-label="Điều hướng Đối tác">
          {partnerNavItems.map((item) => (
            <Link to={item.href} key={item.label} className="hover:!text-[#24563d] !text-[#5d6861]">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="site-header__actions">
          {/* Ô MÀU TRẮNG -> CHỮ ĐEN */}
          <Link 
            className="px-4 py-2 bg-white border border-[#e2e8e4] hover:border-[#24563d] !text-[#18211c] text-xs font-bold rounded-full transition-all shadow-2xs" 
            to="/login"
          >
            Đăng nhập Cổng Đối tác
          </Link>

          {/* Ô MÀU XANH -> CHỮ TRẮNG */}
          <Link 
            className="px-4 py-2 bg-[#24563d] hover:bg-[#1b3d2b] !text-white text-xs font-bold rounded-full transition-all shadow-2xs" 
            to="/partner/onboarding"
          >
            Đăng ký Đối tác
          </Link>
        </div>
      </header>
    )
  }

  // HEADER THÔNG THƯỜNG CHO KHÁCH DU LỊCH (Trang chủ)
  return (
    <header className="site-header">
      <Brand />
      <nav className="site-nav" aria-label="Điều hướng chính">
        {customerNavItems.map((item) => (
          <Link to={item.href} key={item.label}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="site-header__actions">
        {/* Ô TRẮNG / CHỮ ĐEN */}
        <Link className="header-login-btn !text-[#18211c]" to="/login">
          Đăng nhập
        </Link>
        <Link className="header-partner-btn !text-[#24563d]" to="/partner">
          Trở thành Đối tác
        </Link>

        {/* Ô XANH / CHỮ TRẮNG */}
        <Link className="header-register-btn !text-white" to="/register">
          Đăng ký
        </Link>
      </div>
    </header>
  )
}

export default SiteHeader
