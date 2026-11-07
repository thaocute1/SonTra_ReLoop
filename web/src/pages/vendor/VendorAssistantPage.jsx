import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Bot, CalendarDays, Compass, LayoutDashboard, LogOut, MessageSquare, Settings, TrendingUp } from 'lucide-react'
import logoImg from '../../assets/logo.jpg'
import ReLoopAssistantPage from '../../features/dashboard/pages/ReLoopAssistantPage'

const navigation = [
  { label: 'Tổng quan', path: '/vendor/dashboard', icon: LayoutDashboard },
  { label: 'Tour & tuyến GPS', path: '/vendor/experiences', icon: Compass },
  { label: 'Đơn đặt', path: '/vendor/bookings', icon: CalendarDays },
  { label: 'Doanh thu & đối soát', path: '/vendor/dashboard?tab=revenue', icon: TrendingUp },
  { label: 'Hộp thư', path: '/vendor/inbox', icon: MessageSquare },
  { label: 'REloop Assistant', path: '/vendor/assistant', icon: Bot },
  { label: 'Hồ sơ doanh nghiệp', path: '/vendor/dashboard?profile=1', icon: Settings },
]

export default function VendorAssistantPage() {
  const navigate = useNavigate()

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_info')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_name')
    localStorage.removeItem('current_vendor_profile')
    navigate('/partner/login', { replace: true })
  }

  return (
    <div className="vendor-portal-shell m3-app-page m3-portal-shell flex min-h-[100dvh] min-w-0 bg-white font-sans text-[#191C1A]">
      <aside className="hidden lg:flex lg:sticky top-0 h-[100dvh] w-[248px] shrink-0 flex-col justify-between bg-[#F2F5F1] p-5 border-r border-[#C5CCC7]">
        <div>
          <button type="button" onClick={() => navigate('/vendor/dashboard')} className="mb-8 flex items-center gap-2.5 border-0 bg-transparent p-0 text-left cursor-pointer">
            <img src={logoImg} alt="Sơn Trà REloop" className="h-10 w-10 rounded-xl object-cover border border-[#C5CCC7]" />
            <span className="text-sm font-bold leading-tight">Sơn Trà REloop<small className="block text-[10px] font-medium text-[#4A514C]">Cổng đối tác</small></span>
          </button>
          <nav className="flex flex-col gap-1.5">
            {navigation.map(({ label, path, icon: Icon }) => (
              <NavLink key={label} to={path} className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-[#DCEBE3] text-[#2F5D4A]' : 'text-[#4A514C] hover:bg-[#DCEBE3]/50'}`}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <button type="button" onClick={logout} className="flex min-h-12 items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-sm font-semibold text-[#BA1A1A] hover:bg-rose-50">
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </aside>
      <main className="min-w-0 flex-1">
        <ReLoopAssistantPage />
      </main>
    </div>
  )
}
