import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import logoImg from '../assets/logo.jpg'

const customerNavItems = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Tuyến trekking', href: '/trekking' },
  { label: 'Nhiệm vụ xanh', href: '/dashboard/tasks' },
  { label: 'Cộng đồng', href: '/dashboard/community' }
]

const partnerNavItems = [
  { label: '← Về trang du khách', href: '/' },
  { label: 'Quyền lợi hợp tác', href: '/partner#benefits' },
  { label: 'Quy trình xét duyệt', href: '/partner#process' }
]

function hasActiveSession() {
  const token = localStorage.getItem('access_token')
  if (!token) return false
  try {
    const encoded = token.split('.')[1]
    const payload = encoded ? JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))) : null
    if (payload?.exp && payload.exp * 1000 <= Date.now()) return false
    return true
  } catch {
    return false
  }
}

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
  const [mobileOpen, setMobileOpen] = useState(false)
  const isPartnerPortal = location.pathname.startsWith('/partner')
  const signedIn = hasActiveSession()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, location.hash])

  const isNavActive = (href) => {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

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
          <Link
            className="header-partner-login-btn px-4 py-2 bg-white border border-[#C5CCC7] hover:border-[#2F5D4A] !text-[#191C1A] text-xs font-bold rounded-full transition-all shadow-2xs motion-press"
            to="/partner/login"
          >
            Đăng nhập cổng đối tác
          </Link>

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

  // HEADER CHO KHÁCH DU LỊCH (Công khai)
  return (
    <header className="site-header site-header--public motion-fade-in">
      <Brand />

      <nav className="site-nav" aria-label="Điều hướng chính">
        {customerNavItems.map((item) => {
          const active = isNavActive(item.href)
          return (
            <Link
              to={item.href}
              key={item.label}
              aria-current={active ? 'page' : undefined}
              className={`motion-underline ${active ? 'is-active' : ''}`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="site-header__actions">
        <Link className="header-partner-btn !text-[#2F5D4A] motion-press" to="/partner">
          Trở thành đối tác
        </Link>
        {signedIn ? (
          <Link className="header-register-btn !text-white motion-press" to="/dashboard/home">
            Bảng điều khiển
          </Link>
        ) : (
          <>
            <Link className="header-login-btn !text-[#191C1A] motion-underline motion-press" to="/login">
              Đăng nhập
            </Link>
            <Link className="header-register-btn !text-white motion-press" to="/register">
              Đăng ký
            </Link>
          </>
        )}
      </div>

      <button
        type="button"
        className="site-header__menu-btn"
        aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu điều hướng'}
        aria-expanded={mobileOpen}
        aria-controls="public-mobile-nav"
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && (
        <div id="public-mobile-nav" className="site-mobile-drawer">
          <nav aria-label="Điều hướng di động">
            {customerNavItems.map((item) => {
              const active = isNavActive(item.href)
              return (
                <Link
                  to={item.href}
                  key={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={active ? 'is-active' : ''}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="site-mobile-drawer__actions">
            <Link className="header-partner-btn !text-[#2F5D4A]" to="/partner">
              Trở thành đối tác
            </Link>
            {signedIn ? (
              <Link className="header-register-btn !text-white" to="/dashboard/home">
                Bảng điều khiển
              </Link>
            ) : (
              <>
                <Link className="header-login-btn !text-[#191C1A]" to="/login">
                  Đăng nhập
                </Link>
                <Link className="header-register-btn !text-white" to="/register">
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export default SiteHeader
