import { Link } from 'react-router-dom'

const navItems = ['Trang chủ', 'Trekking', 'Nhiệm vụ Xanh', 'Marketplace', 'Cộng đồng']
export function Brand() { return <Link to="/" className="brand" aria-label="Sơn Trà REloop, trang chủ"><img src="/assets/figma/landing-hero.png" alt="" /><span>Sơn Trà REloop</span></Link> }
export function SiteHeader() { return <header className="site-header"><Brand /><nav className="site-nav" aria-label="Điều hướng chính">{navItems.map((item) => <a href={`#${item}`} key={item}>{item}</a>)}</nav><div className="site-header__actions"><Link className="ui-button ui-button--outline ui-button--sm" to="/login">Đăng nhập</Link><Link className="ui-button ui-button--primary ui-button--sm" to="/register">Bắt đầu trải nghiệm</Link></div></header> }
