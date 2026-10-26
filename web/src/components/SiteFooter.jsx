import React from 'react'
import { Brand } from './SiteHeader'

const groups = [
  ['Khám phá', 'Tuyến trekking', 'Nhiệm vụ xanh', 'Marketplace'],
  ['Cộng đồng', 'Bảng xếp hạng', 'Câu chuyện Eco-Hero'],
  ['Hỗ trợ', 'Liên hệ', 'Câu hỏi thường gặp']
]

export function SiteFooter() {
  return (
    <footer className="site-footer motion-fade-up">
      <div>
        <Brand />
        <p className="mt-2 text-xs text-[#4A514C]">Bán đảo Sơn Trà, Đà Nẵng</p>
      </div>
      <div className="footer-links motion-stagger">
        {groups.map(([title, ...links]) => (
          <section key={title}>
            <h2>{title}</h2>
            {links.map((link) => (
              <a href="#footer" key={link} className="motion-underline">
                {link}
              </a>
            ))}
          </section>
        ))}
      </div>
    </footer>
  )
}
