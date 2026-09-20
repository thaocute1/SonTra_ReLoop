import React from 'react'
import { Link, Outlet } from 'react-router-dom'
import { TreePine } from 'lucide-react'

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-['Roboto']">
      {/* Navbar */}
      <header className="h-20 px-8 md:px-16 border-b border-color-spring-green-90 flex justify-between items-center bg-white sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            <TreePine className="w-6 h-6" />
          </div>
          <span className="text-color-grey-20 text-lg font-bold font-['Outfit']">
            Sơn Trà <span className="text-color-spring-green-35">REloop</span>
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link to="/login" className="text-sm font-semibold text-color-grey-20 hover:text-emerald-600">
            Đăng nhập
          </Link>
          <Link to="/register" className="px-5 py-2 rounded-full bg-color-spring-green-35 text-white text-xs font-semibold hover:bg-emerald-700">
            Đăng ký
          </Link>
        </nav>
      </header>

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 bg-white text-center text-xs text-color-grey-45">
        © 2026 Sơn Trà REloop - PBL6 Trường Đại học Bách Khoa - ĐH Đà Nẵng
      </footer>
    </div>
  )
}
