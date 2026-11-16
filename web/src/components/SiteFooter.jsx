import React from 'react'
import { Link } from 'react-router-dom'
import { Brand } from './SiteHeader'

const footerGroups = [
  {
    title: 'Khám phá',
    links: [
      { label: 'Tuyến trekking Sơn Trà', to: '/trekking' },
      { label: 'Cơ chế QR & Green Points', to: '/#stewardship' },
      { label: 'Nhiệm vụ xanh', to: '/dashboard/tasks' },
    ],
  },
  {
    title: 'Đối tác & BQL',
    links: [
      { label: 'Cổng đối tác lữ hành', to: '/partner' },
      { label: 'Chính sách BQL & Bảo tồn', to: '/#bql-policy' },
      { label: 'Cổng quản lý BQL', to: '/bql-portal/login' },
    ],
  },
  {
    title: 'Tài khoản',
    links: [
      { label: 'Đăng nhập du khách', to: '/login' },
      { label: 'Đăng ký tài khoản', to: '/register' },
      { label: 'Cộng đồng Sơn Trà', to: '/dashboard/community' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="site-footer motion-fade-up">
      <div className="max-w-xs">
        <Brand />
        <p className="mt-3 text-sm text-[#4A514C] leading-relaxed">
          Nền tảng du lịch sinh thái, xác thực checkpoint GPS/QR và bảo tồn bán đảo Sơn Trà, Đà Nẵng.
        </p>
      </div>
      <div className="footer-links motion-stagger">
        {footerGroups.map((group) => (
          <section key={group.title}>
            <h2>{group.title}</h2>
            {group.links.map((item) => (
              <Link to={item.to} key={item.label} className="motion-underline">
                {item.label}
              </Link>
            ))}
          </section>
        ))}
      </div>
    </footer>
  )
}
