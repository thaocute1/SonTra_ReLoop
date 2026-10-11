import React from 'react'
import { Bell, CircleHelp, Menu, Search, CircleHelp as PointsIcon } from 'lucide-react'
import UserAvatar from './UserAvatar'

export default function DashboardHeader({ title = 'Thống kê', role, account, onMenu }) {
  if (role === 'CUSTOMER') return <header className="dashboard-header customer-header"><button className="mobile-menu" onClick={onMenu} aria-label="Mở menu"><Menu size={20} /></button><div className="customer-greeting"><span>Xin chào,</span><strong>{account?.name || 'Eco-Explorer'}!</strong></div><div className="dashboard-header__actions"><div className="points-pill"><PointsIcon size={14} />{account?.points ?? 350} RE-Points</div><UserAvatar initials={account?.initials || 'TH'} avatarUrl={account?.avatarUrl} /></div></header>
  return <header className="dashboard-header"><button className="mobile-menu" onClick={onMenu} aria-label="Mở menu"><Menu size={20} /></button><strong>{title}</strong><div className="dashboard-header__actions"><label className="dashboard-search"><Search size={15} /><input placeholder="Tìm kiếm..." aria-label="Tìm kiếm" /></label><button aria-label="Thông báo"><Bell size={16} /></button><button aria-label="Trợ giúp"><CircleHelp size={16} /></button><UserAvatar initials="TH" /></div></header>
}
