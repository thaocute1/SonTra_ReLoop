import { Brand } from './SiteHeader'
const groups = [['Khám phá', 'Tuyến Trekking', 'Nhiệm vụ Xanh', 'Marketplace'], ['Cộng đồng', 'Bảng xếp hạng', 'Câu chuyện Eco-Hero'], ['Hỗ trợ', 'Liên hệ', 'Câu hỏi thường gặp']]
export function SiteFooter() { return <footer className="site-footer"><div><Brand /><p>Bán đảo Sơn Trà, Đà Nẵng</p></div><div className="footer-links">{groups.map(([title, ...links]) => <section key={title}><h2>{title}</h2>{links.map((link) => <a href="#footer" key={link}>{link}</a>)}</section>)}</div></footer> }
